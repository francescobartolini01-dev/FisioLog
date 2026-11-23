/* =====================================================================
   FisioLog · app
   Paziente: esercizi del giorno con spiegazione e video, registrazione
   di serie, dolore (0–10), sensazioni e note. Fisioterapista: pazienti,
   andamento, programma e libreria esercizi con video.
   Dati su Supabase (vedi supabase.sql), nessuna dipendenza esterna.
   ===================================================================== */
"use strict";
const app = document.getElementById("app");
const nav = document.getElementById("nav");

/* ---------- Date e testo ---------- */
const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
const GIORNI = ["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"];
const GG = ["L","M","M","G","V","S","D"];
const GG3 = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
const pad = n => String(n).padStart(2, "0");
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
const today = () => fmt(new Date());
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return fmt(d); };
const dow = s => ((parse(s).getDay() + 6) % 7) + 1; // 1 = lunedì … 7 = domenica
const dayDiff = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const nice = s => { const d = parse(s); return `${d.getDate()} ${MESI[d.getMonth()]}`; };
const niceDay = s => { const d = parse(s); return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`; };
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const localDate = iso => fmt(new Date(iso));
const dateTime = iso => { const d = new Date(iso); return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const hhmm = iso => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const ago = s => { if (!s) return "—"; const n = dayDiff(s, today()); return n <= 0 ? "oggi" : n === 1 ? "ieri" : n < 7 ? `${n} giorni fa` : nice(s); };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = v => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isFinite(n) ? n : null; };
const int = (v, lo, hi) => { const n = num(v); return n === null ? null : Math.max(lo, Math.min(hi, Math.round(n))); };
const dec = n => String(Math.round(n * 10) / 10).replace(".", ",");
const initials = name => (String(name || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("") || "?").toUpperCase();
const firstName = name => String(name || "").trim().split(/\s+/)[0] || "";
const uuid = () => crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
const AREAS = ["Cervicale","Spalla","Gomito e polso","Dorsale","Lombare","Anca","Ginocchio","Caviglia e piede","Core","Equilibrio","Respirazione","Mobilità generale","Altro"];
const FEELINGS = ["Nessun fastidio","Rigidità","Tensione","Bruciore","Formicolio","Stanchezza","Instabilità","Dolore acuto"];

/* ---------- Icone (tratto, si colorano col testo) ---------- */
const ico = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  today: ico('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  list: ico('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
  chart: ico('<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>'),
  user: ico('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  users: ico('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .7 3.3 2.6 3.9 5.5"/>'),
  book: ico('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7"/>'),
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  check: ico('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  back: ico('<path d="M15 5l-7 7 7 7"/>'),
  alert: ico('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>'),
  plus: ico('<path d="M12 5v14M5 12h14"/>'),
  trash: ico('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  edit: ico('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>'),
  up: ico('<path d="M6 15l6-6 6 6"/>'),
  down: ico('<path d="M6 9l6 6 6-6"/>'),
  copy: ico('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  share: ico('<path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>'),
  video: ico('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>'),
  link: ico('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  cal: ico('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  sun: ico('<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>'),
  moon: ico('<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>')
};

/* ---------- Supabase ---------- */
const SB = (() => {
  const c = window.FISIOLOG_SUPABASE || {};
  const url = String(c.url || "").trim().replace(/\/+$/, "").replace(/\/(rest|auth)\/v1$/, "");
  const key = String(c.key || "").trim();
  return /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url) && key ? { url, key } : null;
})();
const AUTH_KEY = "fisiolog-auth";
let AUTH = null; try { AUTH = JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch (e) {}
function setAuth(a) { AUTH = a; try { a ? localStorage.setItem(AUTH_KEY, JSON.stringify(a)) : localStorage.removeItem(AUTH_KEY); } catch (e) {} }
function sessionFrom(j) {
  if (!j || !j.access_token) return null;
  return { access_token: j.access_token, refresh_token: j.refresh_token,
    expires_at: Number(j.expires_at) || Math.floor(Date.now() / 1000) + (Number(j.expires_in) || 3600),
    user: { id: j.user && j.user.id, email: j.user && j.user.email } };
}
async function sbFetch(path, opts = {}) {
  const { method = "GET", body, auth = true, prefer, headers = {}, retried } = opts;
  const h = { apikey: SB.key, ...headers };
  if (body !== undefined) h["Content-Type"] = "application/json";
  if (auth) { await freshToken(); h.Authorization = "Bearer " + AUTH.access_token; }
  if (prefer) h.Prefer = prefer;
  let r;
  try { r = await fetch(SB.url + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch (e) { throw Object.assign(new Error("Nessuna connessione"), { offline: true }); }
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
  if (r.status === 401 && auth && !retried && AUTH) { AUTH.expires_at = 0; return sbFetch(path, { ...opts, retried: true }); }
  if (!r.ok) {
    const err = new Error((j && (j.msg || j.message || j.error_description || j.error)) || ("Errore " + r.status));
    err.status = r.status; err.code = j && (j.error_code || j.code); throw err;
  }
  return j;
}
let refreshing = null;
async function freshToken() {
  if (!AUTH) throw Object.assign(new Error("Accesso richiesto"), { status: 401 });
  if (Date.now() / 1000 < AUTH.expires_at - 60) return;
  if (!refreshing) refreshing = (async () => {
    try {
      const j = await sbFetch("/auth/v1/token?grant_type=refresh_token", { method: "POST", auth: false, body: { refresh_token: AUTH.refresh_token } });
      setAuth(sessionFrom(j) || AUTH);
    } catch (e) {
      if (e.status && e.status < 500) { setAuth(null); resetData(); render(); }
      throw e;
    } finally { refreshing = null; }
  })();
  return refreshing;
}
const redirectTo = () => encodeURIComponent(location.origin + "/");
async function signIn(email, password) {
  const j = await sbFetch("/auth/v1/token?grant_type=password", { method: "POST", auth: false, body: { email, password } });
  setAuth(sessionFrom(j));
}
async function signUp(email, password, data) {
  const j = await sbFetch(`/auth/v1/signup?redirect_to=${redirectTo()}`, { method: "POST", auth: false, body: { email, password, data } });
  const ses = sessionFrom(j); if (ses) { setAuth(ses); return "ok"; } return "confirm";
}
async function recover(email) { await sbFetch(`/auth/v1/recover?redirect_to=${redirectTo()}`, { method: "POST", auth: false, body: { email } }); }
async function signOut() {
  try { if (AUTH) await sbFetch("/auth/v1/logout", { method: "POST" }); } catch (e) {}
  setAuth(null); resetData(); location.hash = "#/"; render();
}
function authMessage(e) {
  const m = String(e.message || "").toLowerCase(), c = String(e.code || "");
  if (e.offline) return "Nessuna connessione. Riprova quando sei online.";
  if (c === "invalid_credentials" || m.includes("invalid login")) return "Email o password sbagliate.";
  if (c === "email_not_confirmed" || m.includes("not confirmed")) return "Prima conferma l’email: apri il messaggio che hai ricevuto, poi accedi qui.";
  if (c === "user_already_exists" || m.includes("already registered")) return "Esiste già un account con questa email: usa Accedi.";
  if (c === "weak_password" || m.includes("password should")) return "Password troppo debole: usa almeno 8 caratteri, con lettere e numeri.";
  if (c === "over_email_send_rate_limit" || m.includes("rate limit")) return "Troppe email inviate in poco tempo. Riprova tra qualche minuto.";
  if (m.includes("error sending") || m.includes("sending confirmation") || m.includes("not authorized")) return "Non riesco a mandare l’email a questo indirizzo. Controlla l’indirizzo o riprova più tardi.";
  return "Non è andata: " + e.message;
}

/* ---------- Video (archivio privato + link) ---------- */
const VCACHE = new Map();
async function signedUrl(path) {
  const c = VCACHE.get(path); if (c && c.exp > Date.now() + 60e3) return c.url;
  const enc = path.split("/").map(encodeURIComponent).join("/");
  const j = await sbFetch(`/storage/v1/object/sign/videos/${enc}`, { method: "POST", body: { expiresIn: 7200 } });
  const u = SB.url + "/storage/v1" + (j.signedURL || j.signedUrl);
  VCACHE.set(path, { url: u, exp: Date.now() + 7000e3 }); return u;
}
const MAX_VIDEO = 50 * 1024 * 1024;
function uploadVideo(file, onProgress) {
  return new Promise(async (res, rej) => {
    try { await freshToken(); } catch (e) { return rej(e); }
    const ext = (file.name.match(/\.([a-z0-9]{2,4})$/i) || [, "mp4"])[1].toLowerCase();
    const type = file.type || ({ mov: "video/quicktime", webm: "video/webm", m4v: "video/x-m4v" }[ext] || "video/mp4");
    const path = `${AUTH.user.id}/${uuid()}.${ext}`;
    const x = new XMLHttpRequest();
    x.open("POST", `${SB.url}/storage/v1/object/videos/${path}`);
    x.setRequestHeader("Authorization", "Bearer " + AUTH.access_token);
    x.setRequestHeader("apikey", SB.key);
    x.setRequestHeader("Content-Type", type);
    x.setRequestHeader("x-upsert", "false");
    x.setRequestHeader("cache-control", "3600");
    x.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) return res(path);
      let m = ""; try { const j = JSON.parse(x.responseText); m = j.message || j.error || ""; } catch (e) {}
      rej(new Error(/size|large|exceed/i.test(m) ? "Il video supera i 50 MB." : /mime|type/i.test(m) ? "Formato non accettato: usa MP4, MOV o WebM." : (m || "Caricamento non riuscito (" + x.status + ")")));
    };
    x.onerror = () => rej(Object.assign(new Error("Connessione persa durante il caricamento."), { offline: true }));
    x.send(file);
  });
}
async function deleteVideo(path) { if (!path) return; try { await sbFetch("/storage/v1/object/videos", { method: "DELETE", body: { prefixes: [path] } }); } catch (e) {} }
function embedUrl(u) {
  try {
    const x = new URL(u), h = x.hostname.replace(/^(www|m)\./, ""); let id = null;
    if (h === "youtu.be") id = x.pathname.slice(1).split("/")[0];
    else if (h === "youtube.com" || h === "youtube-nocookie.com") id = x.searchParams.get("v") || (x.pathname.match(/\/(embed|shorts|live)\/([\w-]{6,})/) || [])[2];
    if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
    if (h === "vimeo.com" || h === "player.vimeo.com") { const m = x.pathname.match(/(\d{6,})(?:\/([0-9a-f]{6,}))?/); if (m) return `https://player.vimeo.com/video/${m[1]}${m[2] ? "?h=" + m[2] : ""}`; }
  } catch (e) {}
  return null;
}
const isHttp = u => /^https?:\/\/[^\s]+$/i.test(String(u || "").trim());
function videoHtml(ex) {
  if (ex.video_path) return `<div class="video" data-path="${esc(ex.video_path)}"><span class="vmsg">Carico il video…</span></div>`;
  if (ex.video_url && isHttp(ex.video_url)) {
    const e = embedUrl(ex.video_url);
    if (e) return `<div class="video"><iframe src="${esc(e)}" title="Video dimostrativo: ${esc(ex.title)}" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(ex.video_url)) return `<div class="video"><video controls playsinline preload="metadata" src="${esc(ex.video_url)}"></video></div>`;
    return `<div class="video none"><a class="btn" href="${esc(ex.video_url)}" target="_blank" rel="noopener">${I.video}Apri il video</a></div>`;
  }
  return `<div class="video none"><span class="vmsg">Nessun video per questo esercizio</span></div>`;
}
function hydrateVideos() {
  app.querySelectorAll(".video[data-path]:not([data-done])").forEach(async el => {
    el.dataset.done = "1";
    try { const u = await signedUrl(el.dataset.path); el.innerHTML = `<video controls playsinline preload="metadata" src="${esc(u)}"></video>`; }
    catch (e) { el.innerHTML = `<span class="vmsg">${e.offline ? "Il video si vede quando sei connesso." : "Video non disponibile."}</span>`; }
  });
}

/* ---------- Vista (solo admin: fisioterapista o paziente) ---------- */
const VIEW_KEY = "fisiolog-view";
let VIEW = "physio"; try { VIEW = localStorage.getItem(VIEW_KEY) === "patient" ? "patient" : "physio"; } catch (e) {}
const roleOf = me => me && me.is_admin ? VIEW : me && me.role;
function switchView(v) {
  VIEW = v === "patient" ? "patient" : "physio"; try { localStorage.setItem(VIEW_KEY, VIEW); } catch (e) {}
  ASG = null; EXD = null; VISIT = null; for (const k in LOGD) delete LOGD[k];
  resetData(); loadCache();
  if (location.hash.replace(/^#\/?/, "")) location.hash = "#/"; else render();
  refresh(); toast(VIEW === "patient" ? "Vista paziente" : "Vista fisioterapista");
}

/* ---------- Stato, copia locale e invii in attesa ---------- */
const S = { ready: false, me: null, physio: null, patients: [], exercises: [], assignments: [], logs: [], visits: [] };
let LOADERR = null, NET = "ok", RECOVERY = false;
function resetData() { Object.assign(S, { ready: false, me: null, physio: null, patients: [], exercises: [], assignments: [], logs: [], visits: [] }); LOADERR = null; }
const cacheKey = () => "fisiolog-cache-" + (AUTH && AUTH.user.id) + "-" + VIEW;
function saveCache() { try { const { ready, ...d } = S; localStorage.setItem(cacheKey(), JSON.stringify(d)); } catch (e) {} }
function loadCache() { try { const d = JSON.parse(localStorage.getItem(cacheKey()) || "null"); if (d && d.me) { Object.assign(S, d); S.ready = true; } } catch (e) {} }
const obKey = () => "fisiolog-outbox-" + (AUTH && AUTH.user.id);
function outbox() { try { return JSON.parse(localStorage.getItem(obKey()) || "[]"); } catch (e) { return []; } }
function setOutbox(a) { try { a.length ? localStorage.setItem(obKey(), JSON.stringify(a)) : localStorage.removeItem(obKey()); } catch (e) {} paintStatus(); }
const sortLogs = a => a.sort((x, y) => x.date < y.date ? 1 : x.date > y.date ? -1 : String(y.created_at).localeCompare(String(x.created_at)));
function withOutbox(lg) { const m = new Map(lg.map(l => [l.id, l])); for (const o of outbox()) m.set(o.id, o); return sortLogs([...m.values()]); }
async function flushOutbox() {
  const ob = outbox(); if (!ob.length || !AUTH) return;
  await sbFetch("/rest/v1/logs?on_conflict=id", { method: "POST", body: ob.map(({ created_at, ...l }) => l), prefer: "resolution=merge-duplicates,return=minimal" });
  setOutbox([]);
}
async function fetchAll(path) {
  // Supabase restituisce al massimo 1000 righe per richiesta: si legge a pagine
  const out = [];
  for (let off = 0; ; off += 1000) {
    const page = await sbFetch(`${path}&limit=1000&offset=${off}`);
    out.push(...page);
    if (page.length < 1000 || off >= 50000) return out;
  }
}
async function load() {
  const uid = AUTH.user.id;
  const me = (await sbFetch(`/rest/v1/profiles?id=eq.${uid}&select=*`))[0];
  if (!me) throw Object.assign(new Error("Profilo non trovato"), { noProfile: true });
  const since = addDays(today(), -90);
  if (roleOf(me) === "patient") {
    const from = new Date(Date.now() - 4 * 3600e3).toISOString();
    const [ph, as, lg, vs] = await Promise.all([
      me.physio_id ? sbFetch(`/rest/v1/profiles?id=eq.${me.physio_id}&select=id,full_name,email`) : [],
      sbFetch(`/rest/v1/assignments?select=*,exercise:exercises(*)&patient_id=eq.${uid}&active=is.true&order=position.asc,created_at.asc`),
      fetchAll(`/rest/v1/logs?patient_id=eq.${uid}&date=gte.${since}&order=date.desc,created_at.desc`),
      sbFetch(`/rest/v1/visits?patient_id=eq.${uid}&at=gte.${encodeURIComponent(from)}&order=at.asc&limit=5`)
    ]);
    Object.assign(S, { me, physio: ph[0] || null, assignments: as.filter(a => a.exercise), logs: withOutbox(lg), visits: vs, patients: [], exercises: [] });
  } else {
    const [pt, ex, as, lg, vs] = await Promise.all([
      sbFetch(`/rest/v1/profiles?physio_id=eq.${uid}&select=id,full_name,email,created_at&order=full_name.asc`),
      sbFetch(`/rest/v1/exercises?physio_id=eq.${uid}&order=title.asc`),
      sbFetch(`/rest/v1/assignments?physio_id=eq.${uid}&order=position.asc,created_at.asc`),
      fetchAll(`/rest/v1/logs?date=gte.${since}&order=date.desc,created_at.desc,id.asc`),
      sbFetch(`/rest/v1/visits?physio_id=eq.${uid}&order=at.asc`)
    ]);
    Object.assign(S, { me, physio: null, patients: pt, exercises: ex, assignments: as, logs: lg, visits: vs });
  }
  S.ready = true; saveCache();
}
async function refresh(quiet) {
  if (!SB || !AUTH) return;
  if (!quiet) { NET = "sync"; paintStatus(); }
  try { await flushOutbox(); await load(); LOADERR = null; NET = "ok"; }
  catch (e) {
    if (e.offline) { NET = "offline"; if (!S.ready) LOADERR = e; }
    else if (!AUTH) return;
    else { NET = "error"; LOADERR = e; }
  }
  safeRender();
}

/* ---------- Calcoli ---------- */
const presc = (a, ex) => {
  ex = ex || a.exercise || exById(a.exercise_id) || {};
  const sets = a.sets ?? ex.sets, reps = a.reps || ex.reps, hold = a.hold_s ?? ex.hold_s, rest = a.rest_s ?? ex.rest_s;
  const p = [];
  if (sets) p.push(`${sets} serie${reps ? " × " + reps : ""}`); else if (reps) p.push(reps);
  if (hold) p.push(`tieni ${hold} s`);
  if (rest) p.push(`recupero ${rest} s`);
  return p;
};
const targetSets = a => a.sets ?? (a.exercise || exById(a.exercise_id) || {}).sets ?? 3;
const daysTxt = d => { const s = [...d].sort(); return s.length === 7 ? "Tutti i giorni" : s.length ? s.map(x => GG3[x - 1]).join(", ") : "Nessun giorno"; };
const exById = id => S.exercises.find(e => e.id === id);
const scheduled = (a, d) => a.active !== false && (a.days || []).includes(dow(d)) && d >= localDate(a.created_at);
function stats(pid) {
  const as = S.assignments.filter(a => a.patient_id === pid);
  const lg = S.logs.filter(l => l.patient_id === pid);
  const t = today(); let exp = 0, done = 0;
  for (let i = 1; i <= 7; i++) {
    const d = addDays(t, -i);
    for (const a of as) if (scheduled(a, d)) { exp++; if (lg.some(l => l.assignment_id === a.id && l.date === d)) done++; }
  }
  const avg = (f, to) => { const v = lg.filter(l => l.date >= f && l.date <= to && l.pain != null).map(l => l.pain); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  return { as, lg, exp, done, adh: exp ? Math.round(done / exp * 100) : null,
    pain7: avg(addDays(t, -6), t), painPrev: avg(addDays(t, -13), addDays(t, -7)),
    alerts: lg.filter(l => l.pain >= 6 && l.date >= addDays(t, -7)), last: lg[0] || null };
}
function painChart(lg) {
  const t = today(), W = 560, H = 190, L = 30, B = 30, T = 14, n = 14, bw = (W - L - 6) / n;
  const Y = v => T + (H - T - B) * (1 - v / 10);
  let g = "";
  for (const v of [0, 2, 4, 6, 8, 10]) g += `<line x1="${L}" x2="${W - 4}" y1="${Y(v)}" y2="${Y(v)}" style="stroke:var(--line)" stroke-width="1"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="12" style="fill:var(--muted)">${v}</text>`;
  const parts = [];
  for (let i = 0; i < n; i++) {
    const d = addDays(t, i - (n - 1)), v = lg.filter(l => l.date === d && l.pain != null).map(l => l.pain);
    const x = L + i * bw + bw * .2, w = bw * .6;
    if (v.length) {
      const a = v.reduce((p, c) => p + c, 0) / v.length, y = Y(Math.max(a, .25));
      const col = a >= 6 ? "var(--warn)" : d === t ? "var(--primary)" : "var(--celeste)";
      g += `<rect x="${x}" y="${y}" width="${w}" height="${Y(0) - y}" rx="4" style="fill:${col}"><title>${cap(niceDay(d))}: dolore medio ${dec(a)}</title></rect>`;
      parts.push(`${nice(d)} ${dec(a)}`);
    } else g += `<circle cx="${x + w / 2}" cy="${Y(0) - 3}" r="2.5" style="fill:var(--line)"/>`;
    if (i % 3 === 0 || i === n - 1) g += `<text x="${x + w / 2}" y="${H - 8}" text-anchor="middle" font-size="12" style="fill:var(--muted)">${i === n - 1 ? "oggi" : parse(d).getDate()}</text>`;
  }
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Dolore medio per giorno, ultimi 14 giorni${parts.length ? ": " + esc(parts.join(", ")) : ": nessun dato"}">${g}</svg></div>
    <p class="tiny muted" style="margin:6px 0 0">Scala 0–10. In arancione i giorni con dolore medio da 6 in su; i puntini sono giorni senza registrazioni.</p>`;
}
const painCls = p => p == null ? "" : p >= 6 ? "hi" : p <= 2 ? "lo" : "";
function logLine(l, who) {
  const bits = [`${l.sets_done}${l.sets_target ? "/" + l.sets_target : ""} serie`];
  if (l.feelings && l.feelings.length) bits.push(l.feelings.join(", "));
  return `<li><div class="grow"><b>${esc(l.title)}</b>${who ? ` <span class="tiny muted">· ${esc(who)}</span>` : ""}<div class="small muted">${esc(bits.join(" · "))}${l.created_at ? " · " + hhmm(l.created_at) : ""}</div>${l.note ? `<div class="small" style="margin-top:2px">“${esc(l.note)}”</div>` : ""}</div><span class="pv ${painCls(l.pain)}">${l.pain == null ? "–" : l.pain + "/10"}</span></li>`;
}

/* ---------- Bozze dei moduli ---------- */
const LOGD = {};      // registrazione per esercizio assegnato
let EXD = null;       // esercizio in modifica
let ASG = null;       // esercizio da assegnare / in modifica
let VISIT = null;     // seduta da fissare
let LIB = { q: "", area: "" };
let GATE = { mode: "login", role: "patient", email: "", name: "" };
let AUTHMSG = null;
let LINKMSG = null;

/* ---------- Navigazione ---------- */
const route = () => location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
const go = p => { location.hash = "#/" + p; };
window.addEventListener("hashchange", () => {
  const r = route();
  if (EXD && !EXD.busy && !(r[0] === "libreria" && (r[1] === "nuovo" || r[2] === "modifica"))) EXD = null;
  if (VISIT && r[1] !== VISIT.pid) VISIT = null;
  render(); scrollTo(0, 0);
});
const TABS = {
  patient: [["oggi", "Oggi", I.today], ["programma", "Programma", I.list], ["diario", "Diario", I.chart], ["profilo", "Profilo", I.user]],
  physio: [["pazienti", "Pazienti", I.users], ["libreria", "Libreria", I.book], ["profilo", "Profilo", I.user]]
};
function navHtml(role, cur) {
  const alias = { esercizio: "oggi", paziente: "pazienti" };
  const c = alias[cur] || cur;
  return TABS[role].map(([k, l, i]) => `<a href="#/${k}" ${c === k ? 'aria-current="page"' : ""}>${i}<span>${l}</span></a>`).join("");
}
const typing = () => { const a = document.activeElement; return a && app.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== "file"; };
const playing = () => [...app.querySelectorAll("video")].some(v => !v.paused);
let pending = false;
function safeRender() { if (typing() || playing() || (EXD && EXD.busy)) { pending = true; paintStatus(); return; } render(); }
app.addEventListener("focusout", () => setTimeout(() => { if (pending && !typing() && !playing()) { pending = false; render(); } }, 80));
app.addEventListener("pause", () => { if (pending && !typing()) { pending = false; render(); } }, true);

function render() {
  paintStatus();
  if (!SB) { nav.innerHTML = ""; app.innerHTML = viewSetup(); return; }
  if (RECOVERY && AUTH) { nav.innerHTML = ""; app.innerHTML = viewNewPassword(); return; }
  if (!AUTH) { nav.innerHTML = ""; app.innerHTML = viewGate(); return; }
  if (!S.ready) { nav.innerHTML = ""; app.innerHTML = LOADERR ? viewLoadError() : `<div class="loading">Caricamento…</div>`; return; }
  const r = route(), role = roleOf(S.me);
  if (role === "patient" && !S.me.physio_id) {
    nav.innerHTML = ""; app.innerHTML = r[0] === "profilo" ? viewProfile() : viewLink(); return;
  }
  nav.innerHTML = navHtml(role, r[0] || (role === "patient" ? "oggi" : "pazienti"));
  let html;
  if (role === "patient") {
    html = r[0] === "esercizio" ? viewPatientExercise(r[1]) : r[0] === "programma" ? viewProgram()
      : r[0] === "diario" ? viewDiary() : r[0] === "profilo" ? viewProfile() : viewToday();
  } else {
    if (r[0] === "paziente") html = viewPatient(r[1]);
    else if (r[0] === "libreria" && r[1] === "nuovo") html = viewExEdit(null);
    else if (r[0] === "libreria" && r[1] && r[2] === "modifica") html = viewExEdit(r[1]);
    else if (r[0] === "libreria" && r[1]) html = viewExercise(r[1]);
    else if (r[0] === "libreria") html = viewLibrary();
    else if (r[0] === "profilo") html = viewProfile();
    else html = viewPatients();
  }
  app.innerHTML = html;
  hydrateVideos();
}
function paintViewBtn() {
  const b = document.getElementById("viewBtn"); if (!b) return;
  const on = !!(AUTH && S.ready && S.me && S.me.is_admin && !RECOVERY);
  b.hidden = !on; if (!on) return;
  const pat = VIEW === "patient";
  b.dataset.v = pat ? "physio" : "patient";
  b.innerHTML = `${pat ? I.user : I.users}<span>${pat ? "Paziente" : "Fisio"}</span>`;
  b.setAttribute("aria-label", `Vista ${pat ? "paziente" : "fisioterapista"}: passa alla vista ${pat ? "fisioterapista" : "paziente"}`);
  b.title = b.getAttribute("aria-label");
}
function paintStatus() {
  paintViewBtn();
  const el = document.getElementById("status"); if (!el) return;
  const n = AUTH && SB ? outbox().length : 0;
  el.textContent = n ? `${n} ${n === 1 ? "registrazione" : "registrazioni"} da inviare` : NET === "offline" ? "Offline" : NET === "sync" ? "Aggiorno…" : NET === "error" ? "Aggiornamento non riuscito" : "";
}
let toastT = 0;
function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2800); }

