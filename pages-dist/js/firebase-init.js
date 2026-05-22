// js/firebase-init.js
import "./page-loader.js";
import "./cart-ui.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";
import { getFunctionUrl } from "./api.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const AUTH_STATUS_MESSAGE_KEY = "beulah_auth_status_message";
const AUTH_STATUS_TYPE_KEY = "beulah_auth_status_type";
const LOGIN_MODAL_PENDING_KEY = "beulah_welcome_modal_pending";
const PUBLIC_AUTH_PAGES = new Set(["auth.html", "forgot-password.html"]);
const VERIFIED_GUARD_PAGES = new Set([
  "checkout.html",
  "dashboard.html",
  "admin-orders.html",
  "admin-products.html",
  "admin-marketing.html",
  "admin-blog.html",
  "settings.html",
  "success.html"
]);
const DEFAULT_SITE_EXPERIENCE = Object.freeze({
  modalEnabled: false,
  modalTitle: "",
  modalMessage: "",
  modalImage: "",
  modalButtonLabel: "",
  modalButtonUrl: ""
});
const DEFAULT_USER_SESSION_SECURITY = Object.freeze({
  sessionMode: "none",
  inactivityMinutes: 5
});
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "mousedown", "scroll"];
const ACTIVITY_WRITE_INTERVAL_MS = 10000;
const LOCK_CHECK_INTERVAL_MS = 15000;
const isAdminShellPage = document.body?.dataset.adminShell === "true";

window.auth = auth;
export { app, auth };

let currentUser = null;
let pendingUserNameLookup = null;
let siteExperienceSettings = { ...DEFAULT_SITE_EXPERIENCE };
let userSessionSecuritySettings = { ...DEFAULT_USER_SESSION_SECURITY };
let lockWatchersBound = false;
let inactivityIntervalId = 0;
let lastActivityCommitAt = 0;
let sessionLocked = false;
let sessionAccessPromise = Promise.resolve();
let sessionAccessResolver = null;
let sessionAccessResolved = true;

const siteExperienceReadyPromise = initializeSiteExperience();

function resetSessionAccessWaiter() {
  sessionAccessResolved = false;
  sessionAccessPromise = new Promise((resolve) => {
    sessionAccessResolver = resolve;
  });
}

function releaseSessionAccess() {
  if (sessionAccessResolved) return;
  sessionAccessResolved = true;
  sessionAccessResolver?.();
  sessionAccessResolver = null;
}

resetSessionAccessWaiter();

export function waitForSessionAccess() {
  return sessionAccessPromise;
}

export function waitForSiteExperienceSettings() {
  return siteExperienceReadyPromise;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeSessionMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "lock_after_inactivity") return "lock_after_inactivity";
  if (normalized === "lock_on_return") return "lock_on_return";
  return "none";
}

function normalizeUserSessionSecurity(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  return {
    sessionMode: normalizeSessionMode(value.sessionMode),
    inactivityMinutes: clamp(Math.trunc(Number(value.inactivityMinutes || 5)) || 5, 1, 120)
  };
}

function normalizeSiteExperience(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  return {
    modalEnabled: value.modalEnabled === true,
    modalTitle: String(value.modalTitle || "").trim(),
    modalMessage: String(value.modalMessage || "").trim(),
    modalImage: String(value.modalImage || "").trim(),
    modalButtonLabel: String(value.modalButtonLabel || "").trim(),
    modalButtonUrl: String(value.modalButtonUrl || "").trim()
  };
}

async function fetchUserSessionSecurity(user) {
  if (!user?.uid) return { ...DEFAULT_USER_SESSION_SECURITY };

  try {
    const securityRef = doc(db, "users", user.uid, "settings", "security");
    const snap = await getDoc(securityRef);
    return normalizeUserSessionSecurity(snap.exists() ? snap.data() : DEFAULT_USER_SESSION_SECURITY);
  } catch {
    return { ...DEFAULT_USER_SESSION_SECURITY };
  }
}

export function applyRuntimeSessionSecuritySettings(rawSettings = {}) {
  userSessionSecuritySettings = normalizeUserSessionSecurity(rawSettings);
  if (!currentUser) {
    return userSessionSecuritySettings;
  }

  if (userSessionSecuritySettings.sessionMode === "none") {
    clearLockWatchers();
    hideSiteLockOverlay();
    releaseSessionAccess();
    return userSessionSecuritySettings;
  }

  writeLastActivity(currentUser.uid, Date.now());
  lastActivityCommitAt = Date.now();
  clearReturnLockFlag(currentUser.uid);
  bindLockWatchers();
  return userSessionSecuritySettings;
}

