
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.19585e7f7a0f47a2bc85c95d9099f4ed',
  appName: 'relaxed-point-planner',
  webDir: 'dist',
  server: {
    url: 'https://19585e7f-7a0f-47a2-bc85-c95d9099f4ed.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
  },
};

export default config;
