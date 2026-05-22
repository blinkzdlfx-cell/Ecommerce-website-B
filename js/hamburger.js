const hamburger = document.getElementById("hamburger") || document.querySelector(".hamburger");
const nav = document.querySelector("nav");

if (hamburger && nav) {
  hamburger.addEventListener("click", () => {
    nav.classList.toggle("active");
  });

  // Close mobile menu after clicking a nav link.
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("active");
    });
  });
}
