/**
 * BLE LED Controller — Web Bluetooth API service for FastLED ESP32 communication.
 *
 * GATT Service UUID: 0000ff00-0000-1000-8000-00805f9b34fb
 * Characteristics:
 *   COLOR      (ff01) — 3 bytes RGB
 *   EFFECT     (ff02) — 1 byte effect ID
 *   BRIGHTNESS (ff03) — 1 byte 0–255
 *   SPEED      (ff04) — 1 byte 0–255
 *   POWER      (ff05) — 1 byte 0/1
 *   ZONES      (ff06) — bitmask 1 byte (bit0=underglow, bit1=dash, bit2=rear, bit3=front, bit4=wheel)
 */

const SERVICE_UUID = 0xff00;
const CHAR_COLOR = 0xff01;
const CHAR_EFFECT = 0xff02;
const CHAR_BRIGHTNESS = 0xff03;
const CHAR_SPEED = 0xff04;
const CHAR_POWER = 0xff05;
const CHAR_ZONES = 0xff06;

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
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private chars: Map<number, BluetoothRemoteGATTCharacteristic> = new Map();
  private stateListeners: StateListener[] = [];
  private connectionListeners: ConnectionListener[] = [];

  get connected(): boolean {
    return !!this.server?.connected;
  }

  get deviceName(): string {
    return this.device?.name ?? '';
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
    this.connectionListeners.forEach((fn) => fn(connected, this.deviceName));
  }

  async connect(): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth is not supported in this browser. Use Chrome or Edge.');
    }
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    });

    this.device.addEventListener('gattserverdisconnected', () => {
      this.notifyConnection(false);
    });

    this.server = await this.device.gatt!.connect();
    this.service = await this.server.getPrimaryService(SERVICE_UUID);

    const charUuids = [CHAR_COLOR, CHAR_EFFECT, CHAR_BRIGHTNESS, CHAR_SPEED, CHAR_POWER, CHAR_ZONES];
    for (const uuid of charUuids) {
      try {
        const char = await this.service.getCharacteristic(uuid);
        this.chars.set(uuid, char);
      } catch {
        // characteristic not available on this device
      }
    }

    this.notifyConnection(true);
  }

  async disconnect(): Promise<void> {
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this.device = null;
    this.server = null;
    this.service = null;
    this.chars.clear();
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

    const colorChar = this.chars.get(CHAR_COLOR);
    if (colorChar) {
      const val = await colorChar.readValue();
      const r = val.getUint8(0);
      const g = val.getUint8(1);
      const b = val.getUint8(2);
      state.color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    const effectChar = this.chars.get(CHAR_EFFECT);
    if (effectChar) {
      const val = await effectChar.readValue();
      state.effectId = val.getUint8(0);
    }

    const brightChar = this.chars.get(CHAR_BRIGHTNESS);
    if (brightChar) {
      const val = await brightChar.readValue();
      state.brightness = val.getUint8(0);
    }

    const speedChar = this.chars.get(CHAR_SPEED);
    if (speedChar) {
      const val = await speedChar.readValue();
      state.speed = val.getUint8(0);
    }

    const powerChar = this.chars.get(CHAR_POWER);
    if (powerChar) {
      const val = await powerChar.readValue();
      state.power = val.getUint8(0) === 1;
    }

    const zoneChar = this.chars.get(CHAR_ZONES);
    if (zoneChar) {
      const val = await zoneChar.readValue();
      state.zoneMask = val.getUint8(0);
    }

    return state;
  }

  async setColor(hex: string): Promise<void> {
    const char = this.chars.get(CHAR_COLOR);
    if (!char) return;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    await char.writeValue(new Uint8Array([r, g, b]));
    this.notifyState({ color: hex });
  }

  async setEffect(effectId: number): Promise<void> {
    const char = this.chars.get(CHAR_EFFECT);
    if (!char) return;
    await char.writeValue(new Uint8Array([effectId]));
    this.notifyState({ effectId });
  }

  async setBrightness(brightness: number): Promise<void> {
    const char = this.chars.get(CHAR_BRIGHTNESS);
    if (!char) return;
    await char.writeValue(new Uint8Array([Math.max(0, Math.min(255, brightness))]));
    this.notifyState({ brightness });
  }

  async setSpeed(speed: number): Promise<void> {
    const char = this.chars.get(CHAR_SPEED);
    if (!char) return;
    await char.writeValue(new Uint8Array([Math.max(0, Math.min(255, speed))]));
    this.notifyState({ speed });
  }

  async setPower(on: boolean): Promise<void> {
    const char = this.chars.get(CHAR_POWER);
    if (!char) return;
    await char.writeValue(new Uint8Array([on ? 1 : 0]));
    this.notifyState({ power: on });
  }

  async setZones(mask: number): Promise<void> {
    const char = this.chars.get(CHAR_ZONES);
    if (!char) return;
    await char.writeValue(new Uint8Array([mask & 0xff]));
    this.notifyState({ zoneMask: mask });
  }
}

export const bleLed = new BLELedController();
