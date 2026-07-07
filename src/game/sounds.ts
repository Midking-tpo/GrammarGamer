let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, volume = 0.15) {
  const ac = audioContext();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ac.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration);
}

export function playCorrect() {
  tone(660, 0, 0.12);
  tone(880, 0.1, 0.2);
}

export function playWrong() {
  tone(220, 0, 0.25, 0.12);
  tone(180, 0.08, 0.3, 0.12);
}

export function playClear() {
  tone(523, 0, 0.15);
  tone(659, 0.12, 0.15);
  tone(784, 0.24, 0.15);
  tone(1047, 0.36, 0.4);
}

export function playLose() {
  tone(330, 0, 0.3, 0.12);
  tone(262, 0.25, 0.3, 0.12);
  tone(196, 0.5, 0.5, 0.12);
}
