/**
 * Pointer API as a Netlify Function — reuses the shared core (comments-skill/core.js)
 * with a Netlify Blobs store instead of the filesystem. Comments persist in the
 * site-scoped "pointer" blob store, partitioned by project.
 */
import { getStore } from '@netlify/blobs';
import { handleApi } from '../../comments-skill/core.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Strong consistency so a read immediately after a write returns the new data.
const makeStore = () => {
  const s = getStore({ name: 'pointer', consistency: 'strong' });
  return {
    getComments: async (p) => (await s.get(`${p}/comments`, { type: 'json' })) || [],
    setComments: async (p, arr) => s.setJSON(`${p}/comments`, arr),
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
