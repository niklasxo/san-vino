import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "VINO – Dein Wein-Sommelier",
        short_name: "VINO",
        description: "Finde Wein, der wirklich zu dir passt.",
        lang: "de",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#FAF7F2",
        theme_color: "#531F32",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Nur die App-Hülle wird gecacht. Supabase- und KI-Anfragen laufen immer über das Netzwerk.
        globPatterns: ["**/*.{js,css,html,svg,png}", "**/*latin-wght-normal*.woff2", "**/*latin-ext-wght-normal*.woff2"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/functions\//, /^\/auth\//, /^\/rest\//, /^\/storage\//],
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@shared": fileURLToPath(new URL("./supabase/functions/_shared", import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Große, selten geänderte Bibliotheken in eigene Chunks (besseres Caching).
        advancedChunks: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
            { name: "supabase", test: /node_modules[\\/]@supabase[\\/]/ },
            { name: "motion", test: /node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/ },
            { name: "ui", test: /node_modules[\\/](radix-ui|@radix-ui|vaul|sonner)[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
