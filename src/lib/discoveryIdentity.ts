import { readPreference, savePreference } from './browserStorage';

const uuidPattern = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
let visitorId: string | undefined;
let sessionSeed: string | undefined;

export function getVisitorId(): string {
  if (visitorId) return visitorId;
  const saved = readPreference('shine-visitor-id');
  visitorId = saved && uuidPattern.test(saved) ? saved : crypto.randomUUID();
  savePreference('shine-visitor-id', visitorId);
  return visitorId;
}

export function getDiscoverySeed(): string {
  if (sessionSeed) return sessionSeed;
  try {
    const saved = sessionStorage.getItem('shine-discovery-seed');
    sessionSeed = saved && uuidPattern.test(saved) ? saved : crypto.randomUUID();
    sessionStorage.setItem('shine-discovery-seed', sessionSeed);
  } catch { sessionSeed = crypto.randomUUID(); }
  return sessionSeed;
}
