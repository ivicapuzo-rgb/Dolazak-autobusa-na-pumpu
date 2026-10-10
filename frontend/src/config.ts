// GitHub repo koji se proverava za nove verzije aplikacije.
export const GITHUB_OWNER = "ivicapuzo-rgb";
export const GITHUB_REPO = "Dolazak-autobusa-na-pumpu";

export const GITHUB_LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
export const GITHUB_RELEASES_PAGE = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

// Minimalni razmak između automatskih provera (ms) kada se aplikacija vrati u prvi plan.
export const UPDATE_CHECK_THROTTLE_MS = 30 * 60 * 1000; // 30 min
