import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import 'ant-design-vue/dist/reset.css';
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
    if (redirectPath !== '/') {
      router.replace(redirectPath);
    }
  }
});

app.mount('#app')

