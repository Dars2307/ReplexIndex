import fs from 'node:fs';
import zlib from 'node:zlib';

function createPng(width, height, isMaskable = false) {
  // Simple PNG generator with raw RGBA buffer
  const buffer = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.35 : 0.42);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default dark canvas background #0B1018
      let r = 0x0B, g = 0x10, b = 0x18, a = 0xFF;

      // Outer ring
      if (Math.abs(dist - radius) < width * 0.02) {
        r = 0x22; g = 0x30; b = 0x44;
      }
      // Star diamond shape: |dx| + |dy| <= radius * 0.8
      const diamondDist = Math.abs(dx) + Math.abs(dy);
      if (diamondDist < radius * 0.75) {
        // Cyan gradient / #52D5C5
        const t = diamondDist / (radius * 0.75);
        r = Math.round(0x52 * (1 - t * 0.4) + 0x1A * (t * 0.4));
        g = Math.round(0xD5 * (1 - t * 0.4) + 0x25 * (t * 0.4));
        b = Math.round(0xC5 * (1 - t * 0.4) + 0x33 * (t * 0.4));
      }
      // Center dot
      if (dist < width * 0.05) {
        r = 0x75; g = 0xE5; b = 0xD7;
      }

      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }

  // PNG chunks: IHDR, IDAT, IEND
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    scanlines[y * (1 + width * 4)] = 0; // Filter type 0 (None)
    buffer.copy(scanlines, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const deflated = zlib.deflateSync(scanlines);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const chunkType = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([chunkType, data]));
    crc.writeUInt32BE(crcVal >>> 0, 0);
    return Buffer.concat([len, chunkType, data, crc]);
  }

  // Table for crc32
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
      }
    }
    return c ^ 0xffffffff;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

fs.writeFileSync('public/pwa-192x192.png', createPng(192, 192));
fs.writeFileSync('public/pwa-512x512.png', createPng(512, 512));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPng(512, 512, true));
fs.writeFileSync('public/apple-touch-icon.png', createPng(180, 180));
console.log('PWA icons created successfully.');
