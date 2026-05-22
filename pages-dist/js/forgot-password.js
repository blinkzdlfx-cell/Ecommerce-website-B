import { auth } from "./firebase-init.js";
import {
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const form = document.getElementById("reset-form");
const emailInput = document.getElementById("reset-email");
const statusEl = document.getElementById("reset-status");

function setStatus(message, type = "") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `settings-status${type ? ` ${type}` : ""}`;
}

async function handleReset(event) {
  event.preventDefault();

  const email = emailInput?.value.trim() || "";
  if (!email) {
    setStatus("Please enter your email.", "error");
    return;
  }

  Array.from(form.elements).forEach((el) => {
    el.disabled = true;
  });
  window.__beulahShowPageLoader?.();
  setStatus("Sending reset email...", "info");

  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    if (methods.length === 1 && methods[0] === "google.com") {
      setStatus(
        "This account uses Google sign-in. Use Continue with Google on the sign-in page.",
        "error"
      );
      return;
    }

    await sendPasswordResetEmail(auth, email);
    setStatus(
      "If an account exists for this email, a reset link has been sent.",
      "success"
    );
  } catch (error) {
    if (error?.code === "auth/invalid-email") {
      setStatus("Please enter a valid email address.", "error");
      return;
    }
    setStatus(
      "Unable to send reset email right now. Please try again.",
      "error"
    );
  } finally {
    window.__beulahHidePageLoader?.();
    Array.from(form.elements).forEach((el) => {
      el.disabled = false;
    });
  }
}

form?.addEventListener("submit", handleReset);
