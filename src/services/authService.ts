import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from '../types';
import { DicebearService } from './dicebearService';

export class AuthService {
  // Sign up with email and password
  static async signUp(email: string, password: string, displayName: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile with display name
      await updateProfile(user, { displayName });

      // Create user document in Firestore
      const userData: User = {
        id: user.uid,
        email: user.email || '',
        displayName,
        photoURL: DicebearService.generateAvatarUrl(displayName, 400), // Generate high-quality Dicebear avatar
        title: null, // Set to null instead of undefined
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

      await setDoc(doc(db, 'users', user.uid), userData);
      return userData;
    } catch (error) {
      if (__DEV__) console.error('Error signing up:', error);
      throw error;
    }
  }

  // Sign in with email and password
  static async signIn(email: string, password: string): Promise<FirebaseUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      if (__DEV__) console.error('Error signing in:', error);
      throw error;
    }
  }

  // Sign out
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      if (__DEV__) console.error('Error signing out:', error);
      throw error;
    }
  }

  // Get current user data from Firestore
  static async getCurrentUser(): Promise<User | null> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return null;
      }

      // Try to get user document from Firestore
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', user.uid));
      } catch (error: any) {
        // If permissions error, try to create the document
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
          // Fall through to create user document
        } else {
          throw error;
        }
      }

      // If document exists, return it
      if (userDoc?.exists()) {
        const userData = userDoc.data() as User;
        // CRITICAL: Ensure id is always set
        if (!userData.id) {
          userData.id = user.uid;
        }
        // Ensure displayName is set from Firebase Auth if missing in Firestore
        if (!userData.displayName && user.displayName) {
          userData.displayName = user.displayName;
        }
        // Ensure email is set
        if (!userData.email && user.email) {
          userData.email = user.email;
        }
        return userData;
      }

      // If no Firestore document exists, create one from Firebase Auth user
      // Use displayName if available, otherwise use email username or a default
      const displayName = user.displayName ||
                         (user.email ? user.email.split('@')[0] : 'User') ||
                         'User';

      const userData: User = {
        id: user.uid,
        email: user.email || '',
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

      // Save to Firestore for future use
      try {
        await setDoc(doc(db, 'users', user.uid), userData);
      } catch (error: any) {
        // If we can't write to Firestore, still return the user data
        // This allows the app to work even if Firestore rules are strict
        if (__DEV__) console.warn('Could not create user document in Firestore:', error?.message);
        // Return the user data anyway so the app can function
      }

      return userData;
    } catch (error: any) {
      if (__DEV__) console.error('Error getting current user:', error);
      // If there's a permissions error, try to return basic user info from auth
      const user = auth.currentUser;
      if (user) {
        const displayName = user.displayName ||
                           (user.email ? user.email.split('@')[0] : 'User') ||
                           'User';
        return {
          id: user.uid,
          email: user.email || '',
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
      return null;
    }
  }

  // Update user profile
  static async updateProfile(updates: Partial<User>): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');

      await updateDoc(doc(db, 'users', user.uid), {
        ...updates,
        lastActive: new Date(),
      });
    } catch (error) {
      if (__DEV__) console.error('Error updating profile:', error);
      throw error;
    }
  }

  // Update last active timestamp
  static async updateLastActive(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await updateDoc(doc(db, 'users', user.uid), {
        lastActive: new Date(),
      });
    } catch (error) {
      if (__DEV__) console.error('Error updating last active:', error);
    }
  }

  // Send email verification
  static async sendEmailVerification(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');
      if (user.emailVerified) {
        return;
      }
      await firebaseSendEmailVerification(user);
    } catch (error) {
      if (__DEV__) console.error('Error sending verification email:', error);
      throw error;
    }
  }

  // Check if email is verified (reloads user from server)
  static async checkEmailVerification(): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');
      await user.reload();
      return user.emailVerified;
    } catch (error) {
      if (__DEV__) console.error('Error checking email verification:', error);
      throw error;
    }
  }

  // Send password reset email (like sign up flow: user receives email with link)
  static async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await firebaseSendPasswordResetEmail(auth, email);
    } catch (error) {
      if (__DEV__) console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  // Delete user account and Firestore document
  static async deleteAccount(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');

      // Delete Firestore user document first
      try {
        await deleteDoc(doc(db, 'users', user.uid));
      } catch (e) {
        if (__DEV__) console.warn('Could not delete user doc:', e);
      }

      // Delete Firebase Auth account
      await deleteUser(user);
    } catch (error) {
      if (__DEV__) console.error('Error deleting account:', error);
      throw error;
    }
  }
}
