// netlify/functions/review-adviser.js
// ONJO Reviews AI Adviser — powered by Google Gemini (matches ai-advisor.js pattern)
// Modes: chat | trending | recommendations | seo | news

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL          = 'gemini-2.0-flash';
const GEMINI_BASE    = 'https://generativelanguage.googleapis.com/v1beta/models';

// Simple in-memory cache (resets on cold start)
const cache = new Map();
const CACHE_TTL = {
  trending:        6  * 60 * 60 * 1000,
  recommendations: 6  * 60 * 60 * 1000,
  seo:             12 * 60 * 60 * 1000,
  news:            2  * 60 * 60 * 1000,
};

const SYSTEM_PROMPTS = {
  chat: `You are an expert product review strategist and content coach for ONJO Reviews, a product review platform.
You help content creators write better, more trustworthy, and more SEO-effective product reviews.
Be concise, practical, and specific. Use bullet points and structure when helpful.
Focus on: review structure, verdict writing, affiliate strategy, reader trust, SEO, and content quality.`,

  trending: `You are a product trend analyst for ONJO Reviews.
Identify trending product categories and specific products that review sites should be covering right now.
Format your response with clear sections:
## 🔥 Hot Categories Right Now
## 📱 Specific Products to Review This Week
## 📈 Rising Search Terms
## ⚡ Quick Win Opportunities
Be specific with product names, categories, and why they're trending. Keep it actionable.`,

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
Focus on practical tactics that improve rankings for "best X" and "X review" queries.`,

  news: `You are a product news analyst for ONJO Reviews.
Search for and summarize the latest product launches, consumer tech news, and trending items that a product review site should cover.
Format your response with clear sections:
## 📰 What's Happening Right Now
## ✍️ Reviews to Write This Week (with suggested SEO titles)
## ⚔️ Hot Comparisons to Cover
## 👀 Watch List — Coming Soon
Be specific about actual products, brands, and why they matter for review content.`,
};

async function callGemini(prompt, systemPrompt, useGrounding = false) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set in Netlify.');
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
  };

  if (useGrounding) {
    body.tools = [{ google_search: {} }];
  }

  const url = `${GEMINI_BASE}/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > (CACHE_TTL[entry.mode] || 3600000)) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value, mode) {
  cache.set(key, { value, ts: Date.now(), mode });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type':                 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
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
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing mode parameter' }) };
  }

  try {
    let result;

    if (mode === 'chat') {
      const userMsg = (message || '').trim();
      if (!userMsg) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Empty message' }) };
      result = await callGemini(userMsg, SYSTEM_PROMPTS.chat, false);
      return { statusCode: 200, headers, body: JSON.stringify({ result }) };
    }

    if (mode === 'news') {
      const topic    = (customTopic || message || 'consumer tech and new product launches').trim();
      const cacheKey = `news:${topic}`;
      const cached   = getCached(cacheKey);
      if (cached) return { statusCode: 200, headers, body: JSON.stringify({ result: cached }) };
      const prompt = `Search the web for the latest news about: "${topic}"
Then give me a detailed breakdown for ONJO Reviews content creators:
- What major products launched or were announced recently?
- What product controversies or viral stories are circulating?
- What are people searching for and buying right now in this space?
- What specific review articles should we publish this week based on this news?
Provide real, current information with specific product names and brands.`;
      result = await callGemini(prompt, SYSTEM_PROMPTS.news, true);
      setCached(cacheKey, result, 'news');
      return { statusCode: 200, headers, body: JSON.stringify({ result }) };
    }

    if (mode === 'trending') {
      const topic    = (customTopic || message || 'consumer products and tech gadgets').trim();
      const cacheKey = `trending:${topic}`;
      const cached   = getCached(cacheKey);
      if (cached) return { statusCode: 200, headers, body: JSON.stringify({ result: cached }) };
      const prompt = `What products and categories are trending right now for review content in the niche: "${topic}"?
Provide specific product names, brands, search trends, and why they're hot.
What should a product review site be publishing about this week to capture traffic?`;
      result = await callGemini(prompt, SYSTEM_PROMPTS.trending, true);
      setCached(cacheKey, result, 'trending');
      return { statusCode: 200, headers, body: JSON.stringify({ result }) };
    }

    if (mode === 'recommendations') {
      const topic    = (customTopic || message || 'product reviews and buying guides').trim();
      const cacheKey = `recommendations:${topic}`;
      const cached   = getCached(cacheKey);
      if (cached) return { statusCode: 200, headers, body: JSON.stringify({ result: cached }) };
      const prompt = `Generate content ideas for a product review site focused on: "${topic}".
What review articles, comparisons, and buying guides should they create to:
1. Capture high buyer-intent search traffic
2. Fill underserved content gaps
3. Drive affiliate conversions
4. Build topical authority
Be specific with titles, product categories, and keyword opportunities.`;
      result = await callGemini(prompt, SYSTEM_PROMPTS.recommendations, false);
      setCached(cacheKey, result, 'recommendations');
      return { statusCode: 200, headers, body: JSON.stringify({ result }) };
    }

    if (mode === 'seo') {
      const topic    = (customTopic || message || 'product review website').trim();
      const cacheKey = `seo:${topic}`;
      const cached   = getCached(cacheKey);
      if (cached) return { statusCode: 200, headers, body: JSON.stringify({ result: cached }) };
      const prompt = `Give me specific, actionable SEO advice for a product review site in this niche: "${topic}".
Cover: title optimization, schema markup, featured snippets, internal linking, keyword targeting, and quick wins.
Focus on tactics that work in 2025 for review-focused content.`;
      result = await callGemini(prompt, SYSTEM_PROMPTS.seo, false);
      setCached(cacheKey, result, 'seo');
      return { statusCode: 200, headers, body: JSON.stringify({ result }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown mode: ${mode}` }) };

  } catch (err) {
    console.error('review-adviser error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err.message,
        hint: !GEMINI_API_KEY
          ? 'GEMINI_API_KEY is missing — add it in Netlify → Site config → Environment variables.'
          : 'Check Netlify function logs for the full error.',
      }),
    };
  }
};