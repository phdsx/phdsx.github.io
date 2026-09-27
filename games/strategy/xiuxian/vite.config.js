import path from 'path'
import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import IconsResolver from 'unplugin-icons/resolver'
import { defineConfig } from 'vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// This standalone build is hosted beneath /games/strategy/xiuxian/.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    rollupOptions: {
      input: path.resolve(__dirname, 'source.html'),
      output: {
        manualChunks: id => id.includes('node_modules') ? 'vendor' : undefined,
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: assetInfo => assetInfo.name?.endsWith('.ico')
          ? '[name].[ext]'
          : 'assets/[ext]/[name]-[hash].[ext]'
      }
    }
  },
  plugins: [
    vue(),
    Icons({ autoInstall: true }),
    AutoImport({ resolvers: [IconsResolver({ prefix: 'Icon' }), ElementPlusResolver()] }),
    Components({ resolvers: [IconsResolver({ enabledCollections: ['ep'] }), ElementPlusResolver()] })
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } }
})
