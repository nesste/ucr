$ErrorActionPreference = "Stop"

$Repository = if ($env:UCR_GITHUB_REPOSITORY) { $env:UCR_GITHUB_REPOSITORY } else { "nesste/ucr" }
$InstallDir = if ($env:UCR_INSTALL_DIR) { $env:UCR_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "ucr\bin" }
$RequestedVersion = if ($args.Length -gt 0) { $args[0] } else { "latest" }
$Architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture

switch ($Architecture) {
  ([System.Runtime.InteropServices.Architecture]::X64) { $Asset = "ucr-windows-x64.exe" }
  default {
    throw "ucr installer: unsupported Windows architecture: $Architecture"
  }
}

$BaseUrl = "https://github.com/$Repository/releases"
$DownloadUrl =
  if ($RequestedVersion -eq "latest") {
    "$BaseUrl/latest/download/$Asset"
  } else {
    "$BaseUrl/download/$RequestedVersion/$Asset"
  }

$TempFile = Join-Path ([System.IO.Path]::GetTempPath()) $Asset
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

Write-Host "Downloading $DownloadUrl"
Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempFile
Move-Item -Force $TempFile (Join-Path $InstallDir "ucr.exe")

$PathEntries = ($env:PATH -split ";") | Where-Object { $_ -ne "" }

if ($PathEntries -contains $InstallDir) {
  Write-Host "ucr installed to $(Join-Path $InstallDir 'ucr.exe')"
} else {
  Write-Host "ucr installed to $(Join-Path $InstallDir 'ucr.exe')"
  Write-Host "Add $InstallDir to PATH to run 'ucr' directly."
}
