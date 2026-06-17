const { JSDOM } = require("jsdom");

async function testPage(urlPath, label) {
  const errors = [];

  const dom = await JSDOM.fromURL("http://localhost:8000/" + urlPath, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
  });

  dom.window.onerror = (msg, src, line, col, err) => {
    errors.push(`${msg} (line ${line})`);
  };

  // Wait for scripts (including DOMContentLoaded handlers) to settle
  await new Promise((resolve) => setTimeout(resolve, 800));

  console.log(`=== ${label} ===`);
  if (errors.length) {
    errors.forEach((e) => console.log("  ERROR:", e));
  } else {
    console.log("  No window.onerror events.");
  }

  // Spot-check key elements actually got populated
  const doc = dom.window.document;
  if (label === "index.html") {
    const featured = doc.getElementById("featured-teams-2022");
    console.log("  featured-teams-2022 children:", featured ? featured.children.length : "MISSING ELEMENT");
    const played = doc.getElementById("played-2026-mount");
    console.log("  played-2026-mount children:", played ? played.children.length : "MISSING ELEMENT");
  }
  if (label === "archive2022.html") {
    const grid = doc.getElementById("all-teams-grid");
    console.log("  all-teams-grid children:", grid ? grid.children.length : "MISSING ELEMENT", "(expect 32)");
    const groups = doc.getElementById("groups-mount");
    console.log("  groups-mount children:", groups ? groups.children.length : "MISSING ELEMENT", "(expect 8)");
    const awards = doc.getElementById("awards-mount");
    console.log("  awards-mount children:", awards ? awards.children.length : "MISSING ELEMENT", "(expect 9)");
  }
  if (label.startsWith("team.html")) {
    const name = doc.getElementById("team-name");
    console.log("  team-name text:", name ? name.textContent : "MISSING ELEMENT");
    const stats = doc.getElementById("team-stats");
    console.log("  team-stats children:", stats ? stats.children.length : "MISSING ELEMENT", "(expect 5)");
  }
  if (label === "trivia.html") {
    const intro = doc.getElementById("trivia-intro");
    console.log("  trivia-intro present:", !!intro);
  }

  dom.window.close();
}

(async () => {
  await testPage("index.html", "index.html");
  await testPage("archive2022.html", "archive2022.html");
  await testPage("team.html", "team.html?team=Argentina");
  await testPage("team.html", "team.html?team=Brazil");
  await testPage("team.html", "team.html?team=NotARealTeam");
  await testPage("trivia.html", "trivia.html");
})();
