# Ordinary Windows HTTP transport for the public, anonymous directory.
# No browser profile, saved cookie, challenge solution or account is used.
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$body = [Console]::In.ReadToEnd()
try {
    $page = Invoke-WebRequest -UseBasicParsing -Uri 'https://www.pogomap.info/' -SessionVariable pogoAnonymousSession -TimeoutSec 15
    $sessionCookie = @($pogoAnonymousSession.Cookies.GetCookies('https://www.pogomap.info/') | Where-Object { $_.Name -eq 'PHPSESSID' })
    if ($sessionCookie.Count -eq 0) {
        @{status='authorization'; message='PogoMap 未签发公开匿名会话，无法读取目录'} | ConvertTo-Json -Compress
        exit
    }
    $response = Invoke-WebRequest -UseBasicParsing -Uri 'https://www.pogomap.info/includes/it150nmsq9.php' -Method Post -Body $body -ContentType 'application/x-www-form-urlencoded' -WebSession $pogoAnonymousSession -Headers @{Accept='application/json, text/javascript, */*; q=0.01'; Referer='https://www.pogomap.info/'; 'X-Requested-With'='XMLHttpRequest'} -TimeoutSec 25
    @{payload=($response.Content | ConvertFrom-Json); fetchedAt=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()} | ConvertTo-Json -Depth 100 -Compress
} catch {
    $code = 0
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    $status = if ($code -in 401,403) { 'authorization' } elseif ($code -eq 429) { 'rate-limit' } else { 'error' }
    $message = if ($code -gt 0) { "PogoMap 公开目录请求失败（HTTP $code）" } else { 'PogoMap 公开目录请求失败或超时' }
    @{status=$status; message=$message} | ConvertTo-Json -Compress
}
