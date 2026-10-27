import sys,pathlib,json,re,struct,gzip,copy
ROOT=pathlib.Path('.local-tools/hole-original');sys.path.insert(0,str(ROOT/'python-deps'))
import UnityPy
from PIL import Image,ImageFont,ImageDraw
import numpy as np
from scipy.ndimage import distance_transform_edt
sys.stdout.reconfigure(encoding='utf-8')
SRC=ROOT/'captured/StreamingAssets/aa/WebGL';OUT=pathlib.Path('games/arcade/hole-city/runtime/StreamingAssets/aa/WebGL')
CHINESE=-3826777404513432057;FONTCAB='CAB-a34f8e8ba467a2865825e7729408aca5'
classes={int(k):v for k,v in json.loads((ROOT/'script-classes.json').read_text(encoding='utf-8')).items()}
translations={}
for f in ROOT.glob('*-localization.json'):
 for entry in json.loads(f.read_text(encoding='utf-8')):
  for phrase in entry.get('data',{}).get('Phrases',[]):
   lang={x['Language']:x.get('Text','') for x in phrase['Translations']}
   if lang.get('English') and lang.get('Chinese'):translations[lang['English']]=lang['Chinese']
extra=pathlib.Path(__file__).with_name('zh-extra.json');translations.update(json.loads((extra if extra.exists() else ROOT/'zh-extra.json').read_text(encoding='utf-8')))
sorted_phrases=sorted([(a,b) for a,b in translations.items() if len(a)>=5 and a not in ['level','Player','Text','Title','Name','target','name','start','claim','join','free','play']],key=lambda p:-len(p[0]))
def translate(text):
 if not isinstance(text,str):return text
 if text in translations:return translations[text]
 if text.strip() in translations:return translations[text.strip()]
 if text.strip().startswith('TXT_'):return text
 parts=re.split(r'(<[^>]+>)',text)
 for i in range(0,len(parts),2):
  s=parts[i]
  if s.strip() in translations:s=translations[s.strip()]
  else:
   for a,b in sorted_phrases:s=s.replace(a,b)
   s=re.sub(r'\bPTS\b','分',s);s=re.sub(r'\bLVL\s*','等级 ',s)
  parts[i]=s
 return ''.join(parts)

# Expand the shipped Chinese SDF atlas; preserve every original glyph coordinate.
font_path=next(SRC.glob('fonts_assets*'));font_env=UnityPy.load(str(font_path));font_obj=next(o for o in font_env.objects if o.path_id==CHINESE);ft=font_obj.read_typetree()
characters=set(''.join(translations.values())+'关卡等级分数目标拖动移动吞噬一切达到暂停继续重新开始设置挑战成功失败本地存档皮肤道具免费领取玩家第名返回主页')
characters={c for c in characters if ord(c)>=0x3000}
present={c['m_Unicode'] for c in ft['m_CharacterTable']};missing=sorted(c for c in characters if ord(c) not in present)
tex_obj=next(o for o in font_env.objects if o.path_id==ft['m_AtlasTextures'][0]['m_PathID']);texture=tex_obj.read()
assert texture.m_TextureFormat==1,'Expected Alpha8 Chinese SDF texture'
old_alpha=Image.frombytes('L',(texture.m_Width,texture.m_Height),texture.get_image_data()).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
old=Image.new('RGBA',old_alpha.size,(255,255,255,255));old.putalpha(old_alpha);width=height=1024
atlas=Image.new('RGBA',(width,height),(255,255,255,0));atlas.paste(old,(0,height-old.height));size=19;pad=5;scale=4
font=ImageFont.truetype(str(ROOT/'NotoSansSC.ttf'),size*scale)
try:font.set_variation_by_axes([700])
except Exception:pass
glyph_id=max(g['m_Index'] for g in ft['m_GlyphTable'])+1
for i,char in enumerate(missing):
 col=i%16;row=i//16;x=512+col*32;y=row*32
 if y+32>height:raise RuntimeError('Chinese atlas is full')
 bbox=font.getbbox(char,anchor='ls');bearing_x=bbox[0]/scale;bearing_y=-bbox[1]/scale;gw=int(np.ceil((bbox[2]-bbox[0])/scale));gh=int(np.ceil((bbox[3]-bbox[1])/scale))
 mask=Image.new('L',((gw+pad*2)*scale,(gh+pad*2)*scale));ImageDraw.Draw(mask).text((pad*scale-bbox[0],pad*scale-bbox[1]),char,font=font,fill=255,anchor='ls')
 binary=np.asarray(mask)>127;distance=(distance_transform_edt(binary)-distance_transform_edt(~binary))/scale
 alpha=np.clip(128+distance*128/(pad+1),0,255).astype('uint8');alpha=Image.fromarray(alpha).resize((gw+pad*2,gh+pad*2),Image.Resampling.LANCZOS)
 tile=Image.new('RGBA',alpha.size,(255,255,255,255));tile.putalpha(alpha);atlas.paste(tile,(x,height-y-tile.height))
 ft['m_GlyphTable'].append({'m_Index':glyph_id,'m_Metrics':{'m_Width':float(gw),'m_Height':float(gh),'m_HorizontalBearingX':bearing_x,'m_HorizontalBearingY':bearing_y,'m_HorizontalAdvance':font.getlength(char)/scale},'m_GlyphRect':{'m_X':x+pad,'m_Y':y+pad,'m_Width':gw,'m_Height':gh},'m_Scale':1.0,'m_AtlasIndex':0,'m_ClassDefinitionType':0})
 ft['m_CharacterTable'].append({'m_ElementType':1,'m_Unicode':ord(char),'m_GlyphIndex':glyph_id,'m_Scale':1.0});glyph_id+=1
