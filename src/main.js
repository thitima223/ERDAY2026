import './style.css';

/* CONFIGURATION */
const CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
  // วางลิงก์ Web App ของ Google Apps Script ที่นี่ (ลงท้ายด้วย /exec)
  SHEETS_URL: 'https://script.google.com/macros/s/AKfycbwVlW_4rlHfPpWSK1nP9_Gt-UPIXf_DfEvDTNExGlf9Rf9T9bikmVTiYQeCf6dNpH8EPw/exec',
  PUBLIC_BASE_URL: 'https://erday2026.vercel.app'
};

const LIBS = {
  supabase: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js',
  qrcode:   'https://cdn.jsdelivr.net/npm/qrcode-generator@2.0.4/dist/qrcode.js',
  jszip:    'https://cdn.jsdelivr.net/npm/jszip@3.10.2/dist/jszip.min.js'
};

/*Utilities */
const IDS = Array.from({length:10}, (_, i) => String(i+1).padStart(2, '0'));
const params = new URLSearchParams(location.search);
const DEMO = params.get('demo') === '1' || (!CONFIG.SHEETS_URL && !/YOUR[-_]/.test(CONFIG.SUPABASE_URL + CONFIG.SUPABASE_ANON_KEY) === false);
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n||0).toLocaleString('en-US');
const ORN = '<i class="orn tl"></i><i class="orn tr"></i><i class="orn bl"></i><i class="orn br"></i>';
const displayName = c => (c && c.name) ? c.name : '';
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() :
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
    return (c === 'x' ? r : (r & 3 | 8)).toString(16);
  }));

function link(p) {
  const u = new URLSearchParams(p);
  if (DEMO) u.set('demo', '1');
  return location.pathname + '?' + u.toString();
}

function loadScript(src) {
  return new Promise((res, rej) => {
    if ($(`script[src="${src}"]`)) return res();
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error('โหลดไลบรารีไม่สำเร็จ: ' + src));
    document.head.appendChild(s);
  });
}

function toast(msg, err=false) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  $('#toast').appendChild(t);
  setTimeout(() => t.remove(), 3800);
}

function errMsg(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  return /NOT_ADMIN|42501|permission/i.test(m) ? 'ไม่มีสิทธิ์ Admin' : m;
}

function deviceId() {
  try {
    let d = localStorage.getItem('erday26_device');
    if (!d) { d = 'dv-' + uuid(); localStorage.setItem('erday26_device', d); }
    return d;
  } catch {
    window.__dv = window.__dv || 'dv-' + uuid();
    return window.__dv;
  }
}

