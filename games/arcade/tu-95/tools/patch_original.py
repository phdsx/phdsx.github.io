"""Narrow SWF patch: skip the sponsor loader and remove promotional placements.

Everything else is copied byte-for-byte; no AVM1 game code is decompiled/recompiled.
"""
import argparse, hashlib, json, struct, zlib
from pathlib import Path

PROMOTIONS={11,14,17,437,441,485,516,807,810}
u16=lambda b,p:struct.unpack_from('<H',b,p)[0]
u32=lambda b,p:struct.unpack_from('<I',b,p)[0]
digest=lambda b:hashlib.sha256(b).hexdigest()

def unpack(raw):
    if raw[:3]==b'CWS':return b'FWS'+raw[3:8]+zlib.decompress(raw[8:])
    if raw[:3]==b'FWS':return raw
    raise ValueError('Expected SWF CWS/FWS')

def tags(data,start,end):
    p=start;frame=1
    while p<end:
        at=p;h=u16(data,p);p+=2;kind=h>>6;size=h&63
        if size==63:size=u32(data,p);p+=4
        assert p+size<=end,('tag outside container',at)
        yield kind,data[p:p+size],data[at:p+size],at,frame
        p+=size
        if kind==1:frame+=1
        if kind==0:break
    assert p==end,('trailing bytes',p,end)

def header_end(data):
    bits=data[8]>>3
    return 8+(5+4*bits+7)//8+4

def tag_bytes(kind,body):
    return struct.pack('<HI',(kind<<6)|63,len(body))+body

def placed_character(kind,body):
    if kind==4:return u16(body,0)
    if kind==26 and body[0]&2:return u16(body,3)
    if kind==70 and body[0]&2:
        p=4
        if body[1]&8 or body[1]&16 and body[0]&2:p=body.index(0,p)+1
        return u16(body,p)
    return None

def patch(raw):
    data=unpack(raw);start=header_end(data);changes=[]
    def visit(blob,start,end,owner='root'):
        out=[]
        for kind,body,full,at,frame in tags(blob,start,end):
            if kind in (7,34,39) and u16(body,0) in PROMOTIONS:
                changes.append({'owner':owner,'frame':frame,'tag':kind,'offset':at,'character':u16(body,0),'action':'remove promotional definition and click actions'})
                continue
            char=placed_character(kind,body)
            if char in PROMOTIONS:
                changes.append({'owner':owner,'frame':frame,'tag':kind,'offset':at,'character':char,'action':'remove promotional placement'})
                continue
            if kind==12 and owner=='root' and frame==1:
                # Root frame 1 only contains sponsor preload/telemetry. Frame 5 is
                # the original main menu, whose original initialization stays intact.
                assert b'_framesloaded' in body and b'MainMenu' in body, 'First compile localization/loader.as into the localized SWF'
                replacement=body
                changes.append({'owner':owner,'frame':frame,'tag':kind,'offset':at,'before_sha256':digest(body),'after_sha256':digest(replacement),'action':'keep guarded entry into original MainMenu frame 5'})
                out.append(tag_bytes(kind,replacement))
            elif kind==39:
                children=visit(body,4,len(body),'sprite:'+str(u16(body,0)))
                out.append(full if children==body[4:] else tag_bytes(kind,body[:4]+children))
            else:out.append(full)
        return b''.join(out)
    payload=data[8:start]+visit(data,start,len(data))
    result=b'CWS'+data[3:4]+struct.pack('<I',len(payload)+8)+zlib.compress(payload,9)
    return result,changes

def main():
    p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('output');p.add_argument('report');a=p.parse_args()
    raw=Path(a.input).read_bytes();out,changes=patch(raw)
    Path(a.output).write_bytes(out)
    Path(a.report).write_text(json.dumps({'source_sha256':digest(raw),'output_sha256':digest(out),'changes':changes},ensure_ascii=False,indent=2),encoding='utf-8')
    print('Patched',len(changes),'sponsor-only locations;',len(out),'bytes')

if __name__=='__main__':main()
