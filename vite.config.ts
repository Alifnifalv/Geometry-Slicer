import { defineConfig } from 'vite';

export default defineConfig({
  // Use relative paths so the game can be hosted anywhere (YouTube Playables requires this)
  base: './',
  build: {
    // YouTube Playables has strict size and loading requirements
    target: 'esnext',
    minify: 'terser',
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) return 'phaser';
          if (id.includes('node_modules/polybooljs')) return 'geometry';
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs for production performance
        drop_debugger: true
      }
    }
  }
});