function animateNumber(el, to, dur=900) {
  const from = Number(el.dataset.v || 0);
  el.dataset.v = to;
  if (from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = t => {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(from + (to - from) * e));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function rankList(scores) {
  const arr = IDS.map(id => ({ id, votes: Number(scores[id] || 0) }));
  arr.sort((a, b) => b.votes - a.votes || a.id.localeCompare(b.id));
  arr.forEach(e => {
    e.rank = 1 + arr.filter(x => x.votes > e.votes).length;
    e.tie = e.votes > 0 && arr.filter(x => x.votes === e.votes).length > 1;
  });
  return arr;
}
const sum = scores => IDS.reduce((s, id) => s + Number(scores[id] || 0), 0);

const EMBLEM = `<svg viewBox="0 0 64 64" width="46%" fill="none" stroke="#E8D5A3" stroke-width="2.2" stroke-linejoin="round"><path d="M10 46 6 20l15 12 11-18 11 18 15-12-4 26z" fill="rgba(212,175,55,.18)"/><path d="M12 54h40"/><circle cx="6" cy="18" r="2.5" fill="#E8D5A3"/><circle cx="32" cy="11" r="2.5" fill="#E8D5A3"/><circle cx="58" cy="18" r="2.5" fill="#E8D5A3"/></svg>`;
function photoHTML(c, id, cls='', emblem=false) {
  const url = c && c.photo_url;
  return url ? `<img class="${cls}" src="${esc(url)}" alt="Contestant ${id}" onerror="this.outerHTML='<div class=&quot;mono ${cls}&quot;>${id}</div>'">`
             : `<div class="mono ${cls}">${emblem ? EMBLEM : id}</div>`;
}

function sparkleBurst(x, y, n=36) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'burst';
    document.body.appendChild(p);
    const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 180, s = .5 + Math.random() * 1.1;
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    if (Math.random() < .4) p.style.background = '#FFFDF5';
    p.animate([
      { transform: 'translate(-50%,-50%) scale(' + s + ')', opacity: 1 },
      { transform: `translate(${Math.cos(a)*d}px,${Math.sin(a)*d+60}px) scale(0)`, opacity: 0 }
    ], { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => p.remove();
  }
}

function showView(viewId) {
  ['view-hub', 'view-vote', 'view-scoreboard', 'view-qr', 'view-admin'].forEach(id => {
    const el = $('#' + id);
    if (el) el.classList.add('hidden');
  });
  const target = $('#' + viewId);
  if (target) target.classList.remove('hidden');
}

/* Data Layer */
class SupabaseAPI {
  constructor() {
    this.c = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 30 } }
    });
  }
  async _q(p) { const { data, error } = await p; if (error) throw error; return data; }
  rpc(fn, args) { return this._q(this.c.rpc(fn, args)); }
  getState() { return this._q(this.c.from('app_state').select('*').eq('id', 1).single()); }
  async getContestants() {
    const d = await this._q(this.c.from('contestants').select('*').order('id'));
    return Object.fromEntries(d.map(c => [c.id, c]));
  }
  async getScores(mode) {
    const d = await this._q(this.c.from('scores').select('contestant_id,votes').eq('mode', mode));
    return Object.fromEntries(d.map(r => [r.contestant_id, r.votes]));
  }
  castVote(id, device, req) { return this.rpc('cast_vote', { p_contestant: id, p_device: device, p_request: req }); }
  deviceStatus(device, id) { return this.rpc('device_status', { p_device: device, p_contestant: id }); }
  subscribe(h) {
    const ch = this.c.channel('erday-' + uuid())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, p => p.new && h.onScore && h.onScore(p.new))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_state' }, p => p.new && h.onState && h.onState(p.new))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contestants' }, p => p.new && h.onContestant && h.onContestant(p.new))
      .subscribe(s => h.onStatus && h.onStatus(s));
    return () => this.c.removeChannel(ch);
  }
  async getSession() { const { data } = await this.c.auth.getSession(); return data.session; }
  async signIn(email, password) { const { error } = await this.c.auth.signInWithPassword({ email, password }); if (error) throw error; }
  signOut() { return this.c.auth.signOut(); }
  isAdmin() { return this.rpc('is_admin'); }
  setState(p) { return this.rpc('admin_set_state', { p_active_mode: p.active_mode ?? null, p_test_open: p.test_open ?? null, p_live_open: p.live_open ?? null, p_vote_limit: p.vote_limit ?? null }); }
  reset(mode) { return this.rpc('admin_reset', { p_mode: mode }); }
  testAdd(id, n) { return this.rpc('admin_test_add', { p_contestant: id, p_amount: n }); }
  updateContestant(id, name, photo) { return this.rpc('admin_update_contestant', { p_id: id, p_name: name, p_photo: photo }); }
  stats(mode) { return this.rpc('admin_stats', { p_mode: mode }); }
  resetLog() { return this._q(this.c.from('reset_log').select('*').order('created_at', { ascending: false }).limit(20)); }
}

