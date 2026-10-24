# Server web mini cho game (không cần cài gì): phục vụ thư mục "game" ở http://localhost:8080 rồi mở trình duyệt
param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'game'
$port = 8080
$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript'; '.css' = 'text/css'; '.json' = 'application/json'
  '.glb' = 'model/gltf-binary'; '.hdr' = 'application/octet-stream'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'
  '.jpg' = 'image/jpeg'; '.mp3' = 'audio/mpeg'; '.wav' = 'audio/wav'; '.ogg' = 'audio/ogg'; '.ttf' = 'font/ttf'
  '.txt' = 'text/plain; charset=utf-8'; '.md' = 'text/markdown; charset=utf-8'
}
$listener = New-Object System.Net.HttpListener
# cổng 8080 bận thì thử các cổng kế tiếp
while ($true) {
  try { $listener.Prefixes.Clear(); $listener.Prefixes.Add("http://localhost:$port/"); $listener.Start(); break }
  catch { $port++; if ($port -gt 8099) { throw 'Khong mo duoc cong 8080-8099' }; $listener = New-Object System.Net.HttpListener }
}
$url = "http://localhost:$port/"
Write-Host ""
Write-Host "  Simulator Build Keyboard dang chay o $url" -ForegroundColor Green
Write-Host "  Giu cua so nay mo khi choi. Dong cua so (hoac Ctrl+C) de tat game." -ForegroundColor Yellow
Write-Host ""
if (-not $NoBrowser) { Start-Process $url }
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  if ($path -eq '') { $path = 'index.html' }
  $file = [IO.Path]::GetFullPath((Join-Path $root $path))
  $res = $ctx.Response
  try {
    if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($file)
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $res.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' })
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else { $res.StatusCode = 404 }
  } catch { $res.StatusCode = 500 } finally { $res.Close() }
}
