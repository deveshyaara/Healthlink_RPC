@echo off
REM Fix all localhost:3001 to localhost:4000 in API route files
cd /d "%~dp0"

powershell -Command "$files = Get-ChildItem -Path 'src\app\api' -Recurse -Include '*.ts'; foreach ($file in $files) { $content = [System.IO.File]::ReadAllText($file.FullName); if ($content -match 'localhost:3001') { $newContent = $content -replace 'localhost:3001', 'localhost:4000'; [System.IO.File]::WriteAllText($file.FullName, $newContent); Write-Host 'Fixed:' $file.FullName } }"

echo Done! All port references updated from 3001 to 4000.
pause
