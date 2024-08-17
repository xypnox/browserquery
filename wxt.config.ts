import { defineConfig } from "wxt";
//
// vite.config.ts
import Icons from "unplugin-icons/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-solid"],
  manifest: {
    permissions: ["tabs"],
    commands: {
      "open-popup": {
        suggested_key: {
          default: "Alt+Shift+Space",
        },
        description: "Open the popup window",
      },
    },
  },
  vite: (config) => ({
    plugins: [Icons({ compiler: "solid" })],
  }),
});
