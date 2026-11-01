"""
Generates every texture used by the 3D venue. All images are original and
procedural (numpy + Pillow), so there are no licensing questions.

    python3 tools/gen_textures.py src/three/tex

Outputs WebP files:
  PBR sets (color / normal / orm = AO, roughness, metalness):
    marble, plaster, teak, relief (door carving), roof, grass, flagstone,
    linen, bark, brass (orm only), water (normal only)
  Alpha cutouts:
    flowers (4x2 atlas), palm_frond, banana, leaves, araliya, tuft,
    polmal (coconut flower), treeline, lotus_petal
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else 'src/three/tex'
os.makedirs(OUT, exist_ok=True)


# ─── helpers ────────────────────────────────────────────────────────────────
def spectral(size, beta, seed, aniso=(1.0, 1.0), h=None):
    """Tileable fractal noise from filtered white noise (zero mean, unit std)."""
    hgt = h or size
    rng = np.random.default_rng(seed)
    w = rng.standard_normal((hgt, size))
    fy = np.fft.fftfreq(hgt)[:, None] * aniso[1] * (size / hgt)
    fx = np.fft.fftfreq(size)[None, :] * aniso[0]
    f = np.sqrt(fx ** 2 + fy ** 2)
    f[0, 0] = 1
    F = np.fft.fft2(w) / f ** beta
    F[0, 0] = 0
    n = np.real(np.fft.ifft2(F))
    return (n - n.mean()) / (n.std() + 1e-9)


def grid(w, h=None):
    h = h or w
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    return x / w, y / h


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    t = t[..., None] if np.ndim(t) == 2 else t
    return np.asarray(a) * (1 - t) + np.asarray(b) * t


def normal_from_height(hgt, strength):
    dx = (np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)) * 0.5 * strength
    dy = (np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)) * 0.5 * strength
    n = np.stack([-dx, dy, np.ones_like(hgt)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5


def ao_from_height(hgt, radius=6, amount=1.0):
    img = Image.fromarray((np.clip(hgt, 0, 1) * 255).astype(np.uint8))
    blur = np.asarray(img.filter(ImageFilter.GaussianBlur(radius)), np.float32) / 255
    return np.clip(1 - np.maximum(0, blur - hgt) * 3 * amount, 0, 1)


def save(arr, name, q=82):
    a = np.clip(arr, 0, 1)
    mode = 'RGBA' if a.shape[-1] == 4 else 'RGB'
    Image.fromarray((a * 255 + 0.5).astype(np.uint8), mode).save(os.path.join(OUT, name), 'WEBP', quality=q, method=6)
    print('wrote', name, a.shape)


def save_orm(ao, rough, metal, name):
    save(np.stack([ao, rough, np.full_like(ao, metal)], -1), name, 88)


def bleed(rgba):
    """Fill RGB under transparent pixels with nearby colours so mipmaps don't fringe."""
    rgb, a = rgba[..., :3], rgba[..., 3:4]
    acc = rgb * a
    out_rgb = rgb.copy()
    w = a.copy()
    for r in (2, 6, 16, 40):
        ai = Image.fromarray((w[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))
        ci = [Image.fromarray(np.clip(acc[..., k] * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)) for k in range(3)]
        aw = np.asarray(ai, np.float32)[..., None] / 255 + 1e-4
        c = np.stack([np.asarray(c_, np.float32) / 255 for c_ in ci], -1) / aw
        empty = a[..., 0] < 0.5
        out_rgb[empty] = np.clip(c[empty], 0, 1)
    return np.concatenate([out_rgb, a], -1)


def downsample(rgba, factor):
    h, w = rgba.shape[:2]
    img = Image.fromarray((np.clip(rgba, 0, 1) * 255).astype(np.uint8), 'RGBA')
    img = img.resize((w // factor, h // factor), Image.LANCZOS)
    return np.asarray(img, np.float32) / 255


def hex3(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)


# ─── marble floor (2×2 tiles per texture) ──────────────────────────────────
def marble():
    s = 1024
    x, y = grid(s)
    n1, n2, n3 = spectral(s, 1.7, 1), spectral(s, 2.1, 2), spectral(s, 1.2, 3)
    phase = 2 * np.pi * (2 * x + y) + 2.6 * n1 + 0.8 * n2
    vein = np.exp(-np.abs(np.sin(phase)) * 14) * smoothstep(-0.6, 1.0, n2)
    fine = np.exp(-np.abs(spectral(s, 1.9, 4)) * 9) * 0.5
    base = mix(hex3('#f3ece0'), hex3('#e9dfcf'), smoothstep(-1.5, 1.5, n3))
    col = mix(base, hex3('#a69a88'), np.clip(vein * 0.55 + fine * 0.18, 0, 1))
    col = mix(col, hex3('#c9ad78'), np.clip(vein * 0.18, 0, 1))
    # tiles: subtle per-tile tone, thin grout
    tx, ty = np.floor(x * 2), np.floor(y * 2)
    rng = np.random.default_rng(9)
    tone = rng.uniform(-0.025, 0.025, (2, 2))
    col *= (1 + tone[ty.astype(int), tx.astype(int)])[..., None]
    gx, gy = np.abs(((x * 2) % 1) - 0.5), np.abs(((y * 2) % 1) - 0.5)
    grout = smoothstep(0.4985, 0.4999, np.maximum(gx, gy))
    col = mix(col, hex3('#cfc5b4'), grout)
    hgt = 1 - grout * 0.8 + 0.01 * n3
    save(col, 'marble_color.webp')
    save(normal_from_height(hgt, 6), 'marble_normal.webp')
    save_orm(1 - grout * 0.35, 0.1 + 0.06 * smoothstep(-2, 2, n2) + grout * 0.55, 0, 'marble_orm.webp')


# ─── lime plaster ───────────────────────────────────────────────────────────
def plaster():
    s = 1024
    lo, mid, hi = spectral(s, 2.2, 11), spectral(s, 1.4, 12), spectral(s, 0.6, 13)
    col = hex3('#e2d6c0') * (1 + 0.04 * lo + 0.015 * hi)[..., None]
    col = mix(col, hex3('#e2d3b6'), smoothstep(1.2, 2.8, lo) * 0.35)
    hgt = 0.5 + 0.06 * mid + 0.03 * hi
    save(col, 'plaster_color.webp')
    save(normal_from_height(hgt, 7), 'plaster_normal.webp')
    save_orm(np.ones_like(lo), 0.86 + 0.06 * np.tanh(mid), 0, 'plaster_orm.webp')


# ─── teak wood (grain runs vertically) ─────────────────────────────────────
def teak():
    s = 1024
    x, y = grid(s)
    warp = spectral(s, 1.8, 21, aniso=(1, 0.08))
    phase = 2 * np.pi * x * 16 + 1.1 * warp
    ring = (0.5 + 0.5 * np.sin(phase)) ** 2.2
    pores = spectral(s, 0.4, 22, aniso=(1, 0.05))
    streak = smoothstep(1.2, 2.6, pores)
    col = mix(hex3('#7a4a28'), hex3('#93603a'), ring * 0.7 + 0.15 * smoothstep(-2, 2, spectral(s, 2.2, 24)))
    col *= (1 + 0.07 * spectral(s, 1.5, 23))[..., None]
    col = mix(col, hex3('#3e2213'), streak * 0.45)
    hgt = 0.5 + 0.08 * ring - 0.12 * streak
    save(col, 'teak_color.webp')
    save(normal_from_height(hgt, 5), 'teak_normal.webp')
    save_orm(1 - streak * 0.25, 0.42 + 0.18 * streak + 0.05 * ring, 0, 'teak_orm.webp')


# ─── carved door relief (normal + AO only; applied over teak) ──────────────
def relief():
    S = 2048
    img = Image.new('L', (S, S), 0)
    d = ImageDraw.Draw(img)
    m = int(S * 0.05)
    d.rectangle([m, m, S - m, S - m], fill=150)
    d.rectangle([m * 2, m * 2, S - m * 2, S - m * 2], fill=60)
    # bead border
    for i in range(30):
        t = (i + 0.5) / 30
        for (bx, by) in [(m * 1.5 + t * (S - 3 * m), m * 1.5), (m * 1.5 + t * (S - 3 * m), S - m * 1.5),
                         (m * 1.5, m * 1.5 + t * (S - 3 * m)), (S - m * 1.5, m * 1.5 + t * (S - 3 * m))]:
            r = m * 0.28
            d.ellipse([bx - r, by - r, bx + r, by + r], fill=230)
    c = S / 2
    # central lotus medallion
    for ring_r, petals, plen, pw, val in [(0, 16, 0.3, 0.07, 170), (0, 8, 0.22, 0.09, 230)]:
        for k in range(petals):
            a = k / petals * 2 * math.pi + (math.pi / petals if petals == 8 else 0)
            pts = []
            for j in range(41):
                u = j / 40
                wdt = math.sin(math.pi * u) ** 0.8 * pw * S
                along = u * plen * S
                for side in (1,):
                    pass
                pts.append((along, wdt))
            poly = [(c + math.cos(a) * p[0] - math.sin(a) * p[1], c + math.sin(a) * p[0] + math.cos(a) * p[1]) for p in pts]
            poly += [(c + math.cos(a) * p[0] + math.sin(a) * p[1], c + math.sin(a) * p[0] - math.cos(a) * p[1]) for p in reversed(pts)]
            d.polygon(poly, fill=val)
    d.ellipse([c - S * 0.05, c - S * 0.05, c + S * 0.05, c + S * 0.05], fill=255)
    # corner scrolls
    for (cx, cy, sx, sy) in [(m * 2, m * 2, 1, 1), (S - m * 2, m * 2, -1, 1), (m * 2, S - m * 2, 1, -1), (S - m * 2, S - m * 2, -1, -1)]:
        for k in range(5):
            r = S * (0.2 - k * 0.032)
            d.arc([cx - r, cy - r, cx + r, cy + r], 0, 360, fill=200, width=int(S * 0.012))
        for k in range(6):
            a = math.radians(10 + k * 14)
            px, py = cx + sx * math.cos(a) * S * 0.24, cy + sy * math.sin(a) * S * 0.24
            r = S * 0.03
            d.ellipse([px - r, py - r * 0.6, px + r, py + r * 0.6], fill=210)
    img = img.filter(ImageFilter.GaussianBlur(S * 0.004)).resize((1024, 1024), Image.LANCZOS)
    hgt = np.asarray(img, np.float32) / 255
    save(normal_from_height(hgt, 9), 'relief_normal.webp')
    ao = ao_from_height(hgt, 10, 1.4)
    save_orm(ao, 0.5 - hgt * 0.1, 0, 'relief_orm.webp')


# ─── Sinhala clay roof tiles (v up = towards the ridge) ─────────────────────
def roof():
    s = 1024
    C, R = 8, 10
    x, y = grid(s)
    row = np.floor(y * R)
    off = (row % 2) * 0.5
    lx = (x * C + off) % 1
    col_i = np.floor(x * C + off) % C
    ly = (y * R) % 1  # 0 at top (up-slope), 1 at the lower rounded end
    edge = 1 - 0.22 * (1 - (2 * lx - 1) ** 2) ** 0.5
    below = ly > edge  # showing the tile underneath
    hgt = np.where(below, 0.15 + 0.2 * (ly - edge), 0.3 + 0.7 * ly)
    gap = smoothstep(0.03, 0.0, np.minimum(lx, 1 - lx))
    hgt -= gap * 0.25 * (~below)
    rng = np.random.default_rng(31)
    tone = rng.uniform(-0.12, 0.1, (R, C))
    hue = rng.uniform(-0.04, 0.04, (R, C))
    t = tone[row.astype(int) % R, col_i.astype(int)]
    hu = hue[row.astype(int) % R, col_i.astype(int)]
    base = hex3('#a65a3b')
    col = np.stack([base[0] * (1 + t + hu), base[1] * (1 + t), base[2] * (1 + t - hu)], -1)
    grime = smoothstep(0.6, 1.0, ly) * 0.25 + smoothstep(1.0, 2.6, spectral(s, 1.6, 32)) * 0.35
    col = mix(col, hex3('#5e3a2b'), np.clip(grime, 0, 0.6))
    lichen = smoothstep(1.8, 2.8, spectral(s, 1.3, 33))
    col = mix(col, hex3('#8a8a72'), lichen * 0.5)
    col = mix(col, col * 0.45, below.astype(np.float32) * 0.6)
    col = mix(col, col * 0.4, gap)
    hgt += 0.02 * spectral(s, 0.8, 34)
    save(col, 'roof_color.webp')
    save(normal_from_height(hgt, 7), 'roof_normal.webp')
    save_orm(ao_from_height(hgt, 5, 1.2), 0.82 - 0.1 * lichen, 0, 'roof_orm.webp')


# ─── lawn ───────────────────────────────────────────────────────────────────
def grass():
    s = 1024
    lo = spectral(s, 2.0, 41)
    base = mix(hex3('#4c6b2c'), hex3('#6b8a3a'), smoothstep(-1.5, 1.5, lo))
    S = s * 2
    img = Image.fromarray((np.repeat(np.repeat(base, 2, 0), 2, 1) * 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(42)
    palette = [hex3(h) for h in ['#3f5e22', '#5a7d2e', '#78983f', '#8aa64c', '#4d6e27', '#9db35c']]
    for _ in range(90000):
        x0, y0 = rng.uniform(0, S, 2)
        ln = rng.uniform(10, 26)
        a = rng.normal(-math.pi / 2, 0.45)
        c = palette[rng.integers(0, len(palette))] * rng.uniform(0.85, 1.1)
        x1, y1 = x0 + math.cos(a) * ln, y0 + math.sin(a) * ln
        for ox in (0, -S, S):
            for oy in (0, -S, S):
                d.line([(x0 + ox, y0 + oy), (x1 + ox, y1 + oy)], fill=tuple(int(v * 255) for v in np.clip(c, 0, 1)), width=2)
    img = img.resize((s, s), Image.LANCZOS)
    col = np.asarray(img, np.float32) / 255
    lum = col.mean(-1)
    save(col, 'grass_color.webp')
    save(normal_from_height(lum, 4), 'grass_normal.webp')
    save_orm(0.75 + 0.25 * smoothstep(0.2, 0.45, lum), np.full_like(lum, 0.95), 0, 'grass_orm.webp')


# ─── flagstone path ─────────────────────────────────────────────────────────
def flagstone():
    s = 1024
    x, y = grid(s)
    n = 6
    rng = np.random.default_rng(51)
    pts = (np.stack(np.meshgrid(np.arange(n), np.arange(n)), -1).reshape(-1, 2) + rng.uniform(0.15, 0.85, (n * n, 2))) / n
    tones = rng.uniform(-0.08, 0.08, n * n)
    d1 = np.full((s, s), 9.0)
    d2 = np.full((s, s), 9.0)
    idx = np.zeros((s, s), int)
    for i, (px, py) in enumerate(pts):
        for ox in (-1, 0, 1):
            for oy in (-1, 0, 1):
                dd = np.hypot(x - px - ox, y - py - oy)
                closer = dd < d1
                d2 = np.where(closer, d1, np.minimum(d2, dd))
                idx = np.where(closer, i, idx)
                d1 = np.where(closer, dd, d1)
    edge = d2 - d1
    stone = smoothstep(0.008, 0.03, edge)
    tex = spectral(s, 1.1, 52)
    col = hex3('#bdb3a1') * (1 + tones[idx] + 0.04 * tex)[..., None]
    col = mix(col, hex3('#a39886'), smoothstep(0.8, 2.2, spectral(s, 1.7, 53)) * 0.4)
    col = mix(hex3('#4e5338'), col, stone)
    hgt = stone * (0.8 + 0.04 * tex) + 0.03 * spectral(s, 0.5, 54)
    save(col, 'flagstone_color.webp')
    save(normal_from_height(hgt, 8), 'flagstone_normal.webp')
    save_orm(ao_from_height(hgt, 6, 1.0), 0.72 + 0.2 * (1 - stone), 0, 'flagstone_orm.webp')


# ─── linen weave (tinted by material colour) ───────────────────────────────
def linen():
    s = 512
    x, y = grid(s)
    k = 96
    chk = np.sign(np.sin(np.pi * k * x) * np.sin(np.pi * k * y))
    warp = np.abs(np.cos(np.pi * k * x))
    weft = np.abs(np.cos(np.pi * k * y))
    slub = spectral(s, 1.0, 61, aniso=(1, 0.08)) * 0.15 + spectral(s, 1.0, 62, aniso=(0.08, 1)) * 0.15
    hgt = np.where(chk > 0, 1 - warp, 1 - weft) * 0.6 + slub
    col = np.repeat((0.94 + 0.04 * np.tanh(slub * 3))[..., None], 3, -1)
    save(col, 'linen_color.webp')
    save(normal_from_height(hgt, 2.2), 'linen_normal.webp')
    save_orm(np.ones_like(hgt), 0.92 + 0.04 * np.tanh(slub), 0, 'linen_orm.webp')


# ─── palm bark (rings run horizontally) ────────────────────────────────────
def bark():
    s = 512
    x, y = grid(s)
    wob = spectral(s, 1.6, 71)
    ring = np.abs(np.sin(np.pi * (y * 9 + 0.05 * wob)))
    scar = smoothstep(0.85, 1.0, 1 - ring)
    fib = spectral(s, 0.6, 72, aniso=(1, 0.1))
    col = mix(hex3('#7a6a57'), hex3('#a1907a'), smoothstep(-1.5, 1.5, fib * 0.6 + wob * 0.4))
    col = mix(col, hex3('#4d4136'), scar * 0.7)
    hgt = 0.6 - scar * 0.4 + 0.05 * fib
    save(col, 'bark_color.webp')
    save(normal_from_height(hgt, 6), 'bark_normal.webp')
    save_orm(1 - scar * 0.4, np.full_like(hgt, 0.9), 0, 'bark_orm.webp')


def brass():
    s = 512
    smudge = spectral(s, 1.5, 81)
    fine = spectral(s, 0.4, 82)
    rough = 0.22 + 0.1 * smoothstep(0.5, 2.0, smudge) + 0.03 * fine
    save_orm(np.ones_like(rough), rough, 1, 'brass_orm.webp')


def water():
    s = 512
    hgt = spectral(s, 2.0, 91) * 0.5 + spectral(s, 1.4, 92) * 0.2
    save(normal_from_height(hgt / 6, 7), 'water_normal.webp')


# ─── cutouts ────────────────────────────────────────────────────────────────
def petal_layer(S, cx, cy, ang, length, width, c_base, c_tip, shape_pow=0.7, obovate=0.35, cup=0.18, curl=0.0):
    """Returns (rgba) of one shaded petal on an S×S canvas."""
    y, x = np.mgrid[0:S, 0:S].astype(np.float32)
    dx, dy = x - cx, y - cy
    u = (dx * math.cos(ang) + dy * math.sin(ang)) / length
    v = (-dx * math.sin(ang) + dy * math.cos(ang)) / length
    v = v - curl * u * u
    prof = np.clip(np.sin(np.pi * np.clip(u, 0, 1) ** (1 - obovate)), 0, 1) ** shape_pow * width / length
    inside = (u > 0) & (u < 1) & (np.abs(v) < prof)
    edge = np.abs(v) / (prof + 1e-6)
    col = mix(c_base, c_tip, np.clip(u, 0, 1) ** 0.8)
    shade = 1 - cup * edge ** 2 - 0.08 * (1 - np.clip(u * 3, 0, 1))
    vein = np.exp(-np.abs(v) / (prof + 1e-6) * 18) * 0.05
    col = col * (shade + vein)[..., None]
    soft = np.clip((1 - edge) * 6, 0, 1) * np.clip(u * 30, 0, 1) * np.clip((1 - u) * 30, 0, 1)
    a = np.where(inside, soft, 0)
    return np.concatenate([np.clip(col, 0, 1), a[..., None]], -1)


def over(dst, src, shadow=0.0):
    a = src[..., 3:4]
    if shadow:
        sh = Image.fromarray((a[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(dst.shape[0] * 0.01))
        sh = np.asarray(sh, np.float32)[..., None] / 255 * shadow
        dst[..., :3] *= 1 - sh * (dst[..., 3:4] > 0)
    dst[..., :3] = dst[..., :3] * (1 - a) + src[..., :3] * a
    dst[..., 3:4] = dst[..., 3:4] * (1 - a) + a
    return dst


def flower_cell(kind, S=512, seed=0):
    rng = np.random.default_rng(seed)
    cv = np.zeros((S, S, 4), np.float32)
    c = S / 2
    if kind == 'jasmine':
        n = 7
        for k in range(n):
            a = k / n * 2 * math.pi + rng.normal(0, 0.05)
            cv = over(cv, petal_layer(S, c, c, a, S * 0.44, S * 0.13, hex3('#f6efda'), hex3('#fffdf7'), 0.6, 0.45, 0.25), 0.25)
        y, x = np.mgrid[0:S, 0:S]
        ctr = np.hypot(x - c, y - c) < S * 0.045
        cv[ctr] = [*hex3('#e3cf8f'), 1]
    elif kind == 'buds':
        for k in range(4):
            a = -math.pi / 2 + (k - 1.5) * 0.35 + rng.normal(0, 0.05)
            bx, by = c + (k - 1.5) * S * 0.06, S * 0.9
            cv = over(cv, petal_layer(S, bx, by, a, S * 0.8, S * 0.08, hex3('#9fb07a'), hex3('#fbf6ea'), 0.9, 0.7, 0.35), 0.2)
    elif kind == 'frangipani':
        n = 5
        for k in range(n):
            a = k / n * 2 * math.pi + 0.3
            cv = over(cv, petal_layer(S, c, c, a, S * 0.46, S * 0.22, hex3('#f2c44f'), hex3('#fffaf0'), 0.55, 0.55, 0.22, curl=0.25), 0.35)
    elif kind in ('rose_blush', 'rose_white'):
        base, tip = (hex3('#d98f86'), hex3('#f4cfc6')) if kind == 'rose_blush' else (hex3('#efe2cf'), hex3('#fffaf2'))
        for ring, (n, ln, wd) in enumerate([(7, 0.46, 0.22), (6, 0.36, 0.2), (5, 0.27, 0.17), (4, 0.18, 0.13), (3, 0.1, 0.09)]):
            for k in range(n):
                a = k / n * 2 * math.pi + ring * 0.7
                dark = 0.82 + ring * 0.03
                cv = over(cv, petal_layer(S, c, c, a, S * ln, S * wd, base * dark, tip, 0.5, 0.6, 0.35), 0.45)
    elif kind == 'marigold':
        for ring in range(6):
            n = 22 - ring * 3
            for k in range(n):
                a = k / n * 2 * math.pi + ring * 0.37 + rng.normal(0, 0.06)
                ln = S * (0.46 - ring * 0.065)
                cv = over(cv, petal_layer(S, c, c, a, ln, S * 0.07, hex3('#d9790f'), hex3('#f7b52a'), 0.5, 0.5, 0.3), 0.3)
    elif kind == 'gypsophila':
        y, x = np.mgrid[0:S, 0:S]
        for _ in range(60):
            px, py = rng.normal(c, S * 0.16, 2)
            r = rng.uniform(S * 0.018, S * 0.032)
            m = np.hypot(x - px, y - py) < r
            sh = 0.85 + 0.15 * (1 - np.hypot(x - px, y - py) / r)
            cv[m] = np.stack([sh * 0.99, sh * 0.98, sh * 0.95, np.ones_like(sh)], -1)[m]
    elif kind == 'fern':
        for k in range(16):
            u = k / 16
            for side in (-1, 1):
                a = -math.pi / 2 + side * (1.1 - u * 0.3)
                bx, by = c, S * (0.95 - u * 0.85)
                cv = over(cv, petal_layer(S, bx, by, a, S * 0.22 * (1 - u * 0.7), S * 0.045, hex3('#3e6a33'), hex3('#6f9a4a'), 0.7, 0.3, 0.3))
    return cv


def flowers():
    kinds = ['jasmine', 'buds', 'frangipani', 'rose_blush', 'rose_white', 'marigold', 'gypsophila', 'fern']
    cell = 512
    atlas = np.zeros((cell * 2, cell * 4, 4), np.float32)
    for i, k in enumerate(kinds):
        r, cidx = divmod(i, 4)
        atlas[r * cell:(r + 1) * cell, cidx * cell:(cidx + 1) * cell] = flower_cell(k, cell, i + 100)
    atlas = downsample(bleed(atlas), 2)
    save(atlas, 'flowers.webp', 90)


def palm_frond():
    W, H = 2048, 512
    cv = np.zeros((H, W, 4), np.float32)
    rng = np.random.default_rng(201)
    n = 46
    for k in range(n):
        u = (k + 0.5) / n
        bx = W * (0.04 + u * 0.92)
        by = H / 2
        ln = H * 0.5 * math.sin(math.pi * min(1, u * 1.05)) ** 0.5 * (1 - u * 0.25)
        for side in (-1, 1):
            a = side * (math.pi / 2 - 0.85) + rng.normal(0, 0.05)
            cv = over(cv, petal_layer_rect(W, H, bx, by, a, ln, H * 0.035, rng))
    # rachis
    y, x = np.mgrid[0:H, 0:W]
    rach = (np.abs(y - H / 2) < H * 0.012 * (1 - x / W * 0.7)) & (x > W * 0.01)
    cv[rach] = [*hex3('#a4a35c'), 1]
    save(downsample(bleed(cv), 2), 'palm_frond.webp', 88)


def petal_layer_rect(W, H, cx, cy, ang, length, width, rng):
    """Leaflet on a W×H canvas (non-square variant of petal_layer)."""
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    x0, x1 = int(max(0, cx - length - 4)), int(min(W, cx + length + 4))
    sub_x, sub_y = x[:, x0:x1], y[:, x0:x1]
    dx, dy = sub_x - cx, sub_y - cy
    u = (dx * math.cos(ang) + dy * math.sin(ang)) / length
    v = (-dx * math.sin(ang) + dy * math.cos(ang)) / length
    prof = np.clip(np.sin(np.pi * np.clip(u, 0, 1) ** 0.6), 0, 1) * width / length
    inside = (u > 0) & (u < 1) & (np.abs(v) < prof)
    edge = np.abs(v) / (prof + 1e-6)
    g = rng.uniform(0.85, 1.08)
    col = mix(hex3('#3f6e2c') * g, hex3('#86a64e') * g, np.clip(u, 0, 1))
    col = col * (1 - 0.25 * edge ** 2 + 0.1 * (edge < 0.15))[..., None]
    tipdry = smoothstep(0.9, 1.0, u) * 0.6
    col = mix(col, hex3('#b2a35a'), tipdry)
    out = np.zeros((H, W, 4), np.float32)
    a = np.where(inside, np.clip((1 - edge) * 4, 0, 1), 0)
    out[:, x0:x1, :3] = col
    out[:, x0:x1, 3] = a
    return out


def banana():
    W, H = 2048, 768
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    u = x / W
    v = (y - H / 2) / (H / 2)
    half = np.clip(np.sin(np.pi * np.clip(u * 1.02, 0, 1)), 0, 1) ** 0.45 * 0.95
    inside = (np.abs(v) < half) & (u > 0.01)
    rng = np.random.default_rng(301)
    veins = 0.5 + 0.5 * np.sin((x * 0.9 + np.abs(y - H / 2) * 1.6) * 0.09)
    col = mix(hex3('#4f8a2f'), hex3('#7fb24a'), np.clip(0.4 + 0.35 * veins - 0.25 * np.abs(v), 0, 1))
    mid = np.abs(v) < 0.025
    col[mid] = hex3('#c9d78f')
    edge_dry = smoothstep(0.88, 1.0, np.abs(v) / (half + 1e-6))
    col = mix(col, hex3('#9a8a48'), edge_dry * 0.6)
    a = inside.astype(np.float32)
    # tears along the veins
    for _ in range(9):
        tx = rng.uniform(0.15, 0.9) * W
        side = rng.choice([-1, 1])
        tear = (np.abs((x - tx) * 0.9 - side * (y - H / 2) * 1.6) < 3) & (side * (y - H / 2) > H * 0.12)
        a[tear] = 0
    rgba = np.concatenate([col, a[..., None]], -1)
    save(downsample(bleed(rgba), 2), 'banana.webp', 88)


def leaf_sprig(name, seed, leaf_len, leaf_w, count, c0, c1, radial=False):
    S = 1024
    cv = np.zeros((S, S, 4), np.float32)
    rng = np.random.default_rng(seed)
    c = S / 2
    for k in range(count):
        if radial:
            a = k / count * 2 * math.pi + rng.normal(0, 0.1)
            bx, by = c, c
            ln = S * leaf_len * rng.uniform(0.85, 1.05)
        else:
            a = rng.uniform(0, 2 * math.pi)
            r = rng.uniform(0, S * 0.25)
            bx, by = c + math.cos(a) * r, c + math.sin(a) * r
            a += rng.normal(0, 0.6)
            ln = S * leaf_len * rng.uniform(0.7, 1.1)
        g = rng.uniform(0.85, 1.1)
        cv = over(cv, petal_layer(S, bx, by, a, ln, S * leaf_w, c0 * g, c1 * g, 0.75, 0.45 if radial else 0.2, 0.35), 0.35)
    save(downsample(bleed(cv), 2), name, 88)


def tuft():
    S = 512
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(401)
    for _ in range(70):
        x0 = S / 2 + rng.normal(0, S * 0.06)
        a = rng.normal(-math.pi / 2, 0.35)
        ln = rng.uniform(0.45, 0.95) * S
        pts = []
        for j in range(12):
            t = j / 11
            bend = t * t * rng.normal(0, 0.25) * ln
            pts.append((x0 + math.cos(a) * ln * t + bend, S - 2 + math.sin(a) * ln * t))
        c = hex3(['#4a6b2a', '#5f8234', '#7c9b45', '#90a957'][rng.integers(0, 4)]) * rng.uniform(0.85, 1.1)
        for j in range(11):
            w = int(max(1, 7 * (1 - j / 11)))
            d.line([pts[j], pts[j + 1]], fill=tuple(int(v * 255) for v in np.clip(c, 0, 1)) + (255,), width=w)
    arr = np.asarray(img, np.float32) / 255
    save(downsample(bleed(arr), 2), 'tuft.webp', 88)


def polmal():
    S = 1024
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(501)
    for k in range(40):
        a = -math.pi / 2 + rng.normal(0, 0.55)
        ln = rng.uniform(0.55, 0.92) * S
        pts = []
        for j in range(30):
            t = j / 29
            droop = t * t * 0.35 * ln * (1 if math.cos(a) > 0 else -1) * abs(math.cos(a))
            pts.append((S / 2 + math.cos(a) * ln * t + droop * 0.6, S - 4 + math.sin(a) * ln * t + t * t * ln * 0.25))
        c = hex3('#e9d79a') * rng.uniform(0.92, 1.05)
        col = tuple(int(v * 255) for v in np.clip(c, 0, 1)) + (255,)
        d.line(pts, fill=col, width=5)
        for j in range(4, 30, 2):
            px, py = pts[j]
            r = 6
            d.ellipse([px - r, py - r, px + r, py + r], fill=tuple(int(v * 255) for v in np.clip(c * 0.95, 0, 1)) + (255,))
    arr = np.asarray(img, np.float32) / 255
    save(downsample(bleed(arr), 2), 'polmal.webp', 88)


def treeline():
    W, H = 4096, 1024
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(601)
    # broadleaf canopies
    for _ in range(260):
        cx = rng.uniform(0, W)
        top = rng.uniform(0.25, 0.6) * H
        for _ in range(14):
            r = rng.uniform(30, 90)
            px, py = cx + rng.normal(0, 70), top + rng.uniform(0, 0.4) * H
            g = rng.uniform(0.75, 1.0)
            col = (int(52 * g), int(82 * g), int(48 * g), 255)
            d.ellipse([px - r, py - r, px + r, py + r], fill=col)
    d.rectangle([0, int(H * 0.7), W, H], fill=(46, 72, 42, 255))
    # palms rising above the canopy
    for _ in range(26):
        x0 = rng.uniform(0, W)
        h = rng.uniform(0.55, 0.85) * H
        top = (x0 + rng.normal(0, 30), H - h)
        d.line([(x0, H), top], fill=(70, 74, 58, 255), width=7)
        for k in range(11):
            a = -math.pi / 2 + (k - 5) * 0.32 + rng.normal(0, 0.08)
            pts = [top]
            for j in range(1, 9):
                t = j / 8
                pts.append((top[0] + math.cos(a) * 150 * t, top[1] + math.sin(a) * 150 * t + 90 * t * t))
            d.line(pts, fill=(48, 78, 44, 255), width=10)
    arr = np.asarray(img, np.float32) / 255
    # atmospheric fade towards the top
    y = np.linspace(0, 1, H)[:, None]
    arr[..., :3] = arr[..., :3] * (0.8 + 0.2 * y[..., None])
    save(downsample(bleed(arr), 2), 'treeline.webp', 85)


def lotus_petal():
    W, H = 256, 512
    S = 512
    p = petal_layer(S, S / 2, S - 4, -math.pi / 2, S * 0.98, S * 0.36, hex3('#fbf2ee'), hex3('#e58fa6'), 0.75, 0.55, 0.25)
    p = p[:, (S - W) // 2:(S + W) // 2] if W < S else p
    save(bleed(p), 'lotus_petal.webp', 90)


if __name__ == '__main__':
    only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
    for fn in [marble, plaster, teak, relief, roof, grass, flagstone, linen, bark, brass, water, flowers, palm_frond, banana,
               tuft, polmal, treeline, lotus_petal]:
        if not only or fn.__name__ in only:
            fn()
    if only and 'sprigs' not in only:
        sys.exit()
    leaf_sprig('leaves.webp', 701, 0.16, 0.06, 70, hex3('#2f5a26'), hex3('#4f7f36'))
    leaf_sprig('araliya.webp', 702, 0.46, 0.11, 9, hex3('#3c6a2c'), hex3('#6a964a'), radial=True)
