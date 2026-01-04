param(
    [string]$Path = (Get-Location).Path,
    [switch]$PerFile
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -Path $Path -PathType Container)) {
    Write-Error "РџСѓС‚СЊ РЅРµ СЃСѓС‰РµСЃС‚РІСѓРµС‚ РёР»Рё РЅРµ СЏРІР»СЏРµС‚СЃСЏ РґРёСЂРµРєС‚РѕСЂРёРµР№: $Path"
    exit 1
}

# РџРѕР»СѓС‡Р°РµРј СЃРїРёСЃРѕРє С„Р°Р№Р»РѕРІ .ts/.tsx, РёСЃРєР»СЋС‡Р°СЏ СЃР»СѓР¶РµР±РЅС‹Рµ РґРёСЂРµРєС‚РѕСЂРёРё
$files = Get-ChildItem -Path $Path -Recurse -File |
    Where-Object {
        $_.Extension -in @('.ts', '.tsx', '.js', '.jsx', '.md') -and
        ($_.FullName -notlike "*\node_modules\*") -and
        ($_.FullName -notlike "*\release\*") -and
        ($_.FullName -notlike "*\dist\*") -and
        ($_.FullName -notlike "*\build\*") -and
        ($_.FullName -notlike "*\.git\*") -and
        ($_.FullName -notlike "*\.erb\*")
    }

if ($files.Count -eq 0) {
    Write-Host "Р¤Р°Р№Р»С‹ .ts/.tsx РЅРµ РЅР°Р№РґРµРЅС‹ РІ '$Path'"
    exit 0
}

$totLines = 0
$totFiles = 0

foreach ($f in $files) {
    # Подсчёт реального количества строк в файле
    $count = (Get-Content -Path $f.FullName | Measure-Object -Line).Lines
    $totLines += $count
    $totFiles += 1

    if ($PerFile) {
        Write-Host ("{0}`t{1}" -f $count, $f.FullName)
    }
}

# РќР°СЃС‚СЂРѕРёРј РІС‹РІРѕРґ РєРѕРЅСЃРѕР»Рё РЅР° UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host '---'
Write-Host ("Total files: {0}" -f $totFiles)
Write-Host ("Total lines:  {0}" -f $totLines)

