/*
 * NIU Controller — FastLED BLE + WiFi Ambient Lighting (Raspberry Pi Pico 2 W)
 *
 * Pico 2 W port of esp32/niu_led_ble.ino.  It implements the SAME GATT
 * protocol (service 0xFF00 + characteristics 0xFF01..0xFF07) and the SAME 10
 * effects, so the NIU Controller app (frontend/src/services/ble-led.ts) talks
 * to it without any app-side changes.  It adds optional WiFi connectivity and
 * RP2350-oriented power-saving.
 *
 * BLE Service 0xFF00 (encrypted "Just Works" pairing — see security note below)
 * Characteristics:
 *   0xFF01  Color      (3 bytes:  R, G, B)
 *   0xFF02  Effect     (1 byte:   0..9)
 *   0xFF03  Brightness (1 byte:   0-255)
 *   0xFF04  Speed      (1 byte:   0-255)
 *   0xFF05  Power      (1 byte:   0/1)
 *   0xFF06  Zones      (1 byte:   bitmask)
 *   0xFF07  Passkey    (4 bytes:  uint32 LE, 100000-999999)
 *
 * ---------------------------------------------------------------------------
 * HARDWARE REQUIREMENTS / NOTES
 * ---------------------------------------------------------------------------
 *   * Radio: the Pico 2 W's on-board Infineon CYW43439 provides BOTH WiFi and
 *     Bluetooth (Classic + BLE) over one SPI link, plus an on-board antenna.
 *     => NO external BLE module and NO external RF antenna are required.
 *   * Wiring:
 *       Pico GP2  -> WS2812B DIN   (3.3V logic; for long strips add a
 *                                   74AHCT125 level shifter to 5V for reliability)
 *       Pico GND  -> WS2812B GND   (common ground is mandatory)
 *       5V supply -> WS2812B 5V    (do NOT power many LEDs from the Pico;
 *                                   budget ~60 mA/LED and add a ~1000uF cap)
 *       ~330 ohm in series with the data line is recommended.
 *   * Power the Pico from a stable 5V/USB source: WiFi/BLE TX bursts are
 *     current-hungry and a weak supply causes radio resets.
 *
 * ---------------------------------------------------------------------------
 * INSTALL (Arduino IDE)
 * ---------------------------------------------------------------------------
 *   1. Add the earlephilhower board package URL in Preferences:
 *      https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json
 *   2. Boards Manager -> install "Raspberry Pi Pico/RP2040/RP2350".
 *   3. Library Manager -> install "FastLED".
 *   4. Tools -> Board -> "Raspberry Pi Pico 2W".
 *   5. Tools -> IP/Bluetooth Stack -> "IPv4 + Bluetooth"  (REQUIRED for BLE).
 *   6. Set WIFI_SSID / WIFI_PASS below, then Upload.
 *   (arduino-cli FQBN: rp2040:rp2040:rpipico2w:ipbtstack=ipv4btcble)
 *
 * NOTE ON SECURITY: the ESP32 build uses encrypted bonding with a static
 * 6-digit passkey (MITM).  The Pico SDK BLE stack exposed by arduino-pico
 * currently offers PIN-less "Just Works" encryption only (no static passkey),
 * so this port encrypts the link via BLESecurityJustWorks and still exposes the
 * passkey characteristic for app compatibility / persistence, but it does not
 * enforce a 6-digit MITM passkey. Treat it as encrypted-but-unauthenticated.
 *
 * AvantLumi note: the prompt mentioned the "avanti_lumi" API. AvantLumi
 * (github.com/AvantMaker/AvantLumi) is an ESP32-only Arduino library built on
 * FastLED and will not compile for the RP2350, so this firmware uses FastLED
 * directly (matching esp32/niu_led_ble.ino).
 */

#include <WiFi.h>     // arduino-pico WiFi (CYW43439 station mode)
#include <BLE.h>      // arduino-pico BLE peripheral API (BTstack-backed)
#include <FastLED.h>  // WS2812B driver (RP2350 supported via PIO)
#include <EEPROM.h>   // flash-emulated EEPROM, used to persist the passkey

// ─── WiFi Configuration ───
// WiFi is optional here (the NIU app talks to the NIU cloud directly, not the
// firmware) but is included per spec.  Leave blank to skip WiFi entirely.
#define WIFI_SSID   "YOUR_WIFI_SSID"
#define WIFI_PASS   "YOUR_WIFI_PASSWORD"

