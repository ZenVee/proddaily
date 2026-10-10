// Curated word list first, then Datamuse for ordinary English.
// Datamuse hits are cached into wordle_allowed_words so submit_wordle_guess stays DB-authoritative.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

/** Prefer named key maps (SUPABASE_*_KEYS); fall back to singular env for local CLI. */
function namedKey(mapEnv: string, singularEnv: string, name = 'default'): string {
  const raw = Deno.env.get(mapEnv);
  if (raw) {
    try {
      const map = JSON.parse(raw) as Record<string, string>;
      if (map[name]) return map[name];
    } catch {
      /* ignore malformed map */
    }
  }
  return Deno.env.get(singularEnv) ?? '';
}

async function datamuseAllows(wordLower: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.datamuse.com/words?sp=${encodeURIComponent(wordLower)}&max=1`,
    );
    if (!res.ok) return false;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return false;
    const hit = data[0]?.word;
    return typeof hit === 'string' && hit.toLowerCase() === wordLower;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'missing authorization' }, 401);
    }

    const body = await req.json();
    const raw = body?.word;
    if (typeof raw !== 'string') {
      return json({ error: 'invalid word' }, 400);
    }

    const normalized = raw.toUpperCase().trim();
    if (!/^[A-Z]{5}$/.test(normalized)) {
      return json({ allowed: false });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const publishableKey = namedKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_PUBLISHABLE_KEY');
    const secretKey = namedKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SECRET_KEY');

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: curated, error: curatedError } = await userClient.rpc(
      'is_allowed_wordle_word',
      { p_word: normalized },
    );

    if (!curatedError && curated) {
      return json({ allowed: true });
    }

    const lower = normalized.toLowerCase();
    const allowedByDatamuse = await datamuseAllows(lower);
    if (!allowedByDatamuse || !secretKey) {
      return json({ allowed: false });
    }

    const admin = createClient(supabaseUrl, secretKey);
    const { error: cacheError } = await admin.from('wordle_allowed_words').upsert(
      { word: normalized },
      { onConflict: 'word', ignoreDuplicates: true },
    );
    if (cacheError) {
      return json({ allowed: false });
    }

    return json({ allowed: true });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
