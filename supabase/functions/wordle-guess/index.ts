// Optional Edge Function wrapper around submit_wordle_guess.
// Prefer calling the Postgres RPC directly from the client with the user JWT.
// Deploy when you need HTTP rate limiting or additional request metadata.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'missing authorization' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { guess } = await req.json();
    if (typeof guess !== 'string') {
      return new Response(JSON.stringify({ error: 'invalid guess' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const publishableRaw = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
    let publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
    if (publishableRaw) {
      try {
        publishableKey = (JSON.parse(publishableRaw) as Record<string, string>)['default'] ?? publishableKey;
      } catch {
        /* keep singular */
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      publishableKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data, error } = await supabase.rpc('submit_wordle_guess', { p_guess: guess });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
