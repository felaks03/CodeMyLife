// Genera los iconos PNG de la aplicacion sin depender de herramientas graficas.
const { deflateSync, crc32 } = require('node:zlib');
const { writeFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y, size);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Circulo azul con un corte diagonal, evocando un bloqueo activo.
function icon(x, y, size) {
  const center = (size - 1) / 2;
  const dx = x - center;
  const dy = y - center;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const radius = size * 0.46;

  if (distance > radius) return [0, 0, 0, 0];

  const onSlash = Math.abs(dx + dy) < size * 0.09;
  const inRing = distance > radius - size * 0.12;

  if (onSlash || inRing) return [255, 255, 255, 255];
  return [14, 99, 156, 255];
}

const assets = path.join(__dirname, '..', 'assets');
mkdirSync(assets, { recursive: true });
writeFileSync(path.join(assets, 'icon.png'), png(256, icon));
writeFileSync(path.join(assets, 'tray.png'), png(32, icon));
console.log('Iconos generados en frontend/assets');
