import { supabase } from '@/lib/supabase';
import type { ProfileRow } from '@/types/database';

export async function completeProfileSetup(input: {
  firstName: string;
  lastName: string;
  stateId: string;
  nickname?: string;
}): Promise<ProfileRow> {
  const { data, error } = await supabase.rpc('complete_profile_setup', {
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_state_id: input.stateId,
    p_nickname: input.nickname ?? null,
  });
  if (error) throw error;
  return data as ProfileRow;
}

export async function updateOwnProfile(input: {
  firstName: string;
  lastName: string;
  stateId: string;
  nickname?: string;
}): Promise<ProfileRow> {
  const { data, error } = await supabase.rpc('update_own_profile', {
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_state_id: input.stateId,
    p_nickname: input.nickname ?? null,
  });
  if (error) throw error;
  return data as ProfileRow;
}

export function avatarPublicUrl(path: string | null | undefined, discordUrl: string | null | undefined): string | null {
  if (path) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  }
  return discordUrl ?? null;
}

export async function uploadCustomAvatar(userId: string, file: File | Blob): Promise<string> {
  const type = file.type || 'image/jpeg';
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(type)) {
    throw new Error('Only JPEG, PNG, WebP, and GIF images are allowed');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Image must be 2MB or smaller');
  }

  const ext =
    type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : type === 'image/gif' ? 'gif' : 'jpg';
  const path = `${userId}/avatar.${ext}`;
  const body = file instanceof File ? file : new File([file], `avatar.${ext}`, { type });

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, body, {
    upsert: true,
    contentType: type,
  });
  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ custom_avatar_path: path })
    .eq('id', userId);
  if (updateError) throw updateError;

  return path;
}

export async function removeCustomAvatar(userId: string, currentPath: string | null): Promise<void> {
  if (currentPath) {
    await supabase.storage.from('avatars').remove([currentPath]);
  }
  const { error } = await supabase
    .from('profiles')
    .update({ custom_avatar_path: null })
    .eq('id', userId);
  if (error) throw error;
}

export async function getPublicProfile(ref: string) {
  const { data, error } = await supabase.rpc('get_public_profile_by_ref', { p_ref: ref });
  if (error) throw error;
  return data as Record<string, unknown> | null;
}
