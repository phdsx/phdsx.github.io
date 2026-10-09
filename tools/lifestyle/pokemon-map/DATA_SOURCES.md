# 数据来源核实与限制

## iFlowGo 自定义坐标查询（2026-10-09）

- 来源：[PoGo Radar](https://pokecoords.iflowgo.com/)。读取公开 `app.js?v=20260805-4` 和 `api-config.js?v=20260729-3` 核实协议；未执行下载脚本。
- GET `/iflowgopokecoords/api/v1/nearby` 参数为 `lat`、`lon`、`radius_km`、`layers=spawns,raids,quests`、`limit`。本站允许 1–15 km，按用户选择发送类别，每类最多 800 条；达到上限明确提示可能截断。搜索不受原有纽约 / 旧金山 2 km 试点限制，返回位置仍按实际圆形半径检查。
- 本次时代广场 40.758000,-73.985500、2 km、limit=3 的真实请求同时返回 3 条宝可梦、3 条团体战、3 条任务，取得非空团体战结构。这是验证时点数量，不代表完整性或覆盖。
- 宝可梦使用已有 Radar 映射；团体战：`id`→原始 ID，`gym_name`→地点，`raid_level`→等级，`raid_pokemon_id`→首领编号，`raid_battle_at` / `raid_end_at`→带时区起止时间，`lat` / `lon`→坐标。首领缺失和队伍未知均保留未知，不虚构实时占领。
- 任务保留 `id`、`pokestop_name`、`quest_title`、`quest_rewards` 和全部 raw 字段；没有核实任务截止时间，保持未知。没有火箭队类别。长 ID 始终保留字符串，拒绝已丢失精度的数字 ID。
- `generated_at` 只代表响应生成时间，不能冒充扫描观测时间。上游没有公布完整扫描覆盖。过期宝可梦及团体战不进入结果，异常坐标被拒绝。
- 初始坐标为空，所有数据 Hook 在搜索前关闭；快捷地点只填值。搜索后每五分钟刷新同一组已提交参数；本地筛选、地图移动、类别图层开关都不请求上游。同查询临时失败保留旧缓存，新查询清空旧记录，授权失败清除记录。
- 带 `Origin: https://phdsx.github.io` 的实际响应没有 `Access-Control-Allow-Origin`。任意坐标实时查询必须经本站 API；Worker 对公开匿名坐标搜索提供 CORS，静态客户端可在构建时指定服务地址。纯静态快照不能支持任意用户坐标，不回退到固定试点数据。

## GitHub Pages 静态快照适配（2026-10-08）

已实测 GitHub Pages 的 `/tools/lifestyle/pokemon-map/api/snapshot` 返回 HTTP 404；NYC `query2.php` 返回 HTTP 200，但没有 `Access-Control-Allow-Origin`，不能由本站浏览器可靠直连。新增 GitHub Actions 定时采集，将现有五个接口的实际响应保存为 JSON / gzip 文件并随站点部署。纯静态页面读取这些文件，API 部署仍走原接口。

定时快照保留每个来源的实际 `fetchedAt`、原始 ID、raw 字段及授权/限流状态。页面明确区分采集时间和读取时间，旧快照不会因刷新改变采集时间；宝可梦与活动的到期裁剪继续在本地执行。Actions 安排五分钟采集，但任务与部署可能延迟，页面刷新只取得最近发布版本。全部宝可梦来源失败时停止部署，保留线上原版本。首次启用与检查步骤见 `deployment/README.md`。

本地真实静态导出取得 NYC 1648、London 527、SG 675、Sydney 1173、Van 297、Radar SF 195、Radar NYC 159 条当时未到期记录；PGC 保持 `authorization`、0 条记录，不导出锁定坐标。该次采集完成于 2026-10-08 23:01:42（Asia/Shanghai），数字仅为验证时点记录，不能作为长期固定数据。

核实日期：2026-10-08（Asia/Shanghai）。页面只展示上游实际返回、符合地理归属的记录；宝可梦坐标锁定时不绘制。PogoMap 社区坐标按实际公开脚本解码，不能保证位置精度。新取得的社区目录与先前固定参考快照分别处理，测试夹具不会进入网页。宝可梦、Stop 任务和火箭队每 5 分钟更新快照，静态社区 Stop 在打开时读取一次；道馆社区目录和团体战在打开页面时读取一次，之后仅在缓存中筛选。展示始终受当前地图视野限制。

## NYC PokéMap

- 页面：https://nycpokemap.com/ 。公开脚本：https://nycpokemap.com/js/script.js?ver870 。本次解析该脚本，未执行下载的代码。
- 脚本实际请求 GET https://nycpokemap.com/query2.php ，参数 bounds=west,east,south,north、since、mons、time；bounds 模式使用 since=0 取得快照。没有臆造接口。
- 普通请求曾返回空响应。带来源页 Referer 和 Accept: application/json 的公开请求成功返回 JSON，未登录或绕过验证。10:11 左右一次曼哈顿范围请求返回 61 条记录，之后本地页面取得新的实际记录，数量随时间变化。
- 结构为 pokemons[] 与 meta.time/meta.inserted。pokemon_id→编号；lat/lng→位置；attack/defence/stamina→IV；cp→CP；level→等级；despawn→Unix 秒消失时间；form→形态 ID。
- 名称从公开脚本 pokeArray 解析；形态名称来自 https://nycpokemap.com/json/forms.json?ver870 。未映射的名称显示未知，原始代码保留在 raw。
- 响应没有可核实的稳定出现 ID。m 在重复查询间改变，不能当作出现 ID。rawId=null；内部键由来源、物种、形态、经纬度和消失时间组成。原始 m 仍保留在 raw。
- 最新复核：对官方城市边界的外接范围使用 since=0、mons=空的请求成功返回 2024 条上游记录（约 566 KB）。此范围独立于地图缩放和筛选，随后按纽约行政归属及消失时间过滤。该结果不证明来源扫描覆盖整个城市。
- 本站每 5 分钟更新全市范围快照，多个页面共享服务器快照与同一个到期时间。手动刷新可提前更新，遵守来源最小请求间隔；刷新、缩放和筛选都不会先清空旧结果。来源原页面每 30 秒查询，并不是本站现在的更新频率。
- FAQ：https://nycpokemap.com/faq.html 。消失时间为近似值；IV/CP 不保证每条记录都有，适用于等级 30 及以上训练家。-1 转成 null，真正零 IV 保留。
- 没有发现可核实的完整扫描覆盖边界。因此覆盖配置为 null，页面提示“扫描覆盖范围未确认”。城市行政边界和出现点包络不能代替扫描覆盖。

## Pokémon GO Coordinates

- 页面：https://pokemongocoordinates.com/pokemongomap/ 。实际公开脚本同时使用全局免费流 GET /api/map/free?limit=500 和带 min_lat/max_lat/min_lon/max_lon 的区域扫描。当前本站接入全局流，将地图视野限制放在本地缓存展示层；新增来源的固定负责区域排除 PGC 叠加。
- 页面另有 /api/map/area、/api/feed/custom、/api/hundofeed 和会员验证逻辑。本站未猜测会员凭证，也未将会员功能伪装为免费可用。
- 未带来源页 Referer 的本次请求返回 HTTP 403；带来源页 Referer 和 Accept 的请求返回 schema_version、generated_at、count、rows、next_cursor、coordinates_locked。
- 伦敦和 Zaragoza 的区域请求返回 rows=[]、coordinates_locked=true。纽约测试请求返回 7 条记录，仍 coordinates_locked=true，坐标已降精度。纽约样本仅用于字段核实；默认纽约市内只展示 NYC 数据；可选 iFlowGo 试点按区域替换，不叠加。
- 最新复核：无视野参数的全局免费流请求实际返回 HTTP 200、500 条 rows、next_cursor 和 coordinates_locked=true。因此它不是已授权的全球完整精确坐标快照；当前只显示需要授权，不绘制其中的降精度位置。
- 字段映射：provider_unique_id/encounter_id→原始 ID；pokemon_name/pokemon_id→名称/编号；form/form_id→形态；lat/lon→位置；iv/cp/lvl→属性；expires_at_utc→带时区消失时间；disappear_time_verified→时间核实标记。
- HTTP 200 且 coordinates_locked=true 仍显示“需要授权”，精确坐标不可用的记录不进入地图、列表或统计。没有把近似位置当作真实出现位置。
- 本次没有从 PGC 取得可在纽约市外展示的精确坐标。空响应或锁定状态不能证明地区没有宝可梦，也不能证明全球覆盖。
- 来源的免费入口最小间隔为 60 秒，手动刷新遵守该间隔。已核实来源脚本把 next_cursor 作为 cursor 参数继续读取；精确坐标可用时按此协议跟进，最多 20 页，仍未读完明确标注部分快照。当前锁定响应在首屏即停止，不浪费请求读取不能展示的后续页。

## PogoMap.info 社区道馆（按用户指定参考新增）

- 用户指定页面：https://www.pogomap.info/location/40,772124/-73,965497/14 。该页面实际引用 /js/mapsys649.js、/js/extras-v3.js 和 /js/others/jquery-2.2.4.min.js；读取源码核实接口与解码规则，没有执行下载的脚本。
- 真实目录入口为 POST https://www.pogomap.info/includes/it150nmsq9.php 。先 GET 首页建立来源自己签发的匿名 PHPSESSID，然后提交 fromlat/tolat/fromlng/tolng；fpoke=0、fgym=1、farm=0、fpstop=0、nests=0、priv=0、raids=0、sponsor=0、usermarks=0、ftasks=0、viewdel=0、voteonly=0、modonly=0、agedonly=0、modnone=0、showonly=0、routesonly=0。请求固定 NYC 行政边界外接矩形，与地图缩放和筛选无关。
- 无匿名会话实际返回 {"spam":1,"spamtype":2}，映射为需要授权；其他 spam 映射为来源限流。服务端只使用自己新建立的匿名会话，绝不读取、存储或转发用户 Cookie、账号会话或 Cloudflare 凭证。社区目录不参与定时或手动刷新，每次打开读取一次；多个同时打开的页面合并请求，服务端保留 60 秒最小间隔。
- PowerShell 的公开匿名会话请求成功，响应共 354 项，其中 350 项场所分类为 Gym，349 条解码坐标在请求矩形内；按真实纽约市行政边界裁剪后取得 205 条社区道馆。该数量是本次取得结果，不能代表纽约市全部道馆。未核实全球全量接口或完整性/分页协议，因此成功读取也标为“部分快照”。
- 字段映射：zfgs62 经 base64 解码为原始 POI ID；xgxg35 解码为分类，2 为 Gym；poke_enabled=2 为当前目录场所，1 为移除；rfs21d 为名称，rgqaca 为原记录 slug；z3iafj/f24sfvs 经 base64 解码后按公开脚本转换为经纬度；g74jsdg 解码后 1/2/3/4 分别为社区报告蓝/红/黄/无队伍，0 为未知；exraid_status 为社区精英标记，sponsor_status 为无/赞助/营地，verified 为来源核实标记。原始字段保留在 raw。
- extras-v3.js 明确 stringpad.spadding 为 base64，jqueryscrollzoom=1.852。mapsys649.js 的实际坐标转换为 lat=decodedLat/(10.62/12)*1.91*rawId/1.852/1e6、lng=decodedLng/1.5935*1.952*rawId/1.852/1e6。原始 ID 必须与响应对象键一致，坐标必须合法并在请求范围内。曾遇到名称异常、坐标整体落在范围外的响应，程序拒绝异常结果，不猜测平移或补正坐标。
- 原记录核对：https://www.pogomap.info/gym/congregation-of-zarua/93363536 ，名称和 ID 匹配；社区目录解码位置 40.777091,-73.957909，单条详情 HTML 位置 40.777126,-73.957785，观察到十余米差异。按目录坐标展示，不自行修正，也不宣称精准。
- 原 Node / Worker HTTP 客户端收到 Cloudflare “Just a moment...” HTTP 403；普通 Windows PowerShell 匿名请求实际取得 HTTP 200。当前本地 Vite 服务在 /api/gym-directory 使用 PowerShell 7 标准 HTTP 客户端，先新建来源签发的匿名会话再提交同一已核实表单；实际取得并按行政边界裁剪出 205 条道馆。没有使用用户 Cookie、账号、浏览器配置、验证凭证或 CAPTCHA 处理。PowerShell 进程隐藏运行，只接收固定范围表单，不接受任意地址或用户提交的 Cookie。错误如实返回，不修改 TLS 校验或安全设置。
- 新取得的目录按实际完成时间设置 fetchedAt，updatedAt 仍为未知，正常结果不继承 referenceAt。本地成功不代表 Worker 上线环境成功；线上普通 fetch 路由的访问结果需重新核实，失败显示服务端访问被拒绝，不提示用户必须登录。
- 先前实际公开响应固定保存于 lib/pokemon/pogomap-reference.json；采集时间 1791438896004，即 2026-10-08 13:54:56（Asia/Shanghai）。裁剪后的参考记录与实时记录通过 referenceRecords/referenceAt 分开返回，每条记录也带 referenceAt。仅在打开时读取失败且没有新取得目录时显示为“Pogo 参考”；动态数据刷新不改变采集时间，成功但空的实时目录不重新显示参考点。文件不包含 Cookie 或凭证。
- 社区报告队伍不写入实时 team，团体战字段均未知。仅当名称一致、坐标保留 6 位后完全一致且两侧匹配唯一时，附加 NYC 团体战；保留两条来源原始 ID/raw。社区精英、赞助和核实标记不保证当前游戏状态；照片、守馆宝可梦和空位未知。每条记录提供真实原记录链接。
- 参考及成功取得的目录只在纽约市内按当前视野、名称和图层开关展示。PogoMap 当前仅有纽约固定目录窗口；新增城市的设施由各区域 PokéMap 来源提供。PogoMap 官网链接随当前视野更新。

## NYC 道馆团体战、补给站与火箭队

- 页面 https://nycpokemap.com/gym.html 实际加载 js/script_gym.js?ver870，脚本请求 GET https://nycpokemap.com/raids.php?time=...。实测 HTTP 200，返回 raids、battles、weathers、meta；本次 raids=[]。仅接入 raids，道馆名称来自 gym_name，经纬度来自 lat/lng，team 为 0 无队伍、1 Mystic、2 Valor、3 Instinct；pokemon_id、form、level、cp、raid_start、raid_end 为团体战字段。未混入 battles 中的极巨站点，也未伪造没有团体战的道馆。
- 页面 https://nycpokemap.com/pokestop.html 实际加载 js/script_pokestop.js?ver870，脚本请求 GET https://nycpokemap.com/pokestop.php?time=...。实测 HTTP 200，返回 invasions 与 meta，本次 1334 条；字段 name、lat、lng、invasion_start、invasion_end、character、type。数量随活动更新而变化。
- 火箭队角色与属性依据脚本的 grunts / males / females 映射。41/42/43 为 Cliff/Arlo/Sierra，需要火箭队雷达；44 为 Giovanni，需要超级火箭队雷达。脚本 grunts 顺序把角色 48 归为 Ghost，保留该优先级。没有映射的角色显示未知，不猜测新角色。
- type=7 为金币活动，8 为变隐龙，9 为展示赛；500–510 为 NPC，不误标为火箭队。已知活动到期后在本地移除火箭队标记；场所坐标仍是本次快照报告的补给站地点。
- 页面 https://nycpokemap.com/quest.html 实际加载 js/script_quest.js?ver870，脚本请求 GET https://nycpokemap.com/quests.php，使用 jQuery quests[] 多值参数。空筛选实测返回 quests=[] 与 filters，并非完整补给站目录。按脚本规则把公开 filters 的 t3/t8 转成 type,amount,0，t2/t4/t7/t9/t12 转成 type,0,reward，再请求所有公开选项。本次 180 个选项返回 15575 条任务地点，约 3.8 MB；不是用户筛选触发的请求。
- 任务字段 name、lat、lng、conditions_string、rewards_string；脚本引用 expiration，但本次真实响应未提供，结束时间保留为未知。不按本机时区猜测任务期限。未知目录类型或超过保护上限时标为部分快照。
- 三类请求带各来源页面 Referer 和 Accept: application/json。没有登录或绕过授权。每个端点遵守最小 2 秒间隔；任务目录和全任务请求之间同样遵守间隔。
- /api/snapshot 定时更新宝可梦、NYC 与已接入区域的任务和活动。PogoMap 道馆目录通过 /api/gym-directory、NYC 团体战通过 /api/gym-raids，在每次打开页面时分别取得一次。两个道馆接口都不参与五分钟周期或手动刷新，筛选、缩放、分类切换也不重取。React 严格模式重复运行 effect 时复用同一初次读取 Promise。各来源状态、来源时间和取得时间独立保留；有明确结束时间的团体战在本地标记结束。
- 所有地点按纽约市行政归属裁剪。任务与活动按来源和实际精确坐标合并为一个补给站，原始记录仍分别保留。公开记录未提供原始场所 ID，rawId=null，界面标为未知；内部推导键不是原始 ID。
- PGC 公开地图页面及已取得脚本未发现道馆、补给站、火箭队接口。本站没有猜测 /api/gyms 等路径，也没有给纽约市外提供其他来源伪装的设施数据。
- 这三个 NYC 接口不提供全量静态场所目录、照片、守馆空位或诱饵详情。扫描覆盖仍未确认；无活动、无任务或无团体战的地点可能未返回。设施数据范围说明在页面中可展开查看。

## 新增区域来源与接入策略（2026-10-08）

- London PoGo Map（https://londonpogomap.com/）、SG PokéMap（https://sgpokemap.com/）、Sydney PoGo Map（https://sydneypogomap.com/）、Van PokéMap（https://vanpokemap.com/）的 script.js、script_gym.js、script_quest.js、script_pokestop.js?ver870 均已实际核实。匿名 GET query2.php、raids.php、quests.php、pokestop.php 使用来源页面 Referer 和 JSON Accept，实际返回符合结构的 HTTP 200。
- 宝可梦使用 query2.php?bounds=west,east,south,north&since=0&mons=&time=...；字段与 NYC 协议族相同，逐来源统一适配并保留 raw。没有把 m 当作稳定原始 ID。团体战只读 raids，不把 battles 当 Gym；任务选择来源自己公布的 quests[] 目录；活动分别识别火箭队、金币、变隐龙、展示赛和 NPC。
- 配置固定操作窗口：伦敦 (-0.52,0.33,51.28,51.70)，新加坡 (103.59,104.10,1.15,1.48)，悉尼 (150.90,151.40,-34.10,-33.60)，温哥华 (-123.30,-122.95,49.18,49.38)，顺序为 west,east,south,north。这些是本网页的取数和显示窗口，既不是已核实的行政边界，也不是扫描覆盖。成功仍标记部分快照，不把空白区域当无宝可梦或已覆盖。来源相互独立的上游证据不足。
- 16:44 本地接口实际返回未到期宝可梦：伦敦 472、新加坡 654、悉尼 1191、温哥华 333；任务与活动均取得实际数组，区域团体战读取成功，温哥华为空。数字是该时点响应结果，可能很快到期，不作为固定展示数据。
- iFlowGo 首页 https://pokecoords.iflowgo.com/ 的 api-config.js 与 app.js 公布 API 前缀 /iflowgopokecoords/api/v1。实际验证 /health 与 /nearby?lat=...&lon=...&radius_km=2&layers=spawns,raids,quests&limit=100，随后使用页面支持的 limit=800 复核。当前运行请求只选择已核实可适配的 spawns,quests，不取未核实非空返回的 Radar 团体战。
- Radar 固定两个 2 km 试点：SF (37.75694,-122.40935)，NYC (40.772124,-73.965497)。实际 spawns 字段 id（字符串）、lat/lon、pokemon_id、cp、level、percent_iv、expires_at；原始 ID 完整保留，无法确认其跨来源命名空间。没有形态，form=null，配图明确为图鉴示意。generated_at 只是响应生成时间，不是观测更新时间，updatedAt 保持未知。
- 16:44 固定试点实际取得 SF 208、NYC 195 条未到期出现记录，SF 2 条任务、NYC 0 条任务。Radar 任务保留 id、pokestop_name、quest_title 与原始结构化 quest_rewards，未取得任务到期时间。达到每层 800 条上限明确标注截断，未达到上限仍不承诺完整扫描覆盖；没有全球完整快照或分页协议证据。
- 默认纽约保留 NYC；最新“宝可梦数据源”选择器替代原试点开关：自动模式使用 NYC；手动选择 iFlowGo 纽约试点只显示该试点∩行政 NYC 范围的实际记录，圈外不自动回到 NYC。设施来源不受该开关影响。两个来源不同时绘制同一负责区域，失败不自动换源。没有以临近坐标推断跨来源 encounter，也没有将两家数量相加当独立个体。
- Source registry 对整个视野做多边形交集和差集；同一位置只由一个宝可梦来源负责。PGC 只显示剩余区域。所有固定窗口每五分钟取快照，平移、缩放、筛选、来源开关和图层只在缓存里裁剪；切换地区保留统一筛选，不引入新的地图触发请求。每源的请求状态、取得时间、未知观测时间和失败原因分别显示。
- 区域任务、活动参与 /api/snapshot 五分钟周期；区域团体战通过 /api/regional-gyms 在每次打开页面时读取一次，不参加手动或周期刷新。普通请求保持单端点至少 2 秒间隔，并发刷新共享在途 Promise。

## PogoMap 静态 Stop 目录

- 新增 /api/stop-directory；沿用已经核实的普通匿名 GET 首页和 POST includes/it150nmsq9.php 传输。实际脚本与响应验证 fpoke=1 是 Stop，fgym=1 是 Gym，fpstop=1 是 Power Spot。Stop 请求明确 fpoke=1,fgym=0,fpstop=0，其他参数与已核实目录请求相同。
- xgxg35 解码分类 1 为 Stop，2 为 Gym，9 等其他社区分类不当 Stop；poke_enabled=2、原始 ID 等于对象键、坐标转换和越界比例检查与道馆一致。异常结果拒绝绘制，不自行修正。来源更新时间未知，取得时间记录本次实际请求。
- 本次读取 267 条位于 NYC 行政范围内的静态 Stop；目录不保证完整，与实时活动分开。只打开时读取一次，不进入五分钟周期或动态刷新。接口没有实时诱饵、Rocket 或任务，不从社区标记猜测活动。
- 只有名称一致、坐标六位相同且匹配唯一时，与任务/活动合并一个位置；保留静态原始 ID，以及所有附加任务/活动各自原始来源和 ID。否则保留独立记录而不猜测对应关系。
- CEA、PoGO Alerts、官方登录地图、Golbat 软件接口、旧 WeCatch 等保持未接入；权限、精度、订阅、覆盖或实际接口尚未核实。详见本目录旁 pokemon-data-source-research.md。研究候选清单仍是证据文件，不是运行配置。

## 边界、取数与覆盖（通用）

- 纽约市 DCP 官方五区边界（包括水域）：https://data.cityofnewyork.us/City-Government/Borough-Boundaries/wh2p-dxnf 。原始文件保留在 public/nyc-boundary.geojson。
- 相邻行政区共享边界的浮点尾数在布尔计算时统一为 7 位小数，约厘米精度，避免数值裂缝；原始文件不修改。
- 默认 NYC 负责视野∩城市边界；四个城市来源负责各自配置的请求窗口，iFlowGo SF 负责固定 2 km 试点，其余地区由 PGC 负责。手动选择来源后只用所选宝可梦来源，仍限制在它的已接入范围及当前视野，不叠加其他来源。判定覆盖整个视野，未使用地名、中心点、四角或城市外接矩形代替空间关系。
- 最新要求覆盖了此前“取数始终限制在视野”的策略：NYC 请求固定全市外接范围，PGC 请求公开全局流；来源边界判断、图鉴/数值筛选和视野裁剪全部在本地缓存中完成。纽约市内 PGC 记录始终排除，不叠加显示。
- 跨日期变更线的视野在本地空间判断中拆分；不再因为这个操作发起两次网络查询。行政边界上的点归 NYC，PGC 排除。
- 动态数据入口 /api/snapshot 在首次加载、5 分钟到期或手动刷新触发；两个道馆入口仅首次打开触发。地图 moveend 只更新 bounds。网络更新与地图聚合、标记渲染相互独立；每秒倒计时不会重建内容未变的地图 GeoJSON。
- 动态来源暂时请求失败保留上次可用缓存并显示更新时间与旧缓存标记；授权失效或坐标锁定清除该来源记录。动态来源失败没有额外自动重试计时器，下一次仍按 5 分钟周期或手动刷新。道馆失败不进入该周期，重新打开页面时再读取。
- lib/pokemon/coverage.json 独立于行政边界，初始两个来源都为 null。日后取得来源发布的扫描边界，填写 sourceUrl、verifiedAt 与 GeoJSON feature 后，程序会裁剪实际扫描区域，将未覆盖区域标成橙色并显示“数据源未覆盖”。当前不能识别未公开的真实覆盖缺口，这是尚未满足实测覆盖验收的来源限制。

## 验证记录

- 配图使用 PokéAPI 官方图鉴画稿：仓库 https://github.com/PokeAPI/sprites ，固定版本 d72f64eb74912747cb5c5579061ced4842ba0a98（2026-10-07T13:41:00Z）。实际 official-artwork 文件清单未截断，包含 1–1025 的全部基础图鉴图片；仅采用已核实存在的数字 ID PNG，不使用闪光重绘图。
- 物种及变体名称取自实际公开接口 https://pokeapi.co/api/v2/pokemon-species?limit=2000 和 https://pokeapi.co/api/v2/pokemon?limit=2000 。按物种名和实际变体后缀构建本地映射；阿罗拉、伽勒尔和洗翠的 52 组 NYC 物种/形态映射另用 PokéAPI 元数据确认物种归属和配图 URL。
- 例如 GO 20/form48→raticate-alola→10092.png，83/form2338→farfetchd-galar→10166.png，263/form946→zigzagoon-galar→10174.png；GO 原始形态代码与 PokéAPI 编号属于不同体系，不能直接拿 form 当图片 ID。
- 当前真实记录中的 Squawkabilly White，经 https://pokeapi.co/api/v2/pokemon/squawkabilly-white-plumage 核实为物种 931、图片 10262；来源短名称 White 映射到 white-plumage，对应白色配图。
- 已对固定版本的 25、10092、10166、10174、10229 图片实测 HTTP 200、image/png、475×475。配图转为保留透明通道的 224px WebP 本地资源，列表和地图共享，图片加载不会改变来源记录、视野、计数或筛选。
- 形态未确认时显示“图鉴配图”，详情明确“形态未知”；已知但未匹配的服装等特殊形态明确“该形态配图未收录”。失败使用带“暂无配图”的占位，地图使用问号。地图异步配图只缓存纹理，绝不回写出现记录，避免旧视野图片请求影响当前数据。
- 仓库 README 明确图像版权归 The Pokémon Company；LICENCE.txt 的 CC0 声明保留商标及第三方权利限制。页面提供来源链接，源码包保留图片来源和版权说明。

- TypeScript 检查通过，51 项自动检查通过，包含 5 分钟调度、并发刷新合并、失败保留缓存/授权失效清空、固定范围取数参数、多页面共享快照到期时间，以及道馆阶段、任务目录协议、补给站合并和火箭队到期移除。新增定时/手动刷新不查询任何道馆来源、本次取得时间与参考日期分离，以及 PogoMap 真实传输字段、匿名会话拒绝/限流、异常坐标拒绝、唯一匹配合并及原始来源保留、固定参考日期和成功空目录不复活参考点的检查。
- 本地配图资源共 1347 张，下载失败数 0。修复 MapLibre 6.13 默认 Worker URL 在 Vite 依赖预编译目录中无法加载的问题，使用同版本本地 Worker 文件，使出现点配图和聚合正常绘制；保留 MapLibre BSD 版权文件。
- 本地 API 成功取得 NYC 真数据，PGC 锁定状态返回 authorization，未静默切换来源。
- 地图移动不取消网络更新，也不清空快照。当前视野始终从同一份缓存重算，较早的快照请求不能覆盖新一代请求；筛选条件独立保留。
- 浏览器检查了来源切换、IV 条件和地点名称保留、双来源状态、PogoMap 参考详情与原记录链接，以及独立大详情面板的桌面/手机布局和 Escape 关闭；筛选、地区切换和手动动态刷新没有重取道馆目录。生产构建完成。

## 交付状态

本地可运行源码与源码 ZIP 已交付。Sites 站点已注册，但没有成功发布版本：终端凭据输入被自动审批拒绝（会话禁用了该操作所需的沙箱审批），专用管道方式随后在源码推送阶段遇到网络解析进程错误。没有提供未经成功发布验证的在线地址。

新增压缩传输：网页通过 Accept: application/vnd.pokemon.snapshot+gzip 协商压缩格式并在客户端解压，避免当前框架移除 Content-Encoding 响应头造成解析失败。不支持解压或未协商的 API 客户端继续取得标准 JSON。保持全部实际记录、字段与原始 ID；本次约 60 MB JSON 的 gzip 体积约 7.2 MB，不删除字段或把缓存显示成全量覆盖。压缩回归检查验证原始字符串 ID 和 raw 字段完全不变。


## 用户选择宝可梦数据源（最新设置）

- “数据源设置”提供自动模式和八个已接入来源/试点的单选。选择保存在浏览器本地；无效旧值回到自动模式，存储不可用时仍可在本次打开中使用选择。
- 自动模式沿用整个视野的地区分工；手动模式只用所选来源，地图移动不改变选择，跨边界也不补充另一来源。缩放、切换、筛选不发起新请求；五分钟快照和手动动态刷新保持原行为。
- 手动选择 NYC 仍受行政边界限制，四城市受固定操作窗口限制，Radar 受指定 2 km 试点限制；超出已接入范围的空视野明确提示，不能等同于实际扫描覆盖缺口。提供一键前往已接入城市/试点范围。
- PGC 公共缓存保留实际返回的所有已开放精确坐标记录，不在服务端提前排除纽约；自动展示仍按归属排除 NYC 和新增来源区域。用户明确手动选择 PGC 时，可显示该来源实际授权开放的数据。当前仍 coordinates_locked=true，记录为空并显示需要授权，没有绕过锁定。
- 该设置只作用于宝可梦。设施按当前地区独立选择来源，图层、地点查询和道馆打开时读取行为保持不变。
- 新增三项检查：手动选择不叠加且保留筛选，指定来源跨区域与 PGC 手动覆盖规则，以及混合视野/跨日期线的范围裁剪和无效保存值处理；共 51 项检查。
