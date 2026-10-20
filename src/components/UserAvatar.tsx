import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getUserAvatarUrl } from '../lib/auth';

export function UserAvatar({ user }: { user: User | null }) {
  const avatarUrl = getUserAvatarUrl(user);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const name = [user?.user_metadata.full_name, user?.user_metadata.name, user?.email]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const initial = Array.from(name?.trim() || 'Shine')[0].toLocaleUpperCase();

  return <div className="user-avatar" aria-hidden="true">
    {avatarUrl && avatarUrl !== failedUrl
      ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailedUrl(avatarUrl)} />
      : initial}
  </div>;
}
