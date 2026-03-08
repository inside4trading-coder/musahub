const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Domains that Firecrawl cannot scrape
const BLOCKED_DOMAINS = ['instagram.com', 'facebook.com', 'fb.com', 'tiktok.com', 'twitter.com', 'x.com', 'linkedin.com'];

function isBlockedUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return BLOCKED_DOMAINS.some(d => hostname.includes(d));
  } catch {
    return false;
  }
}

interface ContactResult {
  email: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  tiktok: string | null;
}

function extractSocialLinks(content: string): Pick<ContactResult, 'instagram' | 'facebook' | 'linkedin' | 'tiktok'> {
  const igMatch = content.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)\/?/i);
  const fbMatch = content.match(/(?:https?:\/\/)?(?:www\.)?facebook\.com\/([a-zA-Z0-9_.%-]+)\/?/i);
  const liMatch = content.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_%-]+)\/?/i);
  const tkMatch = content.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9_.]+)\/?/i);

  return {
    instagram: igMatch ? `https://instagram.com/${igMatch[1]}` : null,
    facebook: fbMatch ? `https://facebook.com/${fbMatch[1]}` : null,
    linkedin: liMatch ? `https://linkedin.com/${liMatch[0].includes('/company/') ? 'company' : 'in'}/${liMatch[1]}` : null,
    tiktok: tkMatch ? `https://tiktok.com/@${tkMatch[1]}` : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { websites } = await req.json();

    if (!websites || !Array.isArray(websites) || websites.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'websites array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Record<string, ContactResult> = {};

    const batchSize = 5;
    for (let i = 0; i < websites.length; i += batchSize) {
      const batch = websites.slice(i, i + batchSize);
      
      const promises = batch.map(async (entry: { id: string; url: string }) => {
        const emptyResult: ContactResult = { email: null, whatsapp: null, instagram: null, facebook: null, linkedin: null, tiktok: null };
        try {
          let url = entry.url.trim();
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
          }

          // Skip blocked domains
          if (isBlockedUrl(url)) {
            console.log(`Skipping blocked domain: ${url}`);
            results[entry.id] = emptyResult;
            return;
          }

          const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url,
              formats: ['markdown', 'links'],
              onlyMainContent: false,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            console.warn(`Failed to scrape ${url}:`, data);
            results[entry.id] = emptyResult;
            return;
          }

          const content = data?.data?.markdown || data?.markdown || '';
          const links = data?.data?.links || data?.links || [];
          const allText = content + '\n' + (Array.isArray(links) ? links.join('\n') : '');
          
          // Extract emails
          const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
          const emails = allText.match(emailRegex) || [];
          const filteredEmails = emails.filter((e: string) => 
            !e.includes('example.com') && 
            !e.includes('sentry') && 
            !e.includes('webpack') &&
            !e.endsWith('.png') &&
            !e.endsWith('.jpg')
          );

          // Extract WhatsApp
          const waLinkRegex = /wa\.me\/(\+?\d{7,15})/gi;
          const waLinks = allText.match(waLinkRegex) || [];
          let whatsapp: string | null = null;
          
          if (waLinks.length > 0) {
            const match = waLinks[0].match(/wa\.me\/(\+?\d{7,15})/i);
            whatsapp = match ? match[1] : null;
          } else {
            const waSection = allText.toLowerCase().indexOf('whatsapp');
            if (waSection !== -1) {
              const nearby = allText.substring(Math.max(0, waSection - 100), waSection + 200);
              const phoneMatch = nearby.match(/(\+?\d[\d\s\-().]{7,18}\d)/);
              whatsapp = phoneMatch ? phoneMatch[1].replace(/[\s\-().]/g, '') : null;
            }
          }

          // Extract social media links
          const social = extractSocialLinks(allText);

          results[entry.id] = {
            email: filteredEmails.length > 0 ? filteredEmails[0] : null,
            whatsapp,
            ...social,
          };
        } catch (err) {
          console.warn(`Error processing ${entry.url}:`, err);
          results[entry.id] = emptyResult;
        }
      });

      await Promise.all(promises);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
