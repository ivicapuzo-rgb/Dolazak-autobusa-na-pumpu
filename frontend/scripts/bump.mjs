// Podiže patch verziju u version.json i ispisuje tag za GitHub release.
// Pokreni pre svakog pravljenja APK builda:  yarn bump
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const path = join(here, "..", "version.json");

const data = JSON.parse(readFileSync(path, "utf8"));
const [maj, min, pat] = String(data.version)
  .split(".")
  .map((n) => parseInt(n, 10) || 0);
const next = `${maj}.${min}.${pat + 1}`;
data.version = next;
writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);

console.log(`\n✅ Verzija podignuta: ${maj}.${min}.${pat}  ->  ${next}`);
console.log(`➡️  Naprav APK build, pa na GitHub-u napravi release sa tagom:  v${next}\n`);
