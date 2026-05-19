---
name: testing-niu-controller
description: Test the NIU Controller app end-to-end. Use when verifying UI changes, credential storage, BLE lighting features, or mobile responsiveness.
---

# Testing NIU Controller App

## Dev Server Setup

```bash
cd frontend && npm install && npx vite --host 0.0.0.0 --port 5173
```

The app runs at `http://localhost:5173`. No backend server is needed — the app calls NIU Cloud API directly.

## Devin Secrets Needed

- `NIU_ACCOUNT`: NIU cloud account email
- `NIU_PASSWORD`: NIU cloud account password

## Navigation

- **Desktop**: Sidebar with 7 links (Dashboard, Battery, Motor, Location, Trips, Firmware, Lighting) + Logout button
- **Mobile (390x844)**: Bottom nav shows 5 items, "More" button opens drawer with remaining pages
- **Login page**: Shows when no token is stored. Fields: Account (email), Password, Country Code dropdown

## Key Test Flows

### Login & Credentials
1. Navigate to `http://localhost:5173` — if no token, login page appears
2. Enter NIU credentials and login
3. Verify credentials stored in localStorage with `CapacitorStorage.` prefix:
   - `CapacitorStorage.niu_password` should be 32-char hex MD5 hash (not plaintext)
   - `CapacitorStorage.niu_cred_version` should be `"2"`
   - `CapacitorStorage.niu_token` should contain access token
4. Refresh page — credentials should auto-fill and login succeed

### Lighting / BLE Page
- Navigate via sidebar → Lighting
- **Without ESP32 hardware**: Can only test UI rendering, input validation, disabled states
- **BLE Security section**: Scroll down past Live Preview
  - Passkey input: numeric only (letters stripped), 6-digit max, range 100000-999999
  - Save button disabled when: not connected, input < 6 digits, value < 100000
  - Helper text shows "Connect to your ESP32 via BLE..." when disconnected
- **Controls**: Color picker + 16 presets, 10 effects, Brightness/Speed sliders, 5 zone toggles
- **Connect BLE button**: Will trigger BLE scan (shows error in web preview — expected)

### Vehicle Data (CORS limitation)
- In web preview, NIU data endpoints are blocked by CORS — this is expected
- On native iOS/Android via Capacitor, CapacitorHttp bypasses CORS
- Dashboard will show "No Vehicles Found" in web preview if CORS blocks the vehicle list

## Testing Constraints

- **BLE features** require a physical ESP32 with the `esp32/niu_led_ble.ino` firmware flashed
- **Native mobile features** require building with `npm run cap:build:ios` / `cap:build:android`
- **Vehicle data** may be CORS-blocked in web preview — use native build for full testing
- **Rate limiting**: NIU API has rate limits; avoid rapid repeated login attempts (wait ~60s between failed attempts)

## Common Issues

- If login fails with "Authentication failed", check that the password is being hashed correctly (MD5)
- If the battery chart endpoint returns 422, ensure `page_size` is sent as string `'A'` not number `7`
- If BLE connect fails in web preview, this is expected — Web Bluetooth has limited browser support
- The passkey input might appear to have a placeholder "123456" — this is the default, not a stored value. The actual passkey is only read from the ESP32 on BLE connect.
