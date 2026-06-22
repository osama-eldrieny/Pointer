/**
 * Pointer API core — storage-agnostic, zero-dependency (CommonJS).
 *
 * All comment logic + routing lives here so the standalone Node server (filesystem
 * storage) and the Netlify Function (Netlify Blobs storage) share one implementation.
 *
 * A `store` is an object with four async methods, scoped per project:
 *   getComments(project) -> Promise<Comment[]>
 *   setComments(project, arr) -> Promise<void>
 *   getPending(project) -> Promise<PendingEntry[]>
 *   setPending(project, arr) -> Promise<void>
 *
 * handleApi() returns { status, json } (json may be undefined for 204).
 */
'use strict';

const PROJECT_RE = /^[a-zA-Z0-9._-]+$/;
const sanitizeProject = (p) => (p && typeof p === 'string' && PROJECT_RE.test(p) ? p : null);
const generateId = () => 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
const generateReplyId = () => 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
const J = (status, json) => ({ status, json });

function buildComment(project, body) {
  const {
    page_url, element_selector, element_snapshot, pin_x, pin_y, author, text,
    element_classes, element_tag, element_id, computed_styles, applied_css_rules,
    parent_element_info, environment, stakeholder, source_path,
  } = body;

  let elementTagName = element_tag || 'unknown';
  let elementClasses = element_classes || [];
  let elementId = element_id || null;
  if (element_snapshot && !element_tag) {
    const tagMatch = element_snapshot.match(/<(\w+)/);
    if (tagMatch) elementTagName = tagMatch[1];
    const classMatch = element_snapshot.match(/class="([^"]*)"/);
    if (classMatch) elementClasses = classMatch[1].split(/\s+/).filter(Boolean);
    const idMatch = element_snapshot.match(/id="([^"]*)"/);
    if (idMatch) elementId = idMatch[1];
  }

  const hasStructuralPath = element_selector && (
    element_selector.includes('>') || element_selector.includes('nth-of-type') ||
    element_selector.includes('nth-child') || element_selector.includes('#'));
  const isPureClassSelector = element_selector && /^\.[\w-]+$/.test(element_selector);

  return {
    id: generateId(),
    project,
    environment: environment || null,
    stakeholder: stakeholder || null,
    page_url,
    source_path: source_path || null,
    element_selector,
    element_snapshot,
    element_tag: elementTagName,
    element_classes: elementClasses,
    element_id: elementId,
    computed_styles: computed_styles || {},
    applied_css_rules: applied_css_rules || [],
    parent_element_info: parent_element_info || {},
    pin_x: pin_x || 0,
    pin_y: pin_y || 0,
    author,
    text,
    status: 'open',
    scope: isPureClassSelector ? 'class' : 'element',
    apply_to: isPureClassSelector ? 'all-similar' : 'element-only',
    created_at: new Date().toISOString(),
    replies: [],
  };
}

function syncPending(project, comment, pending) {
  const hasReplyPending = comment.replies && comment.replies.some((r) => r.status === 'pending-apply');
  const isCommentPending = comment.status === 'pending-apply';
  if (hasReplyPending || isCommentPending) {
    const entry = {
      id: comment.id, project,
      environment: comment.environment, stakeholder: comment.stakeholder,
      apply_comment: isCommentPending,
      apply_reply_ids: (comment.replies || []).filter((r) => r.status === 'pending-apply').map((r) => r.id),
      original_comment: { text: comment.text, status: comment.status },
      replies: comment.replies,
      element_selector: comment.element_selector,
      element_snapshot: comment.element_snapshot,
      element_classes: comment.element_classes,
      applied_css_rules: comment.applied_css_rules,
      parent_element_info: comment.parent_element_info,
      source_path: comment.source_path,
      page_url: comment.page_url,
      author: comment.author,
      created_at: comment.created_at,
      pin_x: comment.pin_x, pin_y: comment.pin_y,
    };
    const i = pending.findIndex((p) => p.id === comment.id);
    if (i >= 0) pending[i] = entry; else pending.push(entry);
    return pending;
  }
  return pending.filter((p) => p.id !== comment.id);
}

