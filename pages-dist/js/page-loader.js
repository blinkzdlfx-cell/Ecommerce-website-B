const PAGE_LOADER_FLAG = "beulah_page_loader_pending";

function ensureLoader() {
  let loader = document.getElementById("page-loader");
  if (loader) return loader;

  loader = document.createElement("div");
  loader.id = "page-loader";
  loader.className = "page-loader";
  loader.innerHTML = `
    <div class="page-loader-card" role="status" aria-live="polite" aria-label="Loading">
      <div class="page-loader-media" aria-hidden="true">
        <span class="page-loader-ring"></span>
        <img class="page-loader-logo" src="images/beulah-logop.jpg" alt="" />
      </div>
      <p class="page-loader-text">Loading...</p>
    </div>
  `;

  document.body.appendChild(loader);
  return loader;
}

function showLoader(persist = true) {
  const loader = ensureLoader();
  loader.classList.add("active");
  if (persist) {
    sessionStorage.setItem(PAGE_LOADER_FLAG, "1");
  }
}

function hideLoader() {
  const loader = document.getElementById("page-loader");
  if (loader) loader.classList.remove("active");
  sessionStorage.removeItem(PAGE_LOADER_FLAG);
}

function shouldHandleAnchor(anchor, event) {
  if (!anchor || !anchor.getAttribute("href")) return false;
  if (event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target !== "_self") return false;

  const href = anchor.getAttribute("href").trim();
  if (!href || href.startsWith("#")) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
    return false;
  }

  const targetUrl = new URL(anchor.href, window.location.href);
  const currentUrl = new URL(window.location.href);
  const isSameUrl =
    targetUrl.pathname === currentUrl.pathname &&
    targetUrl.search === currentUrl.search &&
    targetUrl.hash === currentUrl.hash;

  return targetUrl.origin === currentUrl.origin && !isSameUrl;
}

function bindLoaderEvents() {
  document.addEventListener("click", (event) => {
    const anchor = event.target.closest("a[href]");
    if (anchor && shouldHandleAnchor(anchor, event)) {
      showLoader(true);
      return;
    }

    const buttonWithNav = event.target.closest("button[onclick]");
    if (!buttonWithNav) return;

    const handler = buttonWithNav.getAttribute("onclick") || "";
    const hasNavigation =
      /location\s*\.\s*href\s*=/.test(handler) ||
      /window\s*\.\s*location\s*=/.test(handler) ||
      /location\s*\.\s*assign\s*\(/.test(handler) ||
      /location\s*\.\s*replace\s*\(/.test(handler);

    if (hasNavigation) showLoader(true);
  }, true);
}

window.__beulahShowPageLoader = () => showLoader(true);
window.__beulahHidePageLoader = hideLoader;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    ensureLoader();
    bindLoaderEvents();
  }, { once: true });
} else {
  ensureLoader();
  bindLoaderEvents();
}

if (sessionStorage.getItem(PAGE_LOADER_FLAG) === "1") {
  showLoader(false);
}

window.addEventListener("load", () => {
  setTimeout(() => {
    hideLoader();
  }, 180);
}, { once: true });
