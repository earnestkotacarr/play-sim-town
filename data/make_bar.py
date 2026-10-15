"""Draw the El Farol bar as a top-down pixel-art tavern interior: assets/bar.png.

The image covers BAR in convex/aiTown/ecology.ts (8 x 7 tiles of 32 px = 256 x 224).
The door is a gap in the bottom wall; the counter runs along the top.
Drawn at 1 px = 1 px and shown with nearest-neighbour scaling, like the map tiles.
Run: python3 data/make_bar.py
"""
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 8 * 32, 7 * 32
rnd = random.Random(7)
im = Image.new("RGBA", (W, H))
d = ImageDraw.Draw(im)

# --- floor: horizontal planks ------------------------------------------------
woods = [(139, 90, 43), (128, 82, 38), (146, 97, 50), (122, 77, 35)]
for y in range(0, H, 8):
    off = rnd.randrange(0, 48)
    for x in range(-off, W, 48):
        c = rnd.choice(woods)
        d.rectangle([x, y, x + 47, y + 7], fill=c)
        d.line([x, y + 7, x + 47, y + 7], fill=(92, 56, 24))  # seam
        d.line([x + 47, y, x + 47, y + 7], fill=(92, 56, 24))  # butt joint
        d.point([(x + 3, y + 3), (x + 44, y + 3)], fill=(70, 42, 18))  # nails

# --- rug by the door ------------------------------------------------------------
d.rectangle([84, 150, 172, 206], fill=(150, 30, 40))
d.rectangle([88, 154, 168, 202], outline=(230, 190, 80), width=2)
d.rectangle([96, 162, 160, 194], outline=(110, 20, 30), width=2)
for x in range(92, 168, 8):
    d.point([(x, 151), (x, 205)], fill=(230, 190, 80))

# --- walls (dark timber), door gap at the bottom --------------------------------
wall, wall_hi = (64, 38, 18), (98, 62, 30)
d.rectangle([0, 0, W - 1, 5], fill=wall)
d.rectangle([0, 0, 5, H - 1], fill=wall)
d.rectangle([W - 6, 0, W - 1, H - 1], fill=wall)
door_l, door_r = 96, 160
d.rectangle([0, H - 6, door_l, H - 1], fill=wall)
d.rectangle([door_r, H - 6, W - 1, H - 1], fill=wall)
for x0, x1 in [(0, W - 1)]:
    d.line([x0, 5, x1, 5], fill=wall_hi)
d.line([5, 5, 5, H - 6], fill=wall_hi)
d.line([W - 6, 5, W - 6, H - 6], fill=wall_hi)
# door mat
d.rectangle([door_l + 4, H - 10, door_r - 4, H - 1], fill=(90, 110, 60))

# --- back shelf with bottles ------------------------------------------------------
d.rectangle([12, 8, W - 13, 26], fill=(80, 48, 22))
d.line([12, 26, W - 13, 26], fill=(50, 30, 12))
bottle_cols = [(40, 120, 60), (120, 40, 40), (200, 160, 60), (60, 80, 140), (170, 170, 190)]
x = 16
while x < W - 18:
    c = rnd.choice(bottle_cols)
    d.rectangle([x, 12, x + 4, 24], fill=c)
    d.rectangle([x + 1, 9, x + 3, 12], fill=c)
    d.point((x + 1, 14), fill=(255, 255, 255))
    x += rnd.choice([7, 8, 9])

# --- the counter ----------------------------------------------------------------------
d.rectangle([12, 34, W - 13, 52], fill=(160, 90, 40))
d.rectangle([12, 34, W - 13, 37], fill=(196, 122, 60))  # polished top edge
d.line([12, 52, W - 13, 52], fill=(70, 40, 16))
for x in range(20, W - 20, 24):
    d.line([x, 38, x, 51], fill=(132, 72, 30))
# beer taps
for x in (48, 64, 80):
    d.rectangle([x, 28, x + 3, 36], fill=(190, 190, 200))
    d.rectangle([x - 1, 26, x + 4, 28], fill=(40, 40, 40))
# mugs of beer on the counter
for x in (110, 140, 176, 204):
    d.rectangle([x, 39, x + 6, 47], fill=(230, 170, 40))
    d.rectangle([x, 38, x + 6, 40], fill=(250, 250, 240))  # foam
    d.rectangle([x + 7, 41, x + 8, 45], outline=(200, 140, 30))  # handle

# --- stools in front of the counter ------------------------------------------------
for x in range(30, W - 24, 28):
    d.ellipse([x, 58, x + 11, 69], fill=(60, 36, 16))
    d.ellipse([x + 1, 58, x + 10, 67], fill=(170, 40, 40))
    d.point((x + 4, 61), fill=(230, 110, 110))

# --- two round tables with chairs, a candle and mugs --------------------------------------
def table(cx, cy):
    for dx, dy in [(-22, 0), (22, 0), (0, -20), (0, 20)]:
        d.rectangle([cx + dx - 6, cy + dy - 6, cx + dx + 6, cy + dy + 6], fill=(96, 58, 26))
        d.rectangle([cx + dx - 4, cy + dy - 4, cx + dx + 4, cy + dy + 4], fill=(126, 78, 36))
    d.ellipse([cx - 15, cy - 13, cx + 15, cy + 15], fill=(60, 36, 16))  # shadow
    d.ellipse([cx - 15, cy - 15, cx + 15, cy + 13], fill=(176, 112, 56))
    d.ellipse([cx - 11, cy - 11, cx + 11, cy + 9], outline=(150, 92, 42))
    d.ellipse([cx - 4, cy - 5, cx + 2, cy + 1], fill=(255, 220, 120))  # candle glow
    d.point((cx - 1, cy - 2), fill=(255, 255, 255))
    d.rectangle([cx + 5, cy + 2, cx + 9, cy + 7], fill=(230, 170, 40))
    d.rectangle([cx + 5, cy + 1, cx + 9, cy + 2], fill=(250, 250, 240))


table(58, 112)
table(198, 112)

# --- warm lamp light ---------------------------------------------------------------
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
g = ImageDraw.Draw(glow)
for cx, cy in [(64, 70), (192, 70), (128, 140)]:
    for r, a in [(56, 18), (40, 22), (24, 26)]:
        g.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 200, 90, a))
im = Image.alpha_composite(im, glow)

# --- neon sign on the back wall ------------------------------------------------------
d = ImageDraw.Draw(im)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 11)
except OSError:
    font = ImageFont.load_default()
text = "EL FAROL"
tw = d.textlength(text, font=font)
tx = (W - tw) / 2
d.rectangle([tx - 4, 0, tx + tw + 3, 13], fill=(30, 18, 8))
d.text((tx, 1), text, font=font, fill=(255, 120, 220))

out = Path(__file__).resolve().parent.parent / "assets" / "bar.png"
im.save(out)
print(out, im.size)
