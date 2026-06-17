// ============================================================================
// TRIVIA GAME LOGIC
// ============================================================================

let triviaState = {
  questions: [],
  current: 0,
  score: 0,
  answered: false,
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startTrivia(count = 10) {
  triviaState.questions = shuffle(TRIVIA_QUESTIONS).slice(0, count);
  triviaState.current = 0;
  triviaState.score = 0;
  document.getElementById("trivia-intro").style.display = "none";
  document.getElementById("trivia-result").style.display = "none";
  document.getElementById("trivia-play").style.display = "block";
  renderQuestion();
}

function renderQuestion() {
  triviaState.answered = false;
  const q = triviaState.questions[triviaState.current];
  const total = triviaState.questions.length;

  document.getElementById("trivia-progress").innerHTML = triviaState.questions
    .map((_, i) => `<div class="seg ${i < triviaState.current ? "done" : ""}"></div>`).join("");

  document.getElementById("trivia-counter").textContent = `Question ${triviaState.current + 1} of ${total}`;
  document.getElementById("trivia-q").textContent = q.q;

  const optsWrap = document.getElementById("trivia-options");
  optsWrap.innerHTML = shuffle(q.options).map(opt =>
    `<button class="trivia-opt" data-opt="${encodeURIComponent(opt)}">${opt}</button>`
  ).join("");

  document.getElementById("trivia-fact").style.display = "none";
  document.getElementById("trivia-next").style.display = "none";

  optsWrap.querySelectorAll(".trivia-opt").forEach(btn => {
    btn.addEventListener("click", () => selectAnswer(btn, q));
  });
}

function selectAnswer(btn, q) {
  if (triviaState.answered) return;
  triviaState.answered = true;

  const chosen = decodeURIComponent(btn.dataset.opt);
  const isCorrect = chosen === q.answer;
  if (isCorrect) triviaState.score++;

  document.querySelectorAll(".trivia-opt").forEach(b => {
    b.disabled = true;
    const val = decodeURIComponent(b.dataset.opt);
    if (val === q.answer) b.classList.add("correct");
    else if (b === btn) b.classList.add("incorrect");
  });

  const factEl = document.getElementById("trivia-fact");
  factEl.textContent = (isCorrect ? "✓ Correct — " : "✗ ") + q.fact;
  factEl.style.display = "block";

  const nextBtn = document.getElementById("trivia-next");
  nextBtn.style.display = "inline-block";
  nextBtn.textContent = (triviaState.current + 1 < triviaState.questions.length) ? "Next question →" : "See results →";
}

function nextQuestion() {
  triviaState.current++;
  if (triviaState.current >= triviaState.questions.length) {
    finishTrivia();
  } else {
    renderQuestion();
  }
}

async function finishTrivia() {
  document.getElementById("trivia-play").style.display = "none";
  const resultEl = document.getElementById("trivia-result");
  resultEl.style.display = "block";

  const total = triviaState.questions.length;
  document.getElementById("trivia-final-score").textContent = `${triviaState.score} / ${total}`;

  let verdict = "Rusty studs.";
  const pct = triviaState.score / total;
  if (pct === 1) verdict = "Perfect — Ballon d'Or for trivia.";
  else if (pct >= 0.8) verdict = "Sharp. You watched every match.";
  else if (pct >= 0.5) verdict = "Solid showing, room to improve.";

  document.getElementById("trivia-verdict").textContent = verdict;

  const statusEl = document.getElementById("trivia-submit-status");
  if (window.WCAuth && window.WCAuth.currentUser) {
    statusEl.textContent = "Saving your score to the global leaderboard…";
    const res = await window.WCAuth.submitTriviaScore(triviaState.score, total);
    statusEl.textContent = res.ok ? "Saved to the global leaderboard." : "Couldn't save your score right now.";
    loadLeaderboard();
  } else {
    statusEl.textContent = window.WCAuth && window.WCAuth.isConfigured
      ? "Sign in with Google to save your score to the global leaderboard."
      : "Global leaderboard isn't connected yet — your score stays on this device.";
  }
}

async function loadLeaderboard() {
  const wrap = document.getElementById("leaderboard-list");
  if (!wrap) return;
  if (!window.WCAuth || !window.WCAuth.isConfigured) {
    wrap.innerHTML = `<div class="data-block"><div class="overlay-block"><div class="icon">🌍</div><div class="msg"><strong>Global leaderboard not available</strong>Firebase isn't connected yet — see js/firebase-auth.js for setup steps.</div></div></div>`;
    return;
  }
  const rows = await window.WCAuth.fetchLeaderboard(20);
  if (rows.length === 0) {
    wrap.innerHTML = `<div class="data-block"><div class="overlay-block"><div class="icon">🌍</div><div class="msg"><strong>No scores yet</strong>Be the first to play and set the bar.</div></div></div>`;
    return;
  }
  wrap.innerHTML = rows.map((r, i) => `
    <div class="leaderboard-row">
      <span class="rank">${i + 1}</span>
      <img src="${r.photo || ''}" alt="">
      <span class="name">${r.name}</span>
      <span class="pts">${r.best}/${r.total}</span>
    </div>`).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("trivia-start-btn")?.addEventListener("click", () => startTrivia(10));
  document.getElementById("trivia-restart-btn")?.addEventListener("click", () => startTrivia(10));
  document.getElementById("trivia-next")?.addEventListener("click", nextQuestion);
  document.addEventListener("wc-auth-changed", loadLeaderboard);
  loadLeaderboard();
});
