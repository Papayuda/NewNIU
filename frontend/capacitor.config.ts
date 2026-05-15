import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
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
};

export default config;
