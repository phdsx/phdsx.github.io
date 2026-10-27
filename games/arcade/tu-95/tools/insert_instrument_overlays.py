"""Attach new vector Chinese labels to original instrument sprites.

Inputs: SWF with text definitions; two SWFs containing compiled background
actions in root frame 1; output SWF. Other original tags remain byte-identical.
"""
import struct,zlib,sys
from pathlib import Path
from patch_original import unpack,tags,header_end,tag_bytes,u16

def root_action(path):
    b=unpack(Path(path).read_bytes())
    return next(body for kind,body,_,_,frame in tags(b,header_end(b),len(b)) if kind==12 and frame==1)

data=unpack(Path(sys.argv[1]).read_bytes());flapbody=root_action(sys.argv[2]);hudbody=root_action(sys.argv[3]);start=header_end(data)
target={162:60000,502:60000,169:60001,173:60002};out=[];inserted=[];hud_inserted=0;hud_defined=False
for k,b,raw,at,frame in tags(data,start,len(data)):
    if k==39 and u16(b,0) in target:
        sid=u16(b,0);sub=[]
        for sk,sb,sraw,sat,sframe in tags(b,4,len(b)):
            if sk==1 and sframe==1:
                sub.append(tag_bytes(12,flapbody));sub.append(tag_bytes(26,b'\x06'+struct.pack('<HH',60000,target[sid])+b'\x00'));inserted.append(sid)
            sub.append(sraw)
        out.append(tag_bytes(39,b[:4]+b''.join(sub)))
    elif k==39 and u16(b,0)==233:
        sub=[]
        for sk,sb,sraw,sat,sframe in tags(b,4,len(b)):
            if sk==1 and sframe in (1,5):sub.append(tag_bytes(26,b'\x06'+struct.pack('<HH',60000,60006)+b'\x00'));hud_inserted+=1
            if sk==1 and sframe in (2,6):sub.append(tag_bytes(28,struct.pack('<H',60000)))
            sub.append(sraw)
        out.append(tag_bytes(39,b[:4]+b''.join(sub)))
    elif k==11 and u16(b,0)==60005:
        out.append(raw);sprite=[tag_bytes(12,hudbody)]
        for i in range(3):sprite.append(tag_bytes(26,b'\x06'+struct.pack('<HH',60000+i,60003+i)+b'\x00'))
        sprite.extend([tag_bytes(1,b''),tag_bytes(0,b'')])
        out.append(tag_bytes(39,struct.pack('<HH',60006,1)+b''.join(sprite)));hud_defined=True
    else:out.append(raw)
assert set(inserted)==set(target) and hud_inserted==2 and hud_defined
payload=data[8:start]+b''.join(out)
Path(sys.argv[4]).write_bytes(b'CWS'+data[3:4]+struct.pack('<I',len(payload)+8)+zlib.compress(payload,9))
print('Added Chinese flap and instrument overlays:',inserted,'HUD placements:',hud_inserted)
