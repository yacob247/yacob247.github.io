const ELECTRONI_COURSE_PATH = "electroni/course-data.js";
let atomiCourseData = {subjects:[], schoolCodes:[]};
let currentCourseSlug = null;
let currentTopicCode = null;

const previousSetAdminMode = window.setAdminMode;
const previousHandleNewEntry = window.handleNewEntry;

window.handleNewEntry = function(){
  if(window.adminMode === "courses" || document.getElementById("tab-courses")?.classList.contains("active")) {
    newAtomiSubject();
    return;
  }
  previousHandleNewEntry();
};

window.setAdminMode = function(mode){
  if(mode !== "courses") {
    document.getElementById("tab-courses")?.classList.remove("active");
    document.getElementById("stat-courses-container").style.display = "none";
    previousSetAdminMode(mode);
    return;
  }
  if(typeof adminMode !== "undefined") adminMode = "courses";
  document.getElementById("tab-games")?.classList.remove("active");
  document.getElementById("tab-blog")?.classList.remove("active");
  document.getElementById("tab-courses")?.classList.add("active");
  document.getElementById("stat-games-container").style.display = "none";
  document.getElementById("stat-tools-container").style.display = "none";
  document.getElementById("stat-blog-container").style.display = "none";
  document.getElementById("stat-courses-container").style.display = "block";
  syncAtomiCoursesFromGitHub();
};

