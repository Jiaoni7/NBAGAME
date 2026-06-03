// ============================================================
// 王朝传奇 - NBA 球队经营放置游戏
// 界面流程：登录/注册 → 单/双人模式 → 新档/旧档/规则 → 难度选择 → 游戏
// v2：多元资金玩法 / 可持续赛季运营 / 真实NBA球员 / 充值支付接口
// ============================================================

// ============================================================
// 音效系统：Web Audio API 程序化合成（无外部音频文件 / 无第三方库 / 兼容 iOS）
// 提供背景音乐 + 点击/投篮/签约/消耗/奖励/胜负等音效，音量与开关可在设置中调节
// ============================================================
const Sound = (() => {
  'use strict';
  const SET_KEY = 'nba_dynasty_settings';
  const defaults = { musicOn: true, sfxOn: true, musicVol: 0.4, sfxVol: 0.6, quality: 'high', vibrate: true, bg: 'arena' };
  let settings = load();

  function load() {
    try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); }
    catch { return Object.assign({}, defaults); }
  }
  function save() { try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch {} }
  function get() { return settings; }
  function set(k, v) {
    settings[k] = v; save(); applyVolumes();
    if (k === 'quality') applyQuality();
    if (k === 'bg') applyBackground();
  }

  // ---------- AudioContext（首次手势时创建并恢复）----------
  let ctx = null, masterGain = null, musicGain = null, sfxGain = null;
  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch { return null; }
      masterGain = ctx.createGain(); masterGain.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.connect(masterGain);
      sfxGain = ctx.createGain(); sfxGain.connect(masterGain);
      applyVolumes();
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch {} }
    return ctx;
  }
  function applyVolumes() {
    if (musicGain) musicGain.gain.value = settings.musicOn ? settings.musicVol : 0;
    if (sfxGain) sfxGain.gain.value = settings.sfxOn ? settings.sfxVol : 0;
  }

  // ---------- 基础合成 ----------
  function tone(freq, dur, opt) {
    opt = opt || {};
    const c = ensureCtx(); if (!c || !settings.sfxOn) return;
    const t0 = c.currentTime + (opt.delay || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = opt.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opt.to) osc.frequency.exponentialRampToValueAtTime(opt.to, t0 + dur);
    const peak = opt.gain == null ? 0.5 : opt.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  function noise(dur, opt) {
    opt = opt || {};
    const c = ensureCtx(); if (!c || !settings.sfxOn) return;
    const t0 = c.currentTime + (opt.delay || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = opt.filter || 'bandpass'; f.frequency.value = opt.freq || 1200; f.Q.value = opt.q || 1;
    const g = c.createGain();
    const peak = opt.gain == null ? 0.4 : opt.gain;
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t0); src.stop(t0 + dur);
  }

  // ---------- 各类音效 ----------
  const SFX = {
    click()  { tone(660, 0.08, { type: 'triangle', gain: 0.32 }); },
    shoot()  { noise(0.12, { filter: 'highpass', freq: 3200, gain: 0.22 }); tone(190, 0.13, { type: 'sine', to: 90, gain: 0.3, delay: 0.02 }); },
    buy()    { [523, 659, 784].forEach((f, i) => tone(f, 0.12, { type: 'triangle', gain: 0.3, delay: i * 0.05 })); },
    spend()  { tone(880, 0.09, { type: 'square', gain: 0.2 }); tone(587, 0.13, { type: 'square', gain: 0.18, delay: 0.06 }); },
    coin()   { tone(988, 0.08, { type: 'square', gain: 0.24 }); tone(1319, 0.15, { type: 'square', gain: 0.2, delay: 0.06 }); },
    reward() { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.13, { type: 'triangle', gain: 0.28, delay: i * 0.06 })); },
    error()  { tone(165, 0.18, { type: 'sawtooth', gain: 0.22, to: 110 }); },
    win()    { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { type: 'triangle', gain: 0.3, delay: i * 0.06 })); },
    lose()   { tone(330, 0.26, { type: 'sawtooth', gain: 0.2, to: 175 }); },
    victory(){ [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, { type: 'triangle', gain: 0.33, delay: i * 0.11 })); noise(0.5, { filter: 'highpass', freq: 5000, gain: 0.1, delay: 0.1 }); },
  };
  function play(name) { if (SFX[name]) SFX[name](); }

  // ---------- 背景音乐（程序化循环：C - G - Am - F 进行）----------
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  const BPM = 92, stepDur = 60 / BPM / 2;       // 八分音符
  const BASS_M  = [48,48,48,48, 43,43,43,43, 45,45,45,45, 41,41,41,41];
  const CHORD_M = [[60,64,67],[60,64,67],[60,64,67],[60,64,67],
                   [55,59,62],[55,59,62],[55,59,62],[55,59,62],
                   [57,60,64],[57,60,64],[57,60,64],[57,60,64],
                   [53,57,60],[53,57,60],[53,57,60],[53,57,60]];
  const MEL_M   = [72,0,76,0, 74,0,79,0, 72,0,76,72, 77,0,72,0];
  let musicTimer = null, musicOn = false, nextTime = 0, stepIdx = 0;

  function mNote(freq, dur, t0, type, peak) {
    if (!ctx || !musicGain) return;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(musicGain);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  function playMusicStep(i, when) {
    mNote(mtof(BASS_M[i]), stepDur * 0.9, when, 'triangle', 0.5);
    if (i % 4 === 0) CHORD_M[i].forEach(m => mNote(mtof(m), stepDur * 3.6, when, 'sine', 0.15));
    if (MEL_M[i]) mNote(mtof(MEL_M[i]), stepDur * 1.6, when, 'triangle', 0.2);
  }
  function scheduler() {
    if (!musicOn || !ctx) return;
    while (nextTime < ctx.currentTime + 0.25) {
      playMusicStep(stepIdx, nextTime);
      nextTime += stepDur;
      stepIdx = (stepIdx + 1) % 16;
    }
    musicTimer = setTimeout(scheduler, 60);
  }
  function startMusic() {
    if (musicOn || !settings.musicOn) return;
    const c = ensureCtx(); if (!c) return;
    musicOn = true; stepIdx = 0; nextTime = c.currentTime + 0.1; scheduler();
  }
  function stopMusic() { musicOn = false; if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; } }
  function setMusic(on) { set('musicOn', on); if (on) startMusic(); else stopMusic(); }

  // ---------- 首次手势解锁（满足浏览器/iOS 自动播放策略）----------
  let unlocked = false;
  function unlock() {
    if (unlocked) return;
    const c = ensureCtx(); if (!c) return;
    unlocked = true;
    if (settings.musicOn) startMusic();
  }

  // ---------- 画质 ----------
  function applyQuality() {
    const b = document.body; if (!b) return;
    b.classList.remove('quality-low', 'quality-medium', 'quality-high');
    b.classList.add('quality-' + (settings.quality || 'high'));
  }
  // ---------- 背景主题 ----------
  function applyBackground() {
    const b = document.body; if (!b) return;
    ['bg-arena', 'bg-night', 'bg-court', 'bg-fire', 'bg-purple', 'bg-clean']
      .forEach(c => b.classList.remove(c));
    b.classList.add('bg-' + (settings.bg || 'arena'));
  }
  // ---------- 震动反馈 ----------
  function vibrate(ms) { if (settings.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch {} } }

  return { get, set, play, setMusic, startMusic, stopMusic, unlock, applyQuality, applyBackground, applyVolumes, vibrate };
})();