async function fetchSiteExperienceSettings() {
  try {
    const response = await fetch(getFunctionUrl("getSiteExperience"), { method: "GET" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Unable to load site settings.");
    }
    return normalizeSiteExperience(payload?.settings || DEFAULT_SITE_EXPERIENCE);
  } catch {
    return { ...DEFAULT_SITE_EXPERIENCE };
  }
}

async function initializeSiteExperience() {
  const settings = await fetchSiteExperienceSettings();
  siteExperienceSettings = settings;
  return settings;
}

function getGuestAuthLabel() {
  return window.matchMedia("(max-width: 480px)").matches ? "Sign In" : "Sign In / Sign Up";
}

function getCurrentPageName() {
  const pathname = window.location.pathname || "";
  const file = pathname.split("/").pop();
  return file || "index.html";
}

function sanitizeUserName(value) {
  const text = String(value || "").trim();
  if (!text || text.includes("@")) return "";
  return text;
}

function getCachedUserName() {
  return sanitizeUserName(localStorage.getItem("userName") || "");
}

function stashAuthStatus(message, type = "info") {
  const text = String(message || "").trim();
  if (!text) return;
  sessionStorage.setItem(AUTH_STATUS_MESSAGE_KEY, text);
  sessionStorage.setItem(AUTH_STATUS_TYPE_KEY, String(type || "info"));
}

function getProviderIds(user) {
  return Array.from(user?.providerData || [])
    .map((item) => String(item?.providerId || "").trim().toLowerCase())
    .filter(Boolean);
}

function requiresEmailVerification(user) {
  if (!user || user.emailVerified) return false;
  const providerIds = getProviderIds(user);
  return !providerIds.length || providerIds.includes("password");
}

function usesPasswordProvider(user) {
  const providerIds = getProviderIds(user);
  return Boolean(user?.email) && (!providerIds.length || providerIds.includes("password"));
}

function getUserLabel(user) {
  if (!user) return "User";
  const displayName = sanitizeUserName(user.displayName || "");
  if (displayName) return displayName;
  const cachedName = getCachedUserName();
  if (cachedName) return cachedName;
  return "User";
}

function renderGreeting(user) {
  const label = getUserLabel(user);
  const nameDisplay = document.getElementById("user-name");
  const nameDisplayMobile = document.getElementById("user-name-mobile");
  const dropdownGreeting = document.getElementById("user-greeting");

  if (nameDisplay) nameDisplay.textContent = label;
  if (nameDisplayMobile) nameDisplayMobile.textContent = label;
  if (dropdownGreeting) {
    dropdownGreeting.textContent = user ? `Hi, ${label}` : "Hi, Guest";
  }
}

async function hydrateStoredUserName(user) {
  if (!user) return "";
  const existing = sanitizeUserName(user.displayName || "") || getCachedUserName();
  if (existing) return existing;
  if (pendingUserNameLookup === user.uid) return "";

  pendingUserNameLookup = user.uid;
  try {
    const profileRef = doc(db, "users", user.uid, "settings", "profile");
    const snap = await getDoc(profileRef);
    const stored = sanitizeUserName(snap.data()?.displayName || "");
    if (stored) {
      localStorage.setItem("userName", stored);
      renderGreeting(user);
      return stored;
    }
  } catch {
    // Ignore profile lookup failures and fall back to "User".
  } finally {
    pendingUserNameLookup = null;
  }

  return "";
}

function ensureHeaderCartButtons() {
  if (isAdminShellPage) return;

  const targets = [
    { selector: ".desktop-logged-in", logoutId: "logout-btn", extraClass: "desktop-cart-shortcut" },
    { selector: ".mobile-logged-in", logoutId: "logout-btn-mobile", extraClass: "mobile-cart-shortcut" }
  ];

  targets.forEach((target) => {
    const container = document.querySelector(target.selector);
    if (!(container instanceof HTMLElement)) return;

    let link = container.querySelector(".header-cart-btn");
    if (!(link instanceof HTMLAnchorElement)) {
      link = document.createElement("a");
      link.href = "cart.html";
      link.className = `btn-glass header-cart-btn ${target.extraClass}`;
      link.setAttribute("aria-label", "Cart");
      link.textContent = "🛒";
    }

    const logoutButton = document.getElementById(target.logoutId);
    if (logoutButton && logoutButton.parentElement === container) {
      container.insertBefore(link, logoutButton);
    } else if (!container.contains(link)) {
      container.appendChild(link);
    }
  });
}

function syncLocalUser(user) {
  if (user) {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", user.email || "");
    const displayName = sanitizeUserName(user.displayName || "");
    if (displayName) {
      localStorage.setItem("userName", displayName);
    } else {
      const cachedName = getCachedUserName();
      if (cachedName) {
        localStorage.setItem("userName", cachedName);
      } else {
        localStorage.removeItem("userName");
      }
    }
    return;
  }

  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
}

function renderMobileMenuAuth(user) {
  if (isAdminShellPage) return;

  const navList = document.querySelector("nav ul");
  if (!navList) return;

  navList.querySelectorAll(".mobile-menu-auth").forEach((node) => node.remove());

  if (!window.matchMedia("(max-width: 768px)").matches) return;

  const item = document.createElement("li");
  item.className = "mobile-menu-auth";

  if (user) {
    const settingsLink = document.createElement("a");
    settingsLink.href = "settings.html";
    settingsLink.className = "mobile-menu-auth-link";
    settingsLink.textContent = "Settings";
    item.appendChild(settingsLink);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn-glass mobile-menu-logout-btn";
    button.textContent = "Log Out";
    button.addEventListener("click", logoutAndRedirect);
    item.appendChild(button);
  } else {
    const link = document.createElement("a");
    link.href = "auth.html";
    link.className = "mobile-menu-auth-link";
    link.textContent = getGuestAuthLabel();
    link.setAttribute("aria-label", "Sign In or Sign Up");
    item.appendChild(link);
  }

  navList.appendChild(item);
}

function renderSettingsNav(user) {
  if (isAdminShellPage) return;

  const navList = document.querySelector("nav ul");
  if (!navList) return;

  navList.querySelectorAll(".auth-settings-item").forEach((node) => node.remove());

  if (!user || window.matchMedia("(max-width: 768px)").matches) return;

  const item = document.createElement("li");
  item.className = "auth-settings-item";

  const link = document.createElement("a");
  link.href = "settings.html";
  link.textContent = "Settings";

  if (window.location.pathname.endsWith("settings.html")) {
    link.classList.add("active");
  }

  item.appendChild(link);
  navList.appendChild(item);
}

function renderAuthUI(user) {
  const guestArea = document.getElementById("guest-area");
  const loggedInArea = document.getElementById("logged-in-area");

  if (user) {
    if (guestArea) guestArea.style.display = "none";
    if (loggedInArea) loggedInArea.style.display = "flex";
    renderGreeting(user);
  } else {
    if (guestArea) guestArea.style.display = "flex";
    if (loggedInArea) loggedInArea.style.display = "none";
    const guestLink = guestArea?.querySelector("a.btn-glass");
    if (guestLink instanceof HTMLAnchorElement) {
      guestLink.textContent = getGuestAuthLabel();
      guestLink.setAttribute("aria-label", "Sign In or Sign Up");
    }
    renderGreeting(null);
  }

  renderMobileMenuAuth(user);
  renderSettingsNav(user);
  ensureHeaderCartButtons();
  if (!isAdminShellPage) {
    window.__beulahRefreshCartUi?.();
  }
}

function getLastActivityKey(uid) {
  return `beulah_session_last_active:${uid}`;
}

function getReturnLockKey(uid) {
  return `beulah_session_lock_on_return:${uid}`;
}

function readLastActivity(uid) {
  const raw = Number(localStorage.getItem(getLastActivityKey(uid)) || 0);
  return Number.isFinite(raw) ? raw : 0;
}

function writeLastActivity(uid, timestamp = Date.now()) {
  try {
    localStorage.setItem(getLastActivityKey(uid), String(timestamp));
  } catch {
    // Ignore storage errors.
  }
}

function hasReturnLockFlag(uid) {
  try {
    return sessionStorage.getItem(getReturnLockKey(uid)) === "1";
  } catch {
    return false;
  }
}

function setReturnLockFlag(uid) {
  try {
    sessionStorage.setItem(getReturnLockKey(uid), "1");
  } catch {
    // Ignore storage errors.
  }
}

function clearReturnLockFlag(uid) {
  try {
    sessionStorage.removeItem(getReturnLockKey(uid));
  } catch {
    // Ignore storage errors.
  }
}

function recordUserActivity(force = false) {
  if (!currentUser || sessionLocked || userSessionSecuritySettings.sessionMode !== "lock_after_inactivity") {
    return;
  }

  const now = Date.now();
  if (!force && now - lastActivityCommitAt < ACTIVITY_WRITE_INTERVAL_MS) {
    return;
  }

  writeLastActivity(currentUser.uid, now);
  lastActivityCommitAt = now;
}

function clearLockWatchers() {
  ACTIVITY_EVENTS.forEach((eventName) => {
    window.removeEventListener(eventName, handleActivityEvent, true);
  });
  document.removeEventListener("visibilitychange", handleVisibilityOrFocus, true);
  window.removeEventListener("focus", handleVisibilityOrFocus, true);
  if (inactivityIntervalId) {
    window.clearInterval(inactivityIntervalId);
    inactivityIntervalId = 0;
  }
  lockWatchersBound = false;
}

function bindLockWatchers() {
  clearLockWatchers();
  if (!currentUser || userSessionSecuritySettings.sessionMode === "none") {
    return;
  }

  if (userSessionSecuritySettings.sessionMode === "lock_after_inactivity") {
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivityEvent, true);
    });
    inactivityIntervalId = window.setInterval(() => {
      void maybeLockSession("Your session was locked after inactivity.");
    }, LOCK_CHECK_INTERVAL_MS);
    recordUserActivity(true);
  }

  document.addEventListener("visibilitychange", handleVisibilityOrFocus, true);
  window.addEventListener("focus", handleVisibilityOrFocus, true);
  lockWatchersBound = true;
}

