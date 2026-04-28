import express from 'express';
import { toNodeHandler } from 'h3-v2/node';
import entry from './dist/server/server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;

// Serve static assets from dist/client
app.use(express.static(path.join(__dirname, 'dist/client')));

// Pass all other requests to the TanStack Start server handler
const handler = toNodeHandler(entry);
app.use((req, res) => {
  handler(req, res);
});

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
