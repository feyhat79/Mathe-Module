import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'fs';
import path from 'path';

const deferInlineScriptPlugin = () => ({
  name: 'defer-inline-script',
  closeBundle() {
    const distPath = path.resolve('dist/taskpane.html');
    if (fs.existsSync(distPath)) {
      const html = fs.readFileSync(distPath, 'utf-8');
      const modifiedHtml = html.replace(/<script\b(?![^>]*\bsrc\b)[^>]*>/g, '<script defer>');
      if (modifiedHtml !== html) {
        fs.writeFileSync(distPath, modifiedHtml, 'utf-8');
      }
    }
  }
});

export default defineConfig({
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'taskpane.html'),
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
  plugins: [
    viteSingleFile(),
    deferInlineScriptPlugin()
  ],
});
