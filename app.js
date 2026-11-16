"use strict";
/* 기관사 공부방 — PC와 모바일에서 읽기 편한 집중 풀이
   고르고 → 풀고 → 다시 푸는 흐름. 긴 원문은 글자를 줄이지 않고 스크롤한다.
   데이터: window.BANK(평문) 또는 window.ENC(비밀번호로 암호화, 열 때 복호화) */

let BANK = [];
let THEORY = [];
let BY_ID = {};
const MARKS = ["①", "②", "③", "④", "⑤"];
const root = document.getElementById("root");
const GROUPS = [
  ["past", "기출"],
  ["books", "이론"],
  ["rule", "규정 300"],
  ["safe", "안전 100"],
  ["short", "주관식"],
];

/* ---------- 저장 (localStorage는 막혀 있을 수 있어 항상 try/catch) ---------- */
const KEY = "gisa-study.v3";
let DB = { pick: { grp: "past", sub: "", subj: "", n: 20, rand: true }, sess: null, fs: 16 };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) DB = Object.assign(DB, JSON.parse(raw));
} catch (e) {}
function save() {
  try {
    DB.sess = S;
    localStorage.setItem(KEY, JSON.stringify(DB));
  } catch (e) {}
}

/* ---------- 유틸 ---------- */
const h = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const md = (s) => h(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
const isShort = (q) => q.type === "short";
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const uniq = (a) => [...new Set(a)];
function icon(name) {
  const paths = {
    train: '<rect x="5" y="3" width="14" height="15" rx="4"/><path d="M5 11h14M12 3v8M8 18l-2 3m10-3 2 3M8 15h1m6 0h1"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    back: '<path d="m14 6-6 6 6 6"/>',
    book: '<path d="M12 5v15M3 4c4-1 6 0 9 1 3-1 5-2 9-1v15c-4-1-6 0-9 1-3-1-5-2-9-1Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
}
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 1800);
}
let sheetTrigger = null;
function sheet(html) {
  if (!document.getElementById("modal").innerHTML) sheetTrigger = document.activeElement;
  document.getElementById("modal").innerHTML = `<div class="shade" data-act="close"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">${html.replace("<h3>", '<h3 id="sheet-title">')}</div></div>`;
  document.querySelector(".sheet button, .sheet select, .sheet input")?.focus();
}
function closeSheet() {
  const m = document.getElementById("modal");
  if (m && m.innerHTML) {
    m.innerHTML = "";
    if (sheetTrigger && sheetTrigger.isConnected) sheetTrigger.focus({ preventScroll: true });
    sheetTrigger = null;
  }
}

/* ---------- 문제 고르기 ---------- */
function subsOf(grp) {
  return uniq(BANK.filter((q) => q.grp === grp).map((q) => q.sub));
}
function poolOf(p) {
  let list = BANK.filter((q) => q.grp === p.grp);
  if (p.sub) list = list.filter((q) => q.sub === p.sub);
  if (p.subj) list = list.filter((q) => q.subject === p.subj);
  return list;
}

/* ---------- 화면: home | solve | end | theory ---------- */
let view = "home";
let S = null; // 풀이 세션 {ids, i, ans, title}
let T = { a: 0, c: 0, s: 0, p: 0 }; // 이론 위치
function go(v) {
  view = v;
  render();
}
function render() {
  closeSheet();
  if (view === "solve" && S) solve();
  else if (view === "end" && S) end();
  else if (view === "theory") theory();
  else home();
  fit();
}
/* 사용자 글자 크기를 유지한다. 긴 원문과 해설은 stage 안에서 끝까지 읽는다. */
/* 모바일 세로 풀이 화면은 스크롤 없이 한 화면에 맞춘다: 여백 줄이기 → 글자 줄이기 → 해설 두 줄로 접기(크게 보기로 전체 확인) */
function fit() {
  const el = document.documentElement;
  el.style.setProperty("--fit", 1);
  const st = document.querySelector(".stage.solve");
  if (!st || !st.classList || typeof window.matchMedia !== "function" || !window.matchMedia("(max-width:760px)").matches) return;
  st.classList.remove("tight", "clip", "max");
  const over = () => st.scrollHeight > st.clientHeight + 1;
  if (!over()) return;
  st.classList.add("tight");
  let f = 1;
  while (over() && f > 0.8) {
    f = Math.round((f - 0.04) * 100) / 100;
    el.style.setProperty("--fit", f);
  }
  if (over()) st.classList.add("clip");
  while (over() && f > 0.66) {
    f = Math.round((f - 0.04) * 100) / 100;
    el.style.setProperty("--fit", f);
  }
  if (over()) st.classList.add("max");
}

