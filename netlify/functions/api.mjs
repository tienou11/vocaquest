import { handleApi } from '../../server/http.mjs';

export default async (req) => handleApi(req);

export const config = { path: '/api/*' };
