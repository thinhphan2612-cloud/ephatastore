# Đóng gói app Windows (bản build cho Store) thành .msix để nộp Microsoft Store.
# Store tự ký lại gói khi duyệt → KHÔNG cần chứng thư. Cần Windows SDK (makeappx.exe).
#
# -Source : file .exe (app 1 file, vd Tauri) HOẶC thư mục chứa exe + file kèm (vd Nuitka/PyInstaller --onedir).
# -Exe    : tên file exe trong gói (vd myapp.exe).
# -Logos  : thư mục chứa StoreLogo.png (50x50), Square44x44Logo.png (44x44), Square150x150Logo.png (150x150)
#           — vd release/<slug>-<version>/msstore/package-logos do export/make-images.mjs sinh.
# -Version: X.Y.Z (script tự thành X.Y.Z.0 — Store bắt buộc số cuối = 0).
#
# Ví dụ (Tauri):
#   ./msstore/pack.ps1 -Source src-tauri/target/release/myapp.exe -Exe myapp.exe -Logos src-tauri/icons `
#     -Version 1.0.0 -DisplayName 'My App' -Description 'Mô tả ngắn' `
#     -IdentityName '12345Company.MyApp' -Publisher 'CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX' `
#     -PublisherDisplayName 'Company' -Out MyApp.msix
param(
  [Parameter(Mandatory = $true)] [string]$Source,
  [Parameter(Mandatory = $true)] [string]$Exe,
  [Parameter(Mandatory = $true)] [string]$Logos,
  [Parameter(Mandatory = $true)] [string]$Version,
  [Parameter(Mandatory = $true)] [string]$DisplayName,
  [Parameter(Mandatory = $true)] [string]$Description,
  [Parameter(Mandatory = $true)] [string]$IdentityName,
  [Parameter(Mandatory = $true)] [string]$Publisher,
  [Parameter(Mandatory = $true)] [string]$PublisherDisplayName,
  [string]$Manifest = '',   # mặc định: AppxManifest.template.xml cạnh script
  [string]$Out = 'App.msix',
  # Giữ thư mục layout (để thử: Add-AppxPackage -Register <layout>\AppxManifest.xml)
  [string]$Layout = (Join-Path ([System.IO.Path]::GetTempPath()) 'msix-layout')
)
$ErrorActionPreference = 'Stop'
# Windows PowerShell 5.1 không có $PSScriptRoot trong giá trị mặc định của param → xác định ở đây.
if (-not $Manifest) {
  $Manifest = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'AppxManifest.template.xml'
}

if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "Version phải dạng X.Y.Z (nhận: $Version)" }
$msixVersion = "$Version.0"

if (Test-Path $Layout) { Remove-Item $Layout -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $Layout 'Assets') | Out-Null

if (Test-Path $Source -PathType Container) {
  Copy-Item (Join-Path $Source '*') $Layout -Recurse
} else {
  Copy-Item $Source (Join-Path $Layout $Exe)
}
if (-not (Test-Path (Join-Path $Layout $Exe))) { throw "Không thấy $Exe trong gói." }

foreach ($logo in 'StoreLogo', 'Square44x44Logo', 'Square150x150Logo') {
  $src = Join-Path $Logos "$logo.png"
  if (-not (Test-Path $src)) { throw "Thiếu logo $src" }
  Copy-Item $src (Join-Path $Layout "Assets/$logo.png")
}

$esc = { param($s) [System.Security.SecurityElement]::Escape($s) }
$xml = (Get-Content $Manifest -Raw -Encoding UTF8).
  Replace('{{IDENTITY_NAME}}', (& $esc $IdentityName)).
  Replace('{{PUBLISHER}}', (& $esc $Publisher)).
  Replace('{{PUBLISHER_DISPLAY_NAME}}', (& $esc $PublisherDisplayName)).
  Replace('{{DISPLAY_NAME}}', (& $esc $DisplayName)).
  Replace('{{DESCRIPTION}}', (& $esc $Description)).
  Replace('{{EXE}}', (& $esc $Exe)).
  Replace('{{VERSION}}', $msixVersion)
[System.IO.File]::WriteAllText((Join-Path $Layout 'AppxManifest.xml'), $xml, (New-Object System.Text.UTF8Encoding $false))

$makeappx = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\makeappx.exe" -ErrorAction SilentlyContinue |
  Sort-Object { [version]$_.Directory.Parent.Name } -Descending | Select-Object -First 1
if (-not $makeappx) { throw 'Không tìm thấy makeappx.exe — cài Windows SDK.' }

& $makeappx.FullName pack /d $Layout /p $Out /o
if ($LASTEXITCODE -ne 0) { throw "makeappx lỗi (mã $LASTEXITCODE)" }
Write-Host "Đã tạo $Out (phiên bản $msixVersion). Layout: $Layout"
