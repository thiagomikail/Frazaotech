import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
// One page per app: the workbench home at /, the FMEA at /fmea/, PetriPLC at /petri/ and Yield at /yield/.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        fmea: 'fmea/index.html',
        petri: 'petri/index.html',
        yield: 'yield/index.html',
      },
    },
  },
});
