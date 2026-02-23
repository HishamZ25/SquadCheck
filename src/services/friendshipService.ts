import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Friendship, User } from '../types';
import { AuthService } from './authService';

export class FriendshipService {
  // Get all friends for a user (two targeted queries instead of full-collection scan)
  static async getUserFriends(userId: string): Promise<User[]> {
    try {
      const [snap1, snap2] = await Promise.all([
        getDocs(query(
          collection(db, 'friendships'),
          where('userId1', '==', userId),
          where('status', '==', 'accepted')
        )),
        getDocs(query(
          collection(db, 'friendships'),
          where('userId2', '==', userId),
          where('status', '==', 'accepted')
        )),
      ]);

      const friendIds: string[] = [];
      snap1.docs.forEach((d) => {
        const f = d.data() as Friendship;
        if (f.userId2?.trim()) friendIds.push(f.userId2.trim());
      });
      snap2.docs.forEach((d) => {
        const f = d.data() as Friendship;
        if (f.userId1?.trim()) friendIds.push(f.userId1.trim());
      });

      if (friendIds.length === 0) return [];

      const userPromises = friendIds.map((friendId) =>
        getDoc(doc(db, 'users', friendId))
          .then((userDoc) => {
            if (!userDoc.exists()) return null;
            const data = userDoc.data();
            return { id: userDoc.id, ...data } as User;
          })
          .catch(() => null)
      );

      const results = await Promise.all(userPromises);
      return results.filter((u): u is User => u != null);
    } catch (error) {
      if (__DEV__) console.error('Error getting user friends:', error);
      return [];
    }
  }

  // Check if two users are friends
  static async areUsersFriends(user1Id: string, user2Id: string): Promise<boolean> {
    try {
      const friendshipsQuery = query(
        collection(db, 'friendships'),
        where('status', '==', 'accepted')
      );

      const querySnapshot = await getDocs(friendshipsQuery);
      
      for (const doc of querySnapshot.docs) {
        const friendship = doc.data() as Friendship;
        if ((friendship.userId1 === user1Id && friendship.userId2 === user2Id) ||
            (friendship.userId1 === user2Id && friendship.userId2 === user1Id)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      if (__DEV__) console.error('Error checking friendship status:', error);
      return false;
    }
  }

  // Get pending friend requests for a user
  static async getPendingFriendRequests(userId: string): Promise<Friendship[]> {
    try {
      const requestsQuery = query(
        collection(db, 'friendships'),
        where('userId2', '==', userId),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(requestsQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Friendship[];
    } catch (error) {
      if (__DEV__) console.error('Error getting pending friend requests:', error);
      return [];
    }
  }

  // Get friendship count for a user
  static async getFriendCount(userId: string): Promise<number> {
    try {
      const friends = await this.getUserFriends(userId);
      return friends.length;
    } catch (error) {
      if (__DEV__) console.error('Error getting friend count:', error);
      return 0;
    }
  }

  // Search for a user by username or user ID
  static async searchUser(searchQuery: string): Promise<User | null> {
    try {
      // First try to find by exact user ID
      const userDoc = await getDoc(doc(db, 'users', searchQuery));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
      }

      // Then try to find by username (case-insensitive)
      const usersQuery = query(
        collection(db, 'users')
      );
      const querySnapshot = await getDocs(usersQuery);
      
      for (const docSnapshot of querySnapshot.docs) {
        const userData = docSnapshot.data();
        if (userData.displayName?.toLowerCase() === searchQuery.toLowerCase()) {
          return { id: docSnapshot.id, ...userData } as User;
        }
      }

      return null;
    } catch (error) {
      if (__DEV__) console.error('Error searching for user:', error);
      throw new Error('Failed to search for user');
    }
  }

  // Send a friend request
  static async sendFriendRequest(fromUserId: string, toUserId: string): Promise<void> {
    try {
      // Check if already friends
      const areFriends = await this.areUsersFriends(fromUserId, toUserId);
      if (areFriends) {
        throw new Error('You are already friends with this user');
      }

      // Check if there's already a pending request
      const existingRequests = query(
        collection(db, 'friendRequests'),
        where('fromUserId', '==', fromUserId),
        where('toUserId', '==', toUserId),
        where('status', '==', 'pending')
      );
      const existingSnapshot = await getDocs(existingRequests);
      if (!existingSnapshot.empty) {
        throw new Error('Friend request already sent');
      }

      // Check if there's a reverse pending request (they sent you one)
      const reverseRequests = query(
        collection(db, 'friendRequests'),
        where('fromUserId', '==', toUserId),
        where('toUserId', '==', fromUserId),
        where('status', '==', 'pending')
      );
      const reverseSnapshot = await getDocs(reverseRequests);
      if (!reverseSnapshot.empty) {
        throw new Error('This user has already sent you a friend request. Check your notifications!');
      }

      // Get sender's info
      const fromUserDoc = await getDoc(doc(db, 'users', fromUserId));
      if (!fromUserDoc.exists()) {
        throw new Error('User not found');
      }
      const fromUserData = fromUserDoc.data();

      // Create friend request
      await addDoc(collection(db, 'friendRequests'), {
        fromUserId,
        fromUserName: fromUserData.displayName || 'Unknown',
        fromUserPhoto: fromUserData.photoURL || '',
        toUserId,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    } catch (error: any) {
      if (__DEV__) console.error('Error sending friend request:', error);
      throw error;
    }
  }

  // Get pending friend requests for a user
  static async getPendingRequests(userId: string): Promise<any[]> {
    try {
      const requestsQuery = query(
        collection(db, 'friendRequests'),
        where('toUserId', '==', userId),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(requestsQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      if (__DEV__) console.error('Error getting pending requests:', error);
      return [];
    }
  }

  // Accept a friend request
  static async acceptFriendRequest(requestId: string, userId: string, fromUserId: string): Promise<void> {
    try {
      // Update request status
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
      });

      // Create friendship
      await addDoc(collection(db, 'friendships'), {
        userId1: fromUserId,
        userId2: userId,
        status: 'accepted',
        createdAt: serverTimestamp(),
      });

      // Delete the request (clean up)
      await deleteDoc(doc(db, 'friendRequests', requestId));
    } catch (error) {
      if (__DEV__) console.error('Error accepting friend request:', error);
      throw new Error('Failed to accept friend request');
    }
  }

  // Decline a friend request
  static async declineFriendRequest(requestId: string): Promise<void> {
    try {
      // Just delete the request
      await deleteDoc(doc(db, 'friendRequests', requestId));
    } catch (error) {
      if (__DEV__) console.error('Error declining friend request:', error);
      throw new Error('Failed to decline friend request');
    }
  }
} 