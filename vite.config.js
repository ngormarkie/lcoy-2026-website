import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// HTTPS in dev so phone cameras (getUserMedia) work over the local network.
// basicSsl only affects the dev server, not the production build.
export default defineConfig({
  plugins: [react(), basicSsl()],
})
