import { describe, it, expect, vi } from 'vitest';
import { resetPassword } from '../../src/tools/users.js';
import type { Client } from '@microsoft/microsoft-graph-client';

describe('resetPassword', () => {
  it('resets password with provided new password', async () => {
    const mock = {
      api: vi.fn().mockReturnThis(),
      patch: vi.fn().mockResolvedValue(undefined),
    } as unknown as Client;
    const result = await resetPassword(mock, 'jane@contoso.com', 'NewPass123!');
    expect(result).toContain('jane@contoso.com');
    expect(result).toContain('reset');
  });

  it('does not return the generated password', async () => {
    const patch = vi.fn().mockResolvedValue(undefined);
    const mock = {
      api: vi.fn().mockReturnThis(),
      patch,
    } as unknown as Client;
    const result = await resetPassword(mock, 'jane@contoso.com');
    expect(result).toContain('jane@contoso.com');
    expect(result).not.toContain(patch.mock.calls[0][0].passwordProfile.password);
  });

  it('returns permission error on 403', async () => {
    const mock = {
      api: vi.fn().mockReturnThis(),
      patch: vi.fn().mockRejectedValue(Object.assign(new Error(), { statusCode: 403 })),
    } as unknown as Client;
    const result = await resetPassword(mock, 'jane@contoso.com', 'Pass123!');
    expect(result).toContain('User.ReadWrite.All');
  });
});
