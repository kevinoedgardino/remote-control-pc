# Proceso persistente para teclado, volumen y texto.
# Node envia comandos JSON por stdin; este script nunca recibe comandos shell.
$ErrorActionPreference = 'Continue'
$wshell = New-Object -ComObject wscript.shell

function Send-RepeatedKeys($keys, $times) {
    $t = [Math]::Max(1, [Math]::Min(50, [int]$times))
    for ($i = 0; $i -lt $t; $i++) {
        $wshell.SendKeys($keys)
        if ($t -gt 1) { Start-Sleep -Milliseconds 15 }
    }
}

function ConvertTo-SendKeysText($text) {
    $builder = New-Object System.Text.StringBuilder

    foreach ($char in $text.ToCharArray()) {
        $s = [string]$char

        switch ($s) {
            '+' { [void]$builder.Append('{+}'); break }
            '^' { [void]$builder.Append('{^}'); break }
            '%' { [void]$builder.Append('{%}'); break }
            '~' { [void]$builder.Append('{~}'); break }
            '(' { [void]$builder.Append('{(}'); break }
            ')' { [void]$builder.Append('{)}'); break }
            '{' { [void]$builder.Append('{{}'); break }
            '}' { [void]$builder.Append('{}}'); break }
            '[' { [void]$builder.Append('{[}'); break }
            ']' { [void]$builder.Append('{]}'); break }
            "`r" { break }
            "`n" { [void]$builder.Append('{ENTER}'); break }
            "`t" { [void]$builder.Append('{TAB}'); break }
            default { [void]$builder.Append($s); break }
        }
    }

    return $builder.ToString()
}

while (($line = [Console]::In.ReadLine()) -ne $null) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    $cmd = $line | ConvertFrom-Json

    if ($cmd.action -eq 'media') {
        Send-RepeatedKeys ([string][char][int]$cmd.code) $cmd.times
    }

    if ($cmd.action -eq 'key') {
        Send-RepeatedKeys ([string]$cmd.token) $cmd.times
    }

    if ($cmd.action -eq 'text') {
        $bytes = [Convert]::FromBase64String([string]$cmd.value)
        $text = [System.Text.Encoding]::UTF8.GetString($bytes)
        if ($text.Length -gt 0) {
            $wshell.SendKeys((ConvertTo-SendKeysText $text))
        }
    }
}
