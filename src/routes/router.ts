import { createWebHistory, createRouter } from "vue-router";
import Home from "../views/Home.vue";
import ScoreBoard from "../components/ScoreBoard.vue";
import Controls from "../views/Controls.vue";
import PublicBoard from "../views/PublicBoard.vue";
import PublicTournament from "../views/PublicTournament.vue";
import Tournaments from "../views/Tournaments.vue";
import TournamentDetail from "../views/TournamentDetail.vue";
import BasketballScoreBoard from "../components/basketball/BasketballScoreBoard.vue";
import BasketballControls from "../views/BasketballControls.vue";
import BasketballPublicBoard from "../views/BasketballPublicBoard.vue";

const routes = [
  { path: "/", name: "home", component: Home },
  { path: "/tournaments", name: "tournaments", component: Tournaments },
  { path: "/tournaments/:id", name: "tournament-detail", component: TournamentDetail },
  { path: "/torneo/:id", name: "tournament-public", component: PublicTournament },
  { path: "/board", name: "board", component: ScoreBoard },
  { path: "/controls", name: "controls", component: Controls },
  { path: "/live/:matchId", name: "live", component: PublicBoard },
  { path: "/basquet/board", name: "basketball-board", component: BasketballScoreBoard },
  { path: "/basquet/controls", name: "basketball-controls", component: BasketballControls },
  { path: "/basquet/live/:matchId", name: "basketball-live", component: BasketballPublicBoard },
];

const router = createRouter({
  history: createWebHistory("/marker-board/"),
  routes,
});

export default router;