function handleActivityEvent() {
  recordUserActivity(false);
}

function handleVisibilityOrFocus() {
  if (!currentUser || sessionLocked) return;

  if (document.visibilityState && document.visibilityState !== "visible") {
    if (userSessionSecuritySettings.sessionMode === "lock_on_return") {
      setReturnLockFlag(currentUser.uid);
    }
    return;
  }

  if (userSessionSecuritySettings.sessionMode === "lock_on_return" && hasReturnLockFlag(currentUser.uid)) {
    clearReturnLockFlag(currentUser.uid);
    showSiteLockOverlay("Unlock your account to continue.");
    return;
  }

  if (userSessionSecuritySettings.sessionMode === "lock_after_inactivity") {
    void maybeLockSession("Your session was locked after inactivity.");
  }
}

function shouldLockForInactivity(user) {
  if (!user || userSessionSecuritySettings.sessionMode !== "lock_after_inactivity") {
    return false;
  }

  const lastActivity = readLastActivity(user.uid);
  if (!lastActivity) {
    writeLastActivity(user.uid, Date.now());
    return false;
  }

  const thresholdMs = clamp(Number(userSessionSecuritySettings.inactivityMinutes || 5), 1, 120) * 60 * 1000;
  return Date.now() - lastActivity >= thresholdMs;
}

