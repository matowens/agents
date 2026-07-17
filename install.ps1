[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$installations = @(
    @{
        Name = 'Codex'
        Source = Join-Path $PSScriptRoot 'codex'
        Destination = Join-Path $HOME '.codex\agents'
        Pattern = '*.toml'
    },
    @{
        Name = 'Claude'
        Source = Join-Path $PSScriptRoot 'claude'
        Destination = Join-Path $HOME '.claude\agents'
        Pattern = '*.md'
    }
)

foreach ($installation in $installations) {
    $sourceFiles = @(Get-ChildItem -LiteralPath $installation.Source -File -Filter $installation.Pattern)
    $destination = $installation.Destination
    $manifestPath = Join-Path $destination '.agents-repo-manifest.json'

    New-Item -ItemType Directory -Path $destination -Force | Out-Null

    $previousFiles = @()
    if (Test-Path -LiteralPath $manifestPath) {
        $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
        $previousFiles = @($manifest.files)
    }

    $currentFiles = @($sourceFiles.Name)
    foreach ($filename in $previousFiles) {
        if ($filename -notin $currentFiles) {
            $stalePath = Join-Path $destination $filename
            if (Test-Path -LiteralPath $stalePath) {
                Remove-Item -LiteralPath $stalePath -Force
            }
        }
    }

    foreach ($sourceFile in $sourceFiles) {
        Copy-Item -LiteralPath $sourceFile.FullName -Destination (Join-Path $destination $sourceFile.Name) -Force
    }

    @{
        source = $installation.Source
        files = $currentFiles
    } | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding utf8

    Write-Host "$($installation.Name): installed $($currentFiles.Count) agent(s) to $destination"
}
