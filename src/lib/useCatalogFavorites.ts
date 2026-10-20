import { useEffect, useRef, useState } from 'react';
import { loadFavoriteProductIds, setFavorite } from './profileProducts';

type FavoriteState = { owner?: string; ids: string[]; loading: boolean };

export function useCatalogFavorites(userId?: string) {
  const owner = useRef({ id: userId, revision: 0 });
  if (owner.current.id !== userId) owner.current = { id: userId, revision: owner.current.revision + 1 };
  const pending = useRef(new Set<string>());
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [state, setState] = useState<FavoriteState>({ owner: userId, ids: [], loading: Boolean(userId) });
  useEffect(() => {
    let active = true;
    pending.current.clear(); setPendingIds([]);
    setState({ owner: userId, ids: [], loading: Boolean(userId) });
    if (userId) void loadFavoriteProductIds()
      .then((ids) => { if (active) setState({ owner: userId, ids, loading: false }); })
      .catch(() => { if (active) setState({ owner: userId, ids: [], loading: false }); });
    return () => { active = false; };
  }, [userId]);

  const ids = state.owner === userId ? state.ids : [];
  const loading = state.owner !== userId || state.loading;
  async function toggle(id: string) {
    if (!userId || loading || pending.current.has(id)) return;
    const revision = owner.current.revision;
    const nextValue = !ids.includes(id);
    pending.current.add(id); setPendingIds([...pending.current]);
    setState((current) => ({ ...current, ids: nextValue ? [...current.ids, id] : current.ids.filter((item) => item !== id) }));
    try { await setFavorite(userId, id, nextValue); }
    catch (error) {
      if (owner.current.revision === revision) setState((current) => ({ ...current, ids: nextValue ? current.ids.filter((item) => item !== id) : [...current.ids, id] }));
      throw error;
    } finally {
      if (owner.current.revision === revision) { pending.current.delete(id); setPendingIds([...pending.current]); }
    }
  }
  return { favorites: ids, toggle, isPending: (id: string | number) => loading || pendingIds.includes(String(id)) };
}
