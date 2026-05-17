import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  type EmitterSubscription,
} from 'react-native';
import BleManager from 'react-native-ble-manager';

export const NIU_SERVICE_UUID = '8ec94e30-f315-4f60-9fb8-838830daea50';
export const NIU_WRITE_CHARACTERISTIC_UUID =
  '8ec94e32-f315-4f60-9fb8-838830daea50';
export const NIU_NOTIFY_CHARACTERISTIC_UUID =
  '8ec94e31-f315-4f60-9fb8-838830daea50';

const NIU_DISCOVERY_SERVICE_UUIDS = [
  NIU_SERVICE_UUID,
  '00010203-0405-0607-0809-0a0b0c0d1912',
  '00010203-0405-0607-0809-0a0b0c0d1915',
];

export const NIU_AUTH_WAKE_HEX = '060101011A1B314F421966216B407C2E';
export const NIU_AUTH_SESSION_HEX = '0201010125986A6D7873473C5C5D124C';
export const NIU_LOCK_HEX = '05000630303030303025986A6D476152';
export const NIU_UNLOCK_HEX = '05010630303030303025986A6D476152';

type BleAdvertising = {
  localName?: string;
  serviceUUIDs?: string[];
  serviceUuids?: string[];
  services?: string[];
};

type BlePeripheral = {
  id: string;
  name?: string;
  rssi?: number;
  advertising?: BleAdvertising;
};

type DisconnectEvent = {
  peripheral: string;
};

type NotificationEvent = {
  value?: number[];
  peripheral?: string;
  characteristic?: string;
  service?: string;
};

export type BluetoothState = {
  isBluetoothReady: boolean;
  isScanning: boolean;
  isConnected: boolean;
  peripheralId: string | null;
  peripheralName: string | null;
  rssi: number | null;
  lastError: string | null;
  lastNotificationHex: string | null;
};

type StateListener = (state: BluetoothState) => void;
type NotificationListener = (hex: string, bytes: number[]) => void;

const STORAGE_LAST_PERIPHERAL_ID = 'niu:last-peripheral-id';
const SCAN_SECONDS = 8;
const WRITE_CHUNK_BYTES = 20;
const WRITE_QUEUE_SLEEP_MS = 35;

const initialState: BluetoothState = {
  isBluetoothReady: false,
  isScanning: false,
  isConnected: false,
  peripheralId: null,
  peripheralName: null,
  rssi: null,
  lastError: null,
  lastNotificationHex: null,
};

export class BluetoothService {
  private readonly bleEmitter = new NativeEventEmitter(
    NativeModules.BleManager,
  );
  private readonly stateListeners = new Set<StateListener>();
  private readonly notificationListeners = new Set<NotificationListener>();
  private subscriptions: EmitterSubscription[] = [];
  private state: BluetoothState = initialState;
  private started = false;
  private commandQueue = Promise.resolve();
  private connectionPromise: Promise<void> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    const hasPermissions = await this.requestRequiredPermissions();
    if (!hasPermissions) {
      this.setState({ lastError: 'Bluetooth permissions were denied.' });
      return;
    }

