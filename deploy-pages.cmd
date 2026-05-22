@echo off
setlocal

rem Run Pages deploy from the static output folder so Wrangler does not auto-detect the Firebase functions directory.
pushd "%~dp0pages-dist"
wrangler pages deploy . --project-name beulah-foods-store
set "EXIT_CODE=%ERRORLEVEL%"
popd

exit /b %EXIT_CODE%
