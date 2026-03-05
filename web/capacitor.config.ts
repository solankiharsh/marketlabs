import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for building MarketLabs as a native iOS/Android app.
 * @see https://capacitorjs.com/
 *
 * Build for mobile:
 *   1. Build Next.js with static export: CAPACITOR_BUILD=1 npm run build
 *   2. Sync: npx cap sync
 *   3. Open native project: npx cap open ios | npx cap open android
 */
const config: CapacitorConfig = {
  appId: 'com.marketlabs.app',
  appName: 'MarketLabs',
  webDir: 'out',
  server: {
    // In dev, point to your local Next.js server
    // url: 'http://localhost:3000',
    // cleartext: true,
  },
};

export default config;
