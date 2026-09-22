/* Shared, root-relative hierarchy. Categories describe use, not filesystem folders. */
(() => {
  const categories = {
    tools: { image:['图片处理','Images'], text:['文本与编码','Text & encoding'], document:['文档办公','Documents'], time:['时间管理','Time'], lifestyle:['生活与趣味','Everyday & fun'], media:['媒体工具','Media'] },
    games: { board:['棋类对弈','Board games'], arcade:['动作街机','Arcade'], puzzle:['益智休闲','Puzzles'] }
  };
  const sections = {
    'index.html':['首页','Home'], 'tools.html':['在线工具','Tools'], 'games.html':['游戏厅','Games'],
    'blog.html':['博客笔记','Blog'], 'novels/index.html':['小说连载','Reading'], 'software.html':['软件作品','Software'],
    'ai-radar.html':['AI 雷达','AI Radar'], 'directory.html':['电话黄页','Directory'], 'brand-blacklist/index.html':['品牌黑名单','Brand blacklist']
  };
  const item = (href, names) => ({href, zh:names[0], en:names[1]});
  const titles = {
    'image-compressor':['图片压缩','Image compressor'], 'image-cropper':['图片裁剪','Image cropper'], 'batch-image-cropper':['批量图片裁剪','Batch image cropper'], 'image-watermark-editor':['图片水印与 EXIF 编辑器','Watermark & EXIF editor'],
    'case-converter':['大小写转换','Case converter'], 'text-deduplicator':['文本去重','Text deduplicator'], 'text-formatter':['文本格式化','Text formatter'], 'word-counter':['字数统计','Word counter'], 'qr-generator':['二维码生成','QR generator'],
    'eq-pinyin-code':['EQ 单字拼音域代码生成器','Pinyin EQ field generator'], 'ppt-countdown':['PPT 放映悬浮倒计时','Floating presentation timer'], 'work-countdown':['下班倒计时','Work countdown'], 'countdown':['自定义倒计时','Countdown'],
    'meal-randomizer':['吃啥饭','Meal picker'], 'child-gender-simulator':['子女性别娱乐模拟器','Random gender simulator'], 'lightning-calculator':['雷击概率娱乐计算器','Lightning probability game'], 'vip-video-parser':['VIP 视频解析','Video parser'],
    'gomoku':['五子棋','Gomoku'], 'chinese-chess':['中国象棋','Chinese chess'], 'junqi':['军棋','Junqi'], 'tetris':['俄罗斯方块','Tetris'], 'fruit-ninja':['水果忍者','Fruit Ninja'], 'submarine-battle':['潜艇大战','Deep Sea Hunter'], 'parking-pulse':['停车脉冲','Parking Pulse'], 'sand-sort':['沙子分类','Sand Sort']
  };
  function resolve(path, search = '', title = '') {
    path = path || 'index.html';
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
  window.PHDSXNavigation = {categories, sections, resolve};
})();
