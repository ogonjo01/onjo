// netlify/functions/review-adviser.js
// AI Adviser for ONJO Reviews — powered by Claude claude-haiku-4-5-20251001
// Modes: chat | news | trending | recommendations | seo
//
// NEWS mode uses Anthropic web_search tool so it pulls LIVE stories,
// then tells you exactly what reviews to write — same as OGONJO's Marcus news mode.

const MODEL      = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1200;

const cache = new Map();
const CACHE_TTL = {
  news:            2 * 60 * 60 * 1000,
  trending:        6 * 60 * 60 * 1000,
  recommendations: 6 * 60 * 60 * 1000,
  seo:             6 * 60 * 60 * 1000,
};

const getCached = (key, ttl) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > ttl) { cache.delete(key); return null; }
  return hit.value;
};
const setCached = (key, value) => cache.set(key, { value, ts: Date.now() });

const extractText = (content = []) => {
  const parts = [];
  for (const block of content) {
    if (block.type === 'text' && block.text) parts.push(block.text.trim());
  }
  return parts.join('\n\n') || 'No response generated.';
};

const SYSTEM = {
  chat: `You are an expert content strategist and product review specialist for ONJO Reviews,
a product review and recommendation platform. Your name is ONJO Adviser.
You help the review team write compelling reviews, structure content, improve SEO,
decide what to review next, and craft affiliate-friendly copy that converts.
Keep responses concise, practical, and actionable. Use bullet points for lists.`,

  news: `You are a product news analyst for ONJO Reviews with access to web search.

Your job:
1. Search the web for the LATEST news about new product launches, new software releases,
   new apps, new AI tools, new gadgets, new services — what is happening RIGHT NOW.
2. From those real, live news stories — tell the ONJO Reviews team exactly what 
   they should write reviews about this week.

ALWAYS use the web_search tool first. Search for current product launches and news.
Only report products and stories you actually found via search. Never invent anything.

Format your response EXACTLY like this:

## 📰 What's Happening Right Now
[2-3 sentences summarising the biggest product/tech news from your search]

## 🎯 Reviews You Should Write This Week
1. **[Exact product/app/tool name]** — [What it is + why readers want to know about it now]
   → Suggested title: "[SEO-optimised review title]"
   → Angle: [The specific review angle that will rank and convert]

2. **[Product name]** — [same format]
   → Suggested title: "..."
   → Angle: ...

(Give 5-7 items based on real news you found)

## ⚡ Quick-Hit Comparison Opportunities
- **[Product A] vs [Product B]** — [Why this comparison is hot right now based on the news]
(3 items)

## 📌 Watch List — Pre-write Now Before Everyone Else
- **[Upcoming product/launch]** — [Why get ahead of it]
(2-3 items)

Use the ACTUAL product names from your web search. Be specific. Be current.`,

  trending: `You are a product trend analyst for ONJO Reviews. Surface what products,
categories, and topics are trending RIGHT NOW that the team should be reviewing.

## 🔥 Trending Now
- [Product/category] — [why it's trending]
(5-8 items)

## 📈 About to Peak
- [Product/category] — [why it's about to trend]
(3-5 items)

## 💡 Evergreen Opportunities
- [Topic] — [why it always performs]
(3 items)`,

  recommendations: `You are a content gap analyst for ONJO Reviews. Recommend specific
products and review topics to maximise organic traffic and affiliate revenue.

## 💡 High-Priority Reviews to Write
1. [Product name] — [search intent, competition level, affiliate potential]
(5-7 recommendations)

## 🎯 Category Deep-Dives
- [Category] — [specific angle to cover]
(3-4 ideas)

## 🔗 Comparison Posts (High Converting)
- [Product A] vs [Product B] — [why this drives traffic]
(3 ideas)`,

  seo: `You are an SEO specialist for product review websites. Give practical SEO advice for ONJO Reviews.

## 🔍 Title & URL Optimization
[Advice for review page titles and keyword patterns]

## ⭐ Review Schema Markup
[What structured data to implement and why]

## 📝 Content Structure Tips
[How to structure a review for featured snippets]

## 🔗 Link Building for Review Sites
[Specific tactics]

## 🎯 Quick Wins
- [Actionable tip]
(4-5 bullet points)`,
};

