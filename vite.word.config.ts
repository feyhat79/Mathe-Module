import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'taskpane.html'),
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
  plugins: [
    viteSingleFile()
  ],
});
