param(
    [string]$Ip,
    [string]$Path = ".",
    [switch]$NoBackup
)

function Test-SkippedPath {
    param([string]$FilePath)

    $skipParts = @(
        "\.git\",
        "\node_modules\",
        "\dist\",
        "\build\",
        "\.vercel\"
    )

    foreach ($part in $skipParts) {
        if ($FilePath -like "*$part*") {
            return $true
        }
    }

    return $false
}

function Get-LocalIPv4Addresses {
    try {
        $addresses = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
            Where-Object {
                $_.OperationalStatus -eq [System.Net.NetworkInformation.OperationalStatus]::Up -and
                $_.NetworkInterfaceType -ne [System.Net.NetworkInformation.NetworkInterfaceType]::Loopback
            } |
            ForEach-Object { $_.GetIPProperties().UnicastAddresses } |
            Where-Object {
                $_.Address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
                $_.Address.IPAddressToString -notlike "127.*" -and
                $_.Address.IPAddressToString -notlike "169.254.*"
            } |
            ForEach-Object { $_.Address.IPAddressToString } |
            Select-Object -Unique
    } catch {
        $addresses = @()
    }

    return @($addresses)
}

function Resolve-RobotIp {
    param([string]$ProvidedIp)

    if (-not [string]::IsNullOrWhiteSpace($ProvidedIp)) {
        return $ProvidedIp.Trim()
    }

    $localIps = Get-LocalIPv4Addresses

    if ($localIps.Count -eq 1) {
        $detectedIp = $localIps[0]
        $answer = Read-Host "IP detectada: $detectedIp. Pulsa Enter para usarla o escribe otra IP"
        if ([string]::IsNullOrWhiteSpace($answer)) {
            return $detectedIp
        }
        return $answer.Trim()
    }

    if ($localIps.Count -gt 1) {
        Write-Host "Se han detectado varias IPs:"
        for ($i = 0; $i -lt $localIps.Count; $i++) {
            Write-Host (" {0}. {1}" -f ($i + 1), $localIps[$i])
        }

        $answer = Read-Host "Elige un numero, pulsa Enter para usar la primera, o escribe otra IP"

        if ([string]::IsNullOrWhiteSpace($answer)) {
            return $localIps[0]
        }

        if ($answer -match "^\d+$" -and [int]$answer -ge 1 -and [int]$answer -le $localIps.Count) {
            return $localIps[[int]$answer - 1]
        }

        return $answer.Trim()
    }

    $manualIp = Read-Host "No se pudo detectar la IP. Introduce la IP del PC/robot que ejecuta ROS (ej: 192.168.1.50)"
    return $manualIp.Trim()
}

$resolvedPath = Resolve-Path -LiteralPath $Path
$root = $resolvedPath.Path
$robotIp = Resolve-RobotIp -ProvidedIp $Ip

if ([string]::IsNullOrWhiteSpace($robotIp)) {
    Write-Host "No se ha introducido ninguna IP. Cancelado."
    exit 1
}

$configPath = Join-Path $root "js\robot-config.js"
if (-not (Test-Path -LiteralPath $configPath)) {
    Write-Host "No se encontro js\robot-config.js en: $root"
    exit 1
}

$changedFiles = @()

$configContent = Get-Content -LiteralPath $configPath -Raw
$updatedConfig = $configContent
$updatedConfig = $updatedConfig -replace "robotIp:\s*'[^']*'", "robotIp: '$robotIp'"
$updatedConfig = $updatedConfig -replace "cameraStreamHost:\s*'[^']*'", "cameraStreamHost: 'http://$robotIp`:8081'"
$updatedConfig = $updatedConfig -replace "rosbridgeUrl:\s*'[^']*'", "rosbridgeUrl: 'ws://$robotIp`:9090'"

if ($updatedConfig -ne $configContent) {
    if (-not $NoBackup) {
        Copy-Item -LiteralPath $configPath -Destination "$configPath.bak" -Force
    }
    Set-Content -LiteralPath $configPath -Value $updatedConfig -NoNewline
    $changedFiles += $configPath
}

$extensions = @(
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".html",
    ".css",
    ".json",
    ".env",
    ".local",
    ".md"
)

$files = Get-ChildItem -LiteralPath $root -Recurse -File |
    Where-Object {
        -not (Test-SkippedPath $_.FullName) -and
        $_.FullName -ne $configPath -and
        ($extensions -contains $_.Extension -or $_.Name -like ".env*")
    }

foreach ($file in $files) {
    $content = Get-Content -LiteralPath $file.FullName -Raw
    $updated = $content

    $updated = $updated -replace "(localhost|127\.0\.0\.1)(:9090)", "$robotIp`$2"
    $updated = $updated -replace "(localhost|127\.0\.0\.1)(:8081)", "$robotIp`$2"
    $updated = $updated -replace "IP_DEL_ROBOT_O_PC_ROS", $robotIp
    $updated = $updated -replace "IP_DEL_PC_ROS", $robotIp
    $updated = $updated -replace "IP_DEL_PC_WEB", $robotIp

    if ($updated -ne $content) {
        if (-not $NoBackup) {
            Copy-Item -LiteralPath $file.FullName -Destination "$($file.FullName).bak" -Force
        }

        Set-Content -LiteralPath $file.FullName -Value $updated -NoNewline
        $changedFiles += $file.FullName
    }
}

if ($changedFiles.Count -eq 0) {
    Write-Host "No se encontraron URLs o configuracion para cambiar en: $root"
    exit 0
}

Write-Host ""
Write-Host "Archivos actualizados con la IP ${robotIp}:"
foreach ($changedFile in $changedFiles) {
    Write-Host " - $changedFile"
}

if (-not $NoBackup) {
    Write-Host ""
    Write-Host "Se han creado copias .bak junto a cada archivo modificado."
}

Write-Host ""
Write-Host "Recuerda probar estos endpoints desde el navegador:"
Write-Host (" - ws://{0}:9090" -f $robotIp)
Write-Host (" - http://{0}:8081/stream?topic=/camera/image_raw&type=mjpeg" -f $robotIp)
Write-Host (" - http://{0}:8081/stream?topic=/a1an_vision/debug_image&type=mjpeg" -f $robotIp)
