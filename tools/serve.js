import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, normalize, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HOST = '127.0.0.1';
const DEFAULT_PORT = 8080;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8',
};

export function resolveRequestPath(root, requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  } catch {
    return null;
  }
  const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const absolute = resolve(root, `.${normalize(relative)}`);
  return absolute.startsWith(resolve(root) + sep) ? absolute : null;
}

async function handleRequest(root, request, response) {
  const filePath = resolveRequestPath(root, request.url ?? '/');
  if (!filePath) {
    response.writeHead(400).end('Bad Request');
    return;
  }
  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    response.end(body);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') {
      response.writeHead(404).end('Not Found');
      return;
    }
    console.error(`配信に失敗しました: ${filePath}`, error);
    response.writeHead(500).end('Internal Server Error');
  }
}

export function startServer({ root, port = DEFAULT_PORT }) {
  const server = createServer((request, response) => {
    handleRequest(root, request, response);
  });
  return new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(port, HOST, () => resolvePromise(server));
  });
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  startServer({ root, port })
    .then(() => process.stdout.write(`http://${HOST}:${port}/ で配信中（Ctrl+C で停止）\n`))
    .catch((error) => {
      console.error('サーバーを起動できませんでした', error);
      process.exitCode = 1;
    });
}
