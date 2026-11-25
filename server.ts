import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleCtetApiRequest } from './server/examsnetService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  app.get('/api/*', async (req, res) => {
    const urlObj = new URL(req.originalUrl, `http://${req.headers.host || 'localhost'}`);
    const result = await handleCtetApiRequest(urlObj.pathname, urlObj.searchParams);
    if (result.cacheControl) {
      res.setHeader('Cache-Control', result.cacheControl);
    }
    res.status(result.status).json(result.body);
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const candidateRootDist = path.resolve(__dirname, 'dist');
    const candidateParentDist = path.resolve(__dirname, '../dist');
    const distDir = fs.existsSync(candidateRootDist) ? candidateRootDist : candidateParentDist;
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