const App = (() => {
  'use strict';

  // ---------- 配置：球员位置（放置产出单位）----------
  const POSITIONS = [
    { key: 'PG', name: '控球后卫', color: '#1d428a', base: 1.0,  cost: 15 },
    { key: 'SG', name: '得分后卫', color: '#c8102e', base: 2.6,  cost: 90 },
    { key: 'SF', name: '小前锋',   color: '#f7901e', base: 7,    cost: 520 },
    { key: 'PF', name: '大前锋',   color: '#7e57c2', base: 18,   cost: 3200 },
    { key: 'C',  name: '中锋',     color: '#2ecc71', base: 48,   cost: 21000 },
  ];

  // ---------- 真实 NBA 球员池（按位置，由易到难逐级签约）----------
  // face：卡通画像特征（肤色/发色/发型/胡须等），程序化绘制，规避真实肖像版权
  const PLAYER_POOL = {
    PG: [
      { en: 'Chris Paul',    cn: '克里斯·保罗',  no: 3,  rating: 90, face:{ skin:'#8d5524', hair:'#15110d', style:'short',    beard:1 } },
      { en: 'Steve Nash',    cn: '史蒂夫·纳什',  no: 13, rating: 91, face:{ skin:'#f1c27d', hair:'#6b4a2a', style:'mid' } },
      { en: 'Allen Iverson', cn: '阿伦·艾弗森',  no: 3,  rating: 93, face:{ skin:'#7a4a26', hair:'#15110d', style:'cornrows', headband:'#ffffff' } },
      { en: 'Magic Johnson', cn: '魔术师约翰逊', no: 32, rating: 96, face:{ skin:'#8d5524', hair:'#15110d', style:'short' } },
      { en: 'Stephen Curry', cn: '斯蒂芬·库里',  no: 30, rating: 98, face:{ skin:'#a86a3c', hair:'#1a120c', style:'short',    beard:1 } },
    ],
    SG: [
      { en: 'Klay Thompson', cn: '克莱·汤普森',   no: 11, rating: 89, face:{ skin:'#b07a4a', hair:'#1a120c', style:'short' } },
      { en: 'Ray Allen',     cn: '雷·阿伦',       no: 34, rating: 90, face:{ skin:'#8d5524', hair:'#15110d', style:'fade' } },
      { en: 'James Harden',  cn: '詹姆斯·哈登',   no: 13, rating: 93, face:{ skin:'#7a4a26', hair:'#15110d', style:'short',  beard:2 } },
      { en: 'Dwyane Wade',   cn: '德怀恩·韦德',   no: 3,  rating: 95, face:{ skin:'#6e4423', hair:'#15110d', style:'short',  beard:1 } },
      { en: 'Kobe Bryant',   cn: '科比·布莱恩特', no: 24, rating: 98, face:{ skin:'#7a4a26', hair:'#15110d', style:'short' } },
      { en: 'Michael Jordan',cn: '迈克尔·乔丹',   no: 23, rating: 99, face:{ skin:'#6e4423', hair:'#15110d', style:'bald',  mustache:1 } },
    ],
    SF: [
      { en: 'Paul Pierce',    cn: '保罗·皮尔斯',   no: 34, rating: 89, face:{ skin:'#7a4a26', hair:'#15110d', style:'short', beard:1 } },
      { en: 'Scottie Pippen', cn: '斯科蒂·皮蓬',   no: 33, rating: 91, face:{ skin:'#6e4423', hair:'#15110d', style:'fade' } },
      { en: 'Kawhi Leonard',  cn: '科怀·伦纳德',   no: 2,  rating: 93, face:{ skin:'#6e4423', hair:'#15110d', style:'cornrows', beard:1 } },
      { en: 'Kevin Durant',   cn: '凯文·杜兰特',   no: 35, rating: 96, face:{ skin:'#8d5524', hair:'#15110d', style:'short', beard:1 } },
      { en: 'Larry Bird',     cn: '拉里·伯德',     no: 33, rating: 97, face:{ skin:'#f1c27d', hair:'#caa15a', style:'mid',   mustache:1 } },
      { en: 'LeBron James',   cn: '勒布朗·詹姆斯', no: 23, rating: 99, face:{ skin:'#7a4a26', hair:'#15110d', style:'fade',  beard:1, headband:'#ffd54a' } },
    ],
    PF: [
      { en: 'Charles Barkley',       cn: '查尔斯·巴克利',     no: 34, rating: 91, face:{ skin:'#6e4423', hair:'#15110d', style:'bald' } },
      { en: 'Karl Malone',           cn: '卡尔·马龙',         no: 32, rating: 92, face:{ skin:'#6e4423', hair:'#15110d', style:'bald', mustache:1 } },
      { en: 'Kevin Garnett',         cn: '凯文·加内特',       no: 21, rating: 93, face:{ skin:'#5c3a21', hair:'#15110d', style:'short' } },
      { en: 'Dirk Nowitzki',         cn: '德克·诺维茨基',     no: 41, rating: 95, face:{ skin:'#f1c27d', hair:'#d9b36a', style:'short' } },
      { en: 'Giannis Antetokounmpo', cn: '扬尼斯·阿德托昆博', no: 34, rating: 96, face:{ skin:'#5c3a21', hair:'#15110d', style:'short', beard:1 } },
      { en: 'Tim Duncan',            cn: '蒂姆·邓肯',         no: 21, rating: 97, face:{ skin:'#6e4423', hair:'#15110d', style:'short' } },
    ],
    C: [
      { en: 'David Robinson',      cn: '大卫·罗宾逊',     no: 50, rating: 93, face:{ skin:'#6e4423', hair:'#15110d', style:'fade',  mustache:1 } },
      { en: 'Nikola Jokic',        cn: '尼古拉·约基奇',   no: 15, rating: 96, face:{ skin:'#f1c27d', hair:'#6b4a2a', style:'mid',   beard:1 } },
      { en: 'Hakeem Olajuwon',     cn: '哈基姆·奥拉朱旺', no: 34, rating: 96, face:{ skin:'#5c3a21', hair:'#15110d', style:'short', mustache:1 } },
      { en: "Shaquille O'Neal",    cn: '沙奎尔·奥尼尔',   no: 34, rating: 98, face:{ skin:'#6e4423', hair:'#15110d', style:'bald' } },
      { en: 'Wilt Chamberlain',    cn: '威尔特·张伯伦',   no: 13, rating: 98, face:{ skin:'#6e4423', hair:'#15110d', style:'short' } },
      { en: 'Kareem Abdul-Jabbar', cn: '贾巴尔',          no: 33, rating: 99, face:{ skin:'#6e4423', hair:'#15110d', style:'bald', glasses:1, beard:1 } },
    ],
  };
  function playerAt(posKey, level) {
    const pool = PLAYER_POOL[posKey];
    if (level <= 0) return null;
    return pool[Math.min(level - 1, pool.length - 1)];
  }
  function initials(en) {
    const parts = en.replace(/[^A-Za-z\s]/g, '').trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  // ---------- 卡通球星画像（程序化 SVG，原创卡通风格，不使用任何真实照片）----------
  function avatarSVG(p, jersey) {
    const f = p.face || {};
    const skin = f.skin || '#d99a5b';
    const skinShade = shade(skin, -18);
    const hair = f.hair || '#15110d';
    const style = f.style || 'short';
    const jc = jersey || '#1d428a';
    const jcDark = shade(jc, -22);
    let s = '';
    // 球衣肩部 + 领口
    s += `<path d="M14 100 Q14 78 50 78 Q86 78 86 100 Z" fill="${jc}"/>`;
    s += `<path d="M40 80 Q50 90 60 80 L60 78 Q50 84 40 78 Z" fill="${jcDark}"/>`;
    // 后发（爆炸头 / 长发）
    if (style === 'afro') s += `<circle cx="50" cy="40" r="31" fill="${hair}"/>`;
    if (style === 'mid')  s += `<path d="M22 40 Q22 16 50 16 Q78 16 78 40 L78 64 Q72 60 72 50 L28 50 Q28 60 22 64 Z" fill="${hair}"/>`;
    // 耳朵
    s += `<circle cx="27" cy="52" r="6" fill="${skin}"/><circle cx="73" cy="52" r="6" fill="${skin}"/>`;
    s += `<circle cx="27" cy="52" r="3" fill="${skinShade}"/><circle cx="73" cy="52" r="3" fill="${skinShade}"/>`;
    // 头/脸
    s += `<path d="M30 34 Q30 24 50 24 Q70 24 70 34 L70 58 Q70 76 50 76 Q30 76 30 58 Z" fill="${skin}"/>`;
    // 胡须
    if (f.beard === 1) s += `<path d="M32 56 Q32 78 50 78 Q68 78 68 56 Q60 70 50 70 Q40 70 32 56 Z" fill="${hair}"/>`;
    if (f.beard === 2) s += `<path d="M30 50 Q30 82 50 82 Q70 82 70 50 Q70 72 50 72 Q30 72 30 50 Z" fill="${hair}"/>`;
    // 顶发
    if (style === 'short' || style === 'cornrows')
      s += `<path d="M28 42 Q26 20 50 20 Q74 20 72 42 Q66 30 50 30 Q34 30 28 42 Z" fill="${hair}"/>`;
    if (style === 'fade')
      s += `<path d="M30 38 Q30 22 50 22 Q70 22 70 38 Q62 30 50 30 Q38 30 30 38 Z" fill="${hair}"/>`;
    if (style === 'mid')
      s += `<path d="M28 40 Q26 18 50 18 Q74 18 72 40 Q66 28 50 28 Q34 28 28 40 Z" fill="${hair}"/>`;
    if (style === 'cornrows') {
      for (let i = 0; i < 5; i++) { const x = 33 + i * 8.5; s += `<line x1="${x}" y1="22" x2="${x}" y2="32" stroke="${shade(hair,30)}" stroke-width="1.4"/>`; }
    }
    if (style === 'bald') s += `<path d="M32 36 Q40 28 50 28 Q60 28 68 36 Q60 33 50 33 Q40 33 32 36 Z" fill="${shade(skin,12)}" opacity="0.5"/>`;
    // 发带
    if (f.headband) s += `<rect x="29" y="33" width="42" height="7" rx="2" fill="${f.headband}"/>`;
    // 眉毛
    s += `<rect x="38" y="48" width="9" height="2.4" rx="1.2" fill="${hair}"/><rect x="53" y="48" width="9" height="2.4" rx="1.2" fill="${hair}"/>`;
    // 眼睛
    s += `<circle cx="42" cy="54" r="2.6" fill="#23252e"/><circle cx="58" cy="54" r="2.6" fill="#23252e"/>`;
    // 眼镜 / 护目镜
    if (f.glasses) s += `<g fill="none" stroke="#1b1d24" stroke-width="2"><rect x="36" y="49" width="12" height="10" rx="3"/><rect x="52" y="49" width="12" height="10" rx="3"/><line x1="48" y1="54" x2="52" y2="54"/></g>`;
    // 鼻
    s += `<path d="M50 56 L48 62 Q50 64 52 62 Z" fill="${skinShade}"/>`;
    // 嘴（微笑）
    s += `<path d="M43 66 Q50 71 57 66" stroke="#7a3b2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    // 胡子
    if (f.mustache) s += `<path d="M42 63 Q50 67 58 63 Q50 65 42 63 Z" fill="${hair}"/>`;
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">${s}</svg>`;
  }
  // 颜色明暗调整
  function shade(hex, amt) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    let n = parseInt(m[1], 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // ---------- 配置：设施升级（全局倍率）----------
  const FACILITIES = [
    { key: 'gym',     icon: '🏋️', name: '训练馆',   desc: '球员产出 ×1.5', cost: 200,  mult: 1.5 },
    { key: 'scout',   icon: '🔭', name: '球探网络', desc: '点击收益 ×2',   cost: 120,  mult: 2.0 },
    { key: 'sponsor', icon: '💼', name: '商业赞助', desc: '全局产出 ×1.4', cost: 1500, mult: 1.4 },
    { key: 'fans',    icon: '📣', name: '主场球迷', desc: '全局产出 ×1.6', cost: 9000, mult: 1.6 },
  ];

  // ---------- 配置：难度 ----------
  const DIFFICULTIES = {
    rookie: { key:'rookie', icon:'🌱', name:'新秀', tag:'轻松', startFunds:200, costMul:0.85, outputMul:1.3, goal:50000,  seasonBase:8000,   desc:'起步资金充裕，成本更低，适合新手体验。' },
    pro:    { key:'pro',    icon:'💪', name:'职业', tag:'平衡', startFunds:50,  costMul:1.0,  outputMul:1.0, goal:250000, seasonBase:30000,  desc:'标准平衡的经营节奏，正统的王朝挑战。' },
    hof:    { key:'hof',    icon:'👑', name:'名人堂', tag:'硬核', startFunds:0, costMul:1.25, outputMul:0.85,goal:1000000,seasonBase:120000, desc:'资源紧张、成本高昂，只为真正的传奇而生。' },
  };

  // ---------- 配置：限时活动（全局轮换）----------
  const EVENTS = [
    { key:'allstar', icon:'⭐', name:'全明星周末', desc:'自动产出 ×2',   dur:30, output:2 },
    { key:'playoff', icon:'🔥', name:'季后赛奖金', desc:'比赛奖励 ×3',   dur:30, match:3 },
    { key:'fanfest', icon:'🎉', name:'球迷狂欢节', desc:'投篮收益 ×4',   dur:25, click:4 },
    { key:'draft',   icon:'🎓', name:'选秀大会',   desc:'签约成本 -40%', dur:25, cost:0.6 },
    { key:'finals',  icon:'🏆', name:'总决赛热潮', desc:'全场收益 ×2.5', dur:20, output:2.5, click:2.5, match:2.5 },
  ];

  // ---------- 配置：充值礼包（真实货币 → 钻石）----------
  const PACKAGES = [
    { key:'p1', icon:'🥉', name:'新秀礼包',   price:6,   diamonds:60,   gift:'' },
    { key:'p2', icon:'🥈', name:'全明星礼包', price:30,  diamonds:330,  gift:'赠 30 钻' },
    { key:'p3', icon:'🥇', name:'名人堂礼包', price:98,  diamonds:1280, gift:'赠 300 钻', hot:true },
    { key:'p4', icon:'💎', name:'王朝至尊',   price:648, diamonds:8000, gift:'赠 2000 钻' },
  ];

  // ---------- 配置：钻石商店（钻石 → 增益）----------
  const DIAMOND_ITEMS = [
    { key:'cash_s', icon:'💵', name:'资金补给',    desc:'立即获得约 60 秒产出的资金',  cost:10,  type:'cash', sec:60 },
    { key:'cash_l', icon:'💰', name:'巨额资金',    desc:'立即获得约 10 分钟产出的资金', cost:50,  type:'cash', sec:600 },
    { key:'boost',  icon:'⚡', name:'双倍产出卡',  desc:'90 秒内全队产出 ×2',          cost:30,  type:'boost', sec:90 },
    { key:'perm',   icon:'🌟', name:'永久产出+20%',desc:'立即永久提升 20% 全局产出',   cost:120, type:'perm', amt:0.2 },
    { key:'refresh',icon:'🔄', name:'比赛冷却清除',desc:'立即清除比赛冷却，可再战',     cost:5,   type:'refresh' },
  ];

  // ---------- 任务（每局成就，可领取奖励）----------
  const TASKS = [
    { key:'clicks',  name:'投篮训练 50 次',     target:50, metric:'clicks',  reward:{ fundSec:30,  dia:5 } },
    { key:'signs',   name:'签约/升级球员 10 次', target:10, metric:'signs',   reward:{ fundSec:60,  dia:8 } },
    { key:'matches', name:'进行 8 场联赛',      target:8,  metric:'matches', reward:{ fundSec:90,  dia:10 } },
    { key:'wins',    name:'赢得 5 场比赛',      target:5,  metric:'wins',    reward:{ fundSec:120, dia:15 } },
  ];

  const NBA_TEAMS = ['湖人','凯尔特人','勇士','公牛','马刺','热火','雄鹿','掘金','76人','快船','太阳','篮网'];

  const POINT_LABEL = '资金';
  const TICK_MS = 100;
  const MANUAL_GAIN_BASE = 1;
  const MATCH_COOLDOWN = 6000;
  const OFFLINE_RATE = 0.5;
  const OFFLINE_CAP_H = 8;

  // ---------- 赛制：常规赛 → 季后赛 → 总冠军 ----------
  const REGULAR_GAMES = 12;        // 每赛季常规赛场次
  const PLAYOFF_NEED  = 6;         // 晋级季后赛所需胜场（胜率≥50%）
  const SERIES_WIN    = 4;         // 季后赛每轮系列赛胜场（7局4胜）
  const PLAYOFF_ROUND_NAMES = { 1: '季后赛首轮', 2: '分区决赛', 3: '总决赛' };

  // ---------- 背景主题 ----------
  const BACKGROUNDS = [
    { key:'arena',  name:'主场蓝红' },
    { key:'night',  name:'午夜深空' },
    { key:'court',  name:'木纹球场' },
    { key:'fire',   name:'烈焰红'   },
    { key:'purple', name:'紫金王朝' },
    { key:'clean',  name:'简约深灰' },
  ];

  // 扁平化球员池（用于生成对手阵容展示）
  const ALL_PLAYERS = [];
  Object.keys(PLAYER_POOL).forEach(k => PLAYER_POOL[k].forEach(p => ALL_PLAYERS.push(p)));

  // ---------- 联盟模拟：球队 / 球员名库 ----------
  const LEAGUE_SIZE = 8;          // 联盟球队数（含玩家），8→4→2→1 三轮季后赛
  const AI_TEAM_NAMES = ['湖人','凯尔特人','勇士','公牛','马刺','热火','雄鹿','掘金','76人','快船','太阳','篮网','尼克斯','独行侠','森林狼','鹈鹕'];
  const GEN_FIRST = ['马库斯','德文','贾伦','泰勒','凯尔','布兰登','达柳斯','杰登','卡梅伦','伊森','泰瑞斯','肖恩','科迪','马利克','贾马尔','德里克','特雷','奥斯汀','以赛亚','卡尔顿','贾巴里','多米尼克','雷吉','克林特','奥比'];
  const GEN_LAST  = ['威廉姆斯','约翰逊','史密斯','布朗','戴维斯','托马斯','杰克逊','怀特','哈里斯','刘易斯','沃克','罗宾逊','卡特','格林','米切尔','莫里斯','杨','福克斯','爱德华兹','班克斯','里德','贝尔','库珀','华盛顿','邓恩'];
  // 位置基础数据画像（评级≈99 顶配时的场均，按评级与位置缩放）
  const STAT_PROFILE = {
    PG: { pts: 22, reb: 4.5, ast: 9.8, stl: 1.9, blk: 0.4 },
    SG: { pts: 27, reb: 4.8, ast: 5.2, stl: 1.6, blk: 0.4 },
    SF: { pts: 25, reb: 7.2, ast: 5.8, stl: 1.5, blk: 0.8 },
    PF: { pts: 22, reb: 11,  ast: 4.0, stl: 1.2, blk: 1.7 },
    C:  { pts: 20, reb: 13,  ast: 3.4, stl: 0.9, blk: 2.5 },
  };
  // 个人奖项定义（常规赛结束颁发）
  const AWARDS = [
    { key:'mvp',  icon:'🏅', name:'常规赛 MVP',  desc:'最有价值球员' },
    { key:'dpoy', icon:'🛡️', name:'最佳防守球员', desc:'DPOY' },
    { key:'roy',  icon:'🌟', name:'最佳新秀',    desc:'ROY' },
    { key:'mip',  icon:'📈', name:'最快进步球员', desc:'MIP' },
    { key:'smoy', icon:'🔥', name:'最佳第六人',  desc:'6MOY' },
  ];
  // 基础数据榜 / 高阶数据榜定义
  const BASIC_STATS = [
    { key:'pts', name:'得分', suffix:'' },
    { key:'reb', name:'篮板', suffix:'' },
    { key:'ast', name:'助攻', suffix:'' },
    { key:'stl', name:'抢断', suffix:'' },
    { key:'blk', name:'盖帽', suffix:'' },
  ];
  const ADV_STATS = [
    { key:'per', name:'效率值(PER)', suffix:'' },
    { key:'ts',  name:'真实命中率(TS%)', suffix:'%', pct:true },
    { key:'usg', name:'使用率(USG%)', suffix:'%' },
    { key:'eff', name:'综合效率(EFF)', suffix:'' },
  ];

  // 确定性伪随机（同一 seed 多次渲染结果稳定）
  function seededRand(seedStr) {
    let h = 2166136261;
    const s = String(seedStr);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // 由评级+位置+种子生成完整数据行（基础+高阶，场均）
  function genStatLine(rating, posKey, seedStr) {
    const prof = STAT_PROFILE[posKey] || STAT_PROFILE.SF;
    const rng = seededRand(seedStr || (rating + posKey));
    const rf = Math.max(0.4, Math.min(1.08, 0.46 + (rating - 78) / 21 * 0.56)); // 评级因子
    const j = () => 0.85 + rng() * 0.3;  // 个体波动 ±15%
    const pts = +(prof.pts * rf * j()).toFixed(1);
    const reb = +(prof.reb * rf * j()).toFixed(1);
    const ast = +(prof.ast * rf * j()).toFixed(1);
    const stl = +(prof.stl * rf * j()).toFixed(1);
    const blk = +(prof.blk * rf * j()).toFixed(1);
    const ts  = +Math.min(67, 50 + (rating - 78) / 21 * 13 + (rng() * 4 - 2)).toFixed(1);
    const usg = +Math.min(38, 14 + pts * 0.62 + (rng() * 3 - 1.5)).toFixed(1);
    const eff = +(pts + reb + ast + stl + blk).toFixed(1);
    const per = +Math.min(33, (pts * 0.9 + reb * 1.1 + ast * 1.4 + stl * 2.8 + blk * 2.8) * 0.5 + 6).toFixed(1);
    return { pts, reb, ast, stl, blk, ts, usg, eff, per };
  }
  function genPlayerName() { return pick(GEN_FIRST) + '·' + pick(GEN_LAST); }

  // ---------- 运行时状态 ----------
  let authMode = 'login';
  let pendingMode = 'single';
  let pendingDiff = 'pro';
  let teams = [];
  let loopTimer = null;
  let gameMode = null;
  let gameDiff = null;
  let curEvent = null;
  let nextEventAt = 0;
  let storeTeamIdx = 0;
  let payingPkg = null;
  let leagueTeamIdx = 0;
  let leagueTab = 'standings';
  let statBoard = 'player';   // player | team
  let statGroup = 'basic';    // basic | adv

  // =========================================================
  // 账户系统（localStorage）
  // =========================================================
  const DB_KEY = 'nba_dynasty_accounts';
  const CUR_KEY = 'nba_dynasty_current';
  function getAccounts() { try { return JSON.parse(localStorage.getItem(DB_KEY) || '{}'); } catch { return {}; } }
  function saveAccounts(a) { localStorage.setItem(DB_KEY, JSON.stringify(a)); }
  function curUser() { return localStorage.getItem(CUR_KEY) || null; }
  function setCurUser(n) { n ? localStorage.setItem(CUR_KEY, n) : localStorage.removeItem(CUR_KEY); }
  function getDiamonds() { const a = getAccounts(), u = curUser(); return (a[u] && a[u].diamonds) || 0; }
  function addDiamonds(n) {
    const a = getAccounts(), u = curUser();
    if (!a[u]) return;
    a[u].diamonds = ((a[u].diamonds) || 0) + n;
    saveAccounts(a);
    updateGemDisplays();
  }

  // =========================================================
  // 屏幕切换
  // =========================================================
  const SCREENS = ['login', 'mode', 'archive', 'difficulty', 'game'];
  function goto(name) {
    SCREENS.forEach(s => document.getElementById('screen-' + s).classList.toggle('active', s === name));
    if (name !== 'game') stopLoop();
    if (name === 'difficulty') renderDifficulty();
    if (name === 'archive') refreshArchiveScreen();
    window.scrollTo(0, 0);
  }

  // =========================================================
  // 一级：登录 / 注册
  // =========================================================
  function switchAuthTab(mode) {
    authMode = mode;
    document.getElementById('tab-login').classList.toggle('active', mode === 'login');
    document.getElementById('tab-register').classList.toggle('active', mode === 'register');
    document.getElementById('auth-confirm-field').style.display = mode === 'register' ? 'block' : 'none';
    document.getElementById('auth-submit').textContent = mode === 'register' ? '注 册' : '登 录';
    setMsg('');
  }
  function setMsg(text, type) {
    const el = document.getElementById('auth-msg');
    el.textContent = text || '';
    el.className = 'msg' + (type ? ' ' + type : '');
  }
  function submitAuth() {
    const user = document.getElementById('auth-user').value.trim();
    const pass = document.getElementById('auth-pass').value;
    if (!user || !pass) return setMsg('请填写用户名和密码', 'err');
    if (user.length < 2) return setMsg('用户名至少 2 个字符', 'err');
    const accounts = getAccounts();
    if (authMode === 'register') {
      const confirm = document.getElementById('auth-confirm').value;
      if (pass !== confirm) return setMsg('两次输入的密码不一致', 'err');
      if (accounts[user]) return setMsg('该用户名已被注册', 'err');
      accounts[user] = { password: pass, saves: [], diamonds: 30, created: Date.now() };
      saveAccounts(accounts); setCurUser(user);
      setMsg('注册成功！赠送 30 钻石，正在进入...', 'ok');
      setTimeout(() => enterAfterAuth(), 600);
    } else {
      if (!accounts[user]) return setMsg('用户不存在，请先注册', 'err');
      if (accounts[user].password !== pass) return setMsg('密码错误', 'err');
      if (accounts[user].diamonds == null) { accounts[user].diamonds = 30; saveAccounts(accounts); }
      setCurUser(user); setMsg('登录成功！', 'ok');
      setTimeout(() => enterAfterAuth(), 400);
    }
  }
  function enterAfterAuth() {
    document.getElementById('auth-pass').value = '';
    if (document.getElementById('auth-confirm')) document.getElementById('auth-confirm').value = '';
    goto('mode');
  }

  // ---------- 第三方登录（微信 / QQ，模拟 OAuth 授权流程）----------
  const SOCIAL = {
    wechat: { name: '微信', icon: '💬', color: '#07c160', prefix: '微信用户' },
    qq:     { name: 'QQ',   icon: '🐧', color: '#12b7f5', prefix: 'QQ用户' },
  };
  function socialLogin(provider) {
    const cfg = SOCIAL[provider];
    if (!cfg) return;
    const m = ensureModal('social-modal'); m.classList.add('show');
    m.innerHTML = `
      <div class="card" style="max-width:360px;text-align:center;">
        <div style="font-size:46px;">${cfg.icon}</div>
        <h2 style="margin:8px 0;color:${cfg.color};">${cfg.name}授权登录</h2>
        <p style="color:var(--muted);font-size:13px;">正在跳转 ${cfg.name} 安全授权…</p>
        <div class="spinner" style="border-top-color:${cfg.color};"></div>
        <p style="color:var(--muted);font-size:12px;">请在 ${cfg.name} 中确认授权</p>
      </div>`;
    setTimeout(() => {
      m.innerHTML = `
        <div class="card" style="max-width:360px;text-align:center;">
          <div style="font-size:46px;">${cfg.icon}</div>
          <h2 style="margin:8px 0;color:${cfg.color};">${cfg.name}授权</h2>
          <p style="color:var(--muted);font-size:13px;margin-bottom:6px;">「王朝传奇」申请获取你的</p>
          <p style="font-size:13px;margin-bottom:16px;">头像、昵称（公开信息）</p>
          <button class="btn" style="background:${cfg.color};" onclick="App.confirmSocial('${provider}')">确认授权并登录</button>
          <button class="btn ghost" style="margin-top:10px;" onclick="App.cancelSocial()">取消</button>
        </div>`;
    }, 1200);
  }
  function cancelSocial() { const m = document.getElementById('social-modal'); if (m) m.classList.remove('show'); }
  function confirmSocial(provider) {
    const cfg = SOCIAL[provider];
    const accounts = getAccounts();
    // 以 openid 作为唯一账号标识，首次授权自动注册
    let openid = localStorage.getItem('nba_openid_' + provider);
    if (!openid) { openid = cfg.prefix + Math.floor(1000 + Math.random() * 9000); localStorage.setItem('nba_openid_' + provider, openid); }
    if (!accounts[openid]) {
      accounts[openid] = { password: null, social: provider, saves: [], diamonds: 30, created: Date.now() };
      saveAccounts(accounts);
    } else if (accounts[openid].diamonds == null) {
      accounts[openid].diamonds = 30; saveAccounts(accounts);
    }
    setCurUser(openid);
    cancelSocial();
    toast(`${cfg.icon} ${cfg.name}登录成功，欢迎 ${openid}`);
    setTimeout(() => goto('mode'), 300);
  }

  // =========================================================
  // 二级：单 / 双人模式
  // =========================================================
  function chooseMode(mode) { pendingMode = mode; goto('archive'); }

  // =========================================================
  // 三级：新档 / 旧档 / 规则
  // =========================================================
  function refreshArchiveScreen() {
    const list = document.getElementById('load-list');
    if (list) list.style.display = 'none';
    document.getElementById('archive-sub').textContent =
      pendingMode === 'dual' ? '双人对战 · 选择开始方式' : '单人模式 · 选择开始方式';
    const saves = getSaves();
    const loadOpt = document.getElementById('opt-load');
    const loadDesc = document.getElementById('load-desc');
    if (pendingMode === 'dual') {
      loadOpt.classList.add('locked');
      loadOpt.onclick = () => toast('双人对战为即时对决，不支持读档');
      loadDesc.textContent = '双人对战不支持读档';
    } else {
      loadOpt.classList.remove('locked');
      loadOpt.onclick = openLoadList;
      loadDesc.textContent = saves.length ? `共 ${saves.length} 个存档` : '暂无存档';
    }
  }
  function getSaves() {
    const accounts = getAccounts(), u = curUser();
    return (accounts[u] && accounts[u].saves) || [];
  }
  function openLoadList() {
    const saves = getSaves();
    const list = document.getElementById('load-list');
    const body = document.getElementById('load-list-body');
    list.style.display = 'block';
    if (!saves.length) { body.innerHTML = '<div class="empty">暂无存档，请先开始新档</div>'; return; }
    body.innerHTML = saves.map((s, i) => {
      const d = new Date(s.timestamp);
      const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const diff = DIFFICULTIES[s.diff] || DIFFICULTIES.pro;
      const banners = '🏆'.repeat(Math.min(s.banners || 0, 5));
      return `<div class="save-row" onclick="App.loadSave(${i})">
        <span class="av">${diff.icon}</span>
        <div class="info">
          <div class="n">${esc(s.teamName)} ${banners}</div>
          <div class="d">${diff.name}难度 · 第 ${s.season || 1} 赛季 · ${POINT_LABEL} ${fmt(s.funds)}</div>
          <div class="t">${ds}</div>
        </div>
        <button class="save-del" title="删除存档" onclick="event.stopPropagation();App.deleteSave(${i})">✕</button>
      </div>`;
    }).join('');
  }
  function deleteSave(i) {
    const accounts = getAccounts(), u = curUser();
    if (!accounts[u] || !accounts[u].saves) return;
    accounts[u].saves.splice(i, 1);
    saveAccounts(accounts); openLoadList(); refreshArchiveScreen();
  }

  // =========================================================
  // 四级：难度选择
  // =========================================================
  function renderDifficulty() {
    const grid = document.getElementById('diff-grid');
    const isDual = pendingMode === 'dual';
    grid.innerHTML = Object.values(DIFFICULTIES).map(d => `
      <div class="opt" id="diff-${d.key}" onclick="App.startNewGame('${d.key}')">
        <div class="ico">${d.icon}</div>
        <div class="ttl">${d.name}</div>
        <div class="dsc">${d.desc}</div>
        <div class="diff-stats">
          <div>起步资金：<b>${fmt(d.startFunds)}</b></div>
          <div>成本系数：<b>×${d.costMul}</b></div>
          <div>产出系数：<b>×${d.outputMul}</b></div>
          <div>${isDual ? `夺冠目标：<b>${fmt(d.goal)}</b>` : `首个赛季目标：<b>${fmt(d.seasonBase)}</b>`}</div>
        </div>
        <div class="tag">${d.tag}</div>
      </div>`).join('');
  }

  // =========================================================
  // 队伍工厂
  // =========================================================
  const TEAM_NAMES_1 = ['湖人','凯尔特人','勇士','公牛','马刺','热火','雄鹿','掘金'];
  const TEAM_NAMES_2 = ['王朝','之光','传奇','风暴','烈焰','巨人','远征队','冠军'];
  function randomTeamName() { return pick(TEAM_NAMES_1) + pick(TEAM_NAMES_2); }

  function createTeam(label, customName) {
    const diff = DIFFICULTIES[pendingDiff];
    return {
      label, teamName: customName || randomTeamName(),
      funds: diff.startFunds, diff: pendingDiff,
      goal: diff.goal,
      season: 1, seasonTarget: diff.seasonBase,
      banners: 0, bannerBonus: 0, permBonus: 0, boostUntil: 0,
      players: POSITIONS.map(p => ({ key: p.key, level: 0 })),
      facilities: FACILITIES.reduce((o, f) => (o[f.key] = 0, o), {}),
      totalEarned: diff.startFunds,
      matches: 0, wins: 0, lastMatchAt: 0,
      seasonPhase: 'regular', regGames: 0, regWins: 0,
      playoffRound: 0, seriesWins: 0, seriesLosses: 0, nextOpp: null,
      rookies: [], league: null, awards: null, fmvp: null, history: [],
      stats: { clicks: 0, signs: 0, matches: 0, wins: 0 },
      claimed: {}, won: false, log: [],
    };
  }

  // ---------- 计算 ----------
  function eventCostMul() { return (curEvent && curEvent.cost) ? curEvent.cost : 1; }
  function playerCost(team, posIdx) {
    const pos = POSITIONS[posIdx], lv = team.players[posIdx].level, diff = DIFFICULTIES[team.diff];
    return Math.ceil(pos.cost * Math.pow(1.15, lv) * diff.costMul * eventCostMul());
  }
  function facilityCost(team, key) {
    const f = FACILITIES.find(x => x.key === key), owned = team.facilities[key], diff = DIFFICULTIES[team.diff];
    return Math.ceil(f.cost * Math.pow(2.2, owned) * diff.costMul * eventCostMul());
  }
  function boostMul(team) { return (team.boostUntil && Date.now() < team.boostUntil) ? 2 : 1; }
  function ecoMul(team) {
    const diff = DIFFICULTIES[team.diff];
    return diff.outputMul * (1 + team.permBonus + team.bannerBonus) * boostMul(team);
  }
  function facilityOutputMul(team) {
    let m = 1;
    if (team.facilities.gym)     m *= Math.pow(FACILITIES.find(f=>f.key==='gym').mult, team.facilities.gym);
    if (team.facilities.sponsor) m *= Math.pow(FACILITIES.find(f=>f.key==='sponsor').mult, team.facilities.sponsor);
    if (team.facilities.fans)    m *= Math.pow(FACILITIES.find(f=>f.key==='fans').mult, team.facilities.fans);
    return m;
  }
  function eventOutputMul() { return (curEvent && curEvent.output) ? curEvent.output : 1; }
  function eventClickMul()  { return (curEvent && curEvent.click)  ? curEvent.click  : 1; }
  function eventMatchMul()  { return (curEvent && curEvent.match)  ? curEvent.match  : 1; }
  function fundsPerSec(team) {
    let total = 0;
    POSITIONS.forEach((pos, i) => { total += pos.base * team.players[i].level; });
    return total * ecoMul(team) * facilityOutputMul(team) * eventOutputMul();
  }
  function clickValue(team) {
    const scout = team.facilities.scout ? Math.pow(FACILITIES.find(f=>f.key==='scout').mult, team.facilities.scout) : 1;
    return MANUAL_GAIN_BASE * scout * ecoMul(team) * eventClickMul();
  }
  function teamPower(team) {
    // 战力 = 阵容评分（球员评级×等级加成）+ 新秀替补深度，× 设施加成 × 王朝加成
    // 注意：不再混入 fundsPerSec，确保「签强/升级球员」能真实提升战力与胜率
    let rating = 0;
    POSITIONS.forEach((pos, i) => {
      const lv = team.players[i].level, p = playerAt(pos.key, lv);
      if (p) rating += p.rating * (1 + lv * 0.08);
    });
    let bench = 0;
    (team.rookies || []).forEach(r => { bench += r.rating * 0.4; });
    const facBonus = 1 + (team.facilities.gym || 0) * 0.04 + (team.facilities.fans || 0) * 0.03;
    const dynasty = 1 + (team.bannerBonus || 0);
    return Math.round((rating + bench) * facBonus * dynasty);
  }
  function matchWinChance(myPow, oppPow) {
    if (myPow <= 0) return 0.02;
    return Math.max(0.05, Math.min(0.95, myPow / (myPow + oppPow)));
  }
  // 对手战力阶梯：与「我方战力」无关，随赛季 / 季后赛轮次提升，故提升战力可真实提高胜率
  function opponentPowerFor(team) {
    const s = team.season || 1;
    const base = 140 + (team.matches || 0) * 14; // 双人/资金赛：随场次递增
    return Math.round(base * (0.8 + Math.random() * 0.5));
  }
  function genOppLineup(pow) {
    const sorted = ALL_PLAYERS.slice().sort((a, b) => a.rating - b.rating);
    const t = Math.max(0, Math.min(1, (pow - 90) / 700));
    const out = [];
    for (let i = 0; i < 3; i++) {
      const center = Math.floor(t * (sorted.length - 1));
      const j = Math.max(0, Math.min(sorted.length - 1, center + (Math.floor(Math.random() * 7) - 3)));
      out.push(sorted[j]);
    }
    return out;
  }
  function genOpponent(team) {
    // 单人模式：从联盟真实球队中取对手（常规赛随机 / 季后赛取对阵图对手）
    if (gameMode === 'single' && team.league) {
      const lt = (team.seasonPhase === 'playoff')
        ? playerSeriesOpponent(team)
        : pickAiTeam(team);
      if (lt) {
        const lineup = lt.roster.slice().sort((a, b) => b.rating - a.rating).slice(0, 3)
          .map(r => ({ cn: r.name, rating: r.rating }));
        return { name: lt.name, power: lt.str, lineup: lineup, leagueId: lt.id };
      }
    }
    const power = opponentPowerFor(team);
    return { name: pick(NBA_TEAMS) + '队', power: power, lineup: genOppLineup(power) };
  }

  // =========================================================
  // 联盟模拟系统（单人）：球队 / 球员 / 战绩 / 数据 / 对阵 / 奖项 / 选秀
  // =========================================================
  function aiStrengthBase(season) { return 150 + (season - 1) * 62; }
  // 生成一支 AI 球队（含阵容与数据）
  function buildAiTeam(id, name, season) {
    const base = aiStrengthBase(season);
    const str = Math.round(base * (0.74 + Math.random() * 0.72));
    // 由战力推断阵容平均评级
    const avgRating = Math.max(78, Math.min(99, Math.round(80 + (str - base * 0.74) / (base * 0.72) * 17)));
    const roster = POSITIONS.map((pos, i) => {
      const rating = Math.max(74, Math.min(99, avgRating + Math.floor(Math.random() * 9) - 4));
      const nm = genPlayerName();
      return { name: nm, pos: pos.key, rating, isRookie: false,
        stats: genStatLine(rating, pos.key, name + nm + season + i) };
    });
    return { id, name, isPlayer: false, str, w: 0, l: 0, seed: 0, roster };
  }
  // 玩家球队在联盟中的镜像（战绩同步常规赛，阵容取真实首发+新秀）
  function playerLeagueTeam(team) {
    const lt = team.league.teams.find(t => t.isPlayer);
    if (!lt) return null;
    lt.name = team.teamName;
    lt.str = teamPower(team);
    lt.w = team.regWins;
    lt.l = team.regGames - team.regWins;
    lt.roster = playerRoster(team);
    return lt;
  }
  // 玩家阵容（5 首发真实球星 + 新秀），生成数据
  function playerRoster(team) {
    const out = [];
    POSITIONS.forEach((pos, i) => {
      const lv = team.players[i].level, p = playerAt(pos.key, lv);
      if (p) {
        const r = Math.min(99, p.rating + Math.floor(lv * 0.6));
        out.push({ name: p.cn, pos: pos.key, rating: r, isRookie: false, isMine: true,
          stats: genStatLine(r, pos.key, team.teamName + p.cn + team.season + lv) });
      }
    });
    (team.rookies || []).forEach((rk, k) => {
      const debut = rk.debutSeason === team.season;
      out.push({ name: rk.name, pos: rk.pos, rating: rk.rating, isRookie: debut, isMine: true,
        stats: genStatLine(rk.rating, rk.pos, team.teamName + rk.name + team.season + 'rk' + k) });
    });
    return out;
  }
  function buildLeague(team) {
    const names = AI_TEAM_NAMES.filter(n => n !== team.teamName).slice();
    // 洗牌取 LEAGUE_SIZE-1 个 AI 队名
    for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
    const teamsArr = [{ id: 'me', name: team.teamName, isPlayer: true, str: teamPower(team), w: 0, l: 0, seed: 0, roster: playerRoster(team) }];
    for (let i = 0; i < LEAGUE_SIZE - 1; i++) {
      teamsArr.push(buildAiTeam('ai' + i, (names[i] || ('劲旅' + i)) + '队', team.season));
    }
    team.league = { season: team.season, teams: teamsArr, bracket: null };
    team.awards = null; team.fmvp = null;
  }
  function ensureLeague(team) {
    if (!team.league || team.league.season !== team.season || !team.league.teams) buildLeague(team);
  }
  function pickAiTeam(team) {
    const ai = team.league.teams.filter(t => !t.isPlayer);
    return ai[Math.floor(Math.random() * ai.length)];
  }
  // 常规赛一轮：AI 球队各打一场（独立掷骰），玩家战绩另行同步
  function simulateLeagueRound(team, playerOpp, playerWon) {
    const ai = team.league.teams.filter(t => !t.isPlayer);
    ai.forEach(t => {
      if (playerOpp && t.id === playerOpp.id) { // 与玩家直接交手者取反结果
        if (playerWon) t.l++; else t.w++;
        return;
      }
      const opp = ai[Math.floor(Math.random() * ai.length)];
      const oppStr = (opp && opp.id !== t.id) ? opp.str : aiStrengthBase(team.season);
      const wc = t.str / (t.str + oppStr);
      if (Math.random() < wc) t.w++; else t.l++;
    });
  }
  function standings(team) {
    playerLeagueTeam(team);
    return team.league.teams.slice().sort((a, b) => {
      const wpA = a.w / Math.max(1, a.w + a.l), wpB = b.w / Math.max(1, b.w + b.l);
      if (wpB !== wpA) return wpB - wpA;
      return b.w - a.w;
    });
  }
  // ---------- 季后赛对阵图 ----------
  function buildBracket(team) {
    const seeded = standings(team).slice(0, LEAGUE_SIZE);
    seeded.forEach((t, i) => t.seed = i + 1);
    // 首轮：1v8 2v7 3v6 4v5
    const pair = (a, b) => ({ a, b, aw: 0, bw: 0, winner: null, hasPlayer: a.isPlayer || b.isPlayer });
    const r1 = [pair(seeded[0], seeded[7]), pair(seeded[3], seeded[4]), pair(seeded[1], seeded[6]), pair(seeded[2], seeded[5])];
    team.league.bracket = { rounds: [r1, [], []], champion: null };
    return team.league.bracket;
  }
  function findPlayerMatchup(team) {
    const br = team.league.bracket; if (!br) return null;
    for (let r = 0; r < br.rounds.length; r++) {
      const m = br.rounds[r].find(x => x && (x.a.isPlayer || x.b.isPlayer) && !x.winner);
      if (m) return { matchup: m, round: r };
    }
    return null;
  }
  function playerSeriesOpponent(team) {
    const pm = findPlayerMatchup(team);
    if (!pm) return null;
    return pm.matchup.a.isPlayer ? pm.matchup.b : pm.matchup.a;
  }
  // 即时模拟一组 AI 系列赛（7局4胜）
  function simSeries(m) {
    if (m.winner) return;
    let aw = 0, bw = 0;
    const pa = m.a.str / (m.a.str + m.b.str);
    while (aw < SERIES_WIN && bw < SERIES_WIN) { if (Math.random() < pa) aw++; else bw++; }
    m.aw = aw; m.bw = bw; m.winner = aw > bw ? m.a : m.b;
  }
  // 玩家系列赛结束后推进对阵图：模拟同轮其它系列赛，生成下一轮
  function advanceBracket(team, playerWon) {
    const br = team.league.bracket;
    const pm = findPlayerMatchup(team);
    if (!pm) return;
    const m = pm.matchup, r = pm.round;
    m.aw = m.a.isPlayer ? team.seriesWins : team.seriesLosses;
    m.bw = m.b.isPlayer ? team.seriesWins : team.seriesLosses;
    m.winner = playerWon ? (m.a.isPlayer ? m.a : m.b) : (m.a.isPlayer ? m.b : m.a);
    // 模拟本轮其它系列赛
    br.rounds[r].forEach(x => simSeries(x));
    // 生成下一轮
    if (r < 2) {
      const winners = br.rounds[r].map(x => x.winner);
      const next = [];
      for (let i = 0; i < winners.length; i += 2) {
        next.push({ a: winners[i], b: winners[i + 1], aw: 0, bw: 0, winner: null, hasPlayer: winners[i].isPlayer || winners[i + 1].isPlayer });
      }
      br.rounds[r + 1] = next;
    } else {
      br.champion = br.rounds[2][0].winner;
    }
  }
  // 玩家被淘汰后，自动模拟剩余对阵决出总冠军（用于历史记录）
  function simulateRemainingBracket(team) {
    const br = team.league.bracket; if (!br) return;
    for (let r = 0; r < 3; r++) {
      if (!br.rounds[r] || !br.rounds[r].length) break;
      br.rounds[r].forEach(x => simSeries(x));
      if (r < 2 && (!br.rounds[r + 1] || !br.rounds[r + 1].length)) {
        const winners = br.rounds[r].map(x => x.winner);
        const next = [];
        for (let i = 0; i < winners.length; i += 2) next.push({ a: winners[i], b: winners[i + 1], aw: 0, bw: 0, winner: null, hasPlayer: false });
        br.rounds[r + 1] = next;
      }
    }
    if (br.rounds[2] && br.rounds[2][0]) br.champion = br.rounds[2][0].winner;
  }
  // ---------- 数据榜 / 奖项 ----------
  function allLeaguePlayers(team) {
    playerLeagueTeam(team);
    const out = [];
    team.league.teams.forEach(t => t.roster.forEach(p => out.push(Object.assign({ team: t.name, isMine: !!p.isMine, teamWin: t.w / Math.max(1, t.w + t.l) }, p))));
    return out;
  }
  function leadersBy(team, statKey, n) {
    return allLeaguePlayers(team).sort((a, b) => b.stats[statKey] - a.stats[statKey]).slice(0, n || 10);
  }
  function teamRankBy(team, mode) {
    const arr = standings(team);
    if (mode === 'off') { // 进攻：队内场均得分总和
      return arr.slice().map(t => ({ t, val: t.roster.reduce((s, p) => s + p.stats.pts, 0) }))
        .sort((a, b) => b.val - a.val);
    }
    return arr.map(t => ({ t, val: t.w }));
  }
  function computeAwards(team) {
    const players = allLeaguePlayers(team);
    const score = p => p.stats.pts * 1.0 + p.stats.reb * 0.55 + p.stats.ast * 0.75 + p.stats.stl * 1.4 + p.stats.blk * 1.4 + p.teamWin * 14 + p.rating * 0.18;
    const defScore = p => p.stats.stl * 2.4 + p.stats.blk * 2.6 + p.stats.reb * 0.55 + p.teamWin * 6;
    const mvp = players.slice().sort((a, b) => score(b) - score(a))[0];
    const dpoy = players.slice().sort((a, b) => defScore(b) - defScore(a))[0];
    const rookies = players.filter(p => p.isRookie);
    const roy = rookies.length ? rookies.slice().sort((a, b) => score(b) - score(a))[0] : null;
    // 最佳第六人：评级中等（替补气质）且得分高者
    const bench = players.filter(p => p.rating >= 80 && p.rating <= 90);
    const smoy = (bench.length ? bench : players).slice().sort((a, b) => b.stats.pts - a.stats.pts)[0];
    // 最快进步：年轻潜力（评级 82-92）综合表现，排除 MVP
    const mipPool = players.filter(p => p.rating >= 82 && p.rating <= 93 && p !== mvp);
    const mip = (mipPool.length ? mipPool : players).slice().sort((a, b) => (b.stats.eff - a.stats.eff))[0];
    const fmt1 = p => p ? { name: p.name, team: p.team, isMine: p.isMine, rating: p.rating, stats: p.stats } : null;
    team.awards = { mvp: fmt1(mvp), dpoy: fmt1(dpoy), roy: fmt1(roy), smoy: fmt1(smoy), mip: fmt1(mip) };
    return team.awards;
  }
  function computeFmvp(team) {
    const mine = playerRoster(team).filter(p => p.isMine !== false);
    const best = mine.slice().sort((a, b) => (b.stats.eff + b.stats.pts) - (a.stats.eff + a.stats.pts))[0];
    team.fmvp = best ? { name: best.name, rating: best.rating, stats: best.stats } : null;
    return team.fmvp;
  }
  // ---------- 选秀大会 ----------
  function genProspects(season) {
    const tiers = [
      { tag: '状元热门', min: 88, max: 94 },
      { tag: '乐透秀', min: 84, max: 90 },
      { tag: '潜力新人', min: 80, max: 86 },
    ];
    return tiers.map((t, i) => {
      const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)].key;
      const rating = t.min + Math.floor(Math.random() * (t.max - t.min + 1));
      return { id: i, tag: t.tag, pos, rating, name: genPlayerName() };
    });
  }

  // =========================================================
  // 开始游戏
  // =========================================================
  function startNewGame(diffKey) {
    pendingDiff = diffKey; gameMode = pendingMode; gameDiff = diffKey;
    teams = pendingMode === 'dual' ? [createTeam('P1'), createTeam('P2')] : [createTeam('SOLO')];
    teams.forEach(t => pushLog(t, `🏀 ${t.teamName} 的王朝之旅开始了！`, 'hl'));
    launchGame();
  }
  function loadSave(i) {
    const s = getSaves()[i];
    if (!s) return;
    pendingMode = 'single'; gameMode = 'single'; pendingDiff = s.diff; gameDiff = s.diff;
    const t = createTeam('SOLO', s.teamName);
    Object.assign(t, {
      funds: s.funds, diff: s.diff, season: s.season || 1,
      seasonTarget: s.seasonTarget || DIFFICULTIES[s.diff].seasonBase,
      banners: s.banners || 0, bannerBonus: s.bannerBonus || 0, permBonus: s.permBonus || 0,
      players: s.players, totalEarned: s.totalEarned || s.funds,
      matches: s.matches || 0, wins: s.wins || 0,
      seasonPhase: s.seasonPhase || 'regular', regGames: s.regGames || 0, regWins: s.regWins || 0,
      playoffRound: s.playoffRound || 0, seriesWins: s.seriesWins || 0, seriesLosses: s.seriesLosses || 0,
      rookies: s.rookies || [], league: s.league || null, awards: s.awards || null, fmvp: s.fmvp || null,
      history: s.history || [], pendingDraft: s.pendingDraft || null,
    });
    if (s.stats) t.stats = Object.assign(t.stats, s.stats);
    if (s.claimed) t.claimed = Object.assign({}, s.claimed);
    t.facilities = Object.assign(t.facilities, s.facilities);
    teams = [t];
    pushLog(t, `💾 读取存档：${t.teamName}（第 ${t.season} 赛季）`, 'hl');
    launchGame();
    if (s.timestamp) {
      const elapsed = Math.min((Date.now() - s.timestamp) / 1000, OFFLINE_CAP_H * 3600);
      const gain = fundsPerSec(t) * elapsed * OFFLINE_RATE;
      if (gain >= 1) {
        t.funds += gain; t.totalEarned += gain;
        pushLog(t, `🌙 离线收益 +${fmt(gain)}（${fmtTime(elapsed)}）`, 'hl');
        showOfflineModal(gain, elapsed); refreshTeam(0);
      }
    }
  }
  function launchGame() {
    goto('game');
    document.getElementById('game-user').textContent = '经理：' + (curUser() || '访客');
    document.getElementById('game-diff').textContent = DIFFICULTIES[gameDiff].icon + ' ' + DIFFICULTIES[gameDiff].name + '难度';
    curEvent = null; nextEventAt = Date.now() + 8000;
    if (gameMode === 'single' && teams[0]) ensureLeague(teams[0]);
    renderTopActions(); renderEventBanner(); buildArena(); startLoop();
    if (gameMode === 'single' && teams[0] && teams[0].seasonPhase === 'offseason' && teams[0].pendingDraft) {
      setTimeout(() => openDraft(0), 500);
    }
  }
  function renderTopActions() {
    const wrap = document.getElementById('game-actions');
    let html = `<span class="gem-wrap">
        <span class="gem-badge" id="gem-top">💎 ${fmt(getDiamonds())}</span>
        <div class="gem-tip">
          <div class="gt-title">💎 钻石可用于</div>
          <ul>
            <li><span>💵</span>兑换资金：立即获得大量${POINT_LABEL}补给</li>
            <li><span>⚡</span>双倍产出卡：限时全队产出翻倍</li>
            <li><span>🌟</span>永久产出 +20%：永久提升全局收益</li>
            <li><span>🔄</span>清除比赛冷却：随时再战联赛</li>
          </ul>
          <div class="gt-foot">完成任务、夺冠可获钻石，也可通过充值获得</div>
        </div>
      </span>`;
    html += `<button class="topbtn" onclick="App.openStore('recharge')">🛒 充值</button>`;
    if (gameMode === 'single') html += `<button class="topbtn" onclick="App.manualSave()">💾 保存</button>`;
    html += `<button class="topbtn" onclick="App.openSettings()">⚙️ 设置</button>`;
    html += `<button class="topbtn" onclick="App.quitToMenu()">🚪 返回菜单</button>`;
    wrap.innerHTML = html;
  }
  function updateGemDisplays() {
    const top = document.getElementById('gem-top');
    if (top) top.textContent = '💎 ' + fmt(getDiamonds());
    const sg = document.getElementById('gem-shop-balance');
    if (sg) sg.textContent = fmt(getDiamonds());
  }

  // =========================================================
  // 活动横幅
  // =========================================================
  function renderEventBanner() {
    const host = document.getElementById('arena-header');
    if (!host) return;
    if (curEvent) {
      const left = Math.max(0, Math.ceil((curEvent.until - Date.now()) / 1000));
      const pct = Math.max(0, (curEvent.until - Date.now()) / (curEvent.dur * 1000) * 100);
      host.innerHTML = `<div class="event-banner">
        <div class="eb-ico">${curEvent.icon}</div>
        <div class="eb-info"><div class="eb-name">限时活动 · ${curEvent.name}</div><div class="eb-desc">${curEvent.desc}　全服进行中</div></div>
        <div class="eb-time">⏳ ${left}s</div>
        <div class="eb-bar" style="width:${pct}%"></div></div>`;
    } else {
      const left = Math.max(0, Math.ceil((nextEventAt - Date.now()) / 1000));
      host.innerHTML = `<div class="event-banner idle">
        <div class="eb-ico">📅</div>
        <div class="eb-info"><div class="eb-name">活动中心</div><div class="eb-desc">下一场限时活动即将开启，敬请期待丰厚加成</div></div>
        <div class="eb-time" style="color:var(--muted)">${left}s</div></div>`;
    }
  }
  function tickEvents() {
    const now = Date.now();
    if (curEvent) {
      if (now >= curEvent.until) {
        teams.forEach(t => pushLog(t, `⌛ 活动「${curEvent.name}」已结束`, ''));
        curEvent = null; nextEventAt = now + 12000;
      }
    } else if (now >= nextEventAt) {
      const ev = pick(EVENTS);
      curEvent = Object.assign({}, ev, { until: now + ev.dur * 1000 });
      teams.forEach(t => pushLog(t, `${ev.icon} 限时活动开启：${ev.name}（${ev.desc}）`, 'hl'));
      toast(`${ev.icon} 活动开启：${ev.name}`);
    }
    renderEventBanner();
  }

  function buildArena() {
    const arena = document.getElementById('arena');
    arena.className = gameMode === 'dual' ? 'dual' : 'single';
    arena.innerHTML = teams.map((t, idx) => teamPanelHTML(t, idx)).join('');
    teams.forEach((_, idx) => refreshTeam(idx));
  }

  function teamPanelHTML(team, idx) {
    const cls = gameMode === 'dual' ? (idx === 0 ? 'p1' : 'p2') : '';
    const players = POSITIONS.map((pos, i) => `
      <div class="player">
        <div class="av-card" id="av-${idx}-${i}" style="background:linear-gradient(180deg,${pos.color},#0d1222)">
          <span class="av-face" id="avt-${idx}-${i}">${pos.key}</span>
          <span class="jersey" id="jno-${idx}-${i}" style="display:none"></span>
        </div>
        <div class="pinfo">
          <div class="pn" id="pn-${idx}-${i}">${pos.name}</div>
          <div class="pd" id="pd-${idx}-${i}"></div>
        </div>
        <button class="buy-btn" id="buy-${idx}-${i}" onclick="App.buyPlayer(${idx},${i})">签约<span class="bc" id="bc-${idx}-${i}"></span></button>
      </div>`).join('');

    const upgrades = FACILITIES.map(f => `
      <div class="upg" id="upg-${idx}-${f.key}" onclick="App.buyFacility(${idx},'${f.key}')" title="${f.desc}">
        <div class="ui">${f.icon}</div><div class="un">${f.name}</div>
        <div class="ulv" id="ulv-${idx}-${f.key}"></div><div class="uc" id="uc-${idx}-${f.key}"></div>
      </div>`).join('');

    const tasks = TASKS.map(t => `
      <div class="task">
        <div class="ti"><div class="tn">${t.name}</div><div class="tp" id="tp-${idx}-${t.key}"></div>
          <div class="tprog"><i id="tf-${idx}-${t.key}"></i></div></div>
        <button class="task-claim" id="tc-${idx}-${t.key}" onclick="App.claimTask(${idx},'${t.key}')">领取</button>
      </div>`).join('');

    const progressBlock = gameMode === 'dual' ? `
        <div class="res"><div class="rl">🎯 夺冠目标</div>
          <div class="rv" id="goal-${idx}" style="font-size:15px;">${fmt(team.goal)}</div>
          <div class="rs" id="eta-${idx}" style="color:var(--muted)"></div></div>` : `
        <div class="res"><div class="rl">🏆 总冠军</div>
          <div class="rv" id="banners-${idx}" style="font-size:15px;">0 次</div>
          <div class="rs" id="bbonus-${idx}" style="color:var(--green)">王朝加成 +0%</div></div>`;

    const goalWrap = gameMode === 'dual' ? `
        <div class="goal-wrap"><div class="goal-label"><span>赛季进度</span><span id="prog-${idx}">0%</span></div>
          <div class="goal-bar"><div class="goal-fill" id="fill-${idx}"></div></div></div>` : `
        <div class="dynasty-bar">
          <div class="banners" id="banner-icons-${idx}">—</div>
          <div class="dn"><div class="t">第 <b id="season-${idx}">1</b> 赛季 · <span id="phase-${idx}" style="color:var(--orange)">常规赛</span></div>
            <div class="v" id="phaserec-${idx}" style="font-size:12px;">常规赛 0/${REGULAR_GAMES} · 0胜0负</div></div>
          <div style="text-align:right"><div class="goal-label" style="justify-content:flex-end"><span id="prog-${idx}">0%</span></div>
            <div class="goal-bar" style="width:120px"><div class="goal-fill" id="fill-${idx}"></div></div></div>
        </div>`;

    return `
      <div class="team-panel ${cls}">
        <div class="tp-head"><span class="tp-name">${esc(team.teamName)}</span>
          <span class="tp-badge">${gameMode === 'dual' ? (idx === 0 ? '🔵 玩家一' : '🔴 玩家二') : DIFFICULTIES[team.diff].name + '难度'}</span></div>
        <div class="res-bar">
          <div class="res"><div class="rl">💰 ${POINT_LABEL}</div><div class="rv" id="funds-${idx}">0</div><div class="rs" id="rate-${idx}">+0/秒</div></div>
          ${progressBlock}
        </div>
        ${goalWrap}
        <button class="shoot-btn" id="shoot-${idx}" onclick="App.shoot(${idx}, event)">🏀 投篮训练 +<span id="shoot-val-${idx}">1</span></button>
        <div class="match-center">
          <div class="match-head"><span class="mt">🏟️ ${gameMode === 'single' ? '赛季中心' : '联赛中心'}</span><span class="mr" id="match-record-${idx}">战绩 0胜 0负</span></div>
          <div class="opp-preview" id="opp-preview-${idx}"></div>
          <button class="match-btn" id="match-btn-${idx}" onclick="App.playMatch(${idx})">⚔️ 发起一场比赛</button>
          <div class="match-result" id="match-result-${idx}">${gameMode === 'single' ? '打满常规赛冲击季后赛，胜率取决于双方战力' : '击败对手可赢得奖金，胜率取决于双方战力'}</div>
          ${gameMode === 'single' ? `<div class="lg-tabs">
            <button class="lg-tab" onclick="App.openLeague('standings',${idx})">📊 排名</button>
            <button class="lg-tab" onclick="App.openLeague('stats',${idx})">📈 数据榜</button>
            <button class="lg-tab" onclick="App.openLeague('bracket',${idx})">🏆 对阵图</button>
            <button class="lg-tab" onclick="App.openLeague('awards',${idx})">🏅 奖项</button>
          </div>` : ''}
        </div>
        <div class="section-title" style="margin-top:0;">👥 球员阵容（真实球星）</div>
        <div class="roster">${players}</div>
        <div class="section-title">🏟️ 设施升级</div>
        <div class="upgrades">${upgrades}</div>
        <div class="section-title">📋 球队任务</div>
        <div class="tasks">${tasks}</div>
        <div style="margin-top:12px;"><button class="topbtn" style="width:100%;background:linear-gradient(90deg,#5bc0ff,#1677ff)" onclick="App.openStore('diamond',${idx})">💎 钻石商店</button></div>
        <div class="game-log" id="log-${idx}"></div>
      </div>`;
  }

  // =========================================================
  // 玩法操作
  // =========================================================
  function shoot(idx, ev) {
    const team = teams[idx];
    if (team.won) return;
    Sound.play('shoot'); Sound.vibrate(8);
    const gain = clickValue(team);
    team.funds += gain; team.totalEarned += gain; team.stats.clicks++;
    floatPoint(ev, '+' + fmt(gain));
    refreshTeam(idx); checkProgress(idx);
  }
  function buyPlayer(idx, posIdx) {
    const team = teams[idx];
    if (team.won) return;
    const cost = playerCost(team, posIdx);
    if (team.funds < cost) { Sound.play('error'); return toast('资金不足'); }
    team.funds -= cost; team.players[posIdx].level++; team.stats.signs++;
    Sound.play('buy'); Sound.vibrate(12);
    const lv = team.players[posIdx].level, p = playerAt(POSITIONS[posIdx].key, lv);
    if (p) pushLog(team, `✍️ ${POSITIONS[posIdx].name}签下了 ${p.cn} (#${p.no})！`, 'hl');
    else pushLog(team, `💪 ${POSITIONS[posIdx].name}训练强化 Lv.${lv}`, '');
    refreshTeam(idx);
  }
  function buyFacility(idx, key) {
    const team = teams[idx];
    if (team.won) return;
    const cost = facilityCost(team, key);
    if (team.funds < cost) { Sound.play('error'); return toast('资金不足'); }
    team.funds -= cost; team.facilities[key]++;
    Sound.play('buy'); Sound.vibrate(12);
    const f = FACILITIES.find(x => x.key === key);
    pushLog(team, `🏟️ ${f.name} 升级至 Lv.${team.facilities[key]}`, 'hl');
    refreshTeam(idx);
  }
  function playMatch(idx) {
    const team = teams[idx];
    if (team.won) return;
    // 休赛期：按钮转为进入选秀
    if (gameMode === 'single' && team.seasonPhase === 'offseason') { openDraft(idx); return; }
    const now = Date.now();
    if (now - team.lastMatchAt < MATCH_COOLDOWN) { Sound.play('error'); return toast('比赛冷却中'); }
    team.lastMatchAt = now;
    if (!team.nextOpp) team.nextOpp = genOpponent(team);
    const opp = team.nextOpp;
    const myPow = teamPower(team);
    const winChance = matchWinChance(myPow, opp.power);
    const win = Math.random() < winChance;
    team.matches++; team.stats.matches++;
    if (win) { team.wins++; team.stats.wins++; }
    const baseReward = Math.max(fundsPerSec(team) * 10, 20);
    const reward = Math.round(baseReward * (win ? 1 : 0.3) * eventMatchMul());
    team.funds += reward; team.totalEarned += reward;
    const myScore = 80 + Math.floor(Math.random() * 40);
    const oppScore = win ? myScore - (1 + Math.floor(Math.random() * 15)) : myScore + (1 + Math.floor(Math.random() * 15));
    Sound.play(win ? 'win' : 'lose'); Sound.vibrate(win ? [12, 40, 12] : 20);

    if (gameMode === 'single') {
      handleSeasonProgress(team, idx, win, opp, myScore, oppScore, reward);
    } else {
      const resEl = document.getElementById('match-result-' + idx);
      if (resEl) resEl.innerHTML = win
        ? `<span class="w">🎉 击败 ${esc(opp.name)} ${myScore}:${oppScore}</span>，奖金 +${fmt(reward)}${eventMatchMul()>1?'（活动加成）':''}`
        : `<span class="l">😖 不敌 ${esc(opp.name)} ${myScore}:${oppScore}</span>，仍获参赛费 +${fmt(reward)}`;
      pushLog(team, win ? `⚔️ 战胜${opp.name} ${myScore}:${oppScore}，奖金+${fmt(reward)}` : `⚔️ 负于${opp.name} ${myScore}:${oppScore}`, win ? 'hl' : '');
      checkProgress(idx);
    }
    team.nextOpp = genOpponent(team);
    refreshTeam(idx); runMatchCooldown(idx);
  }
  // 单人模式：常规赛 → 季后赛 → 总冠军 的赛季推进（接入联盟模拟）
  function handleSeasonProgress(team, idx, win, opp, myScore, oppScore, reward) {
    ensureLeague(team);
    const resEl = document.getElementById('match-result-' + idx);
    const head = win
      ? `<span class="w">🎉 击败 ${esc(opp.name)} ${myScore}:${oppScore}</span>，奖金 +${fmt(reward)}`
      : `<span class="l">😖 不敌 ${esc(opp.name)} ${myScore}:${oppScore}</span>，参赛费 +${fmt(reward)}`;
    let extra = '';

    if (team.seasonPhase === 'regular') {
      team.regGames++; if (win) team.regWins++;
      // 联盟同步推进一轮
      const oppTeam = team.league.teams.find(t => t.id === opp.leagueId);
      simulateLeagueRound(team, oppTeam, win);
      pushLog(team, `🏀 常规赛 ${win ? '胜' : '负'} ${opp.name} ${myScore}:${oppScore}（${team.regWins}-${team.regGames - team.regWins}）`, win ? 'hl' : '');
      if (team.regGames >= REGULAR_GAMES) {
        computeAwards(team);                       // 常规赛结束颁奖
        const seeded = standings(team);
        const myRank = seeded.findIndex(t => t.isPlayer) + 1;
        const inPlayoff = myRank <= LEAGUE_SIZE && team.regWins >= PLAYOFF_NEED;
        if (inPlayoff) {
          buildBracket(team);
          team.seasonPhase = 'playoff'; team.playoffRound = 1; team.seriesWins = 0; team.seriesLosses = 0;
          extra = `<br><b style="color:var(--gold)">🎟️ 常规赛 ${team.regWins}胜${team.regGames - team.regWins}负，以第 ${myRank} 种子晋级季后赛！</b>`;
          pushLog(team, `🎟️ 常规赛收官 ${team.regWins}-${team.regGames - team.regWins}，第${myRank}种子晋级季后赛！`, 'win');
          toast('🎟️ 晋级季后赛！'); Sound.play('reward');
          showAwardsCeremony(team, false);
        } else {
          buildBracket(team); simulateRemainingBracket(team);
          recordHistory(team, false);
          extra = `<br><b style="color:var(--nba-red)">常规赛 ${team.regWins} 胜，第 ${myRank} 位无缘季后赛</b>`;
          pushLog(team, `❌ 常规赛 ${team.regWins}胜，未能晋级季后赛`, '');
          showAwardsCeremony(team, true);
        }
      }
    } else if (team.seasonPhase === 'playoff') {
      if (win) team.seriesWins++; else team.seriesLosses++;
      const roundName = PLAYOFF_ROUND_NAMES[team.playoffRound] || '季后赛';
      pushLog(team, `${win ? '✅' : '❌'} ${roundName} ${opp.name} ${myScore}:${oppScore}（系列赛 ${team.seriesWins}-${team.seriesLosses}）`, win ? 'hl' : '');
      if (team.seriesWins >= SERIES_WIN) {
        advanceBracket(team, true);
        if (team.playoffRound >= 3) {
          winChampionship(team);
          extra = `<br><b style="color:var(--gold)">🏆 赢下总决赛，夺得总冠军！</b>`;
          if (resEl) resEl.innerHTML = head + extra;
          return;
        }
        team.playoffRound++; team.seriesWins = 0; team.seriesLosses = 0;
        const next = PLAYOFF_ROUND_NAMES[team.playoffRound];
        extra = `<br><b style="color:var(--gold)">系列赛 ${SERIES_WIN} 胜，晋级${next}！</b>`;
        pushLog(team, `🏆 晋级${next}！`, 'win'); toast(`晋级${next}！`); Sound.play('reward');
      } else if (team.seriesLosses >= SERIES_WIN) {
        advanceBracket(team, false);
        simulateRemainingBracket(team);
        recordHistory(team, false);
        const champ = team.league.bracket.champion;
        extra = `<br><b style="color:var(--nba-red)">系列赛失利，止步${roundName}。本季冠军：${champ ? esc(champ.name) : '—'}</b>`;
        pushLog(team, `❌ ${roundName}出局，本季冠军 ${champ ? champ.name : '—'}`, '');
        enterOffseason(team, idx);
      }
    }
    if (resEl) resEl.innerHTML = head + extra;
  }
  function recordHistory(team, isChampion) {
    const a = team.awards || {};
    const champ = (team.league && team.league.bracket && team.league.bracket.champion) ? team.league.bracket.champion.name : (isChampion ? team.teamName : '—');
    team.history = team.history || [];
    team.history.unshift({
      season: team.season, champion: champ, isMine: isChampion,
      mvp: a.mvp ? a.mvp.name : '—', dpoy: a.dpoy ? a.dpoy.name : '—',
      roy: a.roy ? a.roy.name : '—', mip: a.mip ? a.mip.name : '—', smoy: a.smoy ? a.smoy.name : '—',
      fmvp: team.fmvp ? team.fmvp.name : '—',
    });
    if (team.history.length > 30) team.history.pop();
  }
  // 进入休赛期 → 选秀大会
  function enterOffseason(team, idx) {
    team.seasonPhase = 'offseason';
    team.pendingDraft = genProspects(team.season + 1);
    toast('赛季结束，进入选秀大会');
    setTimeout(() => openDraft(idx), 700);
  }
  function startNextSeason(team) {
    team.season++;
    team.seasonPhase = 'regular';
    team.regGames = 0; team.regWins = 0;
    team.playoffRound = 0; team.seriesWins = 0; team.seriesLosses = 0;
    team.nextOpp = null;
    team.awards = null; team.fmvp = null;
    buildLeague(team);
  }
  function winChampionship(team) {
    team.banners++; team.bannerBonus += 0.05;
    const diaReward = 20 + team.banners * 5;
    addDiamonds(diaReward);
    if (team.league && team.league.bracket) team.league.bracket.champion = team.league.teams.find(t => t.isPlayer);
    computeFmvp(team);
    recordHistory(team, true);
    team.seasonPhase = 'offseason';
    team.pendingDraft = genProspects(team.season + 1);
    Sound.play('victory'); Sound.vibrate([20, 60, 20, 60, 20]);
    pushLog(team, `🏆 第 ${team.banners} 座总冠军！FMVP：${team.fmvp ? team.fmvp.name : '—'}，王朝加成 +5%，💎${diaReward}`, 'win');
    toast(`🏆 夺得第 ${team.banners} 座总冠军！`);
    const tIdx = teams.indexOf(team);
    showFmvpCeremony(team, diaReward, tIdx);
  }
  // 刷新对手预览与比赛按钮文案
  function updateMatchCenter(idx) {
    const team = teams[idx];
    const prev = document.getElementById('opp-preview-' + idx);
    const btn = document.getElementById('match-btn-' + idx);
    // 休赛期：等待选秀
    if (gameMode === 'single' && team.seasonPhase === 'offseason') {
      if (prev) prev.innerHTML = `<div class="opp-vs" style="text-align:center">🎓 赛季已结束，<b>选秀大会</b>进行中</div>`;
      if (btn) { btn.disabled = false; btn.textContent = '🎓 进入选秀大会'; }
      return;
    }
    if (!team.nextOpp && !team.won) team.nextOpp = genOpponent(team);
    const opp = team.nextOpp;
    const myPow = teamPower(team);
    if (opp && prev) {
      const wc = Math.round(matchWinChance(myPow, opp.power) * 100);
      const lineup = opp.lineup.map(p => `${esc(p.cn)}<span class="star">★${p.rating}</span>`).join('、');
      const tag = (gameMode === 'single' && team.seasonPhase === 'playoff')
        ? `<span style="color:var(--gold)">${PLAYOFF_ROUND_NAMES[team.playoffRound] || '季后赛'} · 系列赛 ${team.seriesWins}-${team.seriesLosses}</span>` : '';
      prev.innerHTML = `
        ${tag ? `<div style="font-size:11px;margin-bottom:4px;">${tag}</div>` : ''}
        <div class="opp-row"><span class="opp-name">🆚 ${esc(opp.name)}</span><span class="opp-pow">对手战力 ${fmt(opp.power)}</span></div>
        <div class="opp-lineup">对手阵容：${lineup}</div>
        <div class="opp-vs">我方战力 <b>${fmt(myPow)}</b> · 预计胜率 <b class="${wc >= 50 ? 'w' : 'l'}">${wc}%</b></div>`;
    }
    if (btn && !btn.disabled) {
      if (gameMode === 'single') {
        btn.textContent = team.seasonPhase === 'playoff'
          ? '⚔️ ' + (PLAYOFF_ROUND_NAMES[team.playoffRound] || '季后赛') + ' · 下一场'
          : '⚔️ 进行常规赛';
      } else {
        btn.textContent = '⚔️ 发起一场比赛';
      }
    }
  }
  function runMatchCooldown(idx) {
    const btn = document.getElementById('match-btn-' + idx);
    if (!btn) return;
    const team = teams[idx];
    const tick = () => {
      const remain = MATCH_COOLDOWN - (Date.now() - team.lastMatchAt);
      if (remain > 0 && !team.won) {
        btn.disabled = true; btn.textContent = `⏳ 冷却中 ${(remain / 1000).toFixed(1)}s`;
        requestAnimationFrame(tick);
      } else { btn.disabled = team.won; updateMatchCenter(idx); }
    };
    tick();
  }
  function taskProgress(team, t) { return Math.min(team.stats[t.metric], t.target); }
  function claimTask(idx, key) {
    const team = teams[idx], t = TASKS.find(x => x.key === key);
    if (!t || team.claimed[key]) return;
    if (t.metric && team.stats[t.metric] < t.target) return toast('任务尚未完成');
    const fundGain = fundsPerSec(team) * t.reward.fundSec + 50;
    team.funds += fundGain; team.totalEarned += fundGain; team.claimed[key] = true;
    addDiamonds(t.reward.dia);
    Sound.play('reward'); Sound.vibrate([10, 30, 10]);
    pushLog(team, `📋 完成任务「${t.name}」+${fmt(fundGain)} 💎${t.reward.dia}`, 'win');
    toast(`任务完成！+${fmt(fundGain)} 资金 +${t.reward.dia} 钻石`);
    refreshTeam(idx);
  }

  // =========================================================
  // 放置循环
  // =========================================================
  function startLoop() {
    stopLoop();
    loopTimer = setInterval(() => {
      tickEvents();
      teams.forEach((team, idx) => {
        if (team.won) return;
        const gain = fundsPerSec(team) * (TICK_MS / 1000);
        if (gain > 0) { team.funds += gain; team.totalEarned += gain; }
        refreshTeam(idx); checkProgress(idx);
      });
    }, TICK_MS);
  }
  function stopLoop() { if (loopTimer) { clearInterval(loopTimer); loopTimer = null; } }

  function checkProgress(idx) {
    const team = teams[idx];
    if (team.won) return;
    // 双人：率先达成资金目标者获胜；单人：总冠军由「常规赛→季后赛」流程在 playMatch 中决出
    if (gameMode === 'dual') {
      if (team.funds >= team.goal) { team.won = true; Sound.play('victory'); Sound.vibrate([20, 60, 20, 60, 20]); pushLog(team, '🏆 达成夺冠目标！', 'win'); onDualVictory(idx); }
    }
  }
  function onDualVictory(winnerIdx) {
    stopLoop(); teams.forEach(t => t.won = true);
    const team = teams[winnerIdx], loser = teams[winnerIdx === 0 ? 1 : 0];
    document.getElementById('victory-title').textContent = `${team.teamName} 夺冠！`;
    document.getElementById('victory-desc').innerHTML =
      `${winnerIdx === 0 ? '🔵 玩家一' : '🔴 玩家二'} 率先达成夺冠目标！<br>对手 ${esc(loser.teamName)} 仅积累 ${POINT_LABEL} ${fmt(loser.funds)}。`;
    document.getElementById('victory').classList.add('show');
  }
  function backToMenuFromVictory() { document.getElementById('victory').classList.remove('show'); quitToMenu(); }

  // =========================================================
  // 刷新 UI
  // =========================================================
  function refreshTeam(idx) {
    const team = teams[idx], rate = fundsPerSec(team);
    setText('funds-' + idx, fmt(team.funds));
    setText('rate-' + idx, '+' + fmt(rate) + '/秒');
    setText('shoot-val-' + idx, fmt(clickValue(team)));

    if (gameMode === 'dual') {
      const progress = Math.min(100, (team.funds / team.goal) * 100);
      setText('prog-' + idx, progress.toFixed(1) + '%');
      const fill = document.getElementById('fill-' + idx); if (fill) fill.style.width = progress + '%';
      const remain = team.goal - team.funds, eta = document.getElementById('eta-' + idx);
      if (eta) eta.textContent = remain <= 0 ? '已达成' : (rate > 0 ? '约 ' + fmtTime(remain / rate) : '签约球员以产出');
    } else {
      // 赛季阶段进度：常规赛进度 / 季后赛系列赛进度
      let phaseText, recText, progress;
      if (team.seasonPhase === 'playoff') {
        phaseText = '季后赛 · ' + (PLAYOFF_ROUND_NAMES[team.playoffRound] || '');
        recText = `${PLAYOFF_ROUND_NAMES[team.playoffRound] || '系列赛'} ${team.seriesWins}-${team.seriesLosses}（7局4胜）`;
        progress = Math.min(100, (team.seriesWins / SERIES_WIN) * 100);
      } else {
        phaseText = '常规赛';
        recText = `常规赛 ${team.regGames}/${REGULAR_GAMES} · ${team.regWins}胜${team.regGames - team.regWins}负`;
        progress = Math.min(100, (team.regGames / REGULAR_GAMES) * 100);
      }
      setText('phase-' + idx, phaseText);
      setText('phaserec-' + idx, recText);
      setText('prog-' + idx, progress.toFixed(0) + '%');
      const fill = document.getElementById('fill-' + idx); if (fill) fill.style.width = progress + '%';
      setText('season-' + idx, team.season);
      setText('banners-' + idx, team.banners + ' 次');
      setText('bbonus-' + idx, '王朝加成 +' + Math.round(team.bannerBonus * 100) + '%');
      const icons = document.getElementById('banner-icons-' + idx);
      if (icons) icons.textContent = team.banners ? '🏆'.repeat(Math.min(team.banners, 8)) : '—';
    }

    POSITIONS.forEach((pos, i) => {
      const lv = team.players[i].level, cost = playerCost(team, i), p = playerAt(pos.key, lv);
      const avt = document.getElementById('avt-' + idx + '-' + i);
      const jno = document.getElementById('jno-' + idx + '-' + i);
      const pn = document.getElementById('pn-' + idx + '-' + i);
      if (p) {
        if (avt) { avt.innerHTML = avatarSVG(p, pos.color); avt.classList.add('has-face'); }
        if (jno) { jno.style.display = 'block'; jno.textContent = '#' + p.no; }
        if (pn) pn.innerHTML = `${esc(p.cn)} <span class="star">★${p.rating}</span>`;
        setText('pd-' + idx + '-' + i, `${pos.name} · Lv.${lv} · 产出 ${fmt(pos.base * lv * ecoMul(team) * facilityOutputMul(team) * eventOutputMul())}/秒`);
      } else {
        if (avt) { avt.textContent = pos.key; avt.classList.remove('has-face'); }
        if (jno) jno.style.display = 'none';
        if (pn) pn.textContent = pos.name;
        setText('pd-' + idx + '-' + i, '未签约 · 点击签下首位球星');
      }
      setText('bc-' + idx + '-' + i, '💰' + fmt(cost));
      const btn = document.getElementById('buy-' + idx + '-' + i);
      if (btn) { btn.disabled = team.funds < cost || team.won; btn.firstChild.textContent = lv === 0 ? '签约' : '换强'; }
    });

    FACILITIES.forEach(f => {
      const owned = team.facilities[f.key], cost = facilityCost(team, f.key);
      setText('ulv-' + idx + '-' + f.key, 'Lv.' + owned);
      setText('uc-' + idx + '-' + f.key, '💰' + fmt(cost));
      const el = document.getElementById('upg-' + idx + '-' + f.key);
      if (el) el.classList.toggle('disabled', team.funds < cost || team.won);
    });

    setText('match-record-' + idx, `战绩 ${team.wins}胜 ${team.matches - team.wins}负`);
    updateMatchCenter(idx);

    TASKS.forEach(t => {
      const prog = taskProgress(team, t);
      setText('tp-' + idx + '-' + t.key, `${prog}/${t.target}　奖励 💎${t.reward.dia}`);
      const fill = document.getElementById('tf-' + idx + '-' + t.key);
      if (fill) fill.style.width = (prog / t.target * 100) + '%';
      const cBtn = document.getElementById('tc-' + idx + '-' + t.key);
      if (cBtn) {
        if (team.claimed[t.key]) { cBtn.textContent = '已领取'; cBtn.disabled = true; cBtn.classList.add('done'); }
        else if (prog >= t.target) { cBtn.textContent = '领取'; cBtn.disabled = false; cBtn.classList.remove('done'); }
        else { cBtn.textContent = '进行中'; cBtn.disabled = true; cBtn.classList.remove('done'); }
      }
    });

    renderLog(idx);
  }
  function renderLog(idx) {
    const el = document.getElementById('log-' + idx);
    if (!el) return;
    el.innerHTML = teams[idx].log.slice(0, 6).map(l => `<p class="${l.cls}">${l.text}</p>`).join('');
  }
  function pushLog(team, text, cls) {
    team.log.unshift({ text, cls: cls || '' });
    if (team.log.length > 20) team.log.pop();
  }

  // =========================================================
  // 充值 / 钻石商店 + 支付接口（模拟）
  // =========================================================
  function ensureModal(id) {
    let m = document.getElementById(id);
    if (!m) { m = document.createElement('div'); m.id = id; m.className = 'modal-mask'; document.body.appendChild(m); }
    return m;
  }
  function openStore(tab, idx) {
    if (typeof idx === 'number') storeTeamIdx = idx;
    ensureModal('store-modal').classList.add('show');
    renderStore(tab || 'recharge');
  }
  function closeStore() { const m = document.getElementById('store-modal'); if (m) m.classList.remove('show'); }

  function renderStore(tab) {
    const m = ensureModal('store-modal');
    const rechargeHTML = `
      <div class="pkg-grid">
        ${PACKAGES.map(p => `
          <div class="pkg ${p.hot ? 'hot' : ''}" onclick="App.openPay('${p.key}')">
            <div class="pi">${p.icon}</div><div class="pname">${p.name}</div>
            <div class="pgem">💎 ${fmt(p.diamonds)}</div><div class="pgift">${p.gift || ''}</div>
            <div class="pprice">¥ ${p.price}</div>
          </div>`).join('')}
      </div>
      <p style="text-align:center;color:var(--muted);font-size:11px;margin-top:14px;">* 本游戏为原型演示，支付流程均为模拟，不会产生任何真实扣费。</p>`;

    const diamondHTML = `
      <p style="text-align:center;color:var(--muted);font-size:12px;margin-bottom:12px;">
        当前余额 💎 <b id="gem-shop-balance" style="color:#9fe0ff">${fmt(getDiamonds())}</b>
        ${gameMode === 'dual' && teams[storeTeamIdx] ? '（作用于 ' + esc(teams[storeTeamIdx].teamName) + '）' : ''}</p>
      ${DIAMOND_ITEMS.map(it => `
        <div class="gem-shop-item">
          <div class="gsi-ico">${it.icon}</div>
          <div class="gsi-info"><div class="gsi-n">${it.name}</div><div class="gsi-d">${it.desc}</div></div>
          <button class="gem-buy" onclick="App.buyDiamondItem('${it.key}')">💎 ${it.cost}</button>
        </div>`).join('')}`;

    m.innerHTML = `
      <div class="card wide" style="max-height:88vh;display:flex;flex-direction:column;overflow:hidden;">
        <div class="brand" style="margin-bottom:10px;"><h1 style="font-size:28px;">球队商店</h1></div>
        <div class="store-tabs">
          <button class="store-tab ${tab === 'recharge' ? 'active' : ''}" onclick="App.renderStore('recharge')">🛒 钻石充值</button>
          <button class="store-tab ${tab === 'diamond' ? 'active' : ''}" onclick="App.renderStore('diamond')">💎 钻石商店</button>
        </div>
        <div style="overflow-y:auto;padding-right:4px;">${tab === 'recharge' ? rechargeHTML : diamondHTML}</div>
        <button class="btn" style="margin-top:14px;" onclick="App.closeStore()">关闭</button>
      </div>`;
    updateGemDisplays();
  }

  function openPay(pkgKey) {
    payingPkg = PACKAGES.find(p => p.key === pkgKey);
    if (!payingPkg) return;
    const m = ensureModal('pay-modal'); m.classList.add('show');
    m.innerHTML = `
      <div class="card" style="max-width:420px;">
        <div class="brand" style="margin-bottom:6px;"><h1 style="font-size:24px;">选择支付方式</h1></div>
        <div class="pay-amount">${payingPkg.icon} ${payingPkg.name}　💎 ${fmt(payingPkg.diamonds)} ${payingPkg.gift ? '（' + payingPkg.gift + '）' : ''}</div>
        <div class="pay-amount" style="margin-bottom:6px;">应付金额 <b>¥ ${payingPkg.price}</b></div>
        <div class="pay-methods">
          <div class="pay-m gp"  onclick="App.doPay('Google Play')"><div class="pm-ico">▶</div><span>Google Play</span></div>
          <div class="pay-m wx"  onclick="App.doPay('微信支付')"><div class="pm-ico">💬</div><span>微信支付</span></div>
          <div class="pay-m ali" onclick="App.doPay('支付宝')"><div class="pm-ico">支</div><span>支付宝</span></div>
          <div class="pay-m ap"  onclick="App.doPay('Apple Pay')"><div class="pm-ico"></div><span>Apple Pay</span></div>
        </div>
        <button class="btn ghost" onclick="App.closePay()">取消支付</button>
      </div>`;
  }
  function closePay() { const m = document.getElementById('pay-modal'); if (m) m.classList.remove('show'); }

  function doPay(method) {
    if (!payingPkg) return;
    const m = ensureModal('pay-modal'), pkg = payingPkg;
    m.innerHTML = `
      <div class="card" style="max-width:380px;text-align:center;">
        <div class="brand" style="margin-bottom:6px;"><h1 style="font-size:22px;">${esc(method)}</h1></div>
        <p style="color:var(--muted);font-size:13px;">正在跳转 ${esc(method)} 安全支付…</p>
        <div class="spinner"></div>
        <p style="color:var(--muted);font-size:12px;">订单金额 ¥${pkg.price} · 处理中，请稍候</p>
      </div>`;
    setTimeout(() => {
      m.innerHTML = `
        <div class="card" style="max-width:380px;text-align:center;">
          <div class="pay-success">✅</div>
          <h2 style="color:var(--green);margin:10px 0;">支付成功</h2>
          <p style="color:var(--muted);font-size:13px;">通过 <b style="color:var(--txt)">${esc(method)}</b> 支付 ¥${pkg.price}</p>
          <p style="color:#9fe0ff;font-size:18px;font-weight:700;margin:10px 0;">💎 +${fmt(pkg.diamonds)}</p>
          <button class="btn" onclick="App.finishPay()">收下钻石</button>
        </div>`;
    }, 1500);
  }
  function finishPay() {
    if (payingPkg) {
      addDiamonds(payingPkg.diamonds);
      Sound.play('coin');
      teams.forEach(t => pushLog(t, `🛒 充值到账 💎${payingPkg.diamonds}`, 'hl'));
      toast(`充值成功！💎 +${fmt(payingPkg.diamonds)}`);
      payingPkg = null;
    }
    closePay(); renderStore('diamond');
  }

  function buyDiamondItem(key) {
    const it = DIAMOND_ITEMS.find(x => x.key === key);
    if (!it) return;
    if (getDiamonds() < it.cost) { Sound.play('error'); toast('钻石不足，请先充值'); return; }
    const team = teams[storeTeamIdx] || teams[0];
    if (!team) return;
    addDiamonds(-it.cost);
    Sound.play('spend'); Sound.vibrate(12);
    if (it.type === 'cash') {
      const gain = Math.max(fundsPerSec(team) * it.sec, 100);
      team.funds += gain; team.totalEarned += gain;
      pushLog(team, `💵 钻石兑换资金 +${fmt(gain)}`, 'hl'); toast(`获得资金 +${fmt(gain)}`);
    } else if (it.type === 'boost') {
      team.boostUntil = Math.max(Date.now(), team.boostUntil) + it.sec * 1000;
      pushLog(team, `⚡ 双倍产出卡生效 ${it.sec}s`, 'hl'); toast('双倍产出卡已生效');
    } else if (it.type === 'perm') {
      team.permBonus += it.amt;
      pushLog(team, `🌟 永久产出 +${Math.round(it.amt * 100)}%`, 'hl'); toast('永久产出已提升');
    } else if (it.type === 'refresh') {
      team.lastMatchAt = 0; runMatchCooldown(storeTeamIdx); toast('比赛冷却已清除');
    }
    refreshTeam(storeTeamIdx); renderStore('diamond');
  }

  function showOfflineModal(gain, sec) {
    const m = ensureModal('offline-modal'); m.classList.add('show');
    m.innerHTML = `
      <div class="card" style="max-width:360px;text-align:center;">
        <div style="font-size:54px;">🌙</div>
        <h2 style="color:var(--gold);margin:8px 0;">离线收益</h2>
        <p style="color:var(--muted);font-size:13px;">球队在你离开的 ${fmtTime(sec)} 里继续运转</p>
        <p style="color:var(--gold);font-size:22px;font-weight:700;margin:12px 0;">💰 +${fmt(gain)}</p>
        <button class="btn" onclick="App.closeOffline()">领取收益</button>
      </div>`;
  }
  function closeOffline() { const m = document.getElementById('offline-modal'); if (m) m.classList.remove('show'); }

  // =========================================================
  // 数据中心：排名 / 数据榜 / 对阵图 / 奖项 / 历史
  // =========================================================
  function openLeague(tab, idx) {
    if (typeof idx === 'number') leagueTeamIdx = idx;
    const team = teams[leagueTeamIdx]; if (!team) return;
    ensureLeague(team);
    leagueTab = tab || 'standings';
    ensureModal('league-modal').classList.add('show');
    renderLeague();
  }
  function closeLeague() { const m = document.getElementById('league-modal'); if (m) m.classList.remove('show'); }
  function setLeagueTab(t) { leagueTab = t; renderLeague(); }
  function setStatBoard(b) { statBoard = b; renderLeague(); }
  function setStatGroup(g) { statGroup = g; renderLeague(); }

  function renderLeague() {
    const team = teams[leagueTeamIdx]; if (!team) return;
    const m = ensureModal('league-modal');
    const tabs = [
      { k: 'standings', n: '📊 球队排名' },
      { k: 'stats', n: '📈 数据榜' },
      { k: 'bracket', n: '🏆 季后赛对阵图' },
      { k: 'awards', n: '🏅 奖项' },
      { k: 'history', n: '📜 王朝史' },
    ];
    let body = '';
    if (leagueTab === 'standings') body = renderStandings(team);
    else if (leagueTab === 'stats') body = renderStatBoards(team);
    else if (leagueTab === 'bracket') body = renderBracket(team);
    else if (leagueTab === 'awards') body = renderAwards(team);
    else if (leagueTab === 'history') body = renderHistory(team);
    m.innerHTML = `
      <div class="card wide" style="max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
        <div class="brand" style="margin-bottom:8px;"><h1 style="font-size:24px;">🏀 联盟数据中心</h1>
          <div class="sub" style="font-size:12px;">第 ${team.season} 赛季 · ${esc(team.teamName)}</div></div>
        <div class="lg-modal-tabs">
          ${tabs.map(t => `<button class="lg-mtab ${leagueTab === t.k ? 'active' : ''}" onclick="App.setLeagueTab('${t.k}')">${t.n}</button>`).join('')}
        </div>
        <div class="lg-body" style="overflow-y:auto;padding-right:4px;flex:1;">${body}</div>
        <button class="btn" style="margin-top:12px;" onclick="App.closeLeague()">关闭</button>
      </div>`;
  }

  function renderStandings(team) {
    const arr = standings(team);
    const phase = team.seasonPhase === 'playoff' ? '（季后赛已开打）' : team.seasonPhase === 'offseason' ? '（赛季已结束）' : `（常规赛 ${team.regGames}/${REGULAR_GAMES}）`;
    const rows = arr.map((t, i) => {
      const gp = t.w + t.l, wp = gp ? (t.w / gp * 100).toFixed(1) : '0.0';
      const seedTag = i < LEAGUE_SIZE ? `<span class="seed">${i + 1}</span>` : '';
      return `<tr class="${t.isPlayer ? 'me' : ''}">
        <td style="text-align:center">${seedTag}</td>
        <td>${esc(t.name)}${t.isPlayer ? ' <span class="metag">我</span>' : ''}</td>
        <td style="text-align:center">${t.w}</td>
        <td style="text-align:center">${t.l}</td>
        <td style="text-align:center">${wp}%</td>
        <td style="text-align:center">${fmt(t.str)}</td>
      </tr>`;
    }).join('');
    return `<p class="lg-note">按胜率排名，前 ${LEAGUE_SIZE} 名进入季后赛 ${phase}</p>
      <table class="lg-table">
        <thead><tr><th>种子</th><th>球队</th><th>胜</th><th>负</th><th>胜率</th><th>战力</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function renderStatBoards(team) {
    const groups = statGroup === 'basic' ? BASIC_STATS : ADV_STATS;
    let inner = '';
    if (statBoard === 'player') {
      inner = groups.map(st => {
        const top = leadersBy(team, st.key, 5);
        const rows = top.map((p, i) => `<tr class="${p.isMine ? 'me' : ''}">
          <td style="text-align:center">${i + 1}</td>
          <td>${esc(p.name)}${p.isMine ? ' <span class="metag">我</span>' : ''}<div class="sub2">${esc(p.team)} · ${p.pos} · ★${p.rating}</div></td>
          <td style="text-align:right;font-weight:700;color:var(--gold)">${st.pct ? p.stats[st.key] + '%' : p.stats[st.key]}</td>
        </tr>`).join('');
        return `<div class="stat-card"><div class="stat-h">${st.name}王</div>
          <table class="lg-table mini"><tbody>${rows}</tbody></table></div>`;
      }).join('');
    } else {
      // 球队榜：战绩 + 场均得分
      const off = teamRankBy(team, 'off');
      const rows = off.map((o, i) => `<tr class="${o.t.isPlayer ? 'me' : ''}">
        <td style="text-align:center">${i + 1}</td>
        <td>${esc(o.t.name)}${o.t.isPlayer ? ' <span class="metag">我</span>' : ''}</td>
        <td style="text-align:center">${o.t.w}-${o.t.l}</td>
        <td style="text-align:right;font-weight:700;color:var(--gold)">${o.val.toFixed(1)}</td>
      </tr>`).join('');
      inner = `<div class="stat-card"><div class="stat-h">球队进攻榜（场均得分总和）</div>
        <table class="lg-table"><thead><tr><th>#</th><th>球队</th><th>战绩</th><th style="text-align:right">场均得分</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
    }
    return `<div class="lg-subtabs">
        <button class="lg-stab ${statBoard === 'player' ? 'active' : ''}" onclick="App.setStatBoard('player')">个人榜</button>
        <button class="lg-stab ${statBoard === 'team' ? 'active' : ''}" onclick="App.setStatBoard('team')">球队榜</button>
        ${statBoard === 'player' ? `<span class="lg-gap"></span>
          <button class="lg-stab ${statGroup === 'basic' ? 'active' : ''}" onclick="App.setStatGroup('basic')">基础数据</button>
          <button class="lg-stab ${statGroup === 'adv' ? 'active' : ''}" onclick="App.setStatGroup('adv')">高阶数据</button>` : ''}
      </div>
      <div class="stat-grid">${inner}</div>`;
  }

  function renderBracket(team) {
    const br = team.league.bracket;
    if (!br) return `<p class="lg-note">季后赛对阵图将在<b>常规赛结束</b>后、按战绩种子排定生成。当前为常规赛阶段。</p>`;
    const titles = ['季后赛首轮', '分区决赛', '总决赛'];
    const seriesCell = (m, ri) => {
      if (!m) return '';
      const aWin = m.winner && m.a && m.winner.name === m.a.name, bWin = m.winner && m.b && m.winner.name === m.b.name;
      const line = (t, won, score) => t ? `<div class="bk-team ${t.isPlayer ? 'me' : ''} ${won ? 'win' : (m.winner ? 'out' : '')}">
        <span class="bk-seed">${t.seed || ''}</span><span class="bk-name">${esc(t.name)}</span><span class="bk-score">${score}</span></div>` : '<div class="bk-team empty">待定</div>';
      const playerHere = m.hasPlayer && !m.winner && team.seasonPhase === 'playoff';
      return `<div class="bk-match ${playerHere ? 'live' : ''}">
        ${line(m.a, aWin, m.a && m.a.isPlayer ? team.seriesWins : m.aw)}
        ${line(m.b, bWin, m.b && m.b.isPlayer ? team.seriesLosses : m.bw)}
        ${playerHere ? '<div class="bk-live">进行中</div>' : ''}
      </div>`;
    };
    const cols = br.rounds.map((round, ri) => {
      const cells = (round && round.length) ? round.map(m => seriesCell(m, ri)).join('') : '<div class="bk-match empty">—</div>';
      return `<div class="bk-col"><div class="bk-title">${titles[ri]}</div>${cells}</div>`;
    }).join('');
    const champ = br.champion ? `<div class="bk-champ">🏆 总冠军：<b>${esc(br.champion.name)}</b>${br.champion.isPlayer ? '（你的球队！）' : ''}</div>` : '';
    return `<p class="lg-note">7局4胜制 · ★ 标注为你的球队所在对阵</p><div class="bracket">${cols}</div>${champ}`;
  }

  function renderAwards(team) {
    if (!team.awards) return `<p class="lg-note">个人奖项将在<b>常规赛结束</b>时颁发，总决赛 FMVP 在夺冠后颁发。</p>`;
    const a = team.awards;
    const card = (def) => {
      const w = a[def.key];
      if (!w) return '';
      return `<div class="award-card ${w.isMine ? 'me' : ''}">
        <div class="aw-ico">${def.icon}</div>
        <div class="aw-info"><div class="aw-name">${def.name}</div>
          <div class="aw-win">${esc(w.name)}${w.isMine ? ' <span class="metag">我</span>' : ''} <span class="sub2">★${w.rating}</span></div>
          <div class="aw-stat">${w.stats.pts} 分 · ${w.stats.reb} 板 · ${w.stats.ast} 助 · ${w.stats.stl} 断 · ${w.stats.blk} 帽</div>
        </div></div>`;
    };
    const fmvp = team.fmvp ? `<div class="award-card me" style="border-color:var(--gold)">
        <div class="aw-ico">🏆</div>
        <div class="aw-info"><div class="aw-name">总决赛 FMVP</div>
          <div class="aw-win">${esc(team.fmvp.name)} <span class="metag">我</span> <span class="sub2">★${team.fmvp.rating}</span></div>
          <div class="aw-stat">${team.fmvp.stats.pts} 分 · ${team.fmvp.stats.reb} 板 · ${team.fmvp.stats.ast} 助</div>
        </div></div>` : '';
    return `<p class="lg-note">第 ${team.season} 赛季个人奖项</p><div class="award-grid">${AWARDS.map(card).join('')}${fmvp}</div>`;
  }

  function renderHistory(team) {
    const h = team.history || [];
    if (!h.length) return `<p class="lg-note">完成赛季后，这里会记录历届总冠军、FMVP 与各项常规赛奖项。</p>`;
    const rows = h.map(r => `<tr class="${r.isMine ? 'me' : ''}">
      <td style="text-align:center">S${r.season}</td>
      <td>${esc(r.champion)}${r.isMine ? ' 🏆' : ''}</td>
      <td>${esc(r.mvp)}</td>
      <td>${esc(r.fmvp)}</td>
      <td>${esc(r.dpoy)}</td>
      <td>${esc(r.roy)}</td>
    </tr>`).join('');
    return `<table class="lg-table"><thead><tr><th>赛季</th><th>总冠军</th><th>MVP</th><th>FMVP</th><th>DPOY</th><th>ROY</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  }

  // =========================================================
  // 颁奖典礼 / FMVP 弹窗
  // =========================================================
  function showAwardsCeremony(team, eliminated) {
    const a = team.awards; if (!a) return;
    const m = ensureModal('ceremony-modal'); m.classList.add('show');
    const item = (def, w) => w ? `<div class="award-card ${w.isMine ? 'me' : ''}">
      <div class="aw-ico">${def.icon}</div>
      <div class="aw-info"><div class="aw-name">${def.name}</div>
        <div class="aw-win">${esc(w.name)}${w.isMine ? ' <span class="metag">我</span>' : ''} <span class="sub2">★${w.rating}</span></div>
        <div class="aw-stat">${w.stats.pts}分 ${w.stats.reb}板 ${w.stats.ast}助</div></div></div>` : '';
    m.innerHTML = `
      <div class="card" style="max-width:480px;max-height:88vh;overflow-y:auto;">
        <div class="brand" style="margin-bottom:8px;"><h1 style="font-size:24px;">🏅 常规赛颁奖典礼</h1>
          <div class="sub" style="font-size:12px;">第 ${team.season} 赛季</div></div>
        <div class="award-grid">${AWARDS.map(d => item(d, a[d.key])).join('')}</div>
        <button class="btn" style="margin-top:14px;" onclick="App.closeCeremony()">${eliminated ? '进入选秀大会' : '进军季后赛'}</button>
      </div>`;
  }
  function closeCeremony() {
    const m = document.getElementById('ceremony-modal'); if (m) m.classList.remove('show');
    const team = teams[0];
    if (team && team.seasonPhase === 'offseason' && team.pendingDraft) openDraft(0);
    else refreshTeam(0);
  }
  function showFmvpCeremony(team, dia, idx) {
    const m = ensureModal('ceremony-modal'); m.classList.add('show');
    const f = team.fmvp;
    m.innerHTML = `
      <div class="victory-card" style="max-width:460px;">
        <div class="trophy">🏆</div>
        <h2>总冠军！</h2>
        <p style="margin-bottom:10px;">${esc(team.teamName)} 夺得第 ${team.banners} 座总冠军<br>王朝加成 +5%　💎 +${dia}</p>
        ${f ? `<div class="award-card me" style="border-color:var(--gold);text-align:left;">
          <div class="aw-ico">⭐</div>
          <div class="aw-info"><div class="aw-name">总决赛 FMVP</div>
            <div class="aw-win">${esc(f.name)} <span class="metag">我</span> <span class="sub2">★${f.rating}</span></div>
            <div class="aw-stat">${f.stats.pts}分 ${f.stats.reb}板 ${f.stats.ast}助 ${f.stats.stl}断 ${f.stats.blk}帽</div></div></div>` : ''}
        <button class="btn" style="margin-top:16px;" onclick="App.closeFmvp(${idx})">进入选秀大会</button>
      </div>`;
  }
  function closeFmvp(idx) {
    const m = document.getElementById('ceremony-modal'); if (m) m.classList.remove('show');
    openDraft(typeof idx === 'number' ? idx : 0);
  }

  // =========================================================
  // 选秀大会
  // =========================================================
  function openDraft(idx) {
    const team = teams[idx] || teams[0]; if (!team) return;
    leagueTeamIdx = teams.indexOf(team);
    if (!team.pendingDraft) team.pendingDraft = genProspects(team.season + 1);
    const m = ensureModal('draft-modal'); m.classList.add('show');
    const cards = team.pendingDraft.map(p => `
      <div class="draft-card" onclick="App.draftPick(${leagueTeamIdx},${p.id})">
        <div class="dft-tag">${p.tag}</div>
        <div class="dft-pos">${p.pos}</div>
        <div class="dft-name">${esc(p.name)}</div>
        <div class="dft-rating">潜力评级 <b>★${p.rating}</b></div>
        <button class="btn sm" style="margin-top:8px;width:100%;">选中他</button>
      </div>`).join('');
    m.innerHTML = `
      <div class="card wide" style="max-width:640px;max-height:88vh;overflow-y:auto;">
        <div class="brand" style="margin-bottom:8px;"><h1 style="font-size:24px;">🎓 选秀大会</h1>
          <div class="sub" style="font-size:12px;">第 ${team.season + 1} 赛季新秀 · 选择一名加入球队（提升战力，可竞争最佳新秀）</div></div>
        <div class="draft-grid">${cards}</div>
        <p style="text-align:center;color:var(--muted);font-size:11px;margin-top:10px;">新秀将作为替补深度提升球队战力，并在下赛季有资格竞争 ROY。</p>
      </div>`;
  }
  function draftPick(idx, pid) {
    const team = teams[idx] || teams[0]; if (!team || !team.pendingDraft) return;
    const p = team.pendingDraft.find(x => x.id === pid); if (!p) return;
    team.rookies = team.rookies || [];
    if (team.rookies.length >= 4) team.rookies.shift(); // 最多保留4名新秀深度
    team.rookies.push({ name: p.name, pos: p.pos, rating: p.rating, debutSeason: team.season + 1 });
    team.pendingDraft = null;
    Sound.play('reward'); Sound.vibrate([10, 30, 10]);
    pushLog(team, `🎓 选秀：${p.pos} ${p.name}（★${p.rating}）加盟！`, 'win');
    toast(`选中 ${p.name}（★${p.rating}）`);
    const m = document.getElementById('draft-modal'); if (m) m.classList.remove('show');
    startNextSeason(team);
    refreshTeam(idx);
    runMatchCooldown(idx);
  }

  // =========================================================
  // 存档 / 退出
  // =========================================================
  function manualSave() {
    if (gameMode !== 'single') return toast('双人对战不支持存档');
    const team = teams[0], accounts = getAccounts(), u = curUser();
    if (!accounts[u]) return toast('账户异常');
    if (!accounts[u].saves) accounts[u].saves = [];
    const save = {
      timestamp: Date.now(), teamName: team.teamName, diff: team.diff, funds: team.funds,
      season: team.season, seasonTarget: team.seasonTarget, banners: team.banners,
      bannerBonus: team.bannerBonus, permBonus: team.permBonus,
      players: team.players, facilities: team.facilities, totalEarned: team.totalEarned,
      matches: team.matches, wins: team.wins,
      seasonPhase: team.seasonPhase, regGames: team.regGames, regWins: team.regWins,
      playoffRound: team.playoffRound, seriesWins: team.seriesWins, seriesLosses: team.seriesLosses,
      rookies: team.rookies, league: team.league, awards: team.awards, fmvp: team.fmvp,
      history: team.history, pendingDraft: team.pendingDraft,
      stats: team.stats, claimed: team.claimed,
    };
    const existIdx = accounts[u].saves.findIndex(s => s.teamName === team.teamName && s.diff === team.diff);
    if (existIdx >= 0) accounts[u].saves[existIdx] = save;
    else { if (accounts[u].saves.length >= 5) accounts[u].saves.shift(); accounts[u].saves.push(save); }
    saveAccounts(accounts);
    pushLog(team, '💾 游戏已保存', 'hl'); refreshTeam(0);
    toast('已保存存档（离线后将累计收益）');
  }
  function quitToMenu() {
    stopLoop();
    document.getElementById('victory').classList.remove('show');
    teams = []; curEvent = null; goto('mode');
  }

  // =========================================================
  // 规则
  // =========================================================
  function showRules() {
    let modal = document.getElementById('rules-modal');
    if (!modal) {
      modal = document.createElement('div'); modal.id = 'rules-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(5,7,15,0.9);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;';
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="card wide" style="max-height:86vh;display:flex;flex-direction:column;">
        <div class="brand" style="margin-bottom:14px;"><h1 style="font-size:30px;">游戏规则</h1></div>
        <div class="rules">
          <div class="rule-block"><h3>🎯 游戏目标</h3>
            <p>从零打造一支 NBA 球队，签下<b>真实球星</b>，通过<b>放置养成</b>不断积累<b>${POINT_LABEL}</b>。<b>单人模式无终局</b>——可持续夺冠、累积王朝；<b>双人模式</b>率先达成夺冠目标者获胜 🏆。</p></div>
          <div class="rule-block"><h3>💰 多元资金玩法</h3>
            <p><b>投篮训练</b>：点击即时获得${POINT_LABEL}。</p>
            <p><b>球员产出</b>：签约 PG/SG/SF/PF/C 真实球星（库里、乔丹、詹姆斯、邓肯、奥尼尔…），自动持续产出，可不断「换强」升级。</p>
            <p><b>赛季中心</b>：发起比赛，<b>胜率由双方战力决定</b>。签强/升级球员、升级设施都会真实提升<b>战力</b>，从而提高胜率；每场都会显示对手球队的<b>战力与阵容</b>。</p>
            <p><b>球队任务</b>：完成投篮/签约/比赛等成就，领取资金与钻石奖励。</p>
            <p><b>离线收益</b>：保存退出后，再次读档将自动结算离线期间收益（封顶 8 小时），<b>战绩、赛季进度也会一并保存</b>。</p></div>
          <div class="rule-block"><h3>⭐ 限时活动</h3>
            <p>全服轮换：全明星周末（产出×2）、季后赛奖金（比赛×3）、球迷狂欢节（点击×4）、选秀大会（签约-40%）、总决赛热潮（全场×2.5），把握时机收益翻倍。</p></div>
          <div class="rule-block"><h3>🏆 真实赛制 · 可持续王朝（单人）</h3>
            <p><b>常规赛</b>：每赛季打 <b>${REGULAR_GAMES}</b> 场常规赛，胜场达到 <b>${PLAYOFF_NEED}</b> 胜（≥50%）即可<b>晋级季后赛</b>，否则进入下赛季重来。</p>
            <p><b>季后赛</b>：依次进行<b>首轮 → 分区决赛 → 总决赛</b>三轮，每轮<b>7局4胜</b>制系列赛；连胜三轮即夺得<b>总冠军</b>。</p>
            <p><b>王朝加成</b>：每夺一冠获得<b>永久 +5% 全局产出与战力加成</b>及钻石奖励，随后自动开启新赛季，<b>无限运营</b>。</p></div>
          <div class="rule-block"><h3>🛒 充值与钻石</h3>
            <p>支持 <b>Google Play / 微信支付 / 支付宝 / Apple Pay</b> 充值钻石（原型演示，模拟流程不扣费）。</p>
            <p>钻石可兑换资金、双倍产出卡、永久产出加成、清除比赛冷却等。</p></div>
          <div class="rule-block"><h3>🕹️ 界面流程</h3>
            <p>① 登录/注册 → ② 选择单/双人模式 → ③ 新档/旧档/规则 → ④（新档）选择难度 → 进入游戏。</p></div>
        </div>
        <button class="btn" style="margin-top:14px;" onclick="App.closeRules()">返回</button>
      </div>`;
    modal.style.display = 'flex';
  }
  function closeRules() { const modal = document.getElementById('rules-modal'); if (modal) modal.style.display = 'none'; }

  // =========================================================
  // 设置面板（音频 / 画质 / 震动）
  // =========================================================
  function openSettings() {
    Sound.play('click');
    ensureModal('settings-modal').classList.add('show');
    renderSettings();
  }
  function closeSettings() { const m = document.getElementById('settings-modal'); if (m) m.classList.remove('show'); }
  function renderSettings() {
    const m = ensureModal('settings-modal');
    const s = Sound.get();
    const sw = (key, checked) =>
      `<label class="switch"><input type="checkbox" ${checked ? 'checked' : ''} onchange="App.setSetting('${key}',this.checked)"><span class="sl-track"></span><span class="sl-thumb"></span></label>`;
    const qLabels = { high: '高', medium: '中', low: '低' };
    m.innerHTML = `
      <div class="card" style="max-width:440px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;">
        <div class="brand" style="margin-bottom:10px;"><h1 style="font-size:26px;">⚙️ 游戏设置</h1></div>
        <div style="overflow-y:auto;padding-right:6px;">
          <div class="set-group">
            <h3>🔊 音频</h3>
            <div class="set-row">
              <div><div class="sl">背景音乐</div><div class="sd">主界面与游戏中循环播放</div></div>
              <div class="sc">${sw('musicOn', s.musicOn)}</div>
            </div>
            <div class="set-row">
              <div class="sl">音乐音量</div>
              <div class="sc"><input type="range" class="vol" min="0" max="100" value="${Math.round(s.musicVol * 100)}" oninput="App.setSetting('musicVol',this.value/100)"></div>
            </div>
            <div class="set-row">
              <div><div class="sl">音效</div><div class="sd">点击 · 投篮 · 签约 · 消耗 · 胜负</div></div>
              <div class="sc">${sw('sfxOn', s.sfxOn)}</div>
            </div>
            <div class="set-row">
              <div class="sl">音效音量</div>
              <div class="sc"><input type="range" class="vol" min="0" max="100" value="${Math.round(s.sfxVol * 100)}" oninput="App.setSetting('sfxVol',this.value/100)" onchange="App.previewSfx()"></div>
            </div>
          </div>
          <div class="set-group">
            <h3>🖥️ 画质</h3>
            <div class="set-row">
              <div><div class="sl">画质等级</div><div class="sd">低画质关闭动画/阴影，提升弱机型流畅度</div></div>
              <div class="q-btns">
                ${['high', 'medium', 'low'].map(q => `<button class="q-btn ${s.quality === q ? 'active' : ''}" onclick="App.setSetting('quality','${q}')">${qLabels[q]}</button>`).join('')}
              </div>
            </div>
          </div>
          <div class="set-group">
            <h3>🎨 背景</h3>
            <div class="set-row">
              <div><div class="sl">游戏背景</div><div class="sd">选择喜欢的主题背景，自动保存</div></div>
            </div>
            <div class="bg-grid">
              ${BACKGROUNDS.map(b => `<button class="bg-opt ${s.bg === b.key ? 'active' : ''}" onclick="App.setSetting('bg','${b.key}')"><span class="bg-sw bg-sw-${b.key}"></span>${b.name}</button>`).join('')}
            </div>
          </div>
          <div class="set-group">
            <h3>📳 其他</h3>
            <div class="set-row">
              <div><div class="sl">震动反馈</div><div class="sd">在支持的设备上点击时震动</div></div>
              <div class="sc">${sw('vibrate', s.vibrate)}</div>
            </div>
          </div>
          <p style="text-align:center;color:var(--muted);font-size:11px;margin-top:6px;">设置自动保存，下次启动依然生效</p>
        </div>
        <button class="btn" style="margin-top:14px;" onclick="App.closeSettings()">完成</button>
      </div>`;
  }
  function setSetting(key, val) {
    if (key === 'musicOn') Sound.setMusic(val);
    else Sound.set(key, val);
    if (key === 'sfxOn' && val) Sound.play('click');
    // 仅开关/画质/背景需要重绘以更新选中态；滑块拖动时不重绘，避免打断操作
    if (key === 'quality' || key === 'musicOn' || key === 'sfxOn' || key === 'bg') { Sound.play('click'); renderSettings(); }
  }
  function previewSfx() { Sound.play('coin'); }

  // =========================================================
  // 工具函数
  // =========================================================
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }
  function fmt(n) {
    if (n < 1000) return (Math.floor(n * 10) / 10).toString().replace(/\.0$/, '');
    const units = ['', 'K', 'M', 'B', 'T', 'aa', 'bb'];
    let u = 0;
    while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
    return (Math.floor(n * 100) / 100) + units[u];
  }
  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return '—';
    if (sec < 60) return Math.ceil(sec) + '秒';
    if (sec < 3600) return Math.floor(sec / 60) + '分' + Math.floor(sec % 60) + '秒';
    if (sec < 86400) return Math.floor(sec / 3600) + '小时' + Math.floor((sec % 3600) / 60) + '分';
    return Math.floor(sec / 86400) + '天';
  }
  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
  }
  function floatPoint(ev, text) {
    const el = document.createElement('div');
    el.className = 'float-pt'; el.textContent = text;
    const x = ev ? ev.clientX : window.innerWidth / 2;
    const y = ev ? ev.clientY : window.innerHeight / 2;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  // ---------- 启动 ----------
  function init() {
    switchAuthTab('login');
    Sound.applyQuality();
    Sound.applyBackground();
    ['auth-user', 'auth-pass', 'auth-confirm'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') submitAuth(); });
    });
    // 首次任意手势解锁音频并播放背景音乐 + 通用导航点击音效
    const SKIP = ['shoot-btn', 'buy-btn', 'match-btn', 'task-claim', 'gem-buy', 'q-btn'];
    document.addEventListener('click', e => {
      Sound.unlock();
      const el = e.target.closest('button,.opt,.save-row,.pay-m,.social-btn');
      if (!el) return;
      if (SKIP.some(c => el.classList.contains(c))) return;
      Sound.play('click');
    }, true);
    document.addEventListener('touchstart', () => Sound.unlock(), { once: true, passive: true });
  }
  document.addEventListener('DOMContentLoaded', init);

  // ---------- 对外接口 ----------
  return {
    goto, switchAuthTab, submitAuth, chooseMode,
    socialLogin, confirmSocial, cancelSocial,
    openLoadList, deleteSave, loadSave, startNewGame,
    shoot, buyPlayer, buyFacility, playMatch, claimTask,
    openStore, closeStore, renderStore, openPay, closePay, doPay, finishPay,
    buyDiamondItem, closeOffline,
    openLeague, closeLeague, setLeagueTab, setStatBoard, setStatGroup,
    closeCeremony, closeFmvp, openDraft, draftPick,
    manualSave, quitToMenu, showRules, closeRules, backToMenuFromVictory,
    openSettings, closeSettings, renderSettings, setSetting, previewSfx,
  };
})();