function ensureSiteLockOverlay() {
  let overlay = document.getElementById("site-lock-overlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "site-lock-overlay";
  overlay.className = "site-experience-overlay";
  overlay.innerHTML = `
    <div class="site-experience-card site-lock-card" role="dialog" aria-modal="true" aria-labelledby="site-lock-title">
      <p class="site-experience-kicker">Session Locked</p>
      <h2 id="site-lock-title">Enter your password to continue</h2>
      <p id="site-lock-copy" class="site-experience-copy">Your account is still signed in, but this session needs to be unlocked.</p>
      <form id="site-lock-form" class="site-lock-form">
        <label for="site-lock-password">Password</label>
        <input id="site-lock-password" class="admin-input" type="password" autocomplete="current-password" required />
        <p id="site-lock-status" class="site-lock-status" aria-live="polite"></p>
        <div class="site-experience-actions">
          <button id="site-lock-submit" class="btn" type="submit">Unlock</button>
          <button id="site-lock-signout" class="btn secondary" type="button">Sign Out</button>
        </div>
      </form>
      <div id="site-lock-provider" class="site-lock-provider" hidden>
        <p class="site-lock-note">This account uses Google sign-in. Reconfirm with Google to continue.</p>
        <p id="site-lock-provider-status" class="site-lock-status" aria-live="polite"></p>
        <div class="site-experience-actions">
          <button id="site-lock-provider-btn" class="btn" type="button">Continue with Google</button>
          <button id="site-lock-provider-signout" class="btn secondary" type="button">Sign Out</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector("#site-lock-form");
  const passwordInput = overlay.querySelector("#site-lock-password");
  const submitButton = overlay.querySelector("#site-lock-submit");
  const statusEl = overlay.querySelector("#site-lock-status");
  const providerWrap = overlay.querySelector("#site-lock-provider");
  const providerButton = overlay.querySelector("#site-lock-provider-btn");
  const providerStatusEl = overlay.querySelector("#site-lock-provider-status");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user || !usesPasswordProvider(user)) return;

    const password = String(passwordInput?.value || "").trim();
    if (!password) {
      if (statusEl) {
        statusEl.textContent = "Enter your password to continue.";
        statusEl.className = "site-lock-status error";
      }
      return;
    }

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.textContent = "Unlocking...";
    }

    try {
      const credential = EmailAuthProvider.credential(user.email || "", password);
      await reauthenticateWithCredential(user, credential);
      hideSiteLockOverlay();
    } catch (error) {
      if (statusEl) {
        statusEl.textContent = error?.message || "Could not unlock session.";
        statusEl.className = "site-lock-status error";
      }
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
        submitButton.textContent = "Unlock";
      }
    }
  });

  providerButton?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (providerButton instanceof HTMLButtonElement) {
      providerButton.disabled = true;
      providerButton.textContent = "Opening...";
    }

    try {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
      hideSiteLockOverlay();
    } catch (error) {
      if (providerStatusEl) {
        providerStatusEl.textContent = error?.message || "Could not unlock session.";
        providerStatusEl.className = "site-lock-status error";
      }
    } finally {
      if (providerButton instanceof HTMLButtonElement) {
        providerButton.disabled = false;
        providerButton.textContent = "Continue with Google";
      }
    }
  });

  overlay.querySelector("#site-lock-signout")?.addEventListener("click", logoutAndRedirect);
  overlay.querySelector("#site-lock-provider-signout")?.addEventListener("click", logoutAndRedirect);

  return overlay;
}

function showSiteLockOverlay(message = "Your session is locked.") {
  const overlay = ensureSiteLockOverlay();
  const copyEl = overlay.querySelector("#site-lock-copy");
  const form = overlay.querySelector("#site-lock-form");
  const providerWrap = overlay.querySelector("#site-lock-provider");
  const passwordInput = overlay.querySelector("#site-lock-password");
  const statusEl = overlay.querySelector("#site-lock-status");
  const providerStatusEl = overlay.querySelector("#site-lock-provider-status");
  const titleEl = overlay.querySelector("#site-lock-title");
  const usePassword = usesPasswordProvider(auth.currentUser);

  if (copyEl) {
    copyEl.textContent = message || "Your account is still signed in, but this session needs to be unlocked.";
  }
  if (titleEl) {
    titleEl.textContent = usePassword ? "Enter your password to continue" : "Confirm your sign-in to continue";
  }
  if (statusEl) {
    statusEl.textContent = "";
    statusEl.className = "site-lock-status";
  }
  if (providerStatusEl) {
    providerStatusEl.textContent = "";
    providerStatusEl.className = "site-lock-status";
  }
  if (passwordInput instanceof HTMLInputElement) {
    passwordInput.value = "";
  }
  if (form instanceof HTMLElement) {
    form.hidden = !usePassword;
  }
  if (providerWrap instanceof HTMLElement) {
    providerWrap.hidden = usePassword;
  }

  overlay.classList.add("active");
  document.body.classList.add("site-lock-active");
  sessionLocked = true;
  resetSessionAccessWaiter();
  if (passwordInput instanceof HTMLInputElement && usePassword) {
    window.setTimeout(() => passwordInput.focus(), 60);
  }
}

function hideSiteLockOverlay() {
  const overlay = document.getElementById("site-lock-overlay");
  if (overlay) {
    overlay.classList.remove("active");
  }
  document.body.classList.remove("site-lock-active");
  sessionLocked = false;
  if (currentUser) {
    writeLastActivity(currentUser.uid, Date.now());
    lastActivityCommitAt = Date.now();
    clearReturnLockFlag(currentUser.uid);
  }
  releaseSessionAccess();
}

async function maybeLockSession(message) {
  if (!currentUser || sessionLocked) return false;
  if (!shouldLockForInactivity(currentUser)) return false;
  showSiteLockOverlay(message);
  return true;
}

function ensureWelcomeModal() {
  let overlay = document.getElementById("site-welcome-modal");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "site-welcome-modal";
  overlay.className = "site-experience-overlay";
  overlay.innerHTML = `
    <div class="site-experience-card site-welcome-card" role="dialog" aria-modal="true" aria-labelledby="site-welcome-title">
      <button id="site-welcome-close" class="site-experience-close" type="button" aria-label="Close">×</button>
      <div id="site-welcome-media" class="site-experience-media" hidden>
        <img id="site-welcome-image" src="" alt="" />
      </div>
      <div class="site-experience-content">
        <p class="site-experience-kicker">Welcome</p>
        <h2 id="site-welcome-title">Welcome back</h2>
        <p id="site-welcome-message" class="site-experience-copy"></p>
        <div class="site-experience-actions">
          <a id="site-welcome-action" class="btn" href="#" hidden>Open</a>
          <button id="site-welcome-dismiss" class="btn secondary" type="button">Close</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => {
    overlay.classList.remove("active");
  };

  overlay.querySelector("#site-welcome-close")?.addEventListener("click", closeModal);
  overlay.querySelector("#site-welcome-dismiss")?.addEventListener("click", closeModal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });

  return overlay;
}

