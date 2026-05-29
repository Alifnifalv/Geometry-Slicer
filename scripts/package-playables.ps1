$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$dist = Join-Path $root 'dist'
$artifactDir = Join-Path $root 'artifacts'
$zipPath = Join-Path $artifactDir 'geometry-slicer-youtube-playables.zip'

if (-not (Test-Path (Join-Path $dist 'index.html'))) {
  throw 'dist/index.html was not found. Run npm run build first.'
}

if (-not (Test-Path $artifactDir)) {
  New-Item -ItemType Directory -Path $artifactDir | Out-Null
}

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Push-Location $dist
try {
  Compress-Archive -Path * -DestinationPath $zipPath -CompressionLevel Optimal
} finally {
  Pop-Location
}

$zip = Get-Item $zipPath
Write-Host "Created $($zip.FullName) ($($zip.Length) bytes)"
