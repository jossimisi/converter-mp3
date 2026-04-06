const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());

// Folder penyimpanan
const UPLOADS = './uploads';
const OUTPUT = './output';
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true });

const upload = multer({ dest: UPLOADS });

app.post('/api/convert', upload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });

    const bitrate = req.body.bitrate || '192k';
    const outName = `${uuidv4()}.mp3`;
    const outPath = path.join(OUTPUT, outName);

    // Proses konversi menggunakan FFmpeg (Streaming mode)
    const ffmpeg = spawn('ffmpeg', [
        '-i', req.file.path,
        '-vn',
        '-ab', bitrate,
        '-ar', '44100',
        '-y', outPath
    ]);

    ffmpeg.on('close', (code) => {
        // Hapus video asli setelah diproses
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        
        if (code === 0) {
            res.json({ 
                success: true, 
                download_url: `/download/${outName}` 
            });
        } else {
            res.status(500).json({ error: 'Konversi gagal' });
        }
    });
});

// Akses file MP3 hasil konversi
app.use('/download', express.static(OUTPUT));

// Auto-cleanup: Hapus file MP3 lama setiap 1 jam
setInterval(() => {
    fs.readdir(OUTPUT, (err, files) => {
        if (err) return;
        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(OUTPUT, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > 3600000) fs.unlinkSync(filePath);
        });
    });
}, 600000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
