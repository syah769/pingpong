# Ngrok Setup Guide untuk KRKL Tournament

## Setup Awal (One-time setup)

1. **Login/Signup ngrok:**
   - Go to: https://dashboard.ngrok.com/signup
   - Login atau create account (boleh guna Google/GitHub)

2. **Get Authtoken:**
   - Go to: https://dashboard.ngrok.com/get-started/your-authtoken
   - Copy authtoken yang dibagi

3. **Setup authtoken:**
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
   ```

## Cara Start Ngrok (Pilih salah satu)

### Option 1: Guna Config File (Recommended - 2 URLs berasingan)
```bash
cd /Users/syahrilashraf/Desktop/LARAVEL\ PROJECT/pingpong
ngrok start --all --config=ngrok.yml
```

Ini akan create 2 tunnels:
- `https://xxxxx.ngrok-free.app` → PHP API (port 8001)
- `https://yyyyy.ngrok-free.app` → WebSocket (port 4000)

### Option 2: Manual Single Command (Simple)
```bash
# Untuk PHP API sahaja
ngrok http 8001 --host-header=rewrite

# Untuk WebSocket sahaja
ngrok http 4000 --host-header=rewrite
```

### Option 3: Domain Khusus (Kalau ada ngrok paid plan)
```bash
ngrok http 8001 --domain=your-custom-domain.ngrok-free.app --host-header=rewrite
```

## Selepas Start Ngrok

1. **Copy URL** yang keluar dalam terminal
   - Contoh: `https://abc123.ngrok-free.app`

2. **Update dalam code:**
   - File: `src/KRKLPublicDisplay.jsx`
   - File: `src/KRKLTournamentSystem.jsx`
   
   Update bahagian:
   ```javascript
   const API_URL = 'https://YOUR-NEW-URL.ngrok-free.app/api.php';
   const WS_URL = 'wss://YOUR-NEW-URL.ngrok-free.app/ws';
   ```

3. **Update dalam server.php (CORS):**
   - File: `krkl-tournament/server.php`
   
   Tambah URL baru dalam `$allowedOrigins`

## Untuk Public Display

Kalau nak access dari device lain (phone, tablet, etc):
1. Start ngrok
2. Copy URL yang dibagi
3. Buka URL tu dalam browser device lain
4. Done!

## Troubleshooting

### "authentication failed"
- Kena set authtoken dulu (step 3 kat atas)

### "tunnel not found" 
- Make sure PHP server (port 8001) dan WebSocket (port 4000) running
- Check dengan: `lsof -i :8001` dan `lsof -i :4000`

### "ERR_NGROK_3200"
- URL dah expired (free plan expire lepas 2 jam idle)
- Restart ngrok, akan dapat URL baru

### CORS error
- Update `server.php` dengan URL ngrok yang baru
- Make sure `host_header: rewrite` dalam config

## Notes

- **Free plan**: URL bertukar setiap kali restart ngrok
- **Paid plan**: Boleh guna custom domain yang fixed
- **PHP vanilla**: Yes, ngrok boleh guna dengan PHP vanilla! 
  - Guna `--host-header=rewrite` untuk avoid host header issues
