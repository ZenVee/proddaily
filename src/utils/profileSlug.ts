/** Build public profile path slug: stateid-nickname or stateid-firstname-lastname */
export function slugify(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildProfileSlug(profile: {
  state_id: string | null;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
}): string | null {
  const state = slugify(profile.state_id);
  if (!state) return null;

  const nick = slugify(profile.nickname);
  if (nick) return `${state}-${nick}`;

  const first = slugify(profile.first_name);
  const last = slugify(profile.last_name);
  if (!first && !last) return state;
  if (!last) return `${state}-${first}`;
  if (!first) return `${state}-${last}`;
  return `${state}-${first}-${last}`;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
