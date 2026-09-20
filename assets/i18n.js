(function () {
  const STORAGE_KEY = 'phdsx-language';
  const LANGUAGE_PARAM = 'lang';
  const languages = { zh: 'zh-CN', en: 'en' };
  const languageAliases = { zh: 'zh', 'zh-cn': 'zh', chinese: 'zh', en: 'en', 'en-us': 'en', english: 'en' };
  const messages = {
    'home.personalTitle': ['PHDSX · 个人主页', 'PHDSX · Personal homepage'],
    'home.personalHeading': ['PHDSX 的个人主页', 'PHDSX’s personal homepage'],
    'home.personalIntro': ['学习笔记、个人作品与一些有趣的小东西。', 'Learning notes, personal projects and a few things just for fun.'],
    'home.personalLinks': ['个人内容', 'Personal pages'],
    'home.smallTools': ['在线小工具', 'Handy tools'],
    'home.smallToolsHelp': ['按用途筛选，直接打开。', 'Filter by purpose. Open a tool directly.'],
    'home.toolsTitle': ['全部工具', 'All tools'],
    'home.toolsHelp': ['按用途选择，点击即可使用。', 'Browse by purpose. Open any tool directly.'],
    'home.toolsDescription': ['按用途浏览、搜索和筛选实用在线工具。', 'Browse, search and filter useful online tools by purpose.'],
    'home.toolsNoScript': ['可直接打开下方工具；启用 JavaScript 后可搜索和筛选。', 'Open any tool below. Enable JavaScript to search and filter.'],
    'directory.noScript': ['启用 JavaScript 后可使用搜索和筛选；也可以直接打开上方工具。', 'Enable JavaScript to search and filter, or open any tool above.'],
    "porcelain.0": ["好工具，让日常更轻松。", "Good tools. Easier days."],
    "porcelain.1": ["工具、阅读与灵感，一个顺手的起点。", "Tools, reading and inspiration. Your everyday starting point."],
    "porcelain.2": ["搜索你需要的工具", "Find the tool you need"],
    "porcelain.3": ["让小事更简单", "Make everyday tasks easier"],
    "porcelain.4": ["博客笔记", "Blog & notes"],
    "porcelain.5": ["小说连载", "Serial fiction"],
    "porcelain.6": ["电话黄页", "Phone directory"],
    "porcelain.7": ["PHDSX © 2026 · 让小事更简单", "PHDSX © 2026 · Make everyday tasks easier"],

    "workspace.tool.0": ["PPT 放映悬浮倒计时", "PPT presentation countdown"],
    "workspace.tool.1": ["图片水印与 EXIF 编辑器", "Image watermark & EXIF editor"],
    "workspace.tool.2": ["逐字生成并校验 Word 拼音 EQ 域代码。", "Generate and validate Pinyin EQ field codes for Word."],
    "workspace.tool.3": ["适合 PPT 放映时悬浮显示倒计时。", "A floating timer for your presentations."],
    "workspace.tool.4": ["根据上下班时间显示剩余工作时长。", "See how much time remains in your workday."],
    "workspace.tool.5": ["按小时、分钟和秒设置一段倒计时。", "Set a timer in hours, minutes and seconds."],
    "workspace.tool.6": ["快速减小图片体积。", "Reduce image file sizes in seconds."],
    "workspace.tool.7": ["上传多张图片并逐张调整裁剪区域。", "Crop uploaded images one at a time."],
    "workspace.tool.8": ["将同一裁剪设置批量应用到多张图片。", "Apply the same crop to multiple images."],
    "workspace.tool.9": ["添加文字、图片或 EXIF 水印，并支持裁剪。", "Add watermarks, edit EXIF and crop images."],
    "workspace.tool.10": ["快速切换英文大小写。", "Convert text between uppercase and lowercase."],
    "workspace.tool.11": ["清理重复行和重复内容。", "Remove duplicate lines and content."],
    "workspace.tool.12": ["整理空白与格式，让文本更易读。", "Clean up whitespace and text formatting."],
    "workspace.tool.13": ["统计字数、字符和段落。", "Count words, characters and paragraphs."],
    "workspace.tool.14": ["将文字、网址和小型文件转换为二维码。", "Turn text, URLs and small files into QR codes."],
    "workspace.tool.15": ["随机组合主食、菜品与饮料。", "Find a random meal and drink combination."],
    "workspace.tool.16": ["生成不具有预测意义的随机模拟结果。", "A random simulation for entertainment only."],
    "workspace.tool.17": ["根据简单选项生成娱乐结果。", "A playful calculator for entertainment only."],
    "workspace.tool.18": ["输入视频地址并选择解析线路。", "Enter a video URL and select a parser."],

    "workspace.0": ["你的日常，从这里开始", "A little easier, every day"],
    "workspace.1": ["探索我的作品", "Explore my projects"],
    "workspace.2": ["PHDSX · 个人工作台", "PHDSX · Personal workspace"],
    "workspace.3": ["把时间留给更重要的事。", "Make time for what matters."],
    "workspace.4": ["实用工具、阅读与灵感，一个顺手的起点。", "Useful tools, reading and inspiration. All in one place."],
    "workspace.5": ["搜索工具、游戏、文章…", "Search tools, games, articles…"],
    "workspace.6": ["全部 17 项工具 →", "All 17 tools →"],
    "workspace.7": ["工作之外，换个频道", "Take a different path"],
    "workspace.8": ["读一点新内容，也给自己一点放松的时间。", "Find something to read, or take a moment to unwind."],
    "workspace.9": ["阅读 / 连载小说", "READ / SERIAL FICTION"],
    "workspace.10": ["学习 / 博客笔记", "LEARN / NOTES"],
    "workspace.11": ["休息 / 游戏厅", "PLAY / GAMES"],
    "workspace.12": ["走进故事，继续探索未知。", "Step into a story and explore the unknown."],
    "workspace.13": ["开始阅读 →", "Start reading →"],
    "workspace.14": ["记录学习中的方法与实践。", "Methods and discoveries from learning by doing."],
    "workspace.15": ["阅读笔记 →", "Read the notes →"],
    "workspace.16": ["来一局，放松一下", "A little time to play"],
    "workspace.17": ["象棋、方块、益智小游戏。", "Chess, falling blocks and puzzle games."],
    "workspace.18": ["进入游戏厅 →", "Explore games →"],
    "workspace.19": ["PHDSX · 让小事更简单", "PHDSX · Make everyday tasks easier"],
    "workspace.20": ["更新记录", "Updates"],
    "workspace.21": ["PHDSX / 工具箱", "PHDSX / Toolbox"],
    "workspace.22": ["少一点重复，多一点效率", "Less repetition. More flow."],
    "workspace.23": ["顺手的工具，都在这里。", "The right tool, right here."],
    "workspace.24": ["处理图片、整理文字、专注工作。找到需要的，直接开始。", "Edit images, organize text and focus on work. Pick a tool and get started."],
    "workspace.25": ["搜索工具", "Search tools"],
    "workspace.26": ["搜索工具名称或用途，例如：压缩、二维码、Word", "Search by name or purpose: compress, QR, Word"],
    "workspace.27": ["17 项工具", "17 tools"],
    "workspace.28": ["我的收藏", "My favorites"],
    "workspace.29": ["没有找到合适的工具", "No matching tools"],
    "workspace.30": ["换个关键词，或查看全部工具。", "Try another keyword, or browse all tools."],
    "workspace.31": ["重置筛选", "Reset filters"],
    "workspace.32": ["最近使用", "Recently used"],

    'common.backHome': ['返回首页', 'Back home'],
    'common.skip': ['跳到主要内容', 'Skip to main content'],
    'common.expandNav': ['展开站点导航', 'Expand site navigation'],
    'common.collapseNav': ['收起站点导航', 'Collapse site navigation'],
    'common.mainNav': ['主导航', 'Main navigation'],
    'common.site': ['常用', 'Everyday'],
    'common.reading': ['阅读', 'Reading'],
    'common.publishing': ['探索', 'Explore'],
    'common.home': ['首页', 'Home'],
    'common.tools': ['工具', 'Tools'],
    'common.games': ['游戏', 'Games'],
    'common.blog': ['博客', 'Blog'],
    'common.directory': ['黄页', 'Directory'],
    'common.novels': ['小说', 'Novels'],
    'common.software': ['软件作品', 'Software'],
    'common.radar': ['AI 雷达', 'AI Radar'],
    'common.blacklist': ['品牌黑名单', 'Brand blacklist'],
    'common.keepUpdating': ['持续整理与更新', 'Curated and updated'],
    'common.personalHub': ['PHDSX 个人主页', 'PHDSX Personal Hub'],
    'common.sourceCode': ['获取源代码', 'Get source code'],
    'common.viewLicense': ['查看 AGPL-3.0-or-later 许可证', 'View the AGPL-3.0-or-later license'],
    'common.backTo': ['返回', 'Back to'],
    'common.start': ['开始', 'Start'],
    'common.open': ['打开', 'Open'],
    'common.read': ['阅读', 'Read'],
    'common.onlineUse': ['在线使用', 'Use online'],
    'common.clear': ['清除', 'Clear'],
    'common.all': ['全部', 'All'],
    'common.updated': ['更新于', 'Updated'],
    'language.switchToEnglish': ['切换至英文', 'Switch to English'],
    'language.switchToChinese': ['切换至中文', 'Switch to Chinese'],
    'language.english': ['英文', 'English'],
    'language.chinese': ['中文', 'Chinese'],
    'search.categories': ['搜索分类', 'Search categories'],
    'search.siteContent': ['搜索站内内容', 'Search site content'],
    'search.button': ['搜索', 'Search'],
    'search.hot': ['热门：', 'Popular:'],
    'search.allPlaceholder': ['搜索全部内容', 'Search everything'],
    'search.categoryPlaceholder': ['搜索{category}', 'Search {category}'],
    'search.allCategories': ['全部分类', 'All categories'],
    'search.found': ['找到 {count} 个相关入口', '{count} matching entries'],
    'search.noResult': ['没有找到相关入口', 'No matching entries'],
    'search.noMatch': ['没有找到与“{query}”匹配的内容。', 'No content matches “{query}”.'],
    'catalog.tools': ['工具', 'tools'],
    'catalog.games': ['游戏', 'games'],
    'catalog.item': ['项', 'items'],
    'catalog.gameItem': ['款游戏', 'games'],
    'catalog.toolUnit': ['项工具', 'tools'],
    'catalog.showing': ['正在显示{heading}分类，共 {count} {unit}。', 'Showing {heading}: {count} {unit}.'],
    'catalog.subShowing': ['正在显示{label}子分类，共 {count} {unit}。', 'Showing {label}: {count} {unit}.'],
    'catalog.noTools': ['暂时没有可用内容。', 'No content is available right now.'],
    'blog.noMatch': ['没有找到符合当前筛选条件的文章。', 'No articles match the current filters.'],
    'novel.startReading': ['开始阅读', 'Start reading'],
    'novel.continueReading': ['继续阅读第 {chapter} 章', 'Continue from chapter {chapter}'],
    'home.title': ['快速找到你要用的内容', 'Find what you need, quickly'],
    'home.lede': ['工具、游戏、博客、小说、软件作品与品牌记录，都从这里开始。', 'Tools, games, blogs, novels, software, and brand records all start here.'],
    'home.quickLinks': ['快捷入口', 'Quick links'],
    'home.dashboard': ['站点概览', 'Site overview'],
    'home.online': ['在线', 'Online'],
    'home.allFeatures': ['全部功能', 'All features'],
    'home.gamesAndIdeas': ['游戏与灵感', 'Games & inspiration'],
    'home.latest': ['最新内容', 'Latest content'],
    'home.works': ['作品与记录', 'Works & records'],
    'home.directory': ['黄页直达', 'Directory shortcuts'],
    'home.popular': ['热门入口', 'Popular'],
    'home.allTools': ['全部工具', 'All tools'],
    'home.allGames': ['全部游戏', 'All games'],
    'home.viewAll': ['查看全部', 'View all'],
    'home.blogDirectory': ['博客目录', 'Blog index'],
    'home.fullDirectory': ['完整黄页', 'Full directory'],
    'home.viewReleases': ['查看发布', 'View releases'],
    'home.toolNote': ['按使用场景整理，常用入口优先。', 'Organized by use case, with frequently used tools first.'],
    'home.organized': ['按使用场景整理，快速找到合适的入口。', 'Organized by use case, so you can find the right entry quickly.'],
    'home.localGames': ['适合短暂放松的本地小游戏。', 'Small local games for a quick break.'],
    'home.imageProcess': ['图片处理', 'Image processing'],
    'home.imageProcessNote': ['压缩、裁剪与输出', 'Compress, crop, and export'],
    'home.textEfficiency': ['文本效率', 'Text productivity'],
    'home.textEfficiencyNote': ['整理、统计与转换', 'Format, count, and convert'],
    'home.timeWork': ['时间与工作', 'Time & work'],
    'home.timeWorkNote': ['倒计时与演示辅助', 'Countdowns and presentation helpers'],
    'home.lifeFun': ['生活与趣味', 'Life & fun'],
    'home.lifeFunNote': ['轻松选择与娱乐', 'Easy choices and entertainment'],
    'home.reduceSize': ['减小体积', 'Reduce file size'],
    'home.adjustFrame': ['调整画面', 'Adjust the frame'],
    'home.batchCrop': ['统一裁剪', 'Crop in batches'],
    'home.addMark': ['添加标记', 'Add a mark'],
    'home.perCharacterTone': ['逐字调号', 'Tone per character'],
    'home.cleanDuplicates': ['清理重复', 'Clean duplicates'],
    'home.charactersParagraphs': ['字符段落', 'Characters & paragraphs'],
    'home.formatText': ['整理格式', 'Format text'],
    'home.englishConversion': ['英文转换', 'English case conversion'],
    'home.textFile': ['文字与文件', 'Text & files'],
    'home.presentationFloat': ['演示悬浮', 'Presentation overlay'],
    'home.workRhythm': ['工作节奏', 'Work rhythm'],
    'home.timeCounter': ['时分秒计时', 'Hours, minutes & seconds'],
    'home.mediaEntry': ['媒体入口', 'Media entry'],
    'home.randomMenu': ['随机菜单', 'Random menu'],
    'home.funTest': ['趣味测试', 'Fun test'],
    'home.continueReading': ['继续阅读', 'Continue reading'],
    'home.localChess': ['本地双人对弈', 'Local two-player match'],
    'home.classicBlocks': ['经典方块消除', 'Classic block clearing'],
    'home.casualFruit': ['休闲切水果', 'Casual fruit slicing'],
    'home.canvasShooter': ['Canvas 射击游戏', 'Canvas shooter'],
    'home.work': ['作品', 'Work'],
    'home.record': ['记录', 'Record'],
    'home.realtime': ['实时', 'Live'],
    'home.reading': ['小说', 'Novel'],
    'home.radarLinkTitle': ['AI 雷达', 'AI Radar'],
    'home.radarLinkDescription': ['模型能力评分与 Codex 重置预测', 'Model capability scores and Codex reset forecasts'],
    'home.radarLinkAction': ['查看雷达 →', 'View radar →'],
    'home.radarLinkAria': ['打开 AI 雷达：模型能力评分与 Codex 重置预测', 'Open AI Radar: model capability scores and Codex reset forecasts'],
    'tools.lede': ['先选择一级分类，再通过二级标签切换具体工具场景。', 'Choose a primary category, then use the secondary tags to switch tool scenarios.'],
    'tools.categories': ['工具分类', 'Tool categories'],
    'tools.secondary': ['二级分类', 'Secondary category'],
    'tools.document': ['文档办公', 'Documents & office'],
    'tools.time': ['时间', 'Time'],
    'tools.image': ['图片', 'Image'],
    'tools.text': ['文本与编码', 'Text & encoding'],
    'tools.lifestyle': ['生活与趣味', 'Life & fun'],
    'tools.media': ['媒体', 'Media'],
    'tools.word': ['Word 辅助', 'Word helper'],
    'tools.presentation': ['演示辅助', 'Presentation helper'],
    'tools.crop': ['裁剪处理', 'Cropping'],
    'tools.watermark': ['水印与元数据', 'Watermark & metadata'],
    'tools.textFormat': ['文本排版', 'Text formatting'],
    'tools.textClean': ['文本清理', 'Text cleanup'],
    'tools.textStats': ['文本统计', 'Text statistics'],
    'tools.case': ['字符转换', 'Character conversion'],
    'tools.generalTimer': ['通用计时', 'General timer'],
    'tools.workTimer': ['工作计时', 'Work timer'],
    'tools.video': ['视频解析', 'Video parsing'],
    'tools.food': ['饮食决策', 'Food decisions'],
    'tools.simulation': ['趣味模拟', 'Fun simulation'],
    'tools.noData': ['暂时没有可用数据。', 'No data is available right now.'],
    'games.lede': ['8 款小游戏都在这里，选一款直接开始。', 'All eight small games are here. Pick one and start playing.'],
    'games.gomoku': ['五子棋', 'Gomoku'],
    'games.gomokuNote': ['黑白轮流落子，五子连线获胜，支持双人对弈与悔棋。', 'Take turns placing stones and connect five to win. Local two-player play with undo.'],
    'gomoku.mode': ['本地双人 · 15 × 15', 'Local two-player · 15 × 15'],
    'gomoku.lede': ['黑白交替，五子相连。和朋友面对面来一局。', 'Black and white, five in a row. Play face to face with a friend.'],
    'gomoku.back': ['返回游戏', 'Back to games'],
    'gomoku.help': ['点击交叉点落子；也可用方向键移动，按回车或空格落子。', 'Click an intersection, or use arrow keys to move and Enter or Space to place a stone.'],
    'gomoku.current': ['当前棋局', 'Current game'],
    'gomoku.moves': ['已落子', 'Stones played'],
    'gomoku.last': ['上一手', 'Last move'],
    'gomoku.restart': ['重新开局', 'New game'],
    'gomoku.undo': ['悔棋一步', 'Undo move'],
    'gomoku.rulesTitle': ['对弈规则', 'How to play'],
    'gomoku.rule1': ['黑方先手，双方轮流在空交叉点落子。', 'Black plays first. Take turns placing a stone on an empty intersection.'],
    'gomoku.rule2': ['横、竖或斜向连成五子及以上即可获胜。', 'Connect five or more stones horizontally, vertically, or diagonally to win.'],
    'gomoku.rule3': ['自由规则，不设禁手；棋盘落满仍无人获胜则和棋。', 'Freestyle rules with no forbidden moves. A full board with no winner is a draw.'],
    'gomoku.marker': ['蓝色圆点标记上一手，金色圆环标记获胜连线。', 'A blue dot marks the last move. Gold rings mark the winning line.'],
    'gomoku.black': ['黑方', 'Black'],
    'gomoku.white': ['白方', 'White'],
    'gomoku.empty': ['空位', 'Empty'],
    'gomoku.board': ['五子棋棋盘', 'Gomoku board'],
    'gomoku.won': ['{player}获胜！', '{player} wins!'],
    'gomoku.draw': ['棋盘已满，和棋', 'Board full — draw'],
    'gomoku.turn': ['{player}落子', '{player} to play'],
    'games.junqi': ['军棋', 'Junqi'],
    'games.junqiNote': ['明棋人机或双人对战，排兵布阵，夺取军旗。', 'Play open-board army chess against the computer or a friend. Capture the flag to win.'],
    'games.categories': ['游戏分类', 'Game categories'],
    'games.startGame': ['开始游戏', 'Play now'],
    'games.traditional': ['传统棋类', 'Traditional board games'],
    'games.action': ['动作', 'Action'],
    'games.puzzle': ['益智', 'Puzzle'],
    'games.shooting': ['射击挑战', 'Shooting challenge'],
    'games.reflex': ['反应挑战', 'Reflex challenge'],
    'games.blocks': ['方块消除', 'Block clearing'],
    'games.traffic': ['交通规划', 'Traffic planning'],
    'games.sorting': ['分类整理', 'Sorting'],
    'games.chess': ['棋类', 'Board games'],
    'games.chineseChess': ['中国象棋', 'Chinese chess'],
    'games.tetris': ['俄罗斯方块', 'Tetris'],
    'games.fruit': ['水果忍者', 'Fruit Ninja'],
    'games.submarine': ['潜艇大战', 'Submarine battle'],
    'games.sortingGame': ['沙子分类', 'Sand sorting'],
    'games.actionNote': ['考验瞄准、反应速度和即时操作的游戏。', 'Games that test aim, reaction speed, and quick controls.'],
    'games.puzzleNote': ['通过观察、规划、消除和分类逐步完成关卡。', 'Complete levels through observation, planning, clearing, and sorting.'],
    'games.chessNote': ['遵循明确规则、强调布局与对弈策略的游戏。', 'Games with clear rules focused on layout and strategy.'],
    'games.shootingNote': ['深海题材 Canvas 射击小游戏。', 'A deep-sea Canvas shooting game.'],
    'games.reflexNote': ['切水果休闲小游戏。', 'A casual fruit-slicing game.'],
    'games.blocksNote': ['经典方块消除，响应式 Canvas 小游戏。', 'Classic block clearing in a responsive Canvas game.'],
    'games.trafficNote': ['按箭头挪车，让同色乘客上车，挑战有限接客位。', 'Move cars by their arrows, match passengers by color, and manage limited pickup spaces.'],
    'games.sortingNote': ['把同色沙粒整理进同一个瓶子，所有辅助功能免费使用。', 'Sort sand of the same color into one bottle; all helpers are free.'],
    'blog.lede': ['支持按日期排序、按主题分类和关键词搜索，Markdown 内容会在站内阅读页展示。', 'Sort by date, filter by topic, and search keywords; Markdown is shown in the built-in reader.'],
    'blog.search': ['搜索博客文章', 'Search blog articles'],
    'blog.sort': ['排序方式', 'Sort order'],
    'blog.newest': ['日期从新到旧', 'Newest first'],
    'blog.oldest': ['日期从旧到新', 'Oldest first'],
    'blog.titleAZ': ['标题 A-Z', 'Title A–Z'],
    'blog.topic': ['主题分类', 'Topics'],
    'directory.lede': ['集中保存常用服务电话和联系人信息，手机上可直接点击拨号。', 'Keep frequently used service numbers and contacts in one place; tap to call on mobile.'],
    'directory.services': ['常用服务', 'Common services'],
    'directory.operator': ['运营商客服电话', 'Carrier customer service'],
    'directory.exampleCompany': ['示例公司固话', 'Example company landline'],
    'directory.testData': ['黄页测试数据', 'Directory test data'],
    'directory.exampleContact': ['示例联系人', 'Example contact'],
    'directory.mobileExample': ['移动电话示例', 'Mobile number example'],
    'software.lede': ['集中发布自制软件和浏览器工具，展示当前版本、适用平台与最近更新时间。', 'A release board for home-made software and browser tools, with versions, platforms, and update times.'],
    'software.current': ['当前已发布作品', 'Published work'],
    'software.online': ['在线使用', 'Use online'],
    'software.noInstall': ['无需安装', 'No installation'],
    'software.efficiency': ['效率工具', 'Productivity tool'],
    'novels.lede': ['收录原创连载故事，按章节持续更新。阅读进度会保存在当前浏览器中。', 'Original serial stories, updated chapter by chapter. Reading progress is saved in this browser.'],
    'novels.chapterList': ['章节目录', 'Chapter list'],
    'blacklist.metrics': ['黑名单数据概览', 'Blacklist overview'],
    'blacklist.records': ['收录记录', 'Records'],
    'blacklist.categories': ['品牌分类', 'Brand categories'],
    'blacklist.regions': ['涉及国家或地区', 'Countries or regions'],
    'blacklist.databaseUpdated': ['数据库更新', 'Database updated'],
    'blacklist.noticeTitle': ['阅读说明', 'Reading notes'],
    'blacklist.notice': ['记录用于归档相关事件及处理进展；请结合详情页中的事件描述与来源自行判断。演示记录会被明确标注。', 'Records archive relevant events and follow-up. Use the event description and sources on each detail page to form your own view. Demo records are marked clearly.'],
    'blacklist.filterSearch': ['筛选品牌黑名单', 'Filter brand blacklist'],
    'blacklist.searchRecords': ['检索档案', 'Search archive'],
    'blacklist.clearFilters': ['清除全部条件', 'Clear all filters'],
    'blacklist.keyword': ['品牌或事件关键词', 'Brand or event keywords'],
    'blacklist.keywordPlaceholder': ['输入名称、别名或事件标题', 'Enter a name, alias, or event title'],
    'blacklist.primaryCategory': ['品牌一级分类', 'Primary brand category'],
    'blacklist.secondaryCategory': ['品牌二级分类', 'Secondary brand category'],
    'blacklist.reason': ['入黑原因', 'Listing reason'],
    'blacklist.country': ['所属国家或地区', 'Country or region'],
    'blacklist.sort': ['排序', 'Sort'],
    'blacklist.allCategories': ['全部品牌分类', 'All brand categories'],
    'blacklist.allSecondary': ['全部二级分类', 'All secondary categories'],
    'blacklist.allReasons': ['全部原因分类', 'All reasons'],
    'blacklist.allCountries': ['全部国家或地区', 'All countries or regions'],
    'blacklist.latestFirst': ['最新入黑优先', 'Newest listings first'],
    'blacklist.name': ['品牌名称', 'Brand name'],
    'blacklist.selectRecord': ['选择记录查看完整档案', 'Select a record to view the full archive'],
    'blacklist.noMatch': ['没有找到符合当前条件的品牌记录。', 'No brand records match the current filters.'],
    'blacklist.loading': ['正在读取数据库…', 'Loading database…'],
    'blacklist.loadError': ['数据库暂时无法读取，请稍后刷新页面。', 'The database is temporarily unavailable. Please refresh later.'],
    'radar.refreshAll': ['刷新全部', 'Refresh all'],
    'radar.syncing': ['正在同步三个来源…', 'Syncing three sources…'],
    'radar.reading': ['正在读取', 'Loading'],
    'radar.live': ['实时', 'Live'],
    'radar.failed': ['读取失败', 'Failed'],
    'radar.hero': ['集中查看模型能力评分与 Codex 重置预测。打开页面时自动拉取最新数据，也可随时手动刷新。', 'View model capability scores and Codex reset forecasts in one place. Data loads on entry and can be refreshed anytime.'],
    'radar.noteTitle': ['独立数据聚合', 'Independent data aggregation'],
    'radar.note': ['本站仅展示来源站公开数据，不代表 OpenAI 官方结论。预测值具有不确定性，请点击来源链接查看完整说明。', 'This site only displays public data from the source sites and does not represent OpenAI. Forecasts are uncertain; follow the source links for full context.'],
    'radar.capability': ['模型能力评分', 'Model capability scores'],
    'radar.capabilityDescription': ['综合智能为同一模型档位的软件工程与视觉推理 IQ 等权平均值；分数与原站同步，不代表绝对能力。', 'Composite intelligence is the equal-weight average of software engineering and visual reasoning IQ for the same model tier; scores sync from the source and are not absolute measures.'],
    'radar.bestCombined': ['综合智能最高', 'Highest composite'],
    'radar.bestSoftware': ['软件工程最高', 'Highest software engineering'],
    'radar.bestVisual': ['视觉推理最高', 'Highest visual reasoning'],
    'radar.waitData': ['等待数据', 'Waiting for data'],
    'radar.noData': ['暂无可用数据', 'No data available'],
    'radar.searchPlaceholder': ['搜索模型或推理档位', 'Search model or effort'],
    'radar.forecast': ['Codex Reset 预测', 'Codex Reset forecast'],
    'radar.hours24': ['24 小时内', 'Within 24 hours'],
    'radar.hours48': ['48 小时内', 'Within 48 hours'],
    'radar.confidence': ['模型置信度', 'Model confidence'],
    'radar.age': ['距上次重置', 'Since last reset'],
    'radar.window': ['历史高发时段', 'Common historical window'],
    'radar.evidence': ['预测依据', 'Forecast evidence'],
    'radar.feed': ['雷达动态', 'Radar feed'],
    'radar.events': ['事件与信号记录', 'Events & signals'],
    'radar.readingEvidence': ['正在读取预测依据…', 'Loading forecast evidence…'],
    'radar.readingFeed': ['正在读取雷达内容…', 'Loading radar feed…'],
    'radar.forecastPulse': ['Forecast pulse', 'Forecast pulse'],
    'radar.readingSignals': ['正在读取信号记录…', 'Loading signal log…'],
    'radar.next48': ['Next 48 hours', 'Next 48 hours'],
    'radar.readingSignal': ['正在读取预测信号', 'Loading forecast signal'],
    'radar.sourceTime': ['来源更新时间：', 'Source updated:'],
    'radar.dataTime': ['数据更新时间：', 'Data updated:'],
    'radar.imageMirror': ['视觉数据经只读镜像获取', 'Visual data via read-only mirror'],
    'radar.dataMirror': ['数据经只读镜像获取', 'Data via read-only mirror'],
    'radar.forecastBasis': ['Forecast evidence', 'Forecast evidence'],
    'radar.tiboRadar': ['Tibo radar', 'Tibo radar'],
    'radar.openSource': ['打开来源 ↗', 'Open source ↗'],
    'radar.openFull': ['查看完整雷达 ↗', 'View full radar ↗'],
    'radar.openCodexRadar': ['前往 CodexRadar ↗', 'Go to CodexRadar ↗'],
    'radar.preparing': ['准备读取三个来源…', 'Preparing three sources…'],
    'radar.updated': ['全部已更新 · {time}', 'All updated · {time}'],
    'radar.partialUpdated': ['已更新 {success} / {total} 个来源，失败项可单独重试', '{success} / {total} sources updated; failed sources can be retried'],
    'radar.sourceUpdated': ['该来源已更新 · {time}', 'Source updated · {time}'],
    'radar.refreshing': ['正在刷新 {source}…', 'Refreshing {source}…'],
    'radar.retry': ['刷新失败，请稍后重试或打开来源站查看', 'Refresh failed. Try again later or open the source site'],
    'radar.noEvidence': ['当前没有公开预测依据。', 'No public forecast evidence right now.'],
    'radar.noRadarFeed': ['当前没有可展示的雷达动态。', 'No radar updates to display right now.'],
    'radar.noPulse': ['Forecast pulse 当前没有重要信号事件。', 'Forecast pulse has no important signal events right now.'],
    'radar.tiboSignal': ['Tibo 动态', 'Tibo update'],
    'radar.explicitReset': ['明确重置信号', 'Explicit reset signal'],
    'radar.noMatchingModels': ['没有匹配的模型档位。', 'No matching model tiers.'],
    'radar.noMergedScores': ['暂时没有可合并的评分数据。', 'No mergeable score data right now.'],
    'radar.sharedTiers': ['显示 {shown} / {total} 个共同有效档位', 'Showing {shown} / {total} shared valid tiers'],
    'radar.updatedSource': ['来源更新时间：', 'Source updated:'],
    'radar.dataUpdated': ['数据更新时间：', 'Data updated:'],
    'radar.lowConfidence': ['低', 'Low'],
    'radar.mediumConfidence': ['中', 'Medium'],
    'radar.highConfidence': ['高', 'High'],
    'radar.days': ['天', 'days'],
    'radar.verdictElevated': ['高信号 · 保持关注', 'Elevated signal · Stay alert'],
    'radar.verdictWatch': ['观察信号 · 持续跟踪', 'Watch signal · Keep tracking'],
    'radar.verdictLow': ['低信号 · 保持克制', 'Low signal · Stay measured'],
    'radar.verdictQuiet': ['暂无明显信号', 'No notable signal'],
    'radar.verdictUpdated': ['预测信号已更新', 'Forecast signal updated'],
    'radar.signalEvent': ['信号事件', 'Signal event'],
    'radar.unclearModel': ['未知模型', 'Unknown model'],
    'radar.forecastSignalUpdated': ['预测信号已更新', 'Forecast signal updated'],
    'radar.resetConfirmed': ['已确认重置', 'Reset confirmed'],
    'radar.serviceEvent': ['服务事件', 'Service event'],
    'radar.impact': ['影响 +{impact}', 'Impact +{impact}'],
    'radar.allSources': ['全部已更新', 'All updated'],
    'radar.viewDetails': ['查看详细内容', 'View details']
  };

  const textPairs = [
    ['PHDSX 个人主页', 'PHDSX Personal Hub'],
    ['PHDSX · 2026', 'PHDSX · 2026'],
    ['工具 · 游戏 · 博客 · 小说 · 黄页', 'Tools · Games · Blog · Novels · Directory'],
    ['工具 · 游戏 · 博客 · 小说 · 软件作品 · AI 雷达 · 品牌黑名单', 'Tools · Games · Blog · Novels · Software · AI Radar · Brand blacklist'],
    ['软件作品 · 持续发布', 'Software · Ongoing releases'],
    ['品牌记录 · 事实核验 · 持续更新', 'Brand records · Fact checking · Continuously updated'],
    ['AI 雷达 · 自动读取公开来源', 'AI Radar · Public sources auto-loaded'],
    ['PHDSX PERSONAL HUB', 'PHDSX PERSONAL HUB'],
    ['全部', 'All'], ['工具', 'Tools'], ['游戏', 'Games'], ['博客', 'Blog'], ['小说', 'Novels'], ['黄页', 'Directory'], ['软件', 'Software'], ['雷达', 'Radar'], ['黑名单', 'Blacklist'],
    ['站点', 'Site'], ['阅读', 'Reading'], ['发布与记录', 'Publishing & records'], ['首页', 'Home'], ['站点概览', 'Site overview'], ['在线', 'Online'], ['常用', 'Popular'],
    ['搜索分类', 'Search categories'], ['搜索站内内容', 'Search site content'], ['搜索', 'Search'], ['热门：', 'Popular:'], ['全部工具', 'All tools'], ['全部游戏', 'All games'], ['查看全部', 'View all'], ['全部功能', 'All features'], ['最新内容', 'Latest content'], ['博客目录', 'Blog index'], ['黄页直达', 'Directory shortcuts'], ['完整黄页', 'Full directory'], ['作品与记录', 'Works & records'], ['查看发布', 'View releases'],
    ['工具直达', 'Tool shortcuts'], ['热门入口', 'Popular'], ['工具、游戏、博客、小说、软件作品与品牌记录，都从这里开始。', 'Tools, games, blogs, novels, software, and brand records all start here.'], ['按使用场景整理，常用入口优先。', 'Organized by use case, with frequently used tools first.'], ['按使用场景整理，快速找到合适的入口。', 'Organized by use case, so you can find the right entry quickly.'], ['适合短暂放松的本地小游戏。', 'Small local games for a quick break.'],
    ['工具', 'Tools'], ['游戏与灵感', 'Games & inspiration'], ['图片处理', 'Image processing'], ['压缩、裁剪与输出', 'Compress, crop, and export'], ['文本效率', 'Text productivity'], ['整理、统计与转换', 'Format, count, and convert'], ['时间与工作', 'Time & work'], ['倒计时与演示辅助', 'Countdowns and presentation helpers'], ['生活与趣味', 'Life & fun'], ['轻松选择与娱乐', 'Easy choices and entertainment'],
    ['图片压缩', 'Image compression'], ['图片裁剪', 'Image cropping'], ['批量图片裁剪', 'Batch image cropping'], ['图片水印与 EXIF', 'Image watermark & EXIF'], ['EQ 拼音域代码', 'EQ Pinyin field code'], ['EQ 单字拼音域代码生成器', 'EQ per-character Pinyin field code generator'], ['文本去重', 'Text deduplication'], ['字数统计', 'Word counter'], ['文本格式化', 'Text formatter'], ['大小写转换', 'Case converter'], ['二维码生成', 'QR code generator'], ['PPT 倒计时', 'PPT countdown'], ['下班倒计时', 'Workday countdown'], ['自定义倒计时', 'Custom countdown'], ['VIP 视频解析', 'VIP video parser'], ['吃啥饭', 'What to eat'], ['雷击概率娱乐计算器', 'Lightning probability fun calculator'], ['子女性别娱乐模拟器', 'Child gender fun simulator'],
    ['减小体积', 'Reduce file size'], ['调整画面', 'Adjust the frame'], ['统一裁剪', 'Crop in batches'], ['添加标记', 'Add a mark'], ['逐字调号', 'Tone per character'], ['清理重复', 'Clean duplicates'], ['字符段落', 'Characters & paragraphs'], ['整理格式', 'Format text'], ['英文转换', 'English case conversion'], ['文字与文件', 'Text & files'], ['演示悬浮', 'Presentation overlay'], ['工作节奏', 'Work rhythm'], ['时分秒计时', 'Hours, minutes & seconds'], ['媒体入口', 'Media entry'], ['随机菜单', 'Random menu'], ['趣味测试', 'Fun test'], ['继续阅读', 'Continue reading'], ['本地双人对弈', 'Local two-player match'], ['经典方块消除', 'Classic block clearing'], ['休闲切水果', 'Casual fruit slicing'], ['Canvas 射击游戏', 'Canvas shooter'], ['作品', 'Work'], ['记录', 'Record'], ['实时', 'Live'], ['小说', 'Novel'],
    ['文档办公', 'Documents & office'], ['时间', 'Time'], ['图片', 'Image'], ['文本与编码', 'Text & encoding'], ['生活与趣味', 'Life & fun'], ['媒体', 'Media'], ['Word 辅助', 'Word helper'], ['演示辅助', 'Presentation helper'], ['裁剪处理', 'Cropping'], ['水印与元数据', 'Watermark & metadata'], ['文本排版', 'Text formatting'], ['文本清理', 'Text cleanup'], ['文本统计', 'Text statistics'], ['字符转换', 'Character conversion'], ['通用计时', 'General timer'], ['工作计时', 'Work timer'], ['视频解析', 'Video parsing'], ['饮食决策', 'Food decisions'], ['趣味模拟', 'Fun simulation'], ['打开', 'Open'], ['在线使用', 'Use online'], ['清除全部条件', 'Clear all filters'], ['开始', 'Start'], ['阅读', 'Read'],
    ['传统棋类', 'Traditional board games'], ['动作', 'Action'], ['益智', 'Puzzle'], ['射击挑战', 'Shooting challenge'], ['反应挑战', 'Reflex challenge'], ['方块消除', 'Block clearing'], ['交通规划', 'Traffic planning'], ['分类整理', 'Sorting'], ['棋类', 'Board games'], ['中国象棋', 'Chinese chess'], ['俄罗斯方块', 'Tetris'], ['水果忍者', 'Fruit Ninja'], ['潜艇大战', 'Submarine battle'], ['沙子分类', 'Sand sorting'], ['Parking Pulse', 'Parking Pulse'],
    ['博客', 'Blog'], ['全部', 'All'], ['Python 教程笔记', 'Python tutorial notes'], ['站点更新记录', 'Site update log'], ['日期从新到旧', 'Newest first'], ['日期从旧到新', 'Oldest first'], ['标题 A-Z', 'Title A–Z'], ['搜索博客文章', 'Search blog articles'], ['主题分类', 'Topics'], ['Python', 'Python'], ['站点', 'Site'],
    ['黄页', 'Directory'], ['常用服务', 'Common services'], ['运营商客服电话', 'Carrier customer service'], ['示例公司固话', 'Example company landline'], ['黄页测试数据', 'Directory test data'], ['示例联系人', 'Example contact'], ['移动电话示例', 'Mobile number example'],
    ['软件作品发布', 'Software releases'], ['当前已发布作品', 'Published work'], ['更新于 2026-08-29', 'Updated 2026-08-29'], ['无需安装', 'No installation'], ['效率工具', 'Productivity tool'], ['Web', 'Web'],
    ['小说', 'Novels'], ['连载中 · 科幻悬疑', 'Ongoing · Sci-fi mystery'], ['零号回声', 'Zero Echo'], ['第一章 凌晨频段', 'Chapter 1: The Dawn Frequency'], ['第二章 失效的时间戳', 'Chapter 2: The Invalid Timestamp'], ['第三章 城市静默', 'Chapter 3: The City Falls Silent'], ['章节目录', 'Chapter list'], ['开始阅读', 'Start reading'], ['已更新 3 章 · 2026-07-29', '3 chapters · 2026-07-29'],
    ['品牌黑名单', 'Brand blacklist'], ['收录记录', 'Records'], ['品牌分类', 'Brand categories'], ['涉及国家或地区', 'Countries or regions'], ['数据库更新', 'Database updated'], ['阅读说明', 'Reading notes'], ['检索档案', 'Search archive'], ['品牌或事件关键词', 'Brand or event keywords'], ['品牌一级分类', 'Primary brand category'], ['品牌二级分类', 'Secondary brand category'], ['入黑原因', 'Listing reason'], ['所属国家或地区', 'Country or region'], ['排序', 'Sort'], ['全部品牌分类', 'All brand categories'], ['全部二级分类', 'All secondary categories'], ['全部原因分类', 'All reasons'], ['全部国家或地区', 'All countries or regions'], ['最新入黑优先', 'Newest listings first'], ['品牌名称', 'Brand name'], ['选择记录查看完整档案', 'Select a record to view the full archive'], ['正在读取数据库…', 'Loading database…'], ['没有找到符合当前条件的品牌记录。', 'No brand records match the current filters.'], ['数据库暂时无法读取，请稍后刷新页面。', 'The database is temporarily unavailable. Please refresh later.'],
    ['AI 雷达', 'AI Radar'], ['刷新全部', 'Refresh all'], ['正在同步三个来源…', 'Syncing three sources…'], ['正在读取', 'Loading'], ['模型能力评分', 'Model capability scores'], ['综合智能最高', 'Highest composite'], ['软件工程最高', 'Highest software engineering'], ['视觉推理最高', 'Highest visual reasoning'], ['等待数据', 'Waiting for data'], ['暂无可用数据', 'No data available'], ['搜索模型或推理档位', 'Search model or effort'], ['Codex Reset 预测', 'Codex Reset forecast'], ['24 小时内', 'Within 24 hours'], ['48 小时内', 'Within 48 hours'], ['模型置信度', 'Model confidence'], ['距上次重置', 'Since last reset'], ['历史高发时段', 'Common historical window'], ['预测依据', 'Forecast evidence'], ['雷达动态', 'Radar feed'], ['事件与信号记录', 'Events & signals'], ['正在读取预测依据…', 'Loading forecast evidence…'], ['正在读取雷达内容…', 'Loading radar feed…'], ['正在读取信号记录…', 'Loading signal log…'], ['正在读取预测信号', 'Loading forecast signal'], ['来源更新时间：', 'Source updated:'], ['数据更新时间：', 'Data updated:'], ['视觉数据经只读镜像获取', 'Visual data via read-only mirror'], ['数据经只读镜像获取', 'Data via read-only mirror'], ['打开来源 ↗', 'Open source ↗'], ['查看完整雷达 ↗', 'View full radar ↗'], ['前往 CodexRadar ↗', 'Go to CodexRadar ↗'], ['准备读取三个来源…', 'Preparing three sources…'], ['明确重置信号', 'Explicit reset signal'], ['Tibo 动态', 'Tibo update'], ['已确认重置', 'Reset confirmed'], ['服务事件', 'Service event'], ['低', 'Low'], ['中', 'Medium'], ['高', 'High'], ['未知模型', 'Unknown model'], ['预测信号已更新', 'Forecast signal updated'], ['没有匹配的模型档位。', 'No matching model tiers.'], ['暂时没有可合并的评分数据。', 'No mergeable score data right now.'], ['当前没有公开预测依据。', 'No public forecast evidence right now.'], ['当前没有可展示的雷达动态。', 'No radar updates to display right now.'], ['Forecast pulse 当前没有重要信号事件。', 'Forecast pulse has no important signal events right now.'], ['Forecast evidence', 'Forecast evidence'], ['Tibo radar', 'Tibo radar'], ['FORECAST PULSE', 'FORECAST PULSE'], ['LIVE SIGNAL DESK', 'LIVE SIGNAL DESK'], ['MODEL CAPABILITY', 'MODEL CAPABILITY'], ['RESET FORECAST', 'RESET FORECAST'], ['Next 48 hours', 'Next 48 hours'], ['AI 雷达 · 自动读取公开来源', 'AI Radar · Public sources auto-loaded'],
    ['AI 雷达 - PHDSX', 'AI Radar - PHDSX'], ['博客阅读 - PHDSX', 'Blog reader - PHDSX'], ['博客 - PHDSX', 'Blog - PHDSX'], ['黄页 - PHDSX', 'Directory - PHDSX'], ['游戏 - PHDSX', 'Games - PHDSX'], ['软件作品发布 - PHDSX', 'Software releases - PHDSX'], ['工具 - PHDSX', 'Tools - PHDSX'], ['品牌黑名单详情 - PHDSX', 'Brand blacklist details - PHDSX'], ['品牌黑名单 - PHDSX', 'Brand blacklist - PHDSX'], ['响应式俄罗斯方块', 'Responsive Tetris'], ['水果忍者 - PHDSX', 'Fruit Ninja - PHDSX'], ['潜艇大战 (Deep Sea Hunter)', 'Submarine Battle (Deep Sea Hunter)'], ['停车脉冲 · Parking Pulse', 'Parking Pulse · Parking Pulse'], ['沙子分类 · PHDSX', 'Sand sorting · PHDSX'], ['正在前往潜艇大战 - PHDSX', 'Redirecting to Submarine Battle - PHDSX'], ['小说 - PHDSX', 'Novels - PHDSX'], ['小说阅读 - PHDSX', 'Novel reader - PHDSX'], ['品牌黑名单 · 本地管理台', 'Brand blacklist · Local console'], ['EQ 单字拼音域代码生成器 - PHDSX', 'EQ per-character Pinyin field code generator - PHDSX'], ['PPT放映悬浮倒计时工具', 'PPT presentation floating countdown'], ['子女性别娱乐模拟器 - PHDSX', 'Child gender fun simulator - PHDSX'], ['雷击概率娱乐计算器 - PHDSX', 'Lightning probability fun calculator - PHDSX'], ['批量图片裁剪工具 - PHDSX', 'Batch image cropper - PHDSX'], ['照片压缩工具', 'Photo compression tool'], ['图片裁剪工具 - PHDSX', 'Image cropper - PHDSX'], ['图片水印与 EXIF 编辑器 - PHDSX', 'Image watermark & EXIF editor - PHDSX'], ['干饭抽签决定器 - 今天吃什么不再是难题', 'Meal draw - decide what to eat'], ['VIP 视频解析 - PHDSX', 'VIP video parser - PHDSX'], ['大小写转换工具', 'Case converter'], ['文本去重工具 - 简单高效的重复内容处理', 'Text deduplicator - fast and simple'], ['文本格式化工具 - 美化您的文本内容', 'Text formatter - make text beautiful'], ['字数统计工具 - 详细的文本统计分析', 'Word counter - detailed text statistics'], ['自定义倒计时 - PHDSX', 'Custom countdown - PHDSX'], ['下班倒计时', 'Workday countdown'], ['二维码生成 - PHDSX', 'QR code generator - PHDSX'],
    ['AI 雷达聚合 CodexRadar 模型能力评分、Codex Reset 预测与雷达动态，以及 Will Codex Reset 的未来 48 小时预测。', 'AI Radar aggregates CodexRadar model capability scores, Codex Reset forecasts and radar updates, plus Will Codex Reset forecasts for the next 48 hours.'], ['按一级分类与二级标签浏览和切换 PHDSX 网页游戏。', 'Browse and switch PHDSX web games by primary category and secondary tags.'], ['PHDSX 软件作品发布页，集中展示版本、平台、更新时间和使用入口。', 'PHDSX software release page with versions, platforms, update times, and access links.'], ['按一级分类与二级标签浏览和切换 PHDSX 在线工具。', 'Browse and switch PHDSX online tools by primary category and secondary tags.'], ['品牌黑名单详细入黑事件、时间线、原因类别与信息来源。', 'Brand blacklist entries with event details, timelines, reasons, and sources.'], ['品牌黑名单资料库，支持按名称、品牌分类、原因分类和所属国家检索记录。', 'Brand blacklist database searchable by name, brand category, reason, and country.'], ['逐字生成并校验 Word EQ 单字拼音域代码，支持调号、调值、复制与 TXT 导出。', 'Generate and validate per-character Word EQ Pinyin field codes, with tones, copying, and TXT export.']
  ];

  const pairByText = new Map();
  textPairs.forEach(([zh, en]) => {
    if (!pairByText.has(zh)) pairByText.set(zh, { zh, en });
    if (!pairByText.has(en)) pairByText.set(en, { zh, en });
  });
  Object.values(messages).forEach(([zh, en]) => {
    if (!pairByText.has(zh)) pairByText.set(zh, { zh, en });
    if (!pairByText.has(en)) pairByText.set(en, { zh, en });
  });

  let currentLanguage = resolveLanguage();
  let applying = false;
  const changeListeners = new Set();
  document.documentElement.lang = languages[currentLanguage];
  document.documentElement.dataset.language = currentLanguage;

  function resolveLanguage() {
    const queryLanguage = normalizeLanguage(new URL(location.href).searchParams.get(LANGUAGE_PARAM));
    if (queryLanguage) return queryLanguage;
    try {
      const storedLanguage = normalizeLanguage(localStorage.getItem(STORAGE_KEY));
      if (storedLanguage) return storedLanguage;
    } catch (error) { /* Storage may be disabled. */ }
    const browserLanguage = (navigator.languages || [navigator.language || 'zh'])[0].toLowerCase();
    return browserLanguage.startsWith('zh') ? 'zh' : 'en';
  }

  function normalizeLanguage(value) {
    return languageAliases[String(value || '').toLowerCase()] || null;
  }

  function interpolate(value, variables) {
    return String(value).replace(/\{(\w+)\}/g, (match, key) => variables && variables[key] != null ? variables[key] : match);
  }

  function t(key, fallback, variables) {
    const message = messages[key];
    const value = message ? message[currentLanguage === 'en' ? 1 : 0] : (fallback || key);
    return interpolate(value, variables);
  }

  function translateValue(value, language) {
    const pair = pairByText.get(String(value || '').trim());
    if (!pair) return value;
    return (language || currentLanguage) === 'en' ? pair.en : pair.zh;
  }

  function translateNode(node) {
    if (node.nodeType !== Node.TEXT_NODE || !node.nodeValue || !node.parentElement) return;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA'].includes(node.parentElement.tagName)) return;
    const trimmed = node.nodeValue.trim();
    if (!trimmed) return;
    const translated = translateValue(trimmed);
    if (translated !== trimmed) node.nodeValue = node.nodeValue.replace(trimmed, translated);
  }

  function translateAttributes(root) {
    root.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.dataset.i18n;
      element.textContent = t(key, element.textContent);
    });
    root.querySelectorAll('[data-i18n-attr]').forEach((element) => {
      element.dataset.i18nAttr.split(';').forEach((entry) => {
        const [attribute, key] = entry.split(':');
        if (attribute && key) element.setAttribute(attribute.trim(), t(key.trim(), element.getAttribute(attribute.trim()) || ''));
      });
    });
    root.querySelectorAll('[placeholder], [title], [aria-label], [alt]').forEach((element) => {
      ['placeholder', 'title', 'aria-label', 'alt'].forEach((attribute) => {
        if (element.hasAttribute(attribute)) {
          const value = element.getAttribute(attribute);
          const translated = translateValue(value);
          if (translated !== value) element.setAttribute(attribute, translated);
        }
      });
    });
  }

  function translate(root) {
    if (!root) return;
    applying = true;
    document.documentElement.lang = languages[currentLanguage];
    document.documentElement.dataset.language = currentLanguage;
    document.title = translateValue(document.title);
    document.querySelectorAll('meta[name="description"]').forEach((element) => {
      const translated = translateValue(element.content);
      if (translated !== element.content) element.content = translated;
    });
    translateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateNode(node);
    updateToggleLabels();
    applying = false;
  }

  function updateToggleLabels() {
    document.querySelectorAll('[data-i18n-toggle]').forEach((button) => {
      button.textContent = currentLanguage === 'en' ? 'Chinese' : 'English';
      button.setAttribute('aria-label', t(currentLanguage === 'en' ? 'language.switchToChinese' : 'language.switchToEnglish'));
      button.title = t(currentLanguage === 'en' ? 'language.switchToChinese' : 'language.switchToEnglish');
    });
  }

  function updateUrl() {
    try {
      const url = new URL(location.href);
      url.searchParams.set(LANGUAGE_PARAM, currentLanguage);
      history.replaceState(history.state, '', url.href);
    } catch (error) { /* History is unavailable in some embedded contexts. */ }
  }

  function setLanguage(language, options) {
    const nextLanguage = normalizeLanguage(language);
    if (!nextLanguage || nextLanguage === currentLanguage) {
      if (options && options.updateUrl) updateUrl();
      return;
    }
    currentLanguage = nextLanguage;
    try { localStorage.setItem(STORAGE_KEY, nextLanguage); } catch (error) { /* Storage may be disabled. */ }
    if (!options || options.updateUrl !== false) updateUrl();
    translate(document.body);
    const detail = { language: currentLanguage };
    document.dispatchEvent(new CustomEvent('phdsx:languagechange', { detail }));
    changeListeners.forEach((listener) => listener(currentLanguage));
  }

  function ensureFloatingToggle() {
    if (!document.body || document.querySelector('.site-header, .phdsx-shell, [data-i18n-toggle]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'i18n-floating-toggle';
    button.dataset.i18nToggle = '';
    document.body.appendChild(button);
    updateToggleLabels();
  }

  function installFloatingToggleStyles() {
    if (document.querySelector('[data-phdsx-i18n-style]')) return;
    const style = document.createElement('style');
    style.dataset.phdsxI18nStyle = '';
    style.textContent = `.i18n-floating-toggle{position:fixed;top:16px;right:16px;z-index:2147483000;display:inline-flex;align-items:center;justify-content:center;min-width:42px;min-height:32px;padding:0 10px;border:1px solid #dfe6ee;border-radius:7px;color:#101828;background:#fff;box-shadow:0 6px 18px rgba(16,24,40,.12);font:750 11px/1 Inter,ui-sans-serif,system-ui,sans-serif;letter-spacing:.04em;cursor:pointer}.i18n-floating-toggle:hover{border-color:#1769e0;color:#1769e0;background:#f3f7fd}`;
    (document.head || document.documentElement).appendChild(style);
  }

  window.PHDSXI18n = {
    getLanguage: () => currentLanguage,
    getLocale: () => languages[currentLanguage],
    t,
    translateValue,
    translate,
    setLanguage,
    onChange: (listener) => { changeListeners.add(listener); return () => changeListeners.delete(listener); }
  };

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-i18n-toggle]');
    if (toggle) setLanguage(currentLanguage === 'en' ? 'zh' : 'en');
  });

  function initializeDocument() {
    translate(document.body);
    const observer = new MutationObserver((records) => {
      if (applying) return;
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) translate(node);
        else translateNode(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    installFloatingToggleStyles();
    window.setTimeout(ensureFloatingToggle, 0);
  }

  if (document.body) initializeDocument();
  else document.addEventListener('DOMContentLoaded', initializeDocument, { once: true });
}());
