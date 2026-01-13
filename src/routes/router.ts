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

// Handle GitHub Pages 404 redirect
// The 404.html page stores the route in sessionStorage
if (typeof window !== 'undefined') {
  const redirectPath = sessionStorage.getItem('404-redirect');
  if (redirectPath) {
    sessionStorage.removeItem('404-redirect');
    if (redirectPath !== '/') {
      router.replace(redirectPath);
    }
  }
}

 export default router