/* ---------- 홈 ---------- */
function seg(name, cur, opts) {
  const label = { grp: "문제 유형", subj: "과목", n: "문제 수", rand: "문제 순서" }[name];
  return `<div class="seg seg-${name}" role="group" aria-label="${label}">${opts.map(([v, l]) => `<button class="${String(cur) === String(v) ? "on" : ""}" aria-pressed="${String(cur) === String(v)}" data-act="set" data-k="${name}" data-v="${h(v)}">${h(l)}</button>`).join("")}</div>`;
}
function home() {
  const p = DB.pick;
  if (!GROUPS.some((g) => g[0] === p.grp)) p.grp = "past";
  const subs = subsOf(p.grp);
  if (p.sub && !subs.includes(p.sub)) p.sub = "";
  const subjects = uniq(BANK.filter((q) => q.grp === p.grp && (!p.sub || q.sub === p.sub)).map((q) => q.subject));
  if (p.subj && !subjects.includes(p.subj)) p.subj = "";
  const pool = poolOf(p);
  const n = p.n ? Math.min(p.n, pool.length) : pool.length;
  const resume = S ? `<button class="resume" data-act="resume"><span class="resume-copy"><b>이어서 풀기</b><small>${h(S.title)} · ${Math.min(S.i + 1, S.ids.length)} / ${S.ids.length}</small></span>${icon("arrow")}</button>` : "";
  root.innerHTML = `<div class="app app-home">
  <header class="bar"><a class="brand" href="#" data-act="home">${icon("train")}<span>기관사 <b>공부방</b></span></a><button class="link" data-act="theory" ${THEORY.length ? "" : "hidden"}>${icon("book")}이론 보기</button>${window.ENC && savedPw() ? `<button class="link" data-act="lock" aria-label="저장된 비밀번호 지우고 잠그기">${icon("lock")}잠그기</button>` : ""}</header>
  <main id="app" tabindex="-1" class="stage home">
    ${resume}
    <section class="setup-card"><h2>문제 선택</h2>${seg("grp", p.grp, GROUPS)}
      <div class="selection-row"><label for="sub-select">${p.grp === "past" ? "시험 회차" : p.grp === "books" ? "자료 선택" : p.grp === "short" ? "학습 범위" : "난이도"}</label><select id="sub-select" data-pick="sub">${[["", "전체"]].concat(subs.map((s) => [s, s])).map(([v, l]) => `<option value="${h(v)}" ${p.sub === v ? "selected" : ""}>${h(l)}</option>`).join("")}</select></div>
      ${subjects.length > 1 ? `<div class="subject-pick"><p class="field-label">과목</p>${seg("subj", p.subj, [["", "전 과목"]].concat(subjects.map((s) => [s, s])))}</div>` : ""}
    </section>
    <section class="setup-card"><h2>풀이 설정</h2><div class="session-settings"><div><p class="field-label">문제 수</p>${seg("n", p.n, [[10, "10문제"], [20, "20문제"], [50, "50문제"], [0, "전체"]])}</div><div><p class="field-label">문제 순서</p>${seg("rand", p.rand ? 1 : 0, [[0, "차례로"], [1, "섞어서"]])}</div></div></section>
  </main><footer class="home-foot"><p class="selection-summary">${h(p.sub || GROUPS.find((g) => g[0] === p.grp)[1])}${p.subj ? " · " + h(p.subj) : ""}<span>선택 가능한 문제 ${pool.length}개</span></p><button class="go" data-act="start" ${n ? "" : "disabled"}>${n ? `${n}문제 풀기` : "해당 문제가 없습니다"}${icon("arrow")}</button></footer></div>`;
}
function startSet(ids, title) {
  if (!ids.length) return toast("풀 문제가 없습니다");
  S = { ids, i: 0, ans: {}, title };
  save();
  go("solve");
}
function startPick() {
  const p = DB.pick;
  let list = poolOf(p);
  if (p.rand) list = shuffle(list);
  if (p.n) list = list.slice(0, p.n);
  const g = GROUPS.find((x) => x[0] === p.grp)[1];
  startSet(list.map((q) => q.id), [g, p.sub, p.subj].filter(Boolean).join(" · "));
}

