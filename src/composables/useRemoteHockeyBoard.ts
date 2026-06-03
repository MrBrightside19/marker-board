import { computed } from "vue";
import { useRoute } from "vue-router";
import { getStoredActiveMatchId } from "../utils/activeMatch";
import { useRemoteHockeyBoardCore } from "./useRemoteHockeyBoardCore";

/** Sync remota del marcador hockey por matchId en la ruta (/live/:matchId, /overlay/:matchId). */
export function useRemoteHockeyBoard(options?: { documentTitle?: string }) {
  const route = useRoute();

  const matchId = computed(() => {
    const param = route.params.matchId;
    const fromRoute = (Array.isArray(param) ? param[0] : param)?.toString().trim() || "";
    if (fromRoute) return decodeURIComponent(fromRoute);
    const stored = getStoredActiveMatchId();
    return stored ? decodeURIComponent(stored) : "";
  });

  return useRemoteHockeyBoardCore(matchId, options);
}
