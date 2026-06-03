/** Aviso entre pestañas para refrescar Inicio / torneos públicos (con límite de frecuencia). */
export const LIVE_MATCHES_BUMP_KEY = "marker-board-live-bump";
const CHANNEL_NAME = "marker-board-live-matches";

const MIN_NOTIFY_GAP_MS = 4_000;
let lastNotifyAt = 0;
let notifyTimer: number | null = null;

function emitBump() {
  lastNotifyAt = Date.now();
  try {
    localStorage.setItem(LIVE_MATCHES_BUMP_KEY, String(lastNotifyAt));
  } catch {
    /* ignore */
  }
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage("bump");
    channel.close();
  } catch {
    /* BroadcastChannel no disponible */
  }
}

/** Aviso limitado: no más de uno cada ~4s (evita tormenta al publicar desde Controles). */
export function notifyLiveMatchesBump(force = false): void {
  const now = Date.now();
  const elapsed = now - lastNotifyAt;

  if (notifyTimer !== null) {
    window.clearTimeout(notifyTimer);
    notifyTimer = null;
  }

  if (force || elapsed >= MIN_NOTIFY_GAP_MS) {
    emitBump();
    return;
  }

  notifyTimer = window.setTimeout(() => {
    notifyTimer = null;
    emitBump();
  }, MIN_NOTIFY_GAP_MS - elapsed);
}

export function onLiveMatchesBump(handler: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === LIVE_MATCHES_BUMP_KEY) handler();
  };

  let channel: BroadcastChannel | null = null;
  const onMessage = () => handler();

  window.addEventListener("storage", onStorage);

  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", onMessage);
  }

  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.removeEventListener("message", onMessage);
    channel?.close();
  };
}
