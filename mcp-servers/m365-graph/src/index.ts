import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createGraphClient } from './auth.js';
import {
  listSites, getSite, listLibraries, listFiles, listUsers,
  uploadFile, createFolder, moveFile, createLibrary, setPermissions,
} from './tools/sharepoint.js';
import { resetPassword } from './tools/users.js';

const server = new Server(
  { name: 'm365-graph', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_sites',
      description: 'List all SharePoint sites in the tenant.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'get_site',
      description: 'Get details of a SharePoint site by URL.',
      inputSchema: {
        type: 'object',
        properties: { siteUrl: { type: 'string', description: 'Full SharePoint site URL' } },
        required: ['siteUrl'],
      },
    },
    {
      name: 'list_libraries',
      description: 'List document libraries in a SharePoint site.',
      inputSchema: {
        type: 'object',
        properties: { siteId: { type: 'string', description: 'SharePoint site ID' } },
        required: ['siteId'],
      },
    },
    {
      name: 'list_files',
      description: 'List files and folders in a drive or folder.',
      inputSchema: {
        type: 'object',
        properties: {
          driveId: { type: 'string', description: 'Drive (library) ID' },
          folderId: { type: 'string', description: 'Optional folder item ID to list inside' },
        },
        required: ['driveId'],
      },
    },
    {
      name: 'list_users',
      description: 'List users in the Microsoft 365 tenant.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'upload_file',
      description: 'Upload a file to a SharePoint document library.',
      inputSchema: {
        type: 'object',
        properties: {
          driveId: { type: 'string' },
          filePath: { type: 'string', description: 'Destination path, e.g. /folder/file.pdf' },
          contentBase64: { type: 'string', description: 'File content as base64 string' },
        },
        required: ['driveId', 'filePath', 'contentBase64'],
      },
    },
    {
      name: 'create_folder',
      description: 'Create a folder in a SharePoint document library.',
      inputSchema: {
        type: 'object',
        properties: {
          driveId: { type: 'string' },
          folderName: { type: 'string' },
          parentId: { type: 'string', description: 'Optional parent folder item ID' },
        },
        required: ['driveId', 'folderName'],
      },
    },
    {
      name: 'move_file',
      description: 'Move or rename a file in SharePoint.',
      inputSchema: {
        type: 'object',
        properties: {
          driveId: { type: 'string' },
          itemId: { type: 'string' },
          newParentId: { type: 'string' },
          newName: { type: 'string', description: 'Optional new name for the file' },
        },
        required: ['driveId', 'itemId', 'newParentId'],
      },
    },
    {
      name: 'create_library',
      description: 'Create a new SharePoint document library.',
      inputSchema: {
        type: 'object',
        properties: {
          siteId: { type: 'string' },
          libraryName: { type: 'string' },
        },
        required: ['siteId', 'libraryName'],
      },
    },
    {
      name: 'set_permissions',
      description: 'Grant permissions on a SharePoint site. Refuses addresses outside the tenant domains unless allowExternal is true.',
      inputSchema: {
        type: 'object',
        properties: {
          siteId: { type: 'string' },
          role: { type: 'string', enum: ['read', 'write', 'owner'] },
          emails: { type: 'array', items: { type: 'string' }, description: 'Email addresses to grant access' },
          allowExternal: { type: 'boolean', description: 'Allow addresses outside the tenant domains. Set only after the user explicitly confirms each external address.' },
        },
        required: ['siteId', 'role', 'emails'],
      },
    },
    {
      name: 'reset_password',
      description: "Reset a Microsoft 365 user's password. A generated password is never returned.",
      inputSchema: {
        type: 'object',
        properties: {
          userIdOrUpn: { type: 'string', description: 'User ID or UPN (email)' },
          newPassword: { type: 'string', description: 'Optional new password. Generates one if omitted.' },
        },
        required: ['userIdOrUpn'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const client = createGraphClient();
  const args = request.params.arguments as Record<string, unknown>;

  let text: string;

  switch (request.params.name) {
    case 'list_sites':
      text = await listSites(client);
      break;
    case 'get_site':
      text = await getSite(client, args.siteUrl as string);
      break;
    case 'list_libraries':
      text = await listLibraries(client, args.siteId as string);
      break;
    case 'list_files':
      text = await listFiles(client, args.driveId as string, args.folderId as string | undefined);
      break;
    case 'list_users':
      text = await listUsers(client);
      break;
    case 'upload_file':
      text = await uploadFile(
        client,
        args.driveId as string,
        args.filePath as string,
        Buffer.from(args.contentBase64 as string, 'base64')
      );
      break;
    case 'create_folder':
      text = await createFolder(client, args.driveId as string, args.folderName as string, args.parentId as string | undefined);
      break;
    case 'move_file':
      text = await moveFile(client, args.driveId as string, args.itemId as string, args.newParentId as string, args.newName as string | undefined);
      break;
    case 'create_library':
      text = await createLibrary(client, args.siteId as string, args.libraryName as string);
      break;
    case 'set_permissions':
      text = await setPermissions(
        client,
        args.siteId as string,
        args.role as 'read' | 'write' | 'owner',
        args.emails as string[],
        (process.env.TENANT_DOMAINS ?? '').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean),
        args.allowExternal === true
      );
      break;
    case 'reset_password':
      text = await resetPassword(client, args.userIdOrUpn as string, args.newPassword as string | undefined);
      break;
    default:
      text = `Unknown tool: ${request.params.name}`;
  }

  return { content: [{ type: 'text', text }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