/**
 * @param {{method:string, pathname:string, query:object, body:object, store:object}} ctx
 * @returns {Promise<{status:number, json?:any}>}
 */
async function handleApi({ method, pathname, query, body, store }) {
  const inQuery = method === 'GET' || method === 'DELETE';
  const project = sanitizeProject(inQuery ? query.project : (body && body.project));
  if (!project) {
    return J(400, { error: 'A valid `project` is required (alphanumerics, dot, dash, underscore).' });
  }

  // GET /api/comments
  if (method === 'GET' && pathname === '/api/comments') {
    let comments = await store.getComments(project);
    if (query.page_url) comments = comments.filter((c) => c.page_url === query.page_url);
    if (query.environment) comments = comments.filter((c) => c.environment === query.environment);
    return J(200, comments);
  }

  // GET /api/pending-apply
  if (method === 'GET' && pathname === '/api/pending-apply') {
    return J(200, await store.getPending(project));
  }

  // POST /api/comments
  if (method === 'POST' && pathname === '/api/comments') {
    if (!body.page_url || !body.author || !body.text) {
      return J(400, { error: 'page_url, author, and text are required' });
    }
    const comments = await store.getComments(project);
    const comment = buildComment(project, body);
    comments.push(comment);
    await store.setComments(project, comments);
    return J(201, comment);
  }

  let m;
  // POST /api/comments/:id/reply
  if (method === 'POST' && (m = pathname.match(/^\/api\/comments\/([^/]+)\/reply$/))) {
    if (!body.author || !body.text) return J(400, { error: 'author and text are required' });
    const comments = await store.getComments(project);
    const comment = comments.find((c) => c.id === m[1]);
    if (!comment) return J(404, { error: 'Comment not found' });
    const reply = { id: generateReplyId(), author: body.author, text: body.text, created_at: new Date().toISOString() };
    comment.replies.push(reply);
    await store.setComments(project, comments);
    return J(201, reply);
  }

  // PATCH /api/comments/:id
  if (method === 'PATCH' && (m = pathname.match(/^\/api\/comments\/([^/]+)$/))) {
    const comments = await store.getComments(project);
    const comment = comments.find((c) => c.id === m[1]);
    if (!comment) return J(404, { error: 'Comment not found' });
    if (body.status) comment.status = body.status;
    if (body.replyId && body.replies) {
      comment.replies = body.replies.map((nr, idx) => ({ ...(comment.replies && comment.replies[idx]), ...nr }));
    }
    if (body.text) comment.text = body.text;
    await store.setPending(project, syncPending(project, comment, await store.getPending(project)));
    await store.setComments(project, comments);
    return J(200, comment);
  }

  // DELETE /api/comments/:id/reply/:replyId
  if (method === 'DELETE' && (m = pathname.match(/^\/api\/comments\/([^/]+)\/reply\/([^/]+)$/))) {
    const comments = await store.getComments(project);
    const comment = comments.find((c) => c.id === m[1]);
    if (!comment || !comment.replies) return J(404, { error: 'Comment or replies not found' });
    const before = comment.replies.length;
    comment.replies = comment.replies.filter((r) => r.id !== m[2]);
    if (comment.replies.length === before) return J(404, { error: 'Reply not found' });
    const pending = (await store.getPending(project))
      .map((p) => (p.id === m[1] ? { ...p, apply_reply_ids: (p.apply_reply_ids || []).filter((rid) => rid !== m[2]) } : p))
      .filter((p) => p.apply_comment || (p.apply_reply_ids && p.apply_reply_ids.length > 0));
    await store.setPending(project, pending);
    await store.setComments(project, comments);
    return J(204);
  }

  // DELETE /api/comments/:id
  if (method === 'DELETE' && (m = pathname.match(/^\/api\/comments\/([^/]+)$/))) {
    const comments = await store.getComments(project);
    const filtered = comments.filter((c) => c.id !== m[1]);
    if (filtered.length === comments.length) return J(404, { error: 'Comment not found' });
    await store.setPending(project, (await store.getPending(project)).filter((p) => p.id !== m[1]));
    await store.setComments(project, filtered);
    return J(204);
  }

  return J(404, { error: 'Not found' });
}

module.exports = { handleApi, sanitizeProject };
