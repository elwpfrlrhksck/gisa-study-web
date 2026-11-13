"use strict";
/* 기관사 공부방 (모바일 우선): 문제 풀이 / 모의시험 / 오답노트 / 해설 보기
   데이터: window.BANK (평문) 또는 window.ENC (비밀번호로 암호화된 데이터, 열 때 복호화) */

let BANK = [];
let BY_ID = {};
const MARKS = ["①", "②", "③", "④", "⑤"];
const SUBJECTS = ["규정", "안전", "기술"];
const KINDS = ["기출", "원본", "예상"];
const KIND_LABEL = { 기출: "기출문제", 원본: "원본 문제", 예상: "예상문제" };
const root = document.getElementById("root");
const ICONS = {
  home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  practice: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z"/>',
  theory: '<path d="M12 5v16M3 3c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',
  cards: '<rect x="6" y="7" width="14" height="14" rx="3"/><path d="M16 3H5a2 2 0 0 0-2 2v11m7-4h6m-6 4h4"/>',
  exam: '<circle cx="12" cy="13" r="8"/><path d="M12 9v5l3 2M9 2h6m-3 0v3m7 1 2 2"/>',
  wrong: '<path d="M5 3h14v18H5Z M9 8h6m-6 4h6m-6 4h3M3 7h4m-4 5h4m-4 5h4"/>',
  browse: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  train: '<rect x="5" y="2" width="14" height="16" rx="4"/><path d="M5 9h14M12 2v7M8 18l-3 4m11-4 3 4M7 21h10"/><path d="M8 14h1m6 0h1"/>',
};
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.practice}</svg>`;

/* ---------- 저장소 (localStorage는 막혀 있을 수 있어 항상 try/catch) ---------- */
const KEY = "gisa-study.v2";
let DB = { stats: {}, bm: {}, hist: [], fs: 16, reading: "compact", sess: {} };
let LASTP = null; // 방금 끝낸 풀이 세트(같은 문제 다시 풀기용)
try {
  const raw = localStorage.getItem(KEY);
  if (raw) DB = Object.assign(DB, JSON.parse(raw));
} catch (e) {}
function save() {
  try {
    DB.sess = { P: P ? snap(P) : null, E: E && !E.done ? snap(E) : null };
    localStorage.setItem(KEY, JSON.stringify(DB));
  } catch (e) {}
}
function snap(o) {
  const c = Object.assign({}, o);
  delete c.timer;
  return c;
}
function record(id, ok) {
  const s = DB.stats[id] || { a: 0, w: 0, last: null };
  s.a++;
  if (!ok) s.w++;
  s.last = ok ? 1 : 0;
  DB.stats[id] = s;
}

/* ---------- 유틸 ---------- */
const h = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isCard = (q) => q.type === "card";
const uniq = (a) => [...new Set(a)];
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
function fmtTime(sec) {
  sec = Math.max(0, sec | 0);
  return String((sec / 60) | 0).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
}
let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2200);
}
/* alert/confirm은 뷰어에서 동작하지 않으므로 화면 안의 시트로 대신한다 */
let sheetFocus = null;
function sheet(html) {
  if (!document.getElementById("modal").innerHTML) sheetFocus = document.activeElement;
  const m = document.getElementById("modal");
  m.innerHTML = `<div class="shade" data-act="shade"><div class="sheet" role="dialog" aria-modal="true" aria-label="학습 메뉴" tabindex="-1">${html}</div></div>`;
  document.getElementById("shell")?.setAttribute("inert", "");
  (m.querySelector("button, input, select") || m.querySelector(".sheet")).focus();
}
function closeSheet() {
  document.getElementById("modal").innerHTML = "";
  document.getElementById("shell")?.removeAttribute("inert");
  if (sheetFocus?.isConnected) sheetFocus.focus();
  sheetFocus = null;
}
function confirmBox(title, body, okLabel) {
  return new Promise((res) => {
    sheet(`<h3>${h(title)}</h3><p class="mute">${h(body)}</p><div class="row" style="margin-top:12px"><button class="btn" data-act="no">취소</button><span class="sp"></span><button class="btn pri" data-act="yes">${h(okLabel || "확인")}</button></div>`);
    const m = document.getElementById("modal");
    const on = (e) => {
      const a = e.target.closest("[data-act]");
      if (!a || !["yes", "no", "shade"].includes(a.dataset.act)) return;
      if (a.dataset.act === "shade" && e.target.closest(".sheet")) return;
      m.removeEventListener("click", on, true);
      closeSheet();
      res(a.dataset.act === "yes");
    };
    m.addEventListener("click", on, true);
  });
}
function chips(q) {
  const c = [`<span class="chip k-${h(q.kind)}">${h(q.exam)}${q.no ? " · " + q.no + "번" : ""}</span>`, `<span class="chip">${h(q.subject)}</span>`];
  if (q.topic) c.push(`<span class="chip">${h(q.topic)}</span>`);
  if (q.conf === "추정") c.push('<span class="chip warn">정답 추정</span>');
  if (isCard(q)) c.push('<span class="chip">암기카드</span>');
  return `<div class="chips">${c.join("")}</div>`;
}
const star = (q) => `<button class="star ${DB.bm[q.id] ? "on" : ""}" data-act="bm" data-id="${h(q.id)}" aria-label="북마크" aria-pressed="${!!DB.bm[q.id]}">${DB.bm[q.id] ? "★" : "☆"}</button>`;
function explainBox(q) {
  if (!q.explain) return `<div class="explain" style="opacity:.85"><b>해설 없음</b>\n제공해 주신 자료에서 이 문제의 해설 근거를 찾지 못했습니다.</div>`;
  return `<div class="explain"><b>해설</b>\n${h(q.explain)}${q.src ? `\n(${h(q.src)})` : ""}</div>`;
}
function setFs(n) {
  DB.fs = Math.max(12, Math.min(28, n));
  document.documentElement.style.setProperty("--fs", DB.fs + "px");
  save();
  fit(true);
  toast("글자 크기 " + DB.fs);
}
/* 사용자가 선택한 글자 크기를 유지하고 긴 문제는 스크롤해서 읽는다. */
function fit(reset) {
  document.documentElement.style.setProperty("--fit", 1);
  document.body.classList.toggle("session-flow", DB.reading === "flow");
  document.body.classList.toggle("large-text", DB.fs > 20);
}

/* 풀이 전용 레이아웃. 긴 원문은 각 영역에서 스크롤하고, 펼쳐 보기로도 전환한다. */
function choiceLayout(q) {
  return q.choices.length <= 4 && q.choices.every((c) => c.length <= 24 && !c.includes("\n")) ? "short-options" : "";
}
function readingButton() {
  return `<button class="reading-toggle" data-act="reading" aria-pressed="${DB.reading === "flow"}" title="긴 문제와 해설을 페이지 전체로 펼쳐 읽기">펼쳐 보기</button>`;
}
function sessionQuestion(q, content, exam = false) {
  return `<section class="question-pane" aria-label="문제와 보기" tabindex="0" data-qid="${h(q.id)}"><div class="question-meta"><span class="chip">${h(q.subject)}</span>${!exam && q.conf === "추정" ? '<span class="chip warn">정답 추정</span>' : ""}<details class="session-source"><summary>출처·단원</summary>${chips(q)}</details>${star(q)}</div><h1 class="q" id="session-question">${h(q.q)}</h1>${content}</section>`;
}
function sessionFeedback(q, title, answer, revealed, status = "") {
  return `<aside class="feedback-panel ${revealed ? "revealed" : "waiting"} ${status}" aria-label="정답과 해설"><div class="feedback-heading"><h2 class="answer-title" tabindex="-1">${h(title)}</h2>${status ? `<span class="answer-state">${status === "ok" ? "✓ 정답" : "✕ 오답"}</span>` : ""}</div>${revealed ? `<div class="feedback-scroll" tabindex="0" role="region" aria-label="정답과 해설 본문"><div class="answer-text">${answer}</div>${explainBox(q)}</div>` : `<p class="answer-placeholder">${h(answer)}</p>`}</aside>`;
}
function sessionScroll() {
  const pane = $().querySelector(".question-pane");
  return pane ? { id: pane.dataset.qid, top: pane.scrollTop } : null;
}
function restoreSessionScroll(previous) {
  const pane = $().querySelector(".question-pane");
  if (pane && previous?.id === pane.dataset.qid) pane.scrollTop = previous.top;
}

/* ---------- 필터 ---------- */
const defaultFilter = () => ({ kind: "", exam: "", subject: "", only: "", order: "seq", n: 0, text: "", sure: false, type: "" });
function applyFilter(f, list) {
  list = list || BANK;
  if (f.kind) list = list.filter((q) => q.kind === f.kind);
  if (f.exam) list = list.filter((q) => q.exam === f.exam);
  if (f.subject) list = list.filter((q) => q.subject === f.subject);
  if (f.type === "mcq") list = list.filter((q) => !isCard(q));
  if (f.type === "card") list = list.filter(isCard);
  if (f.sure) list = list.filter((q) => q.conf !== "추정");
  if (f.text) {
    const t = f.text.toLowerCase();
    list = list.filter((q) => [q.q, ...(q.choices || []), q.a, q.topic, q.explain, q.src, q.exam].filter(Boolean).join(" ").toLowerCase().includes(t.trim()));
  }
  if (f.only === "unseen") list = list.filter((q) => !DB.stats[q.id]);
  if (f.only === "wrong") list = list.filter((q) => DB.stats[q.id] && DB.stats[q.id].last === 0);
  if (f.only === "bm") list = list.filter((q) => DB.bm[q.id]);
  return list;
}
const examsOf = (kind) => uniq(BANK.filter((q) => !kind || q.kind === kind).map((q) => q.exam));
function filterForm(f, opts = {}) {
  const opt = (v, l, cur) => `<option value="${h(v)}" ${v === cur ? "selected" : ""}>${h(l)}</option>`;
  return `<div class="card" id="ff"><div class="grid two">
    <label class="f">구분<select data-f="kind">${opt("", "전체", f.kind)}${KINDS.map((k) => opt(k, KIND_LABEL[k], f.kind)).join("")}</select></label>
    <label class="f">과목<select data-f="subject">${opt("", "전체", f.subject)}${SUBJECTS.map((s) => opt(s, s, f.subject)).join("")}</select></label>
    <label class="f" style="grid-column:1/-1">출처<select data-f="exam">${opt("", "전체", f.exam)}${examsOf(f.kind).map((e) => opt(e, e, f.exam)).join("")}</select></label>
    <label class="f">상태<select data-f="only" ${opts.lockOnly ? "disabled" : ""}>${opt("", "전체", f.only)}${opt("unseen", "안 푼 문제", f.only)}${opt("wrong", "틀린 문제", f.only)}${opt("bm", "북마크", f.only)}</select></label>
    ${opts.noType ? "" : `<label class="f">유형<select data-f="type">${opt("", "전체", f.type)}${opt("mcq", "객관식", f.type)}${opt("card", "암기카드", f.type)}</select></label>`}
    ${opts.noOrder ? "" : `<label class="f">순서<select data-f="order">${opt("seq", "차례대로", f.order)}${opt("rand", "무작위", f.order)}</select></label>`}
    ${opts.noN ? "" : `<label class="f">문항 수<select data-f="n">${[0, 10, 20, 30, 50, 100].map((n) => opt(String(n), n ? n + "문항" : "전체", String(f.n))).join("")}</select></label>`}
    <label class="f" style="grid-column:1/-1">검색<input type="search" data-f="text" value="${h(f.text)}" placeholder="문제·보기·해설·출처 검색"></label>
  </div>
  <label class="row" style="margin-top:12px;min-height:44px"><input type="checkbox" data-f="sure" ${f.sure ? "checked" : ""}> 정답이 확정된 문제만</label>
  <div class="mute">조건에 맞는 문제 <b id="cnt">${applyFilter(f).length}</b>개</div></div>`;
}
function wireFilter(f, onChange) {
  const ff = document.getElementById("ff");
  if (!ff) return;
  ff.addEventListener("change", (e) => {
    const k = e.target.dataset.f;
    if (!k) return;
    if (k === "text") return; // 입력 이벤트에서 반영하므로 포커스 이동 때 시작 버튼을 다시 만들지 않는다.
    f[k] = e.target.type === "checkbox" ? e.target.checked : k === "n" ? +e.target.value : e.target.value;
    if (k === "kind") f.exam = "";
    onChange();
  });
  const t = ff.querySelector('[data-f="text"]');
  if (t)
    t.addEventListener("input", () => {
      f.text = t.value;
      document.getElementById("cnt").textContent = applyFilter(f).length;
      updatePracticeStart();
    });
}
function updatePracticeStart() {
  const btn = document.querySelector('[data-act="pstart"]');
  if (!btn) return;
  const count = applyFilter(PF).length;
  btn.disabled = !count;
  btn.textContent = count ? `${Math.min(PF.n || count, count)}문항 학습 시작` : "조건에 맞는 문제가 없어요";
}

/* ---------- 화면 틀 / 라우팅 (내부 상태로만 이동: 주소창 해시에 의존하지 않음) ---------- */
let view = "home";
let P = null; // 풀이 세션
let E = null; // 시험 세션
const PF = defaultFilter();
const SEARCH_FILTER = defaultFilter();
const BOOKMARK_FILTER = Object.assign(defaultFilter(), { only: "bm" });
let BF = SEARCH_FILTER;
const EF = { sure: true, nR: 20, nA: 10, nT: 20, min: 60 };
let bpage = 0;
const TABS = [
  ["home", "home", "학습 홈"],
  ["practice", "practice", "문제 풀이"],
  ["wrong", "wrong", "오답노트"],
  ["theory", "theory", "핵심 이론"],
  ["exam", "exam", "모의시험"],
  ["cards", "cards", "암기카드"],
  ["browse", "browse", "문제 검색"],
];
/* 풀이 모드: mcq=객관식 문제, card=암기카드, wrong=오답노트, theory=이론 단원 문제 */
const MODE = {
  mcq: { view: "practice", title: "문제 풀이", type: "mcq", lead: "객관식 문제를 풀고 바로 정답과 해설을 확인합니다." },
  card: { view: "cards", title: "암기 카드", type: "card", lead: "문제를 보고 답을 떠올린 뒤 정답을 확인합니다." },
  wrong: { view: "wrong", title: "오답노트", type: "", lead: "틀린 문제와 몰랐던 카드만 다시 봅니다.", preset: { only: "wrong" } },
};
let THEORY = [];
let tArea = null;
function shell() {
  root.innerHTML = `<div id="shell">
    <header class="appbar"><button class="brand" data-act="go" data-v="home">${icon("train")}<span>기관사 <b>공부방</b></span></button><span class="header-note">매일 한 걸음, 합격에 더 가까이</span><div class="font-tools" role="group" aria-label="글자 크기"><button class="iconbtn" data-act="fs-" aria-label="글자 작게">가−</button><button class="iconbtn" data-act="fs+" aria-label="글자 크게">가+</button></div></header>
    <nav class="tabbar" id="tabbar" aria-label="학습 메뉴"><span class="nav-label">나의 공부방</span>${TABS.map(([k, i, l]) => `<button data-act="go" data-v="${k}" data-tab="${k}">${icon(i)}<span>${l}</span></button>`).join("")}<div class="nav-note">차근차근 쌓이는 실력<br><b>오늘도 한 문제부터.</b></div></nav>
    <main id="app" tabindex="-1"></main>
    <div id="actionbar" hidden></div>
  </div>`;
}
const $ = () => document.getElementById("app");
function setBar(html) {
  const ab = document.getElementById("actionbar");
  const tb = document.getElementById("tabbar");
  document.body.classList.toggle("has-actions", !!html);
  if (html) {
    ab.className = "actionbar";
    ab.innerHTML = html;
    ab.hidden = false;
    tb.hidden = false;
  } else {
    ab.hidden = true;
    ab.innerHTML = "";
    tb.hidden = false;
  }
}
function go(v) {
  if (v === "browse") { BF = SEARCH_FILTER; bpage = 0; }
  if (v === "bookmarks") { BF = BOOKMARK_FILTER; bpage = 0; }
  view = v;
  render();
  window.scrollTo(0, 0);
  $().focus({ preventScroll: true });
}
function render() {
  document.body.classList.remove("sess");
  document.querySelectorAll("[data-tab]").forEach((b) => {
    const active = b.dataset.tab === view || (view === "tpractice" && b.dataset.tab === "theory");
    b.classList.toggle("on", active);
    if (active) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  setBar("");
  const modeOfView = { practice: "mcq", cards: "card", wrong: "wrong" }[view];
  if (view === "home") home();
  else if (view === "theory") theory();
  else if (modeOfView) (P && P.mode === modeOfView ? renderPractice() : practiceSetup(modeOfView));
  else if (view === "tpractice" && P) renderPractice();
  else if (view === "exam") (E && !E.done ? renderExam() : E && E.done ? renderResult(false) : examSetup());
  else if (view === "browse" || view === "bookmarks") browse();
  else home();
}

/* ---------- 홈 ---------- */
function home() {
  const mcq = BANK.filter((q) => !isCard(q)).length;
  const done = BANK.filter((q) => DB.stats[q.id]).length;
  const tot = Object.values(DB.stats).reduce((a, s) => a + s.a, 0);
  const wr = Object.values(DB.stats).reduce((a, s) => a + s.w, 0);
  const wrongNow = BANK.filter((q) => DB.stats[q.id]?.last === 0).length;
  const bookmarks = BANK.filter((q) => DB.bm[q.id]).length;
  const hist = DB.hist
    .slice(-5)
    .reverse()
    .map((x) => `<tr><td>${new Date(x.ts).toLocaleDateString("ko-KR")}</td><td>${h(x.title)}</td><td>${pct(x.correct, x.total)}점</td></tr>`)
    .join("");
  const resume =
    (E && !E.done ? `<button class="resume" data-act="go" data-v="exam">${icon("exam")}<span><b>진행 중인 시험 이어하기</b><small>${h(E.title)} · 남은 시간 ${fmtTime((E.end - Date.now()) / 1000)}</small></span>${icon("arrow")}</button>` : "") +
    (P ? `<button class="resume" data-act="go" data-v="${viewOfP()}">${icon(P.mode === "card" ? "cards" : "practice")}<span><b>${P.mode === "card" ? "보던 암기카드 이어보기" : "풀던 문제 이어풀기"}</b><small>${P.i + 1} / ${P.ids.length}번째 · 학습 내용이 저장되어 있어요</small></span>${icon("arrow")}</button>` : "");
  const subjects = SUBJECTS.map((s, i) => {
    const qs = BANK.filter((q) => q.subject === s && !isCard(q));
    const solved = qs.filter((q) => DB.stats[q.id]).length;
    return `<button class="subject-row" data-act="subject-start" data-s="${s}"><span class="subject-number">0${i + 1}</span><span class="subject-info"><span class="row"><b>${s === "기술" ? "기술·운전이론" : s}</b><span class="sp"></span><small>${solved.toLocaleString()} / ${qs.length.toLocaleString()}문항</small></span><span class="bar"><i style="width:${pct(solved, qs.length)}%"></i></span></span>${icon("arrow")}</button>`;
  }).join("");
  $().innerHTML = `
  <div class="page-heading"><div><p class="eyebrow">나의 학습 대시보드</p><h1>오늘도 한 걸음 나아가 볼까요?</h1><p class="mute">이론부터 실전까지, 나만의 속도로 준비하세요.</p></div><span class="date-label">${new Date().toLocaleDateString("ko-KR", {month:"long", day:"numeric", weekday:"long"})}</span></div>
  ${resume ? `<div class="resume-list">${resume}</div>` : ""}
  <section class="hero" aria-label="빠른 학습 시작"><div class="hero-copy"><span class="hero-tag">매일의 작은 연습이 만드는 자신감</span><h2>한 문제씩 차근차근,<br>합격을 향한 오늘의 공부.</h2><p>문제를 풀고, 해설을 읽고, 부족한 부분을 채워보세요.</p><button class="btn pri" data-act="quick-start">${P ? "이어서 학습하기" : "바로 20문제 풀기"}${icon("arrow")}</button><button class="hero-link" data-act="go" data-v="practice">조건 골라 풀기</button></div><div class="hero-art" aria-hidden="true"><div class="rail-ring">${icon("train")}</div><span class="rail-line"></span><span class="rail-caption">NEXT STOP · 합격</span></div></section>
  <section class="stats-grid" aria-label="내 학습 기록">
    <div class="stat"><span>학습한 문제</span><b>${done.toLocaleString()}<small>문항</small></b><small>전체 ${BANK.length.toLocaleString()}문항 중</small></div>
    <div class="stat"><span>누적 정답률</span><b>${tot ? pct(tot - wr, tot) : "—"}<small>${tot ? "%" : ""}</small></b><small>${tot ? "지금까지의 모든 풀이 기준" : "첫 문제를 풀어 기록해 보세요"}</small></div>
    <button class="stat stat-link" data-act="go" data-v="wrong"><span>복습할 오답 ${icon("arrow")}</span><b>${wrongNow.toLocaleString()}<small>문항</small></b><small>다시 풀고 확실하게</small></button>
    <button class="stat stat-link" data-act="bookmarks"><span>저장한 북마크 ${icon("arrow")}</span><b>${bookmarks.toLocaleString()}<small>문항</small></b><small>중요한 문제를 한곳에</small></button>
  </section>
  <div class="dashboard-grid"><section><div class="section-heading"><h2>오늘의 학습</h2><span class="mute">원하는 방식으로 시작하세요</span></div><div class="learning-grid">
    <button class="tile feature-tile" data-act="go" data-v="practice"><span class="tile-icon">${icon("practice")}</span><h3>문제 풀이</h3><span class="mute">과목별로 풀고 바로 해설 확인</span><span class="tile-cta">학습 시작 ${icon("arrow")}</span></button>
    <button class="tile feature-tile" data-act="go" data-v="exam"><span class="tile-icon teal">${icon("exam")}</span><h3>실전 모의시험</h3><span class="mute">시간을 정해 실력 점검하기</span><span class="tile-cta">시험 선택 ${icon("arrow")}</span></button>
  </div><div class="section-heading"><h2>과목별 학습 현황</h2><span class="mute">객관식 기준</span></div><div class="card subject-card">${subjects}</div></section>
  <section><div class="section-heading"><h2>빈틈을 채우는 복습</h2></div><div class="card review-card">
    <button class="review-row" data-act="go" data-v="wrong">${icon("wrong")}<span><b>오답노트</b><small>${wrongNow ? `${wrongNow}문항을 다시 풀어보세요` : "틀린 문제를 자동으로 모아드려요"}</small></span>${icon("arrow")}</button>
    <button class="review-row" data-act="go" data-v="theory">${icon("theory")}<span><b>핵심 이론</b><small>단원별 개념과 연결 문제</small></span>${icon("arrow")}</button>
    <button class="review-row" data-act="go" data-v="cards">${icon("cards")}<span><b>암기카드</b><small>답을 떠올리며 개념 확인</small></span>${icon("arrow")}</button>
    <button class="review-row" data-act="go" data-v="browse">${icon("browse")}<span><b>문제·해설 검색</b><small>궁금한 내용을 빠르게 찾기</small></span>${icon("arrow")}</button>
  </div><div class="study-note"><span class="eyebrow">학습 TIP</span><p>정답을 맞혔더라도<br><b>해설을 한 번 더 읽어보세요.</b></p><span class="mute">이유를 이해하면 더 오래 기억할 수 있어요.</span></div></section></div>
  <div class="section-heading"><h2>최근 모의시험</h2><button class="text-btn" data-act="go" data-v="exam">시험 보러 가기 ${icon("arrow")}</button></div>
  <div class="card history-card">${hist ? `<table class="t"><thead><tr><th>날짜</th><th>시험</th><th>점수</th></tr></thead><tbody>${hist}</tbody></table>` : `<div class="history-empty">${icon("exam")}<p>아직 응시한 시험이 없어요.</p><span class="mute">모의시험을 마치면 점수와 응시 기록을 확인할 수 있어요.</span></div>`}</div>
  <footer class="study-footer"><p>객관식 ${mcq.toLocaleString()}문항 · 암기카드 ${(BANK.length - mcq).toLocaleString()}장 · 이론 ${THEORY.length}개 영역</p><p>학습 기록은 현재 브라우저에 자동 저장됩니다. 기기 간 동기화는 지원하지 않습니다.</p><details><summary>학습 기록 관리 및 자료 안내</summary><p>“정답 추정” 표시는 원본에 정답이 없거나 불확실한 문제입니다. 원문과 대조하세요.</p><button class="btn" data-act="resetall">학습 기록 초기화</button></details></footer>`;
}

/* ---------- 문제 풀이 ---------- */
function viewOfP() {
  return P && MODE[P.mode] ? MODE[P.mode].view : "tpractice";
}
function practiceSetup(mode, keep) {
  const m = MODE[mode];
  const f = Object.assign(PF, defaultFilter(), { order: "rand", n: 20 }, m.preset || {}, keep || {}, m.type ? { type: m.type } : {});
  const draw = () => {
    const advanced = document.getElementById("advanced-filters")?.open || false;
    $().innerHTML = `<div class="page-heading"><div><p class="eyebrow">나에게 맞는 학습</p><h1>${h(m.title)}</h1><p class="mute">${h(m.lead)}</p></div></div>
    ${mode === "wrong" && !applyFilter({ only: "wrong" }).length ? '<div class="notice">아직 복습할 오답이 없어요. 문제를 풀면 틀린 문항이 여기에 자동으로 모입니다.</div>' : ""}
    <h2>1. 과목을 선택하세요</h2>${pills(f.subject, "subj")}
    <h2>2. 학습량을 정하세요</h2><div class="card setup-options"><label class="f">한 번에 풀 문항 수<select data-p="n">${[10,20,30,50,100,0].map((n) => `<option value="${n}" ${f.n === n ? "selected" : ""}>${n ? n + "문항" : "전체 문항"}</option>`).join("")}</select></label><label class="f">문제 순서<select data-p="order"><option value="rand" ${f.order === "rand" ? "selected" : ""}>무작위로 섞기</option><option value="seq" ${f.order === "seq" ? "selected" : ""}>차례대로 풀기</option></select></label></div>
    <details class="advanced-filters" id="advanced-filters" ${advanced ? "open" : ""}><summary>상세 조건 <span class="mute">출처 · 학습 상태 · 검색</span></summary>${filterForm(f, { noType: !!m.type, noN: true, noOrder: true, lockOnly: mode === "wrong" })}</details>
    <p class="setup-help">${mode === "card" ? "문제를 보고 답을 떠올린 뒤, 정답을 확인하세요." : "보기를 선택하면 바로 정답과 해설을 확인할 수 있어요."}<br>중간에 나가도 홈에서 이어서 학습할 수 있습니다.</p>`;
    setBar(`<span class="action-hint">준비되셨나요? 한 문제부터 시작해 보세요.</span><button class="btn pri wide" data-act="pstart" data-m="${mode}">학습 시작</button>`);
    updatePracticeStart();
    $().querySelectorAll("[data-p]").forEach((input) => input.addEventListener("change", () => {
      f[input.dataset.p] = input.dataset.p === "n" ? +input.value : input.value;
      updatePracticeStart();
    }));
    wireFilter(f, draw);
  };
  draw();
}
function pills(cur, act) {
  return `<div class="pills" role="group" aria-label="과목 선택">${[["", "전체"], ["규정", "규정"], ["안전", "안전"], ["기술", "기술"]].map(([v, l]) => `<button class="pill ${cur === v ? "on" : ""}" data-act="${act}" data-s="${v}" aria-pressed="${cur === v}">${l}</button>`).join("")}</div>`;
}
function startPractice(mode) {
  let list = applyFilter(PF);
  if (!list.length) return toast("조건에 맞는 문제가 없습니다");
  if (PF.order === "rand") list = shuffle(list);
  if (PF.n) list = list.slice(0, PF.n);
  startIds(list.map((q) => q.id), mode, Object.assign({}, PF));
}
let replacingSession = false;
async function startIds(ids, mode, pf, title) {
  if (replacingSession) return;
  if (P) {
    replacingSession = true;
    const accepted = await confirmBox("새 학습으로 바꿀까요?", "기존 이어풀기는 새 학습으로 바뀝니다. 풀이 기록과 북마크는 유지됩니다.", "새 학습 시작");
    replacingSession = false;
    if (!accepted) return;
  }
  P = { ids, i: 0, ans: {}, show: {}, ok: 0, done: 0, mode, pf: pf || null, title: title || "" };
  save();
  view = viewOfP();
  render();
  window.scrollTo(0, 0);
}
function renderPractice() {
  const previous = sessionScroll();
  const q = BY_ID[P.ids[P.i]];
  const a = P.ans[q.id];
  let content, feedback, bar;
  const last = P.i === P.ids.length - 1;
  const nextBtn = `<button class="btn dark wide" data-act="pnext">${last ? "학습 마치기" : "다음 문제 →"}</button>`;
  const prevBtn = `<button class="btn" data-act="pprev" ${P.i === 0 ? "disabled" : ""}>이전</button>`;
  if (isCard(q)) {
    const shown = P.show[q.id];
    content = `<p class="card-prompt">${shown ? "정답과 비교한 뒤 기억했는지 표시해 주세요." : "먼저 답을 떠올려 보세요. 정답 보기: Space / Enter, 평가: 1 몰랐다 · 2 알았다."}</p>${a !== undefined ? `<p class="verdict ${a ? "ok" : "bad"}">${a ? "알았다로 기록했어요" : "오답노트에 저장했어요"}</p>` : ""}`;
    if (/틀린|아닌|맞는|옳은|다음 중/.test(q.q)) content = '<p class="mute">보기 없이 답안만 수록된 원문 선택형 카드입니다. 틀린 보기를 고르는 문제의 답안은 옳은 설명을 뜻하지 않습니다.</p>' + content;
    feedback = sessionFeedback(q, shown ? "정답 확인" : "정답을 떠올려 보세요", shown ? h(q.a) : "정답 보기 버튼을 누르면 이곳에 표시됩니다.", shown);
    bar = !shown
      ? `${prevBtn}<button class="btn pri wide" data-act="cardshow">정답 보기</button>`
      : a === undefined
      ? `<button class="btn" data-act="cardok" data-v="0">몰랐다</button><button class="btn dark wide" data-act="cardok" data-v="1">알았다</button>`
      : `${prevBtn}${nextBtn}`;
  } else {
    const opts = q.choices
      .map((c, i) => {
        let cls = "";
        if (a !== undefined) cls = i + 1 === q.answer ? "ok" : i + 1 === a ? "bad" : "";
        const flag = a === undefined ? "" : i + 1 === q.answer ? "정답" : i + 1 === a ? "내 선택" : "";
        return `<button class="opt ${cls}" data-act="pick" data-i="${i + 1}" ${a !== undefined ? "disabled" : ""}><span class="n">${MARKS[i]}</span><span class="option-copy">${h(c)}${flag ? `<small class="option-flag">${flag}</small>` : ""}</span></button>`;
      })
      .join("");
    content = `<div class="session-options ${choiceLayout(q)}" role="group" aria-label="보기">${opts}</div>`;
    feedback = a !== undefined
      ? sessionFeedback(q, `정답 ${MARKS[q.answer - 1]} · 내 답 ${MARKS[a - 1]}`, h(q.choices[q.answer - 1]), true, a === q.answer ? "ok" : "bad")
      : sessionFeedback(q, "정답·해설", "보기를 선택하면 바로 확인할 수 있어요.", false);
    bar = `${prevBtn}${nextBtn}`;
  }
  $().innerHTML = `<div class="focus-toolbar"><button class="iconbtn" data-act="go" data-v="home" aria-label="홈으로">${icon("home")}</button><div class="session-position"><b>${P.i + 1}<span> / ${P.ids.length}</span></b><small>정답 ${P.ok} · 풀이 ${P.done}</small></div><span class="sp"></span>${readingButton()}<button class="iconbtn" data-act="pmenu" aria-label="학습 설정">⋯</button></div><div class="session-progress" aria-label="학습 진행률"><i style="width:${pct(P.i + 1, P.ids.length)}%"></i></div><div class="study-stage">${sessionQuestion(q, content)}${feedback}</div>`;
  setBar(bar);
  document.body.classList.add("sess");
  fit(P._fq !== P.i);
  restoreSessionScroll(previous);
  P._fq = P.i;
}
function pick(i) {
  const q = BY_ID[P.ids[P.i]];
  if (P.ans[q.id] !== undefined || isCard(q) || i < 1 || i > q.choices.length) return;
  P.ans[q.id] = i;
  const ok = i === q.answer;
  P.done++;
  if (ok) P.ok++;
  record(q.id, ok);
  save();
  renderPractice();
  $().querySelector(".answer-title")?.focus({ preventScroll: true });
}
function pnext() {
  if (isCard(BY_ID[P.ids[P.i]]) && P.ans[P.ids[P.i]] === undefined) {
    toast("정답을 확인한 뒤 몰랐다 또는 알았다로 기록해 주세요.");
    return;
  }
  if (P.i >= P.ids.length - 1) return practiceEnd();
  P.i++;
  save();
  renderPractice();
  window.scrollTo(0, 0);
}
function pprev() {
  if (P.i > 0) {
    P.i--;
    save();
    renderPractice();
    window.scrollTo(0, 0);
  }
}
function practiceEnd() {
  document.body.classList.remove("sess");
  const n = P.done,
    ok = P.ok,
    back = P.mode === "theory" ? "theory" : viewOfP();
  LASTP = P;
  P = null;
  save();
  $().innerHTML = `<h1>풀이 끝</h1><div class="card"><div class="score">${ok}/${n}</div><p class="mute">${n ? pct(ok, n) + "% 정답" : "푼 문제가 없습니다"}</p></div>
  <div class="row"><button class="btn pri" data-act="pagain">같은 문제 다시 풀기</button><button class="btn" data-act="go" data-v="wrong">오답노트</button><button class="btn" data-act="go" data-v="${back}">${back === "theory" ? "이론으로" : "다른 분야 고르기"}</button><button class="btn" data-act="go" data-v="home">홈</button></div>`;
  setBar("");
}

/* ---------- 모의시험 ---------- */
function examSetup() {
  const sets = [];
  for (const kind of ["예상", "기출", "원본"])
    for (const name of examsOf(kind)) {
      const qs = BANK.filter((q) => q.exam === name && !isCard(q));
      if (qs.length >= 10) sets.push({ name, kind, n: qs.length, bad: qs.filter((q) => q.conf === "추정").length });
    }
  const row = (s) =>
    `<tr><td><span class="chip k-${s.kind}">${s.kind}</span> ${h(s.name)}<div class="mute">${s.n}문항${s.bad ? ` · 추정 ${s.bad}` : ""}</div></td><td style="text-align:right"><button class="btn dark" data-act="estart" data-name="${h(s.name)}">시작</button></td></tr>`;
  $().innerHTML = `<h1>모의시험</h1>
  <p class="mute">시험 중에는 정답이 보이지 않고, 제출하면 채점과 해설이 나옵니다. 60점 이상이 합격선입니다.</p>
  <h2>랜덤 모의고사</h2>
  <div class="card"><div class="grid">
    <label class="f">규정<input type="number" inputmode="numeric" min="0" max="60" value="${EF.nR}" data-e="nR"></label>
    <label class="f">안전<input type="number" inputmode="numeric" min="0" max="60" value="${EF.nA}" data-e="nA"></label>
    <label class="f">기술·이론<input type="number" inputmode="numeric" min="0" max="60" value="${EF.nT}" data-e="nT"></label>
    <label class="f">제한시간(분)<input type="number" inputmode="numeric" min="5" max="180" value="${EF.min}" data-e="min"></label></div>
    <label class="row" style="margin-top:10px;min-height:44px"><input type="checkbox" data-e="sure" ${EF.sure ? "checked" : ""}> 정답이 확정된 문제만</label>
    <button class="btn pri" style="width:100%;margin-top:6px" data-act="erandom">랜덤으로 시작</button></div>
  <h2>회차·자료별 시험</h2><p class="mute">객관식 10문항 이상인 자료입니다. 암기카드는 출제에서 제외되며 실제 출제 문항 수를 표시합니다.</p>
  <div class="card"><table class="t">${sets.map(row).join("") || '<tr><td class="empty">회차 데이터가 없습니다.</td></tr>'}</table></div>`;
}
function startExam(ids, title, min) {
  if (!ids.length) return toast("출제할 문제가 없습니다");
  min = min || Math.max(10, Math.round(ids.length * 1.2));
  E = { ids, title, ans: {}, i: 0, end: Date.now() + min * 60000, start: Date.now(), done: false, min };
  runTimer();
  save();
  go("exam");
}
function runTimer() {
  clearInterval(E && E.timer);
  E.timer = setInterval(tick, 500);
}
function tick() {
  if (!E || E.done) return;
  const left = (E.end - Date.now()) / 1000;
  const el = document.getElementById("tm");
  if (el) {
    el.textContent = fmtTime(left);
    el.classList.toggle("low", left < 300);
  }
  if (left <= 0) submitExam(true);
}
function renderExam() {
  const previous = sessionScroll();
  const q = BY_ID[E.ids[E.i]];
  const a = E.ans[q.id];
  const opts = q.choices.map((c, i) => `<button class="opt ${a === i + 1 ? "sel" : ""}" data-act="epick" data-i="${i + 1}" aria-pressed="${a === i + 1}"><span class="n">${MARKS[i]}</span><span class="option-copy">${h(c)}${a === i + 1 ? '<small class="option-flag">내 선택</small>' : ""}</span></button>`).join("");
  $().innerHTML = `<div class="focus-toolbar"><button class="iconbtn" data-act="go" data-v="home" aria-label="홈으로 (시험은 계속 진행)">${icon("home")}</button><div class="session-position"><b>${E.i + 1}<span> / ${E.ids.length}</span></b><small>${Object.keys(E.ans).length}문항 응답</small></div><span class="sp"></span><span class="timer" id="tm" aria-label="남은 시간">${fmtTime((E.end - Date.now()) / 1000)}</span>${readingButton()}</div><div class="session-progress"><i style="width:${pct(Object.keys(E.ans).length, E.ids.length)}%"></i></div><div class="study-stage exam-stage">${sessionQuestion(q, `<div class="session-options ${choiceLayout(q)}" role="group" aria-label="보기">${opts}</div><p class="exam-choice-note" role="status">${a === undefined ? "답을 선택해 주세요." : `선택한 답 ${MARKS[a - 1]} · 다시 누르면 선택이 해제됩니다.`}</p>`, true)}<aside class="exam-guide"><p class="eyebrow">모의시험</p><h2>${h(E.title)}</h2><p>제출 전에는 정답이 공개되지 않습니다.</p><button class="btn" data-act="elist">전체 답안 확인</button></aside></div>`;
  setBar(`<button class="btn" data-act="eprev" ${E.i === 0 ? "disabled" : ""}>이전</button><button class="btn" data-act="elist">답안 목록</button>${E.i === E.ids.length - 1 ? '<button class="btn pri" data-act="esubmit">시험 제출</button>' : '<button class="btn dark" data-act="enext">다음 문제</button>'}`);
  document.body.classList.add("sess");
  fit(E._fq !== E.i);
  restoreSessionScroll(previous);
  E._fq = E.i;
  tick();
}
function examList() {
  const nav = E.ids.map((id, i) => `<button class="${E.ans[id] ? "done" : ""} ${i === E.i ? "cur" : ""}" data-act="egoto" data-i="${i}">${i + 1}</button>`).join("");
  sheet(`<div class="row"><h3>문항 목록</h3><span class="mute">${Object.keys(E.ans).length}/${E.ids.length} 답함</span><span class="sp"></span><button class="iconbtn" data-act="shade" aria-label="닫기">✕</button></div><div class="qnav">${nav}</div><button class="btn pri" style="width:100%" data-act="esubmit">제출하기</button>
  <div class="row" style="margin-top:10px"><button class="btn" data-act="erestart">처음부터 다시</button><span class="sp"></span><span class="mute">글자</span><button class="btn" data-act="fs-">가−</button><button class="btn" data-act="fs+">가+</button></div>`);
}
async function submitExam(force) {
  if (!E || E.done) return;
  if (!force) {
    const un = E.ids.length - Object.keys(E.ans).length;
    const ok = await confirmBox("제출할까요?", un ? `안 푼 문제가 ${un}개 있습니다.` : "모든 문제에 답했습니다.", "제출");
    if (!ok) return;
  }
  closeSheet();
  E.done = true;
  clearInterval(E.timer);
  const sec = Math.min((Date.now() - E.start) / 1000, E.min * 60);
  let ok = 0;
  const bySub = {};
  E.ids.forEach((id) => {
    const q = BY_ID[id];
    const good = E.ans[id] === q.answer;
    if (good) ok++;
    const b = (bySub[q.subject] = bySub[q.subject] || { c: 0, t: 0 });
    b.t++;
    if (good) b.c++;
    record(id, good);
  });
  DB.hist.push({ ts: Date.now(), title: E.title, total: E.ids.length, correct: ok, sec });
  DB.hist = DB.hist.slice(-50);
  E.ok = ok;
  E.bySub = bySub;
  E.sec = sec;
  save();
  view = "exam";
  renderResult(false);
}
function renderResult(onlyWrong) {
  document.body.classList.remove("sess");
  const score = pct(E.ok, E.ids.length);
  const sub = Object.entries(E.bySub).map(([s, b]) => `<tr><td>${h(s)}</td><td>${b.c}/${b.t}</td><td>${pct(b.c, b.t)}점</td></tr>`).join("");
  const items = E.ids
    .map((id, i) => ({ q: BY_ID[id], i }))
    .filter(({ q }) => !onlyWrong || E.ans[q.id] !== q.answer)
    .map(({ q, i }) => {
      const a = E.ans[q.id];
      const good = a === q.answer;
      const opts = q.choices.map((c, k) => `<div class="opt ${k + 1 === q.answer ? "ok" : k + 1 === a ? "bad" : ""}" style="cursor:default"><span class="n">${MARKS[k]}</span><span>${h(c)}</span></div>`).join("");
      return `<div class="card"><div class="row">${chips(q)}<span class="sp"></span><b class="verdict ${good ? "ok" : "bad"}">${i + 1}번 ${good ? "정답" : a === undefined ? "미응답" : "오답"}</b>${star(q)}</div><div class="q">${h(q.q)}</div>${opts}${explainBox(q)}</div>`;
    })
    .join("");
  $().innerHTML = `<h1>${h(E.title)} 결과</h1>
  <div class="card"><div class="score">${score}점</div><p>${E.ok} / ${E.ids.length} 정답 · 소요 ${fmtTime(E.sec)} · <b class="verdict ${score >= 60 ? "ok" : "bad"}">${score >= 60 ? "합격선(60점) 이상" : "합격선(60점) 미만"}</b></p>
  <table class="t"><tr><th>과목</th><th>정답</th><th>점수</th></tr>${sub}</table></div>
  <div class="row"><button class="btn ${onlyWrong ? "" : "pri"}" data-act="rall">전체 해설</button><button class="btn ${onlyWrong ? "pri" : ""}" data-act="rwrong">틀린 문항만</button><button class="btn" data-act="eretry">같은 시험 다시 풀기</button><button class="btn" data-act="newexam">다른 시험</button></div>
  ${items || '<div class="empty">틀린 문제가 없습니다.</div>'}`;
  setBar("");
}

/* ---------- 이론 ---------- */
let BY_K = {};
const md = (s) => h(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
function theory() {
  if (!THEORY.length) {
    $().innerHTML = `<h1>이론</h1><div class="card empty">이론 정리를 준비하고 있습니다.</div>`;
    return;
  }
  if (tArea == null || !THEORY[tArea]) {
    const cards = THEORY.map((a, i) => {
      const n = a.chapters.reduce((s, c) => s + c.sections.length, 0);
      const qn = new Set(a.chapters.flatMap((c) => c.sections.flatMap((s) => s.keys)).filter((k) => BY_K[k])).size;
      return `<button class="tile" data-act="tarea" data-i="${i}"><h3>${h(a.area)}</h3><span class="mute">${h(a.intro || "")}</span><div class="mute" style="margin-top:6px">${a.chapters.length}장 · ${n}절 · 관련 문제 ${qn}개</div></button>`;
    }).join("");
    $().innerHTML = `<h1>이론</h1><p class="mute">기출·원본 문제를 풀 수 있도록 영역별로 정리한 핵심 이론입니다. 각 절 아래 버튼으로 그 절의 문제를 바로 풀 수 있습니다.</p><div class="grid two">${cards}</div>`;
    return;
  }
  const a = THEORY[tArea];
  const chs = a.chapters
    .map(
      (c, ci) => `<details class="card tch"${ci === 0 ? " open" : ""}><summary><b>${ci + 1}. ${h(c.title)}</b> <span class="mute">${c.sections.length}절</span></summary>
      ${c.sections
        .map((s, si) => {
          const n = new Set(s.keys.filter((k) => BY_K[k])).size;
          return `<div class="tsec"><h3>${h(s.title)}</h3><ul>${s.points.map((p) => `<li>${md(p)}</li>`).join("")}</ul>${n ? `<button class="btn" data-act="tsec" data-a="${tArea}" data-c="${ci}" data-s="${si}">이 절 문제 ${n}개 풀기</button>` : ""}</div>`;
        })
        .join("")}</details>`
    )
    .join("");
  $().innerHTML = `<div class="row"><button class="btn" data-act="tback">← 영역 목록</button></div><h1>${h(a.area)}</h1><p class="mute">${h(a.intro || "")}</p>${chs}`;
}

/* ---------- 해설 보기 ---------- */
function browse() {
  const list = applyFilter(BF);
  const per = 30;
  const pages = Math.max(1, Math.ceil(list.length / per));
  bpage = Math.min(bpage, pages - 1);
  const rows = list
    .slice(bpage * per, bpage * per + per)
    .map((q) => {
      const ans = isCard(q) ? h(q.a) : `${MARKS[q.answer - 1]} ${h(q.choices[q.answer - 1])}`;
      const opts = isCard(q) ? "" : q.choices.map((c, i) => `<div style="padding:2px 0;${i + 1 === q.answer ? "font-weight:700;color:var(--ok)" : ""}">${MARKS[i]} ${h(c)}</div>`).join("");
      return `<details class="item"><summary>${h(q.q.length > 80 ? q.q.slice(0, 80) + "…" : q.q)} <span class="mute">[${h(q.exam)}${q.no ? " " + q.no + "번" : ""}]</span></summary>
      <div style="padding:10px 2px">${chips(q)}<div class="q">${h(q.q)}</div>${opts}<div class="verdict ok">정답: ${ans}</div>${explainBox(q)}${star(q)}</div></details>`;
    })
    .join("");
  $().innerHTML = `<h1>${view === "bookmarks" ? "저장한 북마크" : "문제·해설 검색"}</h1><p class="mute">키워드나 출처로 찾고, 문제를 눌러 정답과 해설을 확인하세요.</p>${filterForm(BF, { noOrder: true, noN: true, lockOnly: view === "bookmarks" })}
  <div class="row" style="margin-bottom:6px"><button class="btn" data-act="bprev" ${bpage === 0 ? "disabled" : ""}>이전</button><span class="sp mute" style="text-align:center">${bpage + 1} / ${pages} 쪽</span><button class="btn" data-act="bnext" ${bpage >= pages - 1 ? "disabled" : ""}>다음</button></div>
  <div class="card">${rows || '<div class="empty">조건에 맞는 문제가 없습니다.</div>'}</div>`;
  wireFilter(BF, () => {
    bpage = 0;
    browse();
  });
  const search = $().querySelector('[data-f="text"]');
  let searchTimer;
  search.addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    if (e.isComposing) return;
    searchTimer = setTimeout(() => {
      if (!search.isConnected) return;
      const pos = search.selectionStart;
      bpage = 0;
      browse();
      const next = $().querySelector('[data-f="text"]');
      next.focus({ preventScroll: true });
      next.setSelectionRange(pos, pos);
    }, 250);
  });
}

/* ---------- 이벤트 ---------- */
document.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-act]");
  if (!t) return;
  const act = t.dataset.act;
  const id = t.dataset.id;
  if (act === "go") {
    if (document.getElementById("modal").innerHTML) closeSheet();
    if (t.classList.contains("hero-link")) {
      if (P && !(await confirmBox("학습 조건을 다시 고를까요?", "현재 이어풀기는 종료되며, 이미 푼 기록은 유지됩니다.", "조건 고르기"))) return;
      P = null;
      save();
    }
    go(t.dataset.v);
  }
  else if (act === "quick-start") {
    if (P) go(viewOfP());
    else {
      Object.assign(PF, defaultFilter(), { type: "mcq", order: "rand", n: 20 });
      startPractice("mcq");
    }
  } else if (act === "subject-start") {
    if (P && !(await confirmBox("새 학습을 시작할까요?", "현재 이어풀기는 새 과목으로 바뀌며, 이미 푼 기록은 유지됩니다.", "과목 선택"))) return;
    P = null;
    save();
    go("practice");
    practiceSetup("mcq", { subject: t.dataset.s });
  } else if (act === "bookmarks") {
    bpage = 0;
    go("bookmarks");
  }
  else if (act === "fs+") setFs(DB.fs + 2);
  else if (act === "fs-") setFs(DB.fs - 2);
  else if (act === "reading") {
    DB.reading = DB.reading === "flow" ? "compact" : "flow";
    fit(true);
    save();
    t.setAttribute("aria-pressed", String(DB.reading === "flow"));
    toast(DB.reading === "flow" ? "전체 내용을 펼쳐서 읽습니다" : "문제와 해설을 한 화면에 모아 봅니다");
  }
  else if (act === "bm") {
    if (DB.bm[id]) delete DB.bm[id];
    else DB.bm[id] = 1;
    save();
    t.classList.toggle("on", !!DB.bm[id]);
    t.setAttribute("aria-pressed", String(!!DB.bm[id]));
    t.textContent = DB.bm[id] ? "★" : "☆";
  } else if (act === "subj") {
    const mode = { practice: "mcq", cards: "card", wrong: "wrong" }[view] || "mcq";
    practiceSetup(mode, Object.assign({}, PF, { subject: t.dataset.s }));
  } else if (act === "pmenu") {
    const canSwitch = MODE[P.mode];
    sheet(`${canSwitch ? `<h3>다른 분야로 바꾸기</h3><p class="mute">고르면 그 분야를 처음부터 새로 시작합니다.</p>${pills(P.pf && P.pf.subject, "pswitch")}` : `<h3>${h(P.title || "이론 단원 문제")}</h3>`}
    <div class="row" style="margin-top:14px"><button class="btn" data-act="prestart">이 세트 처음부터 다시</button>${canSwitch ? '<button class="btn" data-act="psetup">조건 다시 고르기</button>' : ""}</div>
    <div class="fsrow"><span class="mute">글자 크기</span><button class="btn" data-act="fs-">가−</button><button class="btn" data-act="fs+">가+</button></div>
    <button class="btn" style="width:100%;margin-top:10px" data-act="pquit">학습 마치기</button>
    <button class="btn" style="width:100%;margin-top:10px" data-act="shade">닫기</button>`);
  } else if (act === "pswitch") {
    Object.assign(PF, P.pf || {}, { subject: t.dataset.s });
    closeSheet();
    startPractice(P.mode);
  } else if (act === "prestart") {
    if (P.pf && P.pf.order === "rand") P.ids = shuffle(P.ids);
    Object.assign(P, { i: 0, ans: {}, show: {}, ok: 0, done: 0 });
    closeSheet();
    save();
    renderPractice();
    window.scrollTo(0, 0);
  } else if (act === "psetup") {
    const v = viewOfP();
    P = null;
    closeSheet();
    save();
    go(v);
  } else if (act === "pstart") startPractice(t.dataset.m);
  else if (act === "tarea") {
    tArea = +t.dataset.i;
    theory();
    window.scrollTo(0, 0);
  } else if (act === "tback") {
    tArea = null;
    theory();
  } else if (act === "tsec") {
    const sec = THEORY[+t.dataset.a].chapters[+t.dataset.c].sections[+t.dataset.s];
    const ids = uniq(sec.keys.map((k) => BY_K[k]).filter(Boolean));
    if (!ids.length) return toast("이 단원에 연결된 문제가 없습니다");
    startIds(ids, "theory", null, sec.title);
  }
  else if (act === "pick") pick(+t.dataset.i);
  else if (act === "pnext") pnext();
  else if (act === "pprev") pprev();
  else if (act === "pquit") {
    if (await confirmBox("그만할까요?", "지금까지 푼 기록은 저장됩니다.", "그만하기")) practiceEnd();
  } else if (act === "cardshow") {
    P.show[P.ids[P.i]] = true;
    save();
    renderPractice();
    $().querySelector(".answer-title")?.focus({ preventScroll: true });
  } else if (act === "cardok") {
    const q = BY_ID[P.ids[P.i]];
    const ok = t.dataset.v === "1";
    P.ans[q.id] = ok ? 1 : 0;
    P.done++;
    if (ok) P.ok++;
    record(q.id, ok);
    save();
    renderPractice();
  } else if (act === "estart") startExam(BANK.filter((q) => q.exam === t.dataset.name && !isCard(q)).map((q) => q.id), t.dataset.name);
  else if (act === "erandom") {
    if (![EF.nR, EF.nA, EF.nT].every((n) => Number.isInteger(n) && n >= 0 && n <= 60) || !Number.isInteger(EF.min) || EF.min < 5 || EF.min > 180) return toast("문항 수는 0~60개, 제한시간은 5~180분으로 입력해 주세요.");
    if (EF.nR + EF.nA + EF.nT === 0) return toast("한 과목 이상에서 문항 수를 선택해 주세요.");
    const pool = BANK.filter((q) => !isCard(q) && (!EF.sure || q.conf !== "추정"));
    const pickN = (s, n) => shuffle(pool.filter((q) => q.subject === s)).slice(0, n).map((q) => q.id);
    startExam([...pickN("규정", EF.nR), ...pickN("안전", EF.nA), ...pickN("기술", EF.nT)], "랜덤 모의고사", EF.min);
  } else if (act === "epick") {
    const q = BY_ID[E.ids[E.i]];
    if (E.ans[q.id] === +t.dataset.i) delete E.ans[q.id];
    else E.ans[q.id] = +t.dataset.i;
    save();
    renderExam();
  } else if (act === "elist") examList();
  else if (act === "egoto") {
    E.i = +t.dataset.i;
    closeSheet();
    save();
    renderExam();
  } else if (act === "eprev" && E.i > 0) {
    E.i--;
    save();
    renderExam();
    window.scrollTo(0, 0);
  } else if (act === "enext" && E.i < E.ids.length - 1) {
    E.i++;
    save();
    renderExam();
    window.scrollTo(0, 0);
  } else if (act === "esubmit") submitExam(false);
  else if (act === "erestart") {
    if (await confirmBox("처음부터 다시 풀까요?", "지금까지 고른 답과 남은 시간이 처음으로 돌아갑니다.", "처음부터")) {
      Object.assign(E, { ans: {}, i: 0, start: Date.now(), end: Date.now() + E.min * 60000 });
      closeSheet();
      save();
      renderExam();
    }
  } else if (act === "eretry") {
    startExam(E.ids.slice(), E.title, E.min);
  } else if (act === "pagain") {
    if (LASTP) {
      startIds(shuffle(LASTP.ids), LASTP.mode, LASTP.pf, LASTP.title);
    }
  }
  else if (act === "rall") renderResult(false);
  else if (act === "rwrong") renderResult(true);
  else if (act === "newexam") {
    E = null;
    save();
    go("exam");
  } else if (act === "bprev") {
    bpage--;
    browse();
  } else if (act === "bnext") {
    bpage++;
    browse();
    window.scrollTo(0, 0);
  } else if (act === "shade") {
    if (!e.target.closest(".sheet") || t.tagName === "BUTTON") closeSheet();
  } else if (act === "resetall") {
    if (await confirmBox("기록을 모두 지울까요?", "푼 문제, 오답, 북마크, 시험 기록이 삭제됩니다.", "지우기")) {
      DB.stats = {};
      DB.bm = {};
      DB.hist = [];
      P = null;
      E = null;
      save();
      go("home");
    }
  }
});
function updateExamField(e) {
  const k = e.target.dataset.e;
  if (!k) return;
  EF[k] = e.target.type === "checkbox" ? e.target.checked : +e.target.value;
}
root.addEventListener("change", updateExamField);
root.addEventListener("input", updateExamField);
/* 좌우 스와이프로 이전/다음 */
let tx = 0,
  ty = 0;
root.addEventListener(
  "touchstart",
  (e) => {
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
  },
  { passive: true }
);
root.addEventListener(
  "touchend",
  (e) => {
    const dx = e.changedTouches[0].clientX - tx,
      dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) < 70 || Math.abs(dy) > 50 || document.getElementById("modal").innerHTML) return;
    if (P && view === viewOfP()) (dx < 0 ? pnext() : pprev());
    else if (view === "exam" && E && !E.done) {
      if (dx < 0 && E.i < E.ids.length - 1) E.i++;
      else if (dx > 0 && E.i > 0) E.i--;
      else return;
      save();
      renderExam();
      window.scrollTo(0, 0);
    }
  },
  { passive: true }
);
document.addEventListener("keydown", (e) => {
  const modal = document.getElementById("modal");
  if (modal.innerHTML) {
    if (e.key === "Escape") {
      e.preventDefault();
      const cancel = modal.querySelector('[data-act="no"]');
      if (cancel) cancel.click();
      else closeSheet();
    } else if (e.key === "Tab") {
      const focusable = [...modal.querySelectorAll('button:not([disabled]), input, select, [tabindex="0"]')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    return;
  }
  if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (P && view === viewOfP() && isCard(BY_ID[P.ids[P.i]])) {
    const q = BY_ID[P.ids[P.i]];
    if ((e.key === " " || e.key === "Enter") && !/BUTTON|SUMMARY|A/.test(document.activeElement.tagName)) {
      e.preventDefault();
      document.querySelector('[data-act="cardshow"]')?.click();
      return;
    }
    if ((e.key === "1" || e.key === "2") && P.show[q.id] && P.ans[q.id] === undefined) {
      e.preventDefault();
      document.querySelector(`[data-act="cardok"][data-v="${e.key === "1" ? "0" : "1"}"]`)?.click();
      return;
    }
    if (e.key === "ArrowRight" && P.ans[q.id] === undefined) {
      e.preventDefault();
      toast("정답을 확인하고 1(몰랐다) 또는 2(알았다)로 기록해 주세요.");
      return;
    }
  }
  if (e.key === "Enter" || e.key === " ") return;
  if (["ArrowLeft", "ArrowRight"].includes(e.key) && ((P && view === viewOfP()) || (view === "exam" && E && !E.done))) e.preventDefault();
  if (P && view === viewOfP()) {
    if (e.key >= "1" && e.key <= "5") pick(+e.key);
    else if (e.key === "ArrowRight") pnext();
    else if (e.key === "ArrowLeft") pprev();
  } else if (view === "exam" && E && !E.done) {
    const q = BY_ID[E.ids[E.i]];
    if (e.key >= "1" && e.key <= "5" && +e.key <= q.choices.length) {
      E.ans[q.id] = +e.key;
      save();
      renderExam();
    } else if (e.key === "ArrowRight" && E.i < E.ids.length - 1) {
      E.i++;
      save();
      renderExam();
    } else if (e.key === "ArrowLeft" && E.i > 0) {
      E.i--;
      save();
      renderExam();
    }
  }
});

/* ---------- 시작: 평문 데이터 또는 비밀번호 잠금 해제 ---------- */
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function decrypt(pw) {
  const enc = window.ENC;
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(enc.s), iterations: enc.i, hash: "SHA-256" }, km, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(enc.n) }, key, b64(enc.c));
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
}
function start(data) {
  const bank = Array.isArray(data) ? data : data.bank;
  THEORY = (Array.isArray(data) ? window.THEORY : data.theory) || [];
  BANK = bank;
  BY_ID = Object.fromEntries(bank.map((q) => [q.id, q]));
  BY_K = Object.fromEntries(bank.filter((q) => q.k).map((q) => [q.k, q.id]));
  if (DB.sess && DB.sess.P && !DB.sess.P.mode) DB.sess.P.mode = DB.sess.P.fromWrong ? "wrong" : "mcq";
  // 이어 풀기 / 이어 보던 시험 복원
  const s = DB.sess || {};
  if (s.P && s.P.ids && s.P.ids.every((i) => BY_ID[i])) P = s.P;
  if (s.E && s.E.ids && !s.E.done && s.E.ids.every((i) => BY_ID[i])) {
    E = s.E;
    runTimer();
  }
  document.documentElement.style.setProperty("--fs", DB.fs + "px");
  shell();
  view = "home";
  render();
}
function lockScreen() {
  // Remove passwords remembered by older versions; unlock lasts only for this page.
  try { localStorage.removeItem("gisa-pw"); } catch (e) {}
  root.innerHTML = `<div class="lock card"><div class="tile-icon">${icon("train")}</div><h1>기관사 공부방</h1><p class="mute">누구나 방문할 수 있는 공부방입니다.<br>문제 풀이를 시작하려면 공용 비밀번호를 입력해 주세요.</p>
  <form id="lf"><label class="f" style="text-align:left">입장 비밀번호<input id="pw" type="password" autocomplete="off" required autofocus></label>
  <div class="err" id="err" role="alert"></div><button class="btn pri" style="width:100%" id="unlock" type="submit">공부방 입장</button></form><p class="mute">새로고침하거나 다시 방문하면 비밀번호를 다시 입력합니다.</p></div>`;
  document.getElementById("lf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = document.getElementById("unlock"), field = document.getElementById("pw"), error = document.getElementById("err");
    if (button.disabled) return;
    error.textContent = "";
    if (!window.crypto?.subtle || typeof DecompressionStream === "undefined") {
      error.textContent = "최신 Chrome, Edge, Safari 또는 Firefox에서 HTTPS 주소로 접속해 주세요.";
      return;
    }
    button.disabled = true;
    button.textContent = "비밀번호 확인 중…";
    try {
      const data = await decrypt(field.value);
      field.value = "";
      start(data);
    } catch (errorDetail) {
      error.textContent = "비밀번호가 맞지 않거나 데이터를 열 수 없습니다. 다시 확인해 주세요.";
      button.disabled = false;
      button.textContent = "공부방 입장";
      field.value = "";
      field.focus();
    }
  });
}
(function boot() {
  const t = document.createElement("div");
  t.id = "toast";
  t.setAttribute("role", "status");
  t.hidden = true;
  const m = document.createElement("div");
  m.id = "modal";
  document.body.append(t, m);
  if (window.ENC) lockScreen();
  else if (window.BANK && window.BANK.length) start(window.BANK);
  else root.innerHTML = '<div class="lock card"><h1>문제를 불러오지 못했어요</h1><p class="mute">페이지를 새로고침해 주세요. 계속되면 사이트 관리자에게 알려주세요.</p><button class="btn pri" onclick="location.reload()">다시 불러오기</button></div>';
})();
