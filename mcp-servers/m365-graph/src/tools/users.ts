import type { Client } from '@microsoft/microsoft-graph-client';
import { randomBytes } from 'node:crypto';

function generatePassword(): string {
  // 16 chars: letters + digits + symbols, meets most M365 complexity requirements
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  return Array.from(randomBytes(16))
    .map((b) => chars[b % chars.length])
    .join('');
}

function is403(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode: number }).statusCode === 403
  );
}

export async function resetPassword(
  client: Client,
  userIdOrUpn: string,
  newPassword?: string
): Promise<string> {
  const password = newPassword ?? generatePassword();
  try {
    await client.api(`/users/${userIdOrUpn}`).patch({
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password,
      },
    });
    const generated = !newPassword
      ? ' A random password was set and is not shown. Issue a temporary password or Temporary Access Pass from the Microsoft 365 admin center.'
      : '';
    return `Password reset for ${userIdOrUpn}. User must change it on next sign-in.${generated}`;
  } catch (error) {
    if (is403(error)) {
      return "Access denied. This operation requires the 'User.ReadWrite.All' application permission on the app registration.";
    }
    throw error;
  }
}
