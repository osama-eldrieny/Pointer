/**
 * Pointer API as a Netlify Function — reuses the shared core (src/core.js)
 * with a Netlify Blobs store instead of the filesystem. Comments persist in the
 * site-scoped "pointer" blob store, partitioned by project.
 */
import { getStore } from '@netlify/blobs';
import { handleApi, STATUSES, DEFAULT_STATUS } from '../../src/core.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Comments are partitioned per project AND per status, one blob key per status:
//   <project>/open, <project>/pending-apply, <project>/applied
// The legacy <project>/comments blob is merged in on read and migrated into the
// per-status keys on the next write, then deleted.
// STATUSES / DEFAULT_STATUS come from core.js (single source of truth).

// Strong consistency so a read immediately after a write returns the new data.
const makeStore = () => {
  const s = getStore({ name: 'pointer', consistency: 'strong' });
  return {
    getComments: async (p) => {
      const keys = [`${p}/comments`, ...STATUSES.map((st) => `${p}/${st}`)];
      const parts = await Promise.all(keys.map((k) => s.get(k, { type: 'json' })));
      const byId = new Map();
      for (const arr of parts) if (Array.isArray(arr)) for (const c of arr) byId.set(c.id, c);
      return [...byId.values()].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    },
    setComments: async (p, arr) => {
      const buckets = Object.fromEntries(STATUSES.map((st) => [st, []]));
      for (const c of arr) (buckets[c.status] || buckets[DEFAULT_STATUS]).push(c);
      await Promise.all(STATUSES.map((st) => s.setJSON(`${p}/${st}`, buckets[st])));
      await s.delete(`${p}/comments`);
    },
    getPending: async (p) => (await s.get(`${p}/pending`, { type: 'json' })) || [],
    setPending: async (p, arr) => s.setJSON(`${p}/pending`, arr),
  };
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams);
  let body = {};
  if (req.method === 'POST' || req.method === 'PATCH') {
    try { body = await req.json(); } catch (e) { return json(400, { error: 'Invalid JSON body' }); }
  }

  const result = await handleApi({
    method: req.method, pathname: url.pathname, query, body, store: makeStore(),
  });
  if (result.status === 204) return new Response(null, { status: 204, headers: CORS });
  return json(result.status, result.json);
};

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export const config = {
  path: [
    '/api/comments',
    '/api/comments/:id',
    '/api/comments/:id/reply',
    '/api/comments/:id/reply/:replyId',
    '/api/pending-apply',
  ],
};
