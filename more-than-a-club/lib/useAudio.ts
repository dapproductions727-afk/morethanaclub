"use client";
import { useEffect, useRef, useState } from "react";

// Six-note A-minor phrase. Each entry: [frequency_hz, gate (fraction of beat
// that sounds)]. Ascending then resolving back down through G3 gives it the
// slightly melancholy, wistful quality that suits the century arc.
const PHRASE: [number, number][] = [
  [220.00, 0.70],  // A3
  [261.63, 0.70],  // C4
  [329.63, 0.80],  // E4  ← peak
  [261.63, 0.70],  // C4
  [220.00, 0.70],  // A3
  [196.00, 0.90],  // G3  ← dips below root
];
const BEAT = 0.55;   // seconds per note
const LOOKAHEAD = 8; // full phrase repetitions to schedule ahead

function schedulePhrase(
  ac: AudioContext,
  dest: AudioNode,
  startTime: number,
  reps: number
) {
  for (let rep = 0; rep < reps; rep++) {
    PHRASE.forEach(([freq, gate], i) => {
      const t = startTime + (rep * PHRASE.length + i) * BEAT;
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.025);           // attack
      g.gain.setValueAtTime(0.14, t + BEAT * gate - 0.06);
      g.gain.linearRampToValueAtTime(0, t + BEAT * gate);        // release
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + BEAT * gate + 0.05);
    });
  }
}

export function useAudio() {
  const ctxRef    = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextRef   = useRef(0);
  const onRef     = useRef(false);
  const [on, setOn] = useState(false);

  function boot(ac: AudioContext) {
    const master = ac.createGain();
    master.gain.value = 0;
    master.connect(ac.destination);
    masterRef.current = master;

    // Quiet bass pad (A1 + E2 sine) to give the melody something to sit on.
    const filt = ac.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 500;
    filt.connect(master);
    ([55, 82.41] as number[]).forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ac.createGain();
      g.gain.value = i === 0 ? 0.22 : 0.12;
      o.connect(g);
      g.connect(filt);
      o.start();
    });

    // Short echo on the melody for depth (no feedback — just one repeat).
    const echo = ac.createDelay(0.5);
    echo.delayTime.value = BEAT * 2;
    const echoGain = ac.createGain();
    echoGain.gain.value = 0.18;
    echo.connect(echoGain);
    echoGain.connect(master);

    // Melody output feeds both dry and the echo.
    const melOut = ac.createGain();
    melOut.gain.value = 1;
    melOut.connect(master);
    melOut.connect(echo);

    nextRef.current = ac.currentTime + 0.1;

    function tick() {
      if (!ctxRef.current) return;
      schedulePhrase(ctxRef.current, melOut, nextRef.current, LOOKAHEAD);
      const window = PHRASE.length * BEAT * LOOKAHEAD;
      nextRef.current += window;
      // Re-schedule ~1 s before we run out.
      timerRef.current = setTimeout(tick, (window - 1.0) * 1000);
    }
    tick();
  }

  function toggle() {
    if (!ctxRef.current) {
      const ac = new AudioContext();
      ctxRef.current = ac;
      boot(ac);
    }
    const ac = ctxRef.current!;
    const m  = masterRef.current!;
    onRef.current = !onRef.current;
    setOn(onRef.current);
    m.gain.setTargetAtTime(onRef.current ? 0.55 : 0, ac.currentTime, 0.4);
  }

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    ctxRef.current?.close();
  }, []);

  return { on, toggle };
}
