// ============================================================
// 王朝传奇 - NBA 球队经营放置游戏
// 界面流程：登录/注册 → 单/双人模式 → 新档/旧档/规则 → 难度选择 → 游戏
// v2：多元资金玩法 / 可持续赛季运营 / 真实NBA球员 / 充值支付接口
// ============================================================

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
    let rating = 0;
    POSITIONS.forEach((pos, i) => {
      const lv = team.players[i].level, p = playerAt(pos.key, lv);
      if (p) rating += p.rating * (1 + lv * 0.05);
    });
    return fundsPerSec(team) + rating;
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
    });
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
    renderTopActions(); renderEventBanner(); buildArena(); startLoop();
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
          <div class="dn"><div class="t">第 <b id="season-${idx}">1</b> 赛季 · 距夺冠 <span id="eta-${idx}" style="color:var(--orange)"></span></div>
            <div class="v">赛季目标 <span id="seasontarget-${idx}">0</span></div></div>
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
          <div class="match-head"><span class="mt">🏟️ 联赛中心</span><span class="mr" id="match-record-${idx}">战绩 0胜 0负</span></div>
          <button class="match-btn" id="match-btn-${idx}" onclick="App.playMatch(${idx})">⚔️ 发起一场比赛</button>
          <div class="match-result" id="match-result-${idx}">击败对手可赢得丰厚奖金，胜率取决于球队战力</div>
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
    const gain = clickValue(team);
    team.funds += gain; team.totalEarned += gain; team.stats.clicks++;
    floatPoint(ev, '+' + fmt(gain));
    refreshTeam(idx); checkProgress(idx);
  }
  function buyPlayer(idx, posIdx) {
    const team = teams[idx];
    if (team.won) return;
    const cost = playerCost(team, posIdx);
    if (team.funds < cost) return toast('资金不足');
    team.funds -= cost; team.players[posIdx].level++; team.stats.signs++;
    const lv = team.players[posIdx].level, p = playerAt(POSITIONS[posIdx].key, lv);
    if (p) pushLog(team, `✍️ ${POSITIONS[posIdx].name}签下了 ${p.cn} (#${p.no})！`, 'hl');
    else pushLog(team, `💪 ${POSITIONS[posIdx].name}训练强化 Lv.${lv}`, '');
    refreshTeam(idx);
  }
  function buyFacility(idx, key) {
    const team = teams[idx];
    if (team.won) return;
    const cost = facilityCost(team, key);
    if (team.funds < cost) return toast('资金不足');
    team.funds -= cost; team.facilities[key]++;
    const f = FACILITIES.find(x => x.key === key);
    pushLog(team, `🏟️ ${f.name} 升级至 Lv.${team.facilities[key]}`, 'hl');
    refreshTeam(idx);
  }
  function playMatch(idx) {
    const team = teams[idx];
    if (team.won) return;
    const now = Date.now();
    if (now - team.lastMatchAt < MATCH_COOLDOWN) return toast('比赛冷却中');
    team.lastMatchAt = now; team.matches++; team.stats.matches++;
    const opp = pick(NBA_TEAMS) + '队';
    const myPow = teamPower(team) + 1, oppPow = myPow * (0.6 + Math.random() * 0.9);
    const winChance = Math.max(0.15, Math.min(0.9, myPow / (myPow + oppPow)));
    const win = Math.random() < winChance;
    const baseReward = Math.max(fundsPerSec(team) * 10, 20);
    const reward = Math.round(baseReward * (win ? 1 : 0.3) * eventMatchMul());
    team.funds += reward; team.totalEarned += reward;
    const myScore = 80 + Math.floor(Math.random() * 40);
    const oppScore = win ? myScore - (1 + Math.floor(Math.random() * 15)) : myScore + (1 + Math.floor(Math.random() * 15));
    if (win) { team.wins++; team.stats.wins++; }
    const resEl = document.getElementById('match-result-' + idx);
    if (resEl) resEl.innerHTML = win
      ? `<span class="w">🎉 击败 ${opp} ${myScore}:${oppScore}</span>，奖金 +${fmt(reward)}${eventMatchMul()>1?'（活动加成）':''}`
      : `<span class="l">😖 不敌 ${opp} ${myScore}:${oppScore}</span>，仍获参赛费 +${fmt(reward)}`;
    pushLog(team, win ? `⚔️ 战胜${opp} ${myScore}:${oppScore}，奖金+${fmt(reward)}` : `⚔️ 负于${opp} ${myScore}:${oppScore}`, win ? 'hl' : '');
    refreshTeam(idx); checkProgress(idx); runMatchCooldown(idx);
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
      } else { btn.disabled = team.won; btn.textContent = '⚔️ 发起一场比赛'; }
    };
    tick();
  }
  function taskProgress(team, t) { return Math.min(team.stats[t.metric], t.target); }
  function claimTask(idx, key) {
    const team = teams[idx], t = TASKS.find(x => x.key === key);
    if (!t || team.claimed[key]) return;
    if (team.stats[t.metric] < t.target) return toast('任务尚未完成');
    const fundGain = fundsPerSec(team) * t.reward.fundSec + 50;
    team.funds += fundGain; team.totalEarned += fundGain; team.claimed[key] = true;
    addDiamonds(t.reward.dia);
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
    if (gameMode === 'dual') {
      if (team.funds >= team.goal) { team.won = true; pushLog(team, '🏆 达成夺冠目标！', 'win'); onDualVictory(idx); }
    } else {
      if (team.funds >= team.seasonTarget) {
        team.banners++; team.season++; team.bannerBonus += 0.05;
        const diaReward = 20 + team.banners * 5;
        addDiamonds(diaReward);
        team.seasonTarget = Math.ceil(team.seasonTarget * 3.5);
        pushLog(team, `🏆 第 ${team.banners} 座总冠军！王朝加成 +5%，💎${diaReward}`, 'win');
        toast(`🏆 夺得第 ${team.banners} 座总冠军！进入第 ${team.season} 赛季`);
        refreshTeam(idx);
      }
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
      const progress = Math.min(100, (team.funds / team.seasonTarget) * 100);
      setText('prog-' + idx, progress.toFixed(1) + '%');
      const fill = document.getElementById('fill-' + idx); if (fill) fill.style.width = progress + '%';
      setText('season-' + idx, team.season);
      setText('seasontarget-' + idx, fmt(team.seasonTarget));
      setText('banners-' + idx, team.banners + ' 次');
      setText('bbonus-' + idx, '王朝加成 +' + Math.round(team.bannerBonus * 100) + '%');
      const icons = document.getElementById('banner-icons-' + idx);
      if (icons) icons.textContent = team.banners ? '🏆'.repeat(Math.min(team.banners, 8)) : '—';
      const remain = team.seasonTarget - team.funds, eta = document.getElementById('eta-' + idx);
      if (eta) eta.textContent = remain <= 0 ? '即将夺冠' : (rate > 0 ? fmtTime(remain / rate) : '需产出');
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
      teams.forEach(t => pushLog(t, `🛒 充值到账 💎${payingPkg.diamonds}`, 'hl'));
      toast(`充值成功！💎 +${fmt(payingPkg.diamonds)}`);
      payingPkg = null;
    }
    closePay(); renderStore('diamond');
  }

  function buyDiamondItem(key) {
    const it = DIAMOND_ITEMS.find(x => x.key === key);
    if (!it) return;
    if (getDiamonds() < it.cost) { toast('钻石不足，请先充值'); return; }
    const team = teams[storeTeamIdx] || teams[0];
    if (!team) return;
    addDiamonds(-it.cost);
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
            <p><b>联赛中心</b>：发起比赛，按球队战力计算胜负，赢取奖金（有短冷却）。</p>
            <p><b>球队任务</b>：完成投篮/签约/比赛等成就，领取资金与钻石奖励。</p>
            <p><b>离线收益</b>：保存退出后，再次读档将自动结算离线期间收益（封顶 8 小时）。</p></div>
          <div class="rule-block"><h3>⭐ 限时活动</h3>
            <p>全服轮换：全明星周末（产出×2）、季后赛奖金（比赛×3）、球迷狂欢节（点击×4）、选秀大会（签约-40%）、总决赛热潮（全场×2.5），把握时机收益翻倍。</p></div>
          <div class="rule-block"><h3>🏆 可持续王朝（单人）</h3>
            <p>每达成<b>赛季目标</b>即夺得一座总冠军：获得<b>永久产出 +5%</b>与钻石奖励，目标自动提升，进入新赛季，<b>无限运营</b>。</p></div>
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
    ['auth-user', 'auth-pass', 'auth-confirm'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') submitAuth(); });
    });
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
    manualSave, quitToMenu, showRules, closeRules, backToMenuFromVictory,
  };
})();