// ─── LED Configuration ───
// Adjust these for your setup:
#define LED_PIN        2        // GP2 connected to LED data
#define NUM_LEDS       60       // Number of LEDs in your strip
#define LED_TYPE       WS2812B  // LED chipset (WS2812B, WS2811, etc.)
#define COLOR_ORDER    GRB      // Color order (GRB for most WS2812B)
#define MAX_BRIGHTNESS 255

// Power-saving: hard cap total LED current so the strip can't brown out the rig.
#define LED_SUPPLY_VOLTS    5
#define LED_SUPPLY_MILLIAMP 500

CRGB leds[NUM_LEDS];

// ─── BLE UUIDs (16-bit; map to the app's 0000ffXX-0000-1000-8000-00805f9b34fb) ───
#define SERVICE_UUID    0xFF00
#define CHAR_COLOR_UUID 0xFF01
#define CHAR_EFFECT_UUID 0xFF02
#define CHAR_BRIGHT_UUID 0xFF03
#define CHAR_SPEED_UUID 0xFF04
#define CHAR_POWER_UUID 0xFF05
#define CHAR_ZONES_UUID 0xFF06
#define CHAR_PASSKEY_UUID 0xFF07

// ─── State ───
uint8_t currentR = 255, currentG = 0, currentB = 0;
uint8_t currentEffect = 0;   // 0=solid,1=breathing,2=rainbow,3=colorCycle,4=strobe,5=fire,6=meteor,7=wave,8=twinkle,9=chase
uint8_t currentBrightness = 128;
uint8_t currentSpeed = 50;
bool    currentPower = true;
uint8_t currentZones = 0x01; // bit0=underglow,bit1=dash,bit2=rear,bit3=front,bit4=wheels
uint8_t hueOffset = 0;

// ─── Passkey (persisted in emulated EEPROM, user-configurable) ───
#define EEPROM_SIZE        16
#define EEPROM_PASSKEY_ADDR 0
uint32_t currentPasskey = 123456;  // default

void loadPasskey() {
  uint32_t pk;
  EEPROM.get(EEPROM_PASSKEY_ADDR, pk);
  if (pk >= 100000 && pk <= 999999) {
    currentPasskey = pk;
  }
}

void savePasskey(uint32_t pk) {
  currentPasskey = pk;
  EEPROM.put(EEPROM_PASSKEY_ADDR, pk);
  EEPROM.commit();
}

// ─── BLE objects (must live for the whole program → globals) ───
BLEService        svc        (BLEUUID((uint16_t)SERVICE_UUID));
BLECharacteristic colorChar  (BLEUUID((uint16_t)CHAR_COLOR_UUID),   BLERead | BLEWrite, "Color RGB");
BLECharacteristic effectChar (BLEUUID((uint16_t)CHAR_EFFECT_UUID),  BLERead | BLEWrite, "Effect");
BLECharacteristic brightChar (BLEUUID((uint16_t)CHAR_BRIGHT_UUID),  BLERead | BLEWrite, "Brightness");
BLECharacteristic speedChar  (BLEUUID((uint16_t)CHAR_SPEED_UUID),   BLERead | BLEWrite, "Speed");
BLECharacteristic powerChar  (BLEUUID((uint16_t)CHAR_POWER_UUID),   BLERead | BLEWrite, "Power");
BLECharacteristic zonesChar  (BLEUUID((uint16_t)CHAR_ZONES_UUID),   BLERead | BLEWrite, "Zones");
BLECharacteristic passkeyChar(BLEUUID((uint16_t)CHAR_PASSKEY_UUID), BLERead | BLEWrite, "Passkey");

// ─── BLE server callbacks ───
// BTstack stops connectable advertising once a client connects and does not
// auto-resume on disconnect, so (like the ESP32 build) we restart advertising
// in onDisconnect — otherwise the device becomes unreachable after the first
// client disconnects.
class ServerCB : public BLEServerCallbacks {
  void onConnect(BLEServer *s) override {
    Serial.println("BLE client connected");
  }
  void onDisconnect(BLEServer *s) override {
    Serial.println("BLE client disconnected, restarting advertising");
    BLE.startAdvertising();
  }
};
ServerCB serverCB;