/* Google Sheets (Apps Script) — ทุกเครื่องอ่าน/เขียนชีทเดียวกัน, ดึงข้อมูลซ้ำทุก POLL_MS */
class SheetsAPI {
  constructor() {
    this.url = CONFIG.SHEETS_URL;
    this.POLL_MS = 2500;
    this.h = new Set();
    this.timer = null;
    this.last = { scores: {}, state: '', contestants: '' };
  }
  async _get(p) {
    const u = new URL(this.url);
    Object.entries(p).forEach(([k, v]) => u.searchParams.set(k, v));
    const r = await fetch(u.toString());
    const d = await r.json();
    if (d && d.error) throw new Error(d.error);
    return d;
  }
  async getState() { return (await this._get({ action: 'all' })).state; }
  async getContestants() { return (await this._get({ action: 'all' })).contestants; }
  async getScores(m) { return (await this._get({ action: 'all' })).scores[m]; }
  castVote(id) { return this._get({ action: 'vote', id }); }
  async deviceStatus() { return { can_vote: true }; }
  subscribe(h) {
    this.h.add(h);
    if (!this.timer) this.timer = setInterval(() => this._poll(), this.POLL_MS);
    this._poll();
    return () => {
      this.h.delete(h);
      if (!this.h.size && this.timer) { clearInterval(this.timer); this.timer = null; }
    };
  }
  async _poll() {
    let d;
    try { d = await this._get({ action: 'all' }); } catch { return; }
    const st = JSON.stringify(d.state), ct = JSON.stringify(d.contestants);
    const stChanged = st !== this.last.state, ctChanged = ct !== this.last.contestants;
    this.last.state = st; this.last.contestants = ct;
    for (const h of this.h) {
      if (stChanged) h.onState && h.onState({ ...d.state });
      if (ctChanged) for (const id of IDS) h.onContestant && h.onContestant({ ...d.contestants[id] });
      for (const m of ['test', 'live']) {
        for (const id of IDS) {
          const key = m + id, v = d.scores[m][id];
          if (this.last.scores[key] !== v) {
            this.last.scores[key] = v;
            h.onScore && h.onScore({ mode: m, contestant_id: id, votes: v });
          }
        }
      }
    }
  }
  async getSession() { return { user: { email: 'admin@sheets' } }; }
  async signIn() { return true; }
  async signOut() { return true; }
  async isAdmin() { return true; }
  setState(p) {
    const q = { action: 'setState' };
    ['active_mode', 'test_open', 'live_open'].forEach(k => { if (p[k] !== undefined && p[k] !== null) q[k] = p[k]; });
    return this._get(q);
  }
  reset(mode) { return this._get({ action: 'reset', mode }); }
  testAdd(id, n) { return this._get({ action: 'testAdd', id, amount: n }); }
  updateContestant(id, name, photo) { return this._get({ action: 'updateContestant', id, name, photo: photo || '' }); }
  async stats(mode) {
    const s = (await this._get({ action: 'all' })).scores[mode];
    return { total_votes: sum(s), unique_devices: sum(s), last_vote: new Date().toISOString() };
  }
  async resetLog() { return []; }
}

