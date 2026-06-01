import { describe, it, expect } from 'vitest';
import { NiuApiError } from '../api';

describe('NiuApiError', () => {
  it('carries a statusCode', () => {
    const err = new NiuApiError('Session expired', 401);
    expect(err.message).toBe('Session expired');
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe('NiuApiError');
    expect(err).toBeInstanceOf(Error);
  });

  it('defaults statusCode to undefined', () => {
    const err = new NiuApiError('Something went wrong');
    expect(err.statusCode).toBeUndefined();
  });
});

describe('input validation (via login)', () => {
  // We can't call login() directly without mocking CapacitorHttp,
  // so we test the validateLoginInput logic by importing it indirectly
  // through the exported login function and catching validation errors.

  // Dynamically import so we can mock Capacitor modules
  it('rejects empty account', async () => {
    // login validates inputs before any network call
    const { login } = await import('../api');
    await expect(login('', 'password123', '1')).rejects.toThrow('Account is required');
  });

  it('rejects account with invalid characters', async () => {
    const { login } = await import('../api');
    await expect(login('user<script>', 'password123', '1')).rejects.toThrow(
      'Account contains invalid characters',
    );
  });

  it('rejects empty password', async () => {
    const { login } = await import('../api');
    await expect(login('user@test.com', '', '1')).rejects.toThrow('Password is required');
  });

  it('rejects invalid country code', async () => {
    const { login } = await import('../api');
    await expect(login('user@test.com', 'password123', 'abc')).rejects.toThrow(
      'Country code must be 1–4 digits',
    );
  });
});
