# NIU Controller

A mobile app for controlling and monitoring NIU electric vehicles (NQi, MQi, UQi, KQi series) with BLE ambient lighting control.

![NIU Controller](https://img.shields.io/badge/NIU-Controller-e63946?style=for-the-badge)
![iOS](https://img.shields.io/badge/iOS-000000?style=for-the-badge&logo=apple&logoColor=white)
![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)

## Features

- **Dashboard** — Battery, speed, mileage, temperature, power metrics
- **Battery Diagnostics** — Real-time SOC, voltage, temperature, health, charging charts
- **Motor Data** — Controller voltage, speed data, shake value, protocol info
- **GPS Location** — Interactive dark-themed map with vehicle position
- **Trip History** — Paginated ride history with distance, duration, average speed
- **Firmware Info** — Current firmware versions and update status
- **BLE Lighting Control** — Control FastLED ambient lighting on your scooter via Bluetooth
  - 10 LED effects (Solid, Breathing, Rainbow, Color Cycle, Strobe, Fire, Meteor, Wave, Twinkle, Chase)
  - Color picker with preset palette
  - Brightness and speed sliders
  - 5 configurable zones (Underglow, Dashboard, Rear, Front, Wheels)
- **Dark Theme** — Sleek dark UI with red/cyan accent colors
- **Local Credentials** — NIU login stored on-device via Capacitor Preferences (password stored as MD5 hash, not plaintext)

## Architecture

```
┌─────────────────┐                    ┌─────────────────┐
│   Capacitor App  │ ──── HTTPS ────▶  │  NIU Cloud API  │
│   (iOS/Android)  │                   │  (niu.com)       │
│   React + TS     │                   └─────────────────┘
│   Tailwind CSS   │
│                  │ ──── BLE ───────▶ ┌─────────────────┐
│                  │                   │  ESP32 + FastLED │
└─────────────────┘                   │  (on scooter)    │
                                      └─────────────────┘
```

- **App**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Capacitor
- **NIU API**: Direct HTTPS calls from device (no backend server needed)
- **BLE**: `@capacitor-community/bluetooth-le` for cross-platform Bluetooth
- **Storage**: `@capacitor/preferences` for on-device credential storage
- **Maps**: Leaflet with CartoDB dark tiles
- **Charts**: Recharts for battery usage visualization

## Quick Start

### Prerequisites

- Node.js 20+
- Xcode 15+ (for iOS)
- Android Studio (for Android)

### Install

```bash
cd frontend
npm install
```

### Build & Run on iOS

```bash
npm run cap:build:ios
npm run cap:open:ios
# Build and run in Xcode
```

### Build & Run on Android

```bash
npm run cap:build:android
npm run cap:open:android
# Build and run in Android Studio
```

### Development (Web Preview)

```bash
npm run dev
# Open http://localhost:5173
```

## ESP32 BLE LED Controller

The `esp32/niu_led_ble.ino` sketch runs on an ESP32 with WS2812B LED strips.

### Hardware Setup

- **ESP32** dev board
- **WS2812B** LED strips connected to GPIO5
- **5V power supply** for LEDs

### BLE GATT Service

| UUID | Characteristic | Format |
|------|---------------|--------|
| `0xFF00` | Service | — |
| `0xFF01` | Color | 3 bytes RGB |
| `0xFF02` | Effect | 1 byte (0–9) |
| `0xFF03` | Brightness | 1 byte (0–255) |
| `0xFF04` | Speed | 1 byte (0–255) |
| `0xFF05` | Power | 1 byte (0/1) |
| `0xFF06` | Zones | 1 byte bitmask |

### Pairing

Default passkey: `123456` (encrypted BLE bonding with AES-CCM).

## Supported NIU Products

- **NQi Series** — NQi GTS, NQi Sport
- **MQi Series** — MQi GT Evo, MQi GT, MQi+ Sport, MQi
- **UQi Series** — UQi GT, UQi
- **KQi Series** — KQi 1, KQi 2, KQi 3, KQi Youth+

Any NIU vehicle registered in the NIU cloud app is supported.

## NIU Cloud API

This app calls the NIU Cloud API directly from the device. Credits to:
- [volkerschulz/NIU-API](https://github.com/volkerschulz/NIU-API)
- [niu-cloud-connector](https://github.com/BlueAndi/niu-cloud-connector)
- [niu-app-api](https://github.com/bonnee/niu-app-api)

## License

GPL-3.0
