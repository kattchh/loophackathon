/**
 * The earn side writes to the SAME events.jsonl the brain/dashboard use — one
 * unified stream. Mirrors ladder_agent.py's emit(): append a JSON line, print it,
 * and fire-and-forget into Nexla when NEXLA_WEBHOOK_URL is set.
 *
 * We only ever APPEND here. Truncation is the orchestrator's job (once, at start).
 */
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVENTS_PATH = process.env.EVENTS_PATH
  ? process.env.EVENTS_PATH
  : join(REPO, 'events.jsonl');

const NEXLA_WEBHOOK_URL = (process.env.NEXLA_WEBHOOK_URL || '').trim();
// When set, events go to the dashboard's /ingest instead of a local file — this is
// what lets the shop/buyer run on a different host than the dashboard (deployed).
const EVENT_SINK_URL = (process.env.EVENT_SINK_URL || '').trim().replace(/\/$/, '');
const INGEST_TOKEN = (process.env.INGEST_TOKEN || '').trim();

function post(url, event, extraHeaders) {
  // Best-effort — a slow endpoint must never stall the show.
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(extraHeaders || {}) },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
}

export function emit(event) {
  const withTs = { ts: Date.now(), ...event };
  if (EVENT_SINK_URL) {
    post(`${EVENT_SINK_URL}/ingest`, withTs, INGEST_TOKEN ? { 'x-ingest-token': INGEST_TOKEN } : undefined);
  } else {
    appendFileSync(EVENTS_PATH, JSON.stringify(withTs) + '\n');
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(withTs));
  if (NEXLA_WEBHOOK_URL) post(NEXLA_WEBHOOK_URL, withTs);
  return withTs;
}