class DemoAPI {
  constructor() {
    const saved = localStorage.getItem('erday26_demo_state');
    const seed = [42, 37, 37, 29, 51, 18, 24, 12, 33, 8];
    this.s = saved ? JSON.parse(saved) : {
      state: { active_mode: 'live', test_open: true, live_open: true, vote_limit: 'unlimited' },
      contestants: Object.fromEntries(IDS.map(id => [id, { id, name: `Contestant ${id}`, photo_url: '' }])),
      scores: {
        test: Object.fromEntries(IDS.map((id, i) => [id, seed[i]])),
        live: Object.fromEntries(IDS.map((id, i) => [id, seed[i]]))
      },
      votes: [],
      log: []
    };
    this.h = new Set();
    try {
      this.bc = new BroadcastChannel('erday26-demo');
      this.bc.onmessage = e => {
        if (e.data.t === 'hello') {
          this.bc.postMessage({ t: 'full', s: this.s });
        } else if (e.data.t === 'full') {
          this.s = e.data.s;
          this.emit();
        } else if (e.data.t === 'score') {
          this.s.scores[e.data.mode][e.data.id] = e.data.votes;
          for (const h of this.h) {
            h.onScore && h.onScore({ mode: e.data.mode, contestant_id: e.data.id, votes: e.data.votes });
          }
        }
      };
      this.bc.postMessage({ t: 'hello' });
    } catch {}

    window.addEventListener('storage', (e) => {
      if (e.key === 'erday26_demo_state' && e.newValue) {
        this.s = JSON.parse(e.newValue);
        this.emit();
      }
    });
  }
  _commit(lastScore = null) {
    try {
      localStorage.setItem('erday26_demo_state', JSON.stringify(this.s));
      if (this.bc) {
        if (lastScore) {
          this.bc.postMessage({ t: 'score', ...lastScore });
        }
        this.bc.postMessage({ t: 'full', s: this.s });
      }
    } catch {}
    this.emit();
  }
  emit() {
    for (const h of this.h) {
      h.onState && h.onState({ ...this.s.state });
      for (const m of ['test', 'live']) {
        for (const id of IDS) {
          h.onScore && h.onScore({ mode: m, contestant_id: id, votes: this.s.scores[m][id] });
        }
      }
      for (const id of IDS) {
        h.onContestant && h.onContestant({ ...this.s.contestants[id] });
      }
    }
  }
  async getState() { return { ...this.s.state }; }
  async getContestants() { return JSON.parse(JSON.stringify(this.s.contestants)); }
  async getScores(m) { return { ...this.s.scores[m] }; }
  async castVote(id, device, req) {
    await new Promise(r => setTimeout(r, 200));
    if (!/^(0[1-9]|10)$/.test(id)) return { ok: false, code: 'invalid' };
    const st = this.s.state, m = st.active_mode, open = m === 'live' ? st.live_open : st.test_open;
    if (!open) return { ok: false, code: 'closed', mode: m };
    this.s.scores[m][id] = (this.s.scores[m][id] || 0) + 1;
    this._commit({ mode: m, id, votes: this.s.scores[m][id] });
    return { ok: true, code: 'ok', mode: m };
  }
  async deviceStatus() { return { can_vote: true }; }
  subscribe(h) { this.h.add(h); return () => this.h.delete(h); }
  async getSession() { return { user: { email: 'demo@erday2026.local' } }; }
  async signIn() { return true; }
  async signOut() { return true; }
  async isAdmin() { return true; }
  async setState(p) { Object.assign(this.s.state, p); this._commit(); return true; }
  async reset(mode) {
    for (const id of IDS) this.s.scores[mode][id] = 0;
    this._commit();
    return true;
  }
  async testAdd(id, n) {
    const m = this.s.state.active_mode;
    this.s.scores[m][id] = Math.max(0, (this.s.scores[m][id] || 0) + n);
    this._commit({ mode: m, id, votes: this.s.scores[m][id] });
    return true;
  }
  async updateContestant(id, name, photo) {
    this.s.contestants[id] = { id, name, photo_url: photo };
    this._commit();
    return true;
  }
  async stats(mode) {
    const total = sum(this.s.scores[mode]);
    return { total_votes: total, unique_devices: total, last_vote: new Date().toISOString() };
  }
  async resetLog() { return []; }
}

/* App Controller & Views */
async function initApp() {
  const isDemo = DEMO;
  let api;

  if (isDemo) {
    document.body.classList.add('demo');
    const ribbon = document.createElement('div');
    // ribbon.className = 'demo-ribbon';
    // ribbon.textContent = 'MODE: DEMO PREVIEW (ไม่ได้เชื่อมต่อ Supabase จริง)';
    document.body.prepend(ribbon);
    api = new DemoAPI();
  } else if (CONFIG.SHEETS_URL) {
    api = new SheetsAPI();
    // เช็กการเชื่อมต่อชีทก่อน ถ้าไม่ได้ให้แสดงสาเหตุบนหน้าจอ (แทนที่จะเป็นหน้าว่าง)
    try {
      await api._get({ action: 'all' });
    } catch (err) {
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;background:#b00020;color:#fff;padding:12px 14px;border-radius:10px;font:14px/1.4 sans-serif;white-space:pre-wrap';
      box.textContent = 'เชื่อมต่อ Google Sheet ไม่ได้: ' + (err && err.message ? err.message : err) +
        '\n(เช็กว่า Apps Script Deploy เป็น Execute as: Me / Who has access: Anyone และใช้ลิงก์ /exec)';
      document.body.appendChild(box);
      console.error('SheetsAPI error:', err);
    }
  } else {
    try {
      await loadScript(LIBS.supabase);
      api = new SupabaseAPI();
    } catch {
      api = new DemoAPI();
    }
  }

  const v = params.get('v');
  const screen = params.get('screen');
  const qr = params.get('qr');
  const admin = params.get('admin');

  if (admin !== null) renderAdmin(api);
  else if (qr !== null) renderQR(api);
  else if (screen) renderScoreboard(api, screen);
  else if (v) renderVote(api, v);
  else renderHub();
}