ft['m_AtlasWidth']=width;ft['m_AtlasHeight']=height;ft['m_Name']='Noto Sans SC - 本地中文';font_obj.save_typetree(ft)
texture.m_Width=width;texture.m_Height=height;texture.m_CompleteImageSize=width*height;texture.m_MipCount=1
texture.image_data=atlas.getchannel('A').transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()
if texture.m_StreamData:texture.m_StreamData.path='';texture.m_StreamData.offset=0;texture.m_StreamData.size=0
texture.save()
for o in font_env.objects:
 if o.type.name=='Material':
  tree=o.read_typetree();dirty=False
  for key,val in tree.get('m_SavedProperties',{}).get('m_TexEnvs',[]):
   if val.get('m_Texture',{}).get('m_PathID')==tex_obj.path_id:dirty=True
  if dirty:
   tree['m_SavedProperties']['m_Floats']=[(key,float(width) if key=='_TextureWidth' else float(height) if key=='_TextureHeight' else val) for key,val in tree['m_SavedProperties']['m_Floats']];o.save_typetree(tree)
font_env.file.save # Keep the original bundle type and paths.
(ROOT/'chinese-atlas.png').parent.mkdir(exist_ok=True);atlas.save(ROOT/'chinese-atlas.png')

changed=[];disabled=[]
preload_reference_env=UnityPy.load(str(next(SRC.glob('preload_scenes*'))))
font_external=next(e for assets in preload_reference_env.assets for e in assets.externals if FONTCAB in e.path)
for path in SRC.glob('*.bundle'):
 if path==font_path:env=font_env
 elif any(k in path.name for k in ['preload_scenes','game_scenes','main_assets','shared_assets']):env=UnityPy.load(str(path))
 else:continue
 dirty=path==font_path;hide=[]
 for o in env.objects:
  if o.type.name!='MonoBehaviour':continue
  try:t=o.read_typetree()
  except Exception:continue
  cls=classes.get(t.get('m_Script',{}).get('m_PathID'),'');update=False
  if 'DefaultLanguage' in t and 'Phrases' in t:
   t['DefaultLanguage']='Chinese';t['DetectLanguage']=0;t['SaveLanguage']=0
   for phrase in t['Phrases']:
    for tr in phrase['Translations']:
     if tr['Language']=='Chinese' and phrase['Name']=='TXT_RESTORE':tr['Text']='恢复存档'
     elif tr['Language']=='Chinese' and ('广告' in tr.get('Text','') or '内购' in tr.get('Text','')):tr['Text']='免费领取'
   update=True
  if isinstance(t.get('m_text'),str):
   original=t['m_text'];localized=translate(original)
   if original!=localized:t['m_text']=localized;changed.append({'bundle':path.name,'id':o.path_id,'before':original,'after':localized});update=True
  if cls=='LeanLocalizationTMPText' and isinstance(t.get('FallbackText'),str):
   before=t['FallbackText'];after=translate(before)
   if before!=after:t['FallbackText']=after;changed.append({'bundle':path.name,'id':o.path_id,'before':before,'after':after});update=True
  if cls=='HintBalloonData' and isinstance(t.get('_text'),str):
   before=t['_text'];after=translate(before)
   if before!=after:t['_text']=after;changed.append({'bundle':path.name,'id':o.path_id,'before':before,'after':after});update=True
  if cls=='Mission' and isinstance(t.get('description'),str):
   before=t['description'];after=re.sub(r'(?i)\s*pts\b',' 分',translate(before))
   if before!=after:t['description']=after;changed.append({'bundle':path.name,'id':o.path_id,'before':before,'after':after});update=True
  # Retain the original reward button and replace its video-ad icon with the
  # original game's star icon. Reward callbacks are fulfilled locally.
  ad_sprites={2927,2972,3090,3177} if path.name.startswith('game_scenes') else {5533,5694,5788,5794} if path.name.startswith('preload_scenes') else set()
  if cls=='Image' and t.get('m_Sprite',{}).get('m_PathID') in ad_sprites:
   t['m_Sprite']['m_PathID']=3144 if path.name.startswith('game_scenes') else 5337;update=True
  # Add Chinese fallback to every text font while retaining original Latin glyphs and styling.
  if cls=='TMP_FontAsset' and o.path_id!=CHINESE:
   if path==font_path:ref=0
   else:
    ref=next((i+1 for i,e in enumerate(o.assets_file.externals) if FONTCAB in e.path),None)
    if ref is None:o.assets_file.externals.append(copy.copy(font_external));ref=len(o.assets_file.externals)
   if ref is not None:
    arr=t.setdefault('m_FallbackFontAssetTable',[])
    if not any(x['m_PathID']==CHINESE for x in arr):arr.insert(0,{'m_FileID':ref,'m_PathID':CHINESE});update=True
  if cls in ['NoAdsButton','BannerNoAdsController','NewIAPOfferController','IAPOfferView','StoreProductSlotInApp','IAPOfferTimerDisplay']:
   if t.get('m_GameObject',{}).get('m_FileID')==0:hide.append((o.assets_file,t['m_GameObject']['m_PathID'],cls))
  if update:o.save_typetree(t);dirty=True
 for assets,id,cls in hide:
  go=assets.objects.get(id)
  if go:
   t=go.read_typetree();t['m_IsActive']=0;go.save_typetree(t);dirty=True;disabled.append({'bundle':path.name,'name':t.get('m_Name'),'class':cls})
 if dirty:(OUT/path.name).write_bytes(env.file.save(packer='lz4'))

