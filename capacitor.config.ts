import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // TODO(owner): choose the final package name BEFORE the first Play Store upload. It can never be changed afterwards.
  appId: "com.example.autoserve",
  appName: "AutoServe",
  webDir: "out", // the static export of the app (see the mobile build step)
  server: { androidScheme: "https" },
  plugins: {
    // Android 15+ draws the app behind the status and navigation bars. "css" gives the page the
    // --safe-area-inset-* variables so the layout can keep clear of the camera cut-out and the bars.
    SystemBars: { insetsHandling: "css", initialViewportFitValueHint: "cover" },
  },
};

export default config;