function renderHub() {
  showView('view-hub');
  $('#hubLinkScoreboard').href = link({ screen: 'live' });
  $('#hubLinkVote').href = link({ v: '01' });
  $('#hubLinkQR').href = link({ qr: '1' });
  $('#hubLinkAdmin').href = link({ admin: '' });
}

async function renderVote(api, contestantId) {
  showView('view-vote');
  contestantId = String(contestantId).padStart(2, '0');
  const contestants = await api.getContestants();
  const state = await api.getState();
  const mode = state.active_mode;
  const isOpen = mode === 'live' ? state.live_open : state.test_open;

  const modePill = $('#voteModePill');
  modePill.className = `pill ${mode}`;
  modePill.textContent = `${mode.toUpperCase()} MODE`;

  const openPill = $('#voteOpenPill');
  openPill.className = `pill ${isOpen ? 'open' : 'closed'}`;
  $('#voteOpenText').textContent = isOpen ? 'VOTING OPEN' : 'VOTING CLOSED';

  const track = $('#voteTrack');
  const dotsContainer = $('#voteDots');
  const tpl = $('#tpl-vote-card');
  track.innerHTML = '';
  dotsContainer.innerHTML = '';

  IDS.forEach((id, index) => {
    const cData = contestants[id] || { id, name: '' };
    const node = tpl.content.cloneNode(true);
    const slide = node.querySelector('.vote-slide');
    slide.dataset.id = id;
    slide.dataset.index = index;

    node.querySelector('.photo').innerHTML = photoHTML(cData, id, '', true);
    node.querySelector('.c-num').textContent = id;
    node.querySelector('.c-name').textContent = displayName(cData);

    const btn = node.querySelector('.btn-cast-vote');
    btn.disabled = !isOpen;
    btn.onclick = async (e) => {
      e.stopPropagation();
      btn.disabled = true;
      btn.textContent = 'VOTING...';
      try {
        const res = await api.castVote(id, deviceId(), uuid());
        if (res && res.ok) {
          sparkleBurst(window.innerWidth / 2, window.innerHeight / 2, 45);
          $('#thanksContestantId').textContent = id;
          $('#voteThanksModal').classList.remove('hidden');
        } else {
          toast((res && res.code === 'closed') ? 'ระบบปิดรับคะแนนแล้ว' : 'ไม่สามารถส่งคะแนนได้', true);
        }
      } catch (err) {
        toast(errMsg(err), true);
      } finally {
        btn.disabled = false;
        btn.textContent = 'VOTE NOW';
      }
    };

    track.appendChild(node);

    const dot = document.createElement('button');
    dot.className = 'vote-dot';
    dot.setAttribute('aria-label', `Go to contestant ${id}`);
    dot.onclick = () => updateCarousel(index);
    dotsContainer.appendChild(dot);
  });

  $('#btnCloseThanks').onclick = () => {
    $('#voteThanksModal').classList.add('hidden');
  };

  let currentIndex = Math.max(0, IDS.indexOf(contestantId));
  if (currentIndex === -1) currentIndex = 0;

  const slides = $$('.vote-slide', track);
  const dots = $$('.vote-dot', dotsContainer);
  const prevBtn = $('#votePrevBtn');
  const nextBtn = $('#voteNextBtn');

  function updateCarousel(idx) {
    currentIndex = Math.max(0, Math.min(idx, IDS.length - 1));
    const isDesktop = window.innerWidth > 768;

    slides.forEach(s => s.classList.remove('active-card', 'side-card', 'mobile-card'));

    if (isDesktop) {
      let windowStart = currentIndex - 1;
      if (currentIndex === 0) windowStart = 0;
      else if (currentIndex === IDS.length - 1) windowStart = IDS.length - 3;
      windowStart = Math.max(0, Math.min(windowStart, IDS.length - 3));

      track.style.transform = `translateX(-${windowStart * (100 / 3)}%)`;

      if (currentIndex === 0) {
        slides[windowStart].classList.add('active-card');
        slides[windowStart + 1].classList.add('side-card');
        slides[windowStart + 2].classList.add('side-card');
      } else if (currentIndex === IDS.length - 1) {
        slides[windowStart].classList.add('side-card');
        slides[windowStart + 1].classList.add('side-card');
        slides[windowStart + 2].classList.add('active-card');
      } else {
        slides[windowStart].classList.add('side-card');
        slides[windowStart + 1].classList.add('active-card');
        slides[windowStart + 2].classList.add('side-card');
      }
    } else {
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      slides.forEach(s => s.classList.add('mobile-card'));
    }

    dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === IDS.length - 1;
  }

  prevBtn.onclick = () => { if (currentIndex > 0) updateCarousel(currentIndex - 1); };
  nextBtn.onclick = () => { if (currentIndex < IDS.length - 1) updateCarousel(currentIndex + 1); };

  let startX = 0, dist = 0;
  track.ontouchstart = (e) => { startX = e.touches[0].clientX; dist = 0; };
  track.ontouchmove = (e) => { dist = e.touches[0].clientX - startX; };
  track.ontouchend = () => {
    if (Math.abs(dist) > 40) {
      if (dist < 0 && currentIndex < IDS.length - 1) updateCarousel(currentIndex + 1);
      else if (dist > 0 && currentIndex > 0) updateCarousel(currentIndex - 1);
    }
  };

  window.addEventListener('resize', () => updateCarousel(currentIndex));
  updateCarousel(currentIndex);
}

