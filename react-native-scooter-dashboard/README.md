# React Native Scooter Dashboard (Legacy / Experimental)

> **Status:** This is a standalone React Native app kept alongside the primary
> Capacitor-based `frontend/` project. It provides a single-screen BLE dashboard
> for interacting with NIU scooters directly over Bluetooth Low Energy
> (`react-native-ble-manager`), including lock/unlock, battery monitoring, and
> hardware diagnostics.

## Relationship to `frontend/`

| Aspect | `frontend/` (Capacitor) | `react-native-scooter-dashboard/` |
|--------|-------------------------|----------------------------------|
| Framework | React + Vite + Capacitor | React Native 0.85 |
| BLE Library | `@capacitor-community/bluetooth-le` | `react-native-ble-manager` |
| Cloud API | Full NIU Cloud API client | None (BLE-only) |
| Platforms | iOS, Android, Web (preview) | iOS, Android |

The `frontend/` directory is the main codebase for the NIU Controller app.
This React Native project is a **secondary experiment** focused on native BLE
lock/unlock that requires direct hardware testing on iOS or Android devices.

## Setup

```bash
npm install
cd ios && bundle exec pod install   # iOS
npm run android                     # Android
```

## Scripts

- `npm start` — Start Metro bundler
- `npm run ios` — Build and run on iOS simulator
- `npm run android` — Build and run on Android emulator
- `npm run typecheck` — Run TypeScript type checking
- `npm run lint` — Run ESLint
