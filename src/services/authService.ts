import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
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
        createdAt: new Date(),
        lastActive: new Date(),
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      return userData;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  }

  // Sign in with email and password
  static async signIn(email: string, password: string): Promise<FirebaseUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  // Sign out
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  // Get current user data from Firestore
  static async getCurrentUser(): Promise<User | null> {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        // Ensure displayName is set from Firebase Auth if missing in Firestore
        if (!userData.displayName && user.displayName) {
          userData.displayName = user.displayName;
        }
        return userData;
      }
      
              // If no Firestore document exists, create one from Firebase Auth user
        if (user.displayName) {
          const userData: User = {
            id: user.uid,
            email: user.email || '',
            displayName: user.displayName,
            photoURL: DicebearService.generateAvatarUrl(user.displayName, 400), // Generate high-quality Dicebear PNG avatar
            title: null,
            badges: [],
            unlockedTitles: [],
            unlockedProfileIcons: [],
            createdAt: new Date(),
            lastActive: new Date(),
          };
          
          // Save to Firestore for future use
          await setDoc(doc(db, 'users', user.uid), userData);
          return userData;
        }
      
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
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
      console.error('Error updating profile:', error);
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
      console.error('Error updating last active:', error);
    }
  }
} 