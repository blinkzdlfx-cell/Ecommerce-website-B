import { backendConfig } from "./backend-config.js";

const LOCAL_WORKER_URL = "http://127.0.0.1:8787";
const PLACEHOLDER_TOKEN = "REPLACE_WITH_YOUR_WORKER_URL";

function trimTrailingSlash(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getApiBaseUrl() {
  const configured = trimTrailingSlash(backendConfig?.apiBaseUrl);
  if (configured && !configured.includes(PLACEHOLDER_TOKEN)) {
    return configured;
  }

  const host = window.location.hostname;
  if (host === "127.0.0.1" || host === "localhost") {
    return LOCAL_WORKER_URL;
  }

  return "";
}

function getDismissKey(id) {
  return `beulah_announcement_dismissed_${id}`;
}

function wasDismissed(id) {
  try {
    return sessionStorage.getItem(getDismissKey(id)) === "1";
  } catch {
    return false;
  }
}

function markDismissed(id) {
  try {
    sessionStorage.setItem(getDismissKey(id), "1");
  } catch {
    // Ignore storage errors.
  }
}

function renderAnnouncement(item) {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const bar = document.createElement("section");
  bar.className = `announcement-bar announcement-${item.type || "info"}`;
  bar.setAttribute("aria-live", "polite");
  bar.innerHTML = `
    <div class="announcement-content">
      <strong>${String(item.title || "Update")}</strong>
      <span>${String(item.message || "")}</span>
    </div>
    <button type="button" class="announcement-close" aria-label="Dismiss announcement">×</button>
  `;

  const closeBtn = bar.querySelector(".announcement-close");
  closeBtn?.addEventListener("click", () => {
    markDismissed(item.id);
    bar.remove();
  });

  header.insertAdjacentElement("afterend", bar);
}

async function loadAnnouncement() {
  const base = getApiBaseUrl();
  if (!base) return;

  try {
    const response = await fetch(`${base}/listAnnouncements`, { method: "GET" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return;

    const rows = Array.isArray(payload.announcements) ? payload.announcements : [];
    const firstVisible = rows.find((item) => item?.id && !wasDismissed(item.id));
    if (!firstVisible) return;
    renderAnnouncement(firstVisible);
  } catch {
    // Silent fail on announcement fetch.
  }
}

document.addEventListener("DOMContentLoaded", loadAnnouncement);
