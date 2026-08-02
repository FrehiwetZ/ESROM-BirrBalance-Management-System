import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();

  const apiProxy = createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    pathRewrite: {
      '^': '/api',
    },
  });

  const uploadsProxy = createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
  });

  app.use('/api', apiProxy);
  app.use('/uploads', uploadsProxy);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (API proxy → ${BACKEND_URL})`);
  });
}

startServer();