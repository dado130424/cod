const zlib = require('zlib');
const fs = require('fs');

// Generate a 1024x1024 icon: dark background with an orange/red crosshair-like emblem
const W = 1024, H = 1024;
const raw = Buffer.alloc((W * 4 + 1) * H); // each row: 1 filter byte + W*4 RGBA

function crc32(buf) {
    let table = crc32.table;
    if (!table) {
        table = crc32.table = [];
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            table[n] = c >>> 0;
        }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

for (let y = 0; y < H; y++) {
    const rowStart = y * (W * 4 + 1);
    raw[rowStart] = 0; // filter type 0
    for (let x = 0; x < W; x++) {
        const i = rowStart + 1 + x * 4;
        const cx = x - W / 2, cy = y - H / 2;
        const d = Math.sqrt(cx * cx + cy * cy);
        const r = d / (W / 2); // 0 center, 1 edge

        let R = 30, G = 30, B = 45; // dark navy bg
        // circular gradient vignette
        R += (60 - 60 * r); G += (60 - 60 * r); B += (80 - 80 * r);
        R = Math.max(20, Math.min(255, R));
        G = Math.max(20, Math.min(255, G));
        B = Math.max(30, Math.min(255, B));

        // crosshair: vertical + horizontal bars
        const bar = 90; // half-thickness
        const inV = Math.abs(cx) < bar;
        const inH = Math.abs(cy) < bar;
        // ring
        const ring = Math.abs(d - W * 0.28) < 26;
        if (inV || inH || ring) {
            R = 255; G = 150; B = 30; // orange
        }

        raw[i] = R;
        raw[i + 1] = G;
        raw[i + 2] = B;
        raw[i + 3] = 255;
    }
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // color type RGBA
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
]);

fs.writeFileSync(process.argv[2] || 'app-icon.png', png);
console.log('icon written:', png.length, 'bytes');
