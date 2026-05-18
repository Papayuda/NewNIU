/**
 * BLE LED Controller — Cross-platform BLE service for FastLED ESP32 communication.
 *
 * Uses @capacitor-community/bluetooth-le which supports:
 *   - iOS (CoreBluetooth)
 *   - Android (native BLE)
 *   - Web (Web Bluetooth API fallback for Chrome/Edge)
 *
 * GATT Service UUID: 0000ff00-0000-1000-8000-00805f9b34fb
 * Characteristics:
 *   COLOR      (ff01) — 3 bytes RGB
 *   EFFECT     (ff02) — 1 byte effect ID
 *   BRIGHTNESS (ff03) — 1 byte 0–255
 *   SPEED      (ff04) — 1 byte 0–255
 *   POWER      (ff05) — 1 byte 0/1
 *   ZONES      (ff06) — bitmask 1 byte (bit0=underglow, bit1=dash, bit2=rear, bit3=front, bit4=wheel)
 *   PASSKEY    (ff07) — 4 bytes uint32 LE (100000–999999), user-configurable BLE pairing passkey
 */

import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';

const SERVICE_UUID = numberToUUID(0xff00);
const CHAR_COLOR = numberToUUID(0xff01);
const CHAR_EFFECT = numberToUUID(0xff02);
const CHAR_BRIGHTNESS = numberToUUID(0xff03);
const CHAR_SPEED = numberToUUID(0xff04);
const CHAR_POWER = numberToUUID(0xff05);
const CHAR_ZONES = numberToUUID(0xff06);
const CHAR_PASSKEY = numberToUUID(0xff07);

export const EFFECTS = [
  { id: 0, name: 'Solid', desc: 'Static single color' },
  { id: 1, name: 'Breathing', desc: 'Gentle pulse fade in/out' },
  { id: 2, name: 'Rainbow', desc: 'Smooth rainbow cycle' },
  { id: 3, name: 'Color Cycle', desc: 'Cycle through preset colors' },
  { id: 4, name: 'Strobe', desc: 'Fast on/off flash' },
  { id: 5, name: 'Fire', desc: 'Flickering fire simulation' },
  { id: 6, name: 'Meteor', desc: 'Meteor rain streaks' },
  { id: 7, name: 'Wave', desc: 'Flowing wave pattern' },
  { id: 8, name: 'Twinkle', desc: 'Random sparkle effect' },
  { id: 9, name: 'Chase', desc: 'Theater chase pattern' },
] as const;

export const ZONES = [
  { bit: 0, name: 'Underglow', icon: '⬇' },
  { bit: 1, name: 'Dashboard', icon: '📊' },
  { bit: 2, name: 'Rear', icon: '🔴' },
  { bit: 3, name: 'Front', icon: '💡' },
  { bit: 4, name: 'Wheels', icon: '⭕' },
] as const;

export interface LEDState {
  color: string;
  effectId: number;
  brightness: number;
  speed: number;
  power: boolean;
  zoneMask: number;
}

type StateListener = (state: Partial<LEDState>) => void;
type ConnectionListener = (connected: boolean, name?: string) => void;

class BLELedController {
  private deviceId: string | null = null;
  private _deviceName = '';
  private _connected = false;
  private initialized = false;
  private availableChars = new Set<string>();
  private stateListeners: StateListener[] = [];
  private connectionListeners: ConnectionListener[] = [];

  get connected(): boolean {
    return this._connected;
  }

  get deviceName(): string {
    return this._deviceName;
  }