// ─── BLE write callbacks (run at interrupt level: keep them tiny) ───
static void onColor(BLECharacteristic *c) {
  if (c->valueLen() >= 3) {
    const uint8_t *d = (const uint8_t *)c->valueData();
    currentR = d[0]; currentG = d[1]; currentB = d[2];
  }
}
static void onEffect(BLECharacteristic *c) { currentEffect = c->getUInt8(); }
static void onBright(BLECharacteristic *c) {
  currentBrightness = c->getUInt8();
  FastLED.setBrightness(currentBrightness);
}
static void onSpeed(BLECharacteristic *c) { currentSpeed = c->getUInt8(); }
static void onPower(BLECharacteristic *c) { currentPower = (c->getUInt8() == 1); }
static void onZones(BLECharacteristic *c) { currentZones = c->getUInt8(); }
static void onPasskey(BLECharacteristic *c) {
  if (c->valueLen() >= 4) {
    const uint8_t *d = (const uint8_t *)c->valueData();
    uint32_t newKey = d[0] | (d[1] << 8) | (d[2] << 16) | ((uint32_t)d[3] << 24);
    if (newKey >= 100000 && newKey <= 999999) {
      savePasskey(newKey);
    }
  }
}

// ─── LED Effects (identical behavior to the ESP32 build) ───
void effectSolid() {
  fill_solid(leds, NUM_LEDS, CRGB(currentR, currentG, currentB));
}
void effectBreathing() {
  uint8_t bpm = max(10, currentSpeed / 5);
  uint8_t breath = beatsin8(bpm, 20, 255);
  fill_solid(leds, NUM_LEDS, CRGB(currentR, currentG, currentB));
  fadeToBlackBy(leds, NUM_LEDS, 255 - breath);
}
void effectRainbow() {
  fill_rainbow(leds, NUM_LEDS, hueOffset, 7);
  hueOffset += max(1, currentSpeed / 25);
}
void effectColorCycle() {
  CRGB color = CHSV(hueOffset, 255, 255);
  fill_solid(leds, NUM_LEDS, color);
  hueOffset += max(1, currentSpeed / 50);
}
void effectStrobe() {
  EVERY_N_MILLISECONDS(max(20, 255 - (int)currentSpeed)) {
    static bool on = false;
    on = !on;
    if (on) fill_solid(leds, NUM_LEDS, CRGB(currentR, currentG, currentB));
    else    fill_solid(leds, NUM_LEDS, CRGB::Black);
  }
}
void effectFire() {
  for (int i = 0; i < NUM_LEDS; i++) {
    uint8_t heat = random8(100, 255);
    leds[i] = HeatColor(heat);
  }
  fadeToBlackBy(leds, NUM_LEDS, 60);
}
void effectMeteor() {
  static int pos = 0;
  fadeToBlackBy(leds, NUM_LEDS, 64);
  int meteorSize = max(2, NUM_LEDS / 15);
  for (int j = 0; j < meteorSize; j++) {
    int idx = (pos - j + NUM_LEDS) % NUM_LEDS;
    leds[idx] = CRGB(currentR, currentG, currentB);
  }
  pos = (pos + 1) % NUM_LEDS;
}
void effectWave() {
  for (int i = 0; i < NUM_LEDS; i++) {
    uint8_t wave = sin8(i * 10 + hueOffset);
    leds[i] = CRGB(scale8(currentR, wave), scale8(currentG, wave), scale8(currentB, wave));
  }
  hueOffset += max(1, currentSpeed / 25);
}
void effectTwinkle() {
  fadeToBlackBy(leds, NUM_LEDS, 20);
  if (random8() < currentSpeed) {
    leds[random16(NUM_LEDS)] = CRGB(currentR, currentG, currentB);
  }
}
void effectChase() {
  static int offset = 0;
  for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = ((i + offset) % 3 == 0) ? CRGB(currentR, currentG, currentB) : CRGB::Black;
  }
  EVERY_N_MILLISECONDS(max(30, 255 - (int)currentSpeed)) { offset++; }
}

typedef void (*EffectFunc)();
const int NUM_EFFECTS = 10;
EffectFunc effects[NUM_EFFECTS] = {
  effectSolid, effectBreathing, effectRainbow, effectColorCycle,
  effectStrobe, effectFire, effectMeteor, effectWave,
  effectTwinkle, effectChase
};

