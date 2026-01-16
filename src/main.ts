import { createApp } from 'vue'
import App from './App.vue'
// Importar estilos en el orden correcto: primero reset de Ant Design, luego nuestros estilos
import 'ant-design-vue/dist/reset.css'
import './style.css'
import './assets/scss/main.scss'
import router from './routes/router'
import { createPinia } from 'pinia'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Handle GitHub Pages 404 redirect after app is mounted
router.isReady().then(() => {
  const redirectPath = sessionStorage.getItem('404-redirect');
  if (redirectPath) {
    sessionStorage.removeItem('404-redirect');
    // Small delay to ensure app is fully mounted
    setTimeout(() => {
      if (redirectPath !== '/') {
        router.replace(redirectPath).catch(() => {
          // If route doesn't exist, ignore the error
          console.log('Route not found:', redirectPath);
        });
      }
    }, 100);
  }
});

app.mount('#app')

