// netlify/functions/review-adviser.js
// ONJO Reviews AI Adviser — Regular Netlify Function (matches netlify.toml setup)
// Modes: chat | trending | recommendations | seo | news

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL          = 'gemini-2.5-flash';
const GEMINI_BASE    = 'https://generativelanguage.googleapis.com/v1beta/models';

const CACHE_TTL = 6 * 60 * 60 * 1000;
if (!globalThis._reviewCache) globalThis._reviewCache = {};

const SYSTEM_PROMPTS = {
  chat: `You are an expert product review strategist and content coach for ONJO Reviews, a product review platform.
You help content creators write better, more trustworthy, and more SEO-effective product reviews.
Be concise, practical, and specific. Use bullet points and structure when helpful.
Focus on: review structure, verdict writing, affiliate strategy, reader trust, SEO, and content quality.
Today is March 2026.`,

  trending: `You are a product trend analyst for ONJO Reviews, a product review and affiliate platform.
Search for what products people are actively looking to buy right now. Return SPECIFIC product names, not categories.
Format your response EXACTLY like this with numbered lists:

## 🔥 Top Products to Review This Week
1. [Specific Product Name] — [why it's trending, estimated search volume, affiliate commission tier]
2. [Specific Product Name] — [why it's trending, estimated search volume, affiliate commission tier]
3. [Specific Product Name] — [why it's trending, estimated search volume, affiliate commission tier]
4. [Specific Product Name] — [reason]
5. [Specific Product Name] — [reason]

## 📈 Rising Search Terms (use these as review titles)
1. "Best [product] under $[price]" — [monthly searches estimate]
2. "[Product] vs [Product] comparison" — [monthly searches estimate]
3. "[Product] review [year]" — [monthly searches estimate]
4. "Is [product] worth it?" — [monthly searches estimate]
5. "Cheapest [product] that still works" — [monthly searches estimate]

## ⚡ Quick Win Reviews (low competition, high buyer intent)
1. [Specific product + title idea] — [reason it's a quick win]
2. [Specific product + title idea] — [reason it's a quick win]
3. [Specific product + title idea] — [reason it's a quick win]

Be specific with real product names. Each item must be a specific reviewable product, not a generic category. Today is March 2026.`,

  recommendations: `You are an affiliate revenue strategist for ONJO Reviews, a product review platform.
Suggest product review ideas ranked by affiliate conversion potential and buyer intent.
Format your response with clear sections:
## 💰 Highest Affiliate Potential Reviews (list specific products with estimated commission rates)
## 🔥 Comparison Posts That Convert (specific head-to-head reviews with strong buyer intent)
## 🎯 Buyer Intent Keywords to Target (actual search queries people use before buying)
## ⚡ Quick Win Opportunities (low competition, high buyer intent, easy to rank)
For each item: give a clickable title idea, why it converts, and where to place the main CTA.
Be specific — name actual products, brands, and approximate commission tiers.`,

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
    generationConfig: { temperature: 0.7, maxOutputTokens: 3000 },
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

      // Build conversation history so Gemini has memory of past messages
      const history = Array.isArray(body.history) ? body.history : [];
      const contents = [];

      // Add up to last 12 messages for context
      const recentHistory = history.slice(-12);
      for (const m of recentHistory) {
        if (m.role === 'user' || m.role === 'assistant') {
          contents.push({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || m.text || '' }],
          });
        }
      }

      // Add current message if not already in history
      const lastContent = contents[contents.length - 1];
      if (!lastContent || lastContent.parts[0].text !== userMsg) {
        contents.push({ role: 'user', parts: [{ text: userMsg }] });
      }

      if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set.');
      const geminiBody = {
        system_instruction: { parts: [{ text: SYSTEM_PROMPTS.chat }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
      };
      const res = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });
      if (!res.ok) { const e = await res.text(); throw new Error(`Gemini error ${res.status}: ${e}`); }
      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const result = parts.find(p => p.text && !p.thought)?.text || parts[0]?.text || 'No response generated.';
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
  if (mode === 'recommendations') return `Generate affiliate-optimized product review ideas for ONJO Reviews focused on: "${topic}".

Format your response EXACTLY like this with numbered lists:

## 💰 Highest Affiliate Commission Reviews
1. [Specific Product Name] Review: Is It Worth It? — [estimated commission: $X per sale, affiliate program name]
2. [Specific Product Name] Review: [angle] — [estimated commission]
3. [Specific Product Name]: [angle] — [estimated commission]
4. [Specific Product Name]: [angle] — [estimated commission]
5. [Specific Product Name]: [angle] — [estimated commission]

## 🔥 Comparison Posts That Convert
1. [Product A] vs [Product B]: Which Should You Buy? — [why this converts, buyer intent level]
2. [Product A] vs [Product B]: [angle] — [conversion reason]
3. Best [Category] Under $[Price]: [Year] — [search volume estimate]
4. [Product] Alternatives: [X] Cheaper Options — [buyer intent]
5. [Product] vs [Product] vs [Product]: Full Comparison — [conversion reason]

## ⚡ Quick Win Low-Competition Reviews
1. [Specific Product] — [why low competition, estimated monthly searches]
2. [Specific Product] — [why low competition, estimated monthly searches]
3. [Specific Product] — [why low competition, estimated monthly searches]

## 🎯 Buyer Intent Keywords to Target
1. "best [specific product type] for [specific use case]" — [monthly searches]
2. "[product name] review [year]" — [monthly searches]
3. "is [product] worth buying" — [monthly searches]
4. "[product] pros and cons" — [monthly searches]
5. "cheapest [product] that [benefit]" — [monthly searches]

Use real, specific product names in every item. Each numbered item must be immediately actionable.`;
  if (mode === 'seo') return `Give specific, actionable SEO advice for a product review site in this niche: "${topic}". Cover: title optimization, schema markup, featured snippets, internal linking, keyword targeting, and quick wins for 2025-2026.`;
  return `Help me with "${topic}" for my product review platform.`;
}