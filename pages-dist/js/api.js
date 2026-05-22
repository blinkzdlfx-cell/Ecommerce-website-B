import { firebaseConfig } from "./firebase-config.js";
import { backendConfig } from "./backend-config.js";

const FUNCTIONS_REGION = "us-central1";
const LOCAL_WORKER_URL = "http://127.0.0.1:8787";
const PLACEHOLDER_TOKEN = "REPLACE_WITH_YOUR_WORKER_URL";

function trimTrailingSlash(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getCloudFunctionBaseUrl() {
  const projectId = firebaseConfig.projectId;
  return `https://${FUNCTIONS_REGION}-${projectId}.cloudfunctions.net`;
}

function getConfiguredApiBaseUrl() {
  const configuredBase = trimTrailingSlash(backendConfig?.apiBaseUrl);
  if (configuredBase && !configuredBase.includes(PLACEHOLDER_TOKEN)) {
    return configuredBase;
  }

  const host = window.location.hostname;
  if (host === "127.0.0.1" || host === "localhost") {
    return LOCAL_WORKER_URL;
  }

  return "";
}

export function getFunctionUrl(name) {
  const apiBase = getConfiguredApiBaseUrl();
  if (!apiBase) {
    const fallback = getCloudFunctionBaseUrl();
    throw new Error(
      `Backend URL is not configured. Set js/backend-config.js apiBaseUrl to your Cloudflare Worker URL. Fallback (old Firebase Functions) would be ${fallback}.`
    );
  }
  return `${apiBase}/${name}`;
}

export async function callAuthedFunction(auth, name, payload = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Please sign in to continue.");
  }

  // Force a fresh token in case the cached token is expired.
  const token = await user.getIdToken(true);
  const url = getFunctionUrl(name);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error(
      `Could not reach payment server. Check backend URL and CORS for ${window.location.origin}.`
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}