function maybeShowWelcomeModal() {
  const pending = sessionStorage.getItem(LOGIN_MODAL_PENDING_KEY) === "1";
  sessionStorage.removeItem(LOGIN_MODAL_PENDING_KEY);
  if (!pending) return;

  const settings = siteExperienceSettings;
  if (!settings.modalEnabled) return;

  const overlay = ensureWelcomeModal();
  const titleEl = overlay.querySelector("#site-welcome-title");
  const messageEl = overlay.querySelector("#site-welcome-message");
  const mediaEl = overlay.querySelector("#site-welcome-media");
  const imageEl = overlay.querySelector("#site-welcome-image");
  const actionEl = overlay.querySelector("#site-welcome-action");

  if (titleEl) {
    titleEl.textContent = settings.modalTitle || "Welcome back to Beulah Foods";
  }
  if (messageEl) {
    messageEl.textContent = settings.modalMessage || "Check the latest update before you continue shopping.";
  }

  const image = String(settings.modalImage || "").trim();
  if (mediaEl instanceof HTMLElement && imageEl instanceof HTMLImageElement) {
    if (image) {
      imageEl.src = image;
      imageEl.alt = settings.modalTitle || "Beulah Foods update";
      mediaEl.hidden = false;
    } else {
      imageEl.removeAttribute("src");
      mediaEl.hidden = true;
    }
  }

  if (actionEl instanceof HTMLAnchorElement) {
    const hasAction = Boolean(settings.modalButtonLabel && settings.modalButtonUrl);
    actionEl.hidden = !hasAction;
    if (hasAction) {
      actionEl.textContent = settings.modalButtonLabel;
      actionEl.href = settings.modalButtonUrl;
      actionEl.target = /^https?:\/\//i.test(settings.modalButtonUrl) ? "_blank" : "_self";
      actionEl.rel = actionEl.target === "_blank" ? "noreferrer noopener" : "";
    }
  }

  overlay.classList.add("active");
}