  onStateChange(fn: StateListener): () => void {
    this.stateListeners.push(fn);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== fn);
    };
  }

  onConnectionChange(fn: ConnectionListener): () => void {
    this.connectionListeners.push(fn);
    return () => {
      this.connectionListeners = this.connectionListeners.filter((l) => l !== fn);
    };
  }

  private notifyState(partial: Partial<LEDState>) {
    this.stateListeners.forEach((fn) => fn(partial));
  }

  private notifyConnection(connected: boolean) {
    this._connected = connected;
    this.connectionListeners.forEach((fn) => fn(connected, this._deviceName));
  }

  async connect(): Promise<void> {
    if (!this.initialized) {
      await BleClient.initialize({ androidNeverForLocation: true });
      this.initialized = true;
    }

    const device = await BleClient.requestDevice({
      services: [SERVICE_UUID],
      optionalServices: [SERVICE_UUID],
    });

    this.deviceId = device.deviceId;
    this._deviceName = device.name ?? 'NIU LED';

    await BleClient.connect(this.deviceId, () => {
      this.notifyConnection(false);
    });

    const services = await BleClient.getServices(this.deviceId);
    const ledService = services.find((s) => s.uuid === SERVICE_UUID);
    if (ledService) {
      for (const c of ledService.characteristics) {
        this.availableChars.add(c.uuid);
      }
    }

    this.notifyConnection(true);
  }

  async disconnect(): Promise<void> {
    if (this.deviceId && this._connected) {
      await BleClient.disconnect(this.deviceId);
    }
    this.deviceId = null;
    this._deviceName = '';
    this.availableChars.clear();
    this.notifyConnection(false);
  }

  async readState(): Promise<LEDState> {
    const state: LEDState = {
      color: '#ff0000',
      effectId: 0,
      brightness: 128,
      speed: 50,
      power: true,
      zoneMask: 0x01,
    };

    if (!this.deviceId) return state;

    if (this.availableChars.has(CHAR_COLOR)) {
      const val = await BleClient.read(this.deviceId, SERVICE_UUID, CHAR_COLOR);
      const r = val.getUint8(0);
      const g = val.getUint8(1);
      const b = val.getUint8(2);
      state.color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    if (this.availableChars.has(CHAR_EFFECT)) {
      const val = await BleClient.read(this.deviceId, SERVICE_UUID, CHAR_EFFECT);
      state.effectId = val.getUint8(0);
    }

    if (this.availableChars.has(CHAR_BRIGHTNESS)) {
      const val = await BleClient.read(this.deviceId, SERVICE_UUID, CHAR_BRIGHTNESS);
      state.brightness = val.getUint8(0);
    }

    if (this.availableChars.has(CHAR_SPEED)) {
      const val = await BleClient.read(this.deviceId, SERVICE_UUID, CHAR_SPEED);
      state.speed = val.getUint8(0);
    }

    if (this.availableChars.has(CHAR_POWER)) {
      const val = await BleClient.read(this.deviceId, SERVICE_UUID, CHAR_POWER);
      state.power = val.getUint8(0) === 1;
    }

    if (this.availableChars.has(CHAR_ZONES)) {
      const val = await BleClient.read(this.deviceId, SERVICE_UUID, CHAR_ZONES);
      state.zoneMask = val.getUint8(0);
    }

    return state;
  }

  async setColor(hex: string): Promise<void> {
    if (!this.deviceId || !this.availableChars.has(CHAR_COLOR)) return;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dv = new DataView(new ArrayBuffer(3));
    dv.setUint8(0, r);
    dv.setUint8(1, g);
    dv.setUint8(2, b);
    await BleClient.write(this.deviceId, SERVICE_UUID, CHAR_COLOR, dv);
    this.notifyState({ color: hex });
  }

  async setEffect(effectId: number): Promise<void> {
    if (!this.deviceId || !this.availableChars.has(CHAR_EFFECT)) return;
    const dv = new DataView(new ArrayBuffer(1));
    dv.setUint8(0, effectId);
    await BleClient.write(this.deviceId, SERVICE_UUID, CHAR_EFFECT, dv);
    this.notifyState({ effectId });
  }

  async setBrightness(brightness: number): Promise<void> {
    if (!this.deviceId || !this.availableChars.has(CHAR_BRIGHTNESS)) return;
    const dv = new DataView(new ArrayBuffer(1));
    dv.setUint8(0, Math.max(0, Math.min(255, brightness)));
    await BleClient.write(this.deviceId, SERVICE_UUID, CHAR_BRIGHTNESS, dv);
    this.notifyState({ brightness });
  }

  async setSpeed(speed: number): Promise<void> {
    if (!this.deviceId || !this.availableChars.has(CHAR_SPEED)) return;
    const dv = new DataView(new ArrayBuffer(1));
    dv.setUint8(0, Math.max(0, Math.min(255, speed)));
    await BleClient.write(this.deviceId, SERVICE_UUID, CHAR_SPEED, dv);
    this.notifyState({ speed });
  }

  async setPower(on: boolean): Promise<void> {
    if (!this.deviceId || !this.availableChars.has(CHAR_POWER)) return;
    const dv = new DataView(new ArrayBuffer(1));
    dv.setUint8(0, on ? 1 : 0);
    await BleClient.write(this.deviceId, SERVICE_UUID, CHAR_POWER, dv);
    this.notifyState({ power: on });
  }

  async setZones(mask: number): Promise<void> {
    if (!this.deviceId || !this.availableChars.has(CHAR_ZONES)) return;
    const dv = new DataView(new ArrayBuffer(1));
    dv.setUint8(0, mask & 0xff);
    await BleClient.write(this.deviceId, SERVICE_UUID, CHAR_ZONES, dv);
    this.notifyState({ zoneMask: mask });
  }

  async readPasskey(): Promise<number | null> {
    if (!this.deviceId || !this.availableChars.has(CHAR_PASSKEY)) return null;
    const val = await BleClient.read(this.deviceId, SERVICE_UUID, CHAR_PASSKEY);
    return val.getUint32(0, true);  // little-endian
  }

  async setPasskey(passkey: number): Promise<void> {
    if (!this.deviceId || !this.availableChars.has(CHAR_PASSKEY)) return;
    if (passkey < 100000 || passkey > 999999) throw new Error('Passkey must be 6 digits (100000–999999)');
    const dv = new DataView(new ArrayBuffer(4));
    dv.setUint32(0, passkey, true);  // little-endian
    await BleClient.write(this.deviceId, SERVICE_UUID, CHAR_PASSKEY, dv);
  }
}

export const bleLed = new BLELedController();
