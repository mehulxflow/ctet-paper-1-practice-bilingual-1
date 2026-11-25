import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleCtetApiRequest } from '../server/examsnetService.ts';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/api/ctet/papers', `http://${req.headers.host || 'localhost'}`);
  const rewrittenPath = url.searchParams.get('__api_path');
  const pathname =
    url.pathname === '/api/index' && rewrittenPath
      ? `/api/${rewrittenPath.replace(/^\/+/, '')}`
      : url.pathname;
  url.searchParams.delete('__api_path');
  const result = await handleCtetApiRequest(pathname, url.searchParams);

  res.statusCode = result.status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (result.cacheControl) {
    res.setHeader('Cache-Control', result.cacheControl);
  }
  res.end(JSON.stringify(result.body));
}
