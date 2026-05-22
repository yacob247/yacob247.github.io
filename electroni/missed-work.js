(function(){
  const BRAND_NAME = "Electroni";
  const MAIL_APP_URL = window.ELECTRONI_MAIL_APP_URL || window.ENVIZION_MAIL_APP_URL || "https://script.google.com/macros/s/AKfycbyYsr03oyOeBTaI2wImBWVjbsVwR0LHYT_6o0R6-vUuZVb9VmjtWiYFZgSduppvPhpj/exec";

  function getUser(){
    try { return JSON.parse(localStorage.getItem("Electroni_auth_user") || "null"); }
    catch(error) { return null; }
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
    localStorage.setItem(storageKey("progress"), JSON.stringify(progress || {}));
  }

  function topicKey(subject, topic){
    return `${subject?.slug || "course"}__${topic?.code || topic?.id || "topic"}`;
  }

  function getTopicState(subject, topic, progress = getProgress()){
    const legacy = progress[topic?.code] || {};
    const scoped = progress[topicKey(subject, topic)] || {};
    return {...legacy, ...scoped};
  }

  function saveTopicState(subject, topic, updates){
    const progress = getProgress();
    const key = topicKey(subject, topic);
    progress[key] = {...getTopicState(subject, topic, progress), ...updates};
    setProgress(progress);
    return progress[key];
  }

  function parseDate(value){
    if(!value) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function normalize(value){
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function userCodes(){
    const user = getUser();
    return [
      user?.schoolCode,
      user?.classCode,
      user?.code,
      ...(Array.isArray(user?.schoolCodes) ? user.schoolCodes : [])
    ].filter(Boolean).map(normalize);
  }

  function assignmentMatchesUser(assignment){
    const code = normalize(assignment?.code || assignment?.schoolCode || assignment?.classCode || "");
    const codes = userCodes();
    return !code || codes.length === 0 || codes.includes(code);
  }

  function assignmentDueDates(subject, topic){
    let assignments = [];
    try { assignments = JSON.parse(localStorage.getItem("Electroni_assignments") || "[]"); }
    catch(error) { assignments = []; }
    return assignments
      .filter(item => normalize(item.subject) === normalize(subject?.slug))
      .filter(item => normalize(item.topicCode || item.topic || item.code) === normalize(topic?.code))
      .filter(assignmentMatchesUser)
      .map(item => item.dueAt || item.dueDate || item.deadline)
      .map(parseDate)
      .filter(Boolean);
  }

  async function loadAssignments(getDb){
    if(typeof getDb !== "function") return [];
    const db = await getDb().catch(error => {
      console.warn("Assignment sync skipped:", error);
      return null;
    });
    if(!db) return [];
    const snapshot = await db.collection("Electroni_assignments").get().catch(error => {
      console.warn("Assignment sync skipped:", error);
      return null;
    });
    if(!snapshot) return [];
    const remote = [];
    snapshot.forEach(doc => remote.push({id: doc.id, ...doc.data()}));
    const local = JSON.parse(localStorage.getItem("Electroni_assignments") || "[]");
    const seen = new Set(local.map(item => `${item.id || ""}|${item.subject}|${item.topicCode}|${item.dueAt}|${item.code || ""}`));
    remote.forEach(item => {
      const key = `${item.id || ""}|${item.subject}|${item.topicCode}|${item.dueAt}|${item.code || ""}`;
      if(!seen.has(key)) local.push(item);
    });
    localStorage.setItem("Electroni_assignments", JSON.stringify(local));
    return local;
  }

  function getTopicDueAt(subject, topic, state = getTopicState(subject, topic)){
    const direct = [
      state.dueAt,
      topic?.dueAt,
      topic?.dueDate,
      topic?.deadline
    ].map(parseDate).filter(Boolean);
    const dates = [...direct, ...assignmentDueDates(subject, topic)]
      .sort((a, b) => a.getTime() - b.getTime());
    return dates[0] ? dates[0].toISOString() : "";
  }

  function markOpened(subject, topic){
    if(!subject || !topic) return null;
    const state = getTopicState(subject, topic);
    const dueAt = getTopicDueAt(subject, topic, state);
    const updates = {
      openedAt: state.openedAt || new Date().toISOString(),
      subjectSlug: subject.slug || "",
      subjectTitle: subject.title || "",
      topicCode: topic.code || "",
      topicTitle: topic.title || ""
    };
    if(dueAt) updates.dueAt = dueAt;
    return saveTopicState(subject, topic, updates);
  }

  function isMissed(subject, topic, state = getTopicState(subject, topic)){
    const dueAt = getTopicDueAt(subject, topic, state);
    const due = parseDate(dueAt);
    return !!state.openedAt && !!due && due.getTime() < Date.now() && !state.completed;
  }

  function findMissed(subjects){
    const progress = getProgress();
    return (subjects || []).flatMap(subject => (subject.topics || []).map(topic => {
      const state = getTopicState(subject, topic, progress);
      const dueAt = getTopicDueAt(subject, topic, state);
      return {subject, topic, state:{...state, dueAt}};
    })).filter(item => isMissed(item.subject, item.topic, item.state))
      .sort((a, b) => new Date(a.state.dueAt).getTime() - new Date(b.state.dueAt).getTime());
  }

  function lessonUrl(subject, topic){
    return `${encodeURIComponent(subject?.slug || "")}.html?subject=${encodeURIComponent(subject?.slug || "")}&topic=${encodeURIComponent(topic?.code || "")}`;
  }

  function formatDue(value){
    const date = parseDate(value);
    return date ? date.toLocaleString([], {dateStyle:"medium", timeStyle:"short"}) : "No due date";
  }

  async function sendMissedEmail(item){
    const user = getUser();
    const email = user?.email || "";
    if(!email || !item?.state?.dueAt) return false;
    const link = new URL(lessonUrl(item.subject, item.topic), location.href).href;
    const text = [
      `You have missed work in ${BRAND_NAME}.`,
      "",
      `Subject: ${item.subject.title || item.subject.slug}`,
      `Topic: ${item.topic.title || item.topic.code}`,
      `Lesson: ${item.topic.code || item.topic.title}`,
      `Due date: ${formatDue(item.state.dueAt)}`,
      "",
      `Open the lesson: ${link}`
    ].join("\n");

    if(window.ElectroniMail?.sendUserEmail) {
      await window.ElectroniMail.sendUserEmail({
        to: email,
        subject: `${BRAND_NAME} missed work reminder`,
        text,
        topic: "electroni-missed-work"
      });
      return true;
    }

    await fetch(MAIL_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify({
        to: [email],
        recipient: email,
        email,
        subject: `${BRAND_NAME} missed work reminder`,
        text,
        body: text,
        site: BRAND_NAME,
        topic: "electroni-missed-work"
      })
    });
    return true;
  }

  async function notifyNewMissed(missed){
    for(const item of missed || []) {
      if(item.state.missedNotifiedAt) continue;
      try {
        const sent = await sendMissedEmail(item);
        if(sent) saveTopicState(item.subject, item.topic, {missedNotifiedAt: new Date().toISOString()});
      } catch(error) {
        console.warn("Missed work email skipped:", error);
      }
    }
  }

  window.ElectroniMissedWork = {
    getUser,
    storageKey,
    getProgress,
    setProgress,
    topicKey,
    getTopicState,
    saveTopicState,
    getTopicDueAt,
    loadAssignments,
    markOpened,
    isMissed,
    findMissed,
    lessonUrl,
    formatDue,
    notifyNewMissed
  };
})();
