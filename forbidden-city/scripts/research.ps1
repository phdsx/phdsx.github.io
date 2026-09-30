$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$folder = Join-Path $project 'research'
New-Item -ItemType Directory -Force $folder | Out-Null
$items = @(
  @('wumen','午门','236454'), @('taihemen','太和门','236439'), @('taihe','太和殿','236465'),
  @('zhonghe','中和殿','236464'), @('baohe','保和殿','236434'), @('qianqing','乾清宫','236472'),
  @('jiaotai','交泰殿','236467'), @('corner','角楼','236522'), @('qinan','钦安殿','236494')
)
$manifest = @()
foreach ($entry in $items) {
  $url = 'https://www.dpm.org.cn/explore/building/' + $entry[2] + '.html'
  try {
    $page = Invoke-WebRequest -Uri $url -TimeoutSec 25
    $pictures = [regex]::Matches($page.Content,'(?:data-img|src)="(https://img.dpm.org.cn/Uploads/Picture/[^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique | Select-Object -First 3
    $j = 0
    foreach ($photo in $pictures) {
      $j++
      $path = $entry[0] + '-' + $j + '.jpg'
      Invoke-WebRequest -Uri $photo -OutFile (Join-Path $folder $path) -TimeoutSec 25
      $manifest += @{ building=$entry[1]; page=$url; image=$photo; file=$path; license='故宫博物院版权所有；仅资料核对，不作为运行纹理；未获得再分发授权'; angle='需根据图像核对；不推定相机坐标' }
    }
  } catch { $manifest += @{building=$entry[1]; page=$url; error=$_.Exception.Message} }
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 (Join-Path $folder 'reference-images.json')
