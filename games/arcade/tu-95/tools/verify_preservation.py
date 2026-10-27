"""Check non-ad game tags against the specific upstream SWF, recursively."""
import collections, json, sys
from pathlib import Path
from patch_original import PROMOTIONS, unpack, header_end, tags, placed_character, u16, digest

def inventory(raw):
    data=unpack(raw); rows=[]; removed=[]
    def visit(blob,start,end,owner='root'):
        for kind,body,full,offset,frame in tags(blob,start,end):
            char=placed_character(kind,body)
            if kind==39 and u16(body,0)==60006:continue # new instrument-label overlay
            if kind==12 and owner in ('sprite:162','sprite:169','sprite:173','sprite:502') and frame==1 and b'zhFlapBackground' in body:continue
            if kind==26 and owner in ('sprite:162','sprite:169','sprite:173','sprite:502') and char in (60000,60001,60002):continue
            if kind==26 and owner=='sprite:233' and char==60006:continue
            if kind==28 and owner=='sprite:233' and u16(body,0)==60000:continue
            if kind in (7,34,39) and u16(body,0) in PROMOTIONS:
                removed.append((owner,kind,u16(body,0)));continue
            if char in PROMOTIONS:
                removed.append((owner,kind,char));continue
            if kind==39:
                visit(body,4,len(body),'sprite:'+str(u16(body,0)));continue
            if kind in (11,33,73,75):continue # translated text, fonts and obsolete font-alignment hints
            if kind==12 and owner=='root' and frame==1:continue # preloader replacement
            rows.append((owner,kind,digest(body)))
    visit(data,header_end(data),len(data))
    return collections.Counter(rows),removed

a,old_removed=inventory(Path(sys.argv[1]).read_bytes());b,new_removed=inventory(Path(sys.argv[2]).read_bytes());
missing=a-b;added=b-a
report={'unchanged_tag_instances':sum((a&b).values()),'missing':sum(missing.values()),'added':sum(added.values()),'removed_sponsor_definitions_or_placements':len(old_removed),'remaining_sponsor_tags':len(new_removed),'missing_examples':list(missing.elements())[:8],'added_examples':list(added.elements())[:8]}
print(json.dumps(report,ensure_ascii=False,indent=2))
if missing or added or new_removed:sys.exit(1)