/* =====================================================================
   VISTE: accesso
   ===================================================================== */
function viewSetup() {
  return `<section class="gate"><img src="/logo.svg" alt="" class="logo"><h1>Manca un passaggio</h1>
    <div class="card stack"><p style="margin:0">FisioLog non è ancora collegato al database. Apri <b>config.js</b> e incolla l’indirizzo del progetto Supabase e la chiave pubblica, poi ricarica la pagina.</p>
    <p class="small muted" style="margin:0">Le istruzioni passo passo sono nel file README.md del progetto.</p></div></section>`;
}
function viewGate() {
  const m = GATE.mode, signup = m === "signup", rec = m === "recover";
  const consent = GATE.role === "patient"
    ? "Acconsento al trattamento dei miei dati sulla salute (esercizi, dolore, sensazioni e note) perché li veda il fisioterapista a cui mi collego."
    : "Uso FisioLog per la mia attività professionale e tratto i dati dei pazienti secondo il GDPR.";
  return `<section class="gate"><img src="/logo.svg" alt="" class="logo">
    <h1>${signup ? "Crea il tuo account" : rec ? "Recupera la password" : "Accedi a FisioLog"}</h1>
    <p>${signup ? "Gli esercizi di casa, già raccontati al tuo fisioterapista." : rec ? "Ti mandiamo un link per sceglierne una nuova." : "Esercizi a casa, progressi in studio."}</p>
    <form id="authForm" class="card stack" autocomplete="on" novalidate>
      ${signup ? `<div class="rolepick" role="group" aria-label="Chi sei">
          <button type="button" data-act="role" data-v="patient" aria-pressed="${GATE.role === "patient"}"><b>Paziente</b><span>Faccio gli esercizi a casa</span></button>
          <button type="button" data-act="role" data-v="physio" aria-pressed="${GATE.role === "physio"}"><b>Fisioterapista</b><span>Assegno e seguo gli esercizi</span></button></div>
        <label class="f">Nome e cognome<input type="text" id="gName" autocomplete="name" maxlength="80" required value="${esc(GATE.name)}"></label>` : ""}
      <label class="f">Email<input type="email" id="gEmail" autocomplete="username" inputmode="email" required value="${esc(GATE.email)}"></label>
      ${rec ? "" : `<label class="f">Password<input type="password" id="gPw" autocomplete="${signup ? "new-password" : "current-password"}" minlength="8" required>${signup ? `<span class="hint">Almeno 8 caratteri.</span>` : ""}</label>`}
      ${signup ? `<label class="check"><input type="checkbox" id="gConsent"><span>${consent} <a href="/privacy.html" target="_blank" rel="noopener">Informativa privacy</a></span></label>` : ""}
      <button class="btn primary big" type="submit">${signup ? "Crea account" : rec ? "Mandami il link" : "Accedi"}</button>
      ${AUTHMSG ? `<p class="msg ${AUTHMSG.err ? "err" : ""}" role="alert" style="margin:0">${esc(AUTHMSG.text)}</p>` : ""}
    </form>
    <p class="small" style="text-align:center;margin:0">${signup ? `Hai già un account? <button class="linkbtn" data-act="gate" data-v="login">Accedi</button>`
      : rec ? `<button class="linkbtn" data-act="gate" data-v="login">Torna all’accesso</button>`
      : `Non hai un account? <button class="linkbtn" data-act="gate" data-v="signup">Creane uno</button><br><button class="linkbtn" data-act="gate" data-v="recover" style="margin-top:8px">Password dimenticata?</button>`}</p>
  </section>`;
}
function viewNewPassword() {
  return `<section class="gate"><img src="/logo.svg" alt="" class="logo"><h1>Nuova password</h1>
    <form id="newPwForm" class="card stack"><label class="f">Nuova password<input type="password" id="npw" autocomplete="new-password" minlength="8" required><span class="hint">Almeno 8 caratteri.</span></label>
    <button class="btn primary big" type="submit">Salva la password</button>
    ${AUTHMSG ? `<p class="msg ${AUTHMSG.err ? "err" : ""}" role="alert" style="margin:0">${esc(AUTHMSG.text)}</p>` : ""}</form></section>`;
}
function viewLoadError() {
  const e = LOADERR || {};
  const txt = e.noProfile ? "Il tuo account esiste ma il database non è pronto: esegui il file supabase.sql nel progetto Supabase (SQL Editor), poi riprova."
    : e.offline ? "Sei offline e su questo dispositivo non ci sono ancora dati salvati. Riprova quando sei connesso."
    : "Non riesco a caricare i dati: " + (e.message || "errore sconosciuto");
  return `<section class="gate"><img src="/logo.svg" alt="" class="logo"><div class="card stack"><p style="margin:0">${esc(txt)}</p>
    <div class="row"><button class="btn primary" data-act="retry">Riprova</button><button class="btn ghost" data-act="logout">Esci</button></div></div></section>`;
}
function viewLink() {
  return `<section class="gate"><img src="/logo.svg" alt="" class="logo"><h1>Collega il tuo fisioterapista</h1>
    <p>Chiedigli il <b>codice studio</b>: sono 6 caratteri, li trova nella sua app FisioLog.</p>
    <form id="linkForm" class="card stack"><label class="f">Codice studio<input type="text" id="lCode" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" style="font:800 26px Manrope,sans-serif;letter-spacing:6px;text-transform:uppercase;text-align:center" required></label>
      <button class="btn primary big" type="submit">Collega</button>
      ${LINKMSG ? `<p class="msg ${LINKMSG.err ? "err" : ""}" role="alert" style="margin:0">${esc(LINKMSG.text)}</p>` : ""}
      <p class="small muted" style="margin:0">Collegandoti, il fisioterapista vedrà gli esercizi che registri, il dolore e le note. Puoi scollegarti quando vuoi dal profilo.</p></form>
    <p class="small" style="text-align:center;margin:0">Accesso come ${esc(S.me.email || "")} · <a href="#/profilo">Profilo</a> · <button class="linkbtn" data-act="logout">Esci</button></p></section>`;
}

