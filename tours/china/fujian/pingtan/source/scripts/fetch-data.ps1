$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$researchDirectory = Join-Path $projectDirectory 'research'
New-Item -ItemType Directory -Force -Path $researchDirectory | Out-Null
$downloads = @(
    @{ Name = 'north.osm'; Url = 'https://api.openstreetmap.org/api/0.6/map?bbox=119.72,25.53,119.90,25.69' },
    @{ Name = 'south.osm'; Url = 'https://api.openstreetmap.org/api/0.6/map?bbox=119.66,25.36,119.90,25.53' },
    @{ Name = 'northwest.osm'; Url = 'https://api.openstreetmap.org/api/0.6/map?bbox=119.65,25.53,119.73,25.71' },
    @{ Name = 'N25E119.hgt.gz'; Url = 'https://s3.amazonaws.com/elevation-tiles-prod/skadi/N25/N25E119.hgt.gz' },
    @{ Name = 'satellite-2016.jpg'; Url = 'https://tiles.maps.eox.at/wms?service=WMS&request=GetMap&version=1.1.1&layers=s2cloudless&styles=&srs=EPSG:4326&bbox=119.65,25.35,119.91,25.75&width=2048&height=3072&format=image/jpeg' },
    @{ Name = 'eox-capabilities.xml'; Url = 'https://tiles.maps.eox.at/wmts/1.0.0/WMTSCapabilities.xml' }
)
foreach ($item in $downloads) {
    Write-Output ('Downloading ' + $item.Name)
    $targetPath = Join-Path $researchDirectory $item.Name
    & curl.exe --fail --silent --show-error --location --max-time 120 $item.Url --output $targetPath
    if ($LASTEXITCODE -ne 0) { throw ('Download failed: ' + $item.Name + '. Existing runtime data is not modified.') }
}
Write-Output 'Downloads complete. Run python scripts/prepare-data.py to regenerate runtime data.'
