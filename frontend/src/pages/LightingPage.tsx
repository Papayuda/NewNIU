import { useEffect, useState, useCallback } from 'react';
import {
  Bluetooth,
  BluetoothOff,
  Power,
  Sun,
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { bleLed, EFFECTS, ZONES, type LEDState } from '../services/ble-led';

const PRESET_COLORS = [
  '#ff0000', '#ff4500', '#ff8c00', '#ffd700',
  '#00ff00', '#00fa9a', '#00ffff', '#00bfff',
  '#0000ff', '#8a2be2', '#ff00ff', '#ff1493',
  '#ffffff', '#ffb6c1', '#98fb98', '#87cefa',
];

export default function LightingPage() {
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [state, setState] = useState<LEDState>({
    color: '#ff0000',
    effectId: 0,
    brightness: 128,
    speed: 50,
    power: true,
    zoneMask: 0x01,
  });
  const [sketchOpen, setSketchOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [passkey, setPasskey] = useState('123456');
  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeySaving, setPasskeySaving] = useState(false);
  const [passkeyMsg, setPasskeyMsg] = useState('');

  useEffect(() => {
    const unsubConn = bleLed.onConnectionChange((isConnected, name) => {
      setConnected(isConnected);
      setDeviceName(name ?? '');
      if (!isConnected) setError('');
    });
    const unsubState = bleLed.onStateChange((partial) => {
      setState((prev) => ({ ...prev, ...partial }));
    });
    return () => {
      unsubConn();
      unsubState();
    };
  }, []);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    setError('');
    try {
      await bleLed.connect();
      const s = await bleLed.readState();
      setState(s);
      const pk = await bleLed.readPasskey();
      if (pk !== null) {
        setPasskey(String(pk));
        setPasskeyInput(String(pk));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    await bleLed.disconnect();
  }, []);

  const handleColorChange = useCallback(async (color: string) => {
    setState((prev) => ({ ...prev, color }));
    if (connected) {
      try { await bleLed.setColor(color); } catch { /* offline fallback */ }
    }
  }, [connected]);

  const handleEffectChange = useCallback(async (effectId: number) => {
    setState((prev) => ({ ...prev, effectId }));
    if (connected) {
      try { await bleLed.setEffect(effectId); } catch { /* offline fallback */ }
    }
  }, [connected]);

  const handleBrightnessChange = useCallback(async (brightness: number) => {
    setState((prev) => ({ ...prev, brightness }));
    if (connected) {
      try { await bleLed.setBrightness(brightness); } catch { /* offline fallback */ }
    }
  }, [connected]);

  const handleSpeedChange = useCallback(async (speed: number) => {
    setState((prev) => ({ ...prev, speed }));
    if (connected) {
      try { await bleLed.setSpeed(speed); } catch { /* offline fallback */ }
    }
  }, [connected]);

  const handlePowerToggle = useCallback(async () => {
    const newPower = !state.power;
    setState((prev) => ({ ...prev, power: newPower }));
    if (connected) {
      try { await bleLed.setPower(newPower); } catch { /* offline fallback */ }
    }
  }, [connected, state.power]);

  const handleZoneToggle = useCallback(async (bit: number) => {
    const newMask = state.zoneMask ^ (1 << bit);
    setState((prev) => ({ ...prev, zoneMask: newMask }));
    if (connected) {
      try { await bleLed.setZones(newMask); } catch { /* offline fallback */ }
    }
  }, [connected, state.zoneMask]);

  const copySketch = useCallback(() => {
    navigator.clipboard.writeText(ESP32_SKETCH);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Ambient Lighting</h1>
          <p className="text-text-muted text-sm mt-1">FastLED control via encrypted Bluetooth</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePowerToggle}
            className={`p-2.5 rounded-xl border transition-all ${
              state.power
                ? 'bg-niu-cyan/15 border-niu-cyan/50 text-niu-cyan'
                : 'bg-dark-700 border-dark-500 text-text-muted'
            }`}
          >
            <Power className="w-5 h-5" />
          </button>
          {connected ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-all"
            >
              <Bluetooth className="w-4 h-4" />
              {deviceName || 'Connected'}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-700 border border-dark-500 text-text-secondary text-sm font-medium hover:text-niu-cyan hover:border-niu-cyan/50 transition-all disabled:opacity-50"
            >
              {connecting ? (
                <div className="w-4 h-4 border-2 border-niu-cyan/30 border-t-niu-cyan rounded-full animate-spin" />
              ) : (
                <BluetoothOff className="w-4 h-4" />
              )}
              {connecting ? 'Scanning...' : 'Connect BLE'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-niu-red/10 border border-niu-red/30 text-niu-red text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Color Picker */}
        <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-niu-cyan" />
            Color
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <input
              type="color"
              value={state.color}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-16 h-16 rounded-xl border-2 border-dark-500 cursor-pointer bg-transparent"
            />
            <div>
              <p className="text-text-primary font-mono text-lg">{state.color.toUpperCase()}</p>
              <p className="text-text-muted text-xs">Tap the swatch or pick a preset below</p>
            </div>
          </div>
          <div className="grid grid-cols-8 gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleColorChange(c)}
                className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${
                  state.color === c ? 'border-white shadow-lg' : 'border-dark-500'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Effects */}
        <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-400" />
            Effects
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {EFFECTS.map((effect) => (
              <button
                key={effect.id}
                onClick={() => handleEffectChange(effect.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  state.effectId === effect.id
                    ? 'bg-violet-500/15 border-violet-500/50 text-violet-300'
                    : 'bg-dark-700 border-dark-500 text-text-secondary hover:border-dark-400'
                }`}
              >
                <p className="text-sm font-medium">{effect.name}</p>
                <p className="text-xs text-text-muted mt-0.5">{effect.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Brightness & Speed */}
        <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
          <h2 className="text-lg font-semibold text-text-primary mb-5 flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-400" />
            Controls
          </h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-text-secondary">Brightness</span>
                <span className="text-sm font-mono text-text-primary">{state.brightness}</span>
              </div>
              <input
                type="range"
                min={0}
                max={255}
                value={state.brightness}
                onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                className="w-full h-2 bg-dark-600 rounded-full appearance-none cursor-pointer accent-amber-400"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-text-secondary">Effect Speed</span>
                <span className="text-sm font-mono text-text-primary">{state.speed}</span>
              </div>
              <input
                type="range"
                min={0}
                max={255}
                value={state.speed}
                onChange={(e) => handleSpeedChange(Number(e.target.value))}
                className="w-full h-2 bg-dark-600 rounded-full appearance-none cursor-pointer accent-niu-cyan"
              />
            </div>
          </div>
        </div>

        {/* Zones */}
        <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
          <h2 className="text-lg font-semibold text-text-primary mb-4">LED Zones</h2>
          <div className="space-y-2">
            {ZONES.map((zone) => {
              const active = (state.zoneMask & (1 << zone.bit)) !== 0;
              return (
                <button
                  key={zone.bit}
                  onClick={() => handleZoneToggle(zone.bit)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    active
                      ? 'bg-niu-cyan/10 border-niu-cyan/40 text-niu-cyan'
                      : 'bg-dark-700 border-dark-500 text-text-muted hover:border-dark-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{zone.icon}</span>
                    <span className="text-sm font-medium">{zone.name}</span>
                  </div>
                  <div
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      active ? 'bg-niu-cyan' : 'bg-dark-500'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        active ? 'left-5' : 'left-1'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Live Preview</h2>
        <div className="relative w-full h-48 rounded-xl bg-dark-900 overflow-hidden flex items-center justify-center">
          {state.power ? (
            <>
              <div
                className="absolute inset-0 opacity-30 transition-all duration-500"
                style={{
                  background: `radial-gradient(ellipse at center, ${state.color}66 0%, transparent 70%)`,
                }}
              />
              <div className="relative flex flex-col items-center gap-2">
                <div
                  className="w-20 h-20 rounded-full shadow-2xl transition-all duration-300"
                  style={{
                    backgroundColor: state.color,
                    opacity: state.brightness / 255,
                    boxShadow: `0 0 ${40 + state.brightness / 3}px ${state.color}`,
                    animation: state.effectId === 1
                      ? 'pulse 2s ease-in-out infinite'
                      : state.effectId === 4
                        ? 'pulse 0.1s ease-in-out infinite'
                        : undefined,
                  }}
                />
                <span className="text-text-muted text-xs">
                  {EFFECTS.find((e) => e.id === state.effectId)?.name ?? 'Unknown'}
                </span>
              </div>
            </>
          ) : (
            <div className="text-text-muted flex flex-col items-center gap-2">
              <Power className="w-10 h-10" />
              <span className="text-sm">LEDs Off</span>
            </div>
          )}
        </div>
      </div>

      {/* BLE Security / Passkey */}
      <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-400" />
          BLE Security
        </h2>
        <p className="text-text-muted text-sm mb-4">
          Set a custom 6-digit passkey for BLE pairing. Both the ESP32 and your phone must use this passkey to connect. Changing the passkey clears all existing bonds — devices must re-pair.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs text-text-muted mb-1">Pairing Passkey (6 digits)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={passkeyInput}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                setPasskeyInput(val);
                setPasskeyMsg('');
              }}
              placeholder="123456"
              className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-text-primary font-mono text-lg tracking-widest focus:outline-none focus:border-emerald-400 transition-colors"
            />
          </div>
          <button
            disabled={!connected || passkeySaving || passkeyInput.length !== 6 || parseInt(passkeyInput) < 100000}
            onClick={async () => {
              setPasskeySaving(true);
              setPasskeyMsg('');
              try {
                await bleLed.setPasskey(parseInt(passkeyInput));
                setPasskey(passkeyInput);
                setPasskeyMsg('Passkey updated — re-pair required');
              } catch (e) {
                setPasskeyMsg(e instanceof Error ? e.message : 'Failed to update');
              } finally {
                setPasskeySaving(false);
              }
            }}
            className="mt-5 flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {passkeySaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
        {passkeyMsg && (
          <p className={`mt-3 text-sm ${
            passkeyMsg.includes('updated') ? 'text-emerald-400' : 'text-niu-red'
          }`}>
            {passkeyMsg}
          </p>
        )}
        {!connected && (
          <p className="mt-3 text-xs text-text-muted">
            Connect to your ESP32 via BLE to read or change the passkey.
          </p>
        )}
        {connected && passkey !== passkeyInput && passkeyInput.length === 6 && (
          <p className="mt-3 text-xs text-amber-400">
            Current device passkey: {passkey} — unsaved changes
          </p>
        )}
      </div>

      {/* ESP32 Sketch */}
      <div className="bg-dark-800 rounded-2xl border border-dark-600 overflow-hidden">
        <button
          onClick={() => setSketchOpen(!sketchOpen)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-dark-700 transition-colors"
        >
          <div>
            <h2 className="text-lg font-semibold text-text-primary">ESP32 Arduino Sketch</h2>
            <p className="text-text-muted text-sm mt-1">
              Ready-to-flash code for ESP32 + FastLED with encrypted BLE
            </p>
          </div>
          {sketchOpen ? (
            <ChevronUp className="w-5 h-5 text-text-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-muted" />
          )}
        </button>
        {sketchOpen && (
          <div className="border-t border-dark-600">
            <div className="flex justify-end p-2 bg-dark-900">
              <button
                onClick={copySketch}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-700 border border-dark-500 text-text-secondary text-xs hover:text-niu-cyan hover:border-niu-cyan/50 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-6 text-sm text-text-secondary overflow-x-auto bg-dark-900 font-mono leading-relaxed max-h-[500px] overflow-y-auto">
              {ESP32_SKETCH}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

const ESP32_SKETCH = `/*
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
 *   0xFF07 — Passkey (4 bytes: uint32 LE, 100000-999999)
 *
 * Wiring:
 *   ESP32 GPIO5 -> WS2812B Data In
 *   ESP32 GND   -> WS2812B GND
 *   5V supply   -> WS2812B VCC + ESP32 VIN
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
#include <Preferences.h>

// --- LED Configuration ---
// Adjust these for your setup:
#define LED_PIN       5        // GPIO pin connected to LED data
#define NUM_LEDS      60       // Number of LEDs in your strip
#define LED_TYPE      WS2812B  // LED chipset (WS2812B, WS2811, APA102, etc.)
#define COLOR_ORDER   GRB      // Color order (GRB for most WS2812B)
#define MAX_BRIGHTNESS 255

CRGB leds[NUM_LEDS];

// --- BLE UUIDs ---
#define SERVICE_UUID        "0000ff00-0000-1000-8000-00805f9b34fb"
#define CHAR_COLOR_UUID     "0000ff01-0000-1000-8000-00805f9b34fb"
#define CHAR_EFFECT_UUID    "0000ff02-0000-1000-8000-00805f9b34fb"
#define CHAR_BRIGHT_UUID    "0000ff03-0000-1000-8000-00805f9b34fb"
#define CHAR_SPEED_UUID     "0000ff04-0000-1000-8000-00805f9b34fb"
#define CHAR_POWER_UUID     "0000ff05-0000-1000-8000-00805f9b34fb"
#define CHAR_ZONES_UUID     "0000ff06-0000-1000-8000-00805f9b34fb"
#define CHAR_PASSKEY_UUID   "0000ff07-0000-1000-8000-00805f9b34fb"

// --- State ---
uint8_t currentR = 255, currentG = 0, currentB = 0;
uint8_t currentEffect = 0;
uint8_t currentBrightness = 128;
uint8_t currentSpeed = 50;
bool    currentPower = true;
uint8_t currentZones = 0x01;
bool    deviceConnected = false;
uint8_t hueOffset = 0;

// --- Passkey (stored in NVS, user-configurable) ---
Preferences prefs;
uint32_t currentPasskey = 123456;  // default

void loadPasskey() {
  prefs.begin("ble", true);
  currentPasskey = prefs.getUInt("passkey", 123456);
  prefs.end();
}

void savePasskey(uint32_t pk) {
  currentPasskey = pk;
  prefs.begin("ble", false);
  prefs.putUInt("passkey", pk);
  prefs.end();
}

// --- BLE Callbacks ---
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* s) {
    deviceConnected = true;
    Serial.println("BLE client connected");
  }
  void onDisconnect(BLEServer* s) {
    deviceConnected = false;
    Serial.println("BLE client disconnected");
    BLEDevice::startAdvertising();
  }
};

class ColorCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) {
    uint8_t* d = c->getData();
    if (c->getLength() >= 3) {
      currentR = d[0]; currentG = d[1]; currentB = d[2];
      Serial.printf("Color: #%02x%02x%02x\\n", currentR, currentG, currentB);
    }
  }
};

class EffectCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) {
    if (c->getLength() >= 1) {
      currentEffect = c->getData()[0];
      Serial.printf("Effect: %d\\n", currentEffect);
    }
  }
};

class BrightCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) {
    if (c->getLength() >= 1) {
      currentBrightness = c->getData()[0];
      FastLED.setBrightness(currentBrightness);
      Serial.printf("Brightness: %d\\n", currentBrightness);
    }
  }
};

class SpeedCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) {
    if (c->getLength() >= 1) {
      currentSpeed = c->getData()[0];
      Serial.printf("Speed: %d\\n", currentSpeed);
    }
  }
};

class PowerCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) {
    if (c->getLength() >= 1) {
      currentPower = c->getData()[0] == 1;
      Serial.printf("Power: %s\\n", currentPower ? "ON" : "OFF");
    }
  }
};

class ZonesCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) {
    if (c->getLength() >= 1) {
      currentZones = c->getData()[0];
      Serial.printf("Zones: 0x%02x\\n", currentZones);
    }
  }
};

// --- Passkey Characteristic ---
class PasskeyCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) {
    if (c->getLength() >= 4) {
      uint8_t* d = c->getData();
      uint32_t newKey = d[0] | (d[1] << 8) | (d[2] << 16) | (d[3] << 24);
      if (newKey >= 100000 && newKey <= 999999) {
        savePasskey(newKey);
        esp_ble_gap_set_security_param(ESP_BLE_SM_SET_STATIC_PASSKEY,
          &currentPasskey, sizeof(uint32_t));
        // Clear existing bonds so new passkey takes effect
        int count = esp_ble_get_bond_device_num();
        if (count > 0) {
          esp_ble_bond_dev_t* devs = (esp_ble_bond_dev_t*)malloc(
            count * sizeof(esp_ble_bond_dev_t));
          if (devs) {
            esp_ble_get_bond_device_list(&count, devs);
            for (int i = 0; i < count; i++) {
              esp_ble_remove_bond_device(devs[i].bd_addr);
            }
            free(devs);
          }
        }
        Serial.printf("Passkey updated to: %u (re-pair required)\\n", newKey);
      }
    }
  }
  void onRead(BLECharacteristic* c) {
    uint8_t buf[4];
    buf[0] = currentPasskey & 0xFF;
    buf[1] = (currentPasskey >> 8) & 0xFF;
    buf[2] = (currentPasskey >> 16) & 0xFF;
    buf[3] = (currentPasskey >> 24) & 0xFF;
    c->setValue(buf, 4);
  }
};

static BLEServer* g_pServer = nullptr;

// --- Security (encrypted bonding with MITM protection) ---
class SecurityCallback : public BLESecurityCallbacks {
  uint32_t onPassKeyRequest() { return currentPasskey; }
  void onPassKeyNotify(uint32_t passkey) {
    Serial.printf("Passkey: %d\\n", passkey);
  }
  bool onConfirmPIN(uint32_t pin) { return true; }
  bool onSecurityRequest() { return true; }
  void onAuthenticationComplete(esp_ble_auth_cmpl_t auth) {
    if (auth.success) {
      Serial.println("BLE authentication success (encrypted + bonded)");
    } else {
      Serial.println("BLE authentication failed — disconnecting client");
      if (g_pServer != nullptr) {
        g_pServer->disconnect(g_pServer->getConnId());
      }
    }
  }
};

// --- LED Effects ---

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

// --- Helper: create encrypted R/W characteristic ---
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

  FastLED.addLeds<LED_TYPE, LED_PIN, COLOR_ORDER>(leds, NUM_LEDS)
    .setCorrection(TypicalLEDStrip);
  FastLED.setBrightness(currentBrightness);
  FastLED.clear();
  FastLED.show();

  // Load user-configured passkey from NVS (default: 123456)
  loadPasskey();
  Serial.printf("Passkey: %u\\n", currentPasskey);

  // Initialize BLE with encryption
  BLEDevice::init("NIU-LED");
  BLEDevice::setEncryptionLevel(ESP_BLE_SEC_ENCRYPT_MITM);
  BLEDevice::setSecurityCallbacks(new SecurityCallback());

  BLESecurity* security = new BLESecurity();
  security->setAuthenticationMode(ESP_LE_AUTH_REQ_SC_MITM_BOND);
  security->setCapability(ESP_IO_CAP_OUT);
  security->setInitEncryptionKey(
    ESP_BLE_ENC_KEY_MASK | ESP_BLE_ID_KEY_MASK);

  // Set static passkey from NVS
  esp_ble_gap_set_security_param(ESP_BLE_SM_SET_STATIC_PASSKEY,
    &currentPasskey, sizeof(uint32_t));

  BLEServer* server = BLEDevice::createServer();
  g_pServer = server;
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

  // Passkey characteristic -- lets the app read/update the BLE pairing passkey
  BLECharacteristic* passkeyChar = createChar(svc, CHAR_PASSKEY_UUID, new PasskeyCallback());
  uint8_t pkBuf[4] = {
    (uint8_t)(currentPasskey & 0xFF),
    (uint8_t)((currentPasskey >> 8) & 0xFF),
    (uint8_t)((currentPasskey >> 16) & 0xFF),
    (uint8_t)((currentPasskey >> 24) & 0xFF)
  };
  passkeyChar->setValue(pkBuf, 4);

  svc->start();

  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  adv->setMinPreferred(0x06);
  adv->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("NIU-LED BLE ready (encrypted + bonded pairing)");
  Serial.printf("LEDs: %d on GPIO%d\\n", NUM_LEDS, LED_PIN);
}

void loop() {
  if (currentPower && currentEffect < NUM_EFFECTS) {
    effects[currentEffect]();
  } else if (!currentPower) {
    FastLED.clear();
  }
  FastLED.show();
  delay(max(5, 30 - (int)currentSpeed / 10));
}`;
