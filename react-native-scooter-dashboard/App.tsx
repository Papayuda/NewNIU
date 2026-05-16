import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Battery,
  Bluetooth,
  Eye,
  EyeOff,
  Gauge,
  GripVertical,
  LockKeyhole,
  RefreshCw,
  Route,
  Settings2,
  Thermometer,
  UnlockKeyhole,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  type PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import bluetoothService, {
  type BluetoothState,
} from './src/services/BluetoothService';

type TileKey = 'speed' | 'battery' | 'range' | 'temperature';

type TileVisibility = Record<TileKey, boolean>;

type Telemetry = {
  speedKph: number;
  batteryPercent: number | null;
  rangeKm: number | null;
  temperatureC: number | null;
};

type IconComponent = LucideIcon;

type TileDefinition = {
  id: TileKey;
  label: string;
  unit: string;
  accent: string;
  icon: IconComponent;
  value: string;
};

type StoredLayout = {
  order: TileKey[];
  visibility: TileVisibility;
};

type DragContext = {
  startX: number;
  startY: number;
};

const BLUE = '#00E5FF';
const RED = '#FF0055';
const PANEL = '#101822';
const TEXT = '#F4FAFF';
const MUTED = '#7D8EA1';
const LAYOUT_STORAGE_KEY = 'niu:kqi3-dashboard-layout';
const TILE_ORDER: TileKey[] = ['speed', 'battery', 'range', 'temperature'];
const TILE_VISIBILITY: TileVisibility = {
  speed: true,
  battery: true,
  range: true,
  temperature: true,
};

const initialBluetoothState: BluetoothState = {
  isBluetoothReady: false,
  isScanning: false,
  isConnected: false,
  peripheralId: null,
  peripheralName: null,
  rssi: null,
  lastError: null,
  lastNotificationHex: null,
};

const initialTelemetry: Telemetry = {
  speedKph: 0,
  batteryPercent: null,
  rangeKm: null,
  temperatureC: null,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function isTileKey(value: string): value is TileKey {
  return TILE_ORDER.includes(value as TileKey);
}

function normalizeStoredLayout(layout: StoredLayout): StoredLayout {
  const storedOrder = layout.order.filter(isTileKey);
  const missingTiles = TILE_ORDER.filter(tile => !storedOrder.includes(tile));
  return {
    order: [...storedOrder, ...missingTiles],
    visibility: {
      speed: layout.visibility.speed ?? true,
      battery: layout.visibility.battery ?? true,
      range: layout.visibility.range ?? true,
      temperature: layout.visibility.temperature ?? true,
    },
  };
}

function formatNumber(value: number | null, decimals = 0): string {
  if (value === null) {
    return '—';
  }
  return value.toFixed(decimals);
}

function decodeNotificationTelemetry(
  bytes: number[],
): Partial<Telemetry> | null {
  if (bytes.length < 6) {
    return null;
  }

  if (bytes[0] === 0x5a && bytes[1] === 0xa5 && bytes.length >= 10) {
    const speedKph = bytes[6] / 10;
    const batteryPercent = clamp(bytes[7], 0, 100);
    const temperatureC = bytes[8] > 127 ? bytes[8] - 256 : bytes[8];
    const rangeKm = bytes[9] / 2;
    return { speedKph, batteryPercent, temperatureC, rangeKm };
  }

  return null;
}

function buildTiles(telemetry: Telemetry): Record<TileKey, TileDefinition> {
  return {
    speed: {
      id: 'speed',
      label: 'Speed',
      unit: 'km/h',
      accent: BLUE,
      icon: Gauge,
      value: formatNumber(telemetry.speedKph, 1),
    },
    battery: {
      id: 'battery',
      label: 'Battery',
      unit: '%',
      accent: '#7CFFB2',
      icon: Battery,
      value: formatNumber(telemetry.batteryPercent),
    },
    range: {
      id: 'range',
      label: 'Range',
      unit: 'km',
      accent: BLUE,
      icon: Route,
      value: formatNumber(telemetry.rangeKm, 1),
    },
    temperature: {
      id: 'temperature',
      label: 'Temp',
      unit: '°C',
      accent: RED,
      icon: Thermometer,
      value: formatNumber(telemetry.temperatureC),
    },
  };
}

function statusLabel(state: BluetoothState): string {
  if (state.isConnected) {
    return `Connected to ${state.peripheralName ?? 'NIU KQi3 Max'}`;
  }
  if (state.isScanning) {
    return 'Scanning for NIU KQi3 Max';
  }
  if (state.isBluetoothReady) {
    return 'Bluetooth ready; auto-reconnect armed';
  }
  return 'Bluetooth starting';
}

function DashboardTile({
  tile,
  onMove,
}: {
  tile: TileDefinition;
  onMove: (tileId: TileKey, offset: number) => void;
}): React.ReactElement {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const Icon = tile.icon;

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    DragContext
  >({
    onStart: (_, context) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
      scale.value = withSpring(1.04);
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX;
      translateY.value = context.startY + event.translationY;
    },
    onEnd: event => {
      const horizontal =
        Math.abs(event.translationX) >= Math.abs(event.translationY);
      const offset = horizontal
        ? event.translationX > 80
          ? 1
          : event.translationX < -80
          ? -1
          : 0
        : event.translationY > 80
        ? 2
        : event.translationY < -80
        ? -2
        : 0;

      if (offset !== 0) {
        runOnJS(onMove)(tile.id, offset);
      }

      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
    },
    onCancel: () => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: scale.value > 1 ? 10 : 1,
  }));

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.tile, animatedStyle]}>
        <View style={styles.tileHeader}>
          <View style={[styles.iconBubble, { borderColor: tile.accent }]}>
            <Icon color={tile.accent} size={24} strokeWidth={2.4} />
          </View>
          <GripVertical color={MUTED} size={18} strokeWidth={2} />
        </View>
        <Text style={styles.tileLabel}>{tile.label}</Text>
        <View style={styles.metricRow}>
          <Text style={[styles.tileValue, { color: tile.accent }]}>
            {tile.value}
          </Text>
          <Text style={styles.tileUnit}>{tile.unit}</Text>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}

