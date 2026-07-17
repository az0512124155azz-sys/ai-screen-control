#!/usr/bin/env python3
"""Generate the source app icon (src-tauri/icons/icon.png).

Run in CI before `tauri icon` so we never need to commit a binary.
Produces a 1024x1024 RGBA PNG using only the Python standard library.
"""
import os
import struct
import zlib

W = H = 1024
OUT = os.path.join(os.path.dirname(__file__), "..", "src-tauri", "icons", "icon.png")


def pixel(x, y):
    # Purple background with a white circle ("bubble") in the middle.
    r, g, b = 102, 126, 234
    cx, cy = W / 2, H / 2
    dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
    if dist < 300:
        return (255, 255, 255, 255)
    if dist < 340:
        return (118, 75, 162, 255)
    return (r, g, b, 255)


def main():
    raw = bytearray()
    for y in range(H):
        raw.append(0)  # PNG filter type 0 (None) per scanline
        for x in range(W):
            raw += bytes(pixel(x, y))
    comp = zlib.compress(bytes(raw), 9)

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", comp)
    png += chunk(b"IEND", b"")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "wb") as f:
        f.write(png)
    print("Wrote", OUT, "(", len(png), "bytes )")


if __name__ == "__main__":
    main()
