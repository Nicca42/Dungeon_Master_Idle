"""Generate the app icon from an original 32x32 geometric pixel design."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
pixels = [[(23, 21, 29, 255) for _ in range(32)] for _ in range(32)]

def rect(x, y, w, h, color):
    for row in range(y, y + h):
        for col in range(x, x + w):
            pixels[row][col] = color

gold = (233, 187, 112, 255)
dim = (126, 96, 60, 255)
rect(6, 5, 20, 23, dim)
rect(7, 6, 18, 21, gold)
rect(9, 8, 14, 17, (43, 34, 38, 255))
rect(5, 5, 4, 4, gold)
rect(14, 5, 4, 4, gold)
rect(23, 5, 4, 4, gold)
rect(15, 11, 2, 10, gold)
rect(11, 17, 2, 2, gold)
rect(13, 19, 2, 2, gold)
rect(17, 19, 2, 2, gold)
rect(19, 17, 2, 2, gold)

def png(size, destination):
    scale = size // 32
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            raw.extend(pixels[y // scale][x // scale])
    def chunk(kind, body):
        return struct.pack('!I', len(body)) + kind + body + struct.pack('!I', zlib.crc32(kind + body) & 0xffffffff)
    data = b'\x89PNG\r\n\x1a\n'
    data += chunk(b'IHDR', struct.pack('!2I5B', size, size, 8, 6, 0, 0, 0))
    data += chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    destination.write_bytes(data)

png(1024, ROOT / 'assets/icon.png')
png(64, ROOT / 'assets/favicon.png')
