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
// The 404.html page redirects to /?/path, so we need to extract the path
if (typeof window !== 'undefined') {
  const search = window.location.search;
  if (search && search.startsWith('?/')) {
    const path = search.slice(1).split('&')[0].replace(/~and~/g, '&');
    if (path && path !== '/') {
      router.replace(path);
    }
  }
}

 export default router