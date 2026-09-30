$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$folder=Join-Path $project 'research'
$manifest=@(foreach($item in (ConvertFrom-Json -InputObject ([System.IO.File]::ReadAllText((Join-Path $folder 'reference-images.json'))))){if($item.value){$item.value}else{$item}})
foreach($entry in @(@('jingren','景仁宫','236509'),@('chuxiu','储秀宫','236486'),@('xianfu','咸福宫','236507'))){
 $url='https://www.dpm.org.cn/explore/building/'+$entry[2]+'.html'
 try{
  $page=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 15
  $photos=[regex]::Matches($page.Content,'(?:data-img|src)="(https://img.dpm.org.cn/Uploads/Picture/[^"]+)"') | ForEach-Object {$_.Groups[1].Value} | Select-Object -Unique | Select-Object -First 3
  $j=0
  foreach($photo in $photos){$j++;$file=$entry[0]+'-'+$j+'.jpg';Invoke-WebRequest -UseBasicParsing -Uri $photo -OutFile (Join-Path $folder $file) -TimeoutSec 15
   if(!($manifest | Where-Object {$_.file -eq $file})){$manifest+=@{building=$entry[1];page=$url;image=$photo;file=$file;license='故宫博物院版权所有；仅研究核对，未获再分发授权，不作为运行纹理';angle='参考图待核对，未标定拍摄坐标'}}
  }
 }catch{$manifest+=@{building=$entry[1];page=$url;error=$_.Exception.Message;checked='2026-09-30'}}
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 (Join-Path $folder 'reference-images.json')
