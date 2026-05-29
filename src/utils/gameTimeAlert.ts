export const GAME_TIME_ENDED_EVENT = "game-time-ended";

let lastAlertMs = 0;
let lastCountdownBeepMs = 0;
const ALERT_COOLDOWN_MS = 8000;
const COUNTDOWN_BEEP_COOLDOWN_MS = 800;

export function resetGameTimeAlertCooldown(): void {
  lastAlertMs = 0;
  lastCountdownBeepMs = 0;
}

const COUNTDOWN_WINDOW_MS = 5000;

function playTone(frequency: number, duration: number, volume = 0.12): void {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
  window.setTimeout(() => void ctx.close(), duration * 1000 + 80);
}

/** Pitido corto (5, 4, 3, 2, 1 segundos restantes) */
export function playCountdownTick(): void {
  const now = Date.now();
  if (now - lastCountdownBeepMs < COUNTDOWN_BEEP_COOLDOWN_MS) return;
  lastCountdownBeepMs = now;

  try {
    playTone(1200, 0.08, 0.1);
  } catch {
    // Navegador puede bloquear audio sin interacción previa
  }
}

export function playGameTimeEndSound(): void {
  try {
    const ctx = new AudioContext();
    const tone = (frequency: number, start: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.12;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime + start);
      oscillator.stop(ctx.currentTime + start + duration);
    };
    tone(880, 0, 0.12);
    tone(660, 0.18, 0.2);
    tone(880, 0.42, 0.15);
    window.setTimeout(() => void ctx.close(), 800);
  } catch {
    // Navegador puede bloquear audio sin interacción previa
  }
}

/** Pitidos en los últimos 5 s y aviso final al llegar a 00:00 */
export function handleGameTimeTick(
  previousMs: number,
  nextMs: number,
  isPaused: boolean
): void {
  if (isPaused) return;

  if (nextMs > 0 && nextMs <= COUNTDOWN_WINDOW_MS && previousMs > nextMs) {
    playCountdownTick();
  }

  if (previousMs > 0 && nextMs <= 0) {
    notifyGameTimeEnded();
  }
}

/** Aviso sonoro y visual (evento global) al llegar el tiempo de juego a 00:00 */
export function notifyGameTimeEnded(): void {
  const now = Date.now();
  if (now - lastAlertMs < ALERT_COOLDOWN_MS) return;
  lastAlertMs = now;

  playGameTimeEndSound();
  window.dispatchEvent(new CustomEvent(GAME_TIME_ENDED_EVENT));
}
