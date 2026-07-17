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

const PORT = Number(process.env.PORT) || 4200;
const INDEX_PATH = path.join(__dirname, 'index.html');
// EVENTS_PATH override lets a cloud deploy (e.g. Akash) serve a replay of a
// recorded run instead of the live local events.jsonl.
const EVENTS_PATH = process.env.EVENTS_PATH
  ? path.resolve(process.env.EVENTS_PATH)
  : path.join(__dirname, '..', 'events.jsonl');

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

// REPLAY=1 (cloud deploys): loop the recorded run in real time forever —
// events are released on their original pacing, then the show restarts after
// a short curtain pause. Judges opening the public URL see the climb happen.
const REPLAY = process.env.REPLAY === '1';
const REPLAY_PAUSE_MS = 15000;
const BOOT_TS = Date.now();

function replaySlice(events) {
  if (events.length === 0) return events;
  const first = events[0].ts;
  const arcMs = events[events.length - 1].ts - first;
  const cycleMs = arcMs + REPLAY_PAUSE_MS;
  const intoCycle = (Date.now() - BOOT_TS) % cycleMs;
  const cycleIndex = Math.floor((Date.now() - BOOT_TS) / cycleMs);
  const cycleStart = BOOT_TS + cycleIndex * cycleMs;
  return events
    .filter(e => e.ts - first <= intoCycle)
    .map(e => ({ ...e, ts: cycleStart + (e.ts - first) }));
}

function serveEvents(res) {
  fs.readFile(EVENTS_PATH, 'utf8', (err, text) => {
    let events = [];
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
    if (REPLAY) events = replaySlice(events);
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
