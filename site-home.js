const routes = document.querySelectorAll("[data-route]");

routes.forEach((route) => {
  route.addEventListener("mouseenter", () => {
    document.documentElement.style.setProperty("--blue", route.dataset.accent || "#2563eb");
  });
});

const year = document.querySelector("[data-year]");
if (year) year.textContent = new Date().getFullYear();

// Use Google's configured consent message instead of the site's old
// localStorage-only banner on pages that load this shared shell.
if (!document.querySelector('script[src*="fundingchoicesmessages.google.com/i/pub-"]')) {
  const cmp = document.createElement('script');
  cmp.async = true;
  cmp.src = 'https://fundingchoicesmessages.google.com/i/pub-5812524294035974?ers=1';
  document.head.appendChild(cmp);
}
document.getElementById('cookie-banner')?.remove();
