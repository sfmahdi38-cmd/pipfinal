// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Alias ensures any leftover '@google/genai' imports resolve to the installed package
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@google/genai': '@google/generative-ai',
    },
  },
});
