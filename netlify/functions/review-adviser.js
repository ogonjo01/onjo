// netlify/functions/review-adviser.js
// ONJO Reviews AI Adviser — Regular Netlify Function (matches netlify.toml setup)
// Modes: chat | trending | recommendations | seo | news

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL          = 'gemini-2.0-flash';
const GEMINI_BASE    = 'https://generativelanguage.googleapis.com/v1beta/models';

const CACHE_TTL = 6 * 60 * 60 * 1000;
if (!globalThis._reviewCache) globalThis._reviewCache = {};

const SYSTEM_PROMPTS = {
  chat: `You are an expert product review strategist and content coach for ONJO Reviews, a product review platform.
You help content creators write better, more trustworthy, and more SEO-effective product reviews.
Be concise, practical, and specific. Use bullet points and structure when helpful.
Focus on: review structure, verdict writing, affiliate strategy, reader trust, SEO, and content quality.
Today is March 2026.`,

  trending: `You are a product trend analyst for ONJO Reviews.
Identify trending product categories and specific products that review sites should be covering right now.
Format your response with clear sections:
## 🔥 Hot Categories Right Now
## 📱 Specific Products to Review This Week
## 📈 Rising Search Terms
## ⚡ Quick Win Opportunities
Be specific with product names, categories, and why they're trending. Keep it actionable. Today is March 2026.`,

  recommendations: `You are a content strategy advisor for ONJO Reviews, a product review platform.
Suggest specific review content ideas that fill gaps and drive traffic.
Format your response with clear sections:
## 💡 High-Opportunity Review Topics
## 🔍 Underserved Niches
## 📊 Comparison Posts to Write
## 🎯 Buyer Intent Keywords to Target
Be specific, actionable, and focused on what will drive search traffic and affiliate conversions.`,

  seo: `You are an SEO expert specializing in product review websites.
Give specific, actionable SEO advice for ONJO Reviews content creators.
Format your response with clear sections:
## 🏆 Title & Headline Optimization
## 🔍 Schema Markup for Reviews
## 📌 Featured Snippet Strategies
## 🔗 Internal Linking for Review Sites
## 📊 Keyword Targeting Tips
Focus on practical tactics that improve rankings for "best X" and "X review" queries in 2025-2026.`,

  news: `You are a product news analyst for ONJO Reviews.
Search for and summarize the latest product launches, consumer tech news, and trending items that a product review site should cover.
Format your response with clear sections:
## 📰 What's Happening Right Now
## ✍️ Reviews to Write This Week (with suggested SEO titles)
## ⚔️ Hot Comparisons to Cover
## 👀 Watch List — Coming Soon
Be specific about actual products, brands, and why they matter for review content. Today is March 2026.`,
};

async function callGemini(prompt, systemPrompt, useGrounding = false) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in Netlify environment variables.');
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
  };

  if (useGrounding) {
    body.tools = [{ google_search: {} }];
  }

  const res = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  // Handle thinking models that return thought + text parts
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.find(p => p.text && !p.thought)?.text || parts[0]?.text || 'No response generated.';
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type':                 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let mode, message, customTopic;
  try {
    ({ mode, message, customTopic } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!mode) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing mode' }) };
  }

  try {
    // ── CHAT — no cache ──────────────────────────────────────────────────────
    if (mode === 'chat') {
      const userMsg = (message || '').trim();
      if (!userMsg) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Empty message' }) };
      const result = await callGemini(userMsg, SYSTEM_PROMPTS.chat, false);
      return { statusCode: 200, headers, body: JSON.stringify({ result }) };
    }

    // ── Cached modes ─────────────────────────────────────────────────────────
    const topic    = (customTopic || message || getDefaultTopic(mode)).trim();
    const cacheKey = `${mode}:${topic}`;
    const cached   = globalThis._reviewCache[cacheKey];

    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      return { statusCode: 200, headers: { ...headers, 'X-Cache': 'HIT' }, body: JSON.stringify({ result: cached.data }) };
    }

    const useGrounding = mode === 'news' || mode === 'trending';
    const result = await callGemini(buildPrompt(mode, topic), SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat, useGrounding);

    globalThis._reviewCache[cacheKey] = { data: result, ts: Date.now() };
    return { statusCode: 200, headers: { ...headers, 'X-Cache': 'MISS' }, body: JSON.stringify({ result }) };

  } catch (err) {
    console.error('review-adviser error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

function getDefaultTopic(mode) {
  return { trending: 'consumer products and tech gadgets', recommendations: 'product reviews and buying guides', seo: 'product review website', news: 'consumer tech and new product launches' }[mode] || 'product reviews';
}

function buildPrompt(mode, topic) {
  if (mode === 'news') return `Search the web for the latest news about: "${topic}"\nWhat major products launched recently? What controversies are circulating? What are people searching for and buying? What specific review articles should we publish this week? Use real current product names and brands.`;
  if (mode === 'trending') return `Search the web: what products and categories are trending RIGHT NOW for review content in: "${topic}"? Give specific product names, brands, current search trends, and why they're hot. What should a review site publish this week for maximum traffic?`;
  if (mode === 'recommendations') return `Generate content ideas for a product review site focused on: "${topic}". What review articles, comparisons, and buying guides should they create to capture buyer-intent traffic, fill content gaps, drive affiliate conversions, and build topical authority? Be specific with titles and keyword opportunities.`;
  if (mode === 'seo') return `Give specific, actionable SEO advice for a product review site in this niche: "${topic}". Cover: title optimization, schema markup, featured snippets, internal linking, keyword targeting, and quick wins for 2025-2026.`;
  return `Help me with "${topic}" for my product review platform.`;
}