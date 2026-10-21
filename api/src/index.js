import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { buildRouter } from './routes.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const app = express();

const allowedOrigin = (process.env.CORS_ORIGIN ?? '*').trim();

app.use(
  cors({
    origin: allowedOrigin === '*' ? true : allowedOrigin.split(',').map((s) => s.trim()).filter(Boolean),
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));

const apiRouter = buildRouter();
app.use('/api', apiRouter);
app.use('/nodejs/api', apiRouter);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFrontendDir = String(process.env.FRONTEND_DIR ?? '').trim();
const candidates = [
  envFrontendDir ? path.resolve(process.cwd(), envFrontendDir) : '',
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, '../../public_html')
].filter(Boolean);

let publicDir = '';
let indexHtml = '';
for (const dir of candidates) {
  const idx = path.join(dir, 'index.html');
  if (fs.existsSync(idx)) {
    publicDir = dir;
    indexHtml = idx;
    break;
  }
}
const hasFrontend = !!indexHtml;

if (hasFrontend) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'not_found' });
    return res.sendFile(indexHtml);
  });
} else {
  app.get('/', (_req, res) => res.json({ ok: true, mode: 'api' }));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'not_found' });
    return res.status(404).json({ error: 'frontend_not_deployed' });
  });
}

const port = Number(process.env.PORT ?? '3000');
app.listen(port, () => {
  console.log(`api_listening ${port}`);
});
