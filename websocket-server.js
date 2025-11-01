#!/usr/bin/env node

/**
 * KRKL Tournament WebSocket bridge
 * --------------------------------
 * This server maintains a single polling loop against the tournament REST API
 * and pushes consolidated snapshots to any connected WebSocket clients.
 * The goal is to eliminate aggressive per-client polling from the public display.
 */

const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const {
  API_URL = 'http://localhost:8001/krkl-tournament/api.php',
  WS_PORT = '4000',
  WS_HOST = '0.0.0.0',
  WS_PATH = '/ws',
  REFRESH_INTERVAL_MS = '2000',
} = process.env;

const port = Number.parseInt(WS_PORT, 10) || 4000;
const host = WS_HOST;
const wsPath = WS_PATH.startsWith('/') ? WS_PATH : `/${WS_PATH}`;
const refreshInterval = Number.parseInt(REFRESH_INTERVAL_MS, 10) || 2000;

const READY_STATE_OPEN = WebSocket.OPEN;

let lastSnapshot = null;
let lastSnapshotHash = '';
let lastFetchError = null;

const log = (...args) => {
  const timestamp = new Date().toISOString();
  console.log(`[ws-server ${timestamp}]`, ...args);
};

const buildEndpoint = (query) => {
  const hasQuery = API_URL.includes('?');
  const separator = hasQuery ? '&' : '?';
  return `${API_URL}${separator}${query}`;
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status} for ${url}`);
  }
  return response.json();
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const buildSnapshot = ({ matches, teams, rumahSukan, spiritMarks, housePoints }) => ({
  matches: safeArray(matches),
  teams: safeArray(teams),
  rumahSukan: safeArray(rumahSukan),
  spiritMarks: safeArray(spiritMarks),
  housePoints: safeArray(housePoints),
  fetchedAt: new Date().toISOString(),
});

const broadcastSnapshot = (snapshot, wss) => {
  const payload = JSON.stringify({
    type: 'tournament-update',
    payload: snapshot,
  });

  let sent = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === READY_STATE_OPEN) {
      client.send(payload);
      sent += 1;
    }
  });

  if (sent > 0) {
    log(`Broadcasted snapshot to ${sent} client(s)`);
  }
};

const createServer = () => {
  const server = http.createServer(async (req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      const body = JSON.stringify({
        ok: true,
        clients: wss.clients.size,
        lastSnapshotAt: lastSnapshot?.fetchedAt ?? null,
        lastFetchError: lastFetchError ? lastFetchError.message : null,
        refreshIntervalMs: refreshInterval,
        apiUrl: API_URL,
      });
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      });
      res.end(body);
      return;
    }

    if (req.method === 'GET' && req.url === '/snapshot') {
      if (!lastSnapshot) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: 'Snapshot not yet available' }));
        return;
      }

      const body = JSON.stringify({ ok: true, snapshot: lastSnapshot });
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      });
      res.end(body);
      return;
    }

    // Proxy API requests to the main API
    if (req.url.startsWith('/api.php')) {
      try {
        const apiUrl = `${API_URL}${req.url.split('?')[1] ? '?' + req.url.split('?')[1] : ''}`;
        
        // Collect request body for POST/PUT/PATCH requests
        let requestBody = '';
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          await new Promise((resolve, reject) => {
            req.on('data', chunk => { requestBody += chunk.toString(); });
            req.on('end', resolve);
            req.on('error', reject);
          });
        }

        // Forward request to PHP API with same method and body
        const fetchOptions = {
          method: req.method,
          headers: {
            'Content-Type': req.headers['content-type'] || 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
        };

        if (requestBody) {
          fetchOptions.body = requestBody;
        }

        const response = await fetch(apiUrl, fetchOptions);
        const body = await response.text();

        res.writeHead(response.status, {
          'Content-Type': response.headers.get('content-type') || 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(body);
      } catch (error) {
        console.error('API Proxy Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: error.message }));
      }
      return;
    }

    // Serve built React app
    if (req.method === 'GET') {
      const buildDir = path.join(__dirname, 'krkl-tournament', 'public-display');
      let filePath;

      if (req.url === '/' || req.url === '/public' || req.url === '/public/') {
        filePath = path.join(buildDir, 'index.html');
      } else if (req.url.startsWith('/admin/static/')) {
        // Remove /admin prefix for static files
        filePath = path.join(buildDir, req.url.replace('/admin', ''));
      } else if (req.url.startsWith('/static/')) {
        filePath = path.join(buildDir, req.url);
      } else if (req.url.startsWith('/public/')) {
        filePath = path.join(buildDir, req.url.replace('/public', ''));
      } else if (req.url.startsWith('/admin')) {
        filePath = path.join(buildDir, 'index.html');
      } else {
        filePath = path.join(buildDir, req.url);
      }

      // Check if file exists
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon'
        };
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        const content = fs.readFileSync(filePath);
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
        return;
      }
      
      // Fallback to index.html for SPA routing
      if (!req.url.startsWith('/api.php') && !req.url.startsWith('/ws')) {
        const indexPath = path.join(buildDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          const content = fs.readFileSync(indexPath);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
          return;
        }
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, message: 'Not found' }));
  });

  const wss = new WebSocket.Server({ noServer: true, clientTracking: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const { pathname } = new URL(request.url, `http://${request.headers.host}`);
      if (pathname !== wsPath) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } catch (error) {
      log('Failed to upgrade connection:', error);
      socket.destroy();
    }
  });

  const heartbeat = function heartbeat() {
    this.isAlive = true;
  };

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    ws.on('message', (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        if (message?.type === 'refresh') {
          log('Manual refresh requested via WebSocket');
          void fetchSnapshot({ forceBroadcast: true, wss });
        }
      } catch (error) {
        log('Failed to handle incoming message:', error);
      }
    });

    ws.on('error', (error) => {
      log('WebSocket client error:', error);
    });

    ws.on('close', () => {
      ws.isAlive = false;
    });

    ws.send(JSON.stringify({ type: 'ready' }));

    if (lastSnapshot) {
      ws.send(
        JSON.stringify({
          type: 'tournament-update',
          payload: lastSnapshot,
        })
      );
    }
  });

  const keepAliveInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  keepAliveInterval.unref?.();

  server.on('close', () => {
    clearInterval(keepAliveInterval);
  });

  return { server, wss };
};

