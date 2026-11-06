import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Prüfen ob vertrauenswürdiges Office-Zertifikat vorhanden ist
const certDir = path.join(os.homedir(), '.office-addin-dev-certs');
const certPath = path.join(certDir, 'localhost.crt');
const keyPath = path.join(certDir, 'localhost.key');
const hasDevCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

const httpsOptions = hasDevCerts ? {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
} : undefined;

const htmlIncludePlugin = () => ({
  name: 'html-include',
  enforce: 'pre' as const,
  transformIndexHtml(html: string) {
    const includeRegex = /<include\s+src="([^"]+)"\s*><\/include>/g;
    return html.replace(includeRegex, (match, srcPath) => {
      const filePath = path.resolve(__dirname, srcPath);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
      console.error(`❌ HTML Include Warnung: Datei nicht gefunden: ${filePath}`);
      return match;
    });
  }
});

const deferInlineScriptPlugin = () => ({
  name: 'defer-inline-script',
  closeBundle() {
    const distPath = path.resolve('dist/index.html');
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
  server: {
    port: 3000,
    host: true,
    https: httpsOptions,
    watch: {
      usePolling: true
    }
  },
  plugins: [
    htmlIncludePlugin(),
    viteSingleFile(),
    deferInlineScriptPlugin()
  ],
});
