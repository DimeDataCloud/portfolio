import { defineConfig } from 'vite';
import staticContent from './tools/vite-static-content.js';

export default defineConfig({
  plugins: [staticContent()],
});