export default function App(): React.ReactElement {
  const [bluetoothState, setBluetoothState] = useState<BluetoothState>(
    initialBluetoothState,
  );
  const [telemetry, setTelemetry] = useState<Telemetry>(initialTelemetry);
  const [tileOrder, setTileOrder] = useState<TileKey[]>(TILE_ORDER);
  const [tileVisibility, setTileVisibility] =
    useState<TileVisibility>(TILE_VISIBILITY);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandInFlight, setCommandInFlight] = useState<
    'lock' | 'unlock' | null
  >(null);
  const [commandMessage, setCommandMessage] = useState(
    'Ready to send remote commands',
  );

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(LAYOUT_STORAGE_KEY)
      .then(storedLayout => {
        if (!mounted || !storedLayout) {
          return;
        }

        const parsedLayout = normalizeStoredLayout(
          JSON.parse(storedLayout) as StoredLayout,
        );
        setTileOrder(parsedLayout.order);
        setTileVisibility(parsedLayout.visibility);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const storedLayout: StoredLayout = {
      order: tileOrder,
      visibility: tileVisibility,
    };
    AsyncStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify(storedLayout),
    ).catch(() => undefined);
  }, [tileOrder, tileVisibility]);

  useEffect(() => {
    const unsubscribeState = bluetoothService.subscribe(setBluetoothState);
    const unsubscribeNotifications = bluetoothService.subscribeNotifications(
      (_, bytes) => {
        const decodedTelemetry = decodeNotificationTelemetry(bytes);
        if (decodedTelemetry) {
          setTelemetry(currentTelemetry => ({
            ...currentTelemetry,
            ...decodedTelemetry,
          }));
        }
      },
    );

    bluetoothService.scanAndConnect().catch(error => {
      setCommandMessage(error instanceof Error ? error.message : String(error));
    });

    return () => {
      unsubscribeState();
      unsubscribeNotifications();
    };
  }, []);

  const tiles = useMemo(() => buildTiles(telemetry), [telemetry]);
  const visibleTiles = useMemo(
    () =>
      tileOrder
        .filter(tileId => tileVisibility[tileId])
        .map(tileId => tiles[tileId]),
    [tileOrder, tileVisibility, tiles],
  );

  const moveTile = useCallback(
    (tileId: TileKey, offset: number) => {
      setTileOrder(currentOrder => {
        const visibleOrder = currentOrder.filter(
          currentTileId => tileVisibility[currentTileId],
        );
        const currentVisibleIndex = visibleOrder.indexOf(tileId);
        if (currentVisibleIndex === -1) {
          return currentOrder;
        }

        const nextVisibleIndex = clamp(
          currentVisibleIndex + offset,
          0,
          visibleOrder.length - 1,
        );
        if (nextVisibleIndex === currentVisibleIndex) {
          return currentOrder;
        }

        const nextVisibleOrder = [...visibleOrder];
        nextVisibleOrder.splice(currentVisibleIndex, 1);
        nextVisibleOrder.splice(nextVisibleIndex, 0, tileId);

        const hiddenOrder = currentOrder.filter(
          currentTileId => !tileVisibility[currentTileId],
        );
        return [...nextVisibleOrder, ...hiddenOrder];
      });
    },
    [tileVisibility],
  );

  const toggleTile = useCallback((tileId: TileKey) => {
    setTileVisibility(currentVisibility => ({
      ...currentVisibility,
      [tileId]: !currentVisibility[tileId],
    }));
  }, []);

  const reconnect = useCallback(() => {
    setCommandMessage('Scanning for scooter');
    bluetoothService.scanAndConnect().catch(error => {
      setCommandMessage(error instanceof Error ? error.message : String(error));
    });
  }, []);

  const sendCommand = useCallback(async (command: 'lock' | 'unlock') => {
    setCommandInFlight(command);
    setCommandMessage(
      `${command === 'lock' ? 'Lock' : 'Unlock'} command sending`,
    );

    try {
      if (command === 'lock') {
        await bluetoothService.lockScooter();
      } else {
        await bluetoothService.unlockScooter();
      }
      setCommandMessage(
        `${command === 'lock' ? 'Lock' : 'Unlock'} command sent`,
      );
    } catch (error) {
      setCommandMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setCommandInFlight(null);
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="light-content" backgroundColor="#05080D" />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
          >
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>NIU KQi3 Max</Text>
                <Text style={styles.title}>Command Deck</Text>
              </View>
              <Pressable
                style={styles.settingsButton}
                onPress={() => setSettingsOpen(open => !open)}
              >
                <Settings2
                  color={settingsOpen ? BLUE : TEXT}
                  size={24}
                  strokeWidth={2.4}
                />
              </Pressable>
            </View>

            <View style={styles.connectionCard}>
              <View style={styles.connectionTopRow}>
                <View style={styles.connectionTitleRow}>
                  <View
                    style={[
                      styles.statusDot,
                      bluetoothState.isConnected && styles.statusDotConnected,
                    ]}
                  />
                  <Text style={styles.connectionTitle}>
                    {statusLabel(bluetoothState)}
                  </Text>
                </View>
                <Pressable style={styles.scanButton} onPress={reconnect}>
                  {bluetoothState.isScanning ? (
                    <ActivityIndicator color={BLUE} size="small" />
                  ) : (
                    <RefreshCw color={BLUE} size={18} strokeWidth={2.5} />
                  )}
                  <Text style={styles.scanText}>Scan</Text>
                </Pressable>
              </View>
              <View style={styles.connectionMetaRow}>
                <View style={styles.metaPill}>
                  <Bluetooth color={BLUE} size={15} strokeWidth={2.4} />
                  <Text style={styles.metaText}>
                    {bluetoothState.peripheralId ?? 'Auto-reconnect active'}
                  </Text>
                </View>
                {bluetoothState.rssi !== null && (
                  <Text style={styles.rssiText}>{bluetoothState.rssi} dBm</Text>
                )}
              </View>
              {bluetoothState.lastNotificationHex && (
                <Text style={styles.notificationText} numberOfLines={1}>
                  Last frame {bluetoothState.lastNotificationHex}
                </Text>
              )}
              {bluetoothState.lastError && (
                <Text style={styles.errorText}>{bluetoothState.lastError}</Text>
              )}
            </View>

            {settingsOpen && (
              <View style={styles.settingsPanel}>
                <Text style={styles.sectionTitle}>Dashboard tiles</Text>
                <Text style={styles.settingsHint}>
                  Drag a tile to rearrange it. Toggle tiles below.
                </Text>
                {TILE_ORDER.map(tileId => {
                  const definition = tiles[tileId];
                  const Icon = definition.icon;
                  return (
                    <Pressable
                      key={tileId}
                      style={styles.toggleRow}
                      onPress={() => toggleTile(tileId)}
                    >
                      <View style={styles.toggleLeft}>
                        <Icon
                          color={definition.accent}
                          size={19}
                          strokeWidth={2.4}
                        />
                        <Text style={styles.toggleLabel}>
                          {definition.label}
                        </Text>
                      </View>
                      {tileVisibility[tileId] ? (
                        <Eye color={BLUE} size={20} strokeWidth={2.3} />
                      ) : (
                        <EyeOff color={MUTED} size={20} strokeWidth={2.3} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={styles.tileGrid}>
              {visibleTiles.map(tile => (
                <DashboardTile key={tile.id} tile={tile} onMove={moveTile} />
              ))}
            </View>

            <View style={styles.commandPanel}>
              <Text style={styles.sectionTitle}>Remote control</Text>
              <Text style={styles.commandHint}>{commandMessage}</Text>
              <View style={styles.commandRow}>
                <Pressable
                  disabled={commandInFlight !== null}
                  style={({ pressed }) => [
                    styles.commandButton,
                    styles.unlockButton,
                    pressed && styles.pressedButton,
                    commandInFlight !== null && styles.disabledButton,
                  ]}
                  onPress={() => {
                    sendCommand('unlock').catch(error => {
                      setCommandMessage(
                        error instanceof Error ? error.message : String(error),
                      );
                    });
                  }}
                >
                  {commandInFlight === 'unlock' ? (
                    <ActivityIndicator color="#001217" size="small" />
                  ) : (
                    <UnlockKeyhole
                      color="#001217"
                      size={34}
                      strokeWidth={2.6}
                    />
                  )}
                  <Text style={styles.unlockButtonText}>Unlock</Text>
                </Pressable>

                <Pressable
                  disabled={commandInFlight !== null}
                  style={({ pressed }) => [
                    styles.commandButton,
                    styles.lockButton,
                    pressed && styles.pressedButton,
                    commandInFlight !== null && styles.disabledButton,
                  ]}
                  onPress={() => {
                    sendCommand('lock').catch(error => {
                      setCommandMessage(
                        error instanceof Error ? error.message : String(error),
                      );
                    });
                  }}
                >
                  {commandInFlight === 'lock' ? (
                    <ActivityIndicator color={TEXT} size="small" />
                  ) : (
                    <LockKeyhole color={TEXT} size={34} strokeWidth={2.6} />
                  )}
                  <Text style={styles.lockButtonText}>Lock</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#05080D',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#05080D',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  eyebrow: {
    color: BLUE,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  title: {
    color: TEXT,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.2,
    marginTop: 4,
  },
  settingsButton: {
    alignItems: 'center',
    backgroundColor: PANEL,
    borderColor: '#203144',
    borderRadius: 18,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    width: 52,
  },
  connectionCard: {
    backgroundColor: PANEL,
    borderColor: '#203144',
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 18,
    padding: 18,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
  },
  connectionTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  connectionTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    paddingRight: 14,
  },
  statusDot: {
    backgroundColor: RED,
    borderRadius: 7,
    height: 14,
    marginRight: 10,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    width: 14,
  },
  statusDotConnected: {
    backgroundColor: BLUE,
    shadowColor: BLUE,
  },
  connectionTitle: {
    color: TEXT,
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  scanButton: {
    alignItems: 'center',
    backgroundColor: '#081F2A',
    borderColor: '#124557',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  scanText: {
    color: BLUE,
    fontSize: 13,
    fontWeight: '800',
  },
  connectionMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  metaPill: {
    alignItems: 'center',
    backgroundColor: '#0B121C',
    borderRadius: 14,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  metaText: {
    color: MUTED,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  rssiText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 10,
  },
  notificationText: {
    color: '#5FEFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 12,
  },
  errorText: {
    color: RED,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },
  settingsPanel: {
    backgroundColor: PANEL,
    borderColor: '#203144',
    borderRadius: 26,
    borderWidth: 1,
    marginBottom: 18,
    padding: 18,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  settingsHint: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 6,
  },
  toggleRow: {
    alignItems: 'center',
    backgroundColor: '#0B121C',
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    padding: 14,
  },
  toggleLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  toggleLabel: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '800',
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
  },
  tile: {
    backgroundColor: PANEL,
    borderColor: '#203144',
    borderRadius: 28,
    borderWidth: 1,
    minHeight: 168,
    padding: 18,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    width: '47.8%',
  },
  tileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconBubble: {
    alignItems: 'center',
    backgroundColor: '#07121B',
    borderRadius: 18,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    width: 46,
  },
  tileLabel: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 24,
    textTransform: 'uppercase',
  },
  metricRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    marginTop: 4,
  },
  tileValue: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1.6,
  },
  tileUnit: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    marginLeft: 6,
  },
  commandPanel: {
    backgroundColor: PANEL,
    borderColor: '#203144',
    borderRadius: 30,
    borderWidth: 1,
    marginTop: 20,
    padding: 18,
  },
  commandHint: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  commandRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 18,
  },
  commandButton: {
    alignItems: 'center',
    borderRadius: 26,
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    minHeight: 138,
    padding: 18,
  },
  unlockButton: {
    backgroundColor: BLUE,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
  },
  lockButton: {
    backgroundColor: '#240714',
    borderColor: RED,
    borderWidth: 1,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  pressedButton: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabledButton: {
    opacity: 0.65,
  },
  unlockButtonText: {
    color: '#001217',
    fontSize: 21,
    fontWeight: '900',
  },
  lockButtonText: {
    color: TEXT,
    fontSize: 21,
    fontWeight: '900',
  },
});
