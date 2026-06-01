---
name: testing-niu-controller
description: Test the NIU Controller app end-to-end. Use when verifying UI changes, credential storage, BLE lighting features, or mobile responsiveness.
---

# Testing NIU Controller App

## Dev Server Setup

```bash
cd frontend && npm install && npx vite --host 0.0.0.0 --port 5173
```

The app runs at `http://localhost:5173` (Vite may auto-increment the port if 5173 is in use — check the terminal output). No backend server is needed for frontend testing — the app calls NIU Cloud API directly.

### Backend Server (for API/CORS testing)

```bash
cd backend && pip install fastapi uvicorn httpx pydantic joserfc bcrypt "starlette>=1.0.1" "idna>=3.15"
uvicorn app.main:app --port 8000
```

Note: `pip install -e .` may fail due to hatchling version issues — install deps directly instead.

API routes are prefixed with `/api/` — e.g., `/api/auth/login`, `/api/vehicles`, `/api/vehicle/detail`.

## Devin Secrets Needed

- `NIU_ACCOUNT`: NIU cloud account email
- `NIU_PASSWORD`: NIU cloud account password

## Navigation

- **Desktop**: Sidebar with 7 links (Dashboard, Battery, Motor, Location, Trips, Firmware, Lighting) + Logout button
- **Mobile (390x844)**: Bottom nav shows 5 items, "More" button opens drawer with remaining pages
- **Login page**: Shows when no token is stored. Fields: Account (email), Password, Country Code dropdown

## Key Test Flows

### Login & Credentials
1. Navigate to the app URL — if no token, login page appears
2. Enter NIU credentials and login
3. Verify localStorage with `CapacitorStorage.` prefix contains ONLY:
   - `CapacitorStorage.niu_token` — access token (long JWT string)
   - `CapacitorStorage.niu_account` — the account email
   - `CapacitorStorage.niu_country_code` — country code (e.g. "1")
4. Verify these keys are **NOT** present (passwords are never stored):
   - `CapacitorStorage.niu_password` — must be absent
   - `CapacitorStorage.niu_cred_version` — must be absent
5. The info text on login page should read: "Only your auth token is stored locally"

### Input Validation
1. Enter an XSS payload in account field (e.g. `test<script>alert(1)</script>`) — should show red error banner: "Account contains invalid characters"
2. Empty account field: browser native `required` validation blocks submission before JS validation runs — this is acceptable
3. Valid account format: alphanumeric chars plus `@._+-`, max 100 chars
4. Password: max 128 chars
5. Country code: 1-4 digits only
6. Validation runs client-side BEFORE any network call — no loading spinner should appear on validation failure

### Return Visit (Credential Persistence)
1. After login, clear only the token: `localStorage.removeItem('CapacitorStorage.niu_token')`
2. Navigate to `/login`
3. Wait ~2s for async `getSavedCredentials()` (alias for `getSavedAccountInfo()`) to resolve
4. Verify: Account field should pre-fill with email, Country Code should match stored value
5. Verify: Password field should be EMPTY (placeholder "Enter your password" visible) — passwords are never persisted

### Legacy Credential Cleanup
The `isLoggedIn()` function unconditionally removes legacy `niu_password` and `niu_cred_version` keys from localStorage. To test:
1. Set legacy keys: `localStorage.setItem('CapacitorStorage.niu_password', 'fake')` and `localStorage.setItem('CapacitorStorage.niu_cred_version', '2')`
2. Set a token: `localStorage.setItem('CapacitorStorage.niu_token', 'fake_token')`
3. Navigate to `/` (triggers `isLoggedIn()` check)
4. Verify: `niu_password` and `niu_cred_version` are removed, `niu_token` is preserved

### Backend Error Sanitization
```bash
# Should return generic message, NOT Python traceback
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"invalid","password":"wrong","country_code":"1"}'
# Expected: {"detail":"Authentication failed"}
```

### Backend CORS Restriction
```bash
# Evil origin — should NOT get access-control-allow-origin header
curl -X OPTIONS http://localhost:8000/api/auth/login \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" -v 2>&1 | grep access-control-allow-origin
# Expected: no output (header absent)

# Allowed origin — should get the header
curl -X OPTIONS http://localhost:8000/api/auth/login \
  -H "Origin: http://localhost" \
  -H "Access-Control-Request-Method: POST" -v 2>&1 | grep access-control-allow-origin
# Expected: access-control-allow-origin: http://localhost
```

CORS allowed origins are configured via `CORS_ORIGINS` env var (comma-separated). Default: `capacitor://localhost,http://localhost`.

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
- The NIU **authentication** endpoint (`account-fk.niu.com`) is NOT CORS-blocked — login works in web preview
- NIU **data** endpoints (`app-api-fk.niu.com`) ARE CORS-blocked in web preview
- Dashboard will show "No Vehicles Found" in web preview due to CORS-blocked vehicle list — this is expected
- On native iOS/Android via Capacitor, CapacitorHttp bypasses CORS for all endpoints

### Unit Tests
```bash
cd frontend && npm test
```
Runs Vitest with React Testing Library. Tests cover `NiuApiError` class and input validation logic.

## Testing Constraints

- **BLE features** require a physical ESP32 with the `esp32/niu_led_ble.ino` firmware flashed
- **Native mobile features** require building with `npm run cap:build:ios` / `cap:build:android`
- **Vehicle data** is CORS-blocked in web preview — use native build for full testing
- **Rate limiting**: NIU API has rate limits; avoid rapid repeated login attempts (wait ~60s between failed attempts)

## Common Issues

- If login fails with "Authentication failed", check that the password is being hashed correctly (MD5 via the `md5` library)
- If the battery chart endpoint returns 422, ensure `page_size` is sent as string `'A'` not number `7`
- If BLE connect fails in web preview, this is expected — Web Bluetooth has limited browser support
- The passkey input might appear to have a placeholder "123456" — this is the default, not a stored value. The actual passkey is only read from the ESP32 on BLE connect
- `pip install -e .` in the backend may fail with hatchling errors — install deps directly with `pip install fastapi uvicorn httpx ...`
- When typing credentials into the login form, the `type` action may accidentally trigger form submission via Enter key — click the password field explicitly before typing the password
- The `getSavedCredentials()` call in LoginPage's useEffect is async — wait ~2 seconds after page load before checking if fields are pre-filled
- Vite dev server may use a different port than 5173 if the port is already in use — always check the terminal output for the actual URL
