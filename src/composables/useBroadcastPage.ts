import { onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { syncBroadcastDocumentClass } from "../utils/broadcastRoutes";

const SCOREBOARD_CLASS = "broadcast-scoreboard-page";

/** Refuerza el aislamiento del marcador TV (/board). */
export function useBroadcastPage() {
  const route = useRoute();

  if (typeof document !== "undefined") {
    document.documentElement.classList.add(SCOREBOARD_CLASS);
  }

  onUnmounted(() => {
    syncBroadcastDocumentClass(route.name?.toString() ?? null);
  });
}
