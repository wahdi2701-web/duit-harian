# Duit Harian

Website pengurusan kewangan peribadi (Bahasa Melayu, RM) dengan sokongan PWA.

## Jalankan secara tempatan
1. Ekstrak folder projek.
2. Buka terminal dalam folder `duit_harian`.
3. Jalankan `python -m http.server 8000`.
4. Buka `http://localhost:8000` dalam Chrome.

Untuk pemasangan PWA pada telefon, hoskan keseluruhan folder ke hosting statik yang menyediakan HTTPS (contohnya GitHub Pages, Netlify atau Cloudflare Pages). Service worker dan pemasangan PWA memerlukan HTTPS atau localhost.

## Data dan privasi
- Transaksi disimpan menggunakan localStorage pada pelayar/peranti semasa.
- Data tidak disegerakkan ke peranti lain dan boleh hilang jika data pelayar dipadam.
- Eksport CSV membolehkan import manual ke Google Sheets.
- Dua rekod contoh dimasukkan pada penggunaan pertama sahaja: Gaji RM650 dan Bil WiFi RM89.90. Selepas itu, data kekal sehingga pengguna memadam atau membersihkan data pelayar.

## PWA
- iPhone: Safari > Share > Add to Home Screen.
- Android: Chrome > menu tiga titik > Install app / Add to Home screen.
