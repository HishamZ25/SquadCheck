import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { User } from '../types';
import { DicebearService } from '../services/dicebearService';
import { userCache } from '../services/userCache';

interface UserContextValue {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export const useCurrentUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserDoc = async (uid: string): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        if (!userData.id) userData.id = uid;
        const fbUser = auth.currentUser;
        if (!userData.displayName && fbUser?.displayName) {
          userData.displayName = fbUser.displayName;
        }
        if (!userData.email && fbUser?.email) {
          userData.email = fbUser.email;
        }
        // Gamification defaults for existing users
        if (userData.xp === undefined) userData.xp = 0;
        if (userData.level === undefined) userData.level = 1;
        if (userData.levelTitle === undefined) userData.levelTitle = 'Rookie';
        if (userData.totalCheckIns === undefined) userData.totalCheckIns = 0;
        if (userData.longestStreak === undefined) userData.longestStreak = 0;
        userCache.set(userData);
        return userData;
      }

      // Create user doc if it doesn't exist
      const fbUser = auth.currentUser;
      const displayName =
        fbUser?.displayName ||
        (fbUser?.email ? fbUser.email.split('@')[0] : 'User') ||
        'User';

      const newUser: User = {
        id: uid,
        email: fbUser?.email || '',
        displayName,
        photoURL: DicebearService.generateAvatarUrl(displayName, 400),
        title: null,
        badges: [],
        unlockedTitles: [],
        unlockedProfileIcons: [],
        xp: 0,
        level: 1,
        levelTitle: 'Rookie',
        totalCheckIns: 0,
        longestStreak: 0,
        createdAt: new Date(),
        lastActive: new Date(),
      };

      try {
        await setDoc(doc(db, 'users', uid), newUser);
      } catch {
        // If Firestore write fails, still return local data
      }
      userCache.set(newUser);
      return newUser;
    } catch {
      // Fallback: return basic info from auth
      const fbUser = auth.currentUser;
      if (!fbUser) return null;
      const displayName =
        fbUser.displayName ||
        (fbUser.email ? fbUser.email.split('@')[0] : 'User') ||
        'User';
      return {
        id: uid,
        email: fbUser.email || '',
        displayName,
        photoURL: DicebearService.generateAvatarUrl(displayName, 400),
        title: null,
        badges: [],
        unlockedTitles: [],
        unlockedProfileIcons: [],
        xp: 0,
        level: 1,
        levelTitle: 'Rookie',
        totalCheckIns: 0,
        longestStreak: 0,
        createdAt: new Date(),
        lastActive: new Date(),
      };
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userData = await fetchUserDoc(fbUser.uid);
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshUser = async () => {
    const fbUser = auth.currentUser;
    if (fbUser) {
      const userData = await fetchUserDoc(fbUser.uid);
      setUser(userData);
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};