/* =====================================================================
   VISTE: paziente
   ===================================================================== */
function todayList() { const t = today(); return S.assignments.filter(a => (a.days || []).includes(dow(t))); }
const logsOf = (aid, d) => S.logs.filter(l => l.assignment_id === aid && l.date === d);
function exItem(a, opts = {}) {
  const t = today(), lg = logsOf(a.id, t)[0], p = presc(a);
  const sub = lg ? `${lg.sets_done}/${lg.sets_target || targetSets(a)} serie${lg.pain != null ? " · dolore " + lg.pain + "/10" : ""}` : (p.join(" · ") || "Apri per i dettagli");
  const right = opts.noStatus ? `<span class="tiny muted">${esc(daysTxt(a.days))}</span>` : lg ? `<span class="chip ok">Fatto</span>` : opts.next ? `<span class="small" style="color:var(--primary);font-weight:700">Adesso</span>` : `<span class="small muted">Da fare</span>`;
  return `<a class="exitem${opts.next && !lg ? " next" : ""}" href="#/esercizio/${esc(a.id)}"><span class="thumb">${lg && !opts.noStatus ? I.check : I.play}</span>
    <span class="t"><b>${esc(a.exercise.title)}</b><span>${esc(sub)}</span></span>${right}</a>`;
}
function ringSvg(done, tot) {
  const C = 2 * Math.PI * 32, f = tot ? done / tot : 0;
  return `<svg class="ring" width="84" height="84" viewBox="0 0 80 80" role="img" aria-label="${done} esercizi fatti su ${tot}"><circle cx="40" cy="40" r="32" fill="none" style="stroke:var(--surface2)" stroke-width="8"/><circle cx="40" cy="40" r="32" fill="none" style="stroke:var(--primary)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C * f} ${C}" transform="rotate(-90 40 40)"/><text x="40" y="46" text-anchor="middle" font-size="19" style="fill:var(--ink)">${done}/${tot}</text></svg>`;
}
function viewToday() {
  const t = today(), list = todayList(), done = list.filter(a => logsOf(a.id, t).length).length;
  const next = list.find(a => !logsOf(a.id, t).length), h = new Date().getHours();
  const hi = h < 13 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera";
  const v = S.visits[0];
  return `<div class="hello"><h1>${hi}${S.me.full_name ? ", " + esc(firstName(S.me.full_name)) : ""}</h1><p>${cap(niceDay(t))}</p></div>
  <div class="stack">
    ${list.length ? `<div class="card progress">${ringSvg(done, list.length)}<div><b class="disp" style="font-size:18px">${done === list.length ? "Fatto tutto, ottimo lavoro" : "Esercizi di oggi"}</b>
      <div class="small muted">${S.physio ? "Programma di " + esc(S.physio.full_name) : ""}</div><div class="small muted">${list.length - done ? `Te ne ${list.length - done === 1 ? "manca 1" : "mancano " + (list.length - done)}` : "Il diario è già arrivato in studio"}</div></div></div>
      <div class="exlist">${list.map(a => exItem(a, { next: a === next })).join("")}</div>`
    : S.assignments.length ? `<div class="card soft"><b class="disp" style="font-size:18px">Oggi è giorno di riposo</b><p class="small" style="margin:4px 0 0">Nessun esercizio in programma per oggi. <a href="#/programma">Vedi il programma completo</a>.</p></div>`
    : `<div class="empty">${esc(S.physio ? S.physio.full_name : "Il tuo fisioterapista")} non ti ha ancora assegnato esercizi. Appena lo fa, li trovi qui.</div>`}
    ${v ? `<div class="card soft row" style="flex-wrap:nowrap"><span style="color:var(--primary);width:26px;flex:none">${I.cal}</span><div><b>Prossima seduta: ${esc(dateTime(v.at))}</b><div class="small muted">${v.note ? esc(v.note) : "Il diario arriva in studio prima di te"}</div></div></div>` : ""}
  </div>`;
}
function viewProgram() {
  return `<div class="pagehead"><div><h1>Il tuo programma</h1><p>${S.physio ? "Assegnato da " + esc(S.physio.full_name) : ""}</p></div></div>
    ${S.assignments.length ? `<div class="exlist">${S.assignments.map(a => exItem(a, { noStatus: true })).join("")}</div>`
    : `<div class="empty">Ancora nessun esercizio assegnato.</div>`}`;
}
function logDraft(a) {
  if (!LOGD[a.id]) LOGD[a.id] = { id: null, sets_done: 0, pain: null, feelings: [], note: "", open: !logsOf(a.id, today()).length };
  return LOGD[a.id];
}
function viewPatientExercise(aid) {
  const a = S.assignments.find(x => x.id === aid);
  if (!a) return `<a class="back" href="#/oggi">${I.back}Oggi</a><div class="empty" style="margin-top:12px">Questo esercizio non è più nel tuo programma.</div>`;
  const ex = a.exercise, t = today(), list = todayList(), idx = list.indexOf(a), dr = logDraft(a), tgt = targetSets(a);
  const todays = logsOf(a.id, t), steps = String(ex.steps || "").split("\n").map(s => s.trim()).filter(Boolean);
  const form = `<section class="card stack" aria-labelledby="logTitle"><h2 id="logTitle" style="margin:0">Com’è andata?</h2>
    <div><div class="small muted" style="margin-bottom:6px">Serie fatte <span class="tiny">(su ${tgt})</span></div>
      <div class="setsel" role="group" aria-label="Serie fatte">${Array.from({ length: Math.max(tgt, dr.sets_done) }, (_, i) => `<button type="button" data-act="sets" data-n="${i + 1}" aria-pressed="${i < dr.sets_done}" aria-label="Serie ${i + 1}">${i < dr.sets_done ? I.check : i + 1}</button>`).join("")}</div></div>
    <div><div class="small muted" id="painLbl" style="margin-bottom:6px">Dolore durante l’esercizio</div>
      <div class="pain" role="group" aria-labelledby="painLbl">${Array.from({ length: 11 }, (_, v) => `<button type="button" data-act="pain" data-v="${v}" aria-pressed="${dr.pain === v}">${v}</button>`).join("")}</div>
      <div class="painlegend"><span>0 nessun dolore</span><span>10 il peggiore</span></div></div>
    <div><div class="small muted" style="margin-bottom:6px">Sensazioni</div>
      <div class="chips" role="group" aria-label="Sensazioni">${FEELINGS.map(f => `<button type="button" class="toggle" data-act="feel" data-v="${esc(f)}" aria-pressed="${dr.feelings.includes(f)}">${esc(f)}</button>`).join("")}</div></div>
    <label class="f">Nota per il fisioterapista<textarea id="logNote" data-aid="${esc(a.id)}" maxlength="1000" placeholder="Es. sulla gamba destra perdo un po’ l’equilibrio">${esc(dr.note)}</textarea></label>
    <button class="btn primary big" type="button" data-act="saveLog" data-aid="${esc(a.id)}">${dr.id ? "Salva le modifiche" : "Invia al fisioterapista"}</button>
    ${dr.id || todays.length ? `<button class="btn ghost" type="button" data-act="cancelLog" data-aid="${esc(a.id)}">Annulla</button>` : `<p class="tiny muted" style="margin:0;text-align:center">Lo vedrà prima della prossima seduta.</p>`}
  </section>`;
  const doneCard = `<section class="card stack"><h2 style="margin:0">Fatto oggi</h2>
    <ul class="feed">${todays.map(l => logLine(l)).join("")}</ul>
    <div class="row">${todays.map(l => `<button class="btn" data-act="editLog" data-aid="${esc(a.id)}" data-id="${esc(l.id)}">${I.edit}Modifica${todays.length > 1 ? " delle " + hhmm(l.created_at || new Date().toISOString()) : ""}</button>`).join("")}<button class="btn soft" data-act="newLog" data-aid="${esc(a.id)}">${I.plus}Registra di nuovo</button></div></section>`;
  return `<a class="back" href="#/oggi">${I.back}Oggi</a>
  <div class="stack" style="margin-top:6px">
    ${idx >= 0 ? `<div class="small muted">Esercizio ${idx + 1} di ${list.length}</div>` : `<div class="small muted">Non in programma oggi · ${esc(daysTxt(a.days))}</div>`}
    ${videoHtml(ex)}
    <div><h1 style="font-size:30px">${esc(ex.title)}</h1>
      <div class="chips" style="margin-top:8px">${presc(a).map(p => `<span class="chip">${esc(p)}</span>`).join("")}<span class="chip">${esc(daysTxt(a.days))}</span></div></div>
    ${a.note ? `<div class="note"><b>Nota di ${esc(S.physio ? S.physio.full_name : "chi ti segue")}</b>${esc(a.note)}</div>` : ""}
    ${ex.description ? `<section><h2 style="font-size:19px;margin-bottom:6px">A cosa serve</h2><p class="prose">${esc(ex.description)}</p></section>` : ""}
    ${steps.length ? `<section><h2 style="font-size:19px;margin-bottom:6px">Come si fa</h2><ol class="steps">${steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol></section>` : ""}
    ${ex.cautions ? `<div class="alertbox">${I.alert}<span><b>Attenzione.</b> <span class="prose" style="display:inline">${esc(ex.cautions)}</span></span></div>` : ""}
    ${dr.open ? form : doneCard}
  </div>`;
}
async function saveLog(aid) {
  const a = S.assignments.find(x => x.id === aid), dr = LOGD[aid]; if (!a || !dr) return;
  if (dr.pain === null) { toast("Indica il dolore, anche 0 se non ne hai avuto"); document.querySelector(".pain button")?.focus(); return; }
  if (!dr.sets_done && !dr.note.trim()) { toast("Segna quante serie hai fatto"); document.querySelector(".setsel button")?.focus(); return; }
  const old = dr.id ? S.logs.find(l => l.id === dr.id) : null;
  const log = { id: dr.id || uuid(), patient_id: AUTH.user.id, assignment_id: a.id, exercise_id: a.exercise_id, title: a.exercise.title.slice(0, 80),
    date: old ? old.date : today(), sets_done: dr.sets_done, sets_target: targetSets(a), pain: dr.pain, feelings: dr.feelings, note: dr.note.trim().slice(0, 1000) };
  const local = { ...log, created_at: old ? old.created_at : new Date().toISOString() };
  S.logs = sortLogs([local, ...S.logs.filter(l => l.id !== log.id)]); saveCache();
  delete LOGD[aid];
  try {
    await flushOutbox().catch(() => {});
    await sbFetch("/rest/v1/logs?on_conflict=id", { method: "POST", body: log, prefer: "resolution=merge-duplicates,return=minimal" });
    toast(old ? "Modifica salvata" : "Inviato al fisioterapista");
  } catch (e) {
    if (e.offline) { setOutbox([...outbox().filter(o => o.id !== log.id), local]); NET = "offline"; toast("Salvato sul telefono: lo invio appena torni online"); }
    else { S.logs = sortLogs([...(old ? [old] : []), ...S.logs.filter(l => l.id !== log.id)]); saveCache(); toast("Non inviato: " + e.message); LOGD[aid] = { ...dr, open: true }; render(); return; }
  }
  const nx = todayList().find(x => !logsOf(x.id, today()).length);
  if (!old && nx) go("esercizio/" + nx.id); else if (!old) go("oggi"); else render();
}
function viewDiary() {
  const st = stats(AUTH.user.id), t = today();
  const lg = S.logs.filter(l => l.date >= addDays(t, -30));
  const byDay = {}; lg.forEach(l => (byDay[l.date] ??= []).push(l));
  return `<div class="pagehead"><div><h1>Il tuo diario</h1><p>Quello che vede anche ${esc(S.physio ? S.physio.full_name : "il tuo fisioterapista")}</p></div></div>
  <div class="stack">
    <div class="tiles">
      <div class="tile"><b>${st.adh === null ? "–" : st.adh + "%"}</b><span>Costanza, ultimi 7 giorni${st.exp ? ` · ${st.done} di ${st.exp}` : ""}</span></div>
      <div class="tile"><b>${st.pain7 === null ? "–" : dec(st.pain7)}${st.pain7 !== null && st.painPrev !== null && Math.abs(st.pain7 - st.painPrev) >= .3 ? ` <span class="delta ${st.pain7 < st.painPrev ? "down" : "up"}">${st.pain7 < st.painPrev ? "↓" : "↑"}</span>` : ""}</b><span>Dolore medio, 7 giorni${st.painPrev !== null ? " · prima " + dec(st.painPrev) : ""}</span></div>
      <div class="tile"><b>${lg.length}</b><span>Registrazioni, ultimi 30 giorni</span></div>
    </div>
    <section class="card"><h2>Dolore, ultimi 14 giorni</h2>${painChart(st.lg)}</section>
    <section class="card"><h2>Registrazioni</h2>${Object.keys(byDay).length ? Object.entries(byDay).map(([d, ls]) => `<div class="day"><h3>${cap(niceDay(d))}</h3><ul class="feed">${ls.map(l => logLine(l).replace("</li>", `<button class="x" data-act="delLog" data-id="${esc(l.id)}" aria-label="Elimina la registrazione di ${esc(l.title)}">${I.trash}</button></li>`)).join("")}</ul></div>`).join("")
      : `<div class="empty">Ancora niente: le registrazioni degli esercizi compaiono qui.</div>`}</section>
  </div>`;
}

/* =====================================================================
   VISTE: profilo (entrambi i ruoli)
   ===================================================================== */
function viewProfile() {
  const me = S.me, ph = roleOf(me) === "physio", th = document.documentElement.dataset.theme || "auto";
  return `<div class="pagehead"><div><h1>Profilo</h1><p>${esc(me.email || "")} · ${me.is_admin ? "Admin · vista " + (ph ? "fisioterapista" : "paziente") : ph ? "Fisioterapista" : "Paziente"}</p></div></div>
  <div class="stack">
    ${me.is_admin ? `<section class="card soft stack"><h2 style="margin:0">Admin</h2>
      <p class="small" style="margin:0">Il tuo account è fisioterapista e anche paziente di se stesso: assegnati un esercizio dalla scheda “${esc(me.full_name || "tu")} (tu)” e provalo dalla vista paziente.</p>
      <div class="seg" role="group" aria-label="Vista"><button data-act="switchView" data-v="physio" aria-pressed="${VIEW === "physio"}">Fisioterapista</button><button data-act="switchView" data-v="patient" aria-pressed="${VIEW === "patient"}">Paziente</button></div></section>` : ""}
    <form id="nameForm" class="card stack"><h2 style="margin:0">I tuoi dati</h2>
      <label class="f">Nome e cognome<input type="text" id="pName" maxlength="80" value="${esc(me.full_name)}" autocomplete="name"></label>
      <div class="row end"><button class="btn primary" type="submit">Salva</button></div></form>
    ${ph ? `<section class="codebox"><div><div class="small">Il tuo codice studio</div><div class="code">${esc(me.code || "—")}</div></div>
      <div class="row"><button class="btn" data-act="copyCode">${I.copy}Copia</button>${navigator.share ? `<button class="btn" data-act="shareCode">${I.share}Invia</button>` : ""}</div></section>`
    : `<section class="card stack"><h2 style="margin:0">Il tuo fisioterapista</h2>
      ${S.physio ? `<div class="row"><span class="avatar">${esc(initials(S.physio.full_name))}</span><div class="grow"><b>${esc(S.physio.full_name)}</b><div class="small muted">${esc(S.physio.email || "")}</div></div></div>
        <p class="small muted" style="margin:0">Vede gli esercizi che registri, il dolore e le note.</p>
        <div><button class="btn danger" data-act="unlink">Scollegati</button></div>` : `<p style="margin:0">Nessun fisioterapista collegato. <a href="#/">Collegati con il codice studio</a>.</p>`}
      ${S.visits.length ? `<div><div class="small muted" style="margin-bottom:4px">Prossime sedute</div><ul class="feed">${S.visits.map(v => `<li><span>${esc(cap(dateTime(v.at)))}</span><span class="small muted">${esc(v.note || "")}</span></li>`).join("")}</ul></div>` : ""}
    </section>`}
    <section class="card stack"><h2 style="margin:0">Aspetto</h2>
      <div class="seg" role="group" aria-label="Tema"><button data-act="theme" data-v="auto" aria-pressed="${th === "auto"}">Automatico</button><button data-act="theme" data-v="light" aria-pressed="${th === "light"}">Giorno</button><button data-act="theme" data-v="dark" aria-pressed="${th === "dark"}">Notte</button></div></section>
    <section class="card stack"><h2 style="margin:0">Account e dati</h2>
      <div class="row">${ph ? "" : `<button class="btn" data-act="export">Scarica i miei dati</button>`}<button class="btn" data-act="logout">Esci</button></div>
      <p class="small muted" style="margin:0">Eliminando l’account cancelli in modo definitivo ${ph ? "la libreria, i programmi assegnati e i video caricati" : "il tuo diario e il collegamento con il fisioterapista"}.</p>
      <div><button class="btn danger" data-act="delAccount">Elimina account</button></div>
      <p class="tiny muted" style="margin:0"><a href="/privacy.html" target="_blank" rel="noopener">Informativa privacy</a></p></section>
  </div>`;
}

/* =====================================================================
   VISTE: fisioterapista
   ===================================================================== */
function viewPatients() {
  const rows = S.patients.map(p => ({ p, st: stats(p.id), v: S.visits.find(v => v.patient_id === p.id && new Date(v.at) > new Date(Date.now() - 4 * 3600e3)) }))
    .sort((a, b) => (b.st.alerts.length > 0) - (a.st.alerts.length > 0) || (a.v ? new Date(a.v.at) : 9e15) - (b.v ? new Date(b.v.at) : 9e15) || a.p.full_name.localeCompare(b.p.full_name));
  return `<div class="pagehead"><div><h1>I tuoi pazienti</h1><p>${S.patients.length ? `${S.patients.length} ${S.patients.length === 1 ? "paziente collegato" : "pazienti collegati"}` : "Ancora nessun paziente collegato"}</p></div></div>
  <div class="stack">
    <section class="codebox"><div><div class="small">Codice studio da dare ai pazienti</div><div class="code">${esc(S.me.code || "—")}</div><div class="small" style="opacity:.85">Il paziente si registra e lo inserisce: da quel momento lo trovi qui.</div></div>
      <div class="row"><button class="btn" data-act="copyCode">${I.copy}Copia</button>${navigator.share ? `<button class="btn" data-act="shareCode">${I.share}Invia</button>` : ""}</div></section>
    ${rows.length ? `<div class="plist">${rows.map(({ p, st, v }) => `<a class="pcard" href="#/paziente/${esc(p.id)}">
      <div class="row" style="flex-wrap:nowrap"><span class="avatar">${esc(initials(p.full_name))}</span><div class="grow"><div class="nm">${esc(p.full_name || p.email)}${p.id === S.me.id ? ` <span class="tiny muted">(tu)</span>` : ""}</div><div class="tiny muted">${v ? "Seduta " + esc(dateTime(v.at)) : "Nessuna seduta fissata"}</div></div>
        ${st.alerts.length ? `<span class="chip warn">${st.alerts.length === 1 ? "1 avviso" : st.alerts.length + " avvisi"}</span>` : ""}</div>
      <div class="kv"><div><b>${st.adh === null ? "–" : st.adh + "%"}</b><span>Costanza 7 gg</span></div><div><b>${st.pain7 === null ? "–" : dec(st.pain7)}</b><span>Dolore medio</span></div><div><b>${esc(st.last ? ago(st.last.date) : "—")}</b><span>Ultima volta</span></div></div>
      ${st.as.length ? "" : `<span class="small" style="color:var(--primary);font-weight:600">Assegna il primo esercizio →</span>`}</a>`).join("")}</div>`
    : `<div class="empty">Dai il codice studio ai tuoi pazienti: dopo la registrazione lo inseriscono nell’app e compaiono qui, pronti per ricevere gli esercizi.</div>`}
  </div>`;
}
function asgFormHtml(pid) {
  const f = ASG, exs = S.exercises;
  if (!exs.length) return `<section class="card stack" id="asgForm"><h2 style="margin:0">Assegna un esercizio</h2><p style="margin:0">La libreria è vuota: prima crea un esercizio con spiegazione e video.</p><div class="row"><a class="btn primary" href="#/libreria/nuovo">${I.plus}Nuovo esercizio</a><button class="btn ghost" data-act="asgCancel">Annulla</button></div></section>`;
  const groups = {}; exs.forEach(e => (groups[e.area] ??= []).push(e));
  return `<section class="card stack" id="asgForm"><h2 style="margin:0">${f.id ? "Modifica esercizio assegnato" : "Assegna un esercizio"}</h2>
    <label class="f">Esercizio<select id="asgEx" ${f.id ? "disabled" : ""}><option value="">Scegli dalla libreria…</option>${Object.keys(groups).sort().map(g => `<optgroup label="${esc(g)}">${groups[g].map(e => `<option value="${esc(e.id)}" ${e.id === f.exercise_id ? "selected" : ""}>${esc(e.title)}</option>`).join("")}</optgroup>`).join("")}</select></label>
    <div class="grid4">
      <label class="f">Serie<input type="number" inputmode="numeric" min="1" max="20" data-a="sets" value="${esc(f.sets ?? "")}"></label>
      <label class="f">Ripetizioni<input type="text" maxlength="30" data-a="reps" placeholder="12 · 8 per lato" value="${esc(f.reps ?? "")}"></label>
      <label class="f">Tenuta (s)<input type="number" inputmode="numeric" min="0" max="600" data-a="hold_s" value="${esc(f.hold_s ?? "")}"></label>
      <label class="f">Recupero (s)<input type="number" inputmode="numeric" min="0" max="600" data-a="rest_s" value="${esc(f.rest_s ?? "")}"></label>
    </div>
    <div><div class="row between" style="margin-bottom:6px"><span class="small muted">Giorni</span><span class="row" style="gap:4px"><button type="button" class="btn ghost" style="min-height:36px;padding:0 8px" data-act="dayPreset" data-v="all">Tutti</button><button type="button" class="btn ghost" style="min-height:36px;padding:0 8px" data-act="dayPreset" data-v="alt">Lun · Mer · Ven</button></span></div>
      <div class="days" role="group" aria-label="Giorni della settimana">${GG.map((g, i) => `<button type="button" class="toggle" data-act="day" data-d="${i + 1}" aria-pressed="${f.days.includes(i + 1)}" aria-label="${GG3[i]}">${g}</button>`).join("")}</div></div>
    <label class="f">Nota per il paziente <span class="hint">(facoltativa, la vede sopra l’esercizio)</span><textarea data-a="note" maxlength="1000" placeholder="Es. se il ginocchio fa male, riduci l’ampiezza">${esc(f.note || "")}</textarea></label>
    <div class="row end"><button class="btn ghost" data-act="asgCancel">Annulla</button><button class="btn primary" data-act="asgSave" data-pid="${esc(pid)}">${f.id ? "Salva" : "Assegna"}</button></div></section>`;
}
function viewPatient(pid) {
  const p = S.patients.find(x => x.id === pid);
  if (!p) return `<a class="back" href="#/pazienti">${I.back}Pazienti</a><div class="empty" style="margin-top:12px">Paziente non trovato: forse si è scollegato.</div>`;
  const st = stats(pid), now = Date.now() - 4 * 3600e3;
  const visits = S.visits.filter(v => v.patient_id === pid && new Date(v.at) > now);
  const prog = st.as;
  const wk = a => { let n = 0, e = 0; for (let i = 0; i < 7; i++) { const d = addDays(today(), -i); if (scheduled(a, d)) { e++; if (logsOf(a.id, d).length) n++; } } return e ? `${n}/${e}` : "–"; };
  const avgA = a => { const v = st.lg.filter(l => l.assignment_id === a.id && l.pain != null && l.date >= addDays(today(), -13)).map(l => l.pain); return v.length ? dec(v.reduce((x, y) => x + y, 0) / v.length) : "–"; };
  const dDelta = st.pain7 !== null && st.painPrev !== null ? st.pain7 - st.painPrev : null;
  return `<a class="back" href="#/pazienti">${I.back}Pazienti</a>
  <div class="pagehead" style="margin-top:6px"><div><h1>${esc(p.full_name || p.email)}</h1><p>${esc(p.email || "")} · collegato dal ${esc(nice(localDate(p.created_at)))}</p></div>
    <div class="row"><button class="btn" data-act="visitOpen" data-pid="${esc(pid)}">${I.cal}Fissa seduta</button><button class="btn primary" data-act="asgOpen" data-pid="${esc(pid)}">${I.plus}Assegna esercizio</button></div></div>
  <div class="stack">
    ${st.alerts.slice(0, 3).map(l => `<div class="alertbox">${I.alert}<span><b>${cap(esc(niceDay(l.date)))} · ${esc(l.title)}: dolore ${l.pain}/10.</b>${l.feelings && l.feelings.length ? " " + esc(l.feelings.join(", ")) + "." : ""}${l.note ? ` Nota: “${esc(l.note)}”` : ""}</span></div>`).join("")}
    <div class="tiles">
      <div class="tile"><b>${st.adh === null ? "–" : st.adh + "%"}</b><span>Costanza, ultimi 7 giorni${st.exp ? ` · ${st.done} esercizi su ${st.exp}` : ""}</span></div>
      <div class="tile"><b>${st.pain7 === null ? "–" : dec(st.pain7)}${dDelta !== null && Math.abs(dDelta) >= .3 ? ` <span class="delta ${dDelta < 0 ? "down" : "up"}">${dDelta < 0 ? "↓" : "↑"}</span>` : ""}</b><span>Dolore medio, 7 giorni${st.painPrev !== null ? " · prima " + dec(st.painPrev) : ""}</span></div>
      <div class="tile"><b>${st.last ? esc(cap(ago(st.last.date))) : "—"}</b><span>Ultima registrazione${st.last && st.last.created_at ? " · " + hhmm(st.last.created_at) : ""}</span></div>
      <div class="tile"><b>${visits[0] ? esc(GG3[dow(localDate(visits[0].at)) - 1] + " " + parse(localDate(visits[0].at)).getDate()) : "—"}</b><span>${visits[0] ? "Prossima seduta · " + hhmm(visits[0].at) : "Nessuna seduta fissata"}</span></div>
    </div>
    ${VISIT && VISIT.pid === pid ? `<form id="visitForm" class="card stack"><h2 style="margin:0">Fissa una seduta</h2><div class="grid2">
        <label class="f">Data e ora<input type="datetime-local" id="vAt" required value="${esc(VISIT.at)}"></label>
        <label class="f">Nota <span class="hint">(la vede il paziente)</span><input type="text" id="vNote" maxlength="300" placeholder="Es. porta le scarpe da corsa" value="${esc(VISIT.note)}"></label></div>
        <div class="row end"><button class="btn ghost" type="button" data-act="visitCancel">Annulla</button><button class="btn primary" type="submit">Salva seduta</button></div></form>` : ""}
    ${visits.length ? `<section class="card"><h2>Sedute in programma</h2><ul class="feed">${visits.map(v => `<li><span><b>${esc(cap(dateTime(v.at)))}</b>${v.note ? `<span class="small muted"> · ${esc(v.note)}</span>` : ""}</span><button class="x" data-act="visitDel" data-id="${esc(v.id)}" aria-label="Elimina la seduta di ${esc(dateTime(v.at))}">${I.trash}</button></li>`).join("")}</ul></section>` : ""}
    <div class="grid2" style="align-items:start">
      <section class="card"><h2>Dolore, ultimi 14 giorni</h2>${painChart(st.lg)}</section>
      <section class="card"><h2>Diario recente</h2>${st.lg.length ? `<ul class="feed">${st.lg.slice(0, 12).map((l, i, arr) => (i === 0 || arr[i - 1].date !== l.date ? `<li style="border-top:0;padding-bottom:0"><span class="small muted" style="font-weight:600">${esc(cap(niceDay(l.date)))}</span></li>` : "") + logLine(l)).join("")}</ul>`
        : `<div class="empty">Ancora nessuna registrazione.</div>`}</section>
    </div>
    ${ASG && ASG.pid === pid ? asgFormHtml(pid) : ""}
    <section class="card"><div class="row between" style="margin-bottom:8px"><h2 style="margin:0">Programma</h2>${ASG && ASG.pid === pid ? "" : `<button class="btn soft" data-act="asgOpen" data-pid="${esc(pid)}">${I.plus}Assegna</button>`}</div>
      ${prog.length ? `<div class="tablebox"><table class="t"><thead><tr><th>Esercizio</th><th>Prescrizione</th><th>Giorni</th><th>Fatto 7 gg</th><th>Dolore 14 gg</th><th><span class="sr">Azioni</span></th></tr></thead><tbody>
        ${prog.map((a, i) => { const ex = exById(a.exercise_id) || { title: "Esercizio eliminato" }; return `<tr><td><a href="#/libreria/${esc(a.exercise_id)}" style="font-weight:600;color:var(--ink)">${esc(ex.title)}</a>${a.note ? `<div class="tiny muted">${esc(a.note)}</div>` : ""}</td><td>${esc(presc(a, ex).join(" · ") || "—")}</td><td>${esc(daysTxt(a.days))}</td><td>${wk(a)}</td><td>${avgA(a)}</td>
          <td><div class="acts"><button class="x" data-act="asgMove" data-dir="-1" data-id="${esc(a.id)}" ${i === 0 ? "disabled" : ""} aria-label="Sposta su ${esc(ex.title)}">${I.up}</button><button class="x" data-act="asgMove" data-dir="1" data-id="${esc(a.id)}" ${i === prog.length - 1 ? "disabled" : ""} aria-label="Sposta giù ${esc(ex.title)}">${I.down}</button><button class="x" data-act="asgEdit" data-id="${esc(a.id)}" aria-label="Modifica ${esc(ex.title)}">${I.edit}</button><button class="x" data-act="asgDel" data-id="${esc(a.id)}" aria-label="Togli ${esc(ex.title)} dal programma" style="color:var(--alert)">${I.trash}</button></div></td></tr>`; }).join("")}
      </tbody></table></div>` : `<div class="empty">Nessun esercizio assegnato. Sceglili dalla libreria con “Assegna”.</div>`}</section>
    <div><button class="btn ghost danger" data-act="removePatient" data-pid="${esc(pid)}">Togli ${esc(firstName(p.full_name) || "il paziente")} dai tuoi pazienti</button></div>
  </div>`;
}
const assignedCount = eid => new Set(S.assignments.filter(a => a.exercise_id === eid).map(a => a.patient_id)).size;
function libCards() {
  const q = LIB.q.trim().toLowerCase();
  const list = S.exercises.filter(e => (!LIB.area || e.area === LIB.area) && (!q || (e.title + " " + e.description + " " + e.area).toLowerCase().includes(q)));
  if (!list.length) return `<div class="empty">${S.exercises.length ? "Nessun esercizio corrisponde alla ricerca." : "La libreria è vuota. Crea il primo esercizio: spiegazione, passaggi e un video dimostrativo che i pazienti rivedono a casa."}</div>`;
  return `<div class="libgrid">${list.map(e => { const n = assignedCount(e.id); return `<a class="lcard" href="#/libreria/${esc(e.id)}"><span class="lv">${e.video_path || e.video_url ? I.play : I.video}</span>
    <span class="lb"><b>${esc(e.title)}</b><span class="chips"><span class="chip">${esc(e.area)}</span>${e.video_path ? `<span class="chip">Video</span>` : e.video_url ? `<span class="chip">Link video</span>` : `<span class="chip warn">Senza video</span>`}</span>
    <span class="small muted">${esc(presc({}, e).join(" · ") || "Nessuna prescrizione predefinita")}</span><span class="tiny muted">${n ? `Assegnato a ${n} ${n === 1 ? "paziente" : "pazienti"}` : "Non ancora assegnato"}</span></span></a>`; }).join("")}</div>`;
}
function viewLibrary() {
  const areas = [...new Set(S.exercises.map(e => e.area))].sort();
  return `<div class="pagehead"><div><h1>Libreria esercizi</h1><p>Spiegazioni e video che i pazienti ritrovano a casa</p></div><a class="btn primary" href="#/libreria/nuovo">${I.plus}Nuovo esercizio</a></div>
    ${S.exercises.length ? `<div class="libtools"><label class="sr" for="libq">Cerca un esercizio</label><input class="search" type="search" id="libq" placeholder="Cerca per nome o descrizione" value="${esc(LIB.q)}">
      <label class="sr" for="libArea">Zona</label><select class="search" id="libArea" style="flex:0 1 220px"><option value="">Tutte le zone</option>${areas.map(a => `<option ${a === LIB.area ? "selected" : ""}>${esc(a)}</option>`).join("")}</select></div>` : ""}
    <div id="libgrid">${libCards()}</div>`;
}
function viewExercise(id) {
  const e = exById(id);
  if (!e) return `<a class="back" href="#/libreria">${I.back}Libreria</a><div class="empty" style="margin-top:12px">Esercizio non trovato.</div>`;
  const steps = String(e.steps || "").split("\n").map(s => s.trim()).filter(Boolean);
  const who = [...new Set(S.assignments.filter(a => a.exercise_id === id).map(a => a.patient_id))].map(pid => S.patients.find(p => p.id === pid)).filter(Boolean);
  const free = S.patients.filter(p => !who.includes(p));
  return `<a class="back" href="#/libreria">${I.back}Libreria</a>
  <div class="stack" style="margin-top:6px;max-width:760px">
    ${videoHtml(e)}
    <div class="row between"><div><h1 style="font-size:32px">${esc(e.title)}</h1><div class="chips" style="margin-top:8px"><span class="chip">${esc(e.area)}</span>${presc({}, e).map(p => `<span class="chip">${esc(p)}</span>`).join("")}</div></div>
      <div class="row"><a class="btn" href="#/libreria/${esc(id)}/modifica">${I.edit}Modifica</a></div></div>
    ${e.description ? `<section><h2 style="font-size:19px;margin-bottom:6px">A cosa serve</h2><p class="prose">${esc(e.description)}</p></section>` : ""}
    ${steps.length ? `<section><h2 style="font-size:19px;margin-bottom:6px">Come si fa</h2><ol class="steps">${steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol></section>` : ""}
    ${e.cautions ? `<div class="alertbox">${I.alert}<span><b>Attenzione.</b> <span class="prose" style="display:inline">${esc(e.cautions)}</span></span></div>` : ""}
    <section class="card stack"><h2 style="margin:0">Assegnato a</h2>
      ${who.length ? `<div class="chips">${who.map(p => `<a class="chip" href="#/paziente/${esc(p.id)}" style="text-decoration:none">${esc(p.full_name || p.email)}</a>`).join("")}</div>` : `<p class="small muted" style="margin:0">Nessun paziente.</p>`}
      ${free.length ? `<div class="row"><label class="sr" for="assignTo">Paziente</label><select class="search" id="assignTo" style="flex:1 1 220px;width:auto">${free.map(p => `<option value="${esc(p.id)}">${esc(p.full_name || p.email)}</option>`).join("")}</select><button class="btn primary" data-act="assignFromLib" data-eid="${esc(id)}">Assegna</button></div>` : ""}
    </section>
    <div><button class="btn ghost danger" data-act="exDel" data-id="${esc(id)}">${I.trash}Elimina esercizio</button></div>
  </div>`;
}
function exDraft(id) {
  if (EXD && EXD.key === (id || "new")) return EXD;
  const e = id ? exById(id) : null;
  EXD = { key: id || "new", id: id || null, title: e ? e.title : "", area: e ? e.area : "Lombare", description: e ? e.description : "", steps: e ? e.steps : "", cautions: e ? e.cautions : "",
    sets: e ? e.sets ?? "" : 3, reps: e ? e.reps ?? "" : "10", hold_s: e ? e.hold_s ?? "" : "", rest_s: e ? e.rest_s ?? "" : 45,
    vmode: e ? (e.video_path ? "file" : e.video_url ? "link" : "none") : "file", video_path: e ? e.video_path : null, video_url: e ? e.video_url || "" : "", file: null, busy: false, pct: 0 };
  return EXD;
}
function viewExEdit(id) {
  if (id && !exById(id)) return `<a class="back" href="#/libreria">${I.back}Libreria</a><div class="empty" style="margin-top:12px">Esercizio non trovato.</div>`;
  const d = exDraft(id);
  const fileBox = `<div class="stack">
      ${d.video_path && !d.file ? `${videoHtml({ video_path: d.video_path, title: d.title })}<p class="small muted" style="margin:0">Video caricato. Puoi sostituirlo con un altro file.</p>` : ""}
      ${d.file ? `<div class="note"><b>File scelto</b>${esc(d.file.name)} · ${dec(d.file.size / 1048576)} MB</div>` : ""}
      <label class="btn" style="align-self:flex-start">${I.video}${d.video_path || d.file ? "Scegli un altro video" : "Scegli il video"}<input type="file" id="vfile" accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*" hidden></label>
      <p class="tiny muted" style="margin:0">MP4, MOV o WebM fino a 50 MB. Dal telefono puoi registrarlo al momento. Per video più lunghi usa un link YouTube non in elenco.</p>
      <div class="bar" id="vbar" ${d.busy ? "" : "hidden"} role="progressbar" aria-label="Caricamento del video" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(d.pct * 100)}"><span style="width:${d.pct * 100}%"></span></div></div>`;
  const linkBox = `<label class="f">Link al video<input type="url" inputmode="url" data-f="video_url" maxlength="500" placeholder="https://youtu.be/… oppure https://vimeo.com/…" value="${esc(d.video_url)}"><span class="hint">YouTube (anche “non in elenco”) o Vimeo: il video si vede dentro l’app.</span></label>`;
  return `<a class="back" href="${id ? "#/libreria/" + esc(id) : "#/libreria"}">${I.back}${id ? "Esercizio" : "Libreria"}</a>
  <div class="pagehead" style="margin-top:6px"><div><h1>${id ? "Modifica esercizio" : "Nuovo esercizio"}</h1><p>Quello che scrivi qui lo legge il paziente, a casa, prima di iniziare.</p></div></div>
  <form id="exForm" class="stack" style="max-width:760px" novalidate>
    <section class="card stack"><h2 style="margin:0">Esercizio</h2>
      <div class="grid2"><label class="f">Nome<input type="text" data-f="title" maxlength="80" required placeholder="Es. Bird dog" value="${esc(d.title)}"></label>
        <label class="f">Zona<select data-f="area">${AREAS.map(a => `<option ${a === d.area ? "selected" : ""}>${esc(a)}</option>`).join("")}</select></label></div>
      <label class="f">A cosa serve <span class="hint">Spiega in parole semplici perché lo fa.</span><textarea data-f="description" maxlength="4000" placeholder="Rinforza i muscoli che stabilizzano la schiena e migliora il controllo del bacino.">${esc(d.description)}</textarea></label>
      <label class="f">Come si fa <span class="hint">Un passaggio per riga: diventa un elenco numerato.</span><textarea data-f="steps" maxlength="4000" style="min-height:140px" placeholder="Mettiti a quattro zampe, mani sotto le spalle e ginocchia sotto le anche.&#10;Allunga il braccio destro e la gamba sinistra senza inarcare la schiena.&#10;Tieni 3 secondi, poi torna giù lentamente e cambia lato.">${esc(d.steps)}</textarea></label>
      <label class="f">Attenzione <span class="hint">(facoltativo) Quando fermarsi o cosa evitare.</span><textarea data-f="cautions" maxlength="2000" style="min-height:72px" placeholder="Se senti dolore che scende lungo la gamba, fermati e scrivimelo nella nota.">${esc(d.cautions)}</textarea></label>
    </section>
    <section class="card stack"><h2 style="margin:0">Prescrizione di partenza</h2><p class="small muted" style="margin:-6px 0 0">Si può cambiare per ogni paziente quando lo assegni.</p>
      <div class="grid4"><label class="f">Serie<input type="number" inputmode="numeric" min="1" max="20" data-f="sets" value="${esc(d.sets)}"></label>
        <label class="f">Ripetizioni<input type="text" maxlength="30" data-f="reps" placeholder="12 · 8 per lato" value="${esc(d.reps)}"></label>
        <label class="f">Tenuta (s)<input type="number" inputmode="numeric" min="0" max="600" data-f="hold_s" value="${esc(d.hold_s)}"></label>
        <label class="f">Recupero (s)<input type="number" inputmode="numeric" min="0" max="600" data-f="rest_s" value="${esc(d.rest_s)}"></label></div>
    </section>
    <section class="card stack"><h2 style="margin:0">Video dimostrativo</h2>
      <div class="seg" role="group" aria-label="Tipo di video"><button type="button" data-act="vmode" data-v="file" aria-pressed="${d.vmode === "file"}">Carica un file</button><button type="button" data-act="vmode" data-v="link" aria-pressed="${d.vmode === "link"}">Link</button><button type="button" data-act="vmode" data-v="none" aria-pressed="${d.vmode === "none"}">Nessuno</button></div>
      ${d.vmode === "file" ? fileBox : d.vmode === "link" ? linkBox : `<p class="small muted" style="margin:0">Il paziente vedrà solo il testo.</p>`}
    </section>
    <div class="row end"><a class="btn ghost" href="${id ? "#/libreria/" + esc(id) : "#/libreria"}">Annulla</a><button class="btn primary" type="submit" id="exSave" ${d.busy ? "disabled" : ""}>${d.busy ? "Caricamento…" : id ? "Salva modifiche" : "Salva nella libreria"}</button></div>
  </form>`;
}
async function saveExercise() {
  const d = EXD; if (!d || d.busy) return;
  const title = d.title.trim().slice(0, 80);
  if (!title) { toast("Dai un nome all’esercizio"); app.querySelector('[data-f="title"]')?.focus(); return; }
  if (d.vmode === "link" && d.video_url.trim() && !isHttp(d.video_url)) { toast("Il link deve iniziare con https://"); return; }
  if (d.vmode === "file" && !d.file && !d.video_path) { toast("Scegli un video oppure seleziona “Nessuno”"); return; }
  const orig = d.id ? exById(d.id) : null, oldPath = orig ? orig.video_path : null;
  const btn = document.getElementById("exSave"), bar = document.getElementById("vbar");
  d.busy = true; if (btn) { btn.disabled = true; btn.textContent = d.file ? "Caricamento del video…" : "Salvo…"; }
  try {
    let path = d.vmode === "file" ? d.video_path : null;
    if (d.vmode === "file" && d.file) {
      if (bar) bar.hidden = false;
      path = await uploadVideo(d.file, p => { d.pct = p; if (bar) { bar.firstElementChild.style.width = (p * 100) + "%"; bar.setAttribute("aria-valuenow", Math.round(p * 100)); } if (btn) btn.textContent = `Caricamento ${Math.round(p * 100)}%`; });
    }
    const body = { title, area: d.area, description: d.description.trim(), steps: d.steps.trim(), cautions: d.cautions.trim(),
      sets: int(d.sets, 1, 20), reps: String(d.reps || "").trim().slice(0, 30) || null, hold_s: int(d.hold_s, 0, 600), rest_s: int(d.rest_s, 0, 600),
      video_path: path, video_url: d.vmode === "link" && d.video_url.trim() ? d.video_url.trim() : null, updated_at: new Date().toISOString() };
    let row;
    if (d.id) row = (await sbFetch(`/rest/v1/exercises?id=eq.${d.id}`, { method: "PATCH", body, prefer: "return=representation" }))[0];
    else row = (await sbFetch("/rest/v1/exercises", { method: "POST", body, prefer: "return=representation" }))[0];
    if (oldPath && oldPath !== row.video_path) deleteVideo(oldPath);
    if (d.file && path !== row.video_path) deleteVideo(path);
    S.exercises = [...S.exercises.filter(e => e.id !== row.id), row].sort((a, b) => a.title.localeCompare(b.title)); saveCache();
    EXD = null; toast(d.id ? "Esercizio aggiornato" : "Esercizio aggiunto alla libreria");
    if (ASG && !ASG.exercise_id && !d.id) { ASG = asgFrom(row, ASG.pid); go("paziente/" + ASG.pid); } else go("libreria/" + row.id);
  } catch (e) {
    d.busy = false; d.pct = 0; render();
    toast(e.offline ? "Sei offline: riprova quando sei connesso" : "Non salvato: " + e.message);
  }
}
function asgFrom(ex, pid, a) {
  return { pid, id: a ? a.id : null, exercise_id: ex ? ex.id : "", sets: a ? a.sets ?? ex?.sets ?? "" : ex?.sets ?? "", reps: a ? a.reps ?? ex?.reps ?? "" : ex?.reps ?? "",
    hold_s: a ? a.hold_s ?? ex?.hold_s ?? "" : ex?.hold_s ?? "", rest_s: a ? a.rest_s ?? ex?.rest_s ?? "" : ex?.rest_s ?? "", days: a ? [...a.days] : [1, 2, 3, 4, 5, 6, 7], note: a ? a.note : "" };
}
async function saveAssignment(pid) {
  const f = ASG; if (!f) return;
  if (!f.exercise_id) { toast("Scegli un esercizio dalla libreria"); document.getElementById("asgEx")?.focus(); return; }
  if (!f.days.length) { toast("Scegli almeno un giorno"); return; }
  const body = { sets: int(f.sets, 1, 20), reps: String(f.reps || "").trim().slice(0, 30) || null, hold_s: int(f.hold_s, 0, 600), rest_s: int(f.rest_s, 0, 600),
    days: [...f.days].sort(), note: String(f.note || "").trim().slice(0, 1000) };
  try {
    let row;
    if (f.id) row = (await sbFetch(`/rest/v1/assignments?id=eq.${f.id}`, { method: "PATCH", body, prefer: "return=representation" }))[0];
    else {
      const pos = Math.max(-1, ...S.assignments.filter(a => a.patient_id === pid).map(a => a.position)) + 1;
      row = (await sbFetch("/rest/v1/assignments", { method: "POST", body: { ...body, patient_id: pid, exercise_id: f.exercise_id, position: pos }, prefer: "return=representation" }))[0];
    }
    S.assignments = [...S.assignments.filter(a => a.id !== row.id), row].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)); saveCache();
    ASG = null; render(); toast(f.id ? "Programma aggiornato" : "Esercizio assegnato");
  } catch (e) { toast(e.offline ? "Sei offline: riprova quando sei connesso" : "Non salvato: " + e.message); }
}

