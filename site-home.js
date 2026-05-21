const routes = document.querySelectorAll("[data-route]");

routes.forEach((route) => {
  route.addEventListener("mouseenter", () => {
    document.documentElement.style.setProperty("--blue", route.dataset.accent || "#2563eb");
  });
});

const year = document.querySelector("[data-year]");
if (year) year.textContent = new Date().getFullYear();
