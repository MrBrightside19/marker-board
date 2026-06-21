import { onUnmounted } from "vue";
import { applyUserPreferencesToDocument } from "../services/userPreferencesStorage";

export type BroadcastPageMode = "live" | "overlay" | "scoreboard";

const CLASS_BY_MODE: Record<BroadcastPageMode, string> = {
  live: "broadcast-live-page",
  overlay: "broadcast-overlay-page",
  scoreboard: "broadcast-scoreboard-page",
};

/** Aísla TV / live / overlay del tema general de la app (claro/oscuro de Ant Design). */
export function useBroadcastPage(mode: BroadcastPageMode = "live") {
  const className = CLASS_BY_MODE[mode];

  if (typeof document !== "undefined") {
    document.documentElement.classList.add(className);
  }

  onUnmounted(() => {
    document.documentElement.classList.remove(className);
    applyUserPreferencesToDocument();
  });
}
