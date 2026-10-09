import { handleMcp } from '../../server/mcp.mjs';

export default async (req) => handleMcp(req);

export const config = { path: '/mcp/*' };
