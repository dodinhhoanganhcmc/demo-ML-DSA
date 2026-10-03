"""Generate the Open Graph image (1200x630) for the ML-DSA Signature Lab.

No third-party imaging libraries: the PNG is assembled with zlib/struct only.
Design follows the committed "Transit Wayfinding" direction: ink ground,
color-coded route lines (blue/green/magenta + legacy gray), blocky pixel
lettering for "ML-DSA".

Run:  .venv/Scripts/python.exe scripts/make_og_image.py
Out:  frontend/public/og.png
"""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

W, H = 1200, 630

INK = (0x14, 0x16, 0x1A, 255)
GROUND = (0xE9, 0xE7, 0xE1, 255)
BLUE = (0x1B, 0x4F, 0xD8, 255)
GREEN = (0x0B, 0x7A, 0x45, 255)
MAGENTA = (0x8B, 0x2F, 0xC9, 255)
LEGACY = (0x5A, 0x60, 0x68, 255)

# 5x7 glyphs for "ML-DSA"
GLYPHS = {
    "M": ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
}


def new_canvas() -> bytearray:
    px = bytearray()
    for _ in range(H):
        px += struct.pack(">B", 0)  # filter type 0 per scanline
        for _ in range(W):
            px += struct.pack(">4B", *INK)
    return px


def fill(px: bytearray, x0: int, y0: int, w: int, h: int, color) -> None:
    for y in range(y0, y0 + h):
        if not 0 <= y < H:
            continue
        base = y * (1 + W * 4) + 1
        for x in range(x0, x0 + w):
            if not 0 <= x < W:
                continue
            off = base + x * 4
            px[off : off + 4] = struct.pack(">4B", *color)


def draw_text(px: bytearray, text: str, x: int, y: int, scale: int, color) -> None:
    cursor = x
    for ch in text:
        rows = GLYPHS[ch]
        for ry, row in enumerate(rows):
            for rx, bit in enumerate(row):
                if bit == "1":
                    fill(px, cursor + rx * scale, y + ry * scale, scale, scale, color)
        cursor += 5 * scale + scale  # glyph width + letter gap


def png_bytes(px: bytearray) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0)  # 8-bit RGBA
    idat = zlib.compress(bytes(px), 9)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(
        b"IEND", b""
    )


def main() -> None:
    px = new_canvas()

    # Route lines: three color-coded ML-DSA lines + one legacy gray line.
    lines = [
        (BLUE, 300, 900),
        (GREEN, 300, 740),
        (MAGENTA, 300, 1020),
        (LEGACY, 300, 460),
    ]
    y = 380
    for color, start_x, end_x in lines:
        fill(px, start_x, y, end_x - start_x, 34, color)
        # station dots at both ends
        fill(px, start_x - 12, y - 8, 50, 50, color)
        fill(px, end_x - 38, y - 8, 50, 50, color)
        y += 62

    # Ground-color rule under the lettering (wayfinding band).
    fill(px, 80, 300, 1040, 6, GROUND)

    # "ML-DSA" pixel lettering.
    draw_text(px, "ML-DSA", 80, 120, 18, GROUND)

    # Bottom caption band.
    fill(px, 80, 560, 520, 4, GROUND)

    out = Path(__file__).resolve().parent.parent / "frontend" / "public" / "og.png"
    out.write_bytes(png_bytes(px))
    print(f"wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
