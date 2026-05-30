$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$dist = Join-Path $root 'dist'
$artifactDir = Join-Path $root 'artifacts'
$stagingDir = Join-Path $artifactDir 'crazygames-package'
$zipPath = Join-Path $artifactDir 'geometry-slicer-crazygames.zip'

if (-not (Test-Path (Join-Path $dist 'index.html'))) {
  throw 'dist/index.html was not found. Run npm run build first.'
}

if (-not (Test-Path $artifactDir)) {
  New-Item -ItemType Directory -Path $artifactDir | Out-Null
}

if (Test-Path $stagingDir) {
  Remove-Item -LiteralPath $stagingDir -Recurse -Force
}

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $stagingDir | Out-Null
Copy-Item -Path (Join-Path $dist '*') -Destination $stagingDir -Recurse

$indexPath = Join-Path $stagingDir 'index.html'
$indexHtml = Get-Content -LiteralPath $indexPath -Raw
$indexHtml = $indexHtml -replace '(?m)^\s*<script\s+src=["'']https://www\.youtube\.com/game_api/v1["'']>\s*</script>\r?\n?', ''
[System.IO.File]::WriteAllText($indexPath, $indexHtml, [System.Text.UTF8Encoding]::new($false))

Push-Location $stagingDir
try {
  Compress-Archive -Path * -DestinationPath $zipPath -CompressionLevel Optimal
} finally {
  Pop-Location
}

$zip = Get-Item $zipPath
$fileCount = (Get-ChildItem -LiteralPath $stagingDir -Recurse -File | Measure-Object).Count
$totalSize = (Get-ChildItem -LiteralPath $stagingDir -Recurse -File | Measure-Object -Property Length -Sum).Sum

Write-Host "Created $($zip.FullName) ($($zip.Length) bytes)"
Write-Host "CrazyGames package contains $fileCount files with index.html at the zip root ($totalSize bytes uncompressed)."