async function renderScoreboard(api, targetMode) {
  showView('view-scoreboard');
  targetMode = targetMode === 'test' ? 'test' : 'live';

  const modePill = $('#sbModePill');
  modePill.className = `pill ${targetMode}`;
  modePill.textContent = targetMode.toUpperCase();

  const contestants = await api.getContestants();
  let scores = await api.getScores(targetMode);
  const spotlightEl = $('#sbTop3Spotlight');
  const sbGrid = $('#sbGrid');
  const tpl = $('#tpl-sb-card');

  function buildCard(item, total) {
    const c = contestants[item.id] || {};
    const pct = total > 0 ? ((item.votes / total) * 100).toFixed(1) : '0.0';
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector('.sb-card');

    card.dataset.id = item.id;
    if (item.rank === 1) card.classList.add('r1');
    else if (item.rank === 2) card.classList.add('r2');
    else if (item.rank === 3) card.classList.add('r3');

    node.querySelector('.sb-rank').textContent = item.rank;
    node.querySelector('.sb-photo').innerHTML = photoHTML(c, item.id);
    node.querySelector('.sb-no').textContent = `NO. ${item.id}`;
    node.querySelector('.sb-name').textContent = displayName(c);
    node.querySelector('.sb-score').textContent = fmt(item.votes);
    node.querySelector('.sb-bar i').style.width = `${pct}%`;
    node.querySelector('.sb-pct').textContent = `${pct}%`;

    return node;
  }

  function update() {
    const ranked = rankList(scores);
    const total = sum(scores);
    animateNumber($('#totNum'), total);

    if (spotlightEl) {
      spotlightEl.innerHTML = '';
      const top3 = ranked.slice(0, 3);
      top3.forEach(item => {
        spotlightEl.appendChild(buildCard(item, total));
      });
    }

    sbGrid.innerHTML = '';
    ranked.forEach(item => {
      sbGrid.appendChild(buildCard(item, total));
    });
  }

  update();

  api.subscribe({
    onScore: (row) => {
      if (row.mode === targetMode) {
        scores[row.contestant_id] = row.votes;
        update();
      }
    }
  });
}

