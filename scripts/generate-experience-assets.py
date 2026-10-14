#!/usr/bin/env python3
"""
Generates the TEMPORARY visual assets for the cinematic kitchen landing.

They are procedural, out-of-focus "plates" (no people, no brands, no real
places): a hotel-kitchen back wall with warm pass lights, and a brushed
stainless-steel texture. Replace them with real photography by overwriting the
files in public/experience/ (same names), or by editing src/experience/assets.ts.

    python3 scripts/generate-experience-assets.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "public" / "experience"
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(20261014)  # fixed seed: reproducible output


def to_img(a):
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def radial(w, h, cx, cy, rx, ry, power=2.0):
    y, x = np.mgrid[0:h, 0:w]
    d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
    return np.exp(-(d ** (power / 2)))


def brushed_steel(w=1024, h=512):
    noise = rng.normal(0, 1, (h, w))
    # Anisotropic blur: long horizontal streaks like a brushed finish.
    k = np.ones(81) / 81
    streaks = np.apply_along_axis(lambda r: np.convolve(np.pad(r, 40, mode="wrap"), k, mode="valid"), 1, noise)
    streaks = (streaks - streaks.min()) / (streaks.max() - streaks.min())
    base = 118 + 46 * (streaks - 0.5)
    # Soft vertical light falloff and one broad specular band.
    y = np.linspace(0, 1, h)[:, None]
    base = base + 38 * np.exp(-((y - 0.32) / 0.12) ** 2) - 30 * y
    rgb = np.stack([base * 0.98, base * 1.0, base * 1.03], axis=-1)
    to_img(rgb).save(OUT / "brushed-steel.webp", quality=72, method=6)


def kitchen_backdrop(w=1920, h=1080):
    y, x = np.mgrid[0:h, 0:w]
    counter_y = int(h * 0.64)

    # 1. Deep warm-black base, lifted towards the centre of the line.
    base = 8 + 18 * radial(w, h, w * 0.5, h * 0.42, w * 0.5, h * 0.5)
    img = np.stack([base * 1.2, base * 0.95, base * 0.78], axis=-1)

    # 2. Back wall: dark glazed tiles, thrown well out of focus.
    tiles = Image.new("RGB", (w, h), (0, 0, 0))
    d = ImageDraw.Draw(tiles)
    tw, th = 150, 50
    for row in range(0, h // th + 2):
        off = (tw // 2) * (row % 2)
        for col in range(-1, w // tw + 2):
            x0, y0 = col * tw + off, row * th
            g = int(22 + rng.integers(-5, 6))
            d.rectangle([x0 + 3, y0 + 3, x0 + tw - 3, y0 + th - 3], fill=(g + 4, g + 3, g + 2))
            if rng.random() < 0.35:  # glaze sheen on some tiles
                d.rectangle([x0 + 10, y0 + 6, x0 + tw - 30, y0 + 12], fill=(g + 18, g + 14, g + 10))
    tiles = np.asarray(tiles.filter(ImageFilter.GaussianBlur(9)), dtype=float)
    wall = (y < counter_y)[..., None]
    light = radial(w, h, w * 0.5, h * 0.3, w * 0.45, h * 0.42)[..., None]
    img = img + wall * tiles * (0.15 + 0.85 * light) * np.array([1.2, 0.98, 0.78])

    # 3. Extraction canopy: dark brushed steel with a warm lit lower lip.
    canopy = np.zeros((h, w))
    canopy[int(h * 0.05):int(h * 0.19), :] = 1
    steel = np.asarray(Image.open(OUT / "brushed-steel.webp").resize((w, h)), dtype=float)
    img = img * (1 - canopy[..., None] * 0.9) + canopy[..., None] * steel * np.array([0.2, 0.18, 0.16])
    img = img + radial(w, h, w * 0.5, h * 0.19, w * 0.75, h * 0.008, 2)[..., None] * np.array([150, 110, 70])

    # 4. Shelving with plates and pans, soft and dim at the sides.
    shapes = Image.new("L", (w, h), 0)
    sd = ImageDraw.Draw(shapes)
    for x0 in (40, w - 520):
        for shelf in range(3):
            yy = int(h * (0.3 + shelf * 0.1))
            sd.rectangle([x0, yy, x0 + 480, yy + 5], fill=120)
            for i in range(8):
                px = x0 + 18 + i * 58 + int(rng.integers(-8, 9))
                ph = int(rng.integers(16, 50))
                sd.rounded_rectangle([px, yy - ph, px + 44, yy], radius=8, fill=int(rng.integers(50, 100)))
    shapes = np.asarray(shapes.filter(ImageFilter.GaussianBlur(10)), dtype=float)[..., None] / 255
    img = img + shapes * np.array([60, 52, 44]) * (0.25 + light)

    # 5. Heat lamps over the pass: uneven out-of-focus highlights, light cones and counter reflections.
    lights = np.zeros((h, w, 3))
    xs = np.sort(rng.uniform(0.16, 0.84, 8)) * w
    for cx in xs:
        cy = h * 0.235 + rng.normal(0, 3)
        r = rng.uniform(16, 34)
        k = rng.uniform(0.35, 0.85)
        lights += radial(w, h, cx, cy, r, r, 8)[..., None] * np.array([255, 190, 120]) * k
        lights += radial(w, h, cx, cy, r * 3.5, r * 2.6, 2)[..., None] * np.array([140, 80, 34]) * 0.35 * k
        cone = radial(w, h, cx, cy + h * 0.2, w * 0.035, h * 0.22, 2) * (y > cy)
        lights += cone[..., None] * np.array([90, 58, 28]) * 0.55 * k
        lights += radial(w, h, cx, counter_y + 14, r * 2.2, 5, 2)[..., None] * np.array([210, 150, 90]) * 0.45 * k
    img = img + lights

    # 6. Stainless pass top: a thin bright edge, then a darker reflective surface.
    edge = radial(w, h, w * 0.5, counter_y, w * 0.8, 2.2, 2)[..., None]
    img = img + edge * np.array([170, 140, 110])
    below = (y > counter_y)[..., None]
    img = img * (1 - below * 0.45) + below * steel * np.array([0.1, 0.09, 0.085]) * (1 - (y - counter_y) / h)[..., None]

    # 7. Haze, grain, vignette.
    img = img + radial(w, h, w * 0.5, h * 0.4, w * 0.45, h * 0.3)[..., None] * np.array([34, 24, 15])
    img = img + rng.normal(0, 2.6, (h, w, 1))
    vignette = 1 - 0.8 * (1 - radial(w, h, w / 2, h * 0.45, w * 0.72, h * 0.78, 2))
    img = img * vignette[..., None]

    out = to_img(img).filter(ImageFilter.GaussianBlur(1.6))
    out.save(OUT / "kitchen-backdrop-1920.webp", quality=70, method=6)
    out.resize((1280, 720), Image.LANCZOS).save(OUT / "kitchen-backdrop-1280.webp", quality=68, method=6)
    out.crop((w // 2 - 540, 0, w // 2 + 540, h)).resize((720, 720), Image.LANCZOS).save(OUT / "kitchen-backdrop-portrait.webp", quality=68, method=6)


if __name__ == "__main__":
    brushed_steel()
    kitchen_backdrop()
    for f in sorted(OUT.glob("*.webp")):
        print(f.name, f.stat().st_size // 1024, "KB")
