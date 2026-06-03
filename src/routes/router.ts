import { createWebHistory, createRouter } from "vue-router";
import Home from "../views/Home.vue";
import ScoreBoard from "../components/ScoreBoard.vue";
import Controls from "../views/Controls.vue";
import PublicBoard from "../views/PublicBoard.vue";
import PublicTournament from "../views/PublicTournament.vue";
import Tournaments from "../views/Tournaments.vue";
import PublicTournaments from "../views/PublicTournaments.vue";
import TournamentDetail from "../views/TournamentDetail.vue";
import BasketballScoreBoard from "../components/basketball/BasketballScoreBoard.vue";
import BasketballControls from "../views/BasketballControls.vue";
import BasketballPublicBoard from "../views/BasketballPublicBoard.vue";
import Overlay from "../views/Overlay.vue";
import TournamentCourtLive from "../views/TournamentCourtLive.vue";
import TournamentCourtOverlay from "../views/TournamentCourtOverlay.vue";
import Profile from "../views/Profile.vue";

const routes = [
  { path: "/", name: "home", component: Home },
  { path: "/profile", name: "profile", component: Profile },
  { path: "/tournaments", name: "tournaments", component: Tournaments },
  { path: "/torneos-publicos", name: "public-tournaments", component: PublicTournaments },
  { path: "/tournaments/:id", name: "tournament-detail", component: TournamentDetail },
  { path: "/torneo/:id", name: "tournament-public", component: PublicTournament },
  { path: "/board", name: "board", component: ScoreBoard },
  { path: "/controls", name: "controls", component: Controls },
  {
    path: "/live/torneo/:tournamentId/:court",
    name: "tournament-live",
    component: TournamentCourtLive,
  },
  { path: "/live/:matchId", name: "live", component: PublicBoard },
  {
    path: "/overlay/torneo/:tournamentId/:court",
    name: "tournament-overlay",
    component: TournamentCourtOverlay,
  },
  { path: "/overlay/:matchId", name: "overlay", component: Overlay },
  { path: "/basquet/board", name: "basketball-board", component: BasketballScoreBoard },
  { path: "/basquet/controls", name: "basketball-controls", component: BasketballControls },
  { path: "/basquet/live/:matchId", name: "basketball-live", component: BasketballPublicBoard },
];

const router = createRouter({
  history: createWebHistory("/marker-board/"),
  routes,
});

export default router;
