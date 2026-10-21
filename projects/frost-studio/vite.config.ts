import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Stable Three runtime can stay cached when room code changes; export remains lazy.
          if (
            id.replaceAll("\\", "/").includes("/node_modules/three/") &&
            !id.includes("GLTFExporter")
          )
            return "three";
        },
      },
    },
  },
  server: { port: 5178, strictPort: true },
});
