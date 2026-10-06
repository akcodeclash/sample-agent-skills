import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock MSAL before importing auth
vi.mock('@azure/msal-node', () => ({
  ConfidentialClientApplication: vi.fn().mockImplementation(() => ({
    acquireTokenByClientCredential: vi.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
    }),
  })),
}));

vi.mock('node-forge', () => ({
  default: {
    asn1: {
      fromDer: vi.fn().mockReturnValue({}),
      toDer: vi.fn().mockReturnValue({ getBytes: vi.fn().mockReturnValue('mock-cert-der-bytes') }),
    },
    pkcs12: {
      pkcs12FromAsn1: vi.fn().mockReturnValue({
        getBags: vi.fn().mockReturnValue({
          '1.2.840.113549.1.12.10.1.2': [{ key: {} }],
          '1.2.840.113549.1.12.10.1.3': [{ cert: {} }],
        }),
      }),
    },
    pki: {
      oids: {
        pkcs8ShroudedKeyBag: '1.2.840.113549.1.12.10.1.2',
        certBag: '1.2.840.113549.1.12.10.1.3',
      },
      privateKeyToPem: vi.fn().mockReturnValue('-----BEGIN PRIVATE KEY-----\nmock\n-----END PRIVATE KEY-----'),
      certificateToAsn1: vi.fn().mockReturnValue({}),
    },
    md: {
      sha1: {
        create: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnThis(),
          digest: vi.fn().mockReturnValue({ toHex: vi.fn().mockReturnValue('abc123thumbprint') }),
        }),
      },
    },
  },
}));

vi.mock('node:fs', () => ({
  default: { readFileSync: vi.fn().mockReturnValue(Buffer.from('mock-pfx')) },
}));

describe('createGraphClient', () => {
  beforeEach(() => {
    process.env.CLIENT_ID = 'test-client-id';
    process.env.TENANT_ID = 'test-tenant-id';
    process.env.CERT_PATH = '/tmp/test.pfx';
    process.env.CERT_PASSPHRASE = 'test-passphrase';
  });

  it('returns a Graph client', async () => {
    const { createGraphClient } = await import('../src/auth.js');
    const client = createGraphClient();
    expect(client).toBeDefined();
    expect(typeof client.api).toBe('function');
  });
});
