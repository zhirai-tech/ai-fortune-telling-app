import { query } from './db.js';

function buildChatUrl(baseUrl) {
  const b = String(baseUrl ?? '').trim().replace(/\/$/, '');
  if (!b) return '';
  if (b.endsWith('/v1')) return `${b}/chat/completions`;
  return `${b}/v1/chat/completions`;
}

async function resolveAiConfig() {
  const rows = await query(
    'select provider,base_url,model,api_key,is_default from ai_provider_configs where is_default=1 order by updated_at desc limit 1'
  ).catch(() => []);
  const r = Array.isArray(rows) ? rows[0] : null;
  if (r?.provider && r?.base_url && r?.model && r?.api_key) {
    return { provider: r.provider, baseUrl: r.base_url, model: r.model, apiKey: r.api_key };
  }

  const provider = (process.env.AI_PROVIDER ?? '').trim();
  const baseUrl = (process.env.AI_BASE_URL ?? '').trim();
  const model = (process.env.AI_MODEL ?? '').trim();
  const apiKey = (process.env.AI_API_KEY ?? '').trim();
  if (provider && baseUrl && model && apiKey) return { provider, baseUrl, model, apiKey };

  throw new Error('ai_not_configured');
}

export async function callChatJSON(prompt) {
  const cfg = await resolveAiConfig();
  const url = buildChatUrl(cfg.baseUrl);
  if (!url) throw new Error('ai_base_url_invalid');

  const body = {
    model: cfg.model,
    messages: [
      { role: 'system', content: 'Return JSON only.' },
      { role: 'user', content: String(prompt ?? '') }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${cfg.apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = String(data?.error?.message || data?.message || `http_${res.status}`);
    throw new Error(msg);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('ai_empty');

  try {
    return JSON.parse(content);
  } catch {
    throw new Error('ai_json_parse_failed');
  }
}

export async function callChatText(messages, opts = {}) {
  const cfg = await resolveAiConfig();
  const url = buildChatUrl(cfg.baseUrl);
  if (!url) throw new Error('ai_base_url_invalid');

  const temperature = typeof opts.temperature === 'number' ? opts.temperature : 0.7;
  const maxTokens = typeof opts.maxTokens === 'number' ? opts.maxTokens : undefined;

  const body = {
    model: cfg.model,
    messages: Array.isArray(messages) ? messages : [],
    temperature
  };
  if (maxTokens) body.max_tokens = maxTokens;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${cfg.apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = String(data?.error?.message || data?.message || `http_${res.status}`);
    throw new Error(msg);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('ai_empty');
  return String(content);
}
