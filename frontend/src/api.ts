/**
 * NIU Cloud API client — calls NIU endpoints directly from the device.
 * Only authentication tokens are persisted; passwords are never stored.
 * No backend server required.
 */

import { Preferences } from '@capacitor/preferences';
import { CapacitorHttp } from '@capacitor/core';
import md5 from 'md5';

// ── API base URLs ──

const ACCOUNT_BASE = 'https://account-fk.niu.com';
const APP_API_BASE = 'https://app-api-fk.niu.com';

const USER_AGENT =
  'manager/4.6.48 (iPhone; iOS 17.0);lang=en-US;clientIdentifier=Domestic;sessionTopic=';
const ACCEPT_LANGUAGE = 'en-US';

// ── Preference keys ──

const PREF_TOKEN = 'niu_token';
const PREF_ACCOUNT = 'niu_account';
const PREF_COUNTRY = 'niu_country_code';

// Legacy keys — only referenced during migration cleanup
const PREF_PASSWORD_LEGACY = 'niu_password';
const PREF_CRED_VERSION_LEGACY = 'niu_cred_version';

// ── Custom error class for API errors ──

export class NiuApiError extends Error {
  readonly statusCode: number | undefined;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'NiuApiError';
    this.statusCode = statusCode;
  }
}

// ── TypeScript interfaces for API responses ──

