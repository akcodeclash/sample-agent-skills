import type { Client } from '@microsoft/microsoft-graph-client';
import { randomBytes } from 'node:crypto';

// Graph fields are user-controlled in M365. The random id stops content from forging the end marker.
function untrusted(text: string): string {
  const id = randomBytes(8).toString('hex');
  return `--- BEGIN UNTRUSTED M365 DATA ${id} ---\n${text}\n--- END UNTRUSTED M365 DATA ${id} ---`;
}

function permissionError(permission: string): string {
  return `Access denied. This operation requires the '${permission}' application permission on the app registration. Check with the TruNXT operator to grant this permission.`;
}

function is403(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode: number }).statusCode === 403
  );
}

export async function listSites(client: Client): Promise<string> {
  try {
    const res = await client.api('/sites').select('displayName,webUrl,id').get();
    if (!res.value?.length) return 'No sites found in this tenant.';
    return untrusted(res.value
      .map((s: { displayName: string; webUrl: string; id: string }) =>
        `- ${s.displayName}\n  URL: ${s.webUrl}\n  ID: ${s.id}`
      )
      .join('\n'));
  } catch (error) {
    if (is403(error)) return permissionError('Sites.Read.All');
    throw error;
  }
}

export async function getSite(client: Client, siteUrl: string): Promise<string> {
  try {
    const hostname = new URL(siteUrl).hostname;
    const path = new URL(siteUrl).pathname;
    const res = await client
      .api(`/sites/${hostname}:${path}`)
      .select('displayName,webUrl,id,description')
      .get();
    return untrusted(`Name: ${res.displayName}\nURL: ${res.webUrl}\nID: ${res.id}\nDescription: ${res.description ?? '(none)'}`);
  } catch (error) {
    if (is403(error)) return permissionError('Sites.Read.All');
    throw error;
  }
}

export async function listLibraries(client: Client, siteId: string): Promise<string> {
  try {
    const res = await client.api(`/sites/${siteId}/drives`).get();
    if (!res.value?.length) return 'No document libraries found.';
    return untrusted(res.value
      .map((d: { name: string; id: string; webUrl: string }) =>
        `- ${d.name}\n  Drive ID: ${d.id}\n  URL: ${d.webUrl}`
      )
      .join('\n'));
  } catch (error) {
    if (is403(error)) return permissionError('Sites.Read.All');
    throw error;
  }
}

export async function listFiles(
  client: Client,
  driveId: string,
  folderId?: string
): Promise<string> {
  try {
    const path = folderId
      ? `/drives/${driveId}/items/${folderId}/children`
      : `/drives/${driveId}/root/children`;
    const res = await client.api(path).select('name,size,lastModifiedDateTime,id,folder').get();
    if (!res.value?.length) return 'No files or folders found.';
    return untrusted(res.value
      .map((item: { name: string; size?: number; lastModifiedDateTime: string; id: string; folder?: object }) => {
        const type = item.folder ? '📁' : '📄';
        return `${type} ${item.name}\n  ID: ${item.id}\n  Modified: ${item.lastModifiedDateTime}${item.size !== undefined ? `\n  Size: ${item.size} bytes` : ''}`;
      })
      .join('\n'));
  } catch (error) {
    if (is403(error)) return permissionError('Files.Read.All');
    throw error;
  }
}

export async function listUsers(client: Client): Promise<string> {
  try {
    const res = await client
      .api('/users')
      .select('displayName,userPrincipalName,id,accountEnabled')
      .top(100)
      .get();
    if (!res.value?.length) return 'No users found.';
    return untrusted(res.value
      .map((u: { displayName: string; userPrincipalName: string; id: string; accountEnabled: boolean }) =>
        `- ${u.displayName} <${u.userPrincipalName}>\n  ID: ${u.id}\n  Active: ${u.accountEnabled}`
      )
      .join('\n'));
  } catch (error) {
    if (is403(error)) return permissionError('User.Read.All');
    throw error;
  }
}

export async function uploadFile(
  client: Client,
  driveId: string,
  filePath: string,
  content: Buffer
): Promise<string> {
  try {
    const res = await client
      .api(`/drives/${driveId}/root:${filePath}:/content`)
      .put(content);
    return `File '${res.name}' uploaded successfully. Item ID: ${res.id}`;
  } catch (error) {
    if (is403(error)) return permissionError('Files.ReadWrite.All');
    throw error;
  }
}

export async function createFolder(
  client: Client,
  driveId: string,
  folderName: string,
  parentId?: string
): Promise<string> {
  try {
    const path = parentId
      ? `/drives/${driveId}/items/${parentId}/children`
      : `/drives/${driveId}/root/children`;
    const res = await client.api(path).post({
      name: folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename',
    });
    return `Folder '${res.name}' created. ID: ${res.id}`;
  } catch (error) {
    if (is403(error)) return permissionError('Files.ReadWrite.All');
    throw error;
  }
}

export async function moveFile(
  client: Client,
  driveId: string,
  itemId: string,
  newParentId: string,
  newName?: string
): Promise<string> {
  try {
    const body: Record<string, unknown> = {
      parentReference: { id: newParentId },
    };
    if (newName) body.name = newName;
    await client.api(`/drives/${driveId}/items/${itemId}`).patch(body);
    return `Item moved successfully${newName ? ` and renamed to '${newName}'` : ''}.`;
  } catch (error) {
    if (is403(error)) return permissionError('Files.ReadWrite.All');
    throw error;
  }
}

export async function createLibrary(
  client: Client,
  siteId: string,
  libraryName: string
): Promise<string> {
  try {
    const res = await client.api(`/sites/${siteId}/lists`).post({
      displayName: libraryName,
      list: { template: 'documentLibrary' },
    });
    return `Document library '${res.displayName}' created. ID: ${res.id}`;
  } catch (error) {
    if (is403(error)) return permissionError('Sites.Manage.All');
    throw error;
  }
}

export async function setPermissions(
  client: Client,
  siteId: string,
  role: 'read' | 'write' | 'owner',
  emails: string[],
  tenantDomains: string[],
  allowExternal = false
): Promise<string> {
  const external = emails.filter(
    (email) => !tenantDomains.includes(email.slice(email.lastIndexOf('@') + 1).toLowerCase())
  );
  if (external.length && !allowExternal) {
    return `Refused. No permissions were changed. Outside the tenant domains: ${external.join(', ')}. Granting access to external addresses requires explicit user confirmation, then allowExternal: true.`;
  }
  try {
    await client.api(`/sites/${siteId}/permissions`).post({
      roles: [role],
      grantedToIdentities: emails.map((email) => ({
        user: { email },
      })),
    });
    return `Granted '${role}' permission to: ${emails.join(', ')}`;
  } catch (error) {
    if (is403(error)) return permissionError('Sites.Manage.All');
    throw error;
  }
}
