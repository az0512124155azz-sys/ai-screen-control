#!/usr/bin/env python3
"""Generate the source app icon (src-tauri/icons/icon.png).

Run in CI before `tauri icon` so we never need to commit a binary.
Draws the AI Screen Control mark — a screen with an AI sparkle on a purple
gradient — as a 1024x1024 RGBA PNG using only the Python standard library.
"""
import os
import struct
import zlib

S = 1024
OUT = os.path.join(os.path.dirname(__file__), "..", "src-tauri", "icons", "icon.png")

# Brand gradient (top-left -> bottom-right).
C1 = (102, 126, 234)   # #667eea
C2 = (118, 75, 162)    # #764ba2
WHITE = (255, 255, 255, 255)

# Rounded outer squircle.
CORNER = 210

# Screen (monitor) body.
SX, SY, SW, SH = 258, 262, 508, 360
S_RX = 48
STROKE = 44

# Stand.
LEG_TOP = SY + SH               # 622
LEG_BOT = LEG_TOP + 52
LEG_W = 22
BASE_Y = LEG_BOT - 20
BASE_H = 22
BASE_X0, BASE_X1 = 402, 622

# Sparkle centered in the screen interior.
SP_CX, SP_CY = 512, SY + SH // 2   # (512, 442)
SP_R = 122


def lerp(a, b, t):
    return a + (b - a) * t


def in_round_rect(px, py, x, y, w, h, r):
    if px < x or px > x + w or py < y or py > y + h:
        return False
    dx = min(px - x, x + w - px)
    dy = min(py - y, y + h - py)
    if dx >= r or dy >= r:
        return True
    return (r - dx) ** 2 + (r - dy) ** 2 <= r * r


def in_sparkle(px, py):
    # Four-point concave star via a sub-1 superellipse.
    dx = abs(px - SP_CX) / SP_R
    dy = abs(py - SP_CY) / SP_R
    if dx > 1 or dy > 1:
        return False
    return (dx ** 0.5 + dy ** 0.5) <= 1.0


def is_white(x, y):
    # Screen outline (ring between outer and inner rounded rects).
    outer = in_round_rect(x, y, SX, SY, SW, SH, S_RX)
    inner = in_round_rect(
        x, y, SX + STROKE, SY + STROKE, SW - 2 * STROKE, SH - 2 * STROKE, max(4, S_RX - STROKE)
    )
    if outer and not inner:
        return True
    # Sparkle inside the screen.
    if in_sparkle(x, y):
        return True
    # Stand legs.
    if LEG_TOP <= y <= LEG_BOT and (
        abs(x - 456) <= LEG_W // 2 or abs(x - 568) <= LEG_W // 2
    ):
        return True
    # Stand base bar (rounded).
    if in_round_rect(x, y, BASE_X0, BASE_Y, BASE_X1 - BASE_X0, BASE_H, BASE_H // 2):
        return True
    return False


def pixel(x, y):
    # Outside the squircle -> transparent.
    if not in_round_rect(x, y, 0, 0, S - 1, S - 1, CORNER):
        return (0, 0, 0, 0)
    if is_white(x, y):
        return WHITE
    t = (x + y) / (2.0 * (S - 1))
    return (
        int(lerp(C1[0], C2[0], t)),
        int(lerp(C1[1], C2[1], t)),
        int(lerp(C1[2], C2[2], t)),
        255,
    )


def main():
    raw = bytearray()
    for y in range(S):
        raw.append(0)  # PNG filter type 0 (None) per scanline
        for x in range(S):
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
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", S, S, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", comp)
    png += chunk(b"IEND", b"")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "wb") as f:
        f.write(png)
    print("Wrote", OUT, "(", len(png), "bytes )")


if __name__ == "__main__":
    main()