/* ---------- 교재 원문: 답 확인 후, 필요한 페이지만 불러온다 ---------- */
const textbookImages = new Map();
function textbookHtml(q) {
  if (!q.textbook?.length) return "";
  return `<section class="textbook-evidence" aria-label="교재 근거"><h3>교재 근거</h3>${q.textbook.map((ref, i) => `<article class="book-ref"><p class="book-citation">${h(ref.book)} <b>${ref.page}쪽</b><small>PDF ${ref.pdfPage}쪽</small></p>${ref.summary ? `<p class="book-summary">${h(ref.summary)}</p>` : ""}<button class="text-link" data-act="textbook" data-q="${h(q.id)}" data-i="${i}" aria-expanded="false">교재 원문 보기 ${icon("book")}</button><div class="book-preview" hidden></div></article>`).join("")}</section>`;
}
async function textbookImage(ref) {
  if (!/^(system|diesel)-\d{3}$/.test(ref.asset)) throw new Error("Invalid textbook asset");
  if (!window.ENC) return `./data/textbook/pages/${ref.asset}.webp`;
  if (!textbookKey) throw new Error("Locked");
  if (textbookImages.has(ref.asset)) return textbookImages.get(ref.asset);
  const pending = (async () => {
    const response = await fetch(`./textbook/${ref.asset}.enc?v=${encodeURIComponent(window.ENC.n)}`);
    if (!response.ok) throw new Error("Textbook unavailable");
    const bytes = new Uint8Array(await response.arrayBuffer());
    const decoded = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12), additionalData: new TextEncoder().encode(ref.asset) }, textbookKey, bytes.slice(12));
    return URL.createObjectURL(new Blob([decoded], { type: "image/webp" }));
  })();
  textbookImages.set(ref.asset, pending);
  try {
    const url = await pending;
    // 오래 학습해도 교재 이미지 전체가 메모리에 쌓이지 않도록 제한한다.
    while (textbookImages.size > 8) {
      const oldest = textbookImages.keys().next().value;
      textbookImages.get(oldest).then((value) => URL.revokeObjectURL(value), () => {});
      textbookImages.delete(oldest);
    }
    return url;
  } catch (error) {
    textbookImages.delete(ref.asset);
    throw error;
  }
}
function textbookFigure(ref, url, full = false) {
  const [lo, hi] = full ? [0, 1] : ref.crop;
  const span = hi - lo;
  const marks = (ref.marks || []).map(([x, y, w, height]) => `<span class="book-highlight" style="left:${x * 100}%;top:${(y - lo) / span * 100}%;width:${w * 100}%;height:${height / span * 100}%"></span>`).join("");
  return `<div class="book-image ${full ? "book-full" : "book-crop"}" style="aspect-ratio:${ref.width}/${ref.height * span}"><img src="${h(url)}" alt="${h(ref.book)} ${ref.page}쪽 원문" style="top:${-lo / span * 100}%;height:${100 / span}%" decoding="async">${marks}</div>`;
}
async function openTextbook(button) {
  const q = BY_ID[button.dataset.q], index = +button.dataset.i;
  const ref = q?.textbook?.[index];
  if (!ref || !S || S.ans[q.id] === undefined) return;
  const preview = button.closest(".book-ref").querySelector(".book-preview");
  if (!preview.hidden) {
    preview.hidden = true;
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = `교재 원문 보기 ${icon("book")}`;
    return;
  }
  preview.hidden = false;
  preview.innerHTML = '<p class="hint" role="status">교재를 불러오는 중…</p>';
  button.disabled = true;
  button.setAttribute("aria-expanded", "true");
  try {
    const url = await textbookImage(ref);
    if (!preview.isConnected) return;
    preview.innerHTML = `${textbookFigure(ref, url)}<button class="text-link" data-act="textbook-full" data-q="${h(q.id)}" data-i="${index}">페이지 전체 · 확대</button>`;
    button.innerHTML = "교재 접기";
  } catch (error) {
    if (preview.isConnected) {
      preview.innerHTML = '<p class="hint" role="alert">교재를 불러오지 못했습니다. 연결을 확인한 뒤 다시 열어 주세요.</p>';
      button.innerHTML = "교재 닫기 · 다시 시도";
    }
  } finally {
    button.disabled = false;
  }
}
async function fullTextbook(button) {
  const q = BY_ID[button.dataset.q], ref = q?.textbook?.[+button.dataset.i];
  if (!ref || !S || S.ans[q.id] === undefined) return;
  try {
    const url = await textbookImage(ref);
    if (!button.isConnected) return;
    sheet(`<h3>${h(ref.book)} · ${ref.page}쪽</h3><div class="book-toolbar"><span class="hint">PDF ${ref.pdfPage}쪽</span><button class="text-link" data-act="book-zoom" aria-pressed="false">확대</button><button class="btn" data-act="close">닫기</button></div><div class="book-page-scroll" tabindex="0" aria-label="교재 원문 스크롤">${textbookFigure(ref, url, true)}</div>`);
    document.querySelector(".sheet")?.classList.add("textbook-sheet");
  } catch (error) { toast("교재를 다시 열어 주세요."); }
}