/* =====================================================================
   EVENTI
   ===================================================================== */
const pressGroup = (btn, on) => btn.setAttribute("aria-pressed", String(on));
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act;
  // --- accesso
  if (a === "gate") { const em = document.getElementById("gEmail"); GATE.email = em ? em.value : GATE.email; GATE.mode = b.dataset.v; AUTHMSG = null; render(); return; }
  if (a === "role") { GATE.role = b.dataset.v; const n = document.getElementById("gName"), em = document.getElementById("gEmail"); if (n) GATE.name = n.value; if (em) GATE.email = em.value; render(); return; }
  if (a === "retry") { LOADERR = null; render(); refresh(); return; }
  if (a === "logout") { if (!S.ready || confirm("Uscire dall’account?")) signOut(); return; }
  // --- paziente: registrazione
  const aid = b.dataset.aid;
  if (a === "sets") { const dr = LOGD[route()[1]]; if (!dr) return; const n = +b.dataset.n; dr.sets_done = dr.sets_done === n ? n - 1 : n;
    b.parentElement.querySelectorAll("button").forEach((x, i) => { const on = i < dr.sets_done; pressGroup(x, on); x.innerHTML = on ? I.check : String(i + 1); }); return; }
  if (a === "pain") { const dr = LOGD[route()[1]]; if (!dr) return; dr.pain = +b.dataset.v; b.parentElement.querySelectorAll("button").forEach(x => pressGroup(x, x === b)); return; }
  if (a === "feel") { const dr = LOGD[route()[1]]; if (!dr) return; const v = b.dataset.v, on = !dr.feelings.includes(v);
    if (v === "Nessun fastidio" && on) { dr.feelings = [v]; b.parentElement.querySelectorAll("button").forEach(x => pressGroup(x, x === b)); return; }
    dr.feelings = on ? [...dr.feelings.filter(x => x !== "Nessun fastidio"), v] : dr.feelings.filter(x => x !== v);
    b.parentElement.querySelectorAll("button").forEach(x => pressGroup(x, dr.feelings.includes(x.dataset.v))); return; }
  if (a === "saveLog") { b.disabled = true; await saveLog(aid); b.disabled = false; return; }
  if (a === "editLog") { const l = S.logs.find(x => x.id === b.dataset.id); if (!l) return; LOGD[aid] = { id: l.id, sets_done: l.sets_done, pain: l.pain, feelings: [...(l.feelings || [])], note: l.note || "", open: true }; render(); document.getElementById("logTitle")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (a === "newLog") { LOGD[aid] = { id: null, sets_done: 0, pain: null, feelings: [], note: "", open: true }; render(); document.getElementById("logTitle")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (a === "cancelLog") { delete LOGD[aid]; LOGD[aid] = { id: null, sets_done: 0, pain: null, feelings: [], note: "", open: false }; render(); return; }
  if (a === "delLog") { if (!confirm("Eliminare questa registrazione? Sparisce anche dal diario del fisioterapista.")) return;
    try { await sbFetch(`/rest/v1/logs?id=eq.${b.dataset.id}`, { method: "DELETE" }); } catch (err) { if (!outbox().some(o => o.id === b.dataset.id)) return toast(err.offline ? "Sei offline: riprova quando sei connesso" : "Non eliminata: " + err.message); }
    setOutbox(outbox().filter(o => o.id !== b.dataset.id)); S.logs = S.logs.filter(l => l.id !== b.dataset.id); saveCache(); render(); toast("Registrazione eliminata"); return; }
  // --- vista admin
  if (a === "switchView") { if (S.me && S.me.is_admin && b.dataset.v !== VIEW) switchView(b.dataset.v); return; }
  // --- profilo
  if (a === "theme") { setTheme(b.dataset.v); render(); return; }
  if (a === "copyCode") { try { await navigator.clipboard.writeText(S.me.code); toast("Codice copiato"); } catch (err) { toast("Codice: " + S.me.code); } return; }
  if (a === "shareCode") { try { await navigator.share({ title: "FisioLog", text: `Per seguire i tuoi esercizi a casa scarica FisioLog da ${location.origin}, crea un account da paziente e inserisci il codice studio ${S.me.code}.` }); } catch (err) {} return; }
  if (a === "unlink") { if (!confirm(`Scollegarti da ${S.physio ? S.physio.full_name : "il fisioterapista"}? Non vedrà più il tuo diario e il programma sparirà dall’app.`)) return;
    try { await sbFetch("/rest/v1/rpc/unlink_physio", { method: "POST", body: {} }); S.me.physio_id = null; S.physio = null; S.assignments = []; saveCache(); go(""); toast("Scollegato"); refresh(true); } catch (err) { toast(err.offline ? "Sei offline" : err.message); } return; }
  if (a === "export") {
    const blob = new Blob([JSON.stringify({ app: "fisiolog", exported: new Date().toISOString(), profilo: S.me, fisioterapista: S.physio, programma: S.assignments, diario: S.logs, sedute: S.visits }, null, 2)], { type: "application/json" });
    const u = URL.createObjectURL(blob), l = document.createElement("a"); l.href = u; l.download = `fisiolog-${today()}.json`; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000); return; }
  if (a === "delAccount") {
    if (!confirm("Eliminare l’account? Tutti i tuoi dati verranno cancellati e non si possono recuperare.")) return;
    if (prompt("Per confermare scrivi ELIMINA") !== "ELIMINA") return;
    try {
      if (S.me.role === "physio") {
        const exs = S.exercises.length ? S.exercises : await sbFetch(`/rest/v1/exercises?physio_id=eq.${S.me.id}&select=video_path`).catch(() => []);
        for (const ex of exs) if (ex.video_path) await deleteVideo(ex.video_path);
      }
      await sbFetch("/rest/v1/rpc/delete_my_account", { method: "POST", body: {} });
      try { localStorage.removeItem(cacheKey()); localStorage.removeItem(obKey()); } catch (err) {}
      setAuth(null); resetData(); go(""); render(); toast("Account eliminato");
    } catch (err) { toast(err.offline ? "Sei offline" : "Non eliminato: " + err.message); } return; }
  // --- fisio: programma
  const pid = b.dataset.pid;
  if (a === "asgOpen") { ASG = asgFrom(null, pid); render(); document.getElementById("asgForm")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (a === "asgCancel") { ASG = null; render(); return; }
  if (a === "asgEdit") { const x = S.assignments.find(y => y.id === b.dataset.id); if (!x) return; ASG = asgFrom(exById(x.exercise_id), x.patient_id, x); render(); document.getElementById("asgForm")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (a === "day") { if (!ASG) return; const d = +b.dataset.d; ASG.days = ASG.days.includes(d) ? ASG.days.filter(x => x !== d) : [...ASG.days, d]; pressGroup(b, ASG.days.includes(d)); return; }
  if (a === "dayPreset") { if (!ASG) return; ASG.days = b.dataset.v === "all" ? [1, 2, 3, 4, 5, 6, 7] : [1, 3, 5]; document.querySelectorAll('[data-act="day"]').forEach(x => pressGroup(x, ASG.days.includes(+x.dataset.d))); return; }
  if (a === "asgSave") { b.disabled = true; await saveAssignment(pid); b.disabled = false; return; }
  if (a === "asgDel") { const x = S.assignments.find(y => y.id === b.dataset.id); if (!x) return; const ex = exById(x.exercise_id);
    if (!confirm(`Togliere “${ex ? ex.title : "l’esercizio"}” dal programma? Il diario già registrato resta.`)) return;
    try { await sbFetch(`/rest/v1/assignments?id=eq.${x.id}`, { method: "DELETE" }); S.assignments = S.assignments.filter(y => y.id !== x.id); saveCache(); render(); toast("Tolto dal programma"); } catch (err) { toast(err.offline ? "Sei offline" : err.message); } return; }
  if (a === "asgMove") { const x = S.assignments.find(y => y.id === b.dataset.id); if (!x) return;
    const list = S.assignments.filter(y => y.patient_id === x.patient_id), i = list.indexOf(x), j = i + +b.dataset.dir; if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]]; const ch = list.map((y, k) => ({ y, k })).filter(({ y, k }) => y.position !== k);
    ch.forEach(({ y, k }) => y.position = k); S.assignments.sort((p, q) => p.position - q.position || p.created_at.localeCompare(q.created_at)); render();
    try { await Promise.all(ch.map(({ y, k }) => sbFetch(`/rest/v1/assignments?id=eq.${y.id}`, { method: "PATCH", body: { position: k }, prefer: "return=minimal" }))); saveCache(); } catch (err) { toast("Ordine non salvato"); refresh(true); } return; }
  if (a === "visitOpen") { const d = new Date(Date.now() + 864e5); d.setHours(9, 0, 0, 0); VISIT = { pid, at: `${fmt(d)}T09:00`, note: "" }; render(); document.getElementById("vAt")?.focus(); return; }
  if (a === "visitCancel") { VISIT = null; render(); return; }
  if (a === "visitDel") { if (!confirm("Eliminare questa seduta?")) return;
    try { await sbFetch(`/rest/v1/visits?id=eq.${b.dataset.id}`, { method: "DELETE" }); S.visits = S.visits.filter(v => v.id !== b.dataset.id); saveCache(); render(); } catch (err) { toast(err.offline ? "Sei offline" : err.message); } return; }
  if (a === "removePatient") { const p = S.patients.find(x => x.id === pid); if (!p || !confirm(`Togliere ${p.full_name || p.email} dai tuoi pazienti? Non vedrai più il suo diario. Potrà ricollegarsi con il codice studio.`)) return;
    try { await sbFetch("/rest/v1/rpc/remove_patient", { method: "POST", body: { p: pid } }); S.patients = S.patients.filter(x => x.id !== pid); S.logs = S.logs.filter(l => l.patient_id !== pid); saveCache(); go("pazienti"); toast("Paziente tolto"); } catch (err) { toast(err.offline ? "Sei offline" : err.message); } return; }
  // --- fisio: libreria
  if (a === "vmode") { if (!EXD || EXD.busy) return; EXD.vmode = b.dataset.v; render(); return; }
  if (a === "assignFromLib") { const p = document.getElementById("assignTo").value, ex = exById(b.dataset.eid); ASG = asgFrom(ex, p); go("paziente/" + p); setTimeout(() => document.getElementById("asgForm")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); return; }
  if (a === "exDel") { const ex = exById(b.dataset.id); if (!ex) return; const n = assignedCount(ex.id);
    if (!confirm(`Eliminare “${ex.title}”?${n ? ` Sparisce anche dal programma di ${n} ${n === 1 ? "paziente" : "pazienti"}.` : ""} Il diario già registrato resta.`)) return;
    try { await sbFetch(`/rest/v1/exercises?id=eq.${ex.id}`, { method: "DELETE" }); deleteVideo(ex.video_path);
      S.exercises = S.exercises.filter(x => x.id !== ex.id); S.assignments = S.assignments.filter(x => x.exercise_id !== ex.id); saveCache(); go("libreria"); toast("Esercizio eliminato"); }
    catch (err) { toast(err.offline ? "Sei offline" : err.message); } return; }
});
document.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "logNote") { const dr = LOGD[t.dataset.aid]; if (dr) dr.note = t.value; return; }
  if (t.dataset.f && EXD) { EXD[t.dataset.f] = t.value; return; }
  if (t.dataset.a && ASG) { ASG[t.dataset.a] = t.value; return; }
  if (t.id === "libq") { LIB.q = t.value; document.getElementById("libgrid").innerHTML = libCards(); return; }
  if (t.id === "vNote" && VISIT) VISIT.note = t.value;
  if (t.id === "vAt" && VISIT) VISIT.at = t.value;
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "libArea") { LIB.area = t.value; document.getElementById("libgrid").innerHTML = libCards(); return; }
  if (t.dataset.f === "area" && EXD) { EXD.area = t.value; return; }
  if (t.id === "asgEx" && ASG) { const ex = exById(t.value); const keep = { pid: ASG.pid, days: ASG.days, note: ASG.note }; ASG = { ...asgFrom(ex, keep.pid), days: keep.days, note: keep.note }; render(); document.getElementById("asgEx")?.focus(); return; }
  if (t.id === "vfile" && EXD) {
    const f = t.files && t.files[0]; if (!f) return;
    if (f.type && !f.type.startsWith("video/")) { toast("Scegli un file video"); t.value = ""; return; }
    if (f.size > MAX_VIDEO) { toast(`Il video è di ${dec(f.size / 1048576)} MB: il limite è 50 MB. Accorcialo o usa un link YouTube.`); t.value = ""; return; }
    EXD.file = f; render(); return;
  }
});
document.addEventListener("submit", async e => {
  const f = e.target; e.preventDefault();
  if (f.id === "authForm") {
    const email = document.getElementById("gEmail").value.trim(), pwEl = document.getElementById("gPw"), pw = pwEl ? pwEl.value : "";
    const btn = f.querySelector('[type="submit"]'); GATE.email = email;
    if (!/^\S+@\S+\.\S+$/.test(email)) { AUTHMSG = { text: "Scrivi un indirizzo email valido.", err: true }; return render(); }
    try {
      btn.disabled = true;
      if (GATE.mode === "recover") { await recover(email); AUTHMSG = { text: "Se l’indirizzo è registrato, ti abbiamo mandato un link per scegliere una nuova password." }; GATE.mode = "login"; return render(); }
      if (pw.length < 8) { AUTHMSG = { text: "La password deve avere almeno 8 caratteri.", err: true }; return render(); }
      if (GATE.mode === "signup") {
        const name = document.getElementById("gName").value.trim(); GATE.name = name;
        if (!name) { AUTHMSG = { text: "Scrivi nome e cognome: li vede il tuo " + (GATE.role === "patient" ? "fisioterapista." : "paziente."), err: true }; return render(); }
        if (!document.getElementById("gConsent").checked) { AUTHMSG = { text: "Per continuare serve il consenso.", err: true }; return render(); }
        const r = await signUp(email, pw, { role: GATE.role, full_name: name, consent: "true" });
        if (r === "confirm") { AUTHMSG = { text: "Account creato. Ti abbiamo mandato un’email: apri il link per confermare, poi accedi qui." }; GATE.mode = "login"; return render(); }
      } else await signIn(email, pw);
      AUTHMSG = null; GATE.name = ""; render(); await refresh();
    } catch (err) { AUTHMSG = { text: authMessage(err), err: true }; render(); }
    return;
  }
  if (f.id === "newPwForm") {
    const pw = document.getElementById("npw").value;
    if (pw.length < 8) { AUTHMSG = { text: "La password deve avere almeno 8 caratteri.", err: true }; return render(); }
    try { await sbFetch("/auth/v1/user", { method: "PUT", body: { password: pw } }); RECOVERY = false; AUTHMSG = null; toast("Password aggiornata"); render(); refresh(); }
    catch (err) { AUTHMSG = { text: authMessage(err), err: true }; render(); }
    return;
  }
  if (f.id === "linkForm") {
    const code = document.getElementById("lCode").value.trim().toUpperCase();
    if (code.length !== 6) { LINKMSG = { text: "Il codice ha 6 caratteri.", err: true }; return render(); }
    try { const r = await sbFetch("/rest/v1/rpc/link_physio", { method: "POST", body: { p_code: code } }); LINKMSG = null; S.me.physio_id = r.id; S.physio = { id: r.id, full_name: r.full_name }; toast(`Collegato a ${r.full_name}`); go("oggi"); await refresh(); }
    catch (err) { LINKMSG = { text: err.offline ? "Sei offline: riprova quando sei connesso." : err.message, err: true }; render(); }
    return;
  }
  if (f.id === "nameForm") {
    const name = document.getElementById("pName").value.trim().slice(0, 80);
    try { await sbFetch(`/rest/v1/profiles?id=eq.${AUTH.user.id}`, { method: "PATCH", body: { full_name: name }, prefer: "return=minimal" }); S.me.full_name = name; saveCache(); toast("Salvato"); render(); }
    catch (err) { toast(err.offline ? "Sei offline" : err.message); }
    return;
  }
  if (f.id === "visitForm") {
    if (!VISIT || !VISIT.at) return toast("Scegli data e ora");
    try { const row = (await sbFetch("/rest/v1/visits", { method: "POST", body: { patient_id: VISIT.pid, at: new Date(VISIT.at).toISOString(), note: VISIT.note.trim() }, prefer: "return=representation" }))[0];
      S.visits = [...S.visits, row].sort((a, b) => a.at.localeCompare(b.at)); VISIT = null; saveCache(); render(); toast("Seduta fissata"); }
    catch (err) { toast(err.offline ? "Sei offline" : err.message); }
    return;
  }
  if (f.id === "exForm") { saveExercise(); return; }
});

