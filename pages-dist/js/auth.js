import { auth, waitForSiteExperienceSettings } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

let isSignup = false;
let authFlowInProgress = false;

const AUTH_STATUS_MESSAGE_KEY = "beulah_auth_status_message";
const AUTH_STATUS_TYPE_KEY = "beulah_auth_status_type";
const VERIFICATION_RESEND_KEY = "beulah_last_verification_email_sent_at";
const VERIFICATION_RESEND_COOLDOWN_MS = 2 * 60 * 1000;
const LOGIN_MODAL_PENDING_KEY = "beulah_welcome_modal_pending";
const ADMIN_LOGIN_ONLY_PAGES = new Set([
  "dashboard.html",
  "admin-orders.html",
  "admin-products.html",
  "admin-marketing.html",
  "admin-blog.html"
]);

const form = document.getElementById("auth-form");
const toggle = document.getElementById("toggle-auth");
const title = document.getElementById("auth-title");
const nameGroup = document.getElementById("name-group");
const fullNameInput = document.getElementById("full-name");
const googleButton = document.getElementById("google-signin");
const statusEl = document.getElementById("auth-status");
const authScope = new URLSearchParams(window.location.search).get("scope");
const redirectAfterLoginValue = String(sessionStorage.getItem("redirectAfterLogin") || "")
  .trim()
  .toLowerCase()
  .split(/[?#]/)[0]
  .split("/")
  .pop();
const adminLoginOnly = authScope === "admin" || ADMIN_LOGIN_ONLY_PAGES.has(redirectAfterLoginValue);

function mapGoogleError(error) {
  if (error?.code === "auth/unauthorized-domain") {
    return "Google sign-in failed: this domain is not authorized in Firebase Auth settings.";
  }
  return error.message;
}

function setAuthMode(nextIsSignup) {
  isSignup = adminLoginOnly ? false : Boolean(nextIsSignup);
  title.textContent = isSignup ? "Create Account" : "Sign In";
  if (nameGroup) {
    nameGroup.hidden = !isSignup;
    nameGroup.style.display = isSignup ? "grid" : "none";
  }
  if (fullNameInput) {
    fullNameInput.required = isSignup;
    fullNameInput.value = isSignup ? fullNameInput.value : "";
  }
  if (toggle) {
    toggle.hidden = adminLoginOnly;
    if (!adminLoginOnly) {
      toggle.innerHTML = isSignup
        ? "Already have an account? <span>Sign in</span>"
        : "Don't have an account? <span>Create one</span>";
    }
  }
}

function setAuthStatus(message = "", type = "") {
  if (!statusEl) return;
  const text = String(message || "").trim();
  statusEl.hidden = !text;
  statusEl.textContent = text;
  statusEl.className = `auth-status${type ? ` ${type}` : ""}`;
}

function stashAuthStatus(message, type = "info") {
  const text = String(message || "").trim();
  if (!text) return;
  sessionStorage.setItem(AUTH_STATUS_MESSAGE_KEY, text);
  sessionStorage.setItem(AUTH_STATUS_TYPE_KEY, type);
}

function consumeAuthStatus() {
  const message = String(sessionStorage.getItem(AUTH_STATUS_MESSAGE_KEY) || "").trim();
  const type = String(sessionStorage.getItem(AUTH_STATUS_TYPE_KEY) || "").trim();
  sessionStorage.removeItem(AUTH_STATUS_MESSAGE_KEY);
  sessionStorage.removeItem(AUTH_STATUS_TYPE_KEY);
  return { message, type };
}

function sanitizeUserName(value) {
  const text = String(value || "").trim();
  if (!text || text.includes("@")) return "";
  return text;
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

async function maybeResendVerification(user) {
  if (!user) return false;
  const lastSentAt = Number(sessionStorage.getItem(VERIFICATION_RESEND_KEY) || 0);
  if (Date.now() - lastSentAt < VERIFICATION_RESEND_COOLDOWN_MS) {
    return false;
  }
  await sendEmailVerification(user);
  sessionStorage.setItem(VERIFICATION_RESEND_KEY, String(Date.now()));
  return true;
}

function ensureSignInCelebrationStyles() {
  if (document.getElementById("signin-ribbon-style")) return;
  const style = document.createElement("style");
  style.id = "signin-ribbon-style";
  style.textContent = `
    .signin-ribbon-overlay {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 2200;
    }
    .signin-ribbon {
      position: absolute;
      top: -16vh;
      width: 10px;
      height: 34px;
      border-radius: 4px;
      opacity: 0.95;
      transform: translate3d(0, -16vh, 0) rotate(var(--ribbon-start, 0deg));
      animation: signinRibbonDrop var(--ribbon-duration, 1200ms) cubic-bezier(0.22, 0.8, 0.25, 1) forwards;
      animation-delay: var(--ribbon-delay, 0ms);
    }
    @keyframes signinRibbonDrop {
      to {
        transform: translate3d(var(--ribbon-drift, 0px), 115vh, 0) rotate(var(--ribbon-end, 180deg));
        opacity: 0.12;
      }
    }
  `;
  document.head.appendChild(style);
}

async function playSignInCelebration() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  ensureSignInCelebrationStyles();

  const overlay = document.createElement("div");
  overlay.className = "signin-ribbon-overlay";

  const colors = ["#f4c430", "#1f6e4c", "#7cb342", "#ffffff", "#ff8a65"];
  const total = 72;
  for (let i = 0; i < total; i += 1) {
    const ribbon = document.createElement("span");
    ribbon.className = "signin-ribbon";
    ribbon.style.left = `${Math.random() * 100}%`;
    ribbon.style.background = colors[i % colors.length];
    ribbon.style.setProperty("--ribbon-drift", `${(Math.random() - 0.5) * 260}px`);
    ribbon.style.setProperty("--ribbon-start", `${(Math.random() - 0.5) * 140}deg`);
    ribbon.style.setProperty("--ribbon-end", `${(Math.random() - 0.5) * 520}deg`);
    ribbon.style.setProperty("--ribbon-duration", `${900 + Math.random() * 700}ms`);
    ribbon.style.setProperty("--ribbon-delay", `${Math.random() * 260}ms`);
    overlay.appendChild(ribbon);
  }

  document.body.appendChild(overlay);
  await new Promise((resolve) => window.setTimeout(resolve, 1300));
  overlay.remove();
}

async function redirectSignedInUser(options = {}) {
  const celebrate = Boolean(options.celebrate);
  const redirect = sessionStorage.getItem("redirectAfterLogin") || "index.html";
  sessionStorage.removeItem("redirectAfterLogin");
  sessionStorage.setItem(LOGIN_MODAL_PENDING_KEY, "1");
  authFlowInProgress = true;
  if (celebrate) {
    window.__beulahHidePageLoader?.();
    await playSignInCelebration();
  }
  window.__beulahShowPageLoader?.();
  window.location.href = redirect;
}

function mapAuthError(error) {
  const code = String(error?.code || "").trim();
  if (code === "auth/email-already-in-use") {
    return "That email address is already in use.";
  }
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Invalid email or password.";
  }
  if (code === "auth/weak-password") {
    return "Password should be at least 6 characters.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Please wait and try again.";
  }
  return error?.message || "Unable to continue.";
}

toggle?.addEventListener("click", () => {
  if (adminLoginOnly) return;
  setAuthStatus("");
  setAuthMode(!isSignup);
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const fullName = sanitizeUserName(fullNameInput?.value || "");

  try {
    authFlowInProgress = true;
    window.__beulahShowPageLoader?.();
    setAuthStatus("");
    await waitForSiteExperienceSettings();

    if (isSignup) {
      if (!fullName || fullName.length < 2) {
        throw new Error("Please enter your full name.");
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });
      localStorage.setItem("userName", fullName);
      await sendEmailVerification(cred.user);
      stashAuthStatus(
        "Account created. Check your inbox to verify your email before signing in.",
        "success"
      );
      await signOut(auth);
      form.reset();
      setAuthMode(false);
      authFlowInProgress = false;
      const notice = consumeAuthStatus();
      setAuthStatus(notice.message, notice.type || "success");
      window.__beulahHidePageLoader?.();
      return;
    } else {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await credential.user.reload();
      if (requiresEmailVerification(credential.user)) {
        let message = "Verify your email from your inbox before signing in.";
        try {
          const resent = await maybeResendVerification(credential.user);
          if (resent) {
            message = "Verify your email from your inbox before signing in. A new verification link has been sent.";
          }
        } catch {
          // Keep base message if resend fails.
        }
        stashAuthStatus(message, "error");
        await signOut(auth);
        authFlowInProgress = false;
        const notice = consumeAuthStatus();
        setAuthStatus(notice.message, notice.type || "error");
        window.__beulahHidePageLoader?.();
        return;
      }

      await redirectSignedInUser({ celebrate: true });
    }
  } catch (err) {
    authFlowInProgress = false;
    window.__beulahHidePageLoader?.();
    setAuthStatus(mapAuthError(err), "error");
  }
});

googleButton?.addEventListener("click", async () => {
  try {
    authFlowInProgress = true;
    window.__beulahShowPageLoader?.();
    setAuthStatus("");
    await waitForSiteExperienceSettings();
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    await credential.user.reload();
    await redirectSignedInUser({ celebrate: true });
  } catch (err) {
    authFlowInProgress = false;
    window.__beulahHidePageLoader?.();
    setAuthStatus(mapGoogleError(err), "error");
  }
});

setAuthMode(false);

onAuthStateChanged(auth, async (user) => {
  if (authFlowInProgress) return;

  if (!user) {
    const notice = consumeAuthStatus();
    setAuthStatus(notice.message, notice.type);
    window.__beulahHidePageLoader?.();
    return;
  }

  try {
    await user.reload();
  } catch {
    // Ignore reload errors and evaluate current token state.
  }

  if (requiresEmailVerification(user)) {
    stashAuthStatus("Verify your email from your inbox before signing in.", "error");
    authFlowInProgress = true;
    await signOut(auth).catch(() => {});
    authFlowInProgress = false;
    const notice = consumeAuthStatus();
    setAuthStatus(notice.message, notice.type || "error");
    window.__beulahHidePageLoader?.();
    return;
  }

  void redirectSignedInUser();
});
