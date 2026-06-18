const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');


const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxIU_9jZkued8MPl6pgFDl7K71jlm48HQLuiFWGH06LUwiyMJsLkufoQePm5NQ68pZS/exec';

const app = express();
const PORT = config.server_port || 3001;
const COMMENTS_FILE = path.join(__dirname, config.comments_file);
const PENDING_APPLY_FILE = path.join(__dirname, './pending-apply.json');

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(__dirname));


const readComments = () => {
  try {
    if (!fs.existsSync(COMMENTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading comments.json:', e.message);
    return [];
  }
};

const writeComments = (data) => {
  try {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing comments.json:', e.message);
    throw e;
  }
};

const readPendingApply = () => {
  try {
    if (!fs.existsSync(PENDING_APPLY_FILE)) return [];
    return JSON.parse(fs.readFileSync(PENDING_APPLY_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading pending-apply.json:', e.message);
    return [];
  }
};

const writePendingApply = (data) => {
  try {
    fs.writeFileSync(PENDING_APPLY_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing pending-apply.json:', e.message);
    throw e;
  }
};

const generateId = () => 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
const generateReplyId = () => 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

const mapUrlToFilePath = (pageUrl) => {
  try {
    // Extract the origin (protocol + host) from the URL dynamically
    const url = new URL(pageUrl);
    const urlBase = `${url.protocol}//${url.host}`;
    const relativePath = pageUrl.replace(urlBase, '');
    const filePath = path.join(config.project_root || '../', relativePath);
    return filePath;
  } catch (e) {
    return null;
  }
};

app.get('/inject.js', (req, res) => {
  const injectionPath = path.join(__dirname, 'inject.js');
  if (!fs.existsSync(injectionPath)) {
    res.status(404).send('inject.js not found');
    return;
  }
  res.type('application/javascript');
  res.send(fs.readFileSync(injectionPath, 'utf8'));
});

app.get('/api/check-changes', (req, res) => {
  const { html_file_path } = req.query;
  if (!html_file_path) {
    return res.status(400).json({ error: 'html_file_path query param required' });
  }

  try {
    // Resolve path from current directory (comments-skill) up to project root
    const filePath = path.resolve(__dirname, html_file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found: ' + filePath });
    }

    const stats = fs.statSync(filePath);
    res.json({
      lastModified: stats.mtimeMs,
      mtime: stats.mtime.toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/bookmarklet', (req, res) => {
  const bookmarklet = "javascript:(function(){var s=document.createElement('script');s.src='http://localhost:3001/inject.js?t='+Date.now();document.head.appendChild(s);})()";
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>HTML Comments Bookmarklet</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; }
        h1 { color: #1f2937; font-size: 32px; margin-bottom: 24px; }
        h2 { color: #374151; font-size: 18px; margin-top: 32px; margin-bottom: 12px; }
        p { color: #4b5563; line-height: 1.8; margin: 12px 0; }
        .bookmark-container { background: #f3f4f6; border: 2px dashed #2563eb; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; }
        a.bookmark { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; text-decoration: none; border-radius: 8px; cursor: grab; font-weight: 600; font-size: 15px; user-select: none; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); transition: all 0.3s ease; }
        a.bookmark:hover { background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35); transform: translateY(-2px); cursor: grab; }
        a.bookmark:active { cursor: grabbing; }
        .instruction-steps { background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px; margin: 16px 0; }
        .instruction-steps li { margin: 8px 0; color: #1e40af; }
        .code-block { background: #1f2937; color: #e5e7eb; padding: 16px; border-radius: 8px; font-family: 'Courier New', monospace; overflow-x: auto; margin: 12px 0; font-size: 12px; }
        .success-icon { font-size: 20px; margin-right: 8px; }
        .step-number { display: inline-block; background: #2563eb; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; margin-right: 12px; }
      </style>
    </head>
    <body>
      <h1>📝 HTML Comments Bookmarklet Setup</h1>

      <div class="bookmark-container">
        <h2 style="margin-top: 0;">👇 Drag this button to your bookmarks bar:</h2>
        <a href="${bookmarklet}" class="bookmark" draggable="true">📌 HTML Comments</a>
        <p style="margin-top: 16px; color: #6b7280;"><strong>How to drag:</strong> Click and hold the button above, then drag it to your browser's bookmarks bar at the top.</p>
      </div>

      <h2>How It Works</h2>
      <div class="instruction-steps">
        <ol>
          <li><strong>Bookmark added:</strong> "HTML Comments" appears in your bookmarks bar</li>
          <li><strong>Open your HTML page:</strong> Visit your local project at http://localhost:8000</li>
          <li><strong>Click the bookmarklet:</strong> Click "HTML Comments" from your bookmarks</li>
          <li><strong>Start commenting:</strong> Use the toolbar to add comments to elements</li>
        </ol>
      </div>

      <h2>Alternative: Manual Bookmark</h2>
      <p>If you can't drag the button, copy and paste the code below into a new bookmark:</p>
      <div class="code-block">${bookmarklet}</div>
      <p style="color: #6b7280; font-size: 13px;"><strong>Steps:</strong> In your browser, right-click bookmarks bar → "Add page" → Paste code above → Name it "HTML Comments"</p>

      <h2>⚠️ Important: Keep the Server Running</h2>
      <p style="color: #7c2d12; background: #fed7aa; padding: 12px; border-radius: 4px;">The terminal running the comments server (port 3001) <strong>must stay open</strong> for the bookmarklet to work. Keep it running in the background while you use the tool.</p>

      <h2>✨ Ready?</h2>
      <p>Go back to your HTML page and click the <strong>"HTML Comments"</strong> bookmarklet from your bookmarks bar to start commenting!</p>
    </body>
    </html>
  `);
});

app.get('/api/comments', (req, res) => {
  const { page_url } = req.query;
  if (!page_url) {
    return res.status(400).json({ error: 'page_url query param required' });
  }

  const allComments = readComments();
  const pageComments = allComments.filter(c => c.page_url === page_url);
  res.json(pageComments);
});

app.get('/api/pending-apply', (req, res) => {
  const pending = readPendingApply();
  res.json(pending);
});


const incrementGlobalCounter = () => {
  try {
    fetch(GOOGLE_SCRIPT_URL + '?action=increment').catch(err => {
      console.log('Global counter update failed:', err.message);
    });
  } catch (e) {
    console.log('Error incrementing global counter:', e.message);
  }
};

app.post('/api/comments', (req, res) => {
  const { page_url, element_selector, element_snapshot, pin_x, pin_y, author, text, element_classes, element_tag, element_id, computed_styles, applied_css_rules, parent_element_info } = req.body;

  if (!page_url || !author || !text) {
    return res.status(400).json({ error: 'page_url, author, and text are required' });
  }

  const comments = readComments();
  const html_file_path = mapUrlToFilePath(page_url);

  // Extract element tag name and classes for Claude Code context
  let elementTagName = element_tag || 'unknown';
  let elementClasses = element_classes || [];
  let elementId = element_id || null;

  if (element_snapshot && !element_tag) {
    const tagMatch = element_snapshot.match(/<(\w+)/);
    if (tagMatch) elementTagName = tagMatch[1];

    const classMatch = element_snapshot.match(/class="([^"]*)"/);
    if (classMatch) {
      elementClasses = classMatch[1].split(/\s+/).filter(c => c);
    }

    const idMatch = element_snapshot.match(/id="([^"]*)"/);
    if (idMatch) {
      elementId = idMatch[1];
    }
  }

  // Determine scope and apply_to based on selector
  const hasStructuralPath = element_selector && (
    element_selector.includes('>') ||
    element_selector.includes('nth-of-type') ||
    element_selector.includes('nth-child') ||
    element_selector.includes('#')
  );
  const isPureClassSelector = element_selector && /^\.[\w-]+$/.test(element_selector);

  let scope = 'element';
  if (isPureClassSelector) {
    scope = 'class';
  } else if (hasStructuralPath) {
    scope = 'element';
  }

  let apply_to = 'element-only';
  if (isPureClassSelector) {
    apply_to = 'all-similar';
  }

  const newComment = {
    id: generateId(),
    page_url,
    html_file_path,
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
    scope: scope,
    apply_to: apply_to,
    created_at: new Date().toISOString(),
    replies: []
  };

  comments.push(newComment);
  writeComments(comments);
  incrementGlobalCounter();
  res.status(201).json(newComment);
});

app.post('/api/comments/:id/reply', (req, res) => {
  const { id } = req.params;
  const { author, text } = req.body;

  if (!author || !text) {
    return res.status(400).json({ error: 'author and text are required' });
  }

  const comments = readComments();
  const comment = comments.find(c => c.id === id);

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const reply = {
    id: generateReplyId(),
    author,
    text,
    created_at: new Date().toISOString()
  };

  comment.replies.push(reply);
  writeComments(comments);
  incrementGlobalCounter();
  res.status(201).json(reply);
});

app.patch('/api/comments/:id', (req, res) => {
  const { id } = req.params;
  const { status, text, replies, replyId } = req.body;

  const comments = readComments();
  const comment = comments.find(c => c.id === id);

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  // Handle comment-level status update
  if (status) {
    comment.status = status;
  }

  // Handle reply status update
  if (replyId && replies) {
    // Merge new replies with existing ones to preserve status fields
    comment.replies = replies.map((newReply, idx) => {
      const oldReply = comment.replies && comment.replies[idx];
      return {
        ...oldReply,
        ...newReply
      };
    });
  }

  if (text) comment.text = text;

  // Manage pending-apply.json
  const pending = readPendingApply();

  // Check if this is a reply-level apply
  const hasReplyPending = comment.replies && comment.replies.some(r => r.status === 'pending-apply');
  const isCommentPending = comment.status === 'pending-apply';

  if (hasReplyPending || isCommentPending) {
    // Comment should be in pending-apply.json (either for itself or for its replies)
    const existingIndex = pending.findIndex(p => p.id === id);

    if (hasReplyPending) {
      // At least one reply is pending-apply
      const pendingReply = comment.replies.find(r => r.status === 'pending-apply');
      const pendingEntry = {
        id: comment.id,
        apply_type: 'reply',
        apply_reply_id: pendingReply.id,
        original_comment: {
          text: comment.text,
          status: comment.status
        },
        replies: comment.replies,
        element_selector: comment.element_selector,
        element_snapshot: comment.element_snapshot,
        html_file_path: comment.html_file_path,
        page_url: comment.page_url,
        author: comment.author,
        created_at: comment.created_at,
        pin_x: comment.pin_x,
        pin_y: comment.pin_y
      };

      if (existingIndex >= 0) {
        pending[existingIndex] = pendingEntry;
      } else {
        pending.push(pendingEntry);
      }
    } else if (isCommentPending && !hasReplyPending) {
      // Only the main comment is pending
      const pendingEntry = {
        ...comment,
        status: 'pending-apply'
      };

      if (existingIndex >= 0) {
        pending[existingIndex] = pendingEntry;
      } else {
        pending.push(pendingEntry);
      }
    }

    writePendingApply(pending);
  } else {
    // No pending status - remove from pending-apply.json
    const filtered = pending.filter(p => p.id !== id);
    writePendingApply(filtered);
  }

  writeComments(comments);
  res.json(comment);
});

app.delete('/api/comments/:id', (req, res) => {
  const { id } = req.params;

  const comments = readComments();
  const filtered = comments.filter(c => c.id !== id);

  if (filtered.length === comments.length) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  // Also remove from pending-apply.json if it was there
  const pending = readPendingApply();
  const filteredPending = pending.filter(p => p.id !== id);
  writePendingApply(filteredPending);

  writeComments(filtered);
  res.status(204).send();
});


app.get('/api/global-counter', (req, res) => {
  try {
    fetch(GOOGLE_SCRIPT_URL + '?action=getCount')
      .then(r => r.json())
      .then(data => {
        res.json(data);
      })
      .catch(err => {
        console.error('Error fetching from Google Sheet:', err.message);
        res.status(500).json({ success: false, error: err.message });
      });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🎯 HTML Comments server running at http://localhost:${PORT}`);
  console.log(`📌 Bookmarklet page: http://localhost:${PORT}/bookmarklet`);
  console.log(`💾 Comments stored in: ${COMMENTS_FILE}`);
  console.log(`⏳ Pending-apply queue: ${PENDING_APPLY_FILE}`);
  console.log(`\nReady! Open http://localhost:${PORT}/bookmarklet in your browser to get the bookmarklet.\n`);
});
