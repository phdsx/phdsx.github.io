import pathlib,requests,shutil
S=pathlib.Path(__file__).resolve().parent/'sources';S.mkdir(exist_ok=True)
for lat,name in [(39,'copernicus.tif'),(40,'copernicus-n40.tif')]:
    tile=f'Copernicus_DSM_COG_10_N{lat}_00_E116_00_DEM'
    url=f'https://copernicus-dem-30m.s3.amazonaws.com/{tile}/{tile}.tif'
    r=requests.get(url,timeout=180);r.raise_for_status();(S/name).write_bytes(r.content)
# Reuse the delivered immutable OSM snapshot for reproducibility rather than silently updating it.
shutil.copy2(S.parents[1]/'assets'/'geo'/'osm-source.json',S/'osm.json')
print('Sources ready. Run python rebuild_geodata.py next.')
