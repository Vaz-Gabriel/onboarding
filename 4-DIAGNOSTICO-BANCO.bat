@echo off
cd /d "%~dp0"
title Diagnostico de Banco de Dados - Onboarding Linx
echo ========================================
echo Testando conexao com o MariaDB...
echo ========================================
node test-db.js
echo.
pause
