import { ref } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { useAuthStore } from "../stores/auth";
import { createFreshMatchState, useScoreboardStore } from "../stores/scoreboard";
import { createFreshBasketballState, useBasketballScoreboardStore } from "../stores/basketballScoreboard";
import { registerMatchRecord } from "../services/liveMatchesService";
import { clearActiveTournamentSession, createMatchId, setActiveMatchId } from "../utils/activeMatch";
import {
  openBasketballOperatorSession,
  openHockeyOperatorSession,
} from "../utils/operatorWindows";
import { getSportById, type SportId } from "../types/sport";

export function useCreateStandaloneMatch() {
  const router = useRouter();
  const auth = useAuthStore();
  const scoreboardStore = useScoreboardStore();
  const basketballStore = useBasketballScoreboardStore();
  const creating = ref(false);

  async function createStandaloneMatch(sportId: SportId, onNeedAuth?: () => void) {
    if (!auth.isOrganizer) {
      onNeedAuth?.();
      message.info("Inicia sesión como organizador para crear partidos.");
      return;
    }

    const sport = getSportById(sportId);
    if (!sport?.available) {
      message.warning("Este deporte aún no tiene marcador disponible.");
      return;
    }

    creating.value = true;
    const matchId = createMatchId();
    clearActiveTournamentSession();

    try {
      if (sportId === "basquet") {
        const state = createFreshBasketballState({
          localTeam: "Equipo Local",
          visitTeam: "Equipo Visita",
          timeGame: "10:00",
        });

        setActiveMatchId(matchId);
        basketballStore.setState(state);
        openBasketballOperatorSession(router, matchId);

        void registerMatchRecord({
          matchId,
          state,
          organizerId: auth.userId ?? undefined,
          title: `${state.localTeam} vs ${state.visitTeam}`,
          tournamentId: null,
        }).catch((error) => {
          message.error(
            error instanceof Error ? error.message : "No se pudo registrar el partido"
          );
        });
        message.success(`Partido de ${sport.name} creado`);
        return;
      }

      const state = createFreshMatchState({
        localTeam: "Equipo Local",
        visitTeam: "Equipo Visita",
        timeGame: "20:00",
      });

      setActiveMatchId(matchId);
      scoreboardStore.setState(state);
      openHockeyOperatorSession(router, matchId);

      void registerMatchRecord({
        matchId,
        state,
        organizerId: auth.userId ?? undefined,
        title: `${state.localTeam} vs ${state.visitTeam}`,
        tournamentId: null,
      }).catch((error) => {
        message.error(
          error instanceof Error ? error.message : "No se pudo registrar el partido"
        );
      });
      message.success(`Partido de ${sport.name} creado`);
    } finally {
      creating.value = false;
    }
  }

  return { creating, createStandaloneMatch };
}
