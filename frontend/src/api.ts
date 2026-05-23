/**
 * NIU Cloud API client — calls NIU endpoints directly from the device.
 * Credentials and tokens stored locally via Capacitor Preferences.
 * No backend server required.
 */

import { Preferences } from '@capacitor/preferences';
import { CapacitorHttp } from '@capacitor/core';

const ACCOUNT_BASE = 'https://account-fk.niu.com';
const APP_API_BASE = 'https://app-api-fk.niu.com';

const USER_AGENT =
  'manager/4.6.48 (android; IN2025 11);lang=en-US;clientIdentifier=Domestic;sessionTopic=';
const ACCEPT_LANGUAGE = 'en-US';

const PREF_TOKEN = 'niu_token';
const PREF_ACCOUNT = 'niu_account';
const PREF_PASSWORD = 'niu_password';
const PREF_COUNTRY = 'niu_country_code';
const PREF_CRED_VERSION = 'niu_cred_version';
const CRED_VERSION_HASHED = '2';

function md5(text: string): string {
  // Simple MD5 implementation for password hashing
  // Uses SubtleCrypto where available, falls back to manual implementation
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;

  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }

  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  bytes.push(bitLen & 0xff, (bitLen >> 8) & 0xff, (bitLen >> 16) & 0xff, (bitLen >> 24) & 0xff);
  bytes.push(0, 0, 0, 0);

  const K = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613,
    0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193,
    0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d,
    0x02441453, 0xd8a1e681, 0xe7d3fbc8, 0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
    0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122,
    0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
    0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244,
    0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb,
    0xeb86d391,
  ];
  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5,
    9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10,
    15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];

  for (let i = 0; i < bytes.length; i += 64) {
    const M: number[] = [];
    for (let j = 0; j < 16; j++) {
      M[j] =
        bytes[i + j * 4] |
        (bytes[i + j * 4 + 1] << 8) |
        (bytes[i + j * 4 + 2] << 16) |
        (bytes[i + j * 4 + 3] << 24);
    }
    let [a, b, c, d] = [h0, h1, h2, h3];
    for (let j = 0; j < 64; j++) {
      let f: number, g: number;
      if (j < 16) {
        f = (b & c) | (~b & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | (~d & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * j) % 16;
      }
      const temp = d;
      d = c;
      c = b;
      const sum = (a + f + K[j] + M[g]) >>> 0;
      const rotated = ((sum << s[j]) | (sum >>> (32 - s[j]))) >>> 0;
      b = (b + rotated) >>> 0;
      a = temp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
  }

  const hex = (n: number) =>
    [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  return hex(h0) + hex(h1) + hex(h2) + hex(h3);
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
  const token = await getToken();
  return !!token;
}

// ── Credential storage ──

async function saveCredentials(
  account: string,
  hashedPassword: string,
  countryCode: string,
): Promise<void> {
  await Preferences.set({ key: PREF_ACCOUNT, value: account });
  await Preferences.set({ key: PREF_PASSWORD, value: hashedPassword });
  await Preferences.set({ key: PREF_COUNTRY, value: countryCode });
  await Preferences.set({ key: PREF_CRED_VERSION, value: CRED_VERSION_HASHED });
}

async function getSavedCredentials(): Promise<{
  account: string;
  password: string;
  countryCode: string;
  isHashed: boolean;
} | null> {
  const { value: account } = await Preferences.get({ key: PREF_ACCOUNT });
  const { value: password } = await Preferences.get({ key: PREF_PASSWORD });
  const { value: countryCode } = await Preferences.get({ key: PREF_COUNTRY });
  const { value: version } = await Preferences.get({ key: PREF_CRED_VERSION });
  if (!account || !password) return null;
  const isHashed = version === CRED_VERSION_HASHED;
  if (!isHashed) {
    const hashed = md5(password);
    await Preferences.set({ key: PREF_PASSWORD, value: hashed });
    await Preferences.set({ key: PREF_CRED_VERSION, value: CRED_VERSION_HASHED });
    return { account, password: hashed, countryCode: countryCode || '1', isHashed: true };
  }
  return { account, password, countryCode: countryCode || '1', isHashed: true };
}

async function clearCredentials(): Promise<void> {
  await Preferences.remove({ key: PREF_ACCOUNT });
  await Preferences.remove({ key: PREF_PASSWORD });
  await Preferences.remove({ key: PREF_COUNTRY });
  await Preferences.remove({ key: PREF_CRED_VERSION });
}

// ── NIU API helpers ──

async function niuGet(path: string): Promise<Record<string, unknown>> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
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
    throw new Error('Session expired');
  }
  if (resp.status >= 400) throw new Error(`API error ${resp.status}`);
  const data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
  return data?.data ?? {};
}

