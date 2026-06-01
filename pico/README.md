# NIU LED Controller — Raspberry Pi Pico 2 W firmware

`niu_led_ble.ino` is a Raspberry Pi Pico 2 W (RP2350 + CYW43439) port of
[`esp32/niu_led_ble.ino`](../esp32/niu_led_ble.ino). It speaks the **same BLE
GATT protocol** and implements the **same 10 effects**, so the NIU Controller
app ([`frontend/src/services/ble-led.ts`](../frontend/src/services/ble-led.ts))
connects to it with no app-side changes. It also adds optional WiFi
connectivity and power-saving tuned for the RP2350.

## BLE protocol (service `0xFF00`)

| Char     | UUID     | Bytes | Meaning |
|----------|----------|-------|---------|
| Color    | `0xFF01` | 3     | R, G, B |
| Effect   | `0xFF02` | 1     | `0..9` (solid, breathing, rainbow, color-cycle, strobe, fire, meteor, wave, twinkle, chase) |
| Brightness | `0xFF03` | 1   | `0-255` |
| Speed    | `0xFF04` | 1     | `0-255` |
| Power    | `0xFF05` | 1     | `0/1` |
| Zones    | `0xFF06` | 1     | bitmask: underglow / dash / rear / front / wheels |
| Passkey  | `0xFF07` | 4     | uint32 LE, `100000-999999`, persisted in flash (EEPROM emulation) |

## Hardware

- **No external BLE module or RF antenna needed** — the Pico 2 W has WiFi + BLE
  (Classic + BLE) and an antenna on board via the CYW43439.
- `GP2` → WS2812B `DIN` (add a 74AHCT125 3.3 V→5 V level shifter for long strips),
  common ground required, separate 5 V supply for the LEDs (~60 mA/LED), ~330 Ω
  in series on the data line and a ~1000 µF cap across the strip rails.

## Build / flash

Arduino IDE:

1. Add the board package URL in **Preferences**:
   `https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json`
2. **Boards Manager** → install *Raspberry Pi Pico/RP2040/RP2350*.
3. **Library Manager** → install *FastLED*.
4. **Tools → Board** → *Raspberry Pi Pico 2W*.
5. **Tools → IP/Bluetooth Stack** → *IPv4 + Bluetooth* (required for BLE).
6. Set `WIFI_SSID` / `WIFI_PASS` at the top of the sketch (leave blank to skip
   WiFi), then **Upload**.

arduino-cli:

```bash
arduino-cli core install rp2040:rp2040 \
  --additional-urls https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json
arduino-cli lib install FastLED
arduino-cli compile --fqbn rp2040:rp2040:rpipico2w:ipbtstack=ipv4btcble pico/
arduino-cli upload  --fqbn rp2040:rp2040:rpipico2w:ipbtstack=ipv4btcble -p /dev/ttyACM0 pico/
```

> The Arduino sketch folder must match the `.ino` name to open in the IDE; for
> arduino-cli, compile the folder containing the sketch.

## Security note

The ESP32 build uses encrypted bonding with a **static 6-digit passkey (MITM)**.
The Pico SDK BLE stack exposed by arduino-pico currently offers PIN-less
**"Just Works"** encryption only (no static passkey), so this port encrypts the
link via `BLESecurityJustWorks` and still exposes the passkey characteristic for
app compatibility / persistence, but does **not** enforce a 6-digit MITM
passkey. Treat the link as encrypted-but-unauthenticated.

## Power-saving

- `WiFi.aggressiveLowPowerMode()` (CYW43439 sleeps between beacons).
- `FastLED.setMaxPowerInVoltsAndMilliamps(5, 500)` caps total LED current.
- On-board LED kept off.
- Longer `delay()` idle when the effect is static/off (parks the CPU in a
  low-power wait); tight frame interval only while animating.
