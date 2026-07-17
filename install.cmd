@echo off
node "%~dp0scripts\install_agents.mjs" %*
exit /b %ERRORLEVEL%
