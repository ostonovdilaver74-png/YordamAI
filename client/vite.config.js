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

      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
      ],

      manifest: {
        name: "YordamAI",
        short_name: "YordamAI",

        description:
          "O‘zbek tilidagi professional AI yordamchi",

        lang: "uz",

        start_url: "/",
        scope: "/",

        display: "standalone",

        orientation: "portrait",

        theme_color: "#0b0f19",
        background_color: "#070b12",

        categories: [
          "productivity",
          "utilities",
        ],

        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },

          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },

          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        cleanupOutdatedCaches: true,

        navigateFallback: "/index.html",

        globPatterns: [
          "**/*.{js,css,html,svg,png,ico,webp,woff,woff2}",
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
});