// Animated effects need continuous redraws; "solid" is static and can idle.
static bool effectIsAnimated() { return currentPower && currentEffect != 0; }

// ─── WiFi (optional, non-blocking) ───
static void connectWiFi() {
  if (strlen(WIFI_SSID) == 0) {
    return;  // WiFi disabled
  }
  WiFi.mode(WIFI_STA);
  WiFi.setHostname("NIU-LED-Pico");
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
    delay(250);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi not connected (continuing; BLE LED control is independent)");
  }
  // Power-saving: let the CYW43439 sleep aggressively between beacons.
  WiFi.aggressiveLowPowerMode();
}

void setup() {
  Serial.begin(115200);
  Serial.println("NIU LED Controller (Pico 2 W) starting...");

  // Turn the on-board LED off (it shares the CYW43 chip; keep it dark to save power).
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  // ── FastLED ──
  FastLED.addLeds<LED_TYPE, LED_PIN, COLOR_ORDER>(leds, NUM_LEDS)
         .setCorrection(TypicalLEDStrip);
  FastLED.setMaxPowerInVoltsAndMilliamps(LED_SUPPLY_VOLTS, LED_SUPPLY_MILLIAMP);
  FastLED.setBrightness(currentBrightness);
  FastLED.clear();
  FastLED.show();

  // ── Passkey from EEPROM ──
  EEPROM.begin(EEPROM_SIZE);
  loadPasskey();
  Serial.printf("Passkey: %u\n", currentPasskey);

  // ── WiFi (optional) ──
  connectWiFi();

  // ── BLE peripheral ──
  // Encrypt the link (Just Works). Must be set before BLE.begin().
  BLE.setSecurity(BLESecurityJustWorks);
  BLE.begin("NIU-LED");

  // Register write callbacks
  colorChar.onWrite(onColor);
  effectChar.onWrite(onEffect);
  brightChar.onWrite(onBright);
  speedChar.onWrite(onSpeed);
  powerChar.onWrite(onPower);
  zonesChar.onWrite(onZones);
  passkeyChar.onWrite(onPasskey);

  // Seed initial readable values (the app reads these on connect).
  // Use explicit 1-byte writes so each characteristic is exactly 1 byte wide.
  uint8_t initColor[3] = {currentR, currentG, currentB};
  colorChar.setValue(initColor, 3);
  uint8_t b;
  b = currentEffect;                 effectChar.setValue(&b, 1);
  b = currentBrightness;             brightChar.setValue(&b, 1);
  b = currentSpeed;                  speedChar.setValue(&b, 1);
  b = currentPower ? 1 : 0;          powerChar.setValue(&b, 1);
  b = currentZones;                  zonesChar.setValue(&b, 1);
  uint8_t pkBuf[4] = {
    (uint8_t)(currentPasskey & 0xFF),
    (uint8_t)((currentPasskey >> 8) & 0xFF),
    (uint8_t)((currentPasskey >> 16) & 0xFF),
    (uint8_t)((currentPasskey >> 24) & 0xFF)
  };
  passkeyChar.setValue(pkBuf, 4);

  // Build the service and advertise
  svc.addCharacteristic(&colorChar);
  svc.addCharacteristic(&effectChar);
  svc.addCharacteristic(&brightChar);
  svc.addCharacteristic(&speedChar);
  svc.addCharacteristic(&powerChar);
  svc.addCharacteristic(&zonesChar);
  svc.addCharacteristic(&passkeyChar);
  BLE.server()->addService(&svc);
  BLE.server()->setCallbacks(&serverCB);  // restart advertising on disconnect
  BLE.startAdvertising();

  Serial.println("NIU-LED BLE ready (encrypted Just Works pairing)");
  Serial.printf("LEDs: %d on GP%d\n", NUM_LEDS, LED_PIN);
}

void loop() {
  if (currentPower && currentEffect < NUM_EFFECTS) {
    effects[currentEffect]();
  } else if (!currentPower) {
    fill_solid(leds, NUM_LEDS, CRGB::Black);
  }
  FastLED.show();

  // Power-saving: idle the core between frames.  delay() on arduino-pico parks
  // the CPU in a low-power wait rather than busy-spinning.  Animated effects
  // need a tight frame interval; a static/off display can idle much longer.
  delay(effectIsAnimated() ? 16 : 60);
}
