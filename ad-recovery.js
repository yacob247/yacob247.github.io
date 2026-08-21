/* Non-blocking ad recovery: never gates, redirects, or interrupts page content. */
(function () {
  "use strict";

  function markStatus() {
    document.documentElement.dataset.envizionAdRecovery = "content-available";
    document.querySelectorAll("[data-format='push'], [data-format='video-slider'], [data-format='vast-3.0']").forEach(function (slot) {
      if (!slot.querySelector("iframe, video, embed")) {
        slot.setAttribute("data-ad-status", "unavailable");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      window.setTimeout(markStatus, 2500);
    }, { once: true });
  } else {
    window.setTimeout(markStatus, 2500);
  }
}());
