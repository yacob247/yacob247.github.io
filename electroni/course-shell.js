(function(){
  const title = document.title || "Electroni Course";

  function ensureFonts(){
    if(document.querySelector('link[href*="fonts.googleapis.com/css2?family=Sora"]')) return;
    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = "https://fonts.googleapis.com";
    document.head.appendChild(preconnect);
    const fonts = document.createElement("link");
    fonts.rel = "stylesheet";
    fonts.href = "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Nunito:wght@400;600;700;800&display=swap";
    document.head.appendChild(fonts);
  }

  function loadScript(src){
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if(existing) {
        existing.addEventListener("load", resolve, {once:true});
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load ${src}`));
      document.body.appendChild(script);
    });
  }

  function renderShell(){
    const subject = document.body.dataset.subject || new URLSearchParams(location.search).get("subject") || "";
    document.body.dataset.subject = subject;
    document.body.innerHTML = `
      <nav>
        <a href="electroni.html" class="logo">Electron<span>i</span></a>
        <div class="nav-links"><a href="subjects.html">Subjects</a><a href="reminders.html">Reminders</a><a href="login.html">Account</a></div>
      </nav>
      <div class="course-shell">
        <aside class="panel left-panel">
          <div class="subject-head">
            <div class="subject-kicker" id="subject-meta">Year 12</div>
            <h1 id="subject-title">${title.replace(" - Electroni", "")}</h1>
            <p><a id="textbook-link" target="_blank" rel="noopener">Open textbook</a></p>
          </div>
          <div class="topic-list" id="topic-list"></div>
        </aside>
        <main class="panel main-panel">
          <div class="lesson-head">
            <div><span class="code-pill" id="topic-code">CODE</span><h2 id="topic-title">Topic</h2></div>
            <a class="btn ghost" id="topic-textbook-link" target="_blank" rel="noopener">Textbook</a>
          </div>
          <div class="video-wrap"><div id="video-player"></div></div>
          <div class="video-controls" id="video-controls">
            <button class="icon-btn" id="back-btn">-10</button>
            <button class="icon-btn" id="play-btn">Play</button>
            <button class="icon-btn" id="pause-btn">Pause</button>
            <button class="icon-btn" id="forward-btn">+10</button>
            <input type="range" id="video-progress" min="0" max="100" value="0">
            <select id="speed-select"><option value="0.75">0.75x</option><option value="1" selected>1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option></select>
          </div>
          <div class="lesson-grid">
            <section class="lesson-card"><h3>Quiz</h3><p class="muted" id="quiz-question"></p><div id="quiz-options"></div><button class="btn primary" id="submit-quiz">Submit answer</button><div class="status" id="quiz-result"></div></section>
            <section class="lesson-card"><h3>Notes</h3><textarea id="topic-notes" placeholder="Write lesson notes..."></textarea><button class="btn orange" id="save-notes">Save notes</button><div class="status" id="notes-status"></div></section>
          </div>
        </main>
        <aside class="panel right-panel">
          <section class="right-section"><h3>Missed Work</h3><div id="missed-list"></div></section>
          <section class="right-section">
            <h3>Revision Reminders</h3>
            <div class="settings-grid">
              <label>Email<input id="reminder-email" type="email"></label>
              <label>Interval<select id="reminder-interval"><option value="10">Every 10 minutes</option><option value="15">Every 15 minutes</option><option value="30">Every 30 minutes</option><option value="60">Hourly</option><option value="1440">Daily</option><option value="2880">Every 2 days</option><option value="10080">Weekly</option></select></label>
              <p class="muted">Timezone: <span id="reminder-timezone"></span></p>
              <p class="muted">Next: <span id="next-reminder">Not set</span></p>
              <button class="btn primary" id="save-reminders">Save reminders</button>
              <button class="btn ghost" id="send-test-reminder">Send test email</button>
            </div>
          </section>
          <section class="right-section teacher-panel" id="teacher-panel" hidden>
            <h3 id="teacher-role-label">Teacher controls</h3>
            <div class="settings-grid">
              <div class="mini-grid"><input id="new-school-code" placeholder="School code"><input id="new-school-name" placeholder="School name"></div>
              <button class="btn primary" id="create-school-code">Create code</button>
              <div class="mini-grid"><input id="assign-code" placeholder="Class/school code"><input id="assign-due" type="datetime-local"></div>
              <button class="btn orange" id="assign-work">Assign current topic</button>
              <div class="status" id="teacher-status"></div>
            </div>
          </section>
        </aside>
      </div>`;
  }

  async function boot(){
    ensureFonts();
    renderShell();
    await loadScript("../firebase-config.js");
    await loadScript("course-data.js");
    await loadScript("electroni-mail.js");
    await loadScript("missed-work.js");
    await loadScript("course.js");
  }

  boot().catch(error => {
    document.body.innerHTML = `<main class="panel access-denied" style="max-width:720px;margin:2rem auto"><h2>Course could not load</h2><p>${String(error.message || error)}</p><p><a class="btn primary" href="subjects.html">Back to subjects</a></p></main>`;
  });
})();