/* ---------- 풀이: 고르면 바로 정답·해설 ---------- */
function solve() {
  const q = BY_ID[S.ids[S.i]];
  const a = S.ans[q.id];
  const reveal = a !== undefined;
  const last = S.i === S.ids.length - 1;
  let body;
  if (isShort(q)) {
    body = `<div class="draft-answer"><label for="my-answer">내 답안 <span>선택 입력</span></label><textarea id="my-answer" rows="3" placeholder="떠오르는 답을 적고 정답과 비교해 보세요." ${reveal ? "readonly" : ""}>${h(S.drafts?.[q.id] || "")}</textarea><p class="hint">${reveal ? "내 답안과 모범답안을 비교해 보세요." : "직접 적거나, 머릿속으로 생각한 뒤 정답을 확인하세요."}</p></div>`;
  } else {
    body = `<div class="opts">${q.choices
      .map((c, i) => {
        const cls = reveal ? (i + 1 === q.answer ? "ok" : i + 1 === a ? "bad" : "") : "";
        const label = reveal ? (i + 1 === q.answer ? "정답" : i + 1 === a ? "내 선택" : "") : "";
        return `<button class="opt ${cls}" data-act="pick" data-i="${i + 1}" ${reveal ? "disabled" : ""}><span class="n">${MARKS[i]}</span><span class="option-text">${h(c)}</span>${label ? `<span class="option-tag">${label}</span>` : ""}</button>`;
      })
      .join("")}</div>`;
  }
  const answer = isShort(q) ? q.a : q.choices[q.answer - 1];
  const ex = reveal ? `<div class="answer-content"><p class="verdict ${isShort(q) || a === q.answer ? "ok" : "bad"}" tabindex="-1" role="status">${isShort(q) ? "모범답안을 확인하세요" : a === q.answer ? "정답입니다" : "오답 · 정답은 " + MARKS[q.answer - 1]}</p><div class="ansbox"><span class="answer-label">${isShort(q) ? "모범답안" : "정답 " + MARKS[q.answer - 1]}</span><p>${h(answer)}</p></div><div class="explain"><div class="explain-heading"><b>해설</b><button class="text-link" data-act="more">크게 보기 ${icon("arrow")}</button></div><p>${q.explain ? h(q.explain) : "해설이 없는 문제입니다."}</p></div>${q.src ? `<p class="source">근거 · ${h(q.src)}</p>` : ""}</div>` : `<div class="answer-placeholder">${icon("book")}<h2>정답과 해설</h2><p>${isShort(q) ? "답을 생각한 뒤 아래의<br>‘정답 보기’를 눌러 주세요." : "보기를 선택하면<br>정답과 해설이 여기에 나타납니다."}</p></div>`;
  const nextBtn = `<button class="btn pri wide" data-act="next">${last ? "학습 마치기" : "다음 문제"}${icon("arrow")}</button>`;
  const prevBtn = `<button class="btn" data-act="prev" ${S.i ? "" : "disabled"}>${icon("back")}이전</button>`;
  const foot = isShort(q) && !reveal ? `${prevBtn}<button class="btn pri wide" data-act="show">정답 보기 ${icon("check")}</button>` : `${prevBtn}${nextBtn}`;
  root.innerHTML = `<div class="app app-solve">
  <header class="bar"><button class="ic" data-act="home" aria-label="문제 선택 화면으로">${icon("back")}</button><div class="solve-title"><span>${h(S.title)}</span><b>문제 풀이</b></div>
    <button class="prog" data-act="list" aria-label="문항 목록, ${S.i + 1} / ${S.ids.length}">${icon("list")}<span>${S.i + 1} / ${S.ids.length}</span></button>
    <button class="ic font-trigger" data-act="font" aria-label="글자 크기">가<span>크기</span></button></header>
  <div class="progress-track" role="progressbar" aria-label="현재 문항 위치" aria-valuemin="1" aria-valuemax="${S.ids.length}" aria-valuenow="${S.i + 1}"><span style="width:${pct(S.i + 1, S.ids.length)}%"></span></div>
  <main id="app" tabindex="-1" class="stage solve"><div class="study-grid"><section class="question-card" aria-labelledby="question-title">
    <div class="question-meta"><span class="badge">${h(q.subject)}</span>${q.level ? `<span class="badge subtle">난도 ${h(q.level)}</span>` : ""}${q.conf === "추정" ? '<span class="badge caution">정답 추정</span>' : ""}<span class="meta">${h(q.exam)}${q.no ? " · " + q.no + "번" : ""}</span></div>
    <h1 class="q" id="question-title">${h(q.q)}</h1>${body}
  </section><aside class="answer-panel ${reveal ? "revealed" : ""}" aria-label="정답과 해설">${ex}${reveal ? textbookHtml(q) : ""}</aside></div></main>
  <footer class="foot"><span class="keyboard-hint">${isShort(q) ? "답을 적고 정답과 비교해 보세요" : "숫자 1–5로 선택 · 방향키로 이동"}</span><div class="foot-actions">${foot}</div></footer></div>`;
}
function pick(i) {
  const q = BY_ID[S.ids[S.i]];
  if (isShort(q) || S.ans[q.id] !== undefined || i > q.choices.length) return;
  S.ans[q.id] = i;
  save();
  render();
}
function move(d) {
  const n = S.i + d;
  if (n < 0) return;
  if (n >= S.ids.length) return go("end");
  S.i = n;
  save();
  render();
}

