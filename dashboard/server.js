#!/usr/bin/env node
/**
 * LADDER dashboard server — Builder B
 *
 *   GET /        -> dashboard/index.html (the demo screen)
 *   GET /events  -> ../events.jsonl parsed into a JSON array
 *                   (missing file -> [], corrupt lines skipped)
 *
 * Node 20 stdlib only. CommonJS. Zero dependencies. Port 4200.
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 4200;
const INDEX_PATH = path.join(__dirname, 'index.html');
const EVENTS_PATH = path.join(__dirname, '..', 'events.jsonl');

function serveIndex(res) {
  fs.readFile(INDEX_PATH, (err, buf) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('dashboard/index.html not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(buf);
  });
}

function serveEvents(res) {
  fs.readFile(EVENTS_PATH, 'utf8', (err, text) => {
    const events = [];
    if (!err && text) {
      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          events.push(JSON.parse(trimmed));
        } catch (_e) {
          // Tolerate partial writes / corrupt lines (agent may be mid-append). Skip.
        }
      }
    }
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(events));
  });
}

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];

  if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
    serveIndex(res);
    return;
  }
  if (req.method === 'GET' && url === '/events') {
    serveEvents(res);
    return;
  }
  if (req.method === 'GET' && url === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`[dashboard] LADDER live on http://localhost:${PORT}`);
  console.log(`[dashboard] reading events from ${EVENTS_PATH} (missing file is fine)`);
});
