import './style.css';

/* =====================================================================
   CONFIGURATION
   ===================================================================== */
const CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
  PUBLIC_BASE_URL: ''
};

const LIBS = {
  supabase: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js',
  qrcode:   'https://cdn.jsdelivr.net/npm/qrcode-generator@2.0.4/dist/qrcode.js',
  jszip:    'https://cdn.jsdelivr.net/npm/jszip@3.10.2/dist/jszip.min.js'
};

/* =====================================================================
   Utilities
   ===================================================================== */
const IDS = Array.from({length:10}, (_, i) => String(i+1).padStart(2, '0'));
const params = new URLSearchParams(location.search);
const DEMO = params.get('demo') === '1' || !/YOUR[-_]/.test(CONFIG.SUPABASE_URL + CONFIG.SUPABASE_ANON_KEY) === false;
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

/* =====================================================================
   Data Layer
   ===================================================================== */
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

class DemoAPI {
  constructor() {
    const seed = [42, 37, 37, 29, 51, 18, 24, 12, 33, 8];
    this.s = {
      state: { active_mode: 'test', test_open: true, live_open: false, vote_limit: 'unlimited' },
      contestants: Object.fromEntries(IDS.map(id => [id, { id, name: `Contestant ${id}`, photo_url: '' }])),
      scores: {
        test: Object.fromEntries(IDS.map((id, i) => [id, seed[i]])),
        live: Object.fromEntries(IDS.map(id => [id, 0]))
      },
      votes: [],
      log: []
    };
    this.h = new Set();
    try {
      this.bc = new BroadcastChannel('erday26-demo');
      this.bc.onmessage = e => {
        if (e.data.t === 'hello') this.bc.postMessage({ t: 'full', s: this.s });
        else if (e.data.t === 'full') { this.s = e.data.s; this.emit(); }
      };
      this.bc.postMessage({ t: 'hello' });
    } catch {}
  }
  _commit() { try { this.bc && this.bc.postMessage({ t: 'full', s: this.s }); } catch {} this.emit(); }
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
    this.s.scores[m][id]++;
    this._commit();
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
    this.s.scores[this.s.state.active_mode][id] = Math.max(0, (this.s.scores[this.s.state.active_mode][id] || 0) + n);
    this._commit();
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

/* =====================================================================
   App Controller & Views
   ===================================================================== */
async function initApp() {
  const isDemo = DEMO;
  let api;

  if (isDemo) {
    document.body.classList.add('demo');
    const ribbon = document.createElement('div');
    ribbon.className = 'demo-ribbon';
    ribbon.textContent = 'MODE: DEMO PREVIEW (ไม่ได้เชื่อมต่อ Supabase จริง)';
    document.body.prepend(ribbon);
    api = new DemoAPI();
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

  if (v) renderVote(api, v);
  else if (screen) renderScoreboard(api, screen);
  else if (qr) renderQR(api);
  else if (admin !== null) renderAdmin(api);
  else renderHub();
}

function renderHub() {
  $('#app').innerHTML = `
    <div class="page center fade-in">
      <p class="hero-sub">Annual Celebration</p>
      <h1 class="hero-title gold-text">ER DAY 2026</h1>
      <p class="eyebrow" style="margin-top:.6rem;">Green Glam Night · Popular Vote System</p>
      <div class="divider"><span>⚜️</span></div>
      
      <div class="hub-grid">
        <a class="hub-card lux" href="${link({ screen: 'live' })}">
          ` /* + '<div class="ico">🏆</div>' */ + `
          <div class="ico">
            <img src="https://img.icons8.com/color/48/trophy.png" alt="Live Scoreboard" width="36" height="36">
          </div>
          <h3>Live Scoreboard</h3>
          <p>จอถ่ายทอดผลคะแนนสด 16:9 สำหรับฉายบนเวทีใหญ่</p>
        </a>
        <a class="hub-card lux" href="${link({ v: '01' })}">
          ` /* + '<div class="ico">✨</div>' */ + `
          <div class="ico">
          <img src="https://img.icons8.com/color/48/sparkling.png" alt="Sparkles" width="36" height="36">
          </div>
          <h3>Vote Page</h3>
          <p>หน้าลงคะแนนโหวตสำหรับผู้เข้าร่วมงาน (ตัวอย่างเบอร์ 01)</p>
        </a>
        <a class="hub-card lux" href="${link({ qr: '1' })}">
          ` /* + '<div class="ico">📱</div>' */ + `
          <div class="ico2">
  <img src="https://img.icons8.com/bubbles/50/qr-code.png" alt="QR Code Bubbles" width="40" height="40">
</div>
          <h3>QR Code Cards</h3>
          <p>สร้างและพิมพ์ QR Code สำหรับติดประจำโต๊ะหรือป้ายผู้ประกวด</p>
        </a>
        <a class="hub-card lux" href="${link({ admin: '' })}">
          ` /* + '<div class="ico">⚙️</div>' */ + `
          <div class="ico">
  <img src="https://img.icons8.com/dusk/64/settings.png" alt="Settings Dusk" width="36" height="36">
</div>
          <h3>Admin Control</h3>
          <p>ระบบจัดการสถานะการโหวต รีเซ็ตคะแนน และข้อมูลผู้ประกวด</p>
        </a>
      </div>
    </div>
  `;
}

async function renderVote(api, contestantId) {
  contestantId = String(contestantId).padStart(2, '0');
  const cData = (await api.getContestants())[contestantId] || { id: contestantId, name: '' };
  const state = await api.getState();
  const mode = state.active_mode;
  const isOpen = mode === 'live' ? state.live_open : state.test_open;

  $('#app').innerHTML = `
    <div class="vote">
      <div class="brand-sm">ER DAY 2026 · GREEN GLAM NIGHT</div>
      <h1 class="title-xl brand-lg gold-text">POPULAR VOTE</h1>
      <div class="status-row">
        <span class="pill ${mode}">${mode.toUpperCase()} MODE</span>
        <span class="pill ${isOpen ? 'open' : 'closed'}">
          <i class="dot"></i>${isOpen ? 'VOTING OPEN' : 'VOTING CLOSED'}
        </span>
      </div>
      <p class="prompt">กดปุ่มด้านล่างเพื่อโหวตให้ผู้ประกวด</p>

      <div class="vote-card lux">
        ${ORN}
        <div class="photo">${photoHTML(cData, contestantId, '', true)}</div>
        <div class="c-label">CONTESTANT</div>
        <div class="c-num gold-text">${contestantId}</div>
        <div class="c-name">${esc(displayName(cData))}</div>
        <button id="btnVote" class="btn btn-gold vote-btn" ${isOpen ? '' : 'disabled'}>
          VOTE NOW
        </button>
      </div>

      <p class="vote-note">ระบบจะบันทึกคะแนนเข้าสู่ระบบแบบ Realtime ทันที</p>
      <div class="vote-foot">EMERGENCY DEPARTMENT · 2026</div>
    </div>
  `;

  $('#btnVote').addEventListener('click', async () => {
    const btn = $('#btnVote');
    btn.disabled = true;
    btn.textContent = 'VOTING...';
    try {
      const res = await api.castVote(contestantId, deviceId(), uuid());
      if (res && res.ok) {
        sparkleBurst(window.innerWidth / 2, window.innerHeight / 2, 45);
        $('#app').insertAdjacentHTML('beforeend', `
          <div class="thanks">
            <div class="inner">
              <div class="check">
                <svg viewBox="0 0 24 24" fill="none" stroke="#064E3B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
              </div>
              <h2 class="gold-text">ขอบคุณสำหรับการโหวต!</h2>
              <p>คะแนนของคุณสำหรับหมายเลข <b>${contestantId}</b> ถูกบันทึกแล้ว</p>
              <button class="btn btn-gold" style="margin-top:1.5rem;" onclick="this.closest('.thanks').remove()">ปิด</button>
            </div>
          </div>
        `);
      } else {
        toast((res && res.code === 'closed') ? 'ระบบปิดรับคะแนนแล้ว' : 'ไม่สามารถส่งคะแนนได้', true);
      }
    } catch (e) {
      toast(errMsg(e), true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'VOTE NOW';
    }
  });
}

async function renderScoreboard(api, targetMode) {
  targetMode = targetMode === 'test' ? 'test' : 'live';
  const contestants = await api.getContestants();
  let scores = await api.getScores(targetMode);

  $('#app').innerHTML = `
    <div class="sb-wrap">
      <div class="sb-stage">
        <header class="sb-head">
          <div class="left">
            <div class="ev">ER DAY 2026</div>
            <span class="pill ${targetMode}">${targetMode.toUpperCase()}</span>
          </div>
          <div class="mid">
            <h1 class="t1 title-xl gold-text">POPULAR VOTE</h1>
            <div class="t2">GREEN GLAM NIGHT</div>
          </div>
          <div class="sb-total lux">
            <div class="lbl">TOTAL VOTES</div>
            <div id="totNum" class="num gold-text">0</div>
          </div>
        </header>

        <main id="sbGrid" class="sb-grid"></main>

        <footer class="sb-foot">
          LIVE STANDINGS <b>◇</b> GREEN GLAM NIGHT 2026
        </footer>
      </div>
    </div>
  `;

  function update() {
    const ranked = rankList(scores);
    const total = sum(scores);
    animateNumber($('#totNum'), total);

    $('#sbGrid').innerHTML = ranked.map(item => {
      const c = contestants[item.id] || {};
      const pct = total > 0 ? ((item.votes / total) * 100).toFixed(1) : '0.0';
      const rCls = item.rank === 1 ? 'r1' : item.rank === 2 ? 'r2' : item.rank === 3 ? 'r3' : '';
      return `
        <div class="sb-card lux ${rCls}" data-id="${item.id}">
          ${ORN}
          <div class="sb-rank">${item.rank}</div>
          <div class="sb-crown">👑</div>
          <div class="sb-photo">${photoHTML(c, item.id)}</div>
          <div class="sb-no">NO. ${item.id}</div>
          <div class="sb-name">${esc(displayName(c))}</div>
          <div class="sb-score gold-text">${fmt(item.votes)}</div>
          <div class="sb-score-lbl">VOTES</div>
          <div class="sb-bar"><i style="width:${pct}%"></i></div>
          <div class="sb-pct">${pct}%</div>
        </div>
      `;
    }).join('');
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
  await loadScript(LIBS.qrcode);
  const contestants = await api.getContestants();
  const origin = CONFIG.PUBLIC_BASE_URL || window.location.origin;

  $('#app').innerHTML = `
    <div class="page">
      <div class="no-print center">
        <h1 class="title-xl gold-text">QR CODE GENERATOR</h1>
        <p class="eyebrow" style="margin-top:.4rem;">สำหรับพิมพ์การ์ดติดโต๊ะ / ป้ายประชาสัมพันธ์</p>
        <div class="qr-tools" style="justify-content:center; margin-bottom:2rem;">
          <button class="btn btn-gold" onclick="window.print()">🖨️ สั่งพิมพ์การ์ดทั้งหมด (A4)</button>
        </div>
      </div>
      <div class="qr-grid">
        ${IDS.map(id => {
          const c = contestants[id] || {};
          const voteUrl = `${origin}${link({ v: id })}`;
          const qr = window.qrcode(0, 'M');
          qr.addData(voteUrl);
          qr.make();
          return `
            <div class="qr-card lux">
              ${ORN}
              <div class="ev">ER DAY 2026</div>
              <div class="th gold-text">GREEN GLAM NIGHT</div>
              <div class="scan">SCAN TO VOTE</div>
              <div class="qr-box">${qr.createSvgTag({ scalable: true })}</div>
              <div class="lbl">CONTESTANT</div>
              <div class="no gold-text">${id}</div>
              <div class="nm">${esc(displayName(c))}</div>
              <div class="url">${voteUrl}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

async function renderAdmin(api) {
  let state = await api.getState();
  let contestants = await api.getContestants();
  let scores = await api.getScores(state.active_mode);

  function draw() {
    $('#app').innerHTML = `
      <div class="page">
        <div class="adm-top">
          <div class="brand"><span class="t gold-text">ER DAY CONTROL PANEL</span></div>
          <div class="who"><a href="${link({})}" class="btn btn-ghost btn-sm">กลับหน้าหลัก</a></div>
        </div>

        <div class="mode-banner lux ${state.active_mode}">
          <div>
            <div class="big">โหมดปัจจุบัน: ${state.active_mode.toUpperCase()}</div>
            <div class="desc">สถานะการเปิดรับโหวต: ${state[state.active_mode + '_open'] ? '🟢 เปิดอยู่' : '🔴 ปิดอยู่'}</div>
          </div>
          <div style="display:flex; gap:.6rem;">
            <button id="toggleOpen" class="btn ${state[state.active_mode + '_open'] ? 'btn-red' : 'btn-green'} btn-sm">
              ${state[state.active_mode + '_open'] ? 'ปิดการโหวต' : 'เปิดการโหวต'}
            </button>
            <button id="switchMode" class="btn btn-ghost btn-sm">
              สลับเป็นโหมด ${state.active_mode === 'test' ? 'LIVE' : 'TEST'}
            </button>
          </div>
        </div>

        <div class="panel lux">
          ${ORN}
          <h2>จัดการคะแนนและผู้ประกวด</h2>
          <div class="scroll-x">
            <table class="tbl">
              <thead>
                <tr>
                  <th>NO.</th>
                  <th>ชื่อผู้ประกวด</th>
                  <th>คะแนน (${state.active_mode})</th>
                  <th>จัดการคะแนนจำลอง</th>
                </tr>
              </thead>
              <tbody>
                ${IDS.map(id => `
                  <tr>
                    <td class="num gold-text">${id}</td>
                    <td>
                      <input class="name-in" data-id="${id}" value="${esc(displayName(contestants[id]))}" placeholder="ใส่ชื่อผู้ประกวด" />
                    </td>
                    <td class="num">${scores[id] || 0}</td>
                    <td>
                      <button class="btn btn-ghost btn-sm add-score" data-id="${id}" data-v="1">+1</button>
                      <button class="btn btn-ghost btn-sm add-score" data-id="${id}" data-v="5">+5</button>
                      <button class="btn btn-ghost btn-sm add-score" data-id="${id}" data-v="-1">-1</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="ctrl-sec">
            <button id="btnResetMode" class="btn btn-red btn-sm">รีเซ็ตคะแนนโหมด ${state.active_mode.toUpperCase()}</button>
          </div>
        </div>
      </div>
    `;

    $('#toggleOpen').onclick = async () => {
      const prop = state.active_mode + '_open';
      await api.setState({ [prop]: !state[prop] });
      state = await api.getState();
      draw();
    };

    $('#switchMode').onclick = async () => {
      const next = state.active_mode === 'test' ? 'live' : 'test';
      await api.setState({ active_mode: next });
      state = await api.getState();
      scores = await api.getScores(state.active_mode);
      draw();
    };

    $('#btnResetMode').onclick = async () => {
      if (confirm(`ยืนยันการล้างคะแนนทั้งหมดของโหมด ${state.active_mode.toUpperCase()}?`)) {
        await api.reset(state.active_mode);
        scores = await api.getScores(state.active_mode);
        draw();
      }
    };

    $$('.add-score').forEach(btn => {
      btn.onclick = async () => {
        await api.testAdd(btn.dataset.id, Number(btn.dataset.v));
        scores = await api.getScores(state.active_mode);
        draw();
      };
    });

    $$('.name-in').forEach(inp => {
      inp.onchange = async () => {
        await api.updateContestant(inp.dataset.id, inp.value.trim(), contestants[inp.dataset.id]?.photo_url || '');
        contestants = await api.getContestants();
        toast('บันทึกชื่อเรียบร้อย');
      };
    });
  }

  draw();
}

// Start application
initApp();