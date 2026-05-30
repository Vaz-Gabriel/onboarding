@echo off
cd /d "%~dp0"
echo ========================================
echo Gerando executável portátil...
echo ========================================
echo.
echo Apagando pasta dist anterior...
rmdir /s /q dist 2>nul
echo.
echo Compilando... (isso pode levar 2-3 minutos)
npm run build
if %errorlevel% neq 0 (
    echo Erro ao gerar o executável!
    pause
    exit /b 1
)
echo.
echo ========================================
echo Executável gerado com sucesso!
echo Procure o arquivo em: dist\OnboardingLinx 1.0.0.exe
echo ========================================
pause
