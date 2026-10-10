from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime, timezone
import httpx


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- Push / GitHub release config -----------------------------------------
PUSH_BASE_URL = "https://integrations.emergentagent.com"
PUSH_KEY = os.environ.get("EMERGENT_PUSH_KEY", "placeholder")

GITHUB_OWNER = "ivicapuzo-rgb"
GITHUB_REPO = "Dolazak-autobusa-na-pumpu"
GITHUB_LATEST_RELEASE_API = (
    f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases/latest"
)
RELEASE_POLL_INTERVAL_SECONDS = 600  # 10 min

_push_client = httpx.AsyncClient(
    base_url=PUSH_BASE_URL,
    headers={"X-Push-Key": PUSH_KEY},
    timeout=10.0,
)


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class RegisterPushBody(BaseModel):
    user_id: str
    platform: str   # "android" | "ios"
    device_token: str


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


# --- Push notifications ----------------------------------------------------
@api_router.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody):
    # Relay registration to Emergent push service
    resp = await _push_client.post(
        "/api/v1/push/users/register", json=body.model_dump()
    )
    if resp.status_code == 401:
        raise HTTPException(500, "EMERGENT_PUSH_KEY missing or invalid")
    if resp.status_code >= 500:
        raise HTTPException(502, "Push provider unavailable")
    resp.raise_for_status()
    # Keep the set of user_ids so we can broadcast release notifications.
    await db.push_users.update_one(
        {"_id": body.user_id},
        {"$set": {
            "platform": body.platform,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"status": "registered"}


async def send_push(recipients: List[str], data: dict,
                    idempotency_key: str | None = None, _attempt: int = 0) -> None:
    if not recipients:
        return
    if "title" not in data or "message" not in data:
        raise ValueError("data must include title and message")
    # chunk to max 100 recipients per trigger
    if len(recipients) > 100:
        for i in range(0, len(recipients), 100):
            await send_push(recipients[i:i + 100], data,
                            idempotency_key=(f"{idempotency_key}-{i}" if idempotency_key else None))
        return
    payload: dict = {"recipients": recipients, "data": data}
    if idempotency_key:
        payload["$idempotency_key"] = idempotency_key
    resp = await _push_client.post("/api/v1/push/trigger", json=payload)
    if resp.status_code == 401:
        raise HTTPException(500, "EMERGENT_PUSH_KEY missing or invalid")
    ctype = resp.headers.get("content-type", "")
    code = resp.json().get("code", "") if ctype.startswith("application/json") else ""
    if code == "idempotency_key_in_progress" and idempotency_key and _attempt < 3:
        await asyncio.sleep(3)
        return await send_push(recipients, data, idempotency_key=idempotency_key, _attempt=_attempt + 1)
    if code in ("insufficient_credits", "integration_disabled", "daily_limit_reached"):
        logger.warning(f"Push paused: {code} ({resp.status_code}): {resp.json().get('message', '')}")
        return
    if resp.status_code >= 500:
        raise HTTPException(502, "Push provider unavailable")
    resp.raise_for_status()


async def _notify_all_new_release(tag: str) -> None:
    users = await db.push_users.find({}, {"_id": 1}).to_list(10000)
    recipients = [u["_id"] for u in users]
    if not recipients:
        logger.info("New release %s but no registered devices.", tag)
        return
    try:
        await send_push(
            recipients=recipients,
            data={
                "title": "Dolazak na pumpu",
                "message": f"Nova verzija {tag} je dostupna — otvorite da ažurirate.",
                "action_url": "/",
            },
            idempotency_key=f"release-{tag}",
        )
        logger.info("Release push sent for %s to %d devices", tag, len(recipients))
    except Exception as e:
        logger.warning("Release push failed (non-blocking): %s", e)


async def _release_poller() -> None:
    # Periodically checks GitHub for a new release and notifies all devices.
    while True:
        try:
            async with httpx.AsyncClient(timeout=10.0) as gh:
                r = await gh.get(
                    GITHUB_LATEST_RELEASE_API,
                    headers={"Accept": "application/vnd.github+json"},
                )
            if r.status_code == 200:
                tag = r.json().get("tag_name") or r.json().get("name") or ""
                if tag:
                    meta = await db.app_meta.find_one({"_id": "release"})
                    last_tag = meta.get("last_tag") if meta else None
                    if last_tag is None:
                        # First run: remember current release, don't notify.
                        await db.app_meta.update_one(
                            {"_id": "release"},
                            {"$set": {"last_tag": tag}},
                            upsert=True,
                        )
                    elif tag != last_tag:
                        await _notify_all_new_release(tag)
                        await db.app_meta.update_one(
                            {"_id": "release"},
                            {"$set": {"last_tag": tag}},
                            upsert=True,
                        )
        except Exception as e:
            logger.warning("Release poll failed: %s", e)
        await asyncio.sleep(RELEASE_POLL_INTERVAL_SECONDS)


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _start_release_poller():
    app.state.release_task = asyncio.create_task(_release_poller())


@app.on_event("shutdown")
async def shutdown_db_client():
    task = getattr(app.state, "release_task", None)
    if task:
        task.cancel()
    await _push_client.aclose()
    client.close()
