@echo off
setlocal enabledelayedexpansion

set users[0]=bot1
set users[1]=bot2
set users[2]=bot3
set users[3]=bot4
set users[4]=bot5

for /L %%i in (1,1,1000) do (

    set /a idx=%%i %% 5

    start /b curl.exe -s -X POST http://localhost:8080/capture ^
    -H "Content-Type: application/json" ^
    -d "{\"tileId\":%%i,\"userId\":\"!users[!idx!]!\"}"

    timeout /t 1 /nobreak >nul
)