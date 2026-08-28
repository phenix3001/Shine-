import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';

type AuthContextValue = { isLoading: boolean; user: User | null };
const AuthContext = createContext<AuthContextValue>({ isLoading: true, user: null });

export function getUserAvatarUrl(user: User | null): string | null {
  const avatarUrl = user?.user_metadata.avatar_url;
  if (typeof avatarUrl === 'string' && avatarUrl.length > 0) return avatarUrl;
  const googlePicture = user?.user_metadata.picture;
  return typeof googlePicture === 'string' && googlePicture.length > 0 ? googlePicture : null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (isMounted) {
        setUser(data.user);
        setIsLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, isLoading }), [user, isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
