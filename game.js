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
  const defaults = { musicOn: true, sfxOn: true, musicVol: 0.4, sfxVol: 0.6, quality: 'high', vibrate: true, bg: 'arena', lang: 'zh' };
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

  // =========================================================
  // 国际化 (i18n)：中文为源语言，英文通过字典映射
  // tr(s, vars)：s 为中文源串（可含 {占位符}）；英文模式查 EN 字典，缺失则回退中文
  // 命名为 tr 而非 t，避免与代码中大量用作 team/task 的局部变量 t 冲突
  // =========================================================
  let LANG = (Sound.get().lang === 'en') ? 'en' : 'zh';
  function tr(s, vars) {
    let out = (LANG === 'en' && EN[s] != null) ? EN[s] : s;
    if (vars) for (const k in vars) out = out.split('{' + k + '}').join(vars[k]);
    return out;
  }
  // 球队名本地化（中文队名 → 英文队名）
  function teamLabel(name) {
    if (LANG !== 'en') return name;
    const base = String(name).replace(/队$/, '');
    return EN_TEAMS[base] || name;
  }
  // 球员名本地化（中文 → 英文，缺失则保留原名）
  function playerLabel(name) {
    if (LANG !== 'en') return name;
    return EN_PLAYERS[name] || name;
  }
  // 英文队名映射（30 队）
  const EN_TEAMS = {
    '湖人': 'Lakers', '凯尔特人': 'Celtics', '勇士': 'Warriors', '公牛': 'Bulls',
    '马刺': 'Spurs', '热火': 'Heat', '雄鹿': 'Bucks', '掘金': 'Nuggets',
    '76人': '76ers', '快船': 'Clippers', '太阳': 'Suns', '篮网': 'Nets',
    '尼克斯': 'Knicks', '独行侠': 'Mavericks', '森林狼': 'Timberwolves', '鹈鹕': 'Pelicans',
    '猛龙': 'Raptors', '骑士': 'Cavaliers', '活塞': 'Pistons', '步行者': 'Pacers',
    '老鹰': 'Hawks', '黄蜂': 'Hornets', '魔术': 'Magic', '奇才': 'Wizards',
    '雷霆': 'Thunder', '开拓者': 'Trail Blazers', '爵士': 'Jazz', '国王': 'Kings',
    '火箭': 'Rockets', '灰熊': 'Grizzlies',
  };
  // 英文球员名映射（真实名单 + 球员池关键球员；缺失回退原名）
  const EN_PLAYERS = {
    // 球员池（可签约球星）
    '克里斯·保罗': 'Chris Paul', '史蒂夫·纳什': 'Steve Nash', '阿伦·艾弗森': 'Allen Iverson',
    '魔术师约翰逊': 'Magic Johnson', '斯蒂芬·库里': 'Stephen Curry', '克莱·汤普森': 'Klay Thompson',
    '雷·阿伦': 'Ray Allen', '詹姆斯·哈登': 'James Harden', '德怀恩·韦德': 'Dwyane Wade',
    '科比·布莱恩特': 'Kobe Bryant', '迈克尔·乔丹': 'Michael Jordan', '保罗·皮尔斯': 'Paul Pierce',
    '斯科蒂·皮蓬': 'Scottie Pippen', '科怀·伦纳德': 'Kawhi Leonard', '凯文·杜兰特': 'Kevin Durant',
    '拉里·伯德': 'Larry Bird', '勒布朗·詹姆斯': 'LeBron James', '查尔斯·巴克利': 'Charles Barkley',
    '卡尔·马龙': 'Karl Malone', '凯文·加内特': 'Kevin Garnett', '德克·诺维茨基': 'Dirk Nowitzki',
    '扬尼斯·阿德托昆博': 'Giannis Antetokounmpo', '蒂姆·邓肯': 'Tim Duncan', '大卫·罗宾逊': 'David Robinson',
    '尼古拉·约基奇': 'Nikola Jokic', '哈基姆·奥拉朱旺': 'Hakeem Olajuwon', '沙奎尔·奥尼尔': "Shaquille O'Neal",
    '威尔特·张伯伦': 'Wilt Chamberlain', '贾巴尔': 'Kareem Abdul-Jabbar',
    // 真实名单
    '卢卡·东契奇': 'Luka Doncic', '奥斯汀·里夫斯': 'Austin Reaves', '八村垒': 'Rui Hachimura',
    '德安德烈·艾顿': 'Deandre Ayton', '德里克·怀特': 'Derrick White', '安芬尼·西蒙斯': 'Anfernee Simons',
    '杰伦·布朗': 'Jaylen Brown', '杰森·塔图姆': 'Jayson Tatum', '尼姆哈斯·克塔': 'Neemias Queta',
    '布兰丁·波杰姆斯基': 'Brandin Podziemski', '吉米·巴特勒': 'Jimmy Butler', '德雷蒙德·格林': 'Draymond Green',
    '阿尔·霍福德': 'Al Horford', '约什·吉迪': 'Josh Giddey', '科比·怀特': 'Coby White',
    '阿尤·多苏姆': 'Ayo Dosunmu', '马塔斯·布泽利斯': 'Matas Buzelis', '尼古拉·武切维奇': 'Nikola Vucevic',
    '德阿龙·福克斯': "De'Aaron Fox", '斯蒂芬·卡斯尔': 'Stephon Castle', '德文·瓦塞尔': 'Devin Vassell',
    '哈里森·巴恩斯': 'Harrison Barnes', '维克托·文班亚马': 'Victor Wembanyama', '戴维昂·米切尔': "Davion Mitchell",
    '泰勒·希罗': 'Tyler Herro', '诺曼·鲍威尔': 'Norman Powell', '安德鲁·威金斯': 'Andrew Wiggins',
    '巴姆·阿德巴约': 'Bam Adebayo', '凯文·波特': 'Kevin Porter Jr.', '加里·特伦特': 'Gary Trent Jr.',
    '凯尔·库兹马': 'Kyle Kuzma', '迈尔斯·特纳': 'Myles Turner', '贾马尔·穆雷': 'Jamal Murray',
    '克里斯蒂安·布劳恩': 'Christian Braun', '卡梅伦·约翰逊': 'Cameron Johnson', '阿隆·戈登': 'Aaron Gordon',
    '泰瑞斯·马克西': 'Tyrese Maxey', '贾里德·麦凯恩': 'Jared McCain', '保罗·乔治': 'Paul George',
    'VJ·埃奇科姆': 'VJ Edgecombe', '乔尔·恩比德': 'Joel Embiid', '布拉德利·比尔': 'Bradley Beal',
    '约翰·科林斯': 'John Collins', '伊维察·祖巴茨': 'Ivica Zubac', '杰伦·格林': 'Jalen Green',
    '德文·布克': 'Devin Booker', '迪龙·布鲁克斯': 'Dillon Brooks', '罗伊斯·奥尼尔': "Royce O'Neale",
    '马克·威廉姆斯': 'Mark Williams', '埃格尔·德明': 'Egor Demin', '卡姆·托马斯': 'Cam Thomas',
    '迈克尔·波特': 'Michael Porter Jr.', '诺亚·克拉里': 'Noah Clowney', '尼克·克拉克斯顿': 'Nic Claxton',
    '杰伦·布伦森': 'Jalen Brunson', '米卡尔·布里奇斯': 'Mikal Bridges', 'OG·阿努诺比': 'OG Anunoby',
    '卡尔-安东尼·唐斯': 'Karl-Anthony Towns', '米切尔·罗宾逊': 'Mitchell Robinson', '德安吉洛·拉塞尔': "D'Angelo Russell",
    '库珀·弗拉格': 'Cooper Flagg', '安东尼·戴维斯': 'Anthony Davis', '德雷克·莱夫利': 'Dereck Lively II',
    '迈克·康利': 'Mike Conley', '安东尼·爱德华兹': 'Anthony Edwards', '杰登·麦克丹尼尔斯': 'Jaden McDaniels',
    '朱利叶斯·兰德尔': 'Julius Randle', '鲁迪·戈贝尔': 'Rudy Gobert', '德章泰·穆雷': 'Dejounte Murray',
    '乔丹·普尔': 'Jordan Poole', '特雷·墨菲': 'Trey Murphy III', '锡安·威廉姆斯': 'Zion Williamson',
    '伊夫·米西': 'Yves Missi', '伊曼纽尔·奎克利': 'Immanuel Quickley', '格拉迪·迪克': 'Gradey Dick',
    'RJ·巴雷特': 'RJ Barrett', '斯科蒂·巴恩斯': 'Scottie Barnes', '雅各布·珀尔特尔': 'Jakob Poeltl',
    '达柳斯·加兰': 'Darius Garland', '唐纳万·米切尔': 'Donovan Mitchell', '马克斯·斯特鲁斯': 'Max Strus',
    '埃文·莫布利': 'Evan Mobley', '贾勒特·阿伦': 'Jarrett Allen', '凯德·坎宁安': 'Cade Cunningham',
    '贾登·艾维': 'Jaden Ivey', '奥萨·汤普森': 'Ausar Thompson', '汤比·哈里斯': 'Tobias Harris',
    '杰伦·杜伦': 'Jalen Duren', '泰瑞斯·哈利伯顿': 'Tyrese Haliburton', '安德鲁·内姆哈德': 'Andrew Nembhard',
    '本·谢泼德': 'Ben Sheppard', '帕斯卡尔·西亚卡姆': 'Pascal Siakam', '艾萨亚·杰克逊': 'Isaiah Jackson',
    '特雷·杨': 'Trae Young', '戴森·丹尼尔斯': 'Dyson Daniels', '扎卡里·里萨谢': 'Zaccharie Risacher',
    '杰伦·约翰逊': 'Jalen Johnson', '克里斯塔普斯·波尔津吉斯': 'Kristaps Porzingis', '拉梅洛·鲍尔': 'LaMelo Ball',
    '布兰登·米勒': 'Brandon Miller', '乔什·格林': 'Josh Green', '迈尔斯·布里奇斯': 'Miles Bridges',
    '瑞恩·孔德': 'Ryan Kalkbrenner', '雅伦·萨格斯': 'Jalen Suggs', '德斯蒙德·班恩': 'Desmond Bane',
    '弗朗茨·瓦格纳': 'Franz Wagner', '保罗·班切罗': 'Paolo Banchero', '文德尔·卡特': 'Wendell Carter Jr.',
    '巴布·卡灵顿': 'Bub Carrington', 'CJ·麦科勒姆': 'CJ McCollum', '比拉尔·库利巴利': 'Bilal Coulibaly',
    '凯肖恩·乔治': 'Kyshawn George', '阿历克斯·萨尔': 'Alex Sarr', '谢伊·吉尔杰斯-亚历山大': 'Shai Gilgeous-Alexander',
    '卢盖兹·多特': 'Luguentz Dort', '杰伦·威廉姆斯': 'Jalen Williams', '切特·霍姆格伦': 'Chet Holmgren',
    '伊萨亚·哈滕施泰因': 'Isaiah Hartenstein', '斯库特·亨德森': 'Scoot Henderson', '谢登·夏普': 'Shaedon Sharpe',
    '杰拉米·格兰特': 'Jerami Grant', '图马尼·卡马拉': 'Toumani Camara', '唐纳万·克林根': 'Donovan Clingan',
    '艾萨亚·科利尔': 'Isaiah Collier', '科迪·威廉姆斯': 'Cody Williams', '艾斯·贝利': 'Ace Bailey',
    '拉里·马尔卡宁': 'Lauri Markkanen', '沃克·凯斯勒': 'Walker Kessler', '丹尼斯·施罗德': 'Dennis Schroder',
    '扎克·拉文': 'Zach LaVine', '德马尔·德罗赞': 'DeMar DeRozan', '基根·穆雷': 'Keegan Murray',
    '多曼塔斯·萨博尼斯': 'Domantas Sabonis', '阿门·汤普森': 'Amen Thompson', '里德·谢泼德': 'Reed Sheppard',
    '杰巴里·史密斯': 'Jabari Smith Jr.', '阿尔佩伦·申京': 'Alperen Sengun', '贾·莫兰特': 'Ja Morant',
    '凯·杰克逊': 'GG Jackson', '杰伦·威尔斯': 'Jaylen Wells', '杰伦·杰克逊': 'Jaren Jackson Jr.',
    '赞克·埃迪': 'Zach Edey',
  };

  // ---------- 英文 UI 文案字典（键为中文源串）----------
  const EN = {
    // 通用
    '关闭': 'Close', '完成': 'Done', '返回': 'Back', '取消': 'Cancel', '确认': 'Confirm',
    '东部': 'East', '西部': 'West', '我': 'ME', '你的分区': 'Your Conference',
    '常规赛': 'Regular Season', '附加赛': 'Play-In', '季后赛': 'Playoffs', '休赛期': 'Offseason',
    '资金': 'Funds', '次': '', '胜': 'W', '负': 'L',
    '季后赛首轮': 'First Round', '分区半决赛': 'Conf. Semifinals', '分区决赛': 'Conf. Finals', '总决赛': 'Finals',
    // 位置
    '控球后卫': 'Point Guard', '得分后卫': 'Shooting Guard', '小前锋': 'Small Forward',
    '大前锋': 'Power Forward', '中锋': 'Center', 'PG': 'PG', 'SG': 'SG', 'SF': 'SF', 'PF': 'PF', 'C': 'C',
    // 设施
    '训练馆': 'Training Gym', '球探网络': 'Scouting Net', '商业赞助': 'Sponsorship', '主场球迷': 'Home Fans',
    '球员产出 ×1.5': 'Player output ×1.5', '点击收益 ×2': 'Tap income ×2',
    '全局产出 ×1.4': 'Global output ×1.4', '全局产出 ×1.6': 'Global output ×1.6',
    // 难度
    '新秀': 'Rookie', '职业': 'Pro', '名人堂': 'Hall of Fame',
    '轻松': 'Easy', '平衡': 'Balanced', '硬核': 'Hardcore', '难度': ' Difficulty',
    '起步资金充裕，成本更低，适合新手体验。': 'Generous starting funds and lower costs — great for newcomers.',
    '标准平衡的经营节奏，正统的王朝挑战。': 'A balanced pace and the classic dynasty challenge.',
    '资源紧张、成本高昂，只为真正的传奇而生。': 'Scarce resources and high costs — for true legends only.',
    // 顶栏
    '🛒 充值': '🛒 Recharge', '💎 钻石商店': '💎 Diamond Shop', '🎈 活动中心': '🎈 Events',
    '💾 保存': '💾 Save', '⚙️ 设置': '⚙️ Settings', '🚪 返回菜单': '🚪 Menu',
    '经理：': 'Manager: ', '访客': 'Guest',
    '💎 钻石可用于': '💎 Diamonds can be used for',
    '兑换资金：立即获得大量{p}补给': 'Convert to funds: instantly gain a large supply of {p}',
    '双倍产出卡：限时全队产出翻倍': 'Double Output Card: timed team output ×2',
    '永久产出 +20%：永久提升全局收益': 'Permanent +20%: permanently boost global income',
    '清除比赛冷却：随时再战联赛': 'Clear cooldown: play league games anytime',
    '完成任务、夺冠可获钻石，也可通过充值获得': 'Earn diamonds via tasks & titles, or by recharging',
    // 球队面板
    '🔵 玩家一': '🔵 Player 1', '🔴 玩家二': '🔴 Player 2',
    '💰 {p}': '💰 {p}', '+0/秒': '+0/s',
    '🎯 夺冠目标': '🎯 Title Goal', '🏆 总冠军': '🏆 Titles',
    '王朝加成 +0%': 'Dynasty Bonus +0%', '赛季进度': 'Season Progress',
    '第 {n} 赛季 · ': 'Season {n} · ',
    '常规赛 0/{g} · 0胜0负': 'Regular {g} games · 0W 0L',
    '🏀 投篮训练 +': '🏀 Shooting Drill +',
    '🏟️ 赛季中心': '🏟️ Season Center', '🏟️ 联赛中心': '🏟️ League Center',
    '战绩 0胜 0负': 'Record 0W 0L',
    '⚔️ 发起一场比赛': '⚔️ Play a Match',
    '打满常规赛冲击季后赛，胜率取决于双方战力': 'Finish the regular season to reach the playoffs — win rate depends on team power.',
    '击败对手可赢得奖金，胜率取决于双方战力': 'Beat opponents to earn bonuses — win rate depends on team power.',
    '📊 排名': '📊 Standings', '📈 数据榜': '📈 Leaders', '🏆 对阵图': '🏆 Bracket',
    '🏅 奖项': '🏅 Awards', '📋 赛后数据': '📋 Box Scores',
    '👥 球员阵容（真实球星）': '👥 Roster (Legendary Stars)',
    '🏟️ 设施升级': '🏟️ Facility Upgrades', '📋 球队任务': '📋 Team Tasks',
    '签约': 'Sign', '换强': 'Upgrade', '领取': 'Claim', '已领取': 'Claimed', '进行中': 'In Progress',
    '未签约 · 点击签下首位球星': 'Unsigned · tap to sign your first star',
    // 动态战绩/阶段
    '+{r}/秒': '+{r}/s',
    '战绩 {w}胜 {l}负': 'Record {w}W {l}L',
    '季后赛 · {r}': 'Playoffs · {r}',
    '{r} {w}-{l}（7局4胜）': '{r} {w}-{l} (Best of 7)',
    '附加赛 · 争夺季后赛席位': 'Play-In · fighting for a playoff spot',
    '选秀大会进行中': 'Draft in progress',
    '常规赛 {pg}/{g} · {w}胜{l}负': 'Regular {pg}/{g} · {w}W {l}L',
    '{p} · Lv.{lv} · 产出 {o}/秒': '{p} · Lv.{lv} · {o}/s',
    '{n} 次': '{n}', '王朝加成 +{n}%': 'Dynasty Bonus +{n}%',
    '已达成': 'Achieved', '约 {t}': '~{t}', '签约球员以产出': 'Sign players to produce',
    '{prog}/{target}　奖励 💎{dia}': '{prog}/{target}　Reward 💎{dia}',
    // 对手预览
    '🆚 {name}': '🆚 {name}', '对手战力 {p}': 'Opp Power {p}',
    '对手阵容：{lineup}': 'Opponent: {lineup}',
    '我方战力 {my} · 预计胜率 {wc}%': 'Your Power {my} · Win Chance {wc}%',
    '⚠️ 阵容不完整 · 请先签下 {pos}': '⚠️ Incomplete roster · sign {pos} first',
    '🔒 阵容未满 5 人': '🔒 Need 5 starters',
    '🎓 赛季已结束，选秀大会进行中': '🎓 Season over — Draft in progress',
    '🎓 进入选秀大会': '🎓 Enter the Draft',
    '{r} · 系列赛 {w}-{l}（7局4胜）': '{r} · Series {w}-{l} (Best of 7)',
    '🎫 {stage} · 单场定胜负': '🎫 {stage} · single elimination',
    '附加赛 7/8 名之争': 'Play-In 7/8 seed', '附加赛 9/10 名之争': 'Play-In 9/10 seed',
    '保级附加赛（末席之争）': 'Play-In elimination (final seed)',
    '⚔️ {r} · 下一场': '⚔️ {r} · Next Game', '🎫 附加赛 · 出战': '🎫 Play-In · Play',
    '⚔️ 进行常规赛': '⚔️ Play Regular Season',
    '⏳ 冷却中 {s}s': '⏳ Cooldown {s}s',
    // 比赛结果
    '🎉 击败 {name} {a}:{b}': '🎉 Beat {name} {a}:{b}',
    '😖 不敌 {name} {a}:{b}': '😖 Lost to {name} {a}:{b}',
    '，奖金 +{r}': ', bonus +{r}', '，奖金 +{r}（活动加成）': ', bonus +{r} (event boost)',
    '，仍获参赛费 +{r}': ', appearance fee +{r}', '，参赛费 +{r}': ', appearance fee +{r}',
    // 赛季推进文案
    '🎟️ {conf}第 {rank} 名，直接晋级季后赛！': '🎟️ {conf} #{rank} — direct to the playoffs!',
    '🎫 {conf}第 {rank} 名，进入附加赛争夺季后赛席位！': '🎫 {conf} #{rank} — into the Play-In for a playoff spot!',
    '{conf}第 {rank} 位，无缘季后赛': '{conf} #{rank} — missed the playoffs',
    '🎟️ 附加赛取胜，锁定第 7 种子，晋级季后赛！': '🎟️ Play-In win — locked the #7 seed, into the playoffs!',
    '首场附加赛失利，进入保级附加赛——再胜一场即可拿到最后席位！': 'Lost the first Play-In game — win the next to grab the last seed!',
    '附加赛失利，无缘季后赛': 'Lost the Play-In — missed the playoffs',
    '附加赛首胜！进入保级附加赛抢最后席位！': 'First Play-In win! Fight for the last seed!',
    '🎟️ 保级附加赛取胜，以第 8 种子晋级季后赛！': '🎟️ Play-In win — into the playoffs as the #8 seed!',
    '保级附加赛失利，无缘季后赛': 'Lost the elimination game — missed the playoffs',
    '🏆 赢下总决赛，夺得总冠军！': '🏆 Won the Finals — you are the champions!',
    '系列赛 {n} 胜，晋级{next}！': 'Series won {n} — advancing to {next}!',
    '系列赛失利，止步{r}。本季冠军：{champ}': 'Series lost — out at {r}. Champion: {champ}',
    '🎟️ 直接晋级季后赛！': '🎟️ Direct to the playoffs!', '🎫 进入附加赛！': '🎫 Into the Play-In!',
    '晋级季后赛！': 'Into the playoffs!', '晋级{next}！': 'Advancing to {next}!',
    '🏆 夺得第 {n} 座总冠军！': '🏆 Won championship #{n}!',
    // 排名页
    '（季后赛进行中）': '(Playoffs in progress)', '（附加赛进行中）': '(Play-In in progress)',
    '（赛季已结束）': '(Season over)', '（常规赛 {pg}/{g}）': '(Regular {pg}/{g})',
    '{conf}排名 {phase}　{a} 直接晋级季后赛，{b} 进入附加赛': '{conf} standings {phase}　{a} direct to playoffs, {b} into Play-In',
    '名次': 'Rank', '球队': 'Team', '胜率': 'Win%', '战力': 'Power',
    '1-6': '1-6', '7-10': '7-10',
    // 数据榜
    '📊 球队排名': '📊 Standings', '📈 数据榜': '📈 Leaders', '🏆 季后赛对阵图': '🏆 Playoff Bracket',
    '🏅 奖项': '🏅 Awards', '📜 王朝史': '📜 Dynasty History',
    '🏀 联盟数据中心': '🏀 League Data Center', '第 {n} 赛季 · {team}': 'Season {n} · {team}',
    '个人榜': 'Players', '球队榜': 'Teams', '基础数据': 'Basic', '高阶数据': 'Advanced',
    '{name}王': '{name} Leaders',
    '得分': 'Points', '篮板': 'Rebounds', '助攻': 'Assists', '抢断': 'Steals', '盖帽': 'Blocks',
    '效率值(PER)': 'PER', '真实命中率(TS%)': 'TS%', '使用率(USG%)': 'USG%', '综合效率(EFF)': 'EFF',
    '球队进攻榜（场均得分总和）': 'Team Offense (sum of PPG)', '战绩': 'Record', '场均得分': 'PPG',
    // 对阵图
    '季后赛对阵图将在常规赛（及附加赛）结束后、按东西部战绩种子排定生成。':
      'The playoff bracket is generated by conference seeds after the regular season (and Play-In).',
    '首轮': 'First Round', '分区半决赛': 'Conf. Semifinals', '分区决赛': 'Conf. Finals', '待定': 'TBD',
    '东西部各 8 队 · 7局4胜 · {me} 标注你的球队': '8 teams per conference · Best of 7 · {me} marks your team',
    '🟦 东部': '🟦 East', '🟥 西部': '🟥 West', '🏆 总决赛': '🏆 Finals',
    '🏆 总冠军：{name}': '🏆 Champion: {name}', '（你的球队！）': ' (Your team!)',
    // 奖项
    '常规赛 MVP': 'Regular Season MVP', '最佳防守球员': 'Defensive Player', '最佳新秀': 'Rookie of the Year',
    '最快进步球员': 'Most Improved', '最佳第六人': 'Sixth Man',
    '最有价值球员': 'MVP', 'DPOY': 'DPOY', 'ROY': 'ROY', 'MIP': 'MIP', '6MOY': '6MOY',
    '个人奖项将在常规赛结束时颁发，总决赛 FMVP 在夺冠后颁发。':
      'Individual awards are given at the end of the regular season; Finals MVP after the title.',
    '第 {n} 赛季个人奖项': 'Season {n} Individual Awards', '总决赛 FMVP': 'Finals MVP',
    '{pts} 分 · {reb} 板 · {ast} 助 · {stl} 断 · {blk} 帽': '{pts} PTS · {reb} REB · {ast} AST · {stl} STL · {blk} BLK',
    '{pts} 分 · {reb} 板 · {ast} 助': '{pts} PTS · {reb} REB · {ast} AST',
    '🏅 常规赛颁奖典礼': '🏅 Regular Season Awards', '第 {n} 赛季': 'Season {n}',
    '{pts}分 {reb}板 {ast}助': '{pts} PTS {reb} REB {ast} AST',
    '{pts}分 {reb}板 {ast}助 {stl}断 {blk}帽': '{pts} PTS {reb} REB {ast} AST {stl} STL {blk} BLK',
    '进入选秀大会': 'Enter the Draft', '🎫 出战附加赛': '🎫 Play the Play-In', '进军季后赛': 'To the Playoffs',
    '总冠军！': 'CHAMPIONS!',
    '{team} 夺得第 {n} 座总冠军': '{team} wins title #{n}',
    '王朝加成 +5%　💎 +{dia}': 'Dynasty Bonus +5%　💎 +{dia}',
    // 历史
    '完成赛季后，这里会记录历届总冠军、FMVP 与各项常规赛奖项。':
      'After each season, champions, Finals MVPs and awards are recorded here.',
    '赛季': 'Season', '总冠军': 'Champion',
    // 商店
    '球队商店': 'Team Store', '🛒 钻石充值': '🛒 Recharge', '💎 钻石商店': '💎 Diamond Shop',
    '* 本游戏为原型演示，支付流程均为模拟，不会产生任何真实扣费。':
      '* Prototype demo — all payments are simulated and never charged.',
    '当前余额 💎 ': 'Balance 💎 ', '（作用于 {team}）': ' (applies to {team})',
    '新秀礼包': 'Rookie Pack', '全明星礼包': 'All-Star Pack', '名人堂礼包': 'Hall of Fame Pack', '王朝至尊': 'Dynasty Supreme',
    '赠 30 钻': '+30 bonus', '赠 300 钻': '+300 bonus', '赠 2000 钻': '+2000 bonus',
    '资金补给': 'Funds Supply', '巨额资金': 'Mega Funds', '双倍产出卡': 'Double Output Card',
    '永久产出+20%': 'Permanent +20%', '比赛冷却清除': 'Clear Cooldown',
    '立即获得约 60 秒产出的资金': 'Instantly gain ~60s of funds',
    '立即获得约 10 分钟产出的资金': 'Instantly gain ~10min of funds',
    '90 秒内全队产出 ×2': 'Team output ×2 for 90s',
    '立即永久提升 20% 全局产出': 'Permanently +20% global output',
    '立即清除比赛冷却，可再战': 'Clear match cooldown and play again',
    // 支付
    '选择支付方式': 'Choose Payment', '应付金额 ': 'Amount due ', '取消支付': 'Cancel Payment',
    '正在跳转 {m} 安全支付…': 'Redirecting to {m} secure payment…',
    '订单金额 ¥{price} · 处理中，请稍候': 'Order ¥{price} · processing, please wait',
    '支付成功': 'Payment Successful', '通过 {m} 支付 ¥{price}': 'Paid ¥{price} via {m}',
    '收下钻石': 'Collect Diamonds',
    // 设置
    '⚙️ 游戏设置': '⚙️ Settings', '🔊 音频': '🔊 Audio', '🖥️ 画质': '🖥️ Graphics',
    '🎨 背景': '🎨 Background', '📳 其他': '📳 Other', '🌐 语言': '🌐 Language',
    '背景音乐': 'Background Music', '主界面与游戏中循环播放': 'Loops in menu and gameplay',
    '音乐音量': 'Music Volume', '音效': 'Sound Effects',
    '点击 · 投篮 · 签约 · 消耗 · 胜负': 'Tap · shoot · sign · spend · win/lose',
    '音效音量': 'SFX Volume', '画质等级': 'Quality Level',
    '低画质关闭动画/阴影，提升弱机型流畅度': 'Low quality disables animations/shadows for smoother play',
    '高': 'High', '中': 'Med', '低': 'Low',
    '游戏背景': 'Game Background', '选择喜欢的主题背景，自动保存': 'Pick a theme — saved automatically',
    '主场蓝红': 'Arena Blue-Red', '午夜深空': 'Midnight', '木纹球场': 'Hardwood',
    '烈焰红': 'Flame Red', '紫金王朝': 'Purple Gold', '简约深灰': 'Minimal Gray',
    '震动反馈': 'Haptic Feedback', '在支持的设备上点击时震动': 'Vibrate on tap on supported devices',
    '设置自动保存，下次启动依然生效': 'Settings save automatically and persist next launch',
    '游戏语言': 'Game Language', '切换界面语言（中文 / English）': 'Switch interface language (中文 / English)',
    // 选秀
    '状元热门': 'Top Pick', '乐透秀': 'Lottery Pick', '潜力新人': 'Prospect',
    // 活动中心
    '🎈 活动中心': '🎈 Events Center', '充值活动': 'Recharge', '活跃活动': 'Engagement', '节日活动': 'Festival',
    '前往充值': 'Go Recharge', '今日已领': 'Claimed Today',
    '领取 {r}': 'Claim {r}', ' 💰资金礼包': ' 💰Funds Pack',
    '⭐ 全服限时活动进行中：{name} · {desc}': '⭐ Live event: {name} · {desc}',
    '首充双倍': 'First-Recharge Double', '每日特惠礼包': 'Daily Special Pack',
    '每日签到': 'Daily Check-In', '在线奖励': 'Online Bonus', '连胜挑战': 'Win Streak',
    '端午·龙舟竞渡': 'Dragon Boat Festival',
    '限时': 'Limited', '每日': 'Daily', '活跃': 'Active', '节日限定': 'Festival',
    '首次充值任意礼包，到账钻石翻倍，超值入手。': 'Double diamonds on your first recharge of any pack.',
    '每日一次超值钻石礼包，6 元立得 180 钻。': 'A daily value pack: ¥6 for 180 diamonds.',
    '每天登录签到，领取钻石奖励。': 'Check in daily for diamond rewards.',
    '每日可领一次资金补给与少量钻石。': 'Claim a daily funds supply and a few diamonds.',
    '每日首次取得比赛胜利后领取丰厚资金。': 'Claim big funds after your first win of the day.',
    '端午佳节登录领「粽」享好礼：钻石 + 资金大礼包，仅可领取一次。': 'Festival gift: diamonds + a big funds pack, once only.',
    // 离线
    '离线收益': 'Offline Earnings', '球队在你离开的 {t} 里继续运转': 'Your team kept running for {t} while away',
    '领取收益': 'Collect',
    // 球队经营/活动横幅/日志
    '限时活动 · {name}': 'Live Event · {name}', '{desc}　全服进行中': '{desc}　live now',
    '活动中心': 'Events Center', '下一场限时活动即将开启，敬请期待丰厚加成': 'Next live event coming soon — great boosts await',
    '⌛ 活动「{name}」已结束': '⌛ Event "{name}" has ended',
    '{icon} 限时活动开启：{name}（{desc}）': '{icon} Live event started: {name} ({desc})',
    '{icon} 活动开启：{name}': '{icon} Event started: {name}',
    '✍️ {pos}签下了 {name} (#{no})！': '✍️ {pos} signed {name} (#{no})!',
    '💪 {pos}训练强化 Lv.{lv}': '💪 {pos} trained to Lv.{lv}',
    '🏟️ {name} 升级至 Lv.{lv}': '🏟️ {name} upgraded to Lv.{lv}',
    '📋 完成任务「{name}」+{g} 💎{dia}': '📋 Task "{name}" done +{g} 💎{dia}',
    '任务完成！+{g} 资金 +{dia} 钻石': 'Task done! +{g} funds +{dia} diamonds',
    '🏆 达成夺冠目标！': '🏆 Title goal reached!',
    '{team} 夺冠！': '{team} wins!',
    '{who} 率先达成夺冠目标！<br>对手 {opp} 仅积累 {p} {n}。': '{who} reached the title goal first!<br>Opponent {opp} only accumulated {p} {n}.',
    '🎈 活动「{name}」奖励到账 +{g}': '🎈 Event "{name}" reward +{g}',
    '资金+{g} ': 'Funds +{g} ',
    // 限时活动名称/描述
    '全明星周末': 'All-Star Weekend', '季后赛奖金': 'Playoff Bonus', '球迷狂欢节': 'Fan Fest',
    '选秀大会': 'Draft Day', '总决赛热潮': 'Finals Fever',
    '投篮收益 ×3': 'Shooting income ×3', '比赛奖励 ×3': 'Match reward ×3',
    '投篮收益 ×4': 'Shooting income ×4', '签约成本 -40%': 'Signing cost -40%',
    '投篮&比赛收益 ×2.5': 'Shooting & match income ×2.5',
    // 任务名称
    '投篮训练 50 次': 'Shoot 50 times', '签约/升级球员 10 次': 'Sign/upgrade players 10 times',
    '进行 8 场联赛': 'Play 8 league games', '赢得 5 场比赛': 'Win 5 games',
    // 一键扫荡（新功能）
    '⚡ 一键扫荡': '⚡ Auto Sweep', '⚡ 付费扫荡': '⚡ Auto Sweep',
    '一键扫荡': 'Auto Sweep',
    '消耗钻石快速模拟多场常规赛，省去逐场点击。': 'Spend diamonds to instantly simulate multiple regular-season games.',
    '选择扫荡场次': 'Choose Games to Sweep',
    '每场消耗 💎{c}': '💎{c} per game',
    '剩余常规赛 {n} 场': '{n} regular-season games left',
    '{n} 场': '{n} games', '全部剩余（{n} 场）': 'All remaining ({n})',
    '共需 💎{total}（{n} 场）': 'Total 💎{total} ({n} games)',
    '钻石不足，需 💎{need}，当前 💎{have}': 'Not enough diamonds: need 💎{need}, have 💎{have}',
    '扫荡仅在常规赛阶段可用': 'Auto Sweep is only available during the regular season',
    '阵容不完整，无法扫荡': 'Roster incomplete — cannot sweep',
    '扫荡完成：{n} 场 · {w}胜{l}负 · 奖金+{r} · 💎-{d}': 'Sweep done: {n} games · {w}W {l}L · bonus +{r} · 💎-{d}',
    '⚡ 扫荡 {n} 场（💎{c}/场）': '⚡ Sweep {n} games (💎{c}/each)',
    '开始扫荡': 'Start Sweep',
    // 赛后数据（新功能）
    '📋 赛后数据中心': '📋 Box Score Center', '近期比赛': 'Recent Games',
    '暂无比赛记录，先打一场比赛吧。': 'No games yet — play a match first.',
    '点击查看每场比赛的详细数据': 'Tap a game to see its full box score',
    '{a}:{b}': '{a}:{b}', '胜': 'W', '负': 'L',
    '第{s}赛季 · {phase}': 'Season {s} · {phase}',
    '球员': 'Player', '我方：{team}': 'Yours: {team}', '对手：{team}': 'Opp: {team}',
    '得分 {pts} · 篮板 {reb} · 助攻 {ast}': '{pts} PTS · {reb} REB · {ast} AST',
    '比赛详情': 'Game Detail',
    // 规则 / 杂项
    '阵容不完整：请先在 {pos} 位置签下球员': 'Roster incomplete: sign players at {pos} first',
    '比赛冷却中': 'Match cooling down', '资金不足': 'Not enough funds',
    '钻石不足，请先充值': 'Not enough diamonds, please recharge',
    '该活动暂不可领取': 'This reward is not available now',
    '领取成功！{m}': 'Claimed! {m}', '任务尚未完成': 'Task not complete yet',
    '双倍产出卡已生效': 'Double Output Card active', '永久产出已提升': 'Permanent output increased',
    '比赛冷却已清除': 'Match cooldown cleared', '获得资金 +{g}': 'Funds +{g}',
    '已保存存档（离线后将累计收益）': 'Saved (offline earnings accumulate)',
    '双人对战不支持存档': 'Versus mode does not support saving', '账户异常': 'Account error',
    '充值成功！💎 +{n}': 'Recharge success! 💎 +{n}',
    '赛季结束，进入选秀大会': 'Season over — entering the Draft',
    // 静态界面（登录/模式/存档/难度/顶栏/胜利/PWA）
    '王朝传奇': 'Dynasty Legend', '打造你的 NBA 篮球帝国': 'Build your NBA basketball empire',
    '登 录': 'Log In', '注 册': 'Sign Up',
    '经理名 / 用户名': 'Manager / Username', '输入用户名...': 'Enter username...',
    '密码': 'Password', '输入密码...': 'Enter password...',
    '确认密码': 'Confirm Password', '再次输入密码...': 'Re-enter password...',
    '或使用第三方账号登录': 'Or sign in with a third-party account',
    '💬 微信登录': '💬 WeChat', '🐧 QQ 登录': '🐧 QQ',
    '微信登录': 'WeChat Login', 'QQ 登录': 'QQ Login',
    '选择模式': 'Choose Mode', '单人养成 · 双人对战': 'Solo career · Versus mode',
    '单人模式': 'Solo Mode', '双人对战': 'Versus',
    '独自经营球队，自由放置养成<br>可存档，随时继续你的王朝之路':
      'Run your team solo with free idle growth<br>Save anytime and continue your dynasty',
    '同屏分左右两队，同步经营<br>率先达成夺冠目标者获胜':
      'Two teams side by side, run simultaneously<br>First to reach the title goal wins',
    '支持存档': 'Saves Supported', '竞速对决': 'Race to Win',
    '← 退出登录': '← Log Out', '← 返回模式选择': '← Back to Mode Select', '← 返回': '← Back',
    '开始游戏': 'Start Game', '新的赛季，新的传奇': 'A new season, a new legend',
    '新档': 'New Game', '创建新球队<br>选择难度开启新征程':
      'Create a new team<br>Pick a difficulty to begin',
    '旧档': 'Load Game', '继续之前的存档': 'Continue a previous save',
    '游戏规则': 'How to Play', '了解玩法与操作': 'Learn the gameplay and controls',
    '📂 选择存档': '📂 Choose a Save',
    '选择难度': 'Choose Difficulty', '难度影响起步资金、成本与夺冠目标':
      'Difficulty affects starting funds, costs and the title goal',
    '🏀 王朝传奇': '🏀 Dynasty Legend',
    '总冠军！': 'CHAMPIONS!', '返回菜单': 'Back to Menu',
    '📲 安装到主屏幕': '📲 Add to Home Screen',
    '点击底部 <b>分享 ⬆️</b> → 选择「<b>添加到主屏幕</b>」即可安装':
      'Tap <b>Share ⬆️</b> at the bottom → choose <b>Add to Home Screen</b>',
    '知道了': 'Got it', '进入全屏': 'Enter Fullscreen', '退出全屏': 'Exit Fullscreen', '全屏': 'Fullscreen',
    // 认证/账户相关动态消息
    '请填写用户名和密码': 'Please enter username and password',
    '用户名至少 2 个字符': 'Username must be at least 2 characters',
    '两次输入的密码不一致': 'Passwords do not match',
    '该用户名已被注册': 'This username is already registered',
    '注册成功！赠送 30 钻石，正在进入...': 'Registered! +30 diamonds. Entering...',
    '用户名或密码错误': 'Wrong username or password',
    '登录成功，正在进入...': 'Login success. Entering...',
    '用户不存在，请先注册': 'User not found — please register first',
    '密码错误': 'Wrong password', '登录成功！': 'Login success!',
    '退出登录': 'Log Out',
  };

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
  // 阵容是否已凑齐 5 个位置（每个位置至少 1 名球员）
  function lineupComplete(team) {
    return team.players.every(p => p.level >= 1);
  }
  function emptyPositions(team) {
    return POSITIONS.filter((_, i) => team.players[i].level < 1).map(p => p.name);
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

  // ---------- 配置：活动中心（充值 / 活跃 / 节日）----------
  const ACTIVITIES = {
    recharge: [
      { id:'first2x',  icon:'💎', name:'首充双倍', tag:'限时', desc:'首次充值任意礼包，到账钻石翻倍，超值入手。', action:'recharge' },
      { id:'daily_deal',icon:'🎁', name:'每日特惠礼包', tag:'每日', desc:'每日一次超值钻石礼包，6 元立得 180 钻。', action:'recharge' },
    ],
    active: [
      { id:'daily_sign', icon:'📅', name:'每日签到', tag:'每日', desc:'每天登录签到，领取钻石奖励。', dia:10, type:'daily' },
      { id:'online_bonus',icon:'⏰', name:'在线奖励', tag:'每日', desc:'每日可领一次资金补给与少量钻石。', fundSec:120, dia:5, type:'daily' },
      { id:'win_streak', icon:'🔥', name:'连胜挑战', tag:'活跃', desc:'每日首次取得比赛胜利后领取丰厚资金。', fundSec:200, dia:8, type:'daily' },
    ],
    festival: [
      { id:'dragonboat', icon:'🐲', name:'端午·龙舟竞渡', tag:'节日限定', desc:'端午佳节登录领「粽」享好礼：钻石 + 资金大礼包，仅可领取一次。', dia:50, fundSec:300, type:'once' },
    ],
  };
  const ACT_CAT_META = {
    recharge: { name:'充值活动', icon:'💳' },
    active:   { name:'活跃活动', icon:'🎯' },
    festival: { name:'节日活动', icon:'🎊' },
  };

  // ---------- 配置：限时活动（全局轮换）----------
  const EVENTS = [
    { key:'allstar', icon:'⭐', name:'全明星周末', desc:'投篮收益 ×3',     dur:30, click:3 },
    { key:'playoff', icon:'🔥', name:'季后赛奖金', desc:'比赛奖励 ×3',     dur:30, match:3 },
    { key:'fanfest', icon:'🎉', name:'球迷狂欢节', desc:'投篮收益 ×4',     dur:25, click:4 },
    { key:'draft',   icon:'🎓', name:'选秀大会',   desc:'签约成本 -40%',   dur:25, cost:0.6 },
    { key:'finals',  icon:'🏆', name:'总决赛热潮', desc:'投篮&比赛收益 ×2.5', dur:20, click:2.5, match:2.5 },
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
  const SWEEP_COST_PER = 8;        // 付费一键扫荡：每场消耗钻石数
  const OFFLINE_RATE = 0.5;
  const OFFLINE_CAP_H = 8;

  // ---------- 赛制：常规赛 → 附加赛 → 季后赛 → 总冠军 ----------
  const REGULAR_GAMES = 82;        // 每赛季常规赛场次（真实 NBA 赛制）
  const SERIES_WIN    = 4;         // 季后赛每轮系列赛胜场（7局4胜）
  const PLAYIN_LOW = 7, PLAYIN_HIGH = 10;  // 附加赛名次区间（每区第7~10名）
  const DIRECT_SEEDS = 6;          // 每区前6名直接锁定季后赛席位
  const CONF_PLAYOFF = 8;          // 每区季后赛球队数
  // 季后赛轮次：1首轮 → 2分区半决赛 → 3分区决赛 → 4总决赛
  const PLAYOFF_ROUND_NAMES = { 1: '季后赛首轮', 2: '分区半决赛', 3: '分区决赛', 4: '总决赛' };

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
  const LEAGUE_SIZE = 30;         // 联盟球队总数（含玩家），东西部各15队
  const AI_TEAM_NAMES = ['湖人','凯尔特人','勇士','公牛','马刺','热火','雄鹿','掘金','76人','快船','太阳','篮网','尼克斯','独行侠','森林狼','鹈鹕'];
  // ---------- 2025-26 赛季真实首发名单（PG/SG/SF/PF/C 五人，含真实交易：东契奇加盟湖人、文班亚马马刺、福克斯马刺、KD离队、弗拉格状元等）----------
  const REAL_ROSTERS = {
    '湖人':   [{n:'卢卡·东契奇',r:95},{n:'奥斯汀·里夫斯',r:84},{n:'勒布朗·詹姆斯',r:93},{n:'八村垒',r:81},{n:'德安德烈·艾顿',r:83}],
    '凯尔特人':[{n:'德里克·怀特',r:85},{n:'安芬尼·西蒙斯',r:82},{n:'杰伦·布朗',r:90},{n:'杰森·塔图姆',r:93},{n:'尼姆哈斯·克塔',r:77}],
    '勇士':   [{n:'斯蒂芬·库里',r:94},{n:'布兰丁·波杰姆斯基',r:80},{n:'吉米·巴特勒',r:88},{n:'德雷蒙德·格林',r:83},{n:'阿尔·霍福德',r:80}],
    '公牛':   [{n:'约什·吉迪',r:82},{n:'科比·怀特',r:83},{n:'阿尤·多苏姆',r:79},{n:'马塔斯·布泽利斯',r:80},{n:'尼古拉·武切维奇',r:83}],
    '马刺':   [{n:'德阿龙·福克斯',r:89},{n:'斯蒂芬·卡斯尔',r:82},{n:'德文·瓦塞尔',r:82},{n:'哈里森·巴恩斯',r:79},{n:'维克托·文班亚马',r:94}],
    '热火':   [{n:'戴维昂·米切尔',r:79},{n:'泰勒·希罗',r:87},{n:'诺曼·鲍威尔',r:83},{n:'安德鲁·威金斯',r:83},{n:'巴姆·阿德巴约',r:88}],
    '雄鹿':   [{n:'凯文·波特',r:79},{n:'加里·特伦特',r:79},{n:'凯尔·库兹马',r:82},{n:'扬尼斯·阿德托昆博',r:96},{n:'迈尔斯·特纳',r:84}],
    '掘金':   [{n:'贾马尔·穆雷',r:87},{n:'克里斯蒂安·布劳恩',r:82},{n:'卡梅伦·约翰逊',r:82},{n:'阿隆·戈登',r:84},{n:'尼古拉·约基奇',r:98}],
    '76人':   [{n:'泰瑞斯·马克西',r:89},{n:'贾里德·麦凯恩',r:81},{n:'保罗·乔治',r:86},{n:'VJ·埃奇科姆',r:78},{n:'乔尔·恩比德',r:92}],
    '快船':   [{n:'詹姆斯·哈登',r:88},{n:'布拉德利·比尔',r:84},{n:'科怀·伦纳德',r:90},{n:'约翰·科林斯',r:81},{n:'伊维察·祖巴茨',r:84}],
    '太阳':   [{n:'杰伦·格林',r:84},{n:'德文·布克',r:92},{n:'迪龙·布鲁克斯',r:80},{n:'罗伊斯·奥尼尔',r:78},{n:'马克·威廉姆斯',r:81}],
    '篮网':   [{n:'埃格尔·德明',r:75},{n:'卡姆·托马斯',r:82},{n:'迈克尔·波特',r:84},{n:'诺亚·克拉里',r:76},{n:'尼克·克拉克斯顿',r:81}],
    '尼克斯': [{n:'杰伦·布伦森',r:91},{n:'米卡尔·布里奇斯',r:84},{n:'OG·阿努诺比',r:84},{n:'卡尔-安东尼·唐斯',r:89},{n:'米切尔·罗宾逊',r:79}],
    '独行侠': [{n:'德安吉洛·拉塞尔',r:81},{n:'克莱·汤普森',r:82},{n:'库珀·弗拉格',r:83},{n:'安东尼·戴维斯',r:92},{n:'德雷克·莱夫利',r:81}],
    '森林狼': [{n:'迈克·康利',r:79},{n:'安东尼·爱德华兹',r:93},{n:'杰登·麦克丹尼尔斯',r:83},{n:'朱利叶斯·兰德尔',r:86},{n:'鲁迪·戈贝尔',r:85}],
    '鹈鹕':   [{n:'德章泰·穆雷',r:84},{n:'乔丹·普尔',r:83},{n:'特雷·墨菲',r:83},{n:'锡安·威廉姆斯',r:88},{n:'伊夫·米西',r:78}],
    '猛龙':   [{n:'伊曼纽尔·奎克利',r:83},{n:'格拉迪·迪克',r:78},{n:'RJ·巴雷特',r:83},{n:'斯科蒂·巴恩斯',r:86},{n:'雅各布·珀尔特尔',r:80}],
    '骑士':   [{n:'达柳斯·加兰',r:86},{n:'唐纳万·米切尔',r:91},{n:'马克斯·斯特鲁斯',r:78},{n:'埃文·莫布利',r:88},{n:'贾勒特·阿伦',r:84}],
    '活塞':   [{n:'凯德·坎宁安',r:89},{n:'贾登·艾维',r:80},{n:'奥萨·汤普森',r:79},{n:'汤比·哈里斯',r:80},{n:'杰伦·杜伦',r:83}],
    '步行者': [{n:'泰瑞斯·哈利伯顿',r:89},{n:'安德鲁·内姆哈德',r:79},{n:'本·谢泼德',r:76},{n:'帕斯卡尔·西亚卡姆',r:87},{n:'艾萨亚·杰克逊',r:78}],
    '老鹰':   [{n:'特雷·杨',r:88},{n:'戴森·丹尼尔斯',r:81},{n:'扎卡里·里萨谢',r:79},{n:'杰伦·约翰逊',r:85},{n:'克里斯塔普斯·波尔津吉斯',r:84}],
    '黄蜂':   [{n:'拉梅洛·鲍尔',r:86},{n:'布兰登·米勒',r:84},{n:'乔什·格林',r:77},{n:'迈尔斯·布里奇斯',r:82},{n:'瑞恩·孔德',r:76}],
    '魔术':   [{n:'雅伦·萨格斯',r:84},{n:'德斯蒙德·班恩',r:85},{n:'弗朗茨·瓦格纳',r:87},{n:'保罗·班切罗',r:88},{n:'文德尔·卡特',r:80}],
    '奇才':   [{n:'巴布·卡灵顿',r:75},{n:'CJ·麦科勒姆',r:81},{n:'比拉尔·库利巴利',r:79},{n:'凯肖恩·乔治',r:75},{n:'阿历克斯·萨尔',r:79}],
    '雷霆':   [{n:'谢伊·吉尔杰斯-亚历山大',r:97},{n:'卢盖兹·多特',r:80},{n:'杰伦·威廉姆斯',r:87},{n:'切特·霍姆格伦',r:88},{n:'伊萨亚·哈滕施泰因',r:81}],
    '开拓者': [{n:'斯库特·亨德森',r:80},{n:'谢登·夏普',r:81},{n:'杰拉米·格兰特',r:81},{n:'图马尼·卡马拉',r:78},{n:'唐纳万·克林根',r:80}],
    '爵士':   [{n:'艾萨亚·科利尔',r:76},{n:'科迪·威廉姆斯',r:75},{n:'艾斯·贝利',r:80},{n:'拉里·马尔卡宁',r:85},{n:'沃克·凯斯勒',r:82}],
    '国王':   [{n:'丹尼斯·施罗德',r:80},{n:'扎克·拉文',r:85},{n:'德马尔·德罗赞',r:84},{n:'基根·穆雷',r:83},{n:'多曼塔斯·萨博尼斯',r:87}],
    '火箭':   [{n:'阿门·汤普森',r:84},{n:'里德·谢泼德',r:79},{n:'凯文·杜兰特',r:91},{n:'杰巴里·史密斯',r:82},{n:'阿尔佩伦·申京',r:87}],
    '灰熊':   [{n:'贾·莫兰特',r:89},{n:'凯·杰克逊',r:76},{n:'杰伦·威尔斯',r:79},{n:'杰伦·杰克逊',r:87},{n:'赞克·埃迪',r:79}],
  };
  // ---------- 东西部分区（各15队，含联盟全部30支球队）----------
  const EAST_TEAMS = ['凯尔特人','尼克斯','76人','篮网','猛龙','公牛','骑士','活塞','步行者','雄鹿','老鹰','黄蜂','热火','魔术','奇才'];
  const WEST_TEAMS = ['掘金','森林狼','雷霆','开拓者','爵士','勇士','快船','湖人','太阳','国王','独行侠','火箭','灰熊','鹈鹕','马刺'];
  function confOf(name) {
    const base = String(name).replace(/队$/, '');
    if (EAST_TEAMS.includes(base)) return 'E';
    if (WEST_TEAMS.includes(base)) return 'W';
    return null;
  }
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
  let standingsConf = 'E';    // 排名查看分区：E | W
  let reportTeamIdx = 0, reportSel = -1;  // 赛后数据中心：当前球队 / 选中的比赛
  let sweepTeamIdx = 0;       // 一键扫荡：当前球队

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
  // 活动领取记录（按账号持久化）
  function todayKey() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function getActClaims() { const a = getAccounts(), u = curUser(); return (a[u] && a[u].actClaims) || {}; }
  function setActClaim(id, val) {
    const a = getAccounts(), u = curUser();
    if (!a[u]) return;
    if (!a[u].actClaims) a[u].actClaims = {};
    a[u].actClaims[id] = val;
    saveAccounts(a);
  }
  // 活动是否可领取：daily 每天一次，once 永久一次
  function actClaimable(act) {
    const claims = getActClaims();
    if (act.type === 'once') return claims[act.id] !== 'done';
    if (act.type === 'daily') return claims[act.id] !== todayKey();
    return false; // recharge 类无领取动作
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
    document.getElementById('auth-submit').textContent = mode === 'register' ? tr('注 册') : tr('登 录');
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
    if (!user || !pass) return setMsg(tr('请填写用户名和密码'), 'err');
    if (user.length < 2) return setMsg(tr('用户名至少 2 个字符'), 'err');
    const accounts = getAccounts();
    if (authMode === 'register') {
      const confirm = document.getElementById('auth-confirm').value;
      if (pass !== confirm) return setMsg(tr('两次输入的密码不一致'), 'err');
      if (accounts[user]) return setMsg(tr('该用户名已被注册'), 'err');
      accounts[user] = { password: pass, saves: [], diamonds: 30, created: Date.now() };
      saveAccounts(accounts); setCurUser(user);
      setMsg(tr('注册成功！赠送 30 钻石，正在进入...'), 'ok');
      setTimeout(() => enterAfterAuth(), 600);
    } else {
      if (!accounts[user]) return setMsg(tr('用户不存在，请先注册'), 'err');
      if (accounts[user].password !== pass) return setMsg(tr('密码错误'), 'err');
      if (accounts[user].diamonds == null) { accounts[user].diamonds = 30; saveAccounts(accounts); }
      setCurUser(user); setMsg(tr('登录成功！'), 'ok');
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
      players: POSITIONS.map(p => ({ key: p.key, level: 1 })),
      facilities: FACILITIES.reduce((o, f) => (o[f.key] = 0, o), {}),
      totalEarned: diff.startFunds,
      matches: 0, wins: 0, lastMatchAt: 0,
      seasonPhase: 'regular', regGames: 0, regWins: 0,
      conf: 'E',
      playoffRound: 0, seriesWins: 0, seriesLosses: 0, nextOpp: null,
      playin: null,
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
  function eventOutputMul() { return (curEvent && curEvent.output) ? curEvent.output : 1; } // 已不再用于挂机自动产出，仅保留兼容
  function eventClickMul()  { return (curEvent && curEvent.click)  ? curEvent.click  : 1; }
  function eventMatchMul()  { return (curEvent && curEvent.match)  ? curEvent.match  : 1; }
  function fundsPerSec(team) {
    let total = 0;
    POSITIONS.forEach((pos, i) => { total += pos.base * team.players[i].level; });
    // 挂机自动产出只受：球员等级 / 设施 / 永久加成 / 双倍卡（均由玩家主动决定）
    // 限时活动不再影响自动产出，避免无操作时产出速度自行波动
    return total * ecoMul(team) * facilityOutputMul(team);
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
    const base = 210 + (team.matches || 0) * 14; // 双人/资金赛：基础值上调 50%，随场次递增
    return Math.round(base * (0.8 + Math.random() * 0.5));
  }
  function genOppLineup(pow) {
    const sorted = ALL_PLAYERS.slice().sort((a, b) => a.rating - b.rating);
    const t = Math.max(0, Math.min(1, (pow - 90) / 700));
    const posOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
    const out = [];
    for (let i = 0; i < 5; i++) {
      const center = Math.floor(t * (sorted.length - 1));
      const j = Math.max(0, Math.min(sorted.length - 1, center + (Math.floor(Math.random() * 7) - 3)));
      const p = sorted[j];
      out.push({ cn: p.cn, rating: p.rating, pos: posOrder[i] });
    }
    return out;
  }
  // 随赛程深入提升「玩家对手」战力强度（不影响联盟内部其它球队的相互模拟）
  // 常规赛越打到后段越强；附加赛、季后赛逐轮加码，给到更有压力的体验
  function scheduleStrengthMul(team) {
    if (!team) return 1;
    if (team.seasonPhase === 'playoff') {
      const r = Math.max(1, team.playoffRound || 1); // 1=首轮 … 4=总决赛
      return 1.18 + r * 0.06;                        // 1.24 → 1.42
    }
    if (team.seasonPhase === 'playin') return 1.20;
    // 常规赛：从 1.0 线性提升至约 1.18
    const prog = Math.min(1, (team.regGames || 0) / REGULAR_GAMES);
    return 1 + 0.18 * prog;
  }
  function genOpponent(team) {
    // 单人模式：从联盟真实球队中取对手（常规赛随机 / 附加赛、季后赛取指定对手）
    if (gameMode === 'single' && team.league) {
      let lt = null;
      if (team.seasonPhase === 'playoff') lt = playerSeriesOpponent(team);
      else if (team.seasonPhase === 'playin') lt = team.playin ? byId(team, team.playin.oppId) : null;
      else lt = pickAiTeam(team);
      if (lt) {
        // 完整 5 人首发，按 PG→C 位置顺序展示
        const order = { PG: 0, SG: 1, SF: 2, PF: 3, C: 4 };
        const lineup = lt.roster.slice()
          .sort((a, b) => (order[a.pos] ?? 9) - (order[b.pos] ?? 9))
          .slice(0, 5)
          .map(r => ({ cn: r.name, rating: r.rating, pos: r.pos }));
        const power = Math.round(lt.str * scheduleStrengthMul(team));
        return { name: lt.name, power: power, lineup: lineup, leagueId: lt.id };
      }
    }
    const power = Math.round(opponentPowerFor(team) * scheduleStrengthMul(team));
    return { name: pick(NBA_TEAMS) + '队', power: power, lineup: genOppLineup(power) };
  }

  // =========================================================
  // 联盟模拟系统（单人）：球队 / 球员 / 战绩 / 数据 / 对阵 / 奖项 / 选秀
  // =========================================================
  function aiStrengthBase(season) { return 225 + (season - 1) * 62; } // 基础值上调 50%（150 → 225）
  // 生成一支 AI 球队（优先采用 2025-26 真实首发名单，评级随赛季成长）
  function buildAiTeam(id, name, season) {
    const base = aiStrengthBase(season);
    const baseName = String(name).replace(/队$/, '');
    const conf = confOf(baseName);
    const real = REAL_ROSTERS[baseName];
    if (real) {
      const grow = (season - 1) * 1.2;  // 真实名单评级随赛季缓慢成长
      const roster = POSITIONS.map((pos, i) => {
        const src = real[i] || real[real.length - 1];
        const rating = Math.max(74, Math.min(99, Math.round(src.r + grow)));
        return { name: src.n, pos: pos.key, rating, isRookie: false,
          stats: genStatLine(rating, pos.key, name + src.n + season + i) };
      });
      // 战力：以赛季为锚，按真实名单整体强度（均分 86 为基准）微调，保留随机抖动
      const avg = roster.reduce((s, p) => s + p.rating, 0) / roster.length;
      const quality = avg / (86 + grow);
      const str = Math.round(base * quality * (0.9 + Math.random() * 0.2));
      return { id, name, isPlayer: false, conf, str, w: 0, l: 0, seed: 0, roster };
    }
    // 兜底：无真实名单时随机生成
    const str = Math.round(base * (0.74 + Math.random() * 0.72));
    const avgRating = Math.max(78, Math.min(99, Math.round(80 + (str - base * 0.74) / (base * 0.72) * 17)));
    const roster = POSITIONS.map((pos, i) => {
      const rating = Math.max(74, Math.min(99, avgRating + Math.floor(Math.random() * 9) - 4));
      const nm = genPlayerName();
      return { name: nm, pos: pos.key, rating, isRookie: false,
        stats: genStatLine(rating, pos.key, name + nm + season + i) };
    });
    return { id, name, isPlayer: false, conf, str, w: 0, l: 0, seed: 0, roster };
  }
  // 玩家球队在联盟中的镜像（战绩同步常规赛，阵容取真实首发+新秀）
  function playerLeagueTeam(team) {
    const lt = team.league.teams.find(t => t.isPlayer);
    if (!lt) return null;
    lt.name = team.teamName;
    lt.conf = team.conf;
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
  // 构建 30 队联盟：玩家固定东部，东部 14 支 AI + 西部 15 支 AI
  function buildLeague(team) {
    if (!team.conf) team.conf = 'E';
    const teamsArr = [{ id: 'me', name: team.teamName, isPlayer: true, conf: team.conf,
      str: teamPower(team), w: 0, l: 0, seed: 0, roster: playerRoster(team) }];
    // 玩家所在分区少放 1 支真实球队（给玩家腾位置），另一分区放满 15 支
    const eastPool = EAST_TEAMS.filter(n => n !== team.teamName);
    const westPool = WEST_TEAMS.filter(n => n !== team.teamName);
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const eastCount = team.conf === 'E' ? 14 : 15;
    const westCount = team.conf === 'W' ? 14 : 15;
    const eastNames = shuffle(eastPool.slice()).slice(0, eastCount);
    const westNames = shuffle(westPool.slice()).slice(0, westCount);
    let n = 0;
    eastNames.forEach(nm => teamsArr.push(buildAiTeam('ai' + (n++), nm + '队', team.season)));
    westNames.forEach(nm => teamsArr.push(buildAiTeam('ai' + (n++), nm + '队', team.season)));
    team.league = { season: team.season, teams: teamsArr, bracket: null };
    team.awards = null; team.fmvp = null;
  }
  function ensureLeague(team) {
    if (!team.league || team.league.season !== team.season || !team.league.teams
        || team.league.teams.length < LEAGUE_SIZE) buildLeague(team);
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
  // 分区排名：conf 传 'E'/'W' 返回该区排序；不传返回全联盟排序
  function standings(team, conf) {
    playerLeagueTeam(team);
    let arr = team.league.teams.slice();
    if (conf) arr = arr.filter(t => t.conf === conf);
    return arr.sort((a, b) => {
      const wpA = a.w / Math.max(1, a.w + a.l), wpB = b.w / Math.max(1, b.w + b.l);
      if (wpB !== wpA) return wpB - wpA;
      return b.w - a.w;
    });
  }
  // 玩家在本分区的名次（1 起）
  function playerConfRank(team) {
    const arr = standings(team, team.conf);
    return arr.findIndex(t => t.isPlayer) + 1;
  }
  // ---------- 附加赛 (Play-In) ----------
  function byId(team, id) { return team.league.teams.find(t => t.id === id); }
  // 单场对决（按战力概率），返回 {winner, loser}
  function simGame(a, b) {
    const pa = a.str / (a.str + b.str);
    return Math.random() < pa ? { winner: a, loser: b } : { winner: b, loser: a };
  }
  // 模拟某分区附加赛，返回该区第 7、8 种子 {s7, s8}
  function simPlayinConf(team, conf) {
    const seeds = standings(team, conf);
    const s7 = seeds[6], s8 = seeds[7], s9 = seeds[8], s10 = seeds[9];
    const gA = simGame(s7, s8);          // 7v8：胜者锁定第7种子
    const gB = simGame(s9, s10);         // 9v10：负者淘汰
    const gC = simGame(gA.loser, gB.winner); // 保级战：胜者第8种子
    return { s7: gA.winner, s8: gC.winner };
  }
  // 进入附加赛（仅玩家分区第 7-10 名时）。确定玩家首场对手
  function startPlayin(team) {
    const seeds = standings(team, team.conf);
    const myRank = seeds.findIndex(t => t.isPlayer) + 1; // 7..10
    team.seasonPhase = 'playin';
    const pi = { conf: team.conf, myRank, seed7Id: null, qualified: null };
    if (myRank === 7 || myRank === 8) {
      pi.stage = 'A';
      pi.oppId = seeds[(myRank === 7 ? 8 : 7) - 1].id;
    } else { // 9 或 10
      pi.stage = 'B';
      pi.oppId = seeds[(myRank === 9 ? 10 : 9) - 1].id;
      const gA = simGame(seeds[6], seeds[7]); // 本区 7v8 全由 AI 决出第7种子
      pi.seed7Id = gA.winner.id; pi.gameALoserId = gA.loser.id;
    }
    team.playin = pi;
    return pi;
  }
  // 玩家附加赛晋级，组建季后赛对阵图并进入季后赛
  function finishPlayinQualify(team, idx, mySeed) {
    const pi = team.playin;
    const seeds = standings(team, team.conf);
    let seed7Id, seed8Id;
    if (mySeed === 7) {
      seed7Id = 'me';
      // 第8种子：玩家7v8对手(负者) vs 9v10胜者 的保级战
      const gB = simGame(seeds[8], seeds[9]);
      const gC = simGame(byId(team, pi.oppId), gB.winner);
      seed8Id = gC.winner.id;
    } else {
      seed7Id = pi.seed7Id; seed8Id = 'me';
    }
    const override = {}; override[team.conf] = { seed7Id, seed8Id };
    buildBracket(team, override);
    team.seasonPhase = 'playoff'; team.playoffRound = 1; team.seriesWins = 0; team.seriesLosses = 0;
    team.playin = null;
  }
  // 玩家附加赛出局：模拟全联盟季后赛决出冠军，记录历史并进入休赛期
  function eliminateInPlayin(team, idx) {
    buildBracket(team, null);
    simulateRemainingBracket(team);
    recordHistory(team, false);
    team.playin = null;
    enterOffseason(team, idx);
  }
  // ---------- 季后赛对阵图（东西部各 8 队 → 分区决赛 → 总决赛）----------
  function pairOf(a, b) { return { a, b, aw: 0, bw: 0, winner: null, hasPlayer: !!(a && b && (a.isPlayer || b.isPlayer)) }; }
  // 取某分区前 8 种子；override 指定玩家分区第7/8种子，否则模拟附加赛
  function confTop8(team, conf, override) {
    const seeds = standings(team, conf);
    const top6 = seeds.slice(0, DIRECT_SEEDS);
    let s7, s8;
    if (override && override[conf]) {
      s7 = byId(team, override[conf].seed7Id);
      s8 = byId(team, override[conf].seed8Id);
    } else {
      const r = simPlayinConf(team, conf); s7 = r.s7; s8 = r.s8;
    }
    return top6.concat([s7, s8]);
  }
  function buildBracket(team, override) {
    const east = confTop8(team, 'E', override);
    const west = confTop8(team, 'W', override);
    [east, west].forEach(arr => arr.forEach((t, i) => { if (t) t.seed = i + 1; }));
    const confRounds = s => [[pairOf(s[0], s[7]), pairOf(s[3], s[4]), pairOf(s[1], s[6]), pairOf(s[2], s[5])], [], []];
    team.league.bracket = {
      east: { rounds: confRounds(east) },
      west: { rounds: confRounds(west) },
      finals: null, champion: null,
    };
    return team.league.bracket;
  }
  // 定位玩家当前所在的系列赛
  function findPlayerMatchup(team) {
    const br = team.league.bracket; if (!br) return null;
    if (br.finals && (br.finals.a.isPlayer || br.finals.b.isPlayer) && !br.finals.winner)
      return { matchup: br.finals, where: 'finals', round: 3 };
    for (const cf of ['east', 'west']) {
      const rounds = br[cf].rounds;
      for (let r = 0; r < rounds.length; r++) {
        const m = (rounds[r] || []).find(x => x && (x.a.isPlayer || x.b.isPlayer) && !x.winner);
        if (m) return { matchup: m, where: cf, round: r };
      }
    }
    return null;
  }
  function playerSeriesOpponent(team) {
    const pm = findPlayerMatchup(team);
    if (!pm) return null;
    return pm.matchup.a.isPlayer ? pm.matchup.b : pm.matchup.a;
  }
  // 玩家当前季后赛轮次（1首轮 2半决赛 3分区决赛 4总决赛）
  function currentPlayoffRound(team) {
    const pm = findPlayerMatchup(team);
    if (!pm) return team.playoffRound || 4;
    return pm.where === 'finals' ? 4 : pm.round + 1;
  }
  // 即时模拟一组系列赛（7局4胜）
  function simSeries(m) {
    if (!m || m.winner) return;
    let aw = 0, bw = 0;
    const pa = m.a.str / (m.a.str + m.b.str);
    while (aw < SERIES_WIN && bw < SERIES_WIN) { if (Math.random() < pa) aw++; else bw++; }
    m.aw = aw; m.bw = bw; m.winner = aw > bw ? m.a : m.b;
  }
  // 模拟某分区一轮：补完本轮，并生成下一轮（r<2 时）
  function simConfRound(confBr, r) {
    if (!confBr.rounds[r] || !confBr.rounds[r].length) return;
    confBr.rounds[r].forEach(x => simSeries(x));
    if (r < 2 && (!confBr.rounds[r + 1] || !confBr.rounds[r + 1].length)) {
      const w = confBr.rounds[r].map(x => x.winner);
      const next = [];
      for (let i = 0; i < w.length; i += 2) next.push(pairOf(w[i], w[i + 1]));
      confBr.rounds[r + 1] = next;
    }
  }
  // 玩家系列赛结束后推进对阵图（两分区并行 + 总决赛）
  function advanceBracket(team, playerWon) {
    const br = team.league.bracket;
    const pm = findPlayerMatchup(team);
    if (!pm) return;
    const m = pm.matchup;
    m.aw = m.a.isPlayer ? team.seriesWins : team.seriesLosses;
    m.bw = m.b.isPlayer ? team.seriesWins : team.seriesLosses;
    m.winner = playerWon ? (m.a.isPlayer ? m.a : m.b) : (m.a.isPlayer ? m.b : m.a);
    if (pm.where === 'finals') { br.champion = m.winner; return; }
    const cf = pm.where, r = pm.round, other = cf === 'east' ? 'west' : 'east';
    simConfRound(br[cf], r);       // 补完本区本轮 + 生成下一轮
    simConfRound(br[other], r);    // 另一分区同步推进一轮
    if (r === 2) {                 // 玩家赢下分区决赛 → 进军总决赛
      const myChamp = m.winner;
      const otherChamp = br[other].rounds[2][0] ? br[other].rounds[2][0].winner : null;
      if (myChamp && otherChamp) br.finals = pairOf(myChamp, otherChamp);
    }
  }
  // 玩家被淘汰后，自动模拟剩余对阵决出总冠军（历史记录用）
  function simulateRemainingBracket(team) {
    const br = team.league.bracket; if (!br) return;
    ['east', 'west'].forEach(cf => {
      for (let r = 0; r < 3; r++) {
        if (!br[cf].rounds[r] || !br[cf].rounds[r].length) break;
        simConfRound(br[cf], r);
      }
    });
    const eC = br.east.rounds[2] && br.east.rounds[2][0] ? br.east.rounds[2][0].winner : null;
    const wC = br.west.rounds[2] && br.west.rounds[2][0] ? br.west.rounds[2][0].winner : null;
    if (!br.finals && eC && wC) br.finals = pairOf(eC, wC);
    if (br.finals) { simSeries(br.finals); br.champion = br.finals.winner; }
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
      conf: s.conf || 'E', playin: s.playin || null,
      playoffRound: s.playoffRound || 0, seriesWins: s.seriesWins || 0, seriesLosses: s.seriesLosses || 0,
      rookies: s.rookies || [], league: s.league || null, awards: s.awards || null, fmvp: s.fmvp || null,
      history: s.history || [], pendingDraft: s.pendingDraft || null,
    });
    // 兼容旧版联盟存档（8队/旧对阵结构）：结构不符则回退到常规赛重建
    if (t.league && (!t.league.teams || t.league.teams.length < LEAGUE_SIZE
        || (t.league.bracket && !t.league.bracket.east))) {
      t.league = null; t.playin = null;
      if (t.seasonPhase === 'playoff' || t.seasonPhase === 'playin') {
        t.seasonPhase = 'regular'; t.playoffRound = 0; t.seriesWins = 0; t.seriesLosses = 0;
      }
    }
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
          <div class="gt-title">${tr('💎 钻石可用于')}</div>
          <ul>
            <li><span>💵</span>${tr('兑换资金：立即获得大量{p}补给', { p: POINT_LABEL })}</li>
            <li><span>⚡</span>${tr('双倍产出卡：限时全队产出翻倍')}</li>
            <li><span>🌟</span>${tr('永久产出 +20%：永久提升全局收益')}</li>
            <li><span>🔄</span>${tr('清除比赛冷却：随时再战联赛')}</li>
          </ul>
          <div class="gt-foot">${tr('完成任务、夺冠可获钻石，也可通过充值获得')}</div>
        </div>
      </span>`;
    html += `<button class="topbtn" onclick="App.openStore('recharge')">${tr('🛒 充值')}</button>`;
    html += `<button class="topbtn" onclick="App.openStore('diamond')">${tr('💎 钻石商店')}</button>`;
    html += `<button class="topbtn" onclick="App.openEventCenter()">${tr('🎈 活动中心')}</button>`;
    if (gameMode === 'single') html += `<button class="topbtn" onclick="App.manualSave()">${tr('💾 保存')}</button>`;
    html += `<button class="topbtn" onclick="App.openSettings()">${tr('⚙️ 设置')}</button>`;
    html += `<button class="topbtn" onclick="App.quitToMenu()">${tr('🚪 返回菜单')}</button>`;
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
        <div class="eb-info"><div class="eb-name">${tr('限时活动 · {name}', { name: tr(curEvent.name) })}</div><div class="eb-desc">${tr('{desc}　全服进行中', { desc: tr(curEvent.desc) })}</div></div>
        <div class="eb-time">⏳ ${left}s</div>
        <div class="eb-bar" style="width:${pct}%"></div></div>`;
    } else {
      const left = Math.max(0, Math.ceil((nextEventAt - Date.now()) / 1000));
      host.innerHTML = `<div class="event-banner idle">
        <div class="eb-ico">📅</div>
        <div class="eb-info"><div class="eb-name">${tr('活动中心')}</div><div class="eb-desc">${tr('下一场限时活动即将开启，敬请期待丰厚加成')}</div></div>
        <div class="eb-time" style="color:var(--muted)">${left}s</div></div>`;
    }
  }
  function tickEvents() {
    const now = Date.now();
    if (curEvent) {
      if (now >= curEvent.until) {
        teams.forEach(t => pushLog(t, tr('⌛ 活动「{name}」已结束', { name: tr(curEvent.name) }), ''));
        curEvent = null; nextEventAt = now + 12000;
      }
    } else if (now >= nextEventAt) {
      const ev = pick(EVENTS);
      curEvent = Object.assign({}, ev, { until: now + ev.dur * 1000 });
      teams.forEach(t => pushLog(t, tr('{icon} 限时活动开启：{name}（{desc}）', { icon: ev.icon, name: tr(ev.name), desc: tr(ev.desc) }), 'hl'));
      toast(tr('{icon} 活动开启：{name}', { icon: ev.icon, name: tr(ev.name) }));
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
          <div class="pn" id="pn-${idx}-${i}">${tr(pos.name)}</div>
          <div class="pd" id="pd-${idx}-${i}"></div>
        </div>
        <button class="buy-btn" id="buy-${idx}-${i}" onclick="App.buyPlayer(${idx},${i})">${tr('签约')}<span class="bc" id="bc-${idx}-${i}"></span></button>
      </div>`).join('');

    const upgrades = FACILITIES.map(f => `
      <div class="upg" id="upg-${idx}-${f.key}" onclick="App.buyFacility(${idx},'${f.key}')" title="${tr(f.desc)}">
        <div class="ui">${f.icon}</div><div class="un">${tr(f.name)}</div>
        <div class="ulv" id="ulv-${idx}-${f.key}"></div><div class="uc" id="uc-${idx}-${f.key}"></div>
      </div>`).join('');

    const tasks = TASKS.map(t => `
      <div class="task">
        <div class="ti"><div class="tn">${tr(t.name)}</div><div class="tp" id="tp-${idx}-${t.key}"></div>
          <div class="tprog"><i id="tf-${idx}-${t.key}"></i></div></div>
        <button class="task-claim" id="tc-${idx}-${t.key}" onclick="App.claimTask(${idx},'${t.key}')">${tr('领取')}</button>
      </div>`).join('');

    const progressBlock = gameMode === 'dual' ? `
        <div class="res"><div class="rl">${tr('🎯 夺冠目标')}</div>
          <div class="rv" id="goal-${idx}" style="font-size:15px;">${fmt(team.goal)}</div>
          <div class="rs" id="eta-${idx}" style="color:var(--muted)"></div></div>` : `
        <div class="res"><div class="rl">${tr('🏆 总冠军')}</div>
          <div class="rv" id="banners-${idx}" style="font-size:15px;">${tr('{n} 次', { n: 0 })}</div>
          <div class="rs" id="bbonus-${idx}" style="color:var(--green)">${tr('王朝加成 +{n}%', { n: 0 })}</div></div>`;

    const goalWrap = gameMode === 'dual' ? `
        <div class="goal-wrap"><div class="goal-label"><span>${tr('赛季进度')}</span><span id="prog-${idx}">0%</span></div>
          <div class="goal-bar"><div class="goal-fill" id="fill-${idx}"></div></div></div>` : `
        <div class="dynasty-bar">
          <div class="banners" id="banner-icons-${idx}">—</div>
          <div class="dn"><div class="t">${tr('第 {n} 赛季 · ', { n: `<b id="season-${idx}">1</b>` })}<span id="phase-${idx}" style="color:var(--orange)">${tr('常规赛')}</span></div>
            <div class="v" id="phaserec-${idx}" style="font-size:12px;">${tr('常规赛 0/{g} · 0胜0负', { g: REGULAR_GAMES })}</div></div>
          <div style="text-align:right"><div class="goal-label" style="justify-content:flex-end"><span id="prog-${idx}">0%</span></div>
            <div class="goal-bar" style="width:120px"><div class="goal-fill" id="fill-${idx}"></div></div></div>
        </div>`;

    return `
      <div class="team-panel ${cls}">
        <div class="tp-head"><span class="tp-name">${esc(team.teamName)}</span>
          <span class="tp-badge">${gameMode === 'dual' ? (idx === 0 ? tr('🔵 玩家一') : tr('🔴 玩家二')) : tr(DIFFICULTIES[team.diff].name) + tr('难度')}</span></div>
        <div class="res-bar">
          <div class="res"><div class="rl">💰 ${tr(POINT_LABEL)}</div><div class="rv" id="funds-${idx}">0</div><div class="rs" id="rate-${idx}">${tr('+0/秒')}</div></div>
          ${progressBlock}
        </div>
        ${goalWrap}
        <button class="shoot-btn" id="shoot-${idx}" onclick="App.shoot(${idx}, event)">${tr('🏀 投篮训练 +')}<span id="shoot-val-${idx}">1</span></button>
        <div class="match-center">
          <div class="match-head"><span class="mt">${gameMode === 'single' ? tr('🏟️ 赛季中心') : tr('🏟️ 联赛中心')}</span><span class="mr" id="match-record-${idx}">${tr('战绩 0胜 0负')}</span></div>
          <div class="opp-preview" id="opp-preview-${idx}"></div>
          <button class="match-btn" id="match-btn-${idx}" onclick="App.playMatch(${idx})">${tr('⚔️ 发起一场比赛')}</button>
          <div class="match-result" id="match-result-${idx}">${gameMode === 'single' ? tr('打满常规赛冲击季后赛，胜率取决于双方战力') : tr('击败对手可赢得奖金，胜率取决于双方战力')}</div>
          <div class="lg-tabs">
            <button class="lg-tab" onclick="App.openMatchReport(${idx})">${tr('📋 赛后数据')}</button>
            ${gameMode === 'single' ? `<button class="lg-tab" onclick="App.openSweep(${idx})">${tr('⚡ 一键扫荡')}</button>` : ''}
          </div>
          ${gameMode === 'single' ? `<div class="lg-tabs">
            <button class="lg-tab" onclick="App.openLeague('standings',${idx})">${tr('📊 排名')}</button>
            <button class="lg-tab" onclick="App.openLeague('stats',${idx})">${tr('📈 数据榜')}</button>
            <button class="lg-tab" onclick="App.openLeague('bracket',${idx})">${tr('🏆 对阵图')}</button>
            <button class="lg-tab" onclick="App.openLeague('awards',${idx})">${tr('🏅 奖项')}</button>
          </div>` : ''}
        </div>
        <div class="section-title" style="margin-top:0;">${tr('👥 球员阵容（真实球星）')}</div>
        <div class="roster">${players}</div>
        <div class="section-title">${tr('🏟️ 设施升级')}</div>
        <div class="upgrades">${upgrades}</div>
        <div class="section-title">${tr('📋 球队任务')}</div>
        <div class="tasks">${tasks}</div>
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
    if (team.funds < cost) { Sound.play('error'); return toast(tr('资金不足')); }
    team.funds -= cost; team.players[posIdx].level++; team.stats.signs++;
    Sound.play('buy'); Sound.vibrate(12);
    const lv = team.players[posIdx].level, p = playerAt(POSITIONS[posIdx].key, lv);
    if (p) pushLog(team, tr('✍️ {pos}签下了 {name} (#{no})！', { pos: tr(POSITIONS[posIdx].name), name: playerLabel(p.cn), no: p.no }), 'hl');
    else pushLog(team, tr('💪 {pos}训练强化 Lv.{lv}', { pos: tr(POSITIONS[posIdx].name), lv }), '');
    refreshTeam(idx);
  }
  function buyFacility(idx, key) {
    const team = teams[idx];
    if (team.won) return;
    const cost = facilityCost(team, key);
    if (team.funds < cost) { Sound.play('error'); return toast(tr('资金不足')); }
    team.funds -= cost; team.facilities[key]++;
    Sound.play('buy'); Sound.vibrate(12);
    const f = FACILITIES.find(x => x.key === key);
    pushLog(team, tr('🏟️ {name} 升级至 Lv.{lv}', { name: tr(f.name), lv: team.facilities[key] }), 'hl');
    refreshTeam(idx);
  }
  function playMatch(idx) {
    const team = teams[idx];
    if (team.won) return;
    // 休赛期：按钮转为进入选秀
    if (gameMode === 'single' && team.seasonPhase === 'offseason') { openDraft(idx); return; }
    // 必须凑齐 5 个位置的球员才能出战
    if (!lineupComplete(team)) {
      Sound.play('error');
      return toast(tr('阵容不完整：请先在 {pos} 位置签下球员', { pos: emptyPositions(team).map(p => tr(p)).join('、') }));
    }
    const now = Date.now();
    if (now - team.lastMatchAt < MATCH_COOLDOWN) { Sound.play('error'); return toast(tr('比赛冷却中')); }
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
    // 记录赛后详细数据（在赛季阶段推进之前，确保阶段标签正确）
    recordMatchReport(team, opp, myScore, oppScore, win);
    Sound.play(win ? 'win' : 'lose'); Sound.vibrate(win ? [12, 40, 12] : 20);

    if (gameMode === 'single') {
      handleSeasonProgress(team, idx, win, opp, myScore, oppScore, reward);
    } else {
      const resEl = document.getElementById('match-result-' + idx);
      if (resEl) resEl.innerHTML = win
        ? `<span class="w">${tr('🎉 击败 {name} {a}:{b}', { name: esc(teamLabel(opp.name)), a: myScore, b: oppScore })}</span>${eventMatchMul() > 1 ? tr('，奖金 +{r}（活动加成）', { r: fmt(reward) }) : tr('，奖金 +{r}', { r: fmt(reward) })}`
        : `<span class="l">${tr('😖 不敌 {name} {a}:{b}', { name: esc(teamLabel(opp.name)), a: myScore, b: oppScore })}</span>${tr('，仍获参赛费 +{r}', { r: fmt(reward) })}`;
      pushLog(team, win ? `⚔️ 战胜${opp.name} ${myScore}:${oppScore}，奖金+${fmt(reward)}` : `⚔️ 负于${opp.name} ${myScore}:${oppScore}`, win ? 'hl' : '');
      checkProgress(idx);
    }
    team.nextOpp = genOpponent(team);
    refreshTeam(idx); runMatchCooldown(idx);
  }

  // =========================================================
  // 赛后详细数据（Box Score）
  // =========================================================
  // 将一支球队的总得分按球员评级权重分配，并生成篮板/助攻/抢断/盖帽
  function distributeBox(players, teamPts) {
    const list = (players && players.length) ? players.slice(0, 5) : [];
    if (!list.length) return [];
    const weights = list.map(p => Math.max(4, (p.rating || 70) - 55));
    const wsum = weights.reduce((a, b) => a + b, 0) || 1;
    const rows = list.map((p, i) => {
      const share = weights[i] / wsum;
      const pts = Math.max(0, Math.round(teamPts * share * (0.8 + Math.random() * 0.4)));
      return { name: p.name, pos: p.pos, rating: p.rating || 70, pts };
    });
    // 修正四舍五入误差，使总分等于球队得分
    let sum = rows.reduce((a, r) => a + r.pts, 0);
    rows.sort((a, b) => b.pts - a.pts);
    rows[0].pts = Math.max(0, rows[0].pts + (teamPts - sum));
    // 按位置生成其余数据
    rows.forEach(r => {
      const big = (r.pos === 'C' || r.pos === 'PF');
      r.reb = (big ? 6 : 3) + Math.floor(Math.random() * (big ? 8 : 5));
      r.ast = (r.pos === 'PG' ? 5 : 2) + Math.floor(Math.random() * (r.pos === 'PG' ? 7 : 4));
      r.stl = Math.floor(Math.random() * 3);
      r.blk = big ? Math.floor(Math.random() * 4) : Math.floor(Math.random() * 2);
    });
    return rows;
  }
  // 记录一场比赛的赛后数据（双方 box score）
  function recordMatchReport(team, opp, myScore, oppScore, win) {
    if (!team.matchReports) team.matchReports = [];
    const mine = POSITIONS.map((pos, i) => {
      const lv = team.players[i].level, p = playerAt(pos.key, lv);
      return { name: p ? p.cn : pos.name, pos: pos.key, rating: p ? p.rating : 70 };
    });
    const away = (opp.lineup || []).map(p => ({ name: p.cn, pos: p.pos, rating: p.rating }));
    team.matchReports.unshift({
      ts: Date.now(), season: team.season, phase: team.seasonPhase,
      teamName: team.teamName, oppName: opp.name, myScore, oppScore, win,
      home: distributeBox(mine, myScore), away: distributeBox(away, oppScore),
    });
    if (team.matchReports.length > 30) team.matchReports.pop();
  }
  function phaseLabel(phase) {
    const map = { regular: '常规赛', playin: '附加赛', playoff: '季后赛', offseason: '休赛期' };
    return tr(map[phase] || '常规赛');
  }
  // 打开赛后数据中心（比赛列表）
  function openMatchReport(idx) {
    reportTeamIdx = idx; reportSel = -1;
    Sound.play('click');
    ensureModal('report-modal').classList.add('show');
    renderMatchReport();
  }
  function closeMatchReport() { const m = document.getElementById('report-modal'); if (m) m.classList.remove('show'); }
  function viewMatchReport(i) { reportSel = i; Sound.play('click'); renderMatchReport(); }
  function backMatchReportList() { reportSel = -1; renderMatchReport(); }
  function renderMatchReport() {
    const m = ensureModal('report-modal');
    const team = teams[reportTeamIdx]; if (!team) return;
    const reps = team.matchReports || [];
    let body;
    if (!reps.length) {
      body = `<p class="empty">${tr('暂无比赛记录，先打一场比赛吧。')}</p>`;
    } else if (reportSel >= 0 && reps[reportSel]) {
      body = matchReportDetailHTML(reps[reportSel]);
    } else {
      const rows = reps.map((r, i) => {
        const cls = r.win ? 'w' : 'l';
        return `<div class="save-row" onclick="App.viewMatchReport(${i})">
          <div class="av">${r.win ? '🏆' : '💔'}</div>
          <div class="info">
            <div class="n">🆚 ${esc(teamLabel(r.oppName))}</div>
            <div class="d">${tr('第{s}赛季 · {phase}', { s: r.season, phase: phaseLabel(r.phase) })}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700;color:var(--gold);">${r.myScore}:${r.oppScore}</div>
            <div class="match-result"><span class="${cls}">${r.win ? tr('胜') : tr('负')}</span></div>
          </div>
        </div>`;
      }).join('');
      body = `<p class="lg-note">${tr('点击查看每场比赛的详细数据')}</p>${rows}`;
    }
    m.innerHTML = `
      <div class="card wide" style="max-width:640px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;">
        <div class="brand" style="margin-bottom:10px;"><h1 style="font-size:24px;">${tr('📋 赛后数据中心')}</h1></div>
        <div style="overflow-y:auto;padding-right:6px;flex:1;">${body}</div>
        <div style="display:flex;gap:10px;margin-top:12px;">
          ${reportSel >= 0 ? `<button class="btn ghost" onclick="App.backMatchReportList()">${tr('返回')}</button>` : ''}
          <button class="btn" onclick="App.closeMatchReport()">${tr('关闭')}</button>
        </div>
      </div>`;
  }
  function boxTableHTML(title, rows) {
    const body = rows.map(r => `<tr>
      <td>${esc(playerLabel(r.name))}<div class="sub2">${r.pos}</div></td>
      <td style="text-align:center;font-weight:700;color:var(--gold)">${r.pts}</td>
      <td style="text-align:center">${r.reb}</td>
      <td style="text-align:center">${r.ast}</td>
      <td style="text-align:center">${r.stl}</td>
      <td style="text-align:center">${r.blk}</td>
    </tr>`).join('');
    return `<div class="stat-card" style="margin-bottom:12px;">
      <div class="stat-h">${title}</div>
      <table class="lg-table mini">
        <thead><tr><th>${tr('球员')}</th><th style="text-align:center">${tr('得分')}</th><th style="text-align:center">${tr('篮板')}</th><th style="text-align:center">${tr('助攻')}</th><th style="text-align:center">${tr('抢断')}</th><th style="text-align:center">${tr('盖帽')}</th></tr></thead>
        <tbody>${body}</tbody>
      </table></div>`;
  }
  function matchReportDetailHTML(r) {
    const resCls = r.win ? 'w' : 'l';
    return `
      <div style="text-align:center;margin-bottom:12px;">
        <div style="font-size:13px;color:var(--muted);">${tr('第{s}赛季 · {phase}', { s: r.season, phase: phaseLabel(r.phase) })}</div>
        <div style="font-size:22px;font-weight:800;margin:6px 0;">
          ${esc(teamLabel(r.teamName))} <span class="match-result"><span class="${resCls}">${r.myScore} : ${r.oppScore}</span></span> ${esc(teamLabel(r.oppName))}
        </div>
      </div>
      ${boxTableHTML(tr('我方：{team}', { team: esc(teamLabel(r.teamName)) }), r.home)}
      ${boxTableHTML(tr('对手：{team}', { team: esc(teamLabel(r.oppName)) }), r.away)}`;
  }

  // =========================================================
  // 付费一键扫荡（常规赛批量模拟）
  // =========================================================
  function openSweep(idx) {
    const team = teams[idx]; if (!team) return;
    if (gameMode !== 'single' || team.seasonPhase !== 'regular') { Sound.play('error'); return toast(tr('扫荡仅在常规赛阶段可用')); }
    if (!lineupComplete(team)) { Sound.play('error'); return toast(tr('阵容不完整，无法扫荡')); }
    sweepTeamIdx = idx;
    Sound.play('click');
    ensureModal('sweep-modal').classList.add('show');
    renderSweep();
  }
  function closeSweep() { const m = document.getElementById('sweep-modal'); if (m) m.classList.remove('show'); }
  function renderSweep() {
    const m = ensureModal('sweep-modal');
    const team = teams[sweepTeamIdx]; if (!team) return;
    const remaining = REGULAR_GAMES - team.regGames;
    const have = getDiamonds();
    const presets = [5, 10, 20].filter(n => n < remaining);
    const opts = presets.map(n => ({ n, label: tr('{n} 场', { n }) }));
    opts.push({ n: remaining, label: tr('全部剩余（{n} 场）', { n: remaining }) });
    const btns = opts.map(o => {
      const cost = o.n * SWEEP_COST_PER;
      const afford = have >= cost;
      return `<button class="q-btn" style="flex:1 1 calc(50% - 8px);padding:12px 8px;${afford ? '' : 'opacity:.5;'}" ${afford ? '' : 'disabled'} onclick="App.doSweep(${o.n})">
        <div style="font-weight:700;">${o.label}</div>
        <div style="font-size:11px;color:#9fe0ff;margin-top:3px;">${tr('共需 💎{total}（{n} 场）', { total: cost, n: o.n })}</div>
      </button>`;
    }).join('');
    m.innerHTML = `
      <div class="card" style="max-width:420px;">
        <div class="brand" style="margin-bottom:10px;"><h1 style="font-size:24px;">${tr('⚡ 一键扫荡')}</h1></div>
        <p class="lg-note">${tr('消耗钻石快速模拟多场常规赛，省去逐场点击。')}</p>
        <div class="set-row"><div class="sl">${tr('每场消耗 💎{c}', { c: SWEEP_COST_PER })}</div><div class="sc" style="color:#9fe0ff;font-weight:700;">💎 ${fmt(have)}</div></div>
        <div class="set-row"><div class="sl">${tr('剩余常规赛 {n} 场', { n: remaining })}</div></div>
        <div style="font-size:13px;color:var(--orange);font-weight:700;margin:14px 0 8px;">${tr('选择扫荡场次')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">${btns}</div>
        <button class="btn ghost" style="margin-top:16px;" onclick="App.closeSweep()">${tr('取消')}</button>
      </div>`;
  }
  function doSweep(count) {
    const idx = sweepTeamIdx, team = teams[idx]; if (!team) return;
    if (gameMode !== 'single' || team.seasonPhase !== 'regular') { Sound.play('error'); return toast(tr('扫荡仅在常规赛阶段可用')); }
    if (!lineupComplete(team)) { Sound.play('error'); return toast(tr('阵容不完整，无法扫荡')); }
    const remaining = REGULAR_GAMES - team.regGames;
    count = Math.min(count, remaining);
    if (count <= 0) return;
    const totalCost = count * SWEEP_COST_PER;
    if (getDiamonds() < totalCost) { Sound.play('error'); return toast(tr('钻石不足，需 💎{need}，当前 💎{have}', { need: totalCost, have: getDiamonds() })); }
    closeSweep();
    let played = 0, wins = 0, totalReward = 0;
    for (let i = 0; i < count; i++) {
      if (team.seasonPhase !== 'regular') break;
      const r = resolveRegularGameSilent(team, idx);
      played++; if (r.win) wins++; totalReward += r.reward;
    }
    const spent = played * SWEEP_COST_PER;
    addDiamonds(-spent);
    Sound.play('reward'); Sound.vibrate([10, 30, 10]);
    if (team.seasonPhase === 'regular') team.nextOpp = genOpponent(team);
    refreshTeam(idx);
    toast(tr('扫荡完成：{n} 场 · {w}胜{l}负 · 奖金+{r} · 💎-{d}', { n: played, w: wins, l: played - wins, r: fmt(totalReward), d: spent }));
  }
  // 静默模拟一场常规赛（不触发音效/冷却/逐场弹层），复用赛季推进逻辑
  function resolveRegularGameSilent(team, idx) {
    if (!team.nextOpp) team.nextOpp = genOpponent(team);
    const opp = team.nextOpp;
    const myPow = teamPower(team);
    const win = Math.random() < matchWinChance(myPow, opp.power);
    team.matches++; team.stats.matches++;
    if (win) { team.wins++; team.stats.wins++; }
    const reward = Math.round(Math.max(fundsPerSec(team) * 10, 20) * (win ? 1 : 0.3) * eventMatchMul());
    team.funds += reward; team.totalEarned += reward;
    const myScore = 80 + Math.floor(Math.random() * 40);
    const oppScore = win ? myScore - (1 + Math.floor(Math.random() * 15)) : myScore + (1 + Math.floor(Math.random() * 15));
    recordMatchReport(team, opp, myScore, oppScore, win);
    handleSeasonProgress(team, idx, win, opp, myScore, oppScore, reward);
    if (team.seasonPhase === 'regular') team.nextOpp = genOpponent(team);
    return { win, reward };
  }

  // 单人模式：常规赛 → 季后赛 → 总冠军 的赛季推进（接入联盟模拟）
  function handleSeasonProgress(team, idx, win, opp, myScore, oppScore, reward) {
    ensureLeague(team);
    const resEl = document.getElementById('match-result-' + idx);
    const head = win
      ? `<span class="w">${tr('🎉 击败 {name} {a}:{b}', { name: esc(teamLabel(opp.name)), a: myScore, b: oppScore })}</span>${tr('，奖金 +{r}', { r: fmt(reward) })}`
      : `<span class="l">${tr('😖 不敌 {name} {a}:{b}', { name: esc(teamLabel(opp.name)), a: myScore, b: oppScore })}</span>${tr('，参赛费 +{r}', { r: fmt(reward) })}`;
    let extra = '';

    if (team.seasonPhase === 'regular') {
      team.regGames++; if (win) team.regWins++;
      // 联盟同步推进一轮
      const oppTeam = team.league.teams.find(t => t.id === opp.leagueId);
      simulateLeagueRound(team, oppTeam, win);
      pushLog(team, `🏀 常规赛 ${win ? '胜' : '负'} ${opp.name} ${myScore}:${oppScore}（${team.regWins}-${team.regGames - team.regWins}）`, win ? 'hl' : '');
      if (team.regGames >= REGULAR_GAMES) {
        computeAwards(team);                       // 常规赛结束颁奖
        const confName = team.conf === 'E' ? '东部' : '西部';
        const confTr = tr(confName);
        const myRank = playerConfRank(team);       // 分区名次
        team.nextOpp = null;
        if (myRank <= DIRECT_SEEDS) {              // 前 6 直接晋级
          buildBracket(team, null);
          team.seasonPhase = 'playoff'; team.playoffRound = 1; team.seriesWins = 0; team.seriesLosses = 0;
          extra = `<br><b style="color:var(--gold)">${tr('🎟️ {conf}第 {rank} 名，直接晋级季后赛！', { conf: confTr, rank: myRank })}</b>`;
          pushLog(team, `🎟️ 常规赛收官 ${team.regWins}-${team.regGames - team.regWins}，${confName}第${myRank}种子直接晋级季后赛！`, 'win');
          toast(tr('🎟️ 直接晋级季后赛！')); Sound.play('reward');
          showAwardsCeremony(team, false);
        } else if (myRank <= PLAYIN_HIGH) {        // 7-10 进入附加赛
          startPlayin(team);
          extra = `<br><b style="color:var(--orange)">${tr('🎫 {conf}第 {rank} 名，进入附加赛争夺季后赛席位！', { conf: confTr, rank: myRank })}</b>`;
          pushLog(team, `🎫 ${confName}第${myRank}名，进入附加赛！`, 'hl');
          toast(tr('🎫 进入附加赛！')); Sound.play('reward');
          showAwardsCeremony(team, false);
        } else {                                   // 11 名开外，无缘
          buildBracket(team, null); simulateRemainingBracket(team);
          recordHistory(team, false);
          extra = `<br><b style="color:var(--nba-red)">${tr('{conf}第 {rank} 位，无缘季后赛', { conf: confTr, rank: myRank })}</b>`;
          pushLog(team, `❌ ${confName}第${myRank}名，未能晋级季后赛`, '');
          showAwardsCeremony(team, true);
        }
      }
    } else if (team.seasonPhase === 'playin') {
      const pi = team.playin; team.nextOpp = null;
      pushLog(team, `${win ? '✅' : '❌'} 附加赛 ${opp.name} ${myScore}:${oppScore}`, win ? 'hl' : '');
      if (pi.stage === 'A') {                       // 7v8
        if (win) {
          extra = `<br><b style="color:var(--gold)">${tr('🎟️ 附加赛取胜，锁定第 7 种子，晋级季后赛！')}</b>`;
          pushLog(team, `🎟️ 附加赛胜，第7种子晋级季后赛！`, 'win'); toast(tr('晋级季后赛！')); Sound.play('reward');
          finishPlayinQualify(team, idx, 7);
        } else {
          const seeds = standings(team, team.conf);
          const gB = simGame(seeds[8], seeds[9]);
          pi.seed7Id = pi.oppId; pi.oppId = gB.winner.id; pi.stage = 'C';
          extra = `<br><b style="color:var(--orange)">${tr('首场附加赛失利，进入保级附加赛——再胜一场即可拿到最后席位！')}</b>`;
          pushLog(team, `附加赛首战失利，转入保级附加赛`, '');
        }
      } else if (pi.stage === 'B') {                // 9v10
        if (!win) {
          extra = `<br><b style="color:var(--nba-red)">${tr('附加赛失利，无缘季后赛')}</b>`;
          pushLog(team, `❌ 附加赛出局`, ''); eliminateInPlayin(team, idx);
        } else {
          pi.oppId = pi.gameALoserId; pi.stage = 'C';
          extra = `<br><b style="color:var(--orange)">${tr('附加赛首胜！进入保级附加赛抢最后席位！')}</b>`;
          pushLog(team, `附加赛首胜，进入保级附加赛`, 'hl');
        }
      } else {                                      // 保级附加赛
        if (win) {
          extra = `<br><b style="color:var(--gold)">${tr('🎟️ 保级附加赛取胜，以第 8 种子晋级季后赛！')}</b>`;
          pushLog(team, `🎟️ 保级附加赛胜，第8种子晋级季后赛！`, 'win'); toast(tr('晋级季后赛！')); Sound.play('reward');
          finishPlayinQualify(team, idx, 8);
        } else {
          extra = `<br><b style="color:var(--nba-red)">${tr('保级附加赛失利，无缘季后赛')}</b>`;
          pushLog(team, `❌ 保级附加赛出局`, ''); eliminateInPlayin(team, idx);
        }
      }
    } else if (team.seasonPhase === 'playoff') {
      if (win) team.seriesWins++; else team.seriesLosses++;
      const curRound = currentPlayoffRound(team);
      const roundName = PLAYOFF_ROUND_NAMES[curRound] || '季后赛';
      pushLog(team, `${win ? '✅' : '❌'} ${roundName} ${opp.name} ${myScore}:${oppScore}（系列赛 ${team.seriesWins}-${team.seriesLosses}）`, win ? 'hl' : '');
      if (team.seriesWins >= SERIES_WIN) {
        const wasFinals = curRound === 4;
        advanceBracket(team, true);
        if (wasFinals) {
          winChampionship(team);
          extra = `<br><b style="color:var(--gold)">${tr('🏆 赢下总决赛，夺得总冠军！')}</b>`;
          if (resEl) resEl.innerHTML = head + extra;
          return;
        }
        team.playoffRound = currentPlayoffRound(team); team.seriesWins = 0; team.seriesLosses = 0; team.nextOpp = null;
        const next = PLAYOFF_ROUND_NAMES[team.playoffRound];
        extra = `<br><b style="color:var(--gold)">${tr('系列赛 {n} 胜，晋级{next}！', { n: SERIES_WIN, next: tr(next) })}</b>`;
        pushLog(team, `🏆 晋级${next}！`, 'win'); toast(tr('晋级{next}！', { next: tr(next) })); Sound.play('reward');
      } else if (team.seriesLosses >= SERIES_WIN) {
        advanceBracket(team, false);
        simulateRemainingBracket(team);
        recordHistory(team, false);
        const champ = team.league.bracket.champion;
        extra = `<br><b style="color:var(--nba-red)">${tr('系列赛失利，止步{r}。本季冠军：{champ}', { r: tr(roundName), champ: champ ? esc(teamLabel(champ.name)) : '—' })}</b>`;
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
    toast(tr('赛季结束，进入选秀大会'));
    setTimeout(() => openDraft(idx), 700);
  }
  function startNextSeason(team) {
    team.season++;
    team.seasonPhase = 'regular';
    team.regGames = 0; team.regWins = 0;
    team.playoffRound = 0; team.seriesWins = 0; team.seriesLosses = 0;
    team.nextOpp = null; team.playin = null;
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
    toast(tr('🏆 夺得第 {n} 座总冠军！', { n: team.banners }));
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
      if (prev) prev.innerHTML = `<div class="opp-vs" style="text-align:center">${tr('🎓 赛季已结束，选秀大会进行中')}</div>`;
      if (btn) { btn.disabled = false; btn.textContent = tr('🎓 进入选秀大会'); }
      return;
    }
    // 阵容未凑齐 5 个位置：禁止出战
    if (!lineupComplete(team)) {
      if (prev) prev.innerHTML = `<div class="opp-vs" style="text-align:center;color:var(--orange)">${tr('⚠️ 阵容不完整 · 请先签下 {pos}', { pos: '<b>' + emptyPositions(team).map(p => tr(p)).join('、') + '</b>' })}</div>`;
      if (btn) { btn.disabled = true; btn.textContent = tr('🔒 阵容未满 5 人'); }
      return;
    }
    if (!team.nextOpp && !team.won) team.nextOpp = genOpponent(team);
    // 兼容旧存档：阵容不足 5 人则按新规则重新生成
    if (team.nextOpp && (!team.nextOpp.lineup || team.nextOpp.lineup.length < 5)) team.nextOpp = genOpponent(team);
    const opp = team.nextOpp;
    const myPow = teamPower(team);
    const piStageName = { A: '附加赛 7/8 名之争', B: '附加赛 9/10 名之争', C: '保级附加赛（末席之争）' };
    if (opp && prev) {
      const wc = Math.round(matchWinChance(myPow, opp.power) * 100);
      const lineup = opp.lineup.map(p => `${p.pos ? '<b style="color:var(--muted)">' + p.pos + '</b> ' : ''}${esc(playerLabel(p.cn))}<span class="star">★${p.rating}</span>`).join('、');
      let tag = '';
      if (gameMode === 'single' && team.seasonPhase === 'playoff') {
        tag = `<span style="color:var(--gold)">${tr('{r} · 系列赛 {w}-{l}（7局4胜）', { r: tr(PLAYOFF_ROUND_NAMES[currentPlayoffRound(team)] || '季后赛'), w: team.seriesWins, l: team.seriesLosses })}</span>`;
      } else if (gameMode === 'single' && team.seasonPhase === 'playin' && team.playin) {
        tag = `<span style="color:var(--orange)">${tr('🎫 {stage} · 单场定胜负', { stage: tr(piStageName[team.playin.stage] || '附加赛') })}</span>`;
      }
      prev.innerHTML = `
        ${tag ? `<div style="font-size:11px;margin-bottom:4px;">${tag}</div>` : ''}
        <div class="opp-row"><span class="opp-name">🆚 ${esc(teamLabel(opp.name))}</span></div>
        <div class="opp-lineup">${tr('对手阵容：{lineup}', { lineup })}</div>
        <div class="opp-vs">${tr('我方战力 {my} · 预计胜率 {wc}%', { my: '<b>' + fmt(myPow) + '</b>', wc: '<b class="' + (wc >= 50 ? 'w' : 'l') + '">' + wc + '</b>' })}</div>`;
    }
    if (btn && !btn.disabled) {
      if (gameMode === 'single') {
        if (team.seasonPhase === 'playoff') btn.textContent = tr('⚔️ {r} · 下一场', { r: tr(PLAYOFF_ROUND_NAMES[currentPlayoffRound(team)] || '季后赛') });
        else if (team.seasonPhase === 'playin') btn.textContent = tr('🎫 附加赛 · 出战');
        else btn.textContent = tr('⚔️ 进行常规赛');
      } else {
        btn.textContent = tr('⚔️ 发起一场比赛');
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
    if (t.metric && team.stats[t.metric] < t.target) return toast(tr('任务尚未完成'));
    const fundGain = fundsPerSec(team) * t.reward.fundSec + 50;
    team.funds += fundGain; team.totalEarned += fundGain; team.claimed[key] = true;
    addDiamonds(t.reward.dia);
    Sound.play('reward'); Sound.vibrate([10, 30, 10]);
    pushLog(team, tr('📋 完成任务「{name}」+{g} 💎{dia}', { name: tr(t.name), g: fmt(fundGain), dia: t.reward.dia }), 'win');
    toast(tr('任务完成！+{g} 资金 +{dia} 钻石', { g: fmt(fundGain), dia: t.reward.dia }));
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
      if (team.funds >= team.goal) { team.won = true; Sound.play('victory'); Sound.vibrate([20, 60, 20, 60, 20]); pushLog(team, tr('🏆 达成夺冠目标！'), 'win'); onDualVictory(idx); }
    }
  }
  function onDualVictory(winnerIdx) {
    stopLoop(); teams.forEach(t => t.won = true);
    const team = teams[winnerIdx], loser = teams[winnerIdx === 0 ? 1 : 0];
    document.getElementById('victory-title').textContent = tr('{team} 夺冠！', { team: esc(teamLabel(team.teamName)) });
    document.getElementById('victory-desc').innerHTML =
      tr('{who} 率先达成夺冠目标！<br>对手 {opp} 仅积累 {p} {n}。', { who: winnerIdx === 0 ? tr('🔵 玩家一') : tr('🔴 玩家二'), opp: esc(teamLabel(loser.teamName)), p: POINT_LABEL, n: fmt(loser.funds) });
    document.getElementById('victory').classList.add('show');
  }
  function backToMenuFromVictory() { document.getElementById('victory').classList.remove('show'); quitToMenu(); }

  // =========================================================
  // 刷新 UI
  // =========================================================
  function refreshTeam(idx) {
    const team = teams[idx], rate = fundsPerSec(team);
    setText('funds-' + idx, fmt(team.funds));
    setText('rate-' + idx, tr('+{r}/秒', { r: fmt(rate) }));
    setText('shoot-val-' + idx, fmt(clickValue(team)));

    if (gameMode === 'dual') {
      const progress = Math.min(100, (team.funds / team.goal) * 100);
      setText('prog-' + idx, progress.toFixed(1) + '%');
      const fill = document.getElementById('fill-' + idx); if (fill) fill.style.width = progress + '%';
      const remain = team.goal - team.funds, eta = document.getElementById('eta-' + idx);
      if (eta) eta.textContent = remain <= 0 ? tr('已达成') : (rate > 0 ? tr('约 {t}', { t: fmtTime(remain / rate) }) : tr('签约球员以产出'));
    } else {
      // 赛季阶段进度：常规赛 / 附加赛 / 季后赛 / 休赛期
      let phaseText, recText, progress;
      if (team.seasonPhase === 'playoff') {
        const cr = currentPlayoffRound(team);
        phaseText = tr('季后赛 · {r}', { r: tr(PLAYOFF_ROUND_NAMES[cr] || '') });
        recText = tr('{r} {w}-{l}（7局4胜）', { r: tr(PLAYOFF_ROUND_NAMES[cr] || '季后赛'), w: team.seriesWins, l: team.seriesLosses });
        progress = Math.min(100, (team.seriesWins / SERIES_WIN) * 100);
      } else if (team.seasonPhase === 'playin') {
        phaseText = tr('附加赛');
        recText = tr('附加赛 · 争夺季后赛席位');
        progress = 100;
      } else if (team.seasonPhase === 'offseason') {
        phaseText = tr('休赛期');
        recText = tr('选秀大会进行中');
        progress = 100;
      } else {
        phaseText = tr('常规赛');
        recText = tr('常规赛 {pg}/{g} · {w}胜{l}负', { pg: team.regGames, g: REGULAR_GAMES, w: team.regWins, l: team.regGames - team.regWins });
        progress = Math.min(100, (team.regGames / REGULAR_GAMES) * 100);
      }
      setText('phase-' + idx, phaseText);
      setText('phaserec-' + idx, recText);
      setText('prog-' + idx, progress.toFixed(0) + '%');
      const fill = document.getElementById('fill-' + idx); if (fill) fill.style.width = progress + '%';
      setText('season-' + idx, team.season);
      setText('banners-' + idx, tr('{n} 次', { n: team.banners }));
      setText('bbonus-' + idx, tr('王朝加成 +{n}%', { n: Math.round(team.bannerBonus * 100) }));
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
        if (pn) pn.innerHTML = `${esc(playerLabel(p.cn))} <span class="star">★${p.rating}</span>`;
        setText('pd-' + idx + '-' + i, tr('{p} · Lv.{lv} · 产出 {o}/秒', { p: tr(pos.name), lv, o: fmt(pos.base * lv * ecoMul(team) * facilityOutputMul(team)) }));
      } else {
        if (avt) { avt.textContent = pos.key; avt.classList.remove('has-face'); }
        if (jno) jno.style.display = 'none';
        if (pn) pn.textContent = tr(pos.name);
        setText('pd-' + idx + '-' + i, tr('未签约 · 点击签下首位球星'));
      }
      setText('bc-' + idx + '-' + i, '💰' + fmt(cost));
      const btn = document.getElementById('buy-' + idx + '-' + i);
      if (btn) { btn.disabled = team.funds < cost || team.won; btn.firstChild.textContent = lv === 0 ? tr('签约') : tr('换强'); }
    });

    FACILITIES.forEach(f => {
      const owned = team.facilities[f.key], cost = facilityCost(team, f.key);
      setText('ulv-' + idx + '-' + f.key, 'Lv.' + owned);
      setText('uc-' + idx + '-' + f.key, '💰' + fmt(cost));
      const el = document.getElementById('upg-' + idx + '-' + f.key);
      if (el) el.classList.toggle('disabled', team.funds < cost || team.won);
    });

    setText('match-record-' + idx, tr('战绩 {w}胜 {l}负', { w: team.wins, l: team.matches - team.wins }));
    updateMatchCenter(idx);

    TASKS.forEach(t => {
      const prog = taskProgress(team, t);
      setText('tp-' + idx + '-' + t.key, tr('{prog}/{target}　奖励 💎{dia}', { prog, target: t.target, dia: t.reward.dia }));
      const fill = document.getElementById('tf-' + idx + '-' + t.key);
      if (fill) fill.style.width = (prog / t.target * 100) + '%';
      const cBtn = document.getElementById('tc-' + idx + '-' + t.key);
      if (cBtn) {
        if (team.claimed[t.key]) { cBtn.textContent = tr('已领取'); cBtn.disabled = true; cBtn.classList.add('done'); }
        else if (prog >= t.target) { cBtn.textContent = tr('领取'); cBtn.disabled = false; cBtn.classList.remove('done'); }
        else { cBtn.textContent = tr('进行中'); cBtn.disabled = true; cBtn.classList.remove('done'); }
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

  // ---------- 活动中心 ----------
  function openEventCenter() {
    ensureModal('event-center-modal').classList.add('show');
    renderEventCenter();
  }
  function closeEventCenter() { const m = document.getElementById('event-center-modal'); if (m) m.classList.remove('show'); }
  function actCardHTML(act) {
    let btn;
    if (act.action === 'recharge') {
      btn = `<button class="act-btn go" onclick="App.closeEventCenter();App.openStore('recharge')">${tr('前往充值')}</button>`;
    } else {
      const ok = actClaimable(act);
      const rewardTxt = `${act.dia ? '💎' + act.dia : ''}${act.fundSec ? tr(' 💰资金礼包') : ''}`.trim();
      btn = ok
        ? `<button class="act-btn" onclick="App.claimActivity('${act.id}')">${tr('领取 {r}', { r: rewardTxt })}</button>`
        : `<button class="act-btn done" disabled>${act.type === 'once' ? tr('已领取') : tr('今日已领')}</button>`;
    }
    return `<div class="act-item">
        <div class="act-ico">${act.icon}</div>
        <div class="act-info">
          <div class="act-n">${tr(act.name)}${act.tag ? `<span class="act-tag">${tr(act.tag)}</span>` : ''}</div>
          <div class="act-d">${tr(act.desc)}</div>
        </div>
        ${btn}
      </div>`;
  }
  function renderEventCenter() {
    const m = ensureModal('event-center-modal');
    const live = curEvent
      ? `<div class="act-live">${tr('⭐ 全服限时活动进行中：{name} · {desc}', { name: '<b>' + tr(curEvent.name) + '</b>', desc: tr(curEvent.desc) })}</div>`
      : '';
    const sections = Object.keys(ACTIVITIES).map(cat => {
      const meta = ACT_CAT_META[cat];
      return `<div class="act-sec">
          <div class="act-sec-h">${meta.icon} ${tr(meta.name)}</div>
          ${ACTIVITIES[cat].map(actCardHTML).join('')}
        </div>`;
    }).join('');
    m.innerHTML = `
      <div class="card wide" style="max-height:88vh;display:flex;flex-direction:column;overflow:hidden;">
        <div class="brand" style="margin-bottom:10px;"><h1 style="font-size:28px;">${tr('🎈 活动中心')}</h1></div>
        ${live}
        <div style="overflow-y:auto;padding-right:4px;">${sections}</div>
        <button class="btn" style="margin-top:14px;" onclick="App.closeEventCenter()">${tr('关闭')}</button>
      </div>`;
  }
  function findActivity(id) {
    for (const cat of Object.keys(ACTIVITIES)) {
      const a = ACTIVITIES[cat].find(x => x.id === id);
      if (a) return a;
    }
    return null;
  }
  function claimActivity(id) {
    const act = findActivity(id);
    if (!act || act.action === 'recharge') return;
    if (!actClaimable(act)) { Sound.play('error'); return toast(tr('该活动暂不可领取')); }
    let msg = '';
    if (act.dia) { addDiamonds(act.dia); msg += `💎+${act.dia} `; }
    if (act.fundSec) {
      const team = teams[0];
      if (team) {
        const gain = fundsPerSec(team) * act.fundSec + 100;
        team.funds += gain; team.totalEarned += gain;
        pushLog(team, tr('🎈 活动「{name}」奖励到账 +{g}', { name: tr(act.name), g: fmt(gain) }), 'win');
        msg += tr('资金+{g} ', { g: fmt(gain) });
        refreshTeam(0);
      }
    }
    setActClaim(id, act.type === 'once' ? 'done' : todayKey());
    Sound.play('reward'); Sound.vibrate([10, 30, 10]);
    toast(tr('领取成功！{m}', { m: msg }));
    renderEventCenter();
  }


  function renderStore(tab) {
    const m = ensureModal('store-modal');
    const rechargeHTML = `
      <div class="pkg-grid">
        ${PACKAGES.map(p => `
          <div class="pkg ${p.hot ? 'hot' : ''}" onclick="App.openPay('${p.key}')">
            <div class="pi">${p.icon}</div><div class="pname">${tr(p.name)}</div>
            <div class="pgem">💎 ${fmt(p.diamonds)}</div><div class="pgift">${p.gift ? tr(p.gift) : ''}</div>
            <div class="pprice">¥ ${p.price}</div>
          </div>`).join('')}
      </div>
      <p style="text-align:center;color:var(--muted);font-size:11px;margin-top:14px;">${tr('* 本游戏为原型演示，支付流程均为模拟，不会产生任何真实扣费。')}</p>`;

    const diamondHTML = `
      <p style="text-align:center;color:var(--muted);font-size:12px;margin-bottom:12px;">
        ${tr('当前余额')} 💎 <b id="gem-shop-balance" style="color:#9fe0ff">${fmt(getDiamonds())}</b>
        ${gameMode === 'dual' && teams[storeTeamIdx] ? tr('（作用于 {t}）', { t: esc(teamLabel(teams[storeTeamIdx].teamName)) }) : ''}</p>
      ${DIAMOND_ITEMS.map(it => `
        <div class="gem-shop-item">
          <div class="gsi-ico">${it.icon}</div>
          <div class="gsi-info"><div class="gsi-n">${tr(it.name)}</div><div class="gsi-d">${tr(it.desc)}</div></div>
          <button class="gem-buy" onclick="App.buyDiamondItem('${it.key}')">💎 ${it.cost}</button>
        </div>`).join('')}`;

    m.innerHTML = `
      <div class="card wide" style="max-height:88vh;display:flex;flex-direction:column;overflow:hidden;">
        <div class="brand" style="margin-bottom:10px;"><h1 style="font-size:28px;">${tr('球队商店')}</h1></div>
        <div class="store-tabs">
          <button class="store-tab ${tab === 'recharge' ? 'active' : ''}" onclick="App.renderStore('recharge')">${tr('🛒 钻石充值')}</button>
          <button class="store-tab ${tab === 'diamond' ? 'active' : ''}" onclick="App.renderStore('diamond')">${tr('💎 钻石商店')}</button>
        </div>
        <div style="overflow-y:auto;padding-right:4px;">${tab === 'recharge' ? rechargeHTML : diamondHTML}</div>
        <button class="btn" style="margin-top:14px;" onclick="App.closeStore()">${tr('关闭')}</button>
      </div>`;
    updateGemDisplays();
  }

  function openPay(pkgKey) {
    payingPkg = PACKAGES.find(p => p.key === pkgKey);
    if (!payingPkg) return;
    const m = ensureModal('pay-modal'); m.classList.add('show');
    m.innerHTML = `
      <div class="card" style="max-width:420px;">
        <div class="brand" style="margin-bottom:6px;"><h1 style="font-size:24px;">${tr('选择支付方式')}</h1></div>
        <div class="pay-amount">${payingPkg.icon} ${tr(payingPkg.name)}　💎 ${fmt(payingPkg.diamonds)} ${payingPkg.gift ? '（' + tr(payingPkg.gift) + '）' : ''}</div>
        <div class="pay-amount" style="margin-bottom:6px;">${tr('应付金额')} <b>¥ ${payingPkg.price}</b></div>
        <div class="pay-methods">
          <div class="pay-m gp"  onclick="App.doPay('Google Play')"><div class="pm-ico">▶</div><span>Google Play</span></div>
          <div class="pay-m wx"  onclick="App.doPay('微信支付')"><div class="pm-ico">💬</div><span>${tr('微信支付')}</span></div>
          <div class="pay-m ali" onclick="App.doPay('支付宝')"><div class="pm-ico">支</div><span>${tr('支付宝')}</span></div>
          <div class="pay-m ap"  onclick="App.doPay('Apple Pay')"><div class="pm-ico"></div><span>Apple Pay</span></div>
        </div>
        <button class="btn ghost" onclick="App.closePay()">${tr('取消支付')}</button>
      </div>`;
  }
  function closePay() { const m = document.getElementById('pay-modal'); if (m) m.classList.remove('show'); }

  function doPay(method) {
    if (!payingPkg) return;
    const m = ensureModal('pay-modal'), pkg = payingPkg;
    m.innerHTML = `
      <div class="card" style="max-width:380px;text-align:center;">
        <div class="brand" style="margin-bottom:6px;"><h1 style="font-size:22px;">${esc(tr(method))}</h1></div>
        <p style="color:var(--muted);font-size:13px;">${tr('正在跳转 {m} 安全支付…', { m: esc(tr(method)) })}</p>
        <div class="spinner"></div>
        <p style="color:var(--muted);font-size:12px;">${tr('订单金额 ¥{p} · 处理中，请稍候', { p: pkg.price })}</p>
      </div>`;
    setTimeout(() => {
      m.innerHTML = `
        <div class="card" style="max-width:380px;text-align:center;">
          <div class="pay-success">✅</div>
          <h2 style="color:var(--green);margin:10px 0;">${tr('支付成功')}</h2>
          <p style="color:var(--muted);font-size:13px;">${tr('通过 {m} 支付 ¥{p}', { m: '<b style="color:var(--txt)">' + esc(tr(method)) + '</b>', p: pkg.price })}</p>
          <p style="color:#9fe0ff;font-size:18px;font-weight:700;margin:10px 0;">💎 +${fmt(pkg.diamonds)}</p>
          <button class="btn" onclick="App.finishPay()">${tr('收下钻石')}</button>
        </div>`;
    }, 1500);
  }
  function finishPay() {
    if (payingPkg) {
      addDiamonds(payingPkg.diamonds);
      Sound.play('coin');
      teams.forEach(t => pushLog(t, tr('🛒 充值到账 💎{d}', { d: payingPkg.diamonds }), 'hl'));
      toast(tr('充值成功！💎 +{d}', { d: fmt(payingPkg.diamonds) }));
      payingPkg = null;
    }
    closePay(); renderStore('diamond');
  }

  function buyDiamondItem(key) {
    const it = DIAMOND_ITEMS.find(x => x.key === key);
    if (!it) return;
    if (getDiamonds() < it.cost) { Sound.play('error'); toast(tr('钻石不足，请先充值')); return; }
    const team = teams[storeTeamIdx] || teams[0];
    if (!team) return;
    addDiamonds(-it.cost);
    Sound.play('spend'); Sound.vibrate(12);
    if (it.type === 'cash') {
      const gain = Math.max(fundsPerSec(team) * it.sec, 100);
      team.funds += gain; team.totalEarned += gain;
      pushLog(team, tr('💵 钻石兑换资金 +{g}', { g: fmt(gain) }), 'hl'); toast(tr('获得资金 +{g}', { g: fmt(gain) }));
    } else if (it.type === 'boost') {
      team.boostUntil = Math.max(Date.now(), team.boostUntil) + it.sec * 1000;
      pushLog(team, tr('⚡ 双倍产出卡生效 {s}s', { s: it.sec }), 'hl'); toast(tr('双倍产出卡已生效'));
    } else if (it.type === 'perm') {
      team.permBonus += it.amt;
      pushLog(team, tr('🌟 永久产出 +{p}%', { p: Math.round(it.amt * 100) }), 'hl'); toast(tr('永久产出已提升'));
    } else if (it.type === 'refresh') {
      team.lastMatchAt = 0; runMatchCooldown(storeTeamIdx); toast(tr('比赛冷却已清除'));
    }
    refreshTeam(storeTeamIdx); renderStore('diamond');
  }

  function showOfflineModal(gain, sec) {
    const m = ensureModal('offline-modal'); m.classList.add('show');
    m.innerHTML = `
      <div class="card" style="max-width:360px;text-align:center;">
        <div style="font-size:54px;">🌙</div>
        <h2 style="color:var(--gold);margin:8px 0;">${tr('离线收益')}</h2>
        <p style="color:var(--muted);font-size:13px;">${tr('球队在你离开的 {t} 里继续运转', { t: fmtTime(sec) })}</p>
        <p style="color:var(--gold);font-size:22px;font-weight:700;margin:12px 0;">💰 +${fmt(gain)}</p>
        <button class="btn" onclick="App.closeOffline()">${tr('领取收益')}</button>
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
    standingsConf = team.conf || 'E';
    ensureModal('league-modal').classList.add('show');
    renderLeague();
  }
  function closeLeague() { const m = document.getElementById('league-modal'); if (m) m.classList.remove('show'); }
  function setLeagueTab(t) { leagueTab = t; renderLeague(); }
  function setStatBoard(b) { statBoard = b; renderLeague(); }
  function setStandingsConf(c) { standingsConf = c; renderLeague(); }
  function setStatGroup(g) { statGroup = g; renderLeague(); }

  function renderLeague() {
    const team = teams[leagueTeamIdx]; if (!team) return;
    const m = ensureModal('league-modal');
    const tabs = [
      { k: 'standings', n: tr('📊 球队排名') },
      { k: 'stats', n: tr('📈 数据榜') },
      { k: 'bracket', n: tr('🏆 季后赛对阵图') },
      { k: 'awards', n: tr('🏅 奖项') },
      { k: 'history', n: tr('📜 王朝史') },
    ];
    let body = '';
    if (leagueTab === 'standings') body = renderStandings(team);
    else if (leagueTab === 'stats') body = renderStatBoards(team);
    else if (leagueTab === 'bracket') body = renderBracket(team);
    else if (leagueTab === 'awards') body = renderAwards(team);
    else if (leagueTab === 'history') body = renderHistory(team);
    m.innerHTML = `
      <div class="card wide" style="max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
        <div class="brand" style="margin-bottom:8px;"><h1 style="font-size:24px;">${tr('🏀 联盟数据中心')}</h1>
          <div class="sub" style="font-size:12px;">${tr('第 {s} 赛季 · {t}', { s: team.season, t: esc(teamLabel(team.teamName)) })}</div></div>
        <div class="lg-modal-tabs">
          ${tabs.map(t => `<button class="lg-mtab ${leagueTab === t.k ? 'active' : ''}" onclick="App.setLeagueTab('${t.k}')">${t.n}</button>`).join('')}
        </div>
        <div class="lg-body" style="overflow-y:auto;padding-right:4px;flex:1;">${body}</div>
        <button class="btn" style="margin-top:12px;" onclick="App.closeLeague()">${tr('关闭')}</button>
      </div>`;
  }

  function renderStandings(team) {
    const conf = standingsConf;
    const confName = conf === 'E' ? tr('东部') : tr('西部');
    const arr = standings(team, conf);
    const phase = team.seasonPhase === 'playoff' ? tr('（季后赛进行中）')
      : team.seasonPhase === 'playin' ? tr('（附加赛进行中）')
      : team.seasonPhase === 'offseason' ? tr('（赛季已结束）')
      : tr('（常规赛 {pg}/{g}）', { pg: team.regGames, g: REGULAR_GAMES });
    const rows = arr.map((t, i) => {
      const gp = t.w + t.l, wp = gp ? (t.w / gp * 100).toFixed(1) : '0.0';
      const rank = i + 1;
      let seedCls = 'seed', zone = '';
      if (rank <= DIRECT_SEEDS) { zone = 'z-direct'; }
      else if (rank <= PLAYIN_HIGH) { seedCls = 'seed playin'; zone = 'z-playin'; }
      else { seedCls = 'seed out'; }
      return `<tr class="${t.isPlayer ? 'me' : ''} ${zone}">
        <td style="text-align:center"><span class="${seedCls}">${rank}</span></td>
        <td>${esc(teamLabel(t.name))}${t.isPlayer ? ` <span class="metag">${tr('我')}</span>` : ''}</td>
        <td style="text-align:center">${t.w}</td>
        <td style="text-align:center">${t.l}</td>
        <td style="text-align:center">${wp}%</td>
      </tr>`;
    }).join('');
    return `<div class="lg-subtabs">
        <button class="lg-stab ${conf === 'E' ? 'active' : ''}" onclick="App.setStandingsConf('E')">${tr('东部')}</button>
        <button class="lg-stab ${conf === 'W' ? 'active' : ''}" onclick="App.setStandingsConf('W')">${tr('西部')}</button>
        ${team.conf === conf ? `<span class="lg-gap"></span><span class="metag">${tr('你的分区')}</span>` : ''}
      </div>
      <p class="lg-note">${tr('{conf}排名 {phase}　{a} 直接晋级季后赛，{b} 进入附加赛', { conf: confName, phase: phase, a: '<b style="color:var(--gold)">1-6</b>', b: '<b style="color:var(--orange)">7-10</b>' })}</p>
      <table class="lg-table">
        <thead><tr><th>${tr('名次')}</th><th>${tr('球队')}</th><th>${tr('胜')}</th><th>${tr('负')}</th><th>${tr('胜率')}</th></tr></thead>
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
          <td>${esc(playerLabel(p.name))}${p.isMine ? ` <span class="metag">${tr('我')}</span>` : ''}<div class="sub2">${esc(teamLabel(p.team))} · ${p.pos} · ★${p.rating}</div></td>
          <td style="text-align:right;font-weight:700;color:var(--gold)">${st.pct ? p.stats[st.key] + '%' : p.stats[st.key]}</td>
        </tr>`).join('');
        return `<div class="stat-card"><div class="stat-h">${tr('{n}王', { n: tr(st.name) })}</div>
          <table class="lg-table mini"><tbody>${rows}</tbody></table></div>`;
      }).join('');
    } else {
      // 球队榜：战绩 + 场均得分
      const off = teamRankBy(team, 'off');
      const rows = off.map((o, i) => `<tr class="${o.t.isPlayer ? 'me' : ''}">
        <td style="text-align:center">${i + 1}</td>
        <td>${esc(teamLabel(o.t.name))}${o.t.isPlayer ? ` <span class="metag">${tr('我')}</span>` : ''}</td>
        <td style="text-align:center">${o.t.w}-${o.t.l}</td>
        <td style="text-align:right;font-weight:700;color:var(--gold)">${o.val.toFixed(1)}</td>
      </tr>`).join('');
      inner = `<div class="stat-card"><div class="stat-h">${tr('球队进攻榜（场均得分总和）')}</div>
        <table class="lg-table"><thead><tr><th>#</th><th>${tr('球队')}</th><th>${tr('战绩')}</th><th style="text-align:right">${tr('场均得分')}</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
    }
    return `<div class="lg-subtabs">
        <button class="lg-stab ${statBoard === 'player' ? 'active' : ''}" onclick="App.setStatBoard('player')">${tr('个人榜')}</button>
        <button class="lg-stab ${statBoard === 'team' ? 'active' : ''}" onclick="App.setStatBoard('team')">${tr('球队榜')}</button>
        ${statBoard === 'player' ? `<span class="lg-gap"></span>
          <button class="lg-stab ${statGroup === 'basic' ? 'active' : ''}" onclick="App.setStatGroup('basic')">${tr('基础数据')}</button>
          <button class="lg-stab ${statGroup === 'adv' ? 'active' : ''}" onclick="App.setStatGroup('adv')">${tr('高阶数据')}</button>` : ''}
      </div>
      <div class="stat-grid">${inner}</div>`;
  }

  function renderBracket(team) {
    const br = team.league.bracket;
    if (!br) return `<p class="lg-note">${tr('季后赛对阵图将在<b>常规赛（及附加赛）结束</b>后、按东西部战绩种子排定生成。')}</p>`;
    const titles = [tr('首轮'), tr('分区半决赛'), tr('分区决赛')];
    const live = team.seasonPhase === 'playoff';
    const seriesCell = (m) => {
      if (!m) return `<div class="bk-match empty">${tr('待定')}</div>`;
      const aWin = m.winner && m.a && m.winner.name === m.a.name, bWin = m.winner && m.b && m.winner.name === m.b.name;
      const line = (t, won, score) => t ? `<div class="bk-team ${t.isPlayer ? 'me' : ''} ${won ? 'win' : (m.winner ? 'out' : '')}">
        <span class="bk-seed">${t.seed || ''}</span><span class="bk-name">${esc(teamLabel(t.name))}</span><span class="bk-score">${score}</span></div>` : `<div class="bk-team empty">${tr('待定')}</div>`;
      const playerHere = m.hasPlayer && !m.winner && live;
      return `<div class="bk-match ${playerHere ? 'live' : ''}">
        ${line(m.a, aWin, m.a && m.a.isPlayer && live ? team.seriesWins : m.aw)}
        ${line(m.b, bWin, m.b && m.b.isPlayer && live ? team.seriesLosses : m.bw)}
        ${playerHere ? `<div class="bk-live">${tr('进行中')}</div>` : ''}
      </div>`;
    };
    const confCols = (confBr) => (confBr.rounds.map((round, ri) =>
      `<div class="bk-col"><div class="bk-title">${titles[ri]}</div>${(round && round.length) ? round.map(seriesCell).join('') : `<div class="bk-match empty">${tr('待定')}</div>`}</div>`
    ).join(''));
    const finalsCol = `<div class="bk-col"><div class="bk-title" style="color:var(--gold)">${tr('总决赛')}</div>${seriesCell(br.finals)}</div>`;
    const champ = br.champion ? `<div class="bk-champ">${tr('🏆 总冠军：')}<b>${esc(teamLabel(br.champion.name))}</b>${br.champion.isPlayer ? tr('（你的球队！）') : ''}</div>` : '';
    return `<p class="lg-note">${tr('东西部各 8 队 · 7局4胜 · <span class="metag">我</span> 标注你的球队')}</p>
      <div class="bk-conf"><div class="bk-conf-h east">${tr('🟦 东部')}</div><div class="bracket">${confCols(br.east)}</div></div>
      <div class="bk-conf finals"><div class="bk-conf-h gold">${tr('🏆 总决赛')}</div><div class="bracket">${finalsCol}</div></div>
      <div class="bk-conf"><div class="bk-conf-h west">${tr('🟥 西部')}</div><div class="bracket">${confCols(br.west)}</div></div>
      ${champ}`;
  }

  function renderAwards(team) {
    if (!team.awards) return `<p class="lg-note">${tr('个人奖项将在<b>常规赛结束</b>时颁发，总决赛 FMVP 在夺冠后颁发。')}</p>`;
    const a = team.awards;
    const card = (def) => {
      const w = a[def.key];
      if (!w) return '';
      return `<div class="award-card ${w.isMine ? 'me' : ''}">
        <div class="aw-ico">${def.icon}</div>
        <div class="aw-info"><div class="aw-name">${tr(def.name)}</div>
          <div class="aw-win">${esc(playerLabel(w.name))}${w.isMine ? ` <span class="metag">${tr('我')}</span>` : ''} <span class="sub2">★${w.rating}</span></div>
          <div class="aw-stat">${tr('{p} 分 · {r} 板 · {a} 助 · {s} 断 · {b} 帽', { p: w.stats.pts, r: w.stats.reb, a: w.stats.ast, s: w.stats.stl, b: w.stats.blk })}</div>
        </div></div>`;
    };
    const fmvp = team.fmvp ? `<div class="award-card me" style="border-color:var(--gold)">
        <div class="aw-ico">🏆</div>
        <div class="aw-info"><div class="aw-name">${tr('总决赛 FMVP')}</div>
          <div class="aw-win">${esc(playerLabel(team.fmvp.name))} <span class="metag">${tr('我')}</span> <span class="sub2">★${team.fmvp.rating}</span></div>
          <div class="aw-stat">${tr('{p} 分 · {r} 板 · {a} 助', { p: team.fmvp.stats.pts, r: team.fmvp.stats.reb, a: team.fmvp.stats.ast })}</div>
        </div></div>` : '';
    return `<p class="lg-note">${tr('第 {s} 赛季个人奖项', { s: team.season })}</p><div class="award-grid">${AWARDS.map(card).join('')}${fmvp}</div>`;
  }

  function renderHistory(team) {
    const h = team.history || [];
    if (!h.length) return `<p class="lg-note">${tr('完成赛季后，这里会记录历届总冠军、FMVP 与各项常规赛奖项。')}</p>`;
    const rows = h.map(r => `<tr class="${r.isMine ? 'me' : ''}">
      <td style="text-align:center">S${r.season}</td>
      <td>${esc(teamLabel(r.champion))}${r.isMine ? ' 🏆' : ''}</td>
      <td>${esc(playerLabel(r.mvp))}</td>
      <td>${esc(playerLabel(r.fmvp))}</td>
      <td>${esc(playerLabel(r.dpoy))}</td>
      <td>${esc(playerLabel(r.roy))}</td>
    </tr>`).join('');
    return `<table class="lg-table"><thead><tr><th>${tr('赛季')}</th><th>${tr('总冠军')}</th><th>MVP</th><th>FMVP</th><th>DPOY</th><th>ROY</th></tr></thead>
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
      <div class="aw-info"><div class="aw-name">${tr(def.name)}</div>
        <div class="aw-win">${esc(playerLabel(w.name))}${w.isMine ? ' <span class="metag">' + tr('我') + '</span>' : ''} <span class="sub2">★${w.rating}</span></div>
        <div class="aw-stat">${tr('{p}分 {r}板 {a}助', { p: w.stats.pts, r: w.stats.reb, a: w.stats.ast })}</div></div></div>` : '';
    const btnText = eliminated ? tr('进入选秀大会') : (team.seasonPhase === 'playin' ? tr('🎫 出战附加赛') : tr('进军季后赛'));
    m.innerHTML = `
      <div class="card" style="max-width:480px;max-height:88vh;overflow-y:auto;">
        <div class="brand" style="margin-bottom:8px;"><h1 style="font-size:24px;">${tr('🏅 常规赛颁奖典礼')}</h1>
          <div class="sub" style="font-size:12px;">${tr('第 {s} 赛季', { s: team.season })}</div></div>
        <div class="award-grid">${AWARDS.map(d => item(d, a[d.key])).join('')}</div>
        <button class="btn" style="margin-top:14px;" onclick="App.closeCeremony()">${btnText}</button>
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
        <h2>${tr('总冠军！')}</h2>
        <p style="margin-bottom:10px;">${tr('{team} 夺得第 {n} 座总冠军', { team: esc(teamLabel(team.teamName)), n: team.banners })}<br>${tr('王朝加成 +5%　💎 +{dia}', { dia: dia })}</p>
        ${f ? `<div class="award-card me" style="border-color:var(--gold);text-align:left;">
          <div class="aw-ico">⭐</div>
          <div class="aw-info"><div class="aw-name">${tr('总决赛 FMVP')}</div>
            <div class="aw-win">${esc(playerLabel(f.name))} <span class="metag">${tr('我')}</span> <span class="sub2">★${f.rating}</span></div>
            <div class="aw-stat">${tr('{p}分 {r}板 {a}助 {s}断 {b}帽', { p: f.stats.pts, r: f.stats.reb, a: f.stats.ast, s: f.stats.stl, b: f.stats.blk })}</div></div></div>` : ''}
        <button class="btn" style="margin-top:16px;" onclick="App.closeFmvp(${idx})">${tr('进入选秀大会')}</button>
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
        <div class="dft-tag">${tr(p.tag)}</div>
        <div class="dft-pos">${p.pos}</div>
        <div class="dft-name">${esc(playerLabel(p.name))}</div>
        <div class="dft-rating">${tr('潜力评级')} <b>★${p.rating}</b></div>
        <button class="btn sm" style="margin-top:8px;width:100%;">${tr('选中他')}</button>
      </div>`).join('');
    m.innerHTML = `
      <div class="card wide" style="max-width:640px;max-height:88vh;overflow-y:auto;">
        <div class="brand" style="margin-bottom:8px;"><h1 style="font-size:24px;">${tr('🎓 选秀大会')}</h1>
          <div class="sub" style="font-size:12px;">${tr('第 {s} 赛季新秀 · 选择一名加入球队（提升战力，可竞争最佳新秀）', { s: team.season + 1 })}</div></div>
        <div class="draft-grid">${cards}</div>
        <p style="text-align:center;color:var(--muted);font-size:11px;margin-top:10px;">${tr('新秀将作为替补深度提升球队战力，并在下赛季有资格竞争 ROY。')}</p>
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
    pushLog(team, tr('🎓 选秀：{pos} {name}（★{r}）加盟！', { pos: p.pos, name: playerLabel(p.name), r: p.rating }), 'win');
    toast(tr('选中 {name}（★{r}）', { name: playerLabel(p.name), r: p.rating }));
    const m = document.getElementById('draft-modal'); if (m) m.classList.remove('show');
    startNextSeason(team);
    refreshTeam(idx);
    runMatchCooldown(idx);
  }

  // =========================================================
  // 存档 / 退出
  // =========================================================
  function manualSave() {
    if (gameMode !== 'single') return toast(tr('双人对战不支持存档'));
    const team = teams[0], accounts = getAccounts(), u = curUser();
    if (!accounts[u]) return toast(tr('账户异常'));
    if (!accounts[u].saves) accounts[u].saves = [];
    const save = {
      timestamp: Date.now(), teamName: team.teamName, diff: team.diff, funds: team.funds,
      season: team.season, seasonTarget: team.seasonTarget, banners: team.banners,
      bannerBonus: team.bannerBonus, permBonus: team.permBonus,
      players: team.players, facilities: team.facilities, totalEarned: team.totalEarned,
      matches: team.matches, wins: team.wins,
      seasonPhase: team.seasonPhase, regGames: team.regGames, regWins: team.regWins,
      conf: team.conf, playin: team.playin,
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
            <p><b>赛季中心</b>：发起比赛，<b>胜率由双方战力决定</b>。签强/升级球员、升级设施都会真实提升<b>战力</b>，从而提高胜率；每场都会显示对手球队的<b>首发阵容</b>。</p>
            <p><b>球队任务</b>：完成投篮/签约/比赛等成就，领取资金与钻石奖励。</p>
            <p><b>离线收益</b>：保存退出后，再次读档将自动结算离线期间收益（封顶 8 小时），<b>战绩、赛季进度也会一并保存</b>。</p></div>
          <div class="rule-block"><h3>⭐ 限时活动</h3>
            <p>全服轮换：全明星周末（产出×2）、季后赛奖金（比赛×3）、球迷狂欢节（点击×4）、选秀大会（签约-40%）、总决赛热潮（全场×2.5），把握时机收益翻倍。</p></div>
          <div class="rule-block"><h3>🏆 真实赛制 · 可持续王朝（单人）</h3>
            <p><b>联盟</b>：30 支真实球队分<b>东、西部各 15 队</b>，玩家归属东部。常规赛打 <b>${REGULAR_GAMES}</b> 场，全联盟战绩同步推进。</p>
            <p><b>排名与晋级</b>：按分区胜率排名，本区<b>前 6 名直接晋级</b>季后赛；<b>第 7-10 名</b>进入<b>附加赛</b>争夺最后 2 个席位。</p>
            <p><b>季后赛</b>：东西部各 8 队，依次进行<b>首轮 → 分区半决赛 → 分区决赛</b>（均为 <b>7局4胜</b>），两区冠军会师<b>总决赛</b>决出总冠军。</p>
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
    const qLabels = { high: tr('高'), medium: tr('中'), low: tr('低') };
    const langOpts = [{ k: 'zh', label: '中文' }, { k: 'en', label: 'English' }];
    m.innerHTML = `
      <div class="card" style="max-width:440px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;">
        <div class="brand" style="margin-bottom:10px;"><h1 style="font-size:26px;">${tr('⚙️ 游戏设置')}</h1></div>
        <div style="overflow-y:auto;padding-right:6px;">
          <div class="set-group">
            <h3>${tr('🌐 语言')}</h3>
            <div class="set-row">
              <div><div class="sl">${tr('游戏语言')}</div><div class="sd">${tr('切换界面语言（中文 / English）')}</div></div>
              <div class="q-btns">
                ${langOpts.map(o => `<button class="q-btn ${LANG === o.k ? 'active' : ''}" onclick="App.setLang('${o.k}')">${o.label}</button>`).join('')}
              </div>
            </div>
          </div>
          <div class="set-group">
            <h3>${tr('🔊 音频')}</h3>
            <div class="set-row">
              <div><div class="sl">${tr('背景音乐')}</div><div class="sd">${tr('主界面与游戏中循环播放')}</div></div>
              <div class="sc">${sw('musicOn', s.musicOn)}</div>
            </div>
            <div class="set-row">
              <div class="sl">${tr('音乐音量')}</div>
              <div class="sc"><input type="range" class="vol" min="0" max="100" value="${Math.round(s.musicVol * 100)}" oninput="App.setSetting('musicVol',this.value/100)"></div>
            </div>
            <div class="set-row">
              <div><div class="sl">${tr('音效')}</div><div class="sd">${tr('点击 · 投篮 · 签约 · 消耗 · 胜负')}</div></div>
              <div class="sc">${sw('sfxOn', s.sfxOn)}</div>
            </div>
            <div class="set-row">
              <div class="sl">${tr('音效音量')}</div>
              <div class="sc"><input type="range" class="vol" min="0" max="100" value="${Math.round(s.sfxVol * 100)}" oninput="App.setSetting('sfxVol',this.value/100)" onchange="App.previewSfx()"></div>
            </div>
          </div>
          <div class="set-group">
            <h3>${tr('🖥️ 画质')}</h3>
            <div class="set-row">
              <div><div class="sl">${tr('画质等级')}</div><div class="sd">${tr('低画质关闭动画/阴影，提升弱机型流畅度')}</div></div>
              <div class="q-btns">
                ${['high', 'medium', 'low'].map(q => `<button class="q-btn ${s.quality === q ? 'active' : ''}" onclick="App.setSetting('quality','${q}')">${qLabels[q]}</button>`).join('')}
              </div>
            </div>
          </div>
          <div class="set-group">
            <h3>${tr('🎨 背景')}</h3>
            <div class="set-row">
              <div><div class="sl">${tr('游戏背景')}</div><div class="sd">${tr('选择喜欢的主题背景，自动保存')}</div></div>
            </div>
            <div class="bg-grid">
              ${BACKGROUNDS.map(b => `<button class="bg-opt ${s.bg === b.key ? 'active' : ''}" onclick="App.setSetting('bg','${b.key}')"><span class="bg-sw bg-sw-${b.key}"></span>${tr(b.name)}</button>`).join('')}
            </div>
          </div>
          <div class="set-group">
            <h3>${tr('📳 其他')}</h3>
            <div class="set-row">
              <div><div class="sl">${tr('震动反馈')}</div><div class="sd">${tr('在支持的设备上点击时震动')}</div></div>
              <div class="sc">${sw('vibrate', s.vibrate)}</div>
            </div>
          </div>
          <p style="text-align:center;color:var(--muted);font-size:11px;margin-top:6px;">${tr('设置自动保存，下次启动依然生效')}</p>
        </div>
        <button class="btn" style="margin-top:14px;" onclick="App.closeSettings()">${tr('完成')}</button>
      </div>`;
  }
  function setSetting(key, val) {
    if (key === 'musicOn') Sound.setMusic(val);
    else Sound.set(key, val);
    if (key === 'sfxOn' && val) Sound.play('click');
    // 仅开关/画质/背景需要重绘以更新选中态；滑块拖动时不重绘，避免打断操作
    if (key === 'quality' || key === 'musicOn' || key === 'sfxOn' || key === 'bg') { Sound.play('click'); renderSettings(); }
  }
  // 切换语言：保存到设置，更新 LANG，重绘当前界面与静态文案
  function setLang(v) {
    const lang = (v === 'en') ? 'en' : 'zh';
    if (lang === LANG) return;
    LANG = lang;
    Sound.set('lang', lang);
    Sound.play('click');
    applyI18nStatic();
    renderSettings();
    // 重绘游戏内两侧球队面板（若在游戏中）
    try {
      const gameScreen = document.getElementById('screen-game');
      if (gameScreen && gameScreen.classList.contains('active') && Array.isArray(teams) && teams.length) {
        buildArena();
        renderTopActions();
      }
    } catch (e) {}
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

  // ---------- 全屏 ----------
  // 是否已处于独立/全屏运行（PWA 主屏启动或浏览器全屏）
  function isStandaloneOrFs() {
    return window.matchMedia('(display-mode: fullscreen)').matches
      || window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
      || !!document.fullscreenElement;
  }
  // 根据当前状态刷新全屏按钮的显隐与图标
  function refreshFsBtn() {
    const btn = document.getElementById('fs-btn');
    if (!btn) return;
    // PWA 主屏启动（standalone/fullscreen）时本就全屏，隐藏按钮
    const pwa = window.matchMedia('(display-mode: fullscreen)').matches
      || window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    if (pwa) { btn.style.display = 'none'; return; }
    btn.style.display = '';
    btn.textContent = document.fullscreenElement ? '🗗' : '⛶';
    btn.title = document.fullscreenElement ? '退出全屏' : '进入全屏';
  }
  function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen || function(){}).call(document);
      } else {
        const el = document.documentElement;
        (el.requestFullscreen || el.webkitRequestFullscreen || function(){ toast && toast('当前设备不支持网页全屏，请用"添加到主屏幕"'); }).call(el);
      }
    } catch { toast && toast('全屏切换失败'); }
    setTimeout(refreshFsBtn, 200);
  }

  // ---------- 启动 ----------
  // 静态界面本地化：根据 data-i18n / data-i18n-ph / data-i18n-title 属性翻译
  function applyI18nStatic() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key != null) el.innerHTML = tr(key);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      if (key != null) el.setAttribute('placeholder', tr(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key != null) el.setAttribute('title', tr(key));
    });
    // <html lang> 同步
    try { document.documentElement.setAttribute('lang', LANG === 'en' ? 'en' : 'zh-CN'); } catch (e) {}
  }
  function init() {
    refreshFsBtn();
    applyI18nStatic();
    document.addEventListener('fullscreenchange', refreshFsBtn);
    document.addEventListener('webkitfullscreenchange', refreshFsBtn);
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
    openEventCenter, closeEventCenter, claimActivity,
    openLeague, closeLeague, setLeagueTab, setStatBoard, setStatGroup, setStandingsConf,
    closeCeremony, closeFmvp, openDraft, draftPick,
    manualSave, quitToMenu, showRules, closeRules, backToMenuFromVictory,
    openSettings, closeSettings, renderSettings, setSetting, previewSfx, setLang,
    openMatchReport, closeMatchReport, viewMatchReport, backMatchReportList,
    openSweep, closeSweep, doSweep,
    toggleFullscreen,
  };
})();
