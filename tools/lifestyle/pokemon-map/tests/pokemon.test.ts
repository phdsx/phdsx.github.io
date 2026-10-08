import test from "node:test";
import assert from "node:assert/strict";
import {gunzipSync} from "node:zlib";
import {snapshotResponse,readSnapshotResponse,SNAPSHOT_GZIP} from "../lib/pokemon/json-response";
import {planViewport,withinCity,ownedBy,intersectCoverage} from "../lib/pokemon/spatial";
import {adaptNYC,adaptPGC,adaptRadar,parsePayload} from "../lib/pokemon/adapters";
import {planSources,sourceOwns,OPERATING_WINDOWS,RADAR_PILOTS,radarUrl} from "../lib/pokemon/source-registry";
import {selectSourceRecords,selectedSourcePlan,validSourceChoice} from "../lib/pokemon/source-selection";
import {regionalSpawnUrl,regionalFacilityUrl,radarQuests} from "../lib/pokemon/extra-provider";
import {emptyExtraFacilities,mergeExtraFacilities} from "../lib/pokemon/extra-feeds";
import {pokemonArt} from "../lib/pokemon/artwork";
import {SnapshotSchedule,REFRESH_INTERVAL,countdown,emptyResults,mergeSnapshot} from "../lib/pokemon/snapshot";
import {snapshotUrl,CITY_BOUNDS,requestSnapshot} from "../lib/pokemon/snapshot-provider";
import {DEFAULT_FILTERS,visibleRecords,matches,timestamp,RequestGate,type Bounds} from "../lib/pokemon/model";
import {adaptGym,adaptQuest,adaptActivity,readRows,questCatalog} from "../lib/pokemon/facility-adapters";
import {DEFAULT_LAYERS,emptyFacilities,mergeFacilities,mergeStops,mergeGyms,gymDirectoryRecords,activeActivities,hasRocket,mapVenues,visiblePlaces,raidPhase} from "../lib/pokemon/facilities";
import {facilityUrl,requestGymRaids,requestFacilities} from "../lib/pokemon/facility-provider";
import {adaptPogoGym,adaptPogoStop,parsePogoStops,parsePogoGyms,pogoMapBody,pogoMapLink,PogoMapError} from "../lib/pokemon/pogomap";
import {pogoDirectoryResult} from "../lib/pokemon/pogomap-provider";
const inside:Bounds={west:-73.99,east:-73.975,south:40.772,north:40.783};
const outside:Bounds={west:-74.08,east:-74.06,south:40.72,north:40.74};
const mixed:Bounds={west:-74.10,east:-73.97,south:40.71,north:40.75};
// Deliberate synthetic fixtures used only by these tests. No fixture is served to the page.
const raw={pokemon_id:610,lat:40.777,lng:-73.979,attack:0,defence:0,stamina:0,cp:834,level:23,despawn:2000000000,form:2222,m:"1"};
test("manual Pokemon selection overrides automatic priority without stacking or changing filters",()=>{
  const p=RADAR_PILOTS.radarNYC,nyc=adaptNYC({...raw,lat:p.lat,lng:p.lng})!,radar=adaptRadar({id:"1557656710758400014",lat:p.lat,lon:p.lng,pokemon_id:610,percent_iv:77.78,cp:834,expires_at:"2033-05-18T03:33:20Z"},"radarNYC")!;
  const records=[nyc,radar],filter={...DEFAULT_FILTERS,ivMin:"25"},b={west:p.lng-.002,east:p.lng+.002,south:p.lat-.002,north:p.lat+.002};
  assert.deepEqual(selectSourceRecords(records,"auto").map(s=>s.source),["nyc"]);
  assert.deepEqual(selectSourceRecords(records,"radarNYC").map(s=>s.source),["radarNYC"]);
  assert.equal(visibleRecords(selectSourceRecords(records,"radarNYC"),b,filter,1000).length,1);
  assert.equal(visibleRecords(selectSourceRecords(records,"nyc"),b,filter,1000).length,0);assert.equal(filter.ivMin,"25");
});
test("manual source stays selected outside its window and full PGC can include NYC only when chosen",()=>{
  assert.deepEqual(Object.keys(selectedSourcePlan(inside,"london")),[]);
  assert.deepEqual(Object.keys(selectedSourcePlan(inside,"pgc")),["pgc"]);
  assert.deepEqual(Object.keys(selectedSourcePlan(inside,"auto")),["nyc"]);
  const nyc=adaptNYC(raw)!,pgc=adaptPGC({id:"original",pokemon_id:610,lat:raw.lat,lon:raw.lng})!;
  assert.deepEqual(selectSourceRecords([nyc,pgc],"auto").map(s=>s.source),["nyc"]);
  assert.deepEqual(selectSourceRecords([nyc,pgc],"pgc").map(s=>s.source),["pgc"]);
  assert.equal(selectSourceRecords([nyc,pgc],"london").length,0);
});
test("manual window clipping handles mixed and antimeridian views; unknown stored choices are ignored",()=>{
  const b=OPERATING_WINDOWS.london,p=selectedSourcePlan({west:b.west-.02,east:b.west+.02,south:51.5,north:51.52},"london");assert.deepEqual(Object.keys(p),["london"]);
  const dateLine=selectedSourcePlan({west:179,east:-179,south:20,north:30},"pgc");assert.equal(dateLine.pgc?.geometry.coordinates.length,2);
  assert.equal(validSourceChoice("radarNYC"),true);assert.equal(validSourceChoice("auto"),true);assert.equal(validSourceChoice("unknown-provider"),false);assert.equal(validSourceChoice(null),false);
});
test("negotiated compressed snapshots preserve all records through a header-stripping bridge",async()=>{
  const value={records:[{source:"radarNYC",rawId:"1557656710758400014",name:"测试",raw:{actual:"unchanged"}}]},url="http://localhost/api/snapshot";
  const zipped=snapshotResponse(value,new Request(url,{headers:{"Accept":SNAPSHOT_GZIP}}));assert.equal(zipped.headers.get("Content-Encoding"),null);assert.equal(zipped.headers.get("Content-Type"),SNAPSHOT_GZIP);assert.deepEqual(JSON.parse(gunzipSync(new Uint8Array(await zipped.clone().arrayBuffer())).toString()),value);assert.deepEqual(await readSnapshotResponse(zipped),value);
  const plain=snapshotResponse(value,new Request(url,{headers:{"Accept":"application/json"}}));assert.equal(plain.headers.get("Content-Type"),"application/json; charset=utf-8");assert.deepEqual(await readSnapshotResponse(plain),value);
});
test("regional and mixed windows have exclusive spatial ownership, independent of map center",()=>{
  assert.deepEqual(Object.keys(planSources(inside)),["nyc"]);
  const b=OPERATING_WINDOWS.london,view={west:b.west-0.02,east:b.west+0.02,south:51.5,north:51.52},p=planSources(view);
  assert.ok(p.london);assert.ok(p.pgc);assert.equal(sourceOwns("london",b.west+0.01,51.51),true);assert.equal(sourceOwns("pgc",b.west+0.01,51.51),false);assert.equal(sourceOwns("pgc",b.west-0.01,51.51),true);
  for(const [lng,lat] of [[-73.979,40.777],[-0.12,51.51],[103.85,1.305],[151.205,-33.875],[-123.12,49.28],[-122.40935,37.75694],[-74.071,40.728]]){
    const names=["nyc","pgc","london","singapore","sydney","vancouver","radarSF","radarNYC"] as const;
    assert.equal(names.filter(s=>sourceOwns(s,lng,lat)).length,1);assert.equal(names.filter(s=>sourceOwns(s,lng,lat,true)).length,1);
  }
});
test("NYC Radar replaces only its pilot polygon, never stacks or changes outside source",()=>{
  const p=RADAR_PILOTS.radarNYC;
  assert.equal(sourceOwns("nyc",p.lng,p.lat),true);assert.equal(sourceOwns("radarNYC",p.lng,p.lat),false);
  assert.equal(sourceOwns("radarNYC",p.lng,p.lat,true),true);assert.equal(sourceOwns("nyc",p.lng,p.lat,true),false);
  assert.equal(sourceOwns("nyc",-73.95,40.84,true),true);assert.equal(sourceOwns("pgc",-74.071,40.728,true),true);
  const split=planSources({west:-74.01,east:-73.92,south:40.73,north:40.82},true);assert.ok(split.radarNYC);assert.ok(split.nyc);assert.ok(split.pgc);
});
test("regional adapters retain distinct source IDs and all missing fields remain unknown",()=>{
  const a=adaptNYC(raw,"london")!,b=adaptNYC(raw,"singapore")!;assert.equal(a.source,"london");assert.notEqual(a.id,b.id);assert.equal(a.rawId,null);
  assert.equal(adaptGym(gymRaw,"sydney")!.source,"sydney");assert.equal(adaptQuest(questRaw,"vancouver")!.source,"vancouver");assert.equal(adaptActivity(activityRaw,"london")!.source,"london");
});
test("Radar string IDs retain precision, unknown forms remain generic, cap is partial",()=>{
  const r={id:"1557656710758400014",lat:37.75694,lon:-122.40935,pokemon_id:58,percent_iv:77.78,expires_at:"2033-05-18T03:33:20Z"},s=adaptRadar(r,"radarSF")!;
  assert.equal(s.rawId,r.id);assert.equal(s.form,null);assert.equal(s.cp,null);assert.equal(pokemonArt(s).exactForm,false);
  assert.equal(adaptRadar({...r,id:1557656710758400014},"radarSF"),null);
  const p=parsePayload("radarSF",{spawns:Array(800).fill(r),generated_at:"2033-05-18T03:33:20Z"});assert.equal(p.partial,true);assert.equal(p.updatedAt,null);
  assert.throws(()=>parsePayload("radarSF",{spawns:[{...r,lat:null}]}),/未通过/);
});
test("new feeds use verified protocol with fixed windows and bounded Radar limits",()=>{
  const u=regionalSpawnUrl("singapore");assert.equal(u.hostname,"sgpokemap.com");assert.equal(u.searchParams.get("since"),"0");assert.equal(u.searchParams.get("mons"),"");
  const f=regionalFacilityUrl("london","quests",["3,200,0"]);assert.deepEqual(f.searchParams.getAll("quests[]"),["3,200,0"]);
  const radar=radarUrl("radarSF");assert.equal(radar.searchParams.get("radius_km"),"2");assert.equal(radar.searchParams.get("limit"),"800");assert.equal(radar.searchParams.get("layers"),"spawns,quests");
});
test("additional feed failures preserve only their own cache and auth clears it",()=>{
  const old=emptyExtraFacilities(),next=emptyExtraFacilities();old.london.quests={...old.london.quests,records:[adaptQuest(questRaw,"london")!],fetchedAt:10};next.london.quests.status="error";
  const merged=mergeExtraFacilities(old,next);assert.equal(merged.london.quests.records.length,1);assert.equal(merged.london.quests.stale,true);assert.equal(merged.sydney.quests.records.length,0);
  next.london.quests.status="authorization";assert.equal(mergeExtraFacilities(old,next).london.quests.records.length,0);
});
test("Radar quest keeps raw reward structure and IDs without inventing expiry",()=>{
  const raw={id:"quest-original",lat:37.75694,lon:-122.40935,pokestop_name:"Synthetic",quest_title:"quest_catch",quest_rewards:[{type:7,info:{pokemon_id:361,form_id:926}}]},r=radarQuests({quests:[raw]},"radarSF").records[0];
  assert.equal(r.rawId,raw.id);assert.equal(r.description,"quest_catch");assert.equal(r.reward,JSON.stringify(raw.quest_rewards));assert.equal(r.expiresAt,null);
});
test("viewport entirely inside NYC uses only NYC",()=>{const p=planViewport(inside);assert.equal(p.mode,"nyc");assert.equal(p.queries.pgc.length,0);assert.equal(p.queries.nyc.length,1);});
test("viewport entirely outside NYC uses only PGC",()=>{const p=planViewport(outside);assert.equal(p.mode,"pgc");assert.equal(p.queries.nyc.length,0);});
test("mixed viewport includes both sources even with its center outside NYC",()=>{const p=planViewport(mixed);assert.equal(withinCity((mixed.west+mixed.east)/2,(mixed.south+mixed.north)/2),false);assert.equal(p.mode,"mixed");assert.ok(p.queries.nyc.length);assert.ok(p.queries.pgc.length);for(const source of ["nyc","pgc"] as const)for(const b of p.queries[source]){assert.ok(b.west>=mixed.west&&b.east<=mixed.east&&b.south>=mixed.south&&b.north<=mixed.north);}});
test("viewport enclosing city cannot be classified by corners",()=>{assert.equal(planViewport({west:-74.30,east:-73.60,south:40.45,north:40.95}).mode,"mixed");});
test("antimeridian viewport creates two bounded outside queries",()=>{const p=planViewport({west:179,east:-179,south:20,north:30});assert.equal(p.mode,"pgc");assert.equal(p.queries.pgc.length,2);assert.ok(p.queries.pgc.every(b=>b.east-b.west<=1));});
test("NYC and PGC never own the same location",()=>{for(const point of [[-73.979,40.777],[-74.071,40.728]])assert.notEqual(ownedBy("nyc",...point as [number,number]),ownedBy("pgc",...point as [number,number]));});
test("real zero IV is kept; -1 sentinels become unknown",()=>{assert.equal(adaptNYC(raw)!.iv,0);const s=adaptNYC({...raw,attack:-1,cp:-1});assert.equal(s!.iv,null);assert.equal(s!.cp,null);});
test("NYC transient m is not treated as an encounter id",()=>{const a=adaptNYC(raw)!,b=adaptNYC({...raw,m:"changed"})!;assert.equal(a.id,b.id);assert.equal(a.rawId,null);assert.equal(a.raw.m,"1");});
test("distinct encounters of the same species remain distinct",()=>{assert.notEqual(adaptNYC({...raw,lng:-73.98})!.id,adaptNYC(raw)!.id);assert.notEqual(adaptNYC({...raw,despawn:2000000001})!.id,adaptNYC(raw)!.id);});
test("PGC preserves source ID and known fields",()=>{const s=adaptPGC({provider_unique_id:"public:123",pokemon_id:25,pokemon_name:"Pikachu",lat:51.51,lon:-.12,iv:"88.89",cp:456,lvl:10,expires_at_utc:"2033-05-18T03:33:20Z"})!;assert.equal(s.rawId,"public:123");assert.equal(s.source,"pgc");assert.equal(s.iv,88.89);assert.equal(s.form,null);assert.equal(s.expiresAt,2000000000000);});
test("locked approximate coordinates are never shown, including envelope locking",()=>{assert.equal(adaptPGC({lat:40.8,lon:-74,coordinates_locked:true}),null);const p=parsePayload("pgc",{coordinates_locked:true,rows:[{lat:40.8,lon:-74}],generated_at:"2026-10-08T02:00:00Z"});assert.equal(p.locked,true);assert.equal(p.records.length,0);});
test("invalid coordinates and invalid structures are rejected",()=>{assert.equal(adaptNYC({...raw,lat:NaN}),null);assert.equal(adaptPGC({lat:null,lon:0}),null);assert.throws(()=>parsePayload("nyc",{rows:[]}));});
test("unknown numeric values excluded only when relevant filter is active",()=>{const s=adaptNYC({...raw,cp:-1})!;assert.equal(matches(s,DEFAULT_FILTERS,0),true);assert.equal(matches(s,{...DEFAULT_FILTERS,cpMin:"100"},0),false);assert.equal(matches(s,{...DEFAULT_FILTERS,cpMin:"100",includeUnknown:true},0),true);});
test("AND between fields and OR within dex and form selections",()=>{const s=adaptNYC(raw)!;assert.ok(matches(s,{...DEFAULT_FILTERS,dexIds:[25,610],cpMin:"800",cpMax:"900",forms:[s.form??"未知","other"]},0));assert.equal(matches(s,{...DEFAULT_FILTERS,dexIds:[610],cpMax:"800"},0),false);});
test("list, markers and counts share the same bounded non-expired deduplicated set",()=>{const s=adaptNYC(raw)!;const all=[s,s,{...s,id:"outside",lng:-75},{...s,id:"expired",expiresAt:1}];assert.equal(visibleRecords(all,inside,DEFAULT_FILTERS,1000).length,1);});
test("timezone-free timestamps never acquire a false countdown",()=>{assert.equal(timestamp("2033-05-18 03:33:20"),null);assert.equal(timestamp("18m 12s"),null);assert.equal(timestamp(2000000000),2000000000000);});
test("a newer snapshot invalidates earlier responses",()=>{const gate=new RequestGate();const a=gate.token();gate.invalidate();assert.equal(a.signal.aborted,true);assert.equal(gate.current(a.revision),false);const b=gate.token();assert.equal(gate.current(b.revision),true);});
test("administrative boundary and verified coverage are clipped separately",()=>{const region=planViewport(inside).regions.nyc;const c=intersectCoverage(region,{type:"Feature",properties:{},geometry:{type:"Polygon",coordinates:[[[-73.99,40.772],[-73.982,40.772],[-73.982,40.783],[-73.99,40.783],[-73.99,40.772]]]}});assert.ok(c.covered.length);assert.ok(c.uncovered.length);});
test("GO form codes resolve via named species variants, never as image IDs",()=>{const alola=adaptNYC({...raw,pokemon_id:20,form:48})!,galar=adaptNYC({...raw,pokemon_id:83,form:2338})!;assert.equal(pokemonArt(alola).assetId,10092);assert.equal(pokemonArt(galar).assetId,10166);assert.equal(pokemonArt(alola).exactForm,true);assert.equal(pokemonArt({dex:931,name:"Squawkabilly",form:"White"}).assetId,10262);});
test("unknown or uncollected forms use explicitly labelled species art",()=>{const unknown=pokemonArt(adaptNYC({...raw,pokemon_id:25,form:999999})!);assert.equal(unknown.assetId,25);assert.equal(unknown.exactForm,false);assert.match(unknown.note,/形态未知/);const costume=pokemonArt({dex:25,name:"Pikachu",form:"Wildarea 2025"});assert.equal(costume.assetId,25);assert.match(costume.note,/形态配图未收录/);assert.equal(pokemonArt({dex:null,name:null,form:null}).url,null);});
test("refresh waits five minutes and suppresses concurrent manual/automatic work",()=>{const s=new SnapshotSchedule();assert.equal(s.due(1000),false);assert.equal(s.begin(),true);assert.equal(s.begin(),false);s.complete(1000);assert.equal(REFRESH_INTERVAL,300000);assert.equal(s.due(300999),false);assert.equal(s.due(301000),true);assert.equal(s.begin(),true);assert.equal(s.due(301100),false);s.complete(302000);assert.equal(s.nextUpdateAt,602000);assert.equal(countdown(602000,302000),"05:00");assert.equal(countdown(602000,603000),"00:00");});
test("refresh failure keeps cached data; authorization does not preserve locked records",()=>{const previous=emptyResults(),next=emptyResults();previous.nyc={...previous.nyc,status:"success",fetchedAt:10,updatedAt:5,records:[adaptNYC(raw)!]};next.nyc={...next.nyc,status:"error",message:"temporary failure"};const merged=mergeSnapshot(previous,next);assert.equal(merged.nyc.records.length,1);assert.equal(merged.nyc.fetchedAt,10);assert.equal(merged.nyc.stale,true);next.nyc.status="authorization";assert.equal(mergeSnapshot(previous,next).nyc.records.length,0);});
test("full snapshot requests use fixed NYC extent and actual global feed, with no UI filters",()=>{const n=snapshotUrl("nyc"),p=snapshotUrl("pgc");assert.equal(n.searchParams.get("since"),"0");assert.equal(n.searchParams.get("mons"),"");assert.equal(n.searchParams.get("bounds"),`${CITY_BOUNDS.west},${CITY_BOUNDS.east},${CITY_BOUNDS.south},${CITY_BOUNDS.north}`);assert.equal(p.searchParams.get("limit"),"500");assert.equal(p.searchParams.has("min_lat"),false);assert.equal(snapshotUrl("pgc","real-cursor").searchParams.get("cursor"),"real-cursor");});
const activityRaw={name:"Synthetic test stop",lat:40.777,lng:-73.979,invasion_start:2000000000,invasion_end:2000001800,character:42,type:1};
const questRaw={name:"Synthetic test stop",lat:40.777,lng:-73.979,conditions_string:"Synthetic quest",rewards_string:"Synthetic reward"};
const gymRaw={gym_name:"Synthetic test gym",lat:40.777,lng:-73.979,pokemon_id:150,level:11,cp:-1,team:1,raid_start:2000000100,raid_end:2000003000};
const pogoRaw={zfgs62:btoa("12345"),xgxg35:btoa("2"),y74hda:btoa("2"),g74jsdg:btoa("4"),poke_enabled:"2",rfs21d:"Synthetic test gym",rgqaca:"synthetic-test-gym",
  z3iafj:btoa(String(40.777*1e6*1.852/12345/1.91*(10.62/12))),f24sfvs:btoa(String(-73.979*1e6*1.852/12345/1.952*1.5935)),exraid_status:"1",sponsor_status:0,verified:0};
