/* Chinese presentation layer. Original strings, comparisons, team IDs and event logic stay intact. */
import {clubNames} from './club-names.js';
const labels = {
 'PICK YOUR FANTASY LEAGUE:':'选择你的梦幻联赛', 'CHOOSE YOUR TEAM':'选择你的球队',
 'ENGLAND':'英格兰','SPAIN':'西班牙','ITALY':'意大利','FRANCE':'法国','BRASIL':'巴西','BRAZIL':'巴西',
 'GLOBAL CUP':'世界冠军杯','MEXICO':'墨西哥','N.AMERICA':'北美洲','ARGENTINA':'阿根廷','NETHERLANDS':'荷兰','GERMANY':'德国','RUSSIA':'俄罗斯',
 'INITIALIZING TEAMS...':'正在准备球队…','INITIALIZING...':'正在准备…','LOADING':'载入中','PLEASE WAIT':'请稍候',
 'SKIP GROUPS':'跳过小组赛','RANDOMIZE':'重新抽签','YES':'确定','CANCEL':'取消','NEXT':'继续','NEXT >>':'继续 →',
 'POINTS':'积分','WINS':'胜场','LOSES':'负场','GOAL DIFF':'净胜球','P:':'积分：','W:':'胜：','L:':'负：','GD:':'净胜球：',
 'P':'分','W':'胜','L':'负','GD':'净胜球','NEXT MATCHES:':'下一轮比赛','LATEST RESULTS:':'最新赛果',
 'GROUP STAGE':'小组赛','ROAD TO THE FINAL':'冠军之路','FAZA TAKMICENJA':'比赛阶段','FINAL MATCH':'决赛','1/8 FIN':'八分之一决赛','1/4 FIN':'四分之一决赛','1/2 FIN':'半决赛',
 'YOUR TURN':'轮到你射门','OPPONENT\'S TURN':'对手射门','MATCH ENDED':'比赛结束','GOAL':'进球！','MISS':'射偏了','SAVED':'扑救成功','SAVE':'扑救成功','POST':'击中门框','POINTS:':'积分：',
 'RETRY':'重踢一次','REPLAY':'重新比赛','RESTART':'重新开始','PLAY':'开始比赛','PLAY AGAIN':'再来一场','CONTINUE':'继续','HOME':'主队','GUEST':'客队',
 'YOU LOST...':'本场惜败…','YOU LOST':'本场惜败','YOU ARE OUT OF THE CUP...':'本届杯赛止步于此…','YOU HAVE WON!':'你赢了！','YOU WON THE CUP!!':'你夺得了冠军！','VICTORY':'胜利！','WINNER':'冠军',
 'TOTAL SCORE:':'总积分：','YOUR BEST SCORE:':'最高积分：','GOALS SCORED:':'射门得分：','SAVES MADE:':'成功扑救：','POINTS WON IN THIS MATCH:':'本场获得积分：','TOTAL POINTS IN THIS CUP:':'本届杯赛总积分：',
 'TAP HERE TO CONTINUE':'点击继续','CLICK HERE TO CONTINUE':'点击继续','CLICK ANYWHERE TO CLOSE THIS PANEL':'点击任意位置关闭',
 'HOW TO PLAY':'玩法说明','CLICK / TAP TO CONTROL':'使用鼠标或触屏操作','SHOOTING':'射门','GOALKEEPING':'守门',
 'WAIT TO SEE THE TARGET':'等待落点提示出现','PRESS ANYWHERE, HOLD...':'按住屏幕，锁定方向…','RELEASE TO SHOOT':'松开出脚射门','PRESS AND HOLD TO MOVE':'按住屏幕移动准星','RELEASE TO DIVE':'松开飞身扑救',
 'PRESS, HOLD':'按住屏幕','AND RELEASE':'然后松开','SCORE GOALS!':'攻破球门！',
 'TROPHY HALL:':'冠军荣誉室','CREDITS':'制作名单','CREDITS:':'制作名单','PAUSED':'比赛暂停','LANGUAGE':'语言',
 'WATCH AN AD TO SKIP GROUP?':'直接跳过小组赛？','QUICK! WATCH AN AD TO RETRY THIS SHOT?':'是否重踢这一球？','WATCH AN AD TO REPLAY THIS MATCH:':'再战一次，重新挑战',
 'THIS IS AD-SUPPORTED GAME. THANKS FOR UNDERSTANDING!':'比赛准备中，请稍候…',
 'End the current competition and return to the main menu? Are you sure?':'确定结束本届杯赛并返回主菜单吗？',
 'Club names, kit designs, and colors used in this game are fictional and any resemblance to real teams is purely coincidental. This game is not associated with or endorsed by any real team or league.':'本游戏中的俱乐部名称、球衣和配色均为虚构。如有相似，纯属巧合。本游戏与真实球队及联赛无关联。',
 'Privacy Settings':'隐私设置','Privacy policy':'隐私说明','Log in with Poki':'本地游戏','Welcome [Username]':'欢迎上场',
 'PLEASE RATE THIS APP!':'感谢你的支持！','Visit us on Facebook!':'祝你比赛愉快！',
 'DEVELOPED BY:\nNUSPEKO\n\nGRAPHICS BY:\nATAN (arkitektosathan@gmail.com)':'程序制作：\nNUSPEKO\n\n美术制作：\nATAN',
 'ALGERIA':'阿尔及利亚','AUSTRALIA':'澳大利亚','AUSTRIA':'奥地利','BELGIUM':'比利时','BOSNIA AND HERZEGOVINA':'波黑','BOSNIA & HERZEGOVINA':'波黑',
 'CAPE VERDE':'佛得角','CABO VERDE':'佛得角','CANADA':'加拿大','COLOMBIA':'哥伦比亚','CROATIA':'克罗地亚','CURACAO':'库拉索','CURAÇAO':'库拉索','CZECH REPUBLIC':'捷克','CZECHIA':'捷克',
 'DEMOCRATIC REPUBLIC OF CONGO':'刚果（金）','CONGO DR':'刚果（金）','DR CONGO':'刚果（金）','ECUADOR':'厄瓜多尔','EGYPT':'埃及','GHANA':'加纳','HAITI':'海地','IRAN':'伊朗','IRAQ':'伊拉克',
 'IVORY COAST':'科特迪瓦',"CÔTE D'IVOIRE":'科特迪瓦','JAPAN':'日本','JORDAN':'约旦','SOUTH KOREA':'韩国','KOREA REPUBLIC':'韩国','MOROCCO':'摩洛哥',
 'NEW ZEALAND':'新西兰','NORWAY':'挪威','PANAMA':'巴拿马','PARAGUAY':'巴拉圭','PORTUGAL':'葡萄牙','QATAR':'卡塔尔','SAUDI ARABIA':'沙特阿拉伯','SCOTLAND':'苏格兰',
 'SENEGAL':'塞内加尔','SOUTH AFRICA':'南非','SWEDEN':'瑞典','SWITZERLAND':'瑞士','TUNISIA':'突尼斯','TURKEY':'土耳其','TÜRKIYE':'土耳其','USA':'美国','UNITED STATES':'美国','URUGUAY':'乌拉圭','UZBEKISTAN':'乌兹别克斯坦',
 'CHINA':'中国','DENMARK':'丹麦','POLAND':'波兰','UKRAINE':'乌克兰','ROMANIA':'罗马尼亚','SERBIA':'塞尔维亚','SLOVAKIA':'斯洛伐克','SLOVENIA':'斯洛文尼亚','HUNGARY':'匈牙利','WALES':'威尔士','IRELAND':'爱尔兰','ICELAND':'冰岛','GREECE':'希腊','R. IRELAND':'爱尔兰','NORTHERN IRELAND':'北爱尔兰','R.CONGO':'刚果（金）'
};
Object.assign(labels,{
 'MEX':'墨西哥','RSA':'南非','KOR':'韩国','CZE':'捷克','CAN':'加拿大','BIH':'波黑','QAT':'卡塔尔','SUI':'瑞士',
 'BRA':'巴西','MAR':'摩洛哥','HAI':'海地','SCO':'苏格兰','AUS':'澳大利亚','PAR':'巴拉圭','TUR':'土耳其','GER':'德国',
 'CUW':'库拉索','CIV':'科特迪瓦','ECU':'厄瓜多尔','NED':'荷兰','JAP':'日本','SWE':'瑞典','TUN':'突尼斯','BEL':'比利时',
 'EGY':'埃及','IRN':'伊朗','NZL':'新西兰','ESP':'西班牙','CPV':'佛得角','KSA':'沙特阿拉伯','URU':'乌拉圭','FRA':'法国',
 'SEN':'塞内加尔','IRQ':'伊拉克','NOR':'挪威','ARG':'阿根廷','ALG':'阿尔及利亚','AUT':'奥地利','JOR':'约旦','POR':'葡萄牙',
 'COD':'刚果（金）','UZB':'乌兹别克斯坦','COL':'哥伦比亚','ENG':'英格兰','CRO':'克罗地亚','GHA':'加纳','PAN':'巴拿马',
 'CHILE':'智利','ITALIA':'意大利','CZECH R':'捷克','KOREA R':'韩国','COLUMBIA':'哥伦比亚','COSTA RICA':'哥斯达黎加','CAMEROON':'喀麦隆','NIGERIA':'尼日利亚'
});
const dictionary = new Map(Object.entries(labels).map(([a,b])=>[a.toUpperCase().trim(),b]));
export function registerNames(entries) { for(const [a,b] of entries) if(a&&!dictionary.has(String(a).toUpperCase().trim()))dictionary.set(String(a).toUpperCase().trim(),b); }
registerNames(clubNames);
function plain(s) {
 const trimmed=s.trim(), key=trimmed.toUpperCase();
 if(dictionary.has(key))return s.replace(trimmed,dictionary.get(key));
 let m=trimmed.match(/^GROUP\s+([A-L])$/i);if(m)return `${m[1]} 组`;
 m=trimmed.match(/^YOU PICKED:\s*(.*)$/i);if(m)return `已选球队：${plain(m[1])}`;
 m=trimmed.match(/^WELCOME,?\s*(.*?)[,:]?\s*\/?n?PICK YOUR FANTASY LEAGUE:$/i);if(m)return '欢迎上场，选择你的梦幻联赛';
 m=trimmed.match(/^(GOALS SCORED:|SAVES MADE:|POINTS WON IN THIS MATCH:|TOTAL POINTS IN THIS CUP:|TOTAL SCORE:|YOUR BEST SCORE:|POINTS:|P:|W:|L:|GD:)\s*(.*)$/i);if(m)return (dictionary.get(m[1].toUpperCase())||m[1])+m[2];
 if(trimmed.includes('\n'))return s.split('\n').map(plain).join('\n');
 return s;
}
export function translate(text) {
 const s=String(text??'');
 if(dictionary.has(s.toUpperCase().trim()))return plain(s);
 return s.split(/(\[[^\]]+\])/g).map(p=>p.startsWith('[')?p:plain(p)).join('');
}
const translated = new Map(), untranslated = new Set();
export function install(C3) {
 const proto=C3.Plugins.Spritefont2.Instance.prototype, originalDraw=proto.Draw, originalRelease=proto.Release;
 if(proto.__penaltyChinese)return;proto.__penaltyChinese=true;
 const cache=new WeakMap();
 proto.Draw=function(renderer){
  const source=this._text, chinese=translate(source);
  if(chinese===source){if(/[A-Za-z]{3}/.test(source))untranslated.add(source);return originalDraw.call(this,renderer);}
  translated.set(source,chinese);
  const wi=this.GetWorldInfo();if(wi.GetWidth()<=0||wi.GetHeight()<=0)return;
  let item=cache.get(this);
  if(!item){item={text:C3.New(C3.Gfx.RendererText,this._runtime.GetRenderer(),{timeout:5})};cache.set(this,item);item.text.ontextureupdate=()=>this._runtime.UpdateRender();}
  const rt=item.text,name=this._objectClass.GetName();
  const black=name==='buttonLabel';const orange=/Orange|ShotAnnouncement|HitOrMiss/.test(name);
  let fontPx=this._characterHeight*this._characterScale*.78;
  const lineLength=Math.max(...chinese.replace(/\[[^\]]+\]/g,'').split('\n').map(l=>[...l].reduce((n,c)=>n+(/[\u2e80-\uffff]/.test(c)?1:.56),0)),1);
  fontPx=Math.min(fontPx,wi.GetWidth()/lineLength*.98,wi.GetHeight()*.86);
  rt.SetBBCodeEnabled(true);rt.SetFontName('Microsoft YaHei');rt.SetBold(true);rt.SetItalic(false);
  rt.SetFontSize(Math.max(5,fontPx*.75));rt.SetFontSizeScale(wi.GetSceneGraphScale());
  rt.SetColor(black?'#251b08':orange?'#ffdc42':'#fff');
  rt.SetHorizontalAlignment(['left','center','right'][this._horizontalAlign]||'left');rt.SetVerticalAlignment(['top','center','bottom'][this._verticalAlign]||'top');
  rt.SetWordWrapMode('cjk');rt.SetLineHeight(this._lineHeight*this._characterScale);
  rt.SetText(black?chinese:`[outlineback=#071825][linethickness=0.3]${chinese}[/linethickness][/outlineback]`);
  rt.SetSize(wi.GetWidth(),wi.GetHeight(),wi.GetLayer().GetResolutionScaleFactorToZ(wi.GetTotalZ()));
  const texture=rt.GetTexture();if(!texture)return;
  renderer.SetTexture(texture,wi.GetActiveSampling());renderer.Quad3(wi.GetBoundingQuad(),rt.GetTexRect());
 };
 proto.Release=function(){cache.get(this)?.text.Release();cache.delete(this);return originalRelease.call(this);};
 const textProto=C3.Plugins.Text.Instance.prototype, update=textProto._UpdateTextForDraw;
 textProto._UpdateTextForDraw=function(){update.call(this);const source=this._text,chinese=translate(source);if(source!==chinese){this._rendererText.SetText(chinese);this._rendererText.SetFontName('Microsoft YaHei');translated.set(source,chinese);}};
}
globalThis.PenaltyChinese={translate,install,registerNames,translated,untranslated};
install(globalThis.C3);
