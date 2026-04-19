$ErrorActionPreference = "Stop"

$Repository = if ($env:UCR_GITHUB_REPOSITORY) { $env:UCR_GITHUB_REPOSITORY } else { "nesste/ucr" }
$InstallDir = if ($env:UCR_INSTALL_DIR) { $env:UCR_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "ucr\bin" }
$RequestedVersion = if ($args.Length -gt 0) { $args[0] } else { "latest" }
$Architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture

function Normalize-PathEntry {
  param(
    [string] $Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ""
  }

  return $Value.Trim().TrimEnd("\").ToLowerInvariant()
}

function Test-PathContainsEntry {
  param(
    [string] $PathValue,
    [string] $Candidate
  )

  $NormalizedCandidate = Normalize-PathEntry $Candidate

  if ($NormalizedCandidate -eq "") {
    return $false
  }

  foreach ($Entry in ($PathValue -split ";")) {
    if ((Normalize-PathEntry $Entry) -eq $NormalizedCandidate) {
      return $true
    }
  }

  return $false
}

function Add-PathEntry {
  param(
    [string] $PathValue,
    [string] $Candidate
  )

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return $Candidate
  }

  return "$PathValue;$Candidate"
}

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

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
$CurrentSessionUpdated = $false
$UserPathUpdated = $false

if (-not (Test-PathContainsEntry $env:PATH $InstallDir)) {
  $env:PATH = Add-PathEntry $env:PATH $InstallDir
  $CurrentSessionUpdated = $true
}

if (-not (Test-PathContainsEntry $UserPath $InstallDir)) {
  [Environment]::SetEnvironmentVariable(
    "Path",
    (Add-PathEntry $UserPath $InstallDir),
    "User"
  )
  $UserPathUpdated = $true
}

Write-Host "ucr installed to $(Join-Path $InstallDir 'ucr.exe')"

if ($CurrentSessionUpdated) {
  Write-Host "Updated PATH for this PowerShell session."
}

if ($UserPathUpdated) {
  Write-Host "Updated the user PATH for future terminals."
}