const NEWS_QUERIES = {
  all:      'new product launches apps software tools gadgets announced released 2025',
  tech:     'new tech gadgets smartphones devices hardware announced 2025',
  software: 'new software apps SaaS platforms tools released 2025',
  ai:       'new AI tools models products apps launched 2025',
  home:     'new home appliances smart home gadgets products 2025',
  fitness:  'new fitness equipment wearables health tech products 2025',
  finance:  'new fintech apps financial tools investing products 2025',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { mode = 'chat', message = '', customTopic = '', newsFilter = 'all' } = body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not set.' }) };
  }

  // Cache check
  if (mode !== 'chat') {
    const cacheKey = mode === 'news'
      ? `news:${newsFilter}:${customTopic.toLowerCase().trim()}`
      : `${mode}:${customTopic.toLowerCase().trim()}`;
    const ttl = CACHE_TTL[mode] || 6 * 60 * 60 * 1000;
    const cached = getCached(cacheKey, ttl);
    if (cached) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ result: cached, cached: true }),
      };
    }
  }

  try {
    let result;

    if (mode === 'news') {
      const baseQuery = NEWS_QUERIES[newsFilter] || NEWS_QUERIES.all;
      const topicExtra = customTopic.trim() ? ` Focus specifically on: "${customTopic}".` : '';
      const userMessage = `Search the web now for the latest news using this query: "${baseQuery}".${topicExtra}\n\nFind real current news about new product launches, new apps, new software, new tools. Then tell me exactly what product reviews I should write this week based on what you found.`;

      let messages = [{ role: 'user', content: userMessage }];
      let iterations = 0;

      while (iterations < 6) {
        iterations++;
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'web-search-2025-03-05',
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 1500,
            system: SYSTEM.news,
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            messages,
          }),
        });

        if (!resp.ok) {
          const errText = await resp.text();
          console.error('News API error:', errText);
          result = `Could not fetch live news (${resp.status}). Try refreshing.`;
          break;
        }

        const data = await resp.json();
        const { content, stop_reason } = data;
        messages.push({ role: 'assistant', content });

        if (stop_reason === 'end_turn') {
          result = extractText(content);
          break;
        }

        // tool_use blocks — return empty tool_result to continue the loop
        const toolUses = content.filter(b => b.type === 'tool_use');
        if (toolUses.length === 0) { result = extractText(content); break; }

        messages.push({
          role: 'user',
          content: toolUses.map(tu => ({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: tu.output || '',
          })),
        });
      }

      if (!result) result = 'News search timed out. Please try again.';

    } else {
      // Standard call — no web search
      let userMessage;
      if (mode === 'chat') {
        userMessage = message.trim() || 'Hello, what can you help me with?';
      } else {
        const topicLine = customTopic.trim()
          ? `Focus specifically on: "${customTopic}".`
          : 'Focus on general product review content opportunities.';
        userMessage = `${topicLine}\n\nPlease provide your analysis now.`;
      }

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM[mode] || SYSTEM.chat,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error('Anthropic error:', errText);
        return { statusCode: resp.status, body: JSON.stringify({ error: `API error: ${resp.status}` }) };
      }

      const data = await resp.json();
      result = data?.content?.[0]?.text || 'No response generated.';
    }

    // Cache
    if (mode !== 'chat') {
      const cacheKey = mode === 'news'
        ? `news:${newsFilter}:${customTopic.toLowerCase().trim()}`
        : `${mode}:${customTopic.toLowerCase().trim()}`;
      setCached(cacheKey, result);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ result }),
    };

  } catch (err) {
    console.error('review-adviser error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal server error' }) };
  }
};