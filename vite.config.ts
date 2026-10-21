import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
// Three pages: the workbench home at /, the FMEA at /fmea/ and PetriPLC at /petri/.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        fmea: 'fmea/index.html',
        petri: 'petri/index.html',
      },
    },
  },
});
