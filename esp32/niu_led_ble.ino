/*
 * NIU Controller — FastLED BLE Ambient Lighting
 *
 * Hardware: ESP32 + WS2812B LED strip
 * Dependencies: FastLED, ESP32 BLE Arduino
 *
 * BLE Service: 0xFF00 (encrypted, bonded pairing)
 * Characteristics:
 *   0xFF01 — Color (3 bytes: R, G, B)
 *   0xFF02 — Effect (1 byte: 0-9)
 *   0xFF03 — Brightness (1 byte: 0-255)
 *   0xFF04 — Speed (1 byte: 0-255)
 *   0xFF05 — Power (1 byte: 0/1)
 *   0xFF06 — Zones (1 byte: bitmask)
 *
 * Wiring:
 *   ESP32 GPIO5 → WS2812B Data In
 *   ESP32 GND   → WS2812B GND
 *   5V supply   → WS2812B VCC + ESP32 VIN
 *
 * Install via Arduino IDE:
 *   1. Add ESP32 board support (https://dl.espressif.com/dl/package_esp32_index.json)
 *   2. Install FastLED library from Library Manager
 *   3. Select board: ESP32 Dev Module
 *   4. Upload this sketch
 */

#include <FastLED.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <BLESecurity.h>

// ─── LED Configuration ───
// Adjust these for your setup:
#define LED_PIN       5        // GPIO pin connected to LED data
#define NUM_LEDS      60       // Number of LEDs in your strip
#define LED_TYPE      WS2812B  // LED chipset (WS2812B, WS2811, APA102, etc.)
#define COLOR_ORDER   GRB      // Color order (GRB for most WS2812B)
#define MAX_BRIGHTNESS 255

CRGB leds[NUM_LEDS];

// ─── BLE UUIDs ───
#define SERVICE_UUID        "0000ff00-0000-1000-8000-00805f9b34fb"
#define CHAR_COLOR_UUID     "0000ff01-0000-1000-8000-00805f9b34fb"
#define CHAR_EFFECT_UUID    "0000ff02-0000-1000-8000-00805f9b34fb"
#define CHAR_BRIGHT_UUID    "0000ff03-0000-1000-8000-00805f9b34fb"
#define CHAR_SPEED_UUID     "0000ff04-0000-1000-8000-00805f9b34fb"
#define CHAR_POWER_UUID     "0000ff05-0000-1000-8000-00805f9b34fb"
#define CHAR_ZONES_UUID     "0000ff06-0000-1000-8000-00805f9b34fb"

// ─── State ───
uint8_t currentR = 255, currentG = 0, currentB = 0;
uint8_t currentEffect = 0;   // 0=solid,1=breathing,2=rainbow,3=colorCycle,4=strobe,5=fire,6=meteor,7=wave,8=twinkle,9=chase
uint8_t currentBrightness = 128;
uint8_t currentSpeed = 50;
bool    currentPower = true;
uint8_t currentZones = 0x01; // bit0=underglow,bit1=dash,bit2=rear,bit3=front,bit4=wheels
bool    deviceConnected = false;
uint8_t hueOffset = 0;

// ─── BLE Callbacks ───
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* s) {
    deviceConnected = true;
    Serial.println("BLE client connected");
  }
  void onDisconnect(BLEServer* s) {
    deviceConnected = false;
    Serial.println("BLE client disconnected");
    // Restart advertising for reconnection
    BLEDevice::startAdvertising();
  }
};

class ColorCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) {
    uint8_t* d = c->getData();
    if (c->getLength() >= 3) {
      currentR = d[0]; currentG = d[1]; currentB = d[2];
      Serial.printf("Color: #%02x%02x%02x\n", currentR, currentG, currentB);
    }
  }
};

class EffectCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) {
    if (c->getLength() >= 1) {
      currentEffect = c->getData()[0];
      Serial.printf("Effect: %d\n", currentEffect);
    }
  }
};

class BrightCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) {
    if (c->getLength() >= 1) {
      currentBrightness = c->getData()[0];
      FastLED.setBrightness(currentBrightness);
      Serial.printf("Brightness: %d\n", currentBrightness);
    }
  }
};

class SpeedCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) {
    if (c->getLength() >= 1) {
      currentSpeed = c->getData()[0];
      Serial.printf("Speed: %d\n", currentSpeed);
    }
  }
};

class PowerCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) {
    if (c->getLength() >= 1) {
      currentPower = c->getData()[0] == 1;
      Serial.printf("Power: %s\n", currentPower ? "ON" : "OFF");
    }
  }
};

class ZonesCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) {
    if (c->getLength() >= 1) {
      currentZones = c->getData()[0];
      Serial.printf("Zones: 0x%02x\n", currentZones);
    }
  }
};

// ─── Security (encrypted bonding with MITM protection) ───
class SecurityCallback : public BLESecurityCallbacks {
  uint32_t onPassKeyRequest() { return 123456; }
  void onPassKeyNotify(uint32_t passkey) {
    Serial.printf("Passkey: %d\n", passkey);
  }
  bool onConfirmPIN(uint32_t pin) { return true; }
  bool onSecurityRequest() { return true; }
  void onAuthenticationComplete(esp_ble_auth_cmpl_t auth) {
    if (auth.success) {
      Serial.println("BLE authentication success (encrypted + bonded)");
    } else {
      Serial.println("BLE authentication failed");
    }
  }
};

// ─── LED Effects ───

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
    leds[i] = CRGB(
      scale8(currentR, wave),
      scale8(currentG, wave),
      scale8(currentB, wave)
    );
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
    leds[i] = ((i + offset) % 3 == 0)
      ? CRGB(currentR, currentG, currentB)
      : CRGB::Black;
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

// ─── Helper: create encrypted R/W characteristic ───
BLECharacteristic* createChar(BLEService* svc, const char* uuid,
    BLECharacteristicCallbacks* cb) {
  BLECharacteristic* c = svc->createCharacteristic(uuid,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE);
  c->setCallbacks(cb);
  c->setAccessPermissions(
    ESP_GATT_PERM_READ_ENCRYPTED | ESP_GATT_PERM_WRITE_ENCRYPTED);
  return c;
}

void setup() {
  Serial.begin(115200);
  Serial.println("NIU LED Controller starting...");

  // Initialize FastLED
  FastLED.addLeds<LED_TYPE, LED_PIN, COLOR_ORDER>(leds, NUM_LEDS)
    .setCorrection(TypicalLEDStrip);
  FastLED.setBrightness(currentBrightness);
  FastLED.clear();
  FastLED.show();

  // Initialize BLE with encryption
  BLEDevice::init("NIU-LED");
  BLEDevice::setEncryptionLevel(ESP_BLE_SEC_ENCRYPT_MITM);
  BLEDevice::setSecurityCallbacks(new SecurityCallback());

  BLESecurity* security = new BLESecurity();
  security->setAuthenticationMode(ESP_LE_AUTH_REQ_SC_MITM_BOND);
  security->setCapability(ESP_IO_CAP_OUT);
  security->setInitEncryptionKey(
    ESP_BLE_ENC_KEY_MASK | ESP_BLE_ID_KEY_MASK);

  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService* svc = server->createService(SERVICE_UUID);

  // Create characteristics with encrypted access
  BLECharacteristic* colorChar = createChar(svc, CHAR_COLOR_UUID, new ColorCallback());
  uint8_t initColor[] = {currentR, currentG, currentB};
  colorChar->setValue(initColor, 3);

  BLECharacteristic* effectChar = createChar(svc, CHAR_EFFECT_UUID, new EffectCallback());
  effectChar->setValue(&currentEffect, 1);

  BLECharacteristic* brightChar = createChar(svc, CHAR_BRIGHT_UUID, new BrightCallback());
  brightChar->setValue(&currentBrightness, 1);

  BLECharacteristic* speedChar = createChar(svc, CHAR_SPEED_UUID, new SpeedCallback());
  speedChar->setValue(&currentSpeed, 1);

  uint8_t powerVal = currentPower ? 1 : 0;
  BLECharacteristic* powerChar = createChar(svc, CHAR_POWER_UUID, new PowerCallback());
  powerChar->setValue(&powerVal, 1);

  BLECharacteristic* zoneChar = createChar(svc, CHAR_ZONES_UUID, new ZonesCallback());
  zoneChar->setValue(&currentZones, 1);

  svc->start();

  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  adv->setMinPreferred(0x06);
  adv->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("NIU-LED BLE ready (encrypted + bonded pairing)");
  Serial.printf("LEDs: %d on GPIO%d\n", NUM_LEDS, LED_PIN);
}

void loop() {
  if (currentPower && currentEffect < NUM_EFFECTS) {
    effects[currentEffect]();
  } else if (!currentPower) {
    FastLED.clear();
  }
  FastLED.show();
  delay(max(5, 30 - (int)currentSpeed / 10));
}
