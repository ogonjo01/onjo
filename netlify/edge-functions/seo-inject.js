/**
 * netlify/edge-functions/seo-inject.js
 *
 * Runs at the edge (Deno runtime) for every /review/* and /summary/* request.
 * Fetches the post's title, description, and image from Supabase REST API,
 * then injects correct <title>, <meta>, and Open Graph tags into the raw
 * index.html before it reaches the browser or search-engine crawler.
 *
 * This solves the SPA SEO problem: Google no longer has to execute JavaScript
 * to discover per-page titles — they are present in the static HTML response.
 */

const BRAND = 'ONJO Reviews';

// ── helpers ──────────────────────────────────────────────────────────────────

const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const stripTags = (html = '') => String(html).replace(/<[^>]*>/g, '').trim();

const truncate = (str = '', max = 160) => {
  const s = stripTags(str);
  return s.length > max ? `${s.slice(0, max)}…` : s;
};

// ── main handler ─────────────────────────────────────────────────────────────

export default async (request, context) => {
  const url = new URL(request.url);

  // Extract the slug from either /review/<slug> or /summary/<slug>
  const match = url.pathname.match(/^\/(?:review|summary)\/([^/?#]+)/);
  if (!match) return context.next();

  const slug = decodeURIComponent(match[1]);

  // Pass through non-GET requests immediately (e.g. prefetch, HEAD handled fine)
  if (request.method !== 'GET') return context.next();

  // ── Fetch the base HTML from Netlify's own origin ──
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  // ── Read Supabase credentials from environment ──
  const SUPABASE_URL     = Deno.env.get('VITE_SUPABASE_URL');
  const SUPABASE_ANON_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Credentials missing — serve unmodified HTML rather than crashing
    console.warn('[seo-inject] Missing Supabase env vars. Skipping injection.');
    return response;
  }

  try {
    // ── Query Supabase REST for this slug ──
    const apiUrl =
      `${SUPABASE_URL}/rest/v1/book_summaries` +
      `?slug=eq.${encodeURIComponent(slug)}` +
      `&select=title,description,image_url,author,created_at,updated_at,tags,category` +
      `&limit=1`;

    const supaRes = await fetch(apiUrl, {
      headers: {
        apikey:        SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept:        'application/json',
      },
    });

    if (!supaRes.ok) {
      console.warn('[seo-inject] Supabase REST returned', supaRes.status);
      return response;
    }

    const rows = await supaRes.json();
    const post = Array.isArray(rows) ? rows[0] : null;

    // Slug not found — serve unmodified HTML (React will show 404)
    if (!post) return response;

    // ── Build meta values ──
    const pageTitle   = escapeHtml(`${post.title} – ${BRAND}`);
    const description = escapeHtml(truncate(post.description || '', 160));
    const imageUrl    = escapeHtml(post.image_url || `${url.origin}/ogonjo.jpg`);
    const canonicalUrl = escapeHtml(`${url.origin}/review/${slug}`);
    const author      = escapeHtml(post.author || BRAND);
    const published   = post.created_at || '';
    const modified    = post.updated_at || post.created_at || '';

    // Build article:tag meta tags (one per tag)
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const tagMeta = tags
      .map(t => `  <meta property="article:tag" content="${escapeHtml(String(t))}" />`)
      .join('\n');

    // JSON-LD Article schema
    const ldJson = JSON.stringify({
      '@context': 'https://schema.org',
      '@type':    'Article',
      headline:   post.title || BRAND,
      description: stripTags(post.description || '').slice(0, 160),
      author:     { '@type': 'Person', name: post.author || BRAND },
      publisher:  {
        '@type': 'Organization',
        name:    BRAND,
        logo:    { '@type': 'ImageObject', url: `${url.origin}/ogonjo.jpg` },
      },
      image:             post.image_url || `${url.origin}/ogonjo.jpg`,
      datePublished:     published,
      dateModified:      modified,
      mainEntityOfPage:  { '@type': 'WebPage', '@id': `${url.origin}/review/${slug}` },
    });

    // ── Inject into HTML ──
    let html = await response.text();

    // 1. Replace <title>
    html = html.replace(
      /<title>[^<]*<\/title>/,
      `<title>${pageTitle}</title>`
    );

    // 2. Inject all meta + JSON-LD just before </head>
    const injection = `
  <!-- seo-inject edge function -->
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta name="robots" content="index, follow" />

  <!-- Open Graph -->
  <meta property="og:site_name"   content="${escapeHtml(BRAND)}" />
  <meta property="og:type"        content="article" />
  <meta property="og:title"       content="${pageTitle}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url"         content="${canonicalUrl}" />
  <meta property="og:image"       content="${imageUrl}" />
  ${published ? `<meta property="article:published_time" content="${escapeHtml(published)}" />` : ''}
  ${modified  ? `<meta property="article:modified_time"  content="${escapeHtml(modified)}" />`  : ''}
  ${author    ? `<meta property="article:author"         content="${author}" />`                 : ''}
${tagMeta}

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${pageTitle}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image"       content="${imageUrl}" />

  <!-- JSON-LD -->
  <script type="application/ld+json">${ldJson}</script>
  <!-- /seo-inject -->
`;

    html = html.replace('</head>', `${injection}</head>`);

    return new Response(html, {
      status:  response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'content-type': 'text/html; charset=utf-8',
        // Tell CDN to cache this for crawlers but revalidate often
        'cache-control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });

  } catch (err) {
    // Never break the site — fall back to unmodified HTML on any error
    console.error('[seo-inject] Unexpected error:', err);
    return response;
  }
};

export const config = {
  path: ['/review/*', '/summary/*'],
};