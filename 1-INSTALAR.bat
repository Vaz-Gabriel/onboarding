@echo off
cd /d "%~dp0"
echo ========================================
echo Instalando dependências do Onboarding...
echo ========================================
npm install
if %errorlevel% neq 0 (
    echo Erro ao instalar dependências!
    pause
    exit /b 1
)
echo.
echo Dependências instaladas com sucesso!
echo.
pause
