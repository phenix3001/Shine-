import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { kaspiProgress } from './scripts/kaspi/devProgress';

export default defineConfig({
  plugins: [react(), kaspiProgress()],
});
