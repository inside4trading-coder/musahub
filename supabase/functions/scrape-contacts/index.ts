const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const results: Record<string, { email: string | null; whatsapp: string | null }> = {};

    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < websites.length; i += batchSize) {
      const batch = websites.slice(i, i + batchSize);
      
      const promises = batch.map(async (entry: { id: string; url: string }) => {
        try {
          let url = entry.url.trim();
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
          }

          const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url,
              formats: ['markdown'],
              onlyMainContent: false,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            console.warn(`Failed to scrape ${url}:`, data);
            results[entry.id] = { email: null, whatsapp: null };
            return;
          }

          const content = data?.data?.markdown || data?.markdown || '';
          
          // Extract emails
          const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
          const emails = content.match(emailRegex) || [];
          // Filter out common non-contact emails
          const filteredEmails = emails.filter((e: string) => 
            !e.includes('example.com') && 
            !e.includes('sentry') && 
            !e.includes('webpack') &&
            !e.endsWith('.png') &&
            !e.endsWith('.jpg')
          );

          // Extract WhatsApp numbers - look for wa.me links or "whatsapp" nearby phone patterns
          const waLinkRegex = /wa\.me\/(\+?\d{7,15})/gi;
          const waLinks = content.match(waLinkRegex) || [];
          let whatsapp: string | null = null;
          
          if (waLinks.length > 0) {
            const match = waLinks[0].match(/wa\.me\/(\+?\d{7,15})/i);
            whatsapp = match ? match[1] : null;
          } else {
            // Look for phone numbers near "whatsapp" keyword
            const waSection = content.toLowerCase().indexOf('whatsapp');
            if (waSection !== -1) {
              const nearby = content.substring(Math.max(0, waSection - 100), waSection + 200);
              const phoneMatch = nearby.match(/(\+?\d[\d\s\-().]{7,18}\d)/);
              whatsapp = phoneMatch ? phoneMatch[1].replace(/[\s\-().]/g, '') : null;
            }
          }

          results[entry.id] = {
            email: filteredEmails.length > 0 ? filteredEmails[0] : null,
            whatsapp: whatsapp,
          };
        } catch (err) {
          console.warn(`Error processing ${entry.url}:`, err);
          results[entry.id] = { email: null, whatsapp: null };
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