async function renderQR(api) {
  showView('view-qr');
  await loadScript(LIBS.qrcode);
  const contestants = await api.getContestants();
  const origin = CONFIG.PUBLIC_BASE_URL || window.location.origin;

  $('#btnPrintQR').onclick = () => window.print();

  const qrGrid = $('#qrGrid');
  const tpl = $('#tpl-qr-card');
  qrGrid.innerHTML = '';

  IDS.forEach(id => {
    const c = contestants[id] || {};
    const voteUrl = `${origin}${link({ v: id })}`;
    const qr = window.qrcode(0, 'M');
    qr.addData(voteUrl);
    qr.make();

    const node = tpl.content.cloneNode(true);
    node.querySelector('.qr-box').innerHTML = qr.createSvgTag({ scalable: true });
    node.querySelector('.no').textContent = id;
    node.querySelector('.nm').textContent = displayName(c);
    node.querySelector('.url').textContent = voteUrl;

    qrGrid.appendChild(node);
  });
}

async function renderAdmin(api) {
  showView('view-admin');
  $('#adminBackLink').href = link({});

  let state = await api.getState();
  let contestants = await api.getContestants();
  let scores = await api.getScores(state.active_mode);

  const modeBanner = $('#adminModeBanner');
  const bannerTitle = $('#adminModeBannerTitle');
  const bannerDesc = $('#adminModeBannerDesc');
  const toggleBtn = $('#toggleOpen');
  const switchBtn = $('#switchMode');
  const resetBtn = $('#btnResetMode');
  const tbody = $('#adminTbody');
  const tplRow = $('#tpl-admin-row');

  function draw() {
    const isLive = state.active_mode === 'live';
    const isOpen = state[state.active_mode + '_open'];

    modeBanner.className = `mode-banner lux ${state.active_mode}`;
    bannerTitle.textContent = `โหมดปัจจุบัน: ${state.active_mode.toUpperCase()}`;
    bannerDesc.textContent = `สถานะการเปิดรับโหวต : ${isOpen ? '🟢 เปิดอยู่' : '🔴 ปิดอยู่'}`;

    toggleBtn.className = `btn ${isOpen ? 'btn-red' : 'btn-green'} btn-sm`;
    toggleBtn.textContent = isOpen ? 'ปิดการโหวต' : 'เปิดการโหวต';

    switchBtn.textContent = `สลับเป็นโหมด ${state.active_mode === 'test' ? 'LIVE' : 'TEST'}`;
    $('#adminScoreHeader').textContent = `คะแนน (${state.active_mode})`;
    resetBtn.textContent = `รีเซ็ตคะแนนโหมด ${state.active_mode.toUpperCase()}`;

    tbody.innerHTML = '';
    IDS.forEach(id => {
      const node = tplRow.content.cloneNode(true);
      node.querySelector('.col-id').textContent = id;

      const inp = node.querySelector('.name-in');
      inp.dataset.id = id;
      inp.value = displayName(contestants[id]);
      inp.onchange = async () => {
        await api.updateContestant(inp.dataset.id, inp.value.trim(), contestants[inp.dataset.id]?.photo_url || '');
        contestants = await api.getContestants();
        toast('บันทึกชื่อเรียบร้อย');
      };

      node.querySelector('.col-score').textContent = scores[id] || 0;

      node.querySelectorAll('.add-score').forEach(btn => {
        btn.dataset.id = id;
        btn.onclick = async () => {
          await api.testAdd(btn.dataset.id, Number(btn.dataset.v));
          scores = await api.getScores(state.active_mode);
          draw();
        };
      });

      tbody.appendChild(node);
    });

    toggleBtn.onclick = async () => {
      const prop = state.active_mode + '_open';
      await api.setState({ [prop]: !state[prop] });
      state = await api.getState();
      draw();
    };

    switchBtn.onclick = async () => {
      const next = state.active_mode === 'test' ? 'live' : 'test';
      await api.setState({ active_mode: next });
      state = await api.getState();
      scores = await api.getScores(state.active_mode);
      draw();
    };

    resetBtn.onclick = async () => {
      if (confirm(`ยืนยันการล้างคะแนนทั้งหมดของโหมด ${state.active_mode.toUpperCase()}?`)) {
        await api.reset(state.active_mode);
        scores = await api.getScores(state.active_mode);
        draw();
      }
    };
  }

  draw();
}

// Start application
initApp();