/* ---------- 끝: 바로 다시 풀 수 있게 ---------- */
function end() {
  root.innerHTML = `<div class="app">
  <header class="bar"><h1>${h(S.title)}</h1></header>
  <main id="app" tabindex="-1" class="stage end">
    <span class="end-mark">${icon("check")}</span><h1 class="done">학습을 마쳤어요.</h1>
    <button class="go" data-act="again">같은 문제 다시 풀기</button>
    <button class="go alt" data-act="fresh">같은 조건으로 새 문제</button>
    <button class="go alt" data-act="homeEnd">다른 문제 고르기</button>
  </main></div>`;
}

/* ---------- 이론 (요점 몇 개씩 넘겨 본다) ---------- */
const PER = 5;
function theory() {
  if (!THEORY.length) return home();
  const a = THEORY[T.a] || THEORY[(T.a = 0)];
  const c = a.chapters[T.c] || a.chapters[(T.c = 0)];
  const s = c.sections[T.s] || c.sections[(T.s = 0)];
  const pages = Math.max(1, Math.ceil(s.points.length / PER));
  T.p = Math.min(T.p, pages - 1);
  const opt = (list, cur, f) => list.map((x, i) => `<option value="${i}" ${i === cur ? "selected" : ""}>${h(f(x, i))}</option>`).join("");
  const ids = (s.keys || []).filter((k) => BY_ID[k]);
  root.innerHTML = `<div class="app">
  <header class="bar"><button class="ic" data-act="home" aria-label="홈으로">✕</button><h1>핵심 이론</h1><span class="stat">${T.p + 1}/${pages}</span></header>
  <main id="app" tabindex="-1" class="stage theory">
    <div class="sel3"><select data-t="a" aria-label="영역">${opt(THEORY, T.a, (x) => x.area)}</select><select data-t="c" aria-label="장">${opt(a.chapters, T.c, (x, i) => i + 1 + ". " + x.title)}</select><select data-t="s" aria-label="절">${opt(c.sections, T.s, (x) => x.title)}</select></div>
    <h2>${h(s.title)}</h2>
    <ul>${s.points.slice(T.p * PER, T.p * PER + PER).map((x) => `<li>${md(x)}</li>`).join("")}</ul>
    ${ids.length ? `<button class="chip on" data-act="tq">이 절 기출 ${ids.length}문제 풀기</button>` : ""}
  </main>
  <footer class="foot"><button class="btn" data-act="tprev">이전</button><button class="btn pri wide" data-act="tnext">다음</button></footer></div>`;
}
function tmove(d) {
  const a = THEORY[T.a], c = a.chapters[T.c], s = c.sections[T.s];
  const pages = Math.max(1, Math.ceil(s.points.length / PER));
  if (d > 0) {
    if (T.p < pages - 1) T.p++;
    else if (T.s < c.sections.length - 1) (T.s++, (T.p = 0));
    else if (T.c < a.chapters.length - 1) (T.c++, (T.s = 0), (T.p = 0));
    else return toast("이 영역의 마지막입니다");
  } else if (T.p > 0) T.p--;
  else if (T.s > 0) (T.s--, (T.p = 99));
  else if (T.c > 0) (T.c--, (T.s = a.chapters[T.c].sections.length - 1), (T.p = 99));
  else return toast("이 영역의 처음입니다");
  render();
}

