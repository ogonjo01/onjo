// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';
import sitemap from 'vite-plugin-sitemap';

const supabaseUrl = 'https://jradzdvnhcanbegovyrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyYWR6ZHZuaGNhbmJlZ292eXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNTY4MzksImV4cCI6MjA3NTkzMjgzOX0.-GcwXTsBf-VQbCeGg0F3iRBqgNsbyEkX0Gk71dZ7Z-c';

const getSlugs = async (): Promise<string[]> => {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/book_summaries?select=slug&slug=not.is.null`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    const data = await res.json() as { slug: string }[];
    console.log('✅ Fetched slugs:', data.length);
    return data.map((row) => `/summary/${row.slug}`);
  } catch (err) {
    console.error('❌ Failed to fetch slugs:', err);
    return [];
  }
};
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  console.log('Loaded VITE env:', env);

  const slugRoutes = await getSlugs();

  return {
    base: '/',
    server: {
      host: '::',
      port: 8082,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
      sitemap({
        hostname: 'https://onjoreviews.com',
        dynamicRoutes: [
          '/',
          '/about',
          '/contact',
          '/faq',
          '/features',
          '/terms',
          '/privacy',
          '/subscribe',
          '/explore',
          ...slugRoutes,
        ],
      }),
    ].filter(Boolean),
    optimizeDeps: {
      include: ['react-quill', 'quill', 'prop-types', 'quill-table'],
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
  };
});