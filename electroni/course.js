(function(){
  const FIREBASE_VERSION = "10.12.5";
  const FIREBASE_APP_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js`;
  const FIREBASE_FIRESTORE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore-compat.js`;
  const MAIL_APP_URL = window.ENVIZION_MAIL_APP_URL || "https://script.google.com/macros/s/AKfycbyYsr03oyOeBTaI2wImBWVjbsVwR0LHYT_6o0R6-vUuZVb9VmjtWiYFZgSduppvPhpj/exec";
  const BRAND_NAME = "Electroni";
  let player;
  let activeSubject;
  let activeTopic;
  let progressTimer;
  let reminderTimer;
  let maxWatchedTime = 0;
  let liveCourseData = null;
  let eventsBound = false;
  let protectionBound = false;

  function $(id){ return document.getElementById(id); }

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
      script.onerror = () => reject(new Error("Could not load " + src));
      document.head.appendChild(script);
    });
  }

  async function loadFirestoreCourseData(){
    if (window.loadFirestoreCourseData) {
      await window.loadFirestoreCourseData(window.getDb || getDbFallback);
      liveCourseData = window.Electroni_COURSE_DATA;
    }
    return liveCourseData;
  }

  async function getDbFallback(){
    if(!window.ENVIZION_FIREBASE_CONFIG) return null;
    await loadScript(FIREBASE_APP_URL);
    await loadScript(FIREBASE_FIRESTORE_URL);
    if(!window.firebase) return null;
    if(!firebase.apps.length) firebase.initializeApp(window.ENVIZION_FIREBASE_CONFIG);
    return firebase.firestore();
  }

  function data(){
    return liveCourseData || window.Electroni_COURSE_DATA || {subjects:[], schoolCodes:[]};
  }
  function getUser(){
    try {
      const user = JSON.parse(localStorage.getItem("Electroni_auth_user") || "null");
      if (user && user.email) {
        const apps = JSON.parse(localStorage.getItem('electroni_applications') || '[]');
        const currentApp = apps.find(a => String(a.email).toLowerCase() === String(user.email).toLowerCase());
        if (currentApp) {
          // Live status updates overwrite immediately
          user.paymentStatus = currentApp.paymentStatus || user.paymentStatus;
          user.subscriptionStatus = currentApp.subscriptionStatus || user.subscriptionStatus;
          user.status = currentApp.status || currentApp.approvalStatus || user.status;
          user.approvalStatus = currentApp.approvalStatus || currentApp.status || user.approvalStatus;
          user.paidSubjects = currentApp.paidSubjects || user.paidSubjects;
          user.selectedSubjects = currentApp.selectedSubjects || user.selectedSubjects;
        }
      }
      return user;
    } catch(error) { return null; }
  }

  function storageKey(suffix){
    const user = getUser();
    return `Electroni_course_${user?.uid || user?.email || "guest"}_${suffix}`;
  }

  function getProgress(){
    try { return JSON.parse(localStorage.getItem(storageKey("progress")) || "{}"); }
    catch(error) { return {}; }
  }

  function setProgress(progress){
    localStorage.setItem(storageKey("progress"), JSON.stringify(progress));
  }

  async function syncProgress(extra = {}){
    const user = getUser();
    if(!user?.uid) return;
    const db = await getDb();
    if(!db) return;
    await db.collection("Electroni_student_progress").doc(user.uid).set({
      uid: user.uid,
      email: user.email || "",
      progress: getProgress(),
      ...extra,
      updatedAtLocal: new Date().toISOString(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, {merge:true}).catch(error => console.warn("Progress sync skipped:", error));
  }

  function normalizeYouTubeId(value){
    const raw = String(value || "").trim();
    if(!raw) return "";
    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.replace(/^www\./, "");
      if(host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] || "";
      if(host.endsWith("youtube.com")) {
        const fromQuery = parsed.searchParams.get("v");
        if(fromQuery) return fromQuery;
        const parts = parsed.pathname.split("/").filter(Boolean);
        const marker = parts.findIndex(part => ["embed", "shorts", "live"].includes(part));
        if(marker >= 0 && parts[marker + 1]) return parts[marker + 1];
      }
    } catch(error) {}
    const patterns = [
      /youtu\.be\/([A-Za-z0-9_-]{6,})/,
      /youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/,
      /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
      /^([A-Za-z0-9_-]{6,})$/
    ];
    for(const pattern of patterns) {
      const match = raw.match(pattern);
      if(match) return match[1];
    }
    return raw;
  }

  function getSelectedClasses(){
    const user = getUser();
    const selected = Array.isArray(user?.selectedSubjects) ? user.selectedSubjects : [];
    const legacy = Array.isArray(user?.subjects) ? user.subjects : [];
    return (selected.length ? selected : legacy).filter(Boolean);
  }

  function normalizeArea(value){
    const raw = String(value || "").toLowerCase();
    if(raw === "commerce" || raw.includes("business") || raw.includes("economics")) return "economics";
    if(raw.includes("health")) return "health and pe";
    return raw.replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
  }

  // Live status helpers 
  function isTeacherOrSchool(user = getUser()){
    return ["teacher", "school"].includes(String(user?.role || "").toLowerCase()) && !!user?.schoolCode;
  }

  function hasPaidSubscription(user = getUser()){
    const payment = String(user?.paymentStatus || "").toLowerCase();
    const subscription = String(user?.subscriptionStatus || "").toLowerCase();
    const approval = String(user?.approvalStatus || user?.status || "").toLowerCase();
    return user?.paid === true || ["paid", "active"].includes(payment) || ["paid", "active", "approved"].includes(subscription) || approval === "approved";
  }

  function getPaidClasses(){
    const user = getUser();
    if(!user) return [];
    const approval = String(user.approvalStatus || user.status || "").toLowerCase();
    if(approval === "rejected" || approval === "pending") return [];
    const paid = Array.isArray(user.paidSubjects) ? user.paidSubjects.filter(Boolean) : [];
    if(paid.length) return paid;
    if(isTeacherOrSchool(user)) {
      const selected = getSelectedClasses();
      return selected.length ? selected : ["all subjects"];
    }
    if(hasPaidSubscription(user)) return getSelectedClasses();
    return [];
  }

  function classMatchesSubject(subject, item){
    const klass = normalizeArea(item);
    if(!klass) return false;
    if(klass === "all subjects") return true;
    const title = normalizeArea(subject.title);
    const slug = normalizeArea(subject.slug);
    return klass === slug || klass === title;
  }

  function subjectMatchesUserClasses(subject){
    return getPaidClasses().some(item => classMatchesSubject(subject, item));
  }

  function canUseCourse(subject){
    return !!getUser() && subjectMatchesUserClasses(subject);
  }

  function showAccessDenied(subject){
    document.body.classList.remove("restricted-content");
    const title = subject?.title || "this subject";
    const shell = document.querySelector(".course-shell");
    if(shell) {
      shell.innerHTML = `<main class="panel main-panel access-denied">
        <h2>Subscription approval required</h2>
        <p>${escapeHtml(title)} is not unlocked on this account. Selected classes are saved, but lessons, quizzes, textbooks and reminders open only after your subscription is approved.</p>
        <p><a class="btn primary" href="subjects.html">Back to subjects</a></p>
      </main>`;
    }
  }

  function escapeHtml(value){
    return String(value || "").replace(/[&<>"']/g, char => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    }[char]));
  }

  function render(){
    const slug = new URLSearchParams(location.search).get("subject") || document.body.dataset.subject;
    const topicFromUrl = new URLSearchParams(location.search).get("topic");
    activeSubject = data().subjects.find(subject => subject.slug === slug) || data().subjects.find(subjectMatchesUserClasses) || data().subjects[0];
    if(!activeSubject) return;
    document.title = `${activeSubject.title} - Electroni`;
    if(!canUseCourse(activeSubject)) {
      showAccessDenied(activeSubject);
      return;
    }
    activeTopic = activeSubject.topics?.find(topic => topic.code === topicFromUrl) || activeSubject.topics?.[0] || null;

    document.body.classList.toggle("restricted-content", !isTeacherOrSchool());
    renderCourseNavControls();
    $("subject-title").textContent = activeSubject.title;
    $("subject-meta").textContent = `${activeSubject.year || "Year 12"} / ${activeSubject.area || "Course"}`;
    const defaultTextbook = activeSubject.textbook || "";
    $("textbook-link").href = defaultTextbook || "#";
    $("textbook-link").textContent = defaultTextbook ? "Open textbook" : "No textbook linked";

    renderTopicList();
    renderTopic();
    renderMissedWork();
    renderRevisionSettings();
    renderLeaderboard();
    renderTeacherTools();
    renderBreadcrumbs();
    applyContentProtection();
  }

  function areaLabel(value){
    const labels = {
      "mathematics":"Mathematics",
      "sciences":"Sciences",
      "english":"English",
      "humanities":"Humanities",
      "creative-arts":"Creative Arts",
      "economics":"Economics",
      "health-pe":"Health & PE",
      "health and pe":"Health & PE",
      "languages":"Languages",
      "technologies":"Technologies"
    };
    const raw = String(value || "").toLowerCase();
    return labels[raw] || labels[normalizeArea(value)] || value || "Course";
  }

  function areaKey(value){
    return String(value || "").toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  }

  function renderCourseNavControls(){
    const navLinks = document.querySelector("nav .nav-links");
    if(!navLinks || document.getElementById("course-history-back")) return;
    const button = document.createElement("button");
    button.id = "course-history-back";
    button.className = "history-back";
    button.type = "button";
    button.textContent = "Back";
    button.addEventListener("click", () => {
      if(history.length > 1) history.back();
      else location.href = "subjects.html";
    });
    navLinks.insertBefore(button, navLinks.firstChild);
  }

  function renderBreadcrumbs(){
    const main = document.querySelector(".main-panel");
    if(!main) return;
    let crumb = document.getElementById("breadcrumbs");
    if(!crumb) {
      crumb = document.createElement("div");
      crumb.id = "breadcrumbs";
      crumb.className = "breadcrumbs";
      main.insertBefore(crumb, main.firstChild);
    }
    const area = areaLabel(activeSubject.area);
    const areaHref = `subjects.html?area=${encodeURIComponent(areaKey(activeSubject.area))}`;
    crumb.innerHTML = `<a href="electroni.html">Home</a><span>/</span><a href="subjects.html">Subjects</a><span>/</span><a href="${areaHref}">${escapeHtml(area)}</a><span>/</span><span>${escapeHtml(activeSubject.title)}</span><span>/</span><strong>${escapeHtml(activeTopic?.code || "Overview")}</strong>`;
  }

  function openTopic(topic, push = true){
    if(!topic) return;
    activeTopic = topic;
    const url = new URL(location.href);
    url.searchParams.set("subject", activeSubject.slug);
    url.searchParams.set("topic", activeTopic.code);
    if(push) history.pushState({subject: activeSubject.slug, topic: activeTopic.code}, "", url);
    renderTopicList();
    renderTopic();
    renderMissedWork();
    renderBreadcrumbs();
  }

  function renderTopicList(){
    const list = $("topic-list");
    const progress = getProgress();
    const topics = activeSubject.topics || [];
    
    if (topics.length === 0) {
      list.innerHTML = `<div style="padding: 1.5rem 1rem; text-align: center; color: var(--muted); font-size: 0.82rem; background: #F8FAFD; border-radius: 8px; border: 1px dashed var(--line);">No lessons configured.</div>`;
      return;
    }

    list.innerHTML = topics.map(topic => {
      const state = window.ElectroniMissedWork?.getTopicState(activeSubject, topic, progress) || progress[topic.code] || {};
      const done = state.completed;
      const missed = window.ElectroniMissedWork?.isMissed(activeSubject, topic, state);
      return `<button class="topic-row ${activeTopic?.code === topic.code ? "active" : ""}" data-code="${escapeHtml(topic.code)}">
        <span>${escapeHtml(topic.code)}</span>
        <strong>${escapeHtml(topic.title)}</strong>
        <em>${done ? "Complete" : missed ? "Missed" : state.openedAt ? "In progress" : "Open"}</em>
      </button>`;
    }).join("");
    
    list.querySelectorAll("[data-code]").forEach(button => {
      button.addEventListener("click", () => {
        openTopic(activeSubject.topics.find(topic => topic.code === button.dataset.code));
      });
    });
  }

function renderTopic(){
    const mainPanel = document.querySelector(".main-panel");
    
    // Empty state for subjects that have been created before lessons are attached.
    if(!activeTopic) {
      if (mainPanel) {
        Array.from(mainPanel.children).forEach(child => {
          if(child.id !== 'breadcrumbs' && child.id !== 'empty-topic-msg') child.style.display = 'none';
        });
        
        let emptyMsg = $("empty-topic-msg");
        if(!emptyMsg) {
          emptyMsg = document.createElement("div");
          emptyMsg.id = "empty-topic-msg";
          emptyMsg.style.cssText = "padding: 6rem 2rem; text-align: center; color: var(--muted); display: flex; flex-direction: column; align-items: center; justify-content: center;";
          emptyMsg.innerHTML = `<div style="font-size: 3.5rem; margin-bottom: 1rem; opacity: 0.3;">📭</div>
            <h2 style="color: var(--ink); margin-bottom: 0.5rem; font-family: Sora, sans-serif;">No lessons published yet</h2>
            <p style="max-width: 400px; line-height: 1.6; margin: 0 auto;">Lessons for this subject will appear here once they are added via the Admin CMS.</p>`;
          mainPanel.appendChild(emptyMsg);
        }
        emptyMsg.style.display = 'flex';
      }
      renderBreadcrumbs();
      return;
    }

    if (mainPanel) {
      Array.from(mainPanel.children).forEach(child => {
        if(child.id !== 'empty-topic-msg') child.style.display = '';
      });
      const emptyMsg = $("empty-topic-msg");
      if(emptyMsg) emptyMsg.style.display = 'none';
    }

    $("topic-code").textContent = activeTopic.code;
    $("topic-title").textContent = activeTopic.title;
    if(window.ElectroniMissedWork) window.ElectroniMissedWork.markOpened(activeSubject, activeTopic);
    $("topic-notes").value = (window.ElectroniMissedWork?.getTopicState(activeSubject, activeTopic) || getProgress()[activeTopic.code] || {}).notes || "";
    const topicTextbook = activeTopic.textbook || "";
    $("topic-textbook-link").href = topicTextbook || "#";
    $("topic-textbook-link").hidden = !topicTextbook;
    renderVideo();
    renderLessonMaterials();
    renderQuiz();
    renderBreadcrumbs();
  }

  function materialList(topic){
    const seen = new Set();
    const items = [];
    [
      ...(Array.isArray(topic?.resources) ? topic.resources : []),
      ...(topic?.textbook ? [{title:topic.title || "Lesson material", href:topic.textbook, type:"PDF"}] : [])
    ].forEach(item => {
      const href = item.href || item.url || item.path || "";
      if(!href || seen.has(href)) return;
      seen.add(href);
      items.push({...item, href});
    });
    return items;
  }

  function dotPoints(value){
    if(Array.isArray(value)) return value.map(item => String(item || "").trim()).filter(Boolean);
    return String(value || "").split(/\r?\n|;/).map(item => item.trim()).filter(Boolean);
  }

  function renderLessonMaterials(){
    const mainPanel = document.querySelector(".main-panel");
    const videoControls = $("video-controls");
    if(!mainPanel || !videoControls) return;
    let section = $("lesson-materials");
    if(!section) {
      section = document.createElement("section");
      section.id = "lesson-materials";
      section.className = "lesson-materials";
      videoControls.insertAdjacentElement("afterend", section);
    }
    const resources = materialList(activeTopic);
    const text = activeTopic.lessonText || activeTopic.summary || `Use the linked course materials to work through ${activeTopic.title}. Read the relevant section, write your notes, then complete the quiz to check understanding.`;
    const syllabus = dotPoints(activeTopic.syllabus || activeTopic.syllabusDotPoints || "");
    section.innerHTML = `
      ${syllabus.length ? `<div class="syllabus-block">
        <h3>Syllabus Dot Points</h3>
        <ul>${syllabus.map(point => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
      </div>` : ""}
      <div class="lesson-copy">
        <h3>Lesson Text</h3>
        ${activeTopic.imageUrl ? `<img class="lesson-image" src="${escapeHtml(activeTopic.imageUrl)}" alt="">` : ""}
        <p>${escapeHtml(text)}</p>
      </div>
      <div class="material-links">
        <h3>Materials</h3>
        ${resources.map(item => `
          <a class="material-link" href="${escapeHtml(item.href)}" target="_blank" rel="noopener">
            <span>${escapeHtml(item.type || "PDF")}</span>
            <strong>${escapeHtml(item.title || item.href.split("/").pop())}</strong>
          </a>
        `).join("") || '<p class="muted">No PDF materials linked to this topic yet.</p>'}
      </div>
    `;
  }

  function renderVideo(){
    const id = normalizeYouTubeId(activeTopic.youtubeId || activeTopic.youtubeUrl);
    const mount = $("video-player");
    if(player && player.destroy) {
      try { player.destroy(); } catch(error) {}
      player = null;
    }
    mount.innerHTML = id ? "<div id=\"yt-player\"></div>" : `<div class="empty-video"><strong>No video loaded yet</strong><span>A video has not been added for this topic yet.</span></div>`;
    $("video-controls").hidden = !id;
    if(!id) return;

    loadScript("https://www.youtube.com/iframe_api").then(() => {
      const makePlayer = () => {
        player = new YT.Player("yt-player", {
          videoId: id,
          width: "100%",
          height: "100%",
          playerVars: {
            controls: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            ...(location.origin && /^https?:/i.test(location.origin) ? {origin: location.origin} : {})
          },
          events: {
            onReady: bindVideoControls,
            onStateChange: event => {
              if(event.data === YT.PlayerState.ENDED) markVideoWatched();
            }
          }
        });
      };
      if(window.YT?.Player) makePlayer();
      else window.onYouTubeIframeAPIReady = makePlayer;
    });
  }

  function bindVideoControls(){
    clearInterval(progressTimer);
    maxWatchedTime = (window.ElectroniMissedWork?.getTopicState(activeSubject, activeTopic) || getProgress()[activeTopic.code] || {}).videoMaxTime || 0;
    const alreadyWatched = !!(window.ElectroniMissedWork?.getTopicState(activeSubject, activeTopic) || getProgress()[activeTopic.code] || {}).videoWatched;
    $("play-btn").onclick = () => player.playVideo();
    $("pause-btn").onclick = () => player.pauseVideo();
    $("back-btn").onclick = () => player.seekTo(Math.max(0, player.getCurrentTime() - 10), true);
    $("forward-btn").disabled = !alreadyWatched;
    $("forward-btn").onclick = () => {
      if((window.ElectroniMissedWork?.getTopicState(activeSubject, activeTopic) || getProgress()[activeTopic.code] || {}).videoWatched) player.seekTo(player.getCurrentTime() + 10, true);
    };
    $("speed-select").onchange = event => player.setPlaybackRate(Number(event.target.value));
    $("video-progress").oninput = event => {
      if(!(window.ElectroniMissedWork?.getTopicState(activeSubject, activeTopic) || getProgress()[activeTopic.code] || {}).videoWatched) {
        $("video-progress").value = player.getDuration() ? Math.round(((player.getCurrentTime() || 0) / player.getDuration()) * 100) : 0;
        return;
      }
      const duration = player.getDuration() || 0;
      player.seekTo(duration * (Number(event.target.value) / 100), true);
    };
    progressTimer = setInterval(() => {
      if(!player?.getDuration) return;
      const duration = player.getDuration() || 0;
      const current = player.getCurrentTime() || 0;
      const watched = !!(window.ElectroniMissedWork?.getTopicState(activeSubject, activeTopic) || getProgress()[activeTopic.code] || {}).videoWatched;
      if(!watched && current > maxWatchedTime + 2) {
        player.seekTo(maxWatchedTime, true);
        return;
      }
      if(!watched && current > maxWatchedTime) {
        maxWatchedTime = current;
        if(window.ElectroniMissedWork) window.ElectroniMissedWork.saveTopicState(activeSubject, activeTopic, {videoMaxTime:maxWatchedTime});
        else {
          const progress = getProgress();
          progress[activeTopic.code] = {...progress[activeTopic.code], videoMaxTime:maxWatchedTime};
          setProgress(progress);
        }
      }
      if(duration) $("video-progress").value = Math.round((current / duration) * 100);
    }, 800);
    renderDownloadControl();
  }

  function renderDownloadControl(){
    const controls = $("video-controls");
    if(!controls) return;
    let link = $("download-video");
    if(!link) {
      link = document.createElement("a");
      link.id = "download-video";
      link.className = "btn ghost";
      link.textContent = "Download";
      controls.appendChild(link);
    }
    const watched = !!(window.ElectroniMissedWork?.getTopicState(activeSubject, activeTopic) || getProgress()[activeTopic.code] || {}).videoWatched;
    const url = activeTopic.videoDownloadUrl || activeTopic.videoFile || "";
    link.hidden = !watched || !url;
    link.href = url || "#";
    link.setAttribute("download", "");
  }

  function markVideoWatched(){
    if(window.ElectroniMissedWork) window.ElectroniMissedWork.saveTopicState(activeSubject, activeTopic, {videoWatched:true});
    else {
      const progress = getProgress();
      progress[activeTopic.code] = {...progress[activeTopic.code], videoWatched:true};
      setProgress(progress);
    }
    syncProgress();
    if($("forward-btn")) $("forward-btn").disabled = false;
    renderDownloadControl();
    renderMissedWork();
  }

  function renderQuiz(){
    const quiz = activeTopic.quiz || {};
    const options = Array.isArray(quiz.options) ? quiz.options.filter(option => String(option || "").trim()) : [];
    if(!quiz.question || !options.length) {
      $("quiz-question").textContent = "No quiz is published for this topic yet.";
      $("quiz-options").innerHTML = "";
      $("submit-quiz").disabled = true;
      $("quiz-result").textContent = "";
      return;
    }
    $("submit-quiz").disabled = false;
    $("quiz-question").textContent = quiz.question;
    $("quiz-options").innerHTML = options.map((option, index) => `
      <label class="quiz-option">
        <input type="radio" name="quiz-answer" value="${index}">
        <span>${escapeHtml(option)}</span>
      </label>
    `).join("");
    $("quiz-result").textContent = "";
  }

  function submitQuiz(){
    const selected = document.querySelector("input[name='quiz-answer']:checked");
    if(!selected) {
      $("quiz-result").textContent = "Choose an answer first.";
      return;
    }
    const correct = Number(selected.value) === Number(activeTopic.quiz?.answerIndex || 0);
    const current = window.ElectroniMissedWork?.getTopicState(activeSubject, activeTopic) || getProgress()[activeTopic.code] || {};
    const nextState = {
      ...current,
      quizCorrect: correct,
      completed: correct && !!current.videoWatched,
      answeredAt: new Date().toISOString()
    };
    if(window.ElectroniMissedWork) window.ElectroniMissedWork.saveTopicState(activeSubject, activeTopic, nextState);
    else {
      const progress = getProgress();
      progress[activeTopic.code] = nextState;
      setProgress(progress);
    }
    updateRanking(correct);
    syncProgress({lastQuizTopic: activeTopic.code, lastQuizCorrect: correct});
    $("quiz-result").textContent = correct ? "Correct. This topic is ready to revise." : "Not yet. This topic has been added to missed work.";
    renderTopicList();
    renderMissedWork();
    renderLeaderboard();
  }

  function updateRanking(correct){
    const user = getUser();
    if(!user?.email) return;
    const ranking = JSON.parse(localStorage.getItem("electroni_rankings") || "{}");
    const key = user.uid || user.email;
    const row = ranking[key] || {name:user.name || user.email, email:user.email, correct:0, attempts:0};
    row.attempts += 1;
    if(correct) row.correct += 1;
    row.lastUpdated = new Date().toISOString();
    ranking[key] = row;
    localStorage.setItem("electroni_rankings", JSON.stringify(ranking));
    if(correct && row.correct === row.attempts) {
      notifyOwnerOfRanking(row);
    }
  }

  async function notifyOwnerOfRanking(row){
    await fetch(MAIL_APP_URL, {
      method:"POST",
      mode:"no-cors",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({
        to:["envizionupdates@gmail.com"],
        recipient:"envizionupdates@gmail.com",
        email:"envizionupdates@gmail.com",
        subject:`${BRAND_NAME} ranking update`,
        text:`${row.name} currently has ${row.correct}/${row.attempts} correct answers. End-of-year gift-card candidate.`,
        site:BRAND_NAME,
        topic:"electroni-ranking",
        studentEmail:row.email,
        correct:row.correct,
        attempts:row.attempts
      })
    }).catch(error => console.warn("Ranking email skipped:", error));
  }

  function renderLeaderboard(){
    const rightPanel = document.querySelector(".right-panel");
    if(!rightPanel) return;
    let section = $("leaderboard-section");
    if(!section) {
      section = document.createElement("section");
      section.className = "right-section";
      section.id = "leaderboard-section";
      const missedSection = $("missed-list")?.closest(".right-section");
      rightPanel.insertBefore(section, missedSection?.nextSibling || rightPanel.firstChild);
    }
    const rows = Object.values(JSON.parse(localStorage.getItem("electroni_rankings") || "{}"))
      .sort((a,b) => (b.correct - a.correct) || (a.attempts - b.attempts))
      .slice(0, 5);
    section.innerHTML = `<h3>Ranking</h3>${
      rows.map((row,index) => `<div class="leader-row"><span>${index + 1}. ${escapeHtml(row.name || row.email)}</span><strong>${row.correct}/${row.attempts}</strong></div>`).join("") || '<p class="muted">Complete quizzes to enter the ranking.</p>'
    }<div class="gift-note">Best end-of-year student with all correct marks is flagged for a $50 gift-card reward sent through their school.</div>`;
  }

  function saveNotes(){
    if(window.ElectroniMissedWork) window.ElectroniMissedWork.saveTopicState(activeSubject, activeTopic, {notes:$("topic-notes").value});
    else {
      const progress = getProgress();
      progress[activeTopic.code] = {...progress[activeTopic.code], notes:$("topic-notes").value};
      setProgress(progress);
    }
    syncProgress();
    $("notes-status").textContent = "Saved.";
    setTimeout(() => $("notes-status").textContent = "", 1800);
  }

  function renderMissedWork(){
    const subjects = data().subjects.filter(subjectMatchesUserClasses);
    const missed = window.ElectroniMissedWork ? window.ElectroniMissedWork.findMissed(subjects) : [];
    $("missed-list").innerHTML = missed.slice(0, 8).map(item => `
      <a class="missed-item" href="${escapeHtml(window.ElectroniMissedWork.lessonUrl(item.subject, item.topic))}">
        <strong>${escapeHtml(item.subject.title)}</strong>
        <span>Topic: ${escapeHtml(item.topic.title || item.topic.code)}</span>
        <span>Lesson: ${escapeHtml(item.topic.code || item.topic.title)}</span>
        <span>Due: ${escapeHtml(window.ElectroniMissedWork.formatDue(item.state.dueAt))}</span>
      </a>
    `).join("") || "<p class=\"muted\">No missed work yet.</p>";
    if(window.ElectroniMissedWork) window.ElectroniMissedWork.notifyNewMissed(missed);
  }

  function renderRevisionSettings(){
    const saved = JSON.parse(localStorage.getItem(storageKey("revision")) || "{}");
    ensureReminderFields();
    $("reminder-email").value = saved.email || getUser()?.email || "";
    $("reminder-interval").value = saved.intervalMinutes || "1440";
    $("reminder-due").value = saved.dueAt || "";
    $("reminder-offset").value = saved.offsetMinutes || "-1440";
    $("reminder-timezone").textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local timezone";
    if(saved.nextDueAt) $("next-reminder").textContent = new Date(saved.nextDueAt).toLocaleString();
    scheduleReminder(saved);
  }

  function ensureReminderFields(){
    if($("reminder-due")) return;
    const interval = $("reminder-interval");
    if(!interval) return;
    interval.closest("label").insertAdjacentHTML("afterend", `
      <label>Due date<input id="reminder-due" type="datetime-local"></label>
      <label>Reminder timing<select id="reminder-offset">
        <option value="-2880">2 days before due date</option>
        <option value="-1440">1 day before due date</option>
        <option value="-120">2 hours before due date</option>
        <option value="0">At due date</option>
        <option value="1440">1 day after due date</option>
      </select></label>
    `);
  }

  function saveRevisionSettings(){
    const intervalMinutes = Number($("reminder-interval").value);
    const settings = {
      email: $("reminder-email").value.trim(),
      intervalMinutes,
      dueAt: $("reminder-due")?.value || "",
      offsetMinutes: Number($("reminder-offset")?.value || -1440),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "local",
      nextDueAt: calculateNextReminder(intervalMinutes)
    };
    localStorage.setItem(storageKey("revision"), JSON.stringify(settings));
    saveReminderToFirestore(settings);
    renderRevisionSettings();
  }

  function calculateNextReminder(intervalMinutes){
    const due = $("reminder-due")?.value;
    if(due) {
      const offset = Number($("reminder-offset")?.value || -1440);
      return new Date(new Date(due).getTime() + offset * 60000).toISOString();
    }
    return new Date(Date.now() + intervalMinutes * 60000).toISOString();
  }

  async function saveReminderToFirestore(settings){
    const user = getUser();
    const db = await getDb();
    if(!db || !settings.email) return;
    const id = user?.uid || settings.email.replace(/[^a-z0-9._-]/gi, "_");
    await db.collection("Electroni_revision_reminders").doc(id).set({
      ...settings,
      uid: user?.uid || "",
      updatedAtLocal: new Date().toISOString(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, {merge:true}).catch(error => console.warn("Reminder sync skipped:", error));
  }

  function scheduleReminder(settings){
    clearTimeout(reminderTimer);
    if(!settings?.nextDueAt || !settings.email) return;
    const delay = new Date(settings.nextDueAt).getTime() - Date.now();
    if(delay <= 0) {
      sendReminderEmail(settings);
      settings.nextDueAt = settings.dueAt ? "" : new Date(Date.now() + Number(settings.intervalMinutes || 1440) * 60000).toISOString();
      localStorage.setItem(storageKey("revision"), JSON.stringify(settings));
      saveReminderToFirestore(settings);
      if(settings.nextDueAt) scheduleReminder(settings);
      return;
    }
    reminderTimer = setTimeout(() => {
      sendReminderEmail(settings);
      settings.nextDueAt = settings.dueAt ? "" : new Date(Date.now() + Number(settings.intervalMinutes || 1440) * 60000).toISOString();
      localStorage.setItem(storageKey("revision"), JSON.stringify(settings));
      if(settings.nextDueAt) scheduleReminder(settings);
    }, Math.min(delay, 2147483647));
  }

  async function sendReminderEmail(settings){
    const missed = $("missed-list").innerText || `Open ${BRAND_NAME} to continue your revision.`;
    await fetch(MAIL_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify({
        to: [settings.email],
        recipient: settings.email,
        email: settings.email,
        subject: `${BRAND_NAME} revision reminder`,
        text: `Your ${BRAND_NAME} revision reminder is due.\n\nMissed work:\n${missed}\n\nOpen: ${location.href}`,
        body: `Your ${BRAND_NAME} revision reminder is due.\n\nMissed work:\n${missed}\n\nOpen: ${location.href}`,
        site: BRAND_NAME,
        topic: "electroni-revision",
        timezone: settings.timezone,
        nextDueAt: settings.nextDueAt,
        dueAt: settings.dueAt || "",
        offsetMinutes: settings.offsetMinutes || 0
      })
    }).catch(error => console.warn("Reminder email skipped:", error));
  }

  function renderTeacherTools(){
    const user = getUser();
    const role = String(user?.role || "").toLowerCase();
    const panel = $("teacher-panel");
    panel.hidden = !["teacher", "school"].includes(role);
    if(panel.hidden) return;
    $("teacher-role-label").textContent = role === "school" ? "School admin controls" : "Teacher controls";
  }

  function applyContentProtection(){
    if(isTeacherOrSchool()) return;
    if(protectionBound) return;
    protectionBound = true;
    document.addEventListener("contextmenu", event => event.preventDefault());
    document.addEventListener("copy", event => event.preventDefault());
    document.addEventListener("cut", event => event.preventDefault());
    document.addEventListener("paste", event => {
      if(event.target?.tagName !== "TEXTAREA") event.preventDefault();
    });
    document.addEventListener("keydown", event => {
      const key = String(event.key || "").toLowerCase();
      const blockedCombo = event.ctrlKey || event.metaKey;
      if(key === "f12" || (blockedCombo && ["c","u","s","p","i","j"].includes(key)) || (event.ctrlKey && event.shiftKey && ["i","j","c"].includes(key))) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    }, true);
    document.addEventListener("visibilitychange", () => {
      if(document.hidden && player?.pauseVideo) player.pauseVideo();
    });
  }

  async function createSchoolCode(){
    const code = $("new-school-code").value.trim();
    const schoolName = $("new-school-name").value.trim();
    if(!code || !schoolName) return;
    const local = data();
    local.schoolCodes = local.schoolCodes || [];
    local.schoolCodes.push({code, schoolName, active:true});
    localStorage.setItem("Electroni_school_codes_local", JSON.stringify(local.schoolCodes));
    const db = await getDb();
    if(db) {
      await db.collection("Electroni_school_codes").doc(code).set({code, schoolName, active:true, createdAtLocal:new Date().toISOString()}, {merge:true});
    }
    $("teacher-status").textContent = "Code saved.";
  }

  async function assignWork(){
    const code = $("assign-code").value.trim();
    if(!code || !activeTopic) return;
    const assignment = {
      code,
      subject: activeSubject.slug,
      topicCode: activeTopic.code,
      title: activeTopic.title,
      dueAt: $("assign-due").value || "",
      createdAtLocal: new Date().toISOString()
    };
    const assignments = JSON.parse(localStorage.getItem("Electroni_assignments") || "[]");
    assignments.push(assignment);
    localStorage.setItem("Electroni_assignments", JSON.stringify(assignments));
    const db = await getDb();
    if(db) await db.collection("Electroni_assignments").add(assignment);
    $("teacher-status").textContent = "Assignment saved.";
  }

  async function init(){
    await loadFirestoreCourseData();
    if(window.ElectroniMissedWork) await window.ElectroniMissedWork.loadAssignments(window.getDb || getDbFallback);
    render();
    if(eventsBound) return;
    eventsBound = true;
    if(!$("submit-quiz")) return;
    $("submit-quiz").addEventListener("click", submitQuiz);
    $("save-notes").addEventListener("click", saveNotes);
    $("save-reminders").addEventListener("click", saveRevisionSettings);
    $("send-test-reminder").addEventListener("click", () => sendReminderEmail(JSON.parse(localStorage.getItem(storageKey("revision")) || "{}")));
    if($("create-school-code")) $("create-school-code").addEventListener("click", createSchoolCode);
    if($("assign-work")) $("assign-work").addEventListener("click", assignWork);
    window.addEventListener("popstate", () => render());
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.ElectroniCourse = {render, init, loadFirestoreCourseData, submitQuiz, saveRevisionSettings, sendReminderEmail};
})();
