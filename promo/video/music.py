"""Generates the music bed for the promo videos: 100 BPM, Am7 / Fmaj7 / Cadd9 / G6,
soft pad, plucked arpeggio, light drums, and a swell + low hit into the scenes that
need a lift. Numpy only, so it runs anywhere and the track is ours to use in ads.

    python3 music.py --seconds 60 --kick-from 2 --swells 5,21 --drums-to 24 --out ../out/music-60.wav
    python3 music.py --seconds 30 --kick-from 2 --swells 4,11 --drums-to 12 --out ../out/music-30.wav

Bar numbers count from 0; one bar is 2.4s.
"""
import argparse
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
    a = ap.parse_args()

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
        root, notes = CHORDS[(c // 2) % len(CHORDS)]
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
        _, notes = CHORDS[(bar // 2) % len(CHORDS)]
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
        if bar >= a.kick_from:
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

    music = (pad + bass + pluck) * side + drums
    music = reverb(music, wet=0.22) + reverb(fx, wet=0.35)
    music = spectral(music, lo=38)  # nothing useful lives below this on a phone or laptop

    # Stereo: pluck echo and pad slightly wider than the drums
    width = 0.12 * reverb(pad + pluck, seconds=1.1, wet=1.0)
    L, R = music + width, music - width
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
