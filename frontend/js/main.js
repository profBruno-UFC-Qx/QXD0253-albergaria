document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", () => {
      document.body.dataset.lastNavigation = link.getAttribute("href");
    });
  });
});