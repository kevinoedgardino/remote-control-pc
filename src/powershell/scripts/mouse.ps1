# Proceso persistente para mouse.
# Node envia comandos simples por stdin: move,dx,dy o leftclick.
$ErrorActionPreference = 'Continue'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public struct POINT {
    public int X;
    public int Y;
}

public static class MouseNative {
    [DllImport("user32.dll")]
    public static extern bool GetCursorPos(out POINT lpPoint);

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
}
"@

while (($line = [Console]::In.ReadLine()) -ne $null) {
    $parts = $line.Split(',')
    if ($parts.Length -lt 1) { continue }

    if ($parts[0] -eq 'move' -and $parts.Length -eq 3) {
        [int]$dx = 0
        [int]$dy = 0
        [void][int]::TryParse($parts[1], [ref]$dx)
        [void][int]::TryParse($parts[2], [ref]$dy)

        $point = New-Object POINT
        [void][MouseNative]::GetCursorPos([ref]$point)
        [void][MouseNative]::SetCursorPos(($point.X + $dx), ($point.Y + $dy))
    }

    if ($parts[0] -eq 'leftclick') {
        [MouseNative]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
        Start-Sleep -Milliseconds 20
        [MouseNative]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
    }
}