    await BleManager.start({ showAlert: false });
    this.started = true;
    this.setState({ isBluetoothReady: true, lastError: null });
    this.bindEvents();
  }

  destroy(): void {
    this.clearReconnectTimer();
    this.subscriptions.forEach(subscription => subscription.remove());
    this.subscriptions = [];
    this.stateListeners.clear();
    this.notificationListeners.clear();
    this.started = false;
  }

  subscribe(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  subscribeNotifications(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  getState(): BluetoothState {
    return this.state;
  }

  async scanAndConnect(): Promise<void> {
    await this.start();
    this.clearReconnectTimer();

    const storedPeripheralId = await AsyncStorage.getItem(
      STORAGE_LAST_PERIPHERAL_ID,
    );
    if (storedPeripheralId) {
      try {
        await this.connect(storedPeripheralId);
        return;
      } catch (error) {
        this.setState({ lastError: this.errorMessage(error) });
      }
    }

    const connectedPeripherals = await BleManager.getConnectedPeripherals(
      NIU_DISCOVERY_SERVICE_UUIDS,
    );
    const connectedNiuPeripheral = connectedPeripherals.find(peripheral =>
      this.isMatchingPeripheral(peripheral as BlePeripheral),
    );

    if (connectedNiuPeripheral) {
      await this.connect(connectedNiuPeripheral.id);
      return;
    }

    await this.scanForScooter();
  }

  async scanForScooter(): Promise<void> {
    await this.start();

    if (this.state.isScanning) {
      await BleManager.stopScan();
    }

    this.setState({ isScanning: true, lastError: null });
    await BleManager.scan([], SCAN_SECONDS, false);
  }

  async connect(
    peripheralId: string,
    name?: string,
    rssi?: number,
  ): Promise<void> {
    if (this.state.isConnected && this.state.peripheralId === peripheralId) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connectInternal(
      peripheralId,
      name,
      rssi,
    ).finally(() => {
      this.connectionPromise = null;
    });

    return this.connectionPromise;
  }

  async disconnect(): Promise<void> {
    this.clearReconnectTimer();
    if (!this.state.peripheralId) {
      return;
    }

    await BleManager.disconnect(this.state.peripheralId);
    this.setState({
      isConnected: false,
      peripheralId: null,
      peripheralName: null,
      rssi: null,
    });
  }

  async lockScooter(): Promise<void> {
    await this.writeCommandSequence([
      NIU_AUTH_WAKE_HEX,
      NIU_AUTH_SESSION_HEX,
      NIU_LOCK_HEX,
    ]);
  }

  async unlockScooter(): Promise<void> {
    await this.writeCommandSequence([
      NIU_AUTH_WAKE_HEX,
      NIU_AUTH_SESSION_HEX,
      NIU_UNLOCK_HEX,
    ]);
  }

  async writeHexCommand(hexCommand: string): Promise<void> {
    await this.enqueueCommand(async () => {
      if (!this.state.peripheralId || !this.state.isConnected) {
        throw new Error('No NIU scooter is connected.');
      }

      const bytes = this.hexToBytes(hexCommand);
      try {
        await BleManager.write(
          this.state.peripheralId,
          NIU_SERVICE_UUID,
          NIU_WRITE_CHARACTERISTIC_UUID,
          bytes,
          WRITE_CHUNK_BYTES,
        );
      } catch {
        await BleManager.writeWithoutResponse(
          this.state.peripheralId,
          NIU_SERVICE_UUID,
          NIU_WRITE_CHARACTERISTIC_UUID,
          bytes,
          WRITE_CHUNK_BYTES,
          WRITE_QUEUE_SLEEP_MS,
        );
      }
    });
  }

  private async connectInternal(
    peripheralId: string,
    name?: string,
    rssi?: number,
  ): Promise<void> {
    if (this.state.isScanning) {
      await BleManager.stopScan();
    }

    this.setState({ isScanning: false, lastError: null });
    await BleManager.connect(peripheralId);
    await this.delay(350);
    await BleManager.retrieveServices(peripheralId);
    let notificationError: string | null = null;

    try {
      await BleManager.startNotification(
        peripheralId,
        NIU_SERVICE_UUID,
        NIU_NOTIFY_CHARACTERISTIC_UUID,
      );
    } catch (error) {
      notificationError = `Connected, but notifications failed: ${this.errorMessage(
        error,
      )}`;
      this.setState({ lastError: notificationError });
    }

    await AsyncStorage.setItem(STORAGE_LAST_PERIPHERAL_ID, peripheralId);
    this.reconnectAttempts = 0;
    this.setState({
      isConnected: true,
      peripheralId,
      peripheralName: name ?? this.state.peripheralName ?? 'NIU KQi3 Max',
      rssi: rssi ?? this.state.rssi,
      lastError: notificationError,
    });
  }

  private async writeCommandSequence(hexCommands: string[]): Promise<void> {
    for (const hexCommand of hexCommands) {
      await this.writeHexCommand(hexCommand);
      await this.delay(160);
    }
  }

  private async enqueueCommand(operation: () => Promise<void>): Promise<void> {
    this.commandQueue = this.commandQueue.then(operation, operation);
    return this.commandQueue;
  }

  private bindEvents(): void {
    this.subscriptions.forEach(subscription => subscription.remove());
    this.subscriptions = [
      this.bleEmitter.addListener(
        'BleManagerDiscoverPeripheral',
        this.handleDiscoverPeripheral,
      ),
      this.bleEmitter.addListener('BleManagerStopScan', this.handleStopScan),
      this.bleEmitter.addListener(
        'BleManagerDisconnectPeripheral',
        this.handleDisconnectPeripheral,
      ),
      this.bleEmitter.addListener(
        'BleManagerDidUpdateValueForCharacteristic',
        this.handleCharacteristicUpdate,
      ),
    ];
  }

  private readonly handleDiscoverPeripheral = (
    peripheral: BlePeripheral,
  ): void => {
    if (!peripheral.id || !this.isMatchingPeripheral(peripheral)) {
      return;
    }

    this.setState({
      peripheralName:
        peripheral.name ?? peripheral.advertising?.localName ?? 'NIU KQi3 Max',
      rssi: peripheral.rssi ?? null,
    });

    this.connect(
      peripheral.id,
      peripheral.name ?? peripheral.advertising?.localName,
      peripheral.rssi,
    ).catch(error => {
      this.setState({ lastError: this.errorMessage(error) });
      this.scheduleReconnect();
    });
  };

  private readonly handleStopScan = (): void => {
    this.setState({ isScanning: false });
    if (!this.state.isConnected) {
      this.scheduleReconnect();
    }
  };

  private readonly handleDisconnectPeripheral = (
    event: DisconnectEvent,
  ): void => {
    if (event.peripheral !== this.state.peripheralId) {
      return;
    }

    this.setState({
      isConnected: false,
      peripheralId: null,
      peripheralName: null,
      rssi: null,
    });
    this.scheduleReconnect();
  };

  private readonly handleCharacteristicUpdate = (
    event: NotificationEvent,
  ): void => {
    const value = event.value ?? [];
    if (value.length === 0) {
      return;
    }

    const hex = this.bytesToHex(value);
    this.setState({ lastNotificationHex: hex });
    this.notificationListeners.forEach(listener => listener(hex, value));
  };

  private scheduleReconnect(): void {
    if (!this.started || this.state.isConnected || this.reconnectTimer) {
      return;
    }

    const delayMs = Math.min(30000, 1000 * 2 ** this.reconnectAttempts);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.scanAndConnect().catch(error => {
        this.setState({ lastError: this.errorMessage(error) });
        this.scheduleReconnect();
      });
    }, delayMs);
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) {
      return;
    }

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private async requestRequiredPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    const version = Number(Platform.Version);
    const requiredPermissions =
      version >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

    const results = await PermissionsAndroid.requestMultiple(
      requiredPermissions as Parameters<
        typeof PermissionsAndroid.requestMultiple
      >[0],
    );

    return requiredPermissions.every(
      permission => results[permission] === PermissionsAndroid.RESULTS.GRANTED,
    );
  }

  private isMatchingPeripheral(peripheral: BlePeripheral): boolean {
    const advertisedServices = [
      ...(peripheral.advertising?.serviceUUIDs ?? []),
      ...(peripheral.advertising?.serviceUuids ?? []),
      ...(peripheral.advertising?.services ?? []),
    ].map(uuid => this.normalizeUuid(uuid));

    const advertisedServiceMatch = NIU_DISCOVERY_SERVICE_UUIDS.some(uuid =>
      advertisedServices.includes(uuid),
    );
    const name = `${peripheral.name ?? ''} ${
      peripheral.advertising?.localName ?? ''
    }`.toLowerCase();
    const nameMatch =
      name.includes('niu') || name.includes('kqi') || name.includes('kqi3');

    return advertisedServiceMatch || nameMatch;
  }

  private normalizeUuid(uuid: string): string {
    const normalized = uuid.toLowerCase();
    if (/^[0-9a-f]{4}$/.test(normalized)) {
      return `0000${normalized}-0000-1000-8000-00805f9b34fb`;
    }
    return normalized;
  }

  private hexToBytes(hex: string): number[] {
    const cleanHex = hex.replace(/[^0-9a-f]/gi, '').toUpperCase();
    if (cleanHex.length === 0) {
      throw new Error('Hex command is empty.');
    }
    if (cleanHex.length % 2 !== 0) {
      throw new Error(`Hex command has an odd number of characters: ${hex}`);
    }

    const bytes: number[] = [];
    for (let index = 0; index < cleanHex.length; index += 2) {
      bytes.push(Number.parseInt(cleanHex.slice(index, index + 2), 16));
    }
    return bytes;
  }

  private bytesToHex(bytes: number[]): string {
    return bytes
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  private setState(nextState: Partial<BluetoothState>): void {
    this.state = { ...this.state, ...nextState };
    this.stateListeners.forEach(listener => listener(this.state));
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

const bluetoothService = new BluetoothService();
export default bluetoothService;