/* ---------- 이벤트 ---------- */
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-act]");
  if (!t) return;
  const act = t.dataset.act;
  if (act === "close") {
    if (e.target === t || t.tagName === "BUTTON") closeSheet();
  } else if (act === "set") {
    const k = t.dataset.k, v = t.dataset.v;
    DB.pick[k] = k === "n" ? +v : k === "rand" ? v === "1" : v;
    if (k === "grp") (DB.pick.sub = ""), (DB.pick.subj = "");
    save();
    render();
    [...document.querySelectorAll('[data-act="set"]')].find((el) => el.dataset.k === k && el.dataset.v === v)?.focus({ preventScroll: true });
  } else if (act === "start" || act === "fresh") startPick();
  else if (act === "resume") go(S.i >= S.ids.length ? "end" : "solve");
  else if (act === "theory") go("theory");
  else if (act === "lock") lockApp();
  else if (act === "home") go("home");
  else if (act === "homeEnd") {
    S = null;
    save();
    go("home");
  } else if (act === "again") startSet(shuffle(S.ids), S.title);
  else if (act === "pick") pick(+t.dataset.i);
  else if (act === "next") move(1);
  else if (act === "prev") move(-1);
  else if (act === "show") {
    S.ans[S.ids[S.i]] = 1;
    save();
    render();
  } else if (act === "more") {
    const q = BY_ID[S.ids[S.i]];
    sheet(`<h3>해설</h3><p class="full">${q.explain ? h(q.explain) : "해설이 없는 문제입니다."}</p>${q.src ? `<p class="hint">근거: ${h(q.src)}</p>` : ""}${textbookHtml(q)}<button class="btn pri" data-act="close">닫기</button>`);
  } else if (act === "textbook") { openTextbook(t);
  } else if (act === "textbook-full") { fullTextbook(t);
  } else if (act === "book-zoom") {
    const page = document.querySelector(".textbook-sheet .book-full");
    const zoomed = page?.classList.toggle("zoomed");
    t.setAttribute("aria-pressed", String(!!zoomed));
    t.textContent = zoomed ? "화면에 맞춤" : "확대";
  } else if (act === "list") {
    const cells = S.ids.map((id, i) => `<button class="${S.ans[id] !== undefined ? "sel" : ""} ${i === S.i ? "cur" : ""}" data-act="jump" data-i="${i}">${i + 1}</button>`).join("");
    sheet(`<h3>문제 번호로 이동</h3><p class="hint">색이 채워진 번호는 답을 확인한 문제입니다.</p><div class="cells n${S.ids.length > 60 ? 10 : S.ids.length > 30 ? 8 : 6}">${cells}</div><button class="btn pri" data-act="close">닫기</button>`);
  } else if (act === "jump") {
    S.i = +t.dataset.i;
    save();
    go("solve");
  } else if (act === "font") {
    sheet(`<h3>글자 크기</h3><p class="hint">읽기 편한 크기를 고르세요. <b id="font-size-value">${DB.fs}px</b></p><div class="fsrow"><button class="btn" data-act="fs" data-v="-1">가 작게</button><button class="btn" data-act="fs" data-v="1">가 크게</button></div><button class="btn pri" data-act="close">닫기</button>`);
  } else if (act === "fs") {
    DB.fs = Math.max(15, Math.min(22, (DB.fs || 16) + +t.dataset.v));
    document.documentElement.style.setProperty("--fs", DB.fs + "px");
    save();
    fit();
    const size = document.getElementById("font-size-value");
    if (size) size.textContent = DB.fs + "px";
  } else if (act === "tprev") tmove(-1);
  else if (act === "tnext") tmove(1);
  else if (act === "tq") {
    const s = THEORY[T.a].chapters[T.c].sections[T.s];
    startSet(s.keys.filter((k) => BY_ID[k]), s.title);
  }
});
document.addEventListener("change", (e) => {
  if (e.target.dataset?.pick === "sub") {
    DB.pick.sub = e.target.value;
    save();
    render();
    document.getElementById("sub-select")?.focus({ preventScroll: true });
    return;
  }
  const k = e.target.dataset && e.target.dataset.t;
  if (!k) return;
  T[k] = +e.target.value;
  if (k === "a") (T.c = 0), (T.s = 0);
  if (k === "c") T.s = 0;
  T.p = 0;
  render();
});
document.addEventListener("input", (e) => {
  if (e.target.id !== "my-answer" || view !== "solve" || !S) return;
  if (!S.drafts) S.drafts = {};
  S.drafts[S.ids[S.i]] = e.target.value;
  save();
});
/* 좌우로 밀어 이전/다음 */
let tx = 0, ty = 0, swipeBlocked = false;
document.addEventListener("touchstart", (e) => {
  tx = e.touches[0].clientX;
  ty = e.touches[0].clientY;
  swipeBlocked = !!e.target.closest("textarea, input, select, .sheet");
}, { passive: true });
document.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
  if (swipeBlocked || Math.abs(dx) < 70 || Math.abs(dy) > 50 || document.getElementById("modal").innerHTML) return;
  if (view === "solve" && S) move(dx < 0 ? 1 : -1);
  else if (view === "theory") tmove(dx < 0 ? 1 : -1);
}, { passive: true });
document.addEventListener("keydown", (e) => {
  const dialog = document.querySelector(".sheet");
  if (dialog) {
    if (e.key === "Escape") { e.preventDefault(); closeSheet(); }
    if (e.key === "Tab") {
      const controls = [...dialog.querySelectorAll('button:not([disabled]), input, select, textarea, [tabindex="0"]')];
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
    return;
  }
  if (view !== "solve" || !S || /INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName || "")) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key >= "1" && e.key <= "5") { e.preventDefault(); pick(+e.key); }
  else if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
  else if ((e.key === "Enter" || e.key === " ") && document.activeElement?.tagName !== "BUTTON") {
    const q = BY_ID[S.ids[S.i]];
    e.preventDefault();
    if (isShort(q) && S.ans[q.id] === undefined) {
      S.ans[q.id] = 1;
      save();
      render();
    } else if (S.ans[q.id] !== undefined) move(1);
  }
});
if (typeof window !== "undefined" && window.addEventListener) window.addEventListener("resize", () => fit());

