import { createApp } from 'vue'
import App from './App.vue'
// Importar estilos en el orden correcto: primero reset de Ant Design, luego nuestros estilos
import 'ant-design-vue/dist/reset.css'
import './style.css'
import './assets/scss/main.scss'
import router from './routes/router'
import { createPinia } from 'pinia'
import { applyUserPreferencesToDocument } from './services/userPreferencesStorage'
import { useAuthStore } from './stores/auth'

applyUserPreferencesToDocument()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

async function bootstrap() {
  await router.isReady();

  const auth = useAuthStore();
  await auth.init();

  app.mount('#app');

  const redirectPath = sessionStorage.getItem('404-redirect');
  if (redirectPath) {
    sessionStorage.removeItem('404-redirect');
    if (redirectPath !== '/') {
      router.replace(redirectPath).catch(() => {
        console.log('Route not found:', redirectPath);
      });
    }
  }
}

void bootstrap();

