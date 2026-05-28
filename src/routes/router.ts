import { createWebHistory, createRouter } from 'vue-router'

import ScoreBoard from '../components/ScoreBoard.vue'
import Controls from '../views/Controls.vue'
import PublicBoard from '../views/PublicBoard.vue'

const routes = [
  { path: '/', component: ScoreBoard },
  { path: '/controls', component: Controls },
  { path: '/live/:matchId', component: PublicBoard },
]

 const router = createRouter({
  history: createWebHistory('/marker-board/'),
  routes,
})

 export default router