const fetchSnapshot = async ({ forceBroadcast = false, wss } = {}) => {
  try {
    const [matches, teams, rumahSukan, spiritMarks, housePoints] = await Promise.all([
      fetchJson(buildEndpoint('action=matches')),
      fetchJson(buildEndpoint('action=teams')),
      fetchJson(buildEndpoint('action=rumah_sukan')),
      fetchJson(buildEndpoint('resource=spirit_marks')),
      fetchJson(buildEndpoint('resource=house_points')),
    ]);

    const snapshot = buildSnapshot({
      matches,
      teams,
      rumahSukan,
      spiritMarks,
      housePoints,
    });

    const snapshotHash = JSON.stringify(snapshot);

    if (forceBroadcast || snapshotHash !== lastSnapshotHash) {
      lastSnapshot = snapshot;
      lastSnapshotHash = snapshotHash;
      broadcastSnapshot(snapshot, wss);
    }

    lastFetchError = null;
  } catch (error) {
    lastFetchError = error;
    log('Failed to fetch snapshot:', error.message);
  }
};

const { server, wss } = createServer();

server.listen(port, host, () => {
  log(`WebSocket bridge listening on ${host}:${port}${wsPath}`);
  log(`Polling tournament API at ${API_URL} every ${refreshInterval}ms`);
});

fetchSnapshot({ forceBroadcast: false, wss });

const pollInterval = setInterval(() => {
  void fetchSnapshot({ forceBroadcast: false, wss });
}, refreshInterval);

pollInterval.unref?.();

const gracefulShutdown = (signal) => {
  log(`Received ${signal}, shutting down...`);
  clearInterval(pollInterval);
  server.close(() => {
    log('HTTP server closed');
    wss.clients.forEach((ws) => ws.terminate());
    process.exit(0);
  });

  // Fallback exit in case close hangs
  setTimeout(() => {
    log('Force exiting after timeout');
    process.exit(1);
  }, 5000).unref?.();
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