async function logoutAndRedirect() {
  const shouldLogout = window.confirm("Are you sure you want to log out?");
  if (!shouldLogout) return;

  try {
    clearLockWatchers();
    if (currentUser?.uid) {
      clearReturnLockFlag(currentUser.uid);
    }
    hideSiteLockOverlay();
    if (isAdminShellPage) {
      sessionStorage.setItem("redirectAfterLogin", getCurrentPageName());
    }
    const redirectTarget = isAdminShellPage ? "auth.html?scope=admin" : "index.html";
    window.__beulahShowPageLoader?.();
    await signOut(auth);
    window.location.href = redirectTarget;
  } catch (error) {
    window.__beulahHidePageLoader?.();
    alert(error.message);
  }
}

document.getElementById("logout-btn")?.addEventListener("click", logoutAndRedirect);
document.getElementById("logout-btn-mobile")?.addEventListener("click", logoutAndRedirect);

document.querySelectorAll(".dropdown-item.logout").forEach((button) => {
  button.addEventListener("click", logoutAndRedirect);
});

document.querySelectorAll(".dropdown-item").forEach((item) => {
  if (item.tagName === "A" && item.textContent.trim().toLowerCase().includes("account")) {
    item.setAttribute("href", "settings.html");
  }
});

onAuthStateChanged(auth, async (user) => {
  const pageName = getCurrentPageName();
  resetSessionAccessWaiter();

  try {
    siteExperienceSettings = await waitForSiteExperienceSettings();
  } catch {
    siteExperienceSettings = { ...DEFAULT_SITE_EXPERIENCE };
  }

  if (PUBLIC_AUTH_PAGES.has(pageName)) {
    currentUser = user;
    syncLocalUser(user);
    renderAuthUI(user);
    if (user) {
      await hydrateStoredUserName(user);
      renderAuthUI(user);
    }
    releaseSessionAccess();
    return;
  }

  if (user) {
    try {
      await user.reload();
    } catch {
      // Ignore refresh errors and use the current auth state.
    }
  }

  if (user && requiresEmailVerification(user)) {
    stashAuthStatus("Verify your email from your inbox before signing in.", "error");
    clearLockWatchers();
    hideSiteLockOverlay();
    await signOut(auth).catch(() => {});
    currentUser = null;
    syncLocalUser(null);
    renderAuthUI(null);

    if (VERIFIED_GUARD_PAGES.has(pageName)) {
      window.__beulahShowPageLoader?.();
      window.location.href = "auth.html";
      return;
    }

    releaseSessionAccess();
    return;
  }

  currentUser = user;
  syncLocalUser(user);
  renderAuthUI(user);
  if (user) {
    await hydrateStoredUserName(user);
    renderAuthUI(user);
  }

  if (!user) {
    clearLockWatchers();
    userSessionSecuritySettings = { ...DEFAULT_USER_SESSION_SECURITY };
    hideSiteLockOverlay();
    releaseSessionAccess();
    return;
  }

  userSessionSecuritySettings = await fetchUserSessionSecurity(user);

  const justLoggedIn = sessionStorage.getItem(LOGIN_MODAL_PENDING_KEY) === "1";
  if (justLoggedIn) {
    writeLastActivity(user.uid, Date.now());
    lastActivityCommitAt = Date.now();
    clearReturnLockFlag(user.uid);
  }

  if (userSessionSecuritySettings.sessionMode === "none") {
    clearLockWatchers();
  } else {
    bindLockWatchers();
  }

  if (
    userSessionSecuritySettings.sessionMode === "lock_on_return" &&
    hasReturnLockFlag(user.uid)
  ) {
    clearReturnLockFlag(user.uid);
    showSiteLockOverlay("Unlock your account to continue.");
    return;
  }

  if (await maybeLockSession("Enter your password to continue.")) {
    return;
  }

  if (user && window.location.pathname.includes("checkout.html")) {
    document.body.classList.remove("auth-blocked");
    const authOverlay = document.getElementById("auth-overlay");
    if (authOverlay) authOverlay.style.display = "none";
  }

  releaseSessionAccess();
  maybeShowWelcomeModal();
});

window.addEventListener("resize", () => {
  renderAuthUI(currentUser);
});

// Optional auth forms used on older auth modal variants.
document.getElementById("signupForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.getElementById("signup-name")?.value.trim() || "";
  const email = document.getElementById("signup-email")?.value.trim() || "";
  const password = document.getElementById("signup-password")?.value || "";

  try {
    await waitForSiteExperienceSettings();
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(credential.user, { displayName: name });
    }
    await sendEmailVerification(credential.user);
    stashAuthStatus("Account created. Check your inbox to verify your email before signing in.", "success");
    await signOut(auth);
    window.location.href = "auth.html";
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("loginForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("login-email")?.value.trim() || "";
  const password = document.getElementById("login-password")?.value || "";

  try {
    await waitForSiteExperienceSettings();
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await credential.user.reload();
    if (requiresEmailVerification(credential.user)) {
      stashAuthStatus("Verify your email from your inbox before signing in.", "error");
      await signOut(auth);
      window.location.href = "auth.html";
      return;
    }
    sessionStorage.setItem(LOGIN_MODAL_PENDING_KEY, "1");
    window.location.href = "index.html";
  } catch (error) {
    alert(error.message);
  }
});