/* ---------- Tema giorno / notte ---------- */
function paintTheme() {
  const b = document.getElementById("themeBtn"), t = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  b.innerHTML = t === "dark" ? I.sun : I.moon; b.setAttribute("aria-label", t === "dark" ? "Passa al tema giorno" : "Passa al tema notte"); b.title = b.getAttribute("aria-label");
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.content = t === "dark" ? "#0A1C33" : "#F3F8FC");
}
function setTheme(t) {
  if (t === "auto") { delete document.documentElement.dataset.theme; try { localStorage.removeItem("fisiolog-theme"); } catch (e) {} }
  else { document.documentElement.dataset.theme = t; try { localStorage.setItem("fisiolog-theme", t); } catch (e) {} }
  paintTheme();
}
document.getElementById("themeBtn").addEventListener("click", () => {
  const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  setTheme(cur === "dark" ? "light" : "dark"); if (route()[0] === "profilo") render();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", paintTheme);

/* ---------- Avvio ---------- */
async function readAuthHash() {
  const h = location.hash;
  if (!/access_token=|error_description=/.test(h)) return;
  const p = new URLSearchParams(h.replace(/^#\/?/, ""));
  history.replaceState(null, "", location.pathname + "#/");
  if (p.get("error_description")) { AUTHMSG = { text: p.get("error_description").includes("expired") ? "Il link è scaduto: chiedine uno nuovo." : p.get("error_description"), err: true }; return; }
  try {
    const tok = { access_token: p.get("access_token"), refresh_token: p.get("refresh_token"), expires_in: p.get("expires_in"), expires_at: p.get("expires_at") };
    const u = await sbFetch("/auth/v1/user", { auth: false, headers: { Authorization: "Bearer " + tok.access_token } });
    setAuth(sessionFrom({ ...tok, user: u }));
    if (p.get("type") === "recovery") RECOVERY = true;
    else if (p.get("type") === "signup") toast("Email confermata: benvenuto in FisioLog");
  } catch (e) { AUTHMSG = { text: authMessage(e), err: true }; }
}
async function boot() {
  paintTheme();
  if (!SB) return render();
  await readAuthHash();
  if (AUTH) { loadCache(); render(); refresh(); } else render();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && AUTH) refresh(true); });
  addEventListener("online", () => { if (AUTH) refresh(true); });
  addEventListener("offline", () => { NET = "offline"; paintStatus(); });
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
}
boot();
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
