"""Generate an original, seamless, quiet music-box loop (no third-party recording).
Run with Python 3: python scripts/generate-audio.py
"""
import math
import pathlib
import struct
import wave

RATE = 22050
DURATION = 32
samples = [0.0] * (RATE * DURATION)
# An original pentatonic phrase over a softly arpeggiated accompaniment.
melody = [76, 79, 81, 79, 74, 72, 74, 76, 79, 83, 81, 79, 76, 74, 72, 74]
chords = [(48, 55, 60, 64), (45, 52, 57, 60), (53, 60, 65, 69), (55, 62, 67, 71)]

def note(midi, start, amplitude, length=3.8):
    frequency = 440 * 2 ** ((midi - 69) / 12)
    for n in range(int(length * RATE)):
        t = n / RATE
        envelope = min(1, t / 0.022) * math.exp(-t * 1.4) * min(1, (length - t) / 0.25)
        tone = math.sin(2 * math.pi * frequency * t) + 0.18 * math.sin(4 * math.pi * frequency * t) * math.exp(-t * 2)
        samples[(int(start * RATE) + n) % len(samples)] += tone * envelope * amplitude

for i, pitch in enumerate(melody):
    note(pitch, i * 2, 0.15)
for i in range(32):
    note(chords[(i // 8) % 4][i % 4], i, 0.055, 4.5)

destination = pathlib.Path(__file__).resolve().parents[1] / 'public' / 'audio' / 'garden-melody.wav'
destination.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(destination), 'wb') as output:
    output.setnchannels(1)
    output.setsampwidth(2)
    output.setframerate(RATE)
    output.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, sample)) * 32767)) for sample in samples))
print(f'Wrote original melody: {destination}')