/* ---------- 시작: 평문 데이터 또는 비밀번호 잠금 해제 ---------- */
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
let textbookKey = null;
async function decrypt(pw) {
  const enc = window.ENC;
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(enc.s), iterations: enc.i, hash: "SHA-256" }, km, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(enc.n) }, key, b64(enc.c));
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
  const data = JSON.parse(await new Response(stream).text());
  textbookKey = key;
  return data;
}
function start(data) {
  BANK = Array.isArray(data) ? data : data.bank;
  THEORY = (Array.isArray(data) ? window.THEORY : data.theory) || [];
  BY_ID = Object.fromEntries(BANK.map((q) => [q.id, q]));
  const s = DB.sess;
  S = s && s.ids && s.ids.every((id) => BY_ID[id]) ? s : null;
  DB.fs = Math.max(15, Math.min(22, Number(DB.fs) || 16));
  document.documentElement.style.setProperty("--fs", DB.fs + "px");
  go("home");
}
/* 비밀번호 저장: 이 기기 브라우저에만 남는다. 홈의 '잠그기'로 지운다. */
const PW_KEY = "gisa-study.pw";
function savePw(pw) {
  try { pw ? localStorage.setItem(PW_KEY, pw) : localStorage.removeItem(PW_KEY); } catch (e) {}
}
function savedPw() {
  try { return localStorage.getItem(PW_KEY) || ""; } catch (e) { return ""; }
}
function lockApp() {
  savePw("");
  location.reload();
}
async function autoUnlock() {
  const pw = savedPw();
  if (!pw || !window.crypto || !window.crypto.subtle || typeof DecompressionStream === "undefined") return lockScreen();
  root.innerHTML = '<p class="empty">공부방을 여는 중입니다…</p>';
  try {
    start(await decrypt(pw));
  } catch (e) {
    savePw("");
    lockScreen();
  }
}
function lockScreen() {
  root.innerHTML = `<div class="app"><main id="app" tabindex="-1" class="stage lock"><div class="lock-card"><span class="lock-mark">${icon("train")}</span><h1>기관사 <b>공부방</b></h1>
  <form id="lf"><label for="pw">입장 비밀번호</label><input id="pw" type="password" autocomplete="off" placeholder="공유받은 비밀번호를 입력하세요" required autofocus aria-describedby="err">
  <label class="remember"><input id="keep" type="checkbox" checked> 이 기기에 비밀번호 저장</label>
  <p class="err" id="err" role="alert"></p><button class="go" id="unlock" type="submit">공부방 들어가기 ${icon("arrow")}</button></form></div></main></div>`;
  document.getElementById("lf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = document.getElementById("unlock"), field = document.getElementById("pw"), error = document.getElementById("err");
    if (button.disabled) return;
    error.textContent = "";
    if (!window.crypto || !window.crypto.subtle || typeof DecompressionStream === "undefined") {
      error.textContent = "최신 Chrome, Edge, Safari 브라우저에서 접속해 주세요.";
      return;
    }
    button.disabled = true;
    button.textContent = "확인 중…";
    try {
      const data = await decrypt(field.value);
      savePw(document.getElementById("keep").checked ? field.value : "");
      field.value = "";
      start(data);
    } catch (errorDetail) {
      error.textContent = "비밀번호가 맞지 않습니다. 다시 확인해 주세요.";
      button.disabled = false;
      button.textContent = "입장";
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
  if (window.ENC) autoUnlock();
  else if (window.BANK && window.BANK.length) start(window.BANK);
  else root.innerHTML = '<div class="app"><main class="stage lock"><h1>문제를 불러오지 못했어요</h1><button class="go" onclick="location.reload()">다시 불러오기</button></main></div>';
})();