test("PogoMap Stop selector is fpoke and rejects Power Spots, gyms and anomalous IDs",()=>{
  const raw={...pogoRaw,xgxg35:btoa("1")},stop=adaptPogoStop(raw)!;assert.equal(stop.source,"pogomap");assert.equal(stop.rawId,"12345");assert.equal(stop.quests.length,0);assert.equal(stop.activities.length,0);
  const body=pogoMapBody(inside,"stop");assert.equal(body.get("fpoke"),"1");assert.equal(body.get("fpstop"),"0");assert.equal(body.get("fgym"),"0");
  assert.equal(parsePogoStops({"12345":raw},inside).length,1);assert.equal(adaptPogoStop(pogoRaw),null);assert.equal(adaptPogoStop({...raw,xgxg35:btoa("9")}),null);
  assert.throws(()=>parsePogoStops({"12346":raw},inside),/未通过/);
  const q=adaptQuest({...questRaw,name:raw.rfs21d})!,a=adaptActivity({...activityRaw,name:raw.rfs21d})!,merged=mergeStops([q],[a],[stop]);
  assert.equal(merged.length,1);assert.equal(merged[0].rawId,"12345");assert.equal(merged[0].quests[0].source,"nyc");assert.equal(merged[0].activities.length,1);
  assert.equal(mergeStops([q],[],[stop,{...stop,id:"ambiguous"}]).length,3);
});
test("PogoMap uses verified transport fields and keeps static community provenance distinct",()=>{
  const g=adaptPogoGym(pogoRaw)!;assert.equal(g.rawId,"12345");assert.equal(g.source,"pogomap");assert.ok(Math.abs(g.lat-40.777)<1e-10);assert.ok(Math.abs(g.lng+73.979)<1e-10);
  assert.equal(g.community?.elite,true);assert.equal(g.community?.reportedTeam,"无队伍");assert.equal(g.community?.verified,false);assert.equal(g.team,null);assert.equal(g.raid.endsAt,null);assert.equal(g.raid.dex,null);
  assert.equal(adaptPogoGym({...pogoRaw,xgxg35:btoa("1")}),null);assert.equal(adaptPogoGym({...pogoRaw,poke_enabled:"1"}),null);
});
test("PogoMap rejects corrupt/out-of-range responses and recognizes session expiry and throttling",()=>{
  assert.equal(parsePogoGyms({"12345":pogoRaw},inside).length,1);
  assert.throws(()=>parsePogoGyms({"12345":{...pogoRaw,z3iafj:btoa("bogus")}},inside),/未通过核实/);
  assert.throws(()=>parsePogoGyms({"12345":{...pogoRaw,z3iafj:btoa("1")}},inside),/未通过核实/);
  assert.throws(()=>parsePogoGyms({"12346":pogoRaw},inside),/未通过核实/);
  assert.throws(()=>parsePogoGyms({spam:1,spamtype:2},inside),(e:unknown)=>e instanceof PogoMapError&&e.status==="authorization");
  assert.throws(()=>parsePogoGyms({spam:1,spamtype:1},inside),(e:unknown)=>e instanceof PogoMapError&&e.status==="rate-limit");
});
test("unique matching gyms have one pin while retaining both original records",()=>{
  const directory=adaptPogoGym(pogoRaw)!,raid=adaptGym(gymRaw)!,all=mergeGyms([directory,directory],[raid,raid]);assert.equal(all.length,1);assert.equal(all[0].rawId,"12345");assert.equal(all[0].source,"pogomap");
  assert.equal(all[0].raidRecord?.source,"nyc");assert.equal(all[0].raidRecord?.id,raid.id);assert.equal(all[0].raidRecord?.rawId,null);assert.equal(all[0].raw.rfs21d,pogoRaw.rfs21d);assert.equal(all[0].raid.dex,150);
  assert.equal(mergeGyms([directory,{...directory,id:"ambiguous"}],[raid]).length,3);
  assert.equal(mergeGyms([directory],[{...raid,lng:-73.9789}]).length,2);
  assert.equal(mergeGyms([directory],[{...raid,name:"Different"}]).length,2);
  assert.equal(mergeGyms([directory],[])[0].raid.dex,null);
});
test("PogoMap directory requests stay fixed and the official link handles mixed and antimeridian views",()=>{
  const body=pogoMapBody(inside);assert.equal(body.get("fgym"),"1");assert.equal(body.get("fromlng"),String(inside.west));assert.equal(body.get("fpoke"),"0");assert.equal(body.has("query"),false);
  assert.match(pogoMapLink(inside),/location\/40,777500\/-73,982500\/14$/);assert.match(pogoMapLink({west:179,east:-179,south:10,north:12}),/11,000000\/-180,000000\/14$/);
});
test("PogoMap authorization clears only its own directory and cannot be relabelled as NYC",()=>{
  const old=emptyFacilities(),next=emptyFacilities();old.pogoGyms={...old.pogoGyms,records:[adaptPogoGym(pogoRaw)!],fetchedAt:10,status:"partial"};old.gyms={...old.gyms,records:[adaptGym(gymRaw)!],fetchedAt:10,status:"success"};
  next.pogoGyms={...next.pogoGyms,status:"authorization",message:"Session expired"};next.gyms=old.gyms;
  const merged=mergeFacilities(old,next);assert.equal(merged.pogoGyms.records.length,0);assert.equal(merged.gyms.records.length,1);assert.equal(mergeGyms(merged.pogoGyms.records,merged.gyms.records)[0].source,"nyc");
});
test("fixed public references remain dated and never become live data or resurrect an empty successful directory",()=>{
  const reference={...adaptPogoGym(pogoRaw)!,referenceAt:1000},feed={...emptyFacilities().pogoGyms,referenceAt:1000,referenceRecords:[reference],status:"authorization" as const};
  assert.equal(feed.records.length,0);assert.equal(feed.fetchedAt,null);assert.equal(gymDirectoryRecords(feed)[0].referenceAt,1000);
  assert.equal(gymDirectoryRecords({...feed,status:"partial"}).length,0);
  assert.equal(gymDirectoryRecords({...feed,status:"error",records:[adaptPogoGym(pogoRaw)!]})[0].referenceAt,undefined);
  assert.equal(mergeGyms(gymDirectoryRecords(feed),[adaptGym(gymRaw)!])[0].referenceAt,1000);
});
test("newly read community directories keep their actual acquisition time and never inherit reference dates",()=>{
  const directory=pogoDirectoryResult({"12345":pogoRaw},2000000000000);
  assert.equal(directory.status,"partial");assert.equal(directory.fetchedAt,2000000000000);assert.equal(directory.updatedAt,null);
  assert.equal(directory.records.length,1);assert.equal(directory.records[0].referenceAt,undefined);assert.equal(directory.referenceRecords,undefined);
  assert.equal(directory.records[0].team,null);assert.equal(directory.records[0].raid.dex,null);
});
test("gym retains actual raid/team fields and does not invent a boss after hatch",()=>{
  const g=adaptGym(gymRaw)!;assert.equal(g.name,"Synthetic test gym");assert.equal(g.team,1);assert.equal(g.raid.name,"Mewtwo");assert.equal(g.raid.cp,null);assert.equal(g.rawId,null);
  assert.equal(raidPhase(g,2000000000000),"egg");assert.equal(raidPhase(g,2000000200000),"active");assert.equal(raidPhase(g,2000003000000),"ended");
  const egg=adaptGym({...gymRaw,pokemon_id:0})!;assert.equal(raidPhase(egg,2000000200000),"pending");assert.equal(egg.raid.name,null);
  assert.equal(adaptGym({...gymRaw,lat:999}),null);
});
test("Rocket leaders retain radar requirements; non-Rocket activities are not invasions",()=>{
  const arlo=adaptActivity(activityRaw)!;assert.equal(arlo.opponent,"阿尔洛 Arlo");assert.equal(arlo.radar,"火箭队雷达");assert.equal(arlo.activity,"rocket");
  assert.equal(adaptActivity({...activityRaw,character:44})!.radar,"超级火箭队雷达");
  assert.equal(adaptActivity({...activityRaw,character:48})!.typeName,"幽灵");
  assert.equal(adaptActivity({...activityRaw,type:8,character:0})!.activity,"kecleon");assert.equal(adaptActivity({...activityRaw,type:9})!.activity,"showcase");
  assert.equal(adaptActivity({...activityRaw,character:500})!.activity,"npc");assert.equal(adaptActivity({...activityRaw,character:999})!.activity,"unknown");
});
test("quests and Rocket activities share one stop without losing their records",()=>{
  const q=adaptQuest(questRaw)!,a=adaptActivity(activityRaw)!,stops=mergeStops([q,q],[a,a]);assert.equal(stops.length,1);assert.equal(stops[0].quests.length,1);assert.equal(stops[0].activities.length,1);
  assert.equal(q.expiresAt,null);assert.equal(stops[0].rawId,null);assert.equal(q.raw.conditions_string,"Synthetic quest");
});
test("expired Rocket badges disappear locally; the observed stop stays and never has two map pins",()=>{
  const stops=mergeStops([adaptQuest(questRaw)!],[adaptActivity(activityRaw)!]),now=2000000100000;
  assert.equal(activeActivities(stops[0],now).length,1);assert.equal(hasRocket(stops[0],now),true);
  const both=mapVenues([],stops,DEFAULT_LAYERS,now);assert.equal(both.length,1);assert.equal(both[0].kind,"rocket");
  assert.equal(mapVenues([],stops,{...DEFAULT_LAYERS,rocket:false},now)[0].kind,"stop");
  assert.equal(hasRocket(stops[0],2000001800000),false);assert.equal(mapVenues([],stops,DEFAULT_LAYERS,2000001800000)[0].kind,"stop");
  assert.equal(mapVenues([],stops,{...DEFAULT_LAYERS,stop:false},2000001800000).length,0);
});
test("facility lists, map records and queries remain bounded to current view",()=>{
  const stops=mergeStops([adaptQuest(questRaw)!,adaptQuest({...questRaw,name:"Outside",lng:-75})!],[]);
  assert.equal(visiblePlaces(stops,inside,"").length,1);assert.equal(visiblePlaces(stops,inside,"test").length,1);assert.equal(visiblePlaces(stops,inside,"missing").length,0);
  assert.equal(facilityUrl("gyms").pathname,"/raids.php");assert.equal(facilityUrl("activities").pathname,"/pokestop.php");
  const url=facilityUrl("quests",["7,0,25"]);assert.deepEqual(url.searchParams.getAll("quests[]"),["7,0,25"]);assert.equal(url.searchParams.has("bounds"),false);
});
test("all quests use the source's published catalog and verified array parameter protocol",()=>{
  const catalog=questCatalog({quests:[],filters:{t3:["1500"],t7:["25"],t2:["701"],t8:["10"],t12:["6"],unknown:["bad"]}});
  assert.deepEqual(catalog.values,["3,1500,0","7,0,25","2,0,701","8,10,0","12,0,6"]);assert.equal(catalog.partial,true);
  assert.throws(()=>questCatalog({quests:[]}));assert.throws(()=>readRows({battles:[]},"raids"));assert.equal(readRows({raids:[],battles:[gymRaw],meta:{time:2000000000}},"raids").rows.length,0);
});
test("a failed facility feed retains only its own previous cache; authorization clears it",()=>{
  const old=emptyFacilities(),next=emptyFacilities();old.activities={...old.activities,status:"success",records:[adaptActivity(activityRaw)!],fetchedAt:10,updatedAt:5};
  next.activities={...next.activities,status:"error",message:"Synthetic failure"};let merged=mergeFacilities(old,next);assert.equal(merged.activities.records.length,1);assert.equal(merged.activities.stale,true);assert.equal(merged.gyms.records.length,0);
  next.activities.status="authorization";merged=mergeFacilities(old,next);assert.equal(merged.activities.records.length,0);assert.equal(merged.activities.stale,undefined);
});
test("periodic and manual snapshots never request any open-once gym data",async()=>{
  const original=globalThis.fetch;let requests=0;
  globalThis.fetch=async input=>{
    requests++;const url=new URL(String(input)),meta={time:2000000000};
    assert.notEqual(url.hostname,"www.pogomap.info","scheduled/manual refresh must not query the static gym directory");
    assert.notEqual(url.pathname,"/raids.php","scheduled/manual refresh must not query gym raids");
    return Response.json(url.pathname.endsWith("/nearby")?{spawns:[],quests:[],generated_at:"2033-05-18T03:33:20Z"}:url.pathname==="/query2.php"?{pokemons:[raw],meta}:url.pathname==="/raids.php"?{raids:[],battles:[],meta}:url.pathname==="/pokestop.php"?{invasions:[activityRaw],meta}:url.pathname==="/quests.php"?{quests:url.searchParams.has("quests[]")?[questRaw]:[],filters:{t7:["25"]},meta}:{rows:[],coordinates_locked:true,generated_at:"2033-05-18T03:33:20Z"});
  };
  try{const [a,b]=await Promise.all([requestSnapshot(),requestSnapshot()]);const warm=await requestSnapshot();assert.equal(requests,23);assert.equal(a,b);assert.equal(a,warm);assert.equal(a.nextUpdateAt-a.completedAt,REFRESH_INTERVAL);assert.equal(a.results.pgc.status,"authorization");assert.equal(a.results.nyc.records.length,1);assert.equal(a.facilities.quests.records.length,1);assert.equal(a.facilities.activities.records.length,1);assert.equal(a.facilities.gyms.status,"idle");assert.equal(a.facilities.pogoGyms.status,"idle");assert.equal(a.facilities.pogoGyms.records.length,0);assert.equal(a.extraFacilities.radarSF.activities.status,"uncovered");await requestSnapshot(true);assert.equal((await requestSnapshot()).facilities.pogoGyms.status,"idle");}
  finally{globalThis.fetch=original;}
});
test("a slower open-once raid request cannot overwrite concurrently refreshed stop caches",async()=>{
  const originalFetch=globalThis.fetch,originalNow=Date.now;
  const clock=originalNow()+REFRESH_INTERVAL+1;Date.now=()=>clock;
  let release=()=>{};const wait=new Promise<void>(resolve=>{release=resolve;});
  globalThis.fetch=async input=>{
    const url=new URL(String(input)),meta={time:2000000000};
    if(url.pathname==="/raids.php"){await wait;return Response.json({raids:[gymRaw],meta});}
    if(url.pathname==="/quests.php")return Response.json({quests:url.searchParams.has("quests[]")?[{...questRaw,name:"New concurrent stop"}]:[],filters:{t7:["25"]},meta});
    if(url.pathname==="/pokestop.php")return Response.json({invasions:[{...activityRaw,name:"New concurrent stop"}],meta});
    throw new Error("Unexpected source request");
  };
  try{
    const pendingRaid=requestGymRaids();const refreshed=await requestFacilities();
    assert.equal(refreshed.quests.records[0].name,"New concurrent stop");
    release();await pendingRaid;const retained=await requestFacilities();
    assert.equal(retained.quests.records[0].name,"New concurrent stop");assert.equal(retained.activities.records[0].name,"New concurrent stop");assert.equal(retained.gyms.records[0].raid.dex,150);
  }finally{release();globalThis.fetch=originalFetch;Date.now=originalNow;}
});
