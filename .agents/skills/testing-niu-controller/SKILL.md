---
name: testing-niu-controller
description: End-to-end testing of the NIU Controller Capacitor mobile app. Use when verifying login, navigation, mobile responsive layout, Lighting BLE controls, or credential storage.
---

# Testing NIU Controller

## Prerequisites

- Node.js and npm installed
- Frontend dependencies: `cd frontend && npm install`
- Dev server: `cd frontend && npx vite --host 0.0.0.0 --port 5173`

## Devin Secrets Needed

- `NIU_ACCOUNT` — NIU cloud account email
- `NIU_PASSWORD` — NIU cloud account password

## Test Environment

The app is a Capacitor-wrapped React app. In web preview mode (`localhost:5173`):

- **Login works** — NIU auth endpoint (`account-fk.niu.com`) allows CORS
- **Vehicle data does NOT load** — POST to `/motoinfo/list` is blocked by CORS. This is expected; the app uses `CapacitorHttp` which bypasses CORS on native iOS/Android builds. Dashboard will show "No Vehicles Found" in web preview.
- **BLE is not available** — No Bluetooth hardware in test environment. Lighting page UI renders correctly but "Connect BLE" button will fail.

## Key Test Areas

### 1. Login Flow
- Navigate to `/login`
- Enter NIU credentials (country code, email, password)
- Click "Connect to NIU Cloud"
- **Verify**: Redirects to `/` (Dashboard), sidebar shows 7 nav items
- **Verify storage**: Check browser console for `CapacitorStorage.niu_token`, `CapacitorStorage.niu_account`, `CapacitorStorage.niu_password`, `CapacitorStorage.niu_country_code` in localStorage

### 2. Invalid Login Error Handling
- Enter invalid email/password
- **Verify**: Red inline error banner appears (e.g., "User does not exist")
- **Verify**: App stays on `/login`, button returns to normal (not stuck loading)
- Note: NIU API might rate-limit after multiple failed attempts

### 3. Desktop Sidebar Navigation
- Click each of the 7 sidebar links: Dashboard, Battery, Motor, Location, Trips, Firmware, Lighting
- **Verify**: Each page renders its heading, active nav highlighted in red

### 4. Mobile Responsive Layout
- Use Chrome DevTools device emulation (`Ctrl+Shift+M`) → iPhone 14 (390x844)
- **Verify**: Desktop sidebar hidden, bottom nav shows 5 items + "More" button
- Click "More" → drawer slides up with Firmware, Lighting, Logout
- Tap a drawer item → navigates and closes drawer

### 5. Lighting Page
- Navigate to `/lighting`
- **Verify**: Title "Ambient Lighting", subtitle, Connect BLE button
- **Verify**: 16 color swatches, 10 effects (Solid, Breathing, Rainbow, Color Cycle, Strobe, Fire, Meteor, Wave, Twinkle, Chase)
- **Verify**: Brightness and speed sliders (0-255), 5 zone toggles (Underglow, Dashboard, Rear, Front, Wheels)

### 6. Logout
- Click Logout (sidebar or "More" drawer)
- **Verify**: Redirects to `/login`, form empty
- **Verify**: All 4 `CapacitorStorage.*` keys cleared from localStorage

## Console Commands for Storage Verification

```javascript
// Check stored credentials after login
Object.keys(localStorage).filter(k => k.startsWith('CapacitorStorage')).forEach(k => console.log(k, localStorage[k]?.length));

// Check credentials cleared after logout
Object.keys(localStorage).filter(k => k.startsWith('CapacitorStorage')).length === 0;
```

## Known Limitations

- Vehicle data pages (Dashboard metrics, Battery charts, Motor data, Location map, Trips, Firmware) show empty/placeholder state in web preview due to CORS. These only work on native iOS/Android builds.
- BLE functionality requires physical ESP32 hardware running the `esp32/niu_led_ble.ino` sketch.
- NIU API rate limits failed login attempts — space out invalid login tests.