# The bootstrap scene and hint data are shipped in data.unity3d without embedded
# type trees. Reuse matching type trees from the same shipped Unity build.
data_root=ROOT/'unpacked-data';data_env=UnityPy.load(str(data_root/'data.unity3d'))
data_classes={o.path_id:o.read().m_ClassName for o in data_env.objects if o.type.name=='MonoScript'}
templates={}
for source in [next(SRC.glob('preload_scenes*')),next(SRC.glob('game_scenes*')),font_path]:
 env=UnityPy.load(str(source))
 for o in env.objects:
  if o.type.name!='MonoBehaviour':continue
  try:t=o.read_typetree();cls=classes.get(t.get('m_Script',{}).get('m_PathID'),'')
  except Exception:continue
  if cls in ('TMP_FontAsset','TextMeshProUGUI','LeanLocalizationTMPText') and cls not in templates:templates[cls]=o.serialized_type.node
data_font=next(o for o in data_env.objects if o.type.name=='MonoBehaviour' and data_classes.get(o.read_typetree(check_read=False).get('m_Script',{}).get('m_PathID'))=='TMP_FontAsset')
data_ft=data_font.read_typetree(nodes=templates['TMP_FontAsset']);data_tex_obj=data_font.assets_file.objects[data_ft['m_AtlasTextures'][0]['m_PathID']];data_texture=data_tex_obj.read();assert data_texture.m_TextureFormat==1
data_old_alpha=Image.frombytes('L',(data_texture.m_Width,data_texture.m_Height),data_texture.get_image_data()).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
data_atlas=Image.new('RGBA',(2048,2048),(255,255,255,0));data_old=Image.new('RGBA',data_old_alpha.size,(255,255,255,255));data_old.putalpha(data_old_alpha);data_atlas.paste(data_old,(0,2048-data_old.height))
font2=ImageFont.truetype(str(ROOT/'NotoSansSC.ttf'),41*scale)
try:font2.set_variation_by_axes([700])
except Exception:pass
existing={x['m_Unicode'] for x in data_ft['m_CharacterTable']};data_missing=sorted(c for c in characters if ord(c) not in existing);glyph_id=max(g['m_Index'] for g in data_ft['m_GlyphTable'])+1
for i,char in enumerate(data_missing):
 x=512+(i%24)*64;y=(i//24)*64
 if y+64>2048:raise RuntimeError('Bootstrap atlas is full')
 bbox=font2.getbbox(char,anchor='ls');bx=bbox[0]/scale;by=-bbox[1]/scale;gw=int(np.ceil((bbox[2]-bbox[0])/scale));gh=int(np.ceil((bbox[3]-bbox[1])/scale))
 mask=Image.new('L',((gw+pad*2)*scale,(gh+pad*2)*scale));ImageDraw.Draw(mask).text((pad*scale-bbox[0],pad*scale-bbox[1]),char,font=font2,fill=255,anchor='ls')
 binary=np.asarray(mask)>127;distance=(distance_transform_edt(binary)-distance_transform_edt(~binary))/scale
 alpha=Image.fromarray(np.clip(128+distance*128/(pad+1),0,255).astype('uint8')).resize((gw+pad*2,gh+pad*2),Image.Resampling.LANCZOS)
 tile=Image.new('RGBA',alpha.size,(255,255,255,255));tile.putalpha(alpha);data_atlas.paste(tile,(x,2048-y-tile.height))
 data_ft['m_GlyphTable'].append({'m_Index':glyph_id,'m_Metrics':{'m_Width':float(gw),'m_Height':float(gh),'m_HorizontalBearingX':bx,'m_HorizontalBearingY':by,'m_HorizontalAdvance':font2.getlength(char)/scale},'m_GlyphRect':{'m_X':x+pad,'m_Y':y+pad,'m_Width':gw,'m_Height':gh},'m_Scale':1.0,'m_AtlasIndex':0,'m_ClassDefinitionType':0})
 data_ft['m_CharacterTable'].append({'m_ElementType':1,'m_Unicode':ord(char),'m_GlyphIndex':glyph_id,'m_Scale':1.0});glyph_id+=1
data_ft['m_AtlasWidth']=data_ft['m_AtlasHeight']=2048;data_font.save_typetree(data_ft,nodes=templates['TMP_FontAsset'])
data_texture.m_Width=data_texture.m_Height=2048;data_texture.m_CompleteImageSize=2048*2048;data_texture.m_MipCount=1;data_texture.image_data=data_atlas.getchannel('A').transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()
if data_texture.m_StreamData:data_texture.m_StreamData.path='';data_texture.m_StreamData.offset=0;data_texture.m_StreamData.size=0
data_texture.save()
mat_obj=data_font.assets_file.objects[data_ft['m_Material']['m_PathID']];mat=mat_obj.read_typetree();mat['m_SavedProperties']['m_Floats']=[(key,2048.0 if key in ('_TextureWidth','_TextureHeight') else val) for key,val in mat['m_SavedProperties']['m_Floats']];mat_obj.save_typetree(mat)
def replace_serialized(raw,old,new):
 a=old.encode('utf-8');b=new.encode('utf-8');before=struct.pack('<I',len(a))+a+bytes((-len(a))%4);after=struct.pack('<I',len(b))+b+bytes((-len(b))%4)
 assert raw.count(before)==1,(old,raw.count(before));return raw.replace(before,after,1)
for o in data_env.objects:
 if o.type.name!='MonoBehaviour':continue
 try:base=o.read_typetree(check_read=False);cls=data_classes.get(base.get('m_Script',{}).get('m_PathID'),'')
 except Exception:continue
 if cls in ('TextMeshProUGUI','LeanLocalizationTMPText'):
  t=o.read_typetree(nodes=templates[cls]);key='m_text' if cls=='TextMeshProUGUI' else 'FallbackText';before=t.get(key,'');after=translate(before)
  if before!=after:t[key]=after;o.save_typetree(t,nodes=templates[cls]);changed.append({'bundle':'data.unity3d','id':o.path_id,'before':before,'after':after})
 if cls=='HintBalloonData':
  raw=o.get_raw_data()
  for a,b in [('<color=#FFC60B>Eat everything</color> to reach the score target!','<color=#FFC60B>吞噬一切</color>，达到目标分数！'),('<color=#FFC60B>Eat the targets</color> to complete the level!','<color=#FFC60B>吞噬目标</color>，完成关卡！')]:
   if a.encode() in raw:raw=replace_serialized(raw,a,b);o.set_raw_data(raw);changed.append({'bundle':'data.unity3d','id':o.path_id,'before':a,'after':b})
patched_unity_data=data_env.file.save(packer='lz4')

# Rewrite only unambiguous presentation literals; do not translate method names, tags, or save keys.
safe_literals={k:v for k,v in translations.items() if len(k)>7 and (' ' in k or '\n' in k) and '<' not in k}
safe_literals.update({'LVL {0}':'{0}级','lvl {0}':'{0}级','LEVEL ':'关卡 ',' LVL ':' 等级 ',' PTS':' 分','PTS':'分','{0} pts':'{0} 分','{0}pts':'{0}分','REWARD: {0} pts':'奖励：{0} 分'})
metadata=bytearray((data_root/'Il2CppData/Metadata/global-metadata.dat').read_bytes());table,table_bytes,start,length=struct.unpack_from('<4I',metadata,8);literal_data=bytearray();literal_changes=[]
for i in range(table_bytes//8):
 size,offset=struct.unpack_from('<II',metadata,table+i*8);raw=bytes(metadata[start+offset:start+offset+size]);s=raw.decode('utf-8',errors='replace')
 translated=safe_literals.get(s,s);new=translated.encode('utf-8') if translated!=s else raw
 if translated!=s:literal_changes.append({'before':s,'after':translated})
 struct.pack_into('<II',metadata,table+i*8,len(new),len(literal_data));literal_data.extend(new)
padding=(-len(literal_data))%4;literal_data.extend(bytes(padding));delta=len(literal_data)-length
for position in range(8,table,8):
 offset,count=struct.unpack_from('<II',metadata,position)
 if offset>=start+length:struct.pack_into('<I',metadata,position,offset+delta)
struct.pack_into('<I',metadata,20,len(literal_data));metadata=metadata[:start]+literal_data+metadata[start+length:]
# Preserve WebData entries and their order, adjusting its offsets after metadata growth.
entries=json.loads((ROOT/'data-entries.json').read_text());header_size=20+sum(12+len(e['name'].encode()) for e in entries);header=bytearray(b'UnityWebData1.0\0'+struct.pack('<I',header_size));payload=bytearray()
for entry in entries:
 name=entry['name'];raw=bytes(metadata) if name.endswith('global-metadata.dat') else patched_unity_data if name=='data.unity3d' else (data_root/name).read_bytes();encoded=name.encode();header.extend(struct.pack('<III',header_size+len(payload),len(raw),len(encoded))+encoded);payload.extend(raw)
pathlib.Path('games/arcade/hole-city/runtime/game.data.gz').write_bytes(gzip.compress(bytes(header+payload),compresslevel=9,mtime=0))
(ROOT/'localization-report.json').write_text(json.dumps({'ui':changed,'literals':literal_changes,'hidden_purchase_ui':disabled,'added_chinese_characters':''.join(missing),'dictionary':translations},ensure_ascii=False,indent=2),encoding='utf-8')
print('UI translations',len(changed),'runtime literals',len(literal_changes),'hidden purchase UI',len(disabled),'new glyphs',len(missing))
