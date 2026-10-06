import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import forge from 'node-forge';
import fs from 'node:fs';

function loadCertificate(certPath: string, passphrase: string) {
  const pfxBuffer = fs.readFileSync(certPath);
  const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase);

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]![0];
  const privateKey = forge.pki.privateKeyToPem(keyBag.key!);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]![0];
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certBag.cert!)).getBytes();
  const thumbprint = forge.md.sha1.create().update(certDer).digest().toHex();

  return { privateKey, thumbprint };
}

export function createGraphClient(): Client {
  const certPath = process.env.CERT_PATH;
  const certPassphrase = process.env.CERT_PASSPHRASE;
  const clientId = process.env.CLIENT_ID;
  const tenantId = process.env.TENANT_ID;

  if (!certPath || !certPassphrase || !clientId || !tenantId) {
    throw new Error(
      'Missing required env vars: CERT_PATH, CERT_PASSPHRASE, CLIENT_ID, TENANT_ID'
    );
  }

  const { privateKey, thumbprint } = loadCertificate(certPath, certPassphrase);

  const msalApp = new ConfidentialClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientCertificate: { thumbprint, privateKey },
    },
  });

  return Client.init({
    authProvider: async (done) => {
      try {
        const result = await msalApp.acquireTokenByClientCredential({
          scopes: ['https://graph.microsoft.com/.default'],
        });
        done(null, result!.accessToken);
      } catch (error) {
        done(error instanceof Error ? error : new Error(String(error)), null);
      }
    },
  });
}
