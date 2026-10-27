"""Static Defold v5 archive inspection; based on official scripts/unpack_arc.py.
Source: https://raw.githubusercontent.com/defold/defold/dev/scripts/unpack_arc.py
No game code is executed. LZ4 block decoder and protobuf wire reader are local.
"""
from pathlib import Path
import struct, json, re, hashlib, os

ROOT = Path(os.environ.get('HCR_SOURCE', Path(__file__).resolve().parents[4] / '.local-tools/hill-climb-original'))
ARCHIVE = ROOT / 'archive'
OUT = ROOT / 'unpacked'
OUT.mkdir(exist_ok=True)

def varint(buf, p):
    value=0; shift=0
    while p<len(buf):
        n=buf[p]; p+=1; value|=(n&127)<<shift
        if not n&128: return value,p
        shift+=7
        if shift>70: raise ValueError('varint too large')
    raise ValueError('truncated varint')

def wire(buf):
    result=[]; p=0
    while p<len(buf):
        tag,p=varint(buf,p); field=tag>>3; kind=tag&7
        if not field: raise ValueError('zero field')
        if kind==0: value,p=varint(buf,p)
        elif kind==1: value=buf[p:p+8]; p+=8
        elif kind==2: size,p=varint(buf,p); value=buf[p:p+size]; p+=size
        elif kind==5: value=buf[p:p+4]; p+=4
        else: raise ValueError('unsupported wire type')
        if p>len(buf): raise ValueError('truncated field')
        result.append((field,kind,value))
    return result

def ctr(data):
    data=bytearray(data); key=struct.unpack('>4I',b'aQj8CScgNP4VsfXK')
    for offset in range(0,len(data),8):
        counter=offset//8; v0=counter>>32; v1=counter&0xffffffff; total=0
        for _ in range(32):
            v0=(v0+((((v1<<4)^(v1>>5))+v1)^(total+key[total&3])))&0xffffffff
            total=(total+0x9e3779b9)&0xffffffff
            v1=(v1+((((v0<<4)^(v0>>5))+v0)^(total+key[(total>>11)&3])))&0xffffffff
        block=struct.pack('>2I',v0,v1)
        for j in range(min(8,len(data)-offset)): data[offset+j]^=block[j]
    return bytes(data)

def lz4(buf, expected):
    p=0; out=bytearray()
    while p<len(buf):
        token=buf[p]; p+=1; literal=token>>4
        if literal==15:
            while True:
                n=buf[p]; p+=1; literal+=n
                if n!=255: break
        out.extend(buf[p:p+literal]); p+=literal
        if p==len(buf): break
        offset=buf[p]|(buf[p+1]<<8); p+=2
        if not offset: raise ValueError('zero lz4 offset')
        length=(token&15)+4
        if token&15==15:
            while True:
                n=buf[p]; p+=1; length+=n
                if n!=255: break
        for _ in range(length): out.append(out[-offset])
    if len(out)!=expected: raise ValueError(f'lz4 size mismatch {len(out)} != {expected}')
    return bytes(out)

def main():
    arc=(ARCHIVE/'game0.arci').read_bytes()
    version=struct.unpack_from('>I',arc,0)[0]
    count,entry_offset,hash_offset,hash_length=struct.unpack_from('>4I',arc,16)
    if version!=5: raise ValueError(f'Not v5: {version}')
    metadata=json.loads((ARCHIVE/'archive_files.json').read_text())
    chunks=next(x for x in metadata['content'] if x['name']=='game.arcd')
    data=bytearray(chunks['size'])
    for chunk in chunks['pieces']:
        body=(ARCHIVE/chunk['name']).read_bytes(); data[chunk['offset']:chunk['offset']+len(body)]=body
    mf=wire((ARCHIVE/'game0.dmanifest').read_bytes()); md=wire(next(value for f,k,value in mf if f==1))
    manifest=[]
    for f,k,value in md:
        if f!=3 or k!=2: continue
        fields=wire(value); record={}
        for rf,rk,rv in fields:
            if rf==1:
                record['hash']=wire(rv)[0][2].hex()
            elif rk==2: record[str(rf)]=rv.hex()
            else: record[str(rf)]=rv
        manifest.append(record)
    entries=[]; errors=[]; strings=[]
    for i in range(count):
        digest=arc[hash_offset+i*64:hash_offset+i*64+hash_length].hex()
        offset,size,compressed,flags=struct.unpack_from('>4I',arc,entry_offset+i*16)
        actual=size if compressed==0xffffffff else compressed
        body=bytes(data[offset:offset+actual])
        try:
            if flags&1: body=ctr(body)
            if compressed!=0xffffffff: body=lz4(body,size)
            path=OUT/digest; path.write_bytes(body)
            text=[x.decode('utf-8','replace') for x in re.findall(rb'[\x20-\x7e]{5,}',body)]
            strings.extend({'hash':digest,'text':s} for s in text)
            entries.append({'index':i,'hash':digest,'offset':offset,'size':size,'compressed_size':compressed,'flags':flags,'file':str(path.relative_to(ROOT)),'header':body[:24].hex(),'sha1_unpacked':hashlib.sha1(body).hexdigest(),'strings':text[:12]})
        except Exception as e: errors.append({'index':i,'hash':digest,'error':str(e)})
    (ROOT/'inventory.json').write_text(json.dumps({'version':version,'count':count,'entries':entries,'errors':errors,'manifest':manifest},indent=2),encoding='utf-8')
    (ROOT/'strings.json').write_text(json.dumps(strings,ensure_ascii=False,indent=2),encoding='utf-8')
    paths=sorted(set(s['text'] for s in strings if re.search(r'/[\w/.-]+\.(?:scriptc|luac|guic|gui_scriptc|fontc|font|atlas|texturesetc|texturec|collectionc)',s['text'])))
    (ROOT/'resource-paths.txt').write_text('\n'.join(paths),encoding='utf-8')
    print(json.dumps({'version':version,'entries':len(entries),'errors':errors[:10],'manifest_count':len(manifest),'manifest_sample':manifest[:3],'resource_paths':len(paths)},indent=2))

if __name__=='__main__': main()
