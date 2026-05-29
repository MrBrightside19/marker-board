import { createWebHistory, createRouter } from "vue-router";
import Home from "../views/Home.vue";
import ScoreBoard from "../components/ScoreBoard.vue";
import Controls from "../views/Controls.vue";
import PublicBoard from "../views/PublicBoard.vue";
import Tournaments from "../views/Tournaments.vue";
import TournamentDetail from "../views/TournamentDetail.vue";

const routes = [
  { path: "/", name: "home", component: Home },
  { path: "/tournaments", name: "tournaments", component: Tournaments },
  { path: "/tournaments/:id", name: "tournament-detail", component: TournamentDetail },
  { path: "/board", name: "board", component: ScoreBoard },
  { path: "/controls", name: "controls", component: Controls },
  { path: "/live/:matchId", name: "live", component: PublicBoard },
];

const router = createRouter({
  history: createWebHistory("/marker-board/"),
  routes,
});

export default router;
