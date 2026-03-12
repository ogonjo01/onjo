// netlify/functions/review-adviser.js
// ONJO Reviews AI Adviser — Edge Function (matches ai-advisor.js pattern exactly)
// Modes: chat | trending | recommendations | seo | news

const MODEL       = 'gemini-2.0-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ── In-memory cache ───────────────────────────────────────────────────────────
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
if (!globalThis._reviewCache) globalThis._reviewCache = {};

// ── System prompts ────────────────────────────────────────────────────────────
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

// ── Main handler ──────────────────────────────────────────────────────────────
export default async (request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const apiKey = Netlify.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY not set in Netlify environment variables.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const { mode, message, customTopic } = body;

  if (!mode) {
    return new Response(JSON.stringify({ error: 'Missing mode parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // ── CHAT — no cache, no grounding ──────────────────────────────────────
    if (mode === 'chat') {
      const userMsg = (message || '').trim();
      if (!userMsg) {
        return new Response(JSON.stringify({ error: 'Empty message' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const geminiBody = {
        system_instruction: { parts: [{ text: SYSTEM_PROMPTS.chat }] },
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        generationConfig: { maxOutputTokens: 1500, temperature: 0.75 },
      };

      const res = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const result = data?.candidates?.[0]?.content?.parts?.find(p => p.text && !p.thought)?.text
        || data?.candidates?.[0]?.content?.parts?.[0]?.text
        || 'No response generated.';

      return new Response(JSON.stringify({ result }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // ── Non-chat modes: check cache first ─────────────────────────────────
    const topic    = (customTopic || message || '').trim() || getDefaultTopic(mode);
    const cacheKey = `${mode}:${topic}`;
    const cached   = globalThis._reviewCache[cacheKey];

    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      return new Response(JSON.stringify({ result: cached.data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders, 'X-Cache': 'HIT' },
      });
    }

    // ── Build prompt & decide grounding ───────────────────────────────────
    const useGrounding = mode === 'news' || mode === 'trending';
    const prompt       = buildPrompt(mode, topic);
    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;

    const geminiBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
      ...(useGrounding ? { tools: [{ google_search: {} }] } : {}),
    };

    const res = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const result = data?.candidates?.[0]?.content?.parts?.find(p => p.text && !p.thought)?.text
      || data?.candidates?.[0]?.content?.parts?.[0]?.text
      || 'No response generated.';

    // Cache it
    globalThis._reviewCache[cacheKey] = { data: result, ts: Date.now() };

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, 'X-Cache': 'MISS' },
    });

  } catch (err) {
    console.error('review-adviser error:', err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDefaultTopic(mode) {
  const defaults = {
    trending:        'consumer products and tech gadgets',
    recommendations: 'product reviews and buying guides',
    seo:             'product review website',
    news:            'consumer tech and new product launches',
  };
  return defaults[mode] || 'product reviews';
}

function buildPrompt(mode, topic) {
  if (mode === 'news') {
    return `Search the web for the latest news about: "${topic}"
Give me a detailed breakdown for ONJO Reviews content creators:
- What major products launched or were announced recently?
- What product controversies or viral stories are circulating?
- What are people searching for and buying right now in this space?
- What specific review articles should we publish this week based on this news?
Provide real, current information with specific product names and brands.`;
  }
  if (mode === 'trending') {
    return `Search the web: what products and categories are trending RIGHT NOW for review content in the niche: "${topic}"?
Provide specific product names, brands, current search trends, and why they're hot right now.
What should a product review site be publishing this week to capture maximum traffic?`;
  }
  if (mode === 'recommendations') {
    return `Generate content ideas for a product review site focused on: "${topic}".
What review articles, comparisons, and buying guides should they create to:
1. Capture high buyer-intent search traffic
2. Fill underserved content gaps in the market
3. Drive affiliate conversions
4. Build topical authority on Google
Be specific with titles, product categories, and keyword opportunities.`;
  }
  if (mode === 'seo') {
    return `Give me specific, actionable SEO advice for a product review site in this niche: "${topic}".
Cover: title optimization, schema markup, featured snippets, internal linking, keyword targeting, and quick wins.
Focus on tactics that work in 2025-2026 for review-focused content ranking on Google.`;
  }
  return `Help me with "${topic}" for my product review platform.`;
}

export const config = { path: '/api/review-adviser' };