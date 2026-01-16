import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false, // css in js - required for ant-design-vue 4.x
        }),
      ],
    }),
  ],
  base: '/marker-board/',
  css: {
    preprocessorOptions: {
      scss: {
        // Asegurar que SCSS se compile correctamente
        api: 'modern-compiler',
      },
    },
  },
  build: {
    cssCodeSplit: false, // Mantener todos los estilos en un solo archivo para evitar problemas de orden
    rollupOptions: {
      output: {
        // No dividir chunks para asegurar que los estilos se carguen correctamente
      },
    },
  },
});
