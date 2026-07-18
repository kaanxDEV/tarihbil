@echo off
:: --- TERMINAL KODLAMASINI UTF-8 (65001) OLARAK AYARLA ---
chcp 65001 >nul

TITLE Dijital Tarih Hafızası - Renkli Yerel Sunucu
CLS

:: --- ANSI RENK KODLARI TANIMLAMASI ---
for /F "delims=" %%a in ('echo prompt $E^| cmd') do set "ESC=%%a"
set "KIRMIZI=%ESC%[91m"
set "YESIL=%ESC%[92m"
set "SARI=%ESC%[93m"
set "MAVI=%ESC%[94m"
set "MOR=%ESC%[95m"
set "CYAN=%ESC%[96m"
set "BEYAZ=%ESC%[97m"
set "KALIN=%ESC%[1m"
set "RESET=%ESC%[0m"

ECHO %KALIN%%CYAN%========================================================%RESET%
ECHO %KALIN%%MOR%   DİJİTAL TARİH HAFIZASI - YEREL SUNUCU BAŞLATICI   %RESET%
ECHO %KALIN%%CYAN%========================================================%RESET%
ECHO.
ECHO %SARI%[1/3]%RESET% %BEYAZ%Sistem altyapısı ve çalışma ortamı taranıyor...%RESET%

:: 1. Python 3 Kontrolü
python --version >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    ECHO %SARI%[2/3]%RESET% %YESIL%Python 3 tespit edildi.%RESET% %CYAN%HTTP Sunucusu hazırlanıyor...%RESET%
    ECHO %SARI%[3/3]%RESET% %MAVI%Tarayıcı 8000 portu ile açılıyor...%RESET%
    start "" "http://localhost:8000"
    ECHO.
    ECHO %KALIN%%YESIL%[OK] Sunucu aktif olarak çalışıyor!%RESET%
    ECHO %BEYAZ%Kapatmak için bu pencereyi kapatabilir veya CTRL+C yapabilirsiniz.%RESET%
    ECHO %CYAN%--------------------------------------------------------%RESET%
    python -m http.server 8000
    GOTO END
)

:: 2. Python 2 Kontrolü (Eski Sistemler İçin)
python -c "import SimpleHTTPServer" >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    ECHO %SARI%[2/3]%RESET% %YESIL%Python 2 tespit edildi.%RESET% %CYAN%SimpleHTTPServer başlatılıyor...%RESET%
    ECHO %SARI%[3/3]%RESET% %MAVI%Tarayıcı 8000 portu ile açılıyor...%RESET%
    start "" "http://localhost:8000"
    ECHO.
    ECHO %KALIN%%YESIL%[OK] Sunucu aktif olarak çalışıyor!%RESET%
    ECHO %BEYAZ%Kapatmak için bu pencereyi kapatabilirsiniz.%RESET%
    ECHO %CYAN%--------------------------------------------------------%RESET%
    python -m SimpleHTTPServer 8000
    GOTO END
)

:: 3. Node.js / npx Kontrolü
npx --version >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    ECHO %SARI%[2/3]%RESET% %YESIL%Node.js (npx) tespit edildi.%RESET% %CYAN%http-server başlatılıyor...%RESET%
    ECHO %SARI%[3/3]%RESET% %MAVI%Tarayıcı 8080 portu ile açılıyor...%RESET%
    ECHO.
    ECHO %KALIN%%YESIL%[OK] Sunucu aktif olarak çalışıyor!%RESET%
    ECHO %BEYAZ%Kapatmak için bu pencereyi kapatabilirsiniz.%RESET%
    ECHO %CYAN%--------------------------------------------------------%RESET%
    npx -y http-server -p 8080 -o
    GOTO END
)

:: 4. Hiçbiri Yoksa Hata Bildirimi
ECHO.
ECHO %KALIN%%KIRMIZI%[HATA] Sisteminizde Python veya Node.js kurulu değil!%RESET%
ECHO.
ECHO %SARI%Harita üzerindeki JSON verilerinin asenkron okunduğu tarayıcı CORS%RESET%
ECHO %SARI%güvenlik protokolü sebebiyle doğrudan index.html açılamaz.%RESET%
ECHO.
ECHO %KALIN%%CYAN%ÇÖZÜM ADIMLARI:%RESET%
ECHO %BEYAZ%1. https://www.python.org/downloads/ adresinden Python yükleyin.%RESET%
ECHO %BEYAZ%2. Kurulum ekranında %YESIL%"Add Python to PATH"%BEYAZ% seçeneğini işaretleyin.%RESET%
ECHO %BEYAZ%3. Bu betiği (%CYAN%start.bat%BEYAZ%) yeniden çalıştırın.%RESET%
ECHO.
PAUSE
:END