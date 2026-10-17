"""Generates the music bed for the promo videos: Am7 / Fmaj7 / Cadd9 / G6, soft pad,
plucked arpeggio, light drums, and a swell + low hit into the scenes that need a lift.
With --cues it also synthesises the sound effects a page asks for (whooshes, blips,
stamps, impacts) at the exact times the visuals hit them. Numpy only, so it runs
anywhere and the track is ours to use in ads.

    python3 music.py --seconds 60 --kick-from 2 --swells 5,21 --drums-to 24 --out ../out/music-60.wav
    python3 music.py --seconds 30 --kick-from 2 --swells 4,11 --drums-to 12 --out ../out/music-30.wav
    python3 music.py --bpm 120 --seconds 48 --chord-offset 1 --kick-from 2 --mute 13,14,21 --drums-to 22 \
        --cues ../out/motion-cues.json --out ../out/motion.wav

Bar numbers count from 0; one bar is four beats (2.4s at 100 BPM, 2s at 120).
"""
import argparse
import json
import wave

import numpy as np

SR = 48000
BPM = 100
BEAT = 60 / BPM
BAR = 4 * BEAT

# (bass, pad voicing) in MIDI notes, two bars each
CHORDS = [
    (45, [57, 60, 64, 67]),  # Am7
    (41, [53, 57, 60, 64]),  # Fmaj7
    (48, [55, 60, 62, 64]),  # Cadd9
    (43, [55, 59, 62, 64]),  # G6
]

rng = np.random.default_rng(11)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na) ** 2
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e


def saw(f, t, harmonics=12, tilt=1.2):
    out = np.zeros_like(t)
    for k in range(1, harmonics + 1):
        out += np.sin(2 * np.pi * f * k * t + k * 0.7) / k ** tilt
    return out