async function syncAtomiCoursesFromGitHub(){
  const token = getGitHubToken();
  if(!token) return;
  showToast("Syncing Electroni courses...");
  try{
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${ELECTRONI_COURSE_PATH}?cb=${Date.now()}`, {
      headers:{Authorization:`token ${token}`}
    });
    if(!res.ok) throw new Error("Could not fetch electroni/course-data.js");
    const file = await res.json();
    const text = decodeURIComponent(escape(atob(file.content)));
    const fakeWindow = {};
    atomiCourseData = new Function("window", `${text}; return window.Electroni_COURSE_DATA || {subjects:[], schoolCodes:[]};`)(fakeWindow);
    atomiCourseData.subjects ||= [];
    atomiCourseData.schoolCodes ||= [];
    showToast("Electroni courses synced");
    refreshAtomiCourseSidebar();
    showAtomiCourseHome();
  }catch(error){
    showToast("Electroni sync error: " + error.message, true);
  }
}

function refreshAtomiCourseSidebar(){
  const list = document.getElementById("entry-list");
  document.getElementById("stat-courses").textContent = atomiCourseData.subjects.length;
  document.getElementById("stat-total").textContent = atomiCourseData.subjects.reduce((n,s)=>n+(s.topics||[]).length,0);
  list.innerHTML = `<div style="padding:10px;border-bottom:1px solid var(--border);margin-bottom:10px;display:flex;gap:5px;"><button class="btn btn-ghost" style="width:100%;font-size:.7rem;padding:6px" onclick="syncAtomiCoursesFromGitHub()">Sync</button><button class="btn btn-success" style="width:100%;font-size:.7rem;padding:6px" onclick="saveAtomiCourses()">Publish</button></div>`;
  const label = document.createElement("div");
  label.className = "nav-section-label";
  label.textContent = "Electroni Subjects";
  list.appendChild(label);
  atomiCourseData.subjects.forEach(subject => {
    const li = document.createElement("li");
    li.className = "entry-item" + (currentCourseSlug === subject.slug ? " active" : "");
    li.innerHTML = `<div class="entry-dot" style="background:var(--accent2)"></div><div style="display:flex;flex-direction:column;overflow:hidden" onclick="editAtomiSubject('${subject.slug}')"><span class="entry-name">${escHtml(subject.title)}</span><span class="entry-type-badge badge-tool">${(subject.topics||[]).length} topics</span></div>`;
    list.appendChild(li);
  });
}

function showAtomiCourseHome(){
  document.getElementById("topbar-title").textContent = "Electroni Course Manager";
  document.getElementById("topbar-actions").innerHTML = `<button class="btn btn-primary" onclick="newAtomiSubject()">New Subject</button><button class="btn btn-success" onclick="saveAtomiCourses()">Publish Course Data</button>`;
  document.getElementById("view-area").innerHTML = `<div class="form-content"><div class="section-label">Electroni Course System</div><div class="empty-sub" style="text-align:left;max-width:620px">Select a subject on the left, add topic codes, paste YouTube IDs/URLs, link textbooks from the Year 12 folder, and add one quiz question. Publishing updates electroni/course-data.js through GitHub.</div></div>`;
}

function newAtomiSubject(){
  currentCourseSlug = null;
  currentTopicCode = null;
  renderAtomiSubjectForm({slug:"",title:"",year:"Year 12",area:"",textbook:"",topics:[]});
}

function editAtomiSubject(slug){
  currentCourseSlug = slug;
  const subject = atomiCourseData.subjects.find(s => s.slug === slug);
  currentTopicCode = subject?.topics?.[0]?.code || null;
  renderAtomiSubjectForm(subject);
  refreshAtomiCourseSidebar();
}

function renderAtomiSubjectForm(subject){
  const topics = subject.topics || [];
  const topic = topics.find(t => t.code === currentTopicCode) || topics[0] || {code:"",title:"",youtubeId:"",textbook:subject.textbook||"",quiz:{question:"",options:["","","",""],answerIndex:0}};
  currentTopicCode = topic.code;
  document.getElementById("topbar-title").textContent = subject.slug ? `Electroni: ${subject.title}` : "New Electroni Subject";
  document.getElementById("topbar-actions").innerHTML = `<button class="btn btn-ghost" onclick="showAtomiCourseHome()">Cancel</button><button class="btn btn-primary" onclick="addAtomiTopic()">Add Topic</button><button class="btn btn-success" onclick="saveAtomiSubjectForm()">Save Subject</button>`;
  document.getElementById("view-area").innerHTML = `
    <div class="form-content">
      <div class="section-label">Subject</div>
      <div class="form-grid">
        <div class="field"><label>Slug</label><input id="ac-slug" value="${escHtml(subject.slug)}" oninput="this.value=this.value.toLowerCase().replace(/\\s+/g,'-').replace(/[^a-z0-9-]/g,'')"></div>
        <div class="field"><label>Title</label><input id="ac-title" value="${escHtml(subject.title)}"></div>
        <div class="field"><label>Year</label><input id="ac-year" value="${escHtml(subject.year || "Year 12")}"></div>
        <div class="field"><label>Area</label><input id="ac-area" value="${escHtml(subject.area || "")}"></div>
        <div class="field span2"><label>Default textbook path</label><input id="ac-textbook" value="${escHtml(subject.textbook || "")}" placeholder="../Year 12/File name.pdf"></div>
      </div>
      <hr class="section-divider">
      <div class="section-label">Topics</div>
      <div class="form-grid">
        <div class="field"><label>Select topic</label><select id="ac-topic-select" onchange="switchAtomiTopic(this.value)">${topics.map(t=>`<option value="${escHtml(t.code)}" ${t.code===topic.code?"selected":""}>${escHtml(t.code)} - ${escHtml(t.title)}</option>`).join("")}</select></div>
        <div class="field"><label>Topic code</label><input id="ac-topic-code" value="${escHtml(topic.code)}"></div>
        <div class="field span2"><label>Topic title</label><input id="ac-topic-title" value="${escHtml(topic.title)}"></div>
        <div class="field"><label>YouTube ID or URL</label><input id="ac-youtube" value="${escHtml(topic.youtubeId || topic.youtubeUrl || "")}" placeholder="Paste YouTube ID or URL"></div>
        <div class="field"><label>Topic textbook path</label><input id="ac-topic-textbook" value="${escHtml(topic.textbook || subject.textbook || "")}"></div>
        <div class="field span2"><label>Quiz question</label><textarea id="ac-quiz-question">${escHtml(topic.quiz?.question || "")}</textarea></div>
        <div class="field"><label>Option A</label><input id="ac-opt-0" value="${escHtml(topic.quiz?.options?.[0] || "")}"></div>
        <div class="field"><label>Option B</label><input id="ac-opt-1" value="${escHtml(topic.quiz?.options?.[1] || "")}"></div>
        <div class="field"><label>Option C</label><input id="ac-opt-2" value="${escHtml(topic.quiz?.options?.[2] || "")}"></div>
        <div class="field"><label>Option D</label><input id="ac-opt-3" value="${escHtml(topic.quiz?.options?.[3] || "")}"></div>
        <div class="field"><label>Correct answer</label><select id="ac-answer"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></div>
      </div>
      <button class="btn btn-danger" onclick="deleteAtomiTopic()">Delete Current Topic</button>
    </div>`;
  document.getElementById("ac-answer").value = String(topic.quiz?.answerIndex || 0);
}

function collectAtomiTopic(){
  return {
    code: document.getElementById("ac-topic-code").value.trim(),
    title: document.getElementById("ac-topic-title").value.trim(),
    youtubeId: document.getElementById("ac-youtube").value.trim(),
    textbook: document.getElementById("ac-topic-textbook").value.trim(),
    quiz: {
      question: document.getElementById("ac-quiz-question").value.trim(),
      options: [0,1,2,3].map(i => document.getElementById(`ac-opt-${i}`).value.trim()),
      answerIndex: Number(document.getElementById("ac-answer").value)
    }
  };
}

function saveAtomiSubjectForm(){
  const slug = document.getElementById("ac-slug").value.trim();
  if(!slug) return showToast("Subject slug required", true);
  let subject = atomiCourseData.subjects.find(s => s.slug === (currentCourseSlug || slug));
  if(!subject) {
    subject = {topics:[]};
    atomiCourseData.subjects.push(subject);
  }
  subject.slug = slug;
  subject.title = document.getElementById("ac-title").value.trim();
  subject.year = document.getElementById("ac-year").value.trim();
  subject.area = document.getElementById("ac-area").value.trim();
  subject.textbook = document.getElementById("ac-textbook").value.trim();
  subject.topics ||= [];
  const topic = collectAtomiTopic();
  if(topic.code) {
    const idx = subject.topics.findIndex(t => t.code === currentTopicCode || t.code === topic.code);
    if(idx >= 0) subject.topics[idx] = topic;
    else subject.topics.push(topic);
    currentTopicCode = topic.code;
  }
  currentCourseSlug = slug;
  refreshAtomiCourseSidebar();
  renderAtomiSubjectForm(subject);
  showToast("Subject saved locally. Click Publish to push.");
}

function switchAtomiTopic(code){
  saveAtomiSubjectForm();
  currentTopicCode = code;
  renderAtomiSubjectForm(atomiCourseData.subjects.find(s => s.slug === currentCourseSlug));
}

function addAtomiTopic(){
  saveAtomiSubjectForm();
  const subject = atomiCourseData.subjects.find(s => s.slug === currentCourseSlug);
  const code = `${(subject.slug || "TOPIC").toUpperCase().replace(/[^A-Z0-9]+/g,"-")}-${(subject.topics||[]).length + 1}`;
  subject.topics.push({code,title:"New topic",youtubeId:"",textbook:subject.textbook||"",quiz:{question:"",options:["","","",""],answerIndex:0}});
  currentTopicCode = code;
  renderAtomiSubjectForm(subject);
}

function deleteAtomiTopic(){
  const subject = atomiCourseData.subjects.find(s => s.slug === currentCourseSlug);
  if(!subject || !currentTopicCode || !confirm("Delete this topic?")) return;
  subject.topics = (subject.topics || []).filter(t => t.code !== currentTopicCode);
  currentTopicCode = subject.topics[0]?.code || null;
  renderAtomiSubjectForm(subject);
}

function getAtomiCourseTemplate(){
  return `window.Electroni_COURSE_DATA = ${JSON.stringify(atomiCourseData, null, 2)};\n`;
}

async function saveAtomiCourses(){
  const token = getGitHubToken();
  if(!token) return;
  try{
    showToast("Publishing Electroni courses...");
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${ELECTRONI_COURSE_PATH}?cb=${Date.now()}`, {headers:{Authorization:`token ${token}`}});
    const payload = {message:"Admin: Updated Electroni courses", content:btoa(unescape(encodeURIComponent(getAtomiCourseTemplate())))};
    if(res.ok) payload.sha = (await res.json()).sha;
    const put = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${ELECTRONI_COURSE_PATH}`, {
      method:"PUT", headers:{Authorization:`token ${token}`,"Content-Type":"application/json"}, body:JSON.stringify(payload)
    });
    if(!put.ok) throw new Error((await put.json()).message);
    showToast("Electroni courses published");
  }catch(error){
    showToast("Electroni publish error: " + error.message, true);
  }
}
