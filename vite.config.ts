import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all network interfaces to be accessible in a container
    host: '0.0.0.0',
    // Hardcode port 8080 for specific deployment environments
    port: 8080,
  },
  preview: {
    // Also configure the preview server for consistency after building
    host: '0.0.0.0',
    // Hardcode port 8080 for specific deployment environments
    port: 8080,
  }
});
