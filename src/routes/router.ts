import { createWebHistory, createRouter } from 'vue-router'

import ScoreBoard from '../components/ScoreBoard.vue'
import Controls from '../views/Controls.vue'

const routes = [
  { path: '/', component: ScoreBoard },
  { path: '/controls', component: Controls },
]

 const router = createRouter({
  history: createWebHistory('/marker-board/'),
  routes,
})
 export default router