import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
<<<<<<< Updated upstream
  appId: 'com.niucontroller.app',
  appName: 'NIU Controller',
  webDir: 'dist',
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: 'Scanning for LED controllers...',
        cancel: 'Cancel',
        availableDevices: 'Available devices',
        noDeviceFound: 'No LED controller found',
      },
    },
  },
  server: {
    androidScheme: 'https',
  },
=======
  appId: 'com.papayuda.newniu',
  appName: 'NewNiu',
  webDir: 'dist'
>>>>>>> Stashed changes
};

export default config;