async function niuPostForm(
  path: string,
  formData: Record<string, string>,
): Promise<Record<string, unknown>> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
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
    throw new Error('Session expired');
  }
  if (resp.status >= 400) throw new Error(`API error ${resp.status}`);
  const data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
  return data?.data ?? {};
}

// ── Public API ──

export async function login(
  account: string,
  password: string,
  countryCode: string = '1',
  preHashed: boolean = false,
): Promise<void> {
  const hashedPassword = preHashed ? password : md5(password);
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

  const json = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;

  if (!json?.data?.token?.access_token) {
    throw new Error(json?.desc || 'Authentication failed');
  }

  await setToken(json.data.token.access_token);
  await saveCredentials(account, hashedPassword, countryCode);
}

export async function getVehicles(): Promise<unknown[]> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
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
    throw new Error('Session expired');
  }
  if (resp.status >= 400) throw new Error(`API error ${resp.status}`);
  const json = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
  return json?.data ?? [];
}

export async function getVehicleDetail(sn: string): Promise<Record<string, unknown>> {
  return niuPostForm('/motoinfo/overallTally', { sn });
}

export async function getVehiclePosition(sn: string): Promise<Record<string, unknown>> {
  return niuGet(`/v3/motor_data/index_info?sn=${sn}`);
}

export async function getOverallTally(sn: string): Promise<Record<string, unknown>> {
  return niuPostForm('/motoinfo/overallTally', { sn });
}

export async function getBatteryInfo(sn: string): Promise<Record<string, unknown>> {
  return niuGet(`/v3/motor_data/battery_info?sn=${sn}`);
}

export async function getBatteryHealth(sn: string): Promise<Record<string, unknown>> {
  return niuGet(`/v3/motor_data/battery_info/health?sn=${sn}`);
}

export async function getBatteryChart(
  sn: string,
  page = 1,
  pageSize = 'A',
): Promise<Record<string, unknown>> {
  const params = `sn=${sn}&page=${page}&page_size=${pageSize}&pageLength=1`;
  return niuGet(`/v3/motor_data/battery_chart/?${params}`);
}

export async function getMotorInfo(sn: string): Promise<Record<string, unknown>> {
  return niuGet(`/v3/motor_data/index_info?sn=${sn}`);
}

export async function getTracks(
  sn: string,
  page = 1,
  pageSize = 10,
): Promise<Record<string, unknown>> {
  return niuPostForm('/v3/motor_data/track', {
    sn,
    index: String(page - 1),
    pagesize: String(pageSize),
  });
}

export async function getTrackDetail(
  sn: string,
  trackId: string,
  date = '',
): Promise<Record<string, unknown>> {
  return niuPostForm('/motoinfo/track/detail', { sn, trackId, date });
}

export async function getFirmwareVersion(sn: string): Promise<Record<string, unknown>> {
  return niuPostForm('/motorota/getfirmwareversion', { sn });
}

export async function getUpdateInfo(sn: string): Promise<Record<string, unknown>> {
  return niuPostForm('/motorota/getupdateinfo', { sn });
}

export { isLoggedIn, clearToken, clearCredentials, getSavedCredentials };
