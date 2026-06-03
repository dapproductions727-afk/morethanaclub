"use client";
import { useEffect, useRef, useState } from "react";

// Ambient drone: root (A1) + fifth (E2) + octave (A2) + upper fifth (E3).
// Sawtooth bass through a low-pass filter with a slow LFO sweep gives it
// the organic, slightly mournful quality that suits the century arc.
const FREQS = [55, 82.41, 110, 164.81];

export function useAudio() {
  const ctxRef  = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const [on, setOn] = useState(false);

  function boot() {
    if (ctxRef.current) return;
    const ac = new AudioContext();
    ctxRef.current = ac;

    const master = ac.createGain();
    master.gain.value = 0;
    master.connect(ac.destination);
    gainRef.current = master;

    // Low-pass filter — keeps the drone warm, not harsh.
    const filt = ac.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 800;
    filt.Q.value = 0.6;
    filt.connect(master);

    // Slow LFO sweeps the filter cutoff for a breathing quality.
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.18;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(filt.frequency);
    lfo.start();

    // Oscillators: sawtooth bass, sine harmonics.
    FREQS.forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = i === 0 ? "sawtooth" : "sine";
      osc.frequency.value = freq;
      const g = ac.createGain();
      g.gain.value = i === 0 ? 0.28 : Math.max(0.08, 0.22 - i * 0.04);
      osc.connect(g);
      g.connect(filt);
      osc.start();
    });
  }

  function toggle() {
    boot();
    const ac = ctxRef.current!;
    const g  = gainRef.current!;
    setOn((prev) => {
      const next = !prev;
      // Fade in/out over 1.2 s to avoid clicks.
      g.gain.setTargetAtTime(next ? 0.07 : 0, ac.currentTime, 0.4);
      return next;
    });
  }

  useEffect(() => () => { ctxRef.current?.close(); }, []);

  return { on, toggle };
}