export interface LoginToken {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

export interface LoginResponse {
  data: {
    token: LoginToken;
    user?: {
      user_id: string;
      mobile: string;
      email: string;
    };
  };
  desc: string;
  status: number;
  trace: string;
}

export interface Vehicle {
  sn: string;
  vehicleName: string;
  type: number;
  typeName: string;
  frameNo: string;
  isSelected: boolean;
  isMaster: boolean;
  bindDaysCount: number;
  isAllowMotopowerful: boolean;
  process_id?: string;
  [key: string]: unknown;
}

export interface VehiclePosition {
  lat: number;
  lng: number;
  timestamp: number;
  gps: number;
  gpsPrecision: number;
  centreCtrlBatt: number;
  ss_protocol_ver: number;
  ss_online_sta: string;
  gps_timestamp: number;
  inServiceModeParking: boolean;
  isConnected: boolean;
  isCharging: number;
  isLocked: boolean;
  lockStatus: number;
  hdop: number;
  time: number;
  [key: string]: unknown;
}

export interface OverallTally {
  totalMileage: number;
  bindDaysCount: number;
  totalRidingTime: number;
  totalRidingSec: number;
  [key: string]: unknown;
}

export interface BatteryInfo {
  batteries: {
    bmsId: string;
    isConnected: boolean;
    batteryCharging: number;
    gradeBattery: string;
    temperature: number;
    temperatureDesc: string;
    energyConsumedTody: number;
    estimatedMileage: number;
  };
  batteryDetail: {
    bmsId: string;
    isConnected: boolean;
    batteryCharging: number;
    chargeCount: number;
    temperature: number;
    temperatureDesc: string;
    items: { title: string; desc: string }[];
  }[];
  centreCtrlBattery: number;
  isCharging: boolean;
  estimatedMileage: number;
  [key: string]: unknown;
}

export interface BatteryHealth {
  batteries: {
    bmsId: string;
    isConnected: boolean;
    gradeBattery: string;
  };
  isDoubleBattery: boolean;
  [key: string]: unknown;
}

export interface BatteryChartEntry {
  m: number;
  b: number;
}

export interface BatteryChart {
  items1: BatteryChartEntry[];
  items2?: BatteryChartEntry[];
  isDoubleBattery: boolean;
  [key: string]: unknown;
}

export interface MotorInfo {
  isConnected: boolean;
  postion: VehiclePosition;
  status: number;
  inServiceMode: boolean;
  lockStatus: number;
  isCharging: number;
  timeStamp: number;
  leftTime: string;
  estimatedMileage: number;
  gpsTimestamp: number;
  centreCtrlBatt: number;
  ss_protocol_ver: number;
  ss_online_sta: string;
  gsm: number;
  lastTrack: {
    ridingTime: number;
    distance: number;
    time: string;
  };
  [key: string]: unknown;
}

export interface Track {
  trackId: string;
  startTime: string;
  endTime: string;
  distance: number;
  avespeed: number;
  ridingtime: number;
  type: number;
  date: string;
  startPoint: { lat: number; lng: number };
  lastPoint: { lat: number; lng: number };
  [key: string]: unknown;
}

export interface TrackDetail {
  trackItems: { lng: number; lat: number; date: string }[];
  startTime: string;
  endTime: string;
  distance: number;
  avespeed: number;
  ridingtime: number;
  [key: string]: unknown;
}

export interface FirmwareVersion {
  softVersion: string;
  hardVersion: string;
  BmsVersion: string;
  ss_protocol_ver: number;
  [key: string]: unknown;
}

export interface UpdateInfo {
  updatestatus: number;
  updateSubStatus: number;
  updateStatusDesc: string;
  [key: string]: unknown;
}

// ── Input validation ──

const MAX_ACCOUNT_LENGTH = 100;
const MAX_PASSWORD_LENGTH = 128;
const VALID_ACCOUNT_RE = /^[a-zA-Z0-9@._+-]+$/;
const VALID_COUNTRY_CODE_RE = /^[0-9]{1,4}$/;

function validateLoginInput(account: string, password: string, countryCode: string): void {
  if (!account || account.length === 0) {
    throw new NiuApiError('Account is required');
  }
  if (account.length > MAX_ACCOUNT_LENGTH) {
    throw new NiuApiError(`Account must be at most ${MAX_ACCOUNT_LENGTH} characters`);
  }
  if (!VALID_ACCOUNT_RE.test(account)) {
    throw new NiuApiError('Account contains invalid characters');
  }

  if (!password || password.length === 0) {
    throw new NiuApiError('Password is required');
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new NiuApiError(`Password must be at most ${MAX_PASSWORD_LENGTH} characters`);
  }

  if (!VALID_COUNTRY_CODE_RE.test(countryCode)) {
    throw new NiuApiError('Country code must be 1–4 digits');
  }
}

// ── Token storage ──

async function getToken(): Promise<string | null> {
  const { value } = await Preferences.get({ key: PREF_TOKEN });
  return value;
}

async function setToken(token: string): Promise<void> {
  await Preferences.set({ key: PREF_TOKEN, value: token });
}

async function clearToken(): Promise<void> {
  await Preferences.remove({ key: PREF_TOKEN });
}

async function isLoggedIn(): Promise<boolean> {
  // Purge any legacy password data left by older versions
  await Preferences.remove({ key: PREF_PASSWORD_LEGACY });
  await Preferences.remove({ key: PREF_CRED_VERSION_LEGACY });
  const token = await getToken();
  return !!token;
}

// ── Account info storage (no passwords stored) ──

async function saveAccountInfo(account: string, countryCode: string): Promise<void> {
  await Preferences.set({ key: PREF_ACCOUNT, value: account });
  await Preferences.set({ key: PREF_COUNTRY, value: countryCode });
}

export async function getSavedAccountInfo(): Promise<{
  account: string;
  countryCode: string;
} | null> {
  const { value: account } = await Preferences.get({ key: PREF_ACCOUNT });
  const { value: countryCode } = await Preferences.get({ key: PREF_COUNTRY });
  if (!account) return null;
  return { account, countryCode: countryCode || '1' };
}

async function clearAccountInfo(): Promise<void> {
  await Preferences.remove({ key: PREF_ACCOUNT });
  await Preferences.remove({ key: PREF_COUNTRY });
  // Clean up any remaining legacy keys
  await Preferences.remove({ key: PREF_PASSWORD_LEGACY });
  await Preferences.remove({ key: PREF_CRED_VERSION_LEGACY });
}

// ── NIU API helpers ──

async function niuGet<T = Record<string, unknown>>(path: string): Promise<T> {
  const token = await getToken();
  if (!token) throw new NiuApiError('Not authenticated');
  const resp = await CapacitorHttp.get({
    url: `${APP_API_BASE}${path}`,
    headers: {
      token,
      'User-Agent': USER_AGENT,
      'Accept-Language': ACCEPT_LANGUAGE,
      'Content-Type': 'application/json',
    },
  });
  if (resp.status === 401) {
    await clearToken();
    throw new NiuApiError('Session expired', 401);
  }
  if (resp.status >= 400) throw new NiuApiError(`API error ${resp.status}`, resp.status);
  const data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
  return (data?.data ?? {}) as T;
}

async function niuPostForm<T = Record<string, unknown>>(
  path: string,
  formData: Record<string, string>,
): Promise<T> {
  const token = await getToken();
  if (!token) throw new NiuApiError('Not authenticated');
  const body = Object.entries(formData)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const resp = await CapacitorHttp.post({
    url: `${APP_API_BASE}${path}`,
    headers: {
      token,
      'User-Agent': USER_AGENT,
      'Accept-Language': ACCEPT_LANGUAGE,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: body,
  });
  if (resp.status === 401) {
    await clearToken();
    throw new NiuApiError('Session expired', 401);
  }
  if (resp.status >= 400) throw new NiuApiError(`API error ${resp.status}`, resp.status);
  const data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
  return (data?.data ?? {}) as T;
}

// ── Public API ──

export async function login(
  account: string,
  password: string,
  countryCode: string = '1',
): Promise<void> {
  validateLoginInput(account, password, countryCode);

  const hashedPassword = md5(password);
  const body = Object.entries({
    account,
    password: hashedPassword,
    grant_type: 'password',
    scope: 'base',
    app_id: 'niu_ktdrr960',
    countryCode,
  })
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const resp = await CapacitorHttp.post({
    url: `${ACCOUNT_BASE}/v3/api/oauth2/token`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
      'Accept-Language': ACCEPT_LANGUAGE,
    },
    data: body,
  });

  const json = (typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data) as
    | LoginResponse
    | undefined;

  if (!json?.data?.token?.access_token) {
    throw new NiuApiError(json?.desc || 'Authentication failed', resp.status);
  }

  await setToken(json.data.token.access_token);
  await saveAccountInfo(account, countryCode);
}

export async function getVehicles(): Promise<Vehicle[]> {
  const token = await getToken();
  if (!token) throw new NiuApiError('Not authenticated');
  const resp = await CapacitorHttp.post({
    url: `${APP_API_BASE}/motoinfo/list`,
    headers: {
      token,
      'User-Agent': USER_AGENT,
      'Accept-Language': ACCEPT_LANGUAGE,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: '',
  });
  if (resp.status === 401) {
    await clearToken();
    throw new NiuApiError('Session expired', 401);
  }
  if (resp.status >= 400) throw new NiuApiError(`API error ${resp.status}`, resp.status);
  const json = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
  return (json?.data ?? []) as Vehicle[];
}

export async function getVehiclePosition(sn: string): Promise<VehiclePosition> {
  return niuGet<VehiclePosition>(`/v3/motor_data/index_info?sn=${sn}`);
}

export async function getOverallTally(sn: string): Promise<OverallTally> {
  return niuPostForm<OverallTally>('/motoinfo/overallTally', { sn });
}

export async function getBatteryInfo(sn: string): Promise<BatteryInfo> {
  return niuGet<BatteryInfo>(`/v3/motor_data/battery_info?sn=${sn}`);
}

export async function getBatteryHealth(sn: string): Promise<BatteryHealth> {
  return niuGet<BatteryHealth>(`/v3/motor_data/battery_info/health?sn=${sn}`);
}

export async function getBatteryChart(
  sn: string,
  page = 1,
  pageSize = 'A',
): Promise<BatteryChart> {
  const params = `sn=${sn}&page=${page}&page_size=${pageSize}&pageLength=1`;
  return niuGet<BatteryChart>(`/v3/motor_data/battery_chart/?${params}`);
}

export async function getMotorInfo(sn: string): Promise<MotorInfo> {
  return niuGet<MotorInfo>(`/v3/motor_data/index_info?sn=${sn}`);
}

export async function getTracks(
  sn: string,
  page = 1,
  pageSize = 10,
): Promise<{ items: Track[] }> {
  return niuPostForm<{ items: Track[] }>('/v3/motor_data/track', {
    sn,
    index: String(page - 1),
    pagesize: String(pageSize),
  });
}

export async function getTrackDetail(
  sn: string,
  trackId: string,
  date = '',
): Promise<TrackDetail> {
  return niuPostForm<TrackDetail>('/motoinfo/track/detail', { sn, trackId, date });
}

export async function getFirmwareVersion(sn: string): Promise<FirmwareVersion> {
  return niuPostForm<FirmwareVersion>('/motorota/getfirmwareversion', { sn });
}

export async function getUpdateInfo(sn: string): Promise<UpdateInfo> {
  return niuPostForm<UpdateInfo>('/motorota/getupdateinfo', { sn });
}

export { isLoggedIn, clearToken, clearAccountInfo as clearCredentials, getSavedAccountInfo as getSavedCredentials };
