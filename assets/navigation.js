/* Shared, root-relative hierarchy. Categories describe use, not filesystem folders. */
(() => {
  const categories = {
    tools: { image:['图片处理','Images'], text:['文本与编码','Text & encoding'], document:['文档办公','Documents'], time:['时间管理','Time'], lifestyle:['生活与趣味','Everyday & fun'], media:['媒体工具','Media'] },
    games: { board:['棋类对弈','Board games'], strategy:['策略战争','Strategy'], sports:['体育竞技','Sports'], arcade:['动作街机','Arcade'], puzzle:['益智休闲','Puzzles'] }
  };
  const sections = {
    'index.html':['首页','Home'], 'tools.html':['在线工具','Tools'], 'games.html':['游戏厅','Games'], 'tours.html':['3D云游','3D Tours'],
    'blog.html':['博客笔记','Blog'], 'novels/index.html':['小说连载','Reading'], 'software.html':['软件作品','Software'],
    'ai-radar.html':['AI 雷达','AI Radar'], 'directory.html':['电话黄页','Directory'], 'brand-blacklist/index.html':['品牌黑名单','Brand blacklist']
  };
  const item = (href, names) => ({href, zh:names[0], en:names[1]});
  const countries = {
    china: { names:['中国','China'], regions:{ beijing:['北京','Beijing'] } }
  };
  const destinations = {
    tiantan:['天坛','Temple of Heaven'],
    'forbidden-city':['故宫','Forbidden City'],
    'summer-palace':['颐和园','Summer Palace'],
    'beijing-zoo':['北京动物园','Beijing Zoo']
  };
  function resolveTour(path, search, title) {
    const params = new URLSearchParams(search);
    const parts = path.startsWith('tours/') ? path.split('/') : [];
    const countryKey = parts[1] || params.get('country');
    const country = Object.hasOwn(countries, countryKey) ? countryKey : null;
    const regionKey = parts[2] || params.get('region');
    const region = country && Object.hasOwn(countries[country].regions, regionKey) ? regionKey : null;
    const crumbs = [item('index.html',sections['index.html']),item('tours.html',sections['tours.html'])];
    if (country) crumbs.push(item(`tours.html?country=${country}`,countries[country].names));
    if (region) crumbs.push(item(`tours.html?country=${country}&region=${region}`,countries[country].regions[region]));
    if (parts[3]) crumbs.push(item(path + search,destinations[parts[3]] || [title || '景点',title || 'Destination']));
    return {family:'tours',section:'tours.html',category:null,country,region,crumbs,parent:crumbs.at(-2)};
  }
  const titles = {
    'text-diff':['文本差异比对','Text diff'],
    'image-compressor':['图片压缩','Image compressor'], 'image-cropper':['图片裁剪','Image cropper'], 'batch-image-cropper':['批量图片裁剪','Batch image cropper'], 'image-watermark-editor':['图片水印与 EXIF 编辑器','Watermark & EXIF editor'],
    'case-converter':['大小写转换','Case converter'], 'text-deduplicator':['文本去重','Text deduplicator'], 'text-formatter':['文本格式化','Text formatter'], 'json-formatter':['JSON 格式化','JSON formatter'], 'word-counter':['字数统计','Word counter'], 'qr-generator':['二维码生成','QR generator'],
    'eq-pinyin-code':['EQ 单字拼音域代码生成器','Pinyin EQ field generator'], 'ppt-countdown':['PPT 放映悬浮倒计时','Floating presentation timer'], 'work-countdown':['下班倒计时','Work countdown'], 'countdown':['自定义倒计时','Countdown'],
    'meal-randomizer':['吃啥饭','Meal picker'], 'child-gender-simulator':['子女性别娱乐模拟器','Random gender simulator'], 'lightning-calculator':['雷击概率娱乐计算器','Lightning probability game'], 'vip-video-parser':['VIP 视频解析','Video parser'],
    'gomoku':['五子棋','Gomoku'], 'chinese-chess':['中国象棋','Chinese chess'], 'junqi':['军棋','Junqi'], 'frontline-command':['前线指挥','Frontline Command'], 'tower-defense':['星环塔防','Star Ring Defense'], 'storm-siege':['风暴攻城','Storm Siege'], 'free-kick':['弧线任意球','Curve Free Kick'], 'three-kingdoms-baye':['三国霸业','Three Kingdoms: Baye'], 'xiuxian':['我的文字修仙全靠刷','Text Cultivation'], 'tetris':['俄罗斯方块','Tetris'], 'fruit-ninja':['水果忍者','Fruit Ninja'], 'submarine-battle':['潜艇大战','Deep Sea Hunter'], 'parking-challenge':['停车场倒车挑战','Parking Challenge'], 'parking-pulse':['停车脉冲','Parking Pulse'], 'sand-sort':['沙子分类','Sand Sort'], 'snake':['贪吃蛇','Snake'], 'plane':['飞机大战','Plane Battle'], 'tank':['坦克大战','Tank Battle'], 'birds':['愤怒的小鸟','Angry Birds'], 'match':['消消乐','Match Three'], 'stars':['星图','Star Map'], 'difference':['大家来找茬','Spot the Difference']
  };
  function resolve(path, search = '', title = '') {
    path = path || 'index.html';
    if (path === 'tours.html' || path.startsWith('tours/')) return resolveTour(path, search, title);
    const params = new URLSearchParams(search);
    const family = /^(tools|games)(\/|\.html$)/.exec(path)?.[1];
    const detail = path.startsWith('tools/') || path.startsWith('games/');
    let category = detail ? path.split('/')[1] : params.get('category');
    if (family === 'tools') category = ({utility:'text', fun:'lifestyle'})[category] || category;
    if (!Object.hasOwn(categories[family] || {}, category)) category = null;
    const section = family ? `${family}.html` : path.startsWith('novels/') ? 'novels/index.html' : path.startsWith('brand-blacklist/') ? 'brand-blacklist/index.html' : path.startsWith('blog') ? 'blog.html' : path;
    const crumbs = [item('index.html',sections['index.html'])];
    if (section !== 'index.html' && sections[section]) crumbs.push(item(section, sections[section]));
    if (category) crumbs.push(item(`${family}.html?category=${category}`,categories[family][category]));
    if (path === 'novels/reader.html') crumbs.push(item('novels/index.html#zero-echo',['零号回声','Zero Echo']));
    const slug = path.replace(/\/index\.html$/, '').split('/').at(-1).replace(/\.html$/, '');
    if (detail || (section !== path && !sections[path])) crumbs.push(item(path + search,titles[slug] || [title || '详情', title || 'Details']));
    return {family, section, category, crumbs, parent:crumbs.length > 1 ? crumbs[crumbs.length - 2] : null};
  }
  window.PHDSXNavigation = {categories, sections, countries, destinations, resolve};
})();
