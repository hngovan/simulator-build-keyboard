@echo off
chcp 65001 >nul
title Simulator Build Keyboard
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