def spectral(x, lo=None, hi=None):
    """Static band-limit in the frequency domain with soft shoulders."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / (1 + (f / hi) ** 4)
    if lo:
        g *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X * g, len(x))


def reverb(x, seconds=2.2, wet=0.28):
    n = int(seconds * SR)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir = spectral(ir, lo=200, hi=6000)
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return x * (1 - wet) + y * wet * 1.6


def noise(seconds):
    return rng.standard_normal(int(seconds * SR))


def decay(n, rate):
    return np.exp(-np.arange(n) / SR * rate)


def fit(sig, n):
    """Pad with silence or trim, so short layers can be summed with a longer one."""
    return np.pad(sig, (0, max(0, n - len(sig))))[:n]


def chirp(f0, f1, seconds, curve="exp"):
    """Sine whose pitch glides from f0 to f1."""
    x = np.linspace(0, 1, int(seconds * SR))
    f = f0 * (f1 / f0) ** x if curve == "exp" else f0 + (f1 - f0) * x
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


# ---- Sound effects, one function per cue type. Each returns a mono signal. ----

def sfx_whoosh(dur=0.6, rev=False, **_):
    n = int(dur * SR)
    x = np.linspace(0, 1, n)
    nz = noise(dur)
    body = spectral(nz, lo=250, hi=1800) * (1 - x) + spectral(nz, lo=1800, hi=9000) * x * 0.8
    env = np.where(x < 0.65, (x / 0.65) ** 2, ((1 - x) / 0.35) ** 1.5)
    sig = body * env * 0.55
    return sig[::-1] if rev else sig


def sfx_impact(**_):
    sub = chirp(95, 32, 1.8) * decay(int(1.8 * SR), 2.2)
    thump = fit(spectral(noise(0.3), hi=900) * decay(int(0.3 * SR), 14), len(sub))
    click = fit(spectral(noise(0.012), lo=2500), len(sub))
    return sub * 0.9 + thump * 0.3 + click * 0.15


def sfx_hit(**_):
    body = chirp(120, 45, 0.45) * decay(int(0.45 * SR), 7)
    snap = fit(spectral(noise(0.12), hi=2500) * decay(int(0.12 * SR), 28), len(body))
    return body * 0.75 + snap * 0.35


def sfx_pop(**_):
    return chirp(520, 1150, 0.09) * decay(int(0.09 * SR), 45) * 0.32


def sfx_tick(**_):
    t = np.arange(int(0.03 * SR)) / SR
    return np.sin(2 * np.pi * 2600 * t) * decay(len(t), 170) * 0.22


def sfx_blip(**_):
    t = np.arange(int(0.6 * SR)) / SR
    ping = (np.sin(2 * np.pi * 1320 * t) + 0.45 * np.sin(2 * np.pi * 1980 * t)) * decay(len(t), 13)
    echo = np.zeros_like(ping)
    d = int(0.12 * SR)
    echo[d:] = ping[:-d] * 0.35
    return (ping + echo) * 0.24


def sfx_lockon(**_):
    t = np.arange(int(0.12 * SR)) / SR
    a = np.sin(2 * np.pi * 1760 * t) * decay(len(t), 40)
    b = np.sin(2 * np.pi * 2640 * t) * decay(len(t), 40)
    out = np.zeros(int(0.25 * SR))
    out[: len(a)] += a
    out[int(0.07 * SR): int(0.07 * SR) + len(b)] += b
    return out * 0.24


def sfx_clack(**_):
    out = np.zeros(int(0.2 * SR))
    for at, g in ((0, 1.0), (0.06, 0.55)):
        n = int(0.04 * SR)
        click = spectral(noise(0.04), lo=1200, hi=6000) * decay(n, 110) + np.sin(2 * np.pi * 260 * np.arange(n) / SR) * decay(n, 60)
        i = int(at * SR)
        out[i: i + n] += click * g
    return out * 0.5


def sfx_chime(**_):
    t = np.arange(int(1.6 * SR)) / SR
    tone = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((880, .5), (1322, .35), (1760, .2), (2637, .1)))
    return tone * decay(len(t), 3) * env_adsr(len(t), 0.004, 0.2) * 0.2


def sfx_shield(**_):
    glide = chirp(300, 900, 0.7) * np.sin(np.linspace(0, np.pi, int(0.7 * SR))) ** 2
    swell = spectral(noise(0.7), lo=2000, hi=8000) * np.linspace(0, 1, int(0.7 * SR)) ** 2
    return (glide * 0.2 + swell * 0.12)


def sfx_stamp(**_):
    thud = chirp(130, 55, 0.35) * decay(int(0.35 * SR), 12)
    body = fit(spectral(noise(0.15), hi=1500) * decay(int(0.15 * SR), 40), len(thud))
    slap = fit(spectral(noise(0.03), lo=2500) * decay(int(0.03 * SR), 90), len(thud))
    return thud * 0.7 + body * 0.35 + slap * 0.25


def sfx_zap(**_):
    n = int(0.35 * SR)
    zap = chirp(2200, 240, 0.35) * decay(n, 8)
    crackle = spectral(noise(0.35), lo=3000) * decay(n, 20)
    t = np.arange(int(0.8 * SR)) / SR
    ding = (np.sin(2 * np.pi * 1047 * t) + 0.6 * np.sin(2 * np.pi * 1568 * t)) * decay(len(t), 5)
    out = np.zeros(int(0.85 * SR))
    out[:n] += zap * 0.6 + crackle * 0.25
    out[int(0.05 * SR): int(0.05 * SR) + len(ding)] += ding * 0.22
    return out * 0.6


def sfx_riser(dur=2.0, **_):
    x = np.linspace(0, 1, int(dur * SR))
    return spectral(noise(dur), lo=800, hi=10000) * x ** 2.5 * 0.3 + chirp(220, 880, dur) * x ** 2 * 0.08


def sfx_sparkle(dur=0.9, **_):
    out = np.zeros(int((dur + 0.1) * SR))
    for k in range(11):
        f = 1500 + rng.random() * 2000
        t = np.arange(int(0.08 * SR)) / SR
        i = int(k / 11 * dur * SR)
        out[i: i + len(t)] += np.sin(2 * np.pi * f * t) * decay(len(t), 60) * 0.11
    return out


def sfx_roll(dur=1.0, **_):
    # Ticks follow the count-up's ease-out: dense at first, then slowing to a stop
    out = np.zeros(int((dur + 0.1) * SR))
    tick = sfx_tick()
    for p in np.linspace(0, 1, 16):
        i = int((1 - (1 - p) ** 0.25) * dur * SR)
        out[i: i + len(tick)] += tick * 0.8
    return out


SFX = {k[4:]: v for k, v in globals().items() if k.startswith("sfx_")}


def place(buf, start, sig):
    i = int(start * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seconds", type=float, required=True)
    ap.add_argument("--kick-from", type=int, default=2)
    ap.add_argument("--swells", default="")
    ap.add_argument("--drums-to", type=int, default=999)
    ap.add_argument("--out", required=True)
    ap.add_argument("--bpm", type=float, default=100)
    ap.add_argument("--chord-offset", type=int, default=0, help="start the progression on a later chord")
    ap.add_argument("--mute", default="", help="bars with no kick or clap, e.g. a breakdown")
    ap.add_argument("--cues", help="JSON from render.js --cues-out")
    a = ap.parse_args()

    global BPM, BEAT, BAR
    BPM = a.bpm
    BEAT = 60 / BPM
    BAR = 4 * BEAT
    mute = {int(b) for b in a.mute.split(",") if b}
    chord_at = lambda bar: CHORDS[(bar // 2 + a.chord_offset) % len(CHORDS)]

    n = int(a.seconds * SR)
    bars = int(np.ceil(a.seconds / BAR))
    swells = [int(s) for s in a.swells.split(",") if s]

    pad = np.zeros(n)
    bass = np.zeros(n)
    pluck = np.zeros(n)
    drums = np.zeros(n)
    fx = np.zeros(n)
    side = np.ones(n)

    # Pad and bass: one chord per two bars, overlapping releases
    for c in range(0, bars, 2):
        root, notes = chord_at(c)
        start, length = c * BAR, 2 * BAR + 0.9
        t = np.arange(int(length * SR)) / SR
        e = env_adsr(len(t), 0.35, 0.9)
        chord = np.zeros_like(t)
        for m in notes:
            for cents in (-7, 0, 7):
                chord += saw(hz(m) * 2 ** (cents / 1200), t) / 3
        chord *= 1 + 0.08 * np.sin(2 * np.pi * 0.25 * t)
        place(pad, start, chord * e * 0.11)
        # Bass pulses on eighth notes, sub sine plus a little second harmonic
        for k in range(16):
            tb = np.arange(int(BEAT / 2 * SR)) / SR
            f = hz(root)
            note = (np.sin(2 * np.pi * f * tb) + 0.25 * np.sin(4 * np.pi * f * tb)) * np.exp(-tb * 5)
            note *= env_adsr(len(tb), 0.005, 0.03)
            place(bass, start + k * BEAT / 2, note * (0.26 if k % 2 == 0 else 0.17))

    # Plucked arpeggio, sixteenths, chord tones an octave up
    pattern = [0, 2, 1, 3, 2, 1, 3, 2]
    for s in range(int(a.seconds / (BEAT / 2)) + 1):
        start = s * BEAT / 2
        bar = int(start / BAR)
        _, notes = chord_at(bar)
        m = notes[pattern[s % len(pattern)]] + 12
        tp = np.arange(int(0.6 * SR)) / SR
        f = hz(m)
        note = (np.sin(2 * np.pi * f * tp) + 0.3 * np.sin(4 * np.pi * f * tp) + 0.1 * np.sin(6 * np.pi * f * tp)) * np.exp(-tp * 9)
        note *= env_adsr(len(tp), 0.004, 0.05)
        place(pluck, start, note * (0.21 if s % 2 == 0 else 0.15))
    # Dotted-eighth delay on the pluck
    d = int(BEAT * 0.75 * SR)
    echo = np.zeros(n)
    echo[d:] += pluck[:-d] * 0.35
    echo[2 * d:] += pluck[:-2 * d] * 0.15
    pluck = pluck + spectral(echo, hi=3500)

    # Drums
    tk = np.arange(int(0.45 * SR)) / SR
    kick = np.sin(2 * np.pi * (45 * tk + (110 / 18) * (1 - np.exp(-tk * 18)))) * np.exp(-tk * 7)
    kick += 0.3 * np.sin(2 * np.pi * 70 * tk) * np.exp(-tk * 30)
    hat_noise = spectral(rng.standard_normal(int(0.06 * SR)), lo=7000)
    hat = hat_noise * np.exp(-np.arange(len(hat_noise)) / SR * 70)
    clap_noise = spectral(rng.standard_normal(int(0.25 * SR)), lo=900, hi=4500)
    clap = clap_noise * np.exp(-np.arange(len(clap_noise)) / SR * 18)
    duck = 1 - 0.55 * np.exp(-np.arange(int(BEAT * SR)) / SR * 9)
    for b in range(bars * 4):
        start = b * BEAT
        bar = b // 4
        if bar >= a.drums_to:
            break
        if bar >= a.kick_from and bar not in mute:
            place(drums, start, kick * 0.5)
            i = int(start * SR)
            j = min(n, i + len(duck))
            if i < n:
                side[i:j] = np.minimum(side[i:j], duck[: j - i])
            if b % 4 in (1, 3):
                place(drums, start, clap * 0.16)
        place(drums, start + BEAT / 2, hat * (0.13 if bar >= a.kick_from else 0.08))

    # Swell into each listed bar, then a low hit on the downbeat
    for sb in swells:
        end = sb * BAR
        length = BAR
        ts = np.arange(int(length * SR)) / SR
        noise = spectral(rng.standard_normal(len(ts)), lo=1500, hi=9000)
        rise = (ts / length) ** 3
        place(fx, end - length, noise * rise * 0.22)
        th = np.arange(int(1.6 * SR)) / SR
        hit = np.sin(2 * np.pi * (38 * th + 30 * (1 - np.exp(-th * 6)) / 6)) * np.exp(-th * 2.6)
        place(fx, end, hit * 0.55)

    # Sound effects from the page's cue list, panned, with the music ducking under the big hits
    sfxL, sfxR = np.zeros(n), np.zeros(n)
    if a.cues:
        with open(a.cues) as f:
            cues = json.load(f)["cues"]
        for c in cues:
            sig = SFX[c["type"]](**{k: v for k, v in c.items() if k in ("dur", "rev")})
            pan = c.get("pan", 0)
            gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            place(sfxL, c["t"], sig * gl * 1.41)
            place(sfxR, c["t"], sig * gr * 1.41)
            if c["type"] in ("impact", "stamp", "hit"):
                i = int(c["t"] * SR)
                k = np.arange(min(n - i, int(1.2 * SR)))
                if len(k):
                    side[i: i + len(k)] *= 1 - 0.45 * np.exp(-k / SR * 4)
        print(f"{len(cues)} sound cues")

    music = (pad + bass + pluck) * side + drums * np.sqrt(side)
    music = reverb(music, wet=0.22) + reverb(fx, wet=0.35)
    music = spectral(music, lo=38)  # nothing useful lives below this on a phone or laptop

    # Stereo: pluck echo and pad slightly wider than the drums
    width = 0.12 * reverb(pad + pluck, seconds=1.1, wet=1.0)
    L, R = music + width, music - width
    if a.cues:
        L = L + spectral(reverb(sfxL, seconds=1.4, wet=0.2), lo=30)
        R = R + spectral(reverb(sfxR, seconds=1.4, wet=0.2), lo=30)
    stereo = np.stack([L, R], axis=1)

    fade_in = int(0.4 * SR)
    stereo[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    fade_out = int(1.6 * SR)
    stereo[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None] ** 1.6

    stereo = np.tanh(stereo * 1.2) / np.tanh(1.2)
    stereo /= np.max(np.abs(stereo)) / 0.89
    pcm = (stereo * 32767).astype(np.int16)
    with wave.open(a.out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(a.out, f"{a.seconds}s")


if __name__ == "__main__":
    main()
