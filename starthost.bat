@echo off
"C:\Users\jopicgu\CodeBuddy\RENBA\cloudflared.exe" tunnel --url http://localhost:8123 --protocol http2 --no-autoupdate > "C:\Users\jopicgu\CodeBuddy\RENBA\cf.out.log" 2>&1
