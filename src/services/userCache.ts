import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

const cache = new Map<string, User>();

export const userCache = {
  /** Get a single user profile, returning cached if available. */
  async getUser(id: string): Promise<User | null> {
    const cached = cache.get(id);
    if (cached) return cached;

    try {
      const userDoc = await getDoc(doc(db, 'users', id));
      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() } as User;
        cache.set(id, userData);
        return userData;
      }
    } catch {
      // ignore fetch errors for individual users
    }
    return null;
  },

  /** Get multiple user profiles in parallel, using cache for already-fetched ones. */
  async getUsers(ids: string[]): Promise<Map<string, User>> {
    const result = new Map<string, User>();
    const uncached: string[] = [];

    for (const id of ids) {
      const cached = cache.get(id);
      if (cached) {
        result.set(id, cached);
      } else {
        uncached.push(id);
      }
    }

    if (uncached.length > 0) {
      const fetched = await Promise.all(
        uncached.map(async (id) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', id));
            if (userDoc.exists()) {
              const userData = { id: userDoc.id, ...userDoc.data() } as User;
              cache.set(id, userData);
              return userData;
            }
          } catch {
            // ignore
          }
          return null;
        })
      );

      for (const u of fetched) {
        if (u) result.set(u.id, u);
      }
    }

    return result;
  },

  /** Put a user into the cache (e.g. from context). */
  set(user: User) {
    cache.set(user.id, user);
  },

  /** Clear the entire cache (e.g. on sign-out). */
  clear() {
    cache.clear();
  },
};
