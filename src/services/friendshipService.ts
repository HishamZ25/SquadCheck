import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  getDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import { Friendship, User } from '../types';
import { AuthService } from './authService';

export class FriendshipService {
  // Get all friends for a user
  static async getUserFriends(userId: string): Promise<User[]> {
    try {
      console.log('🔍 Getting friends for user:', userId);
      
      // Query friendships where user is either user1 or user2 and status is accepted
      const friendshipsQuery = query(
        collection(db, 'friendships'),
        where('status', '==', 'accepted')
      );

      const querySnapshot = await getDocs(friendshipsQuery);
      console.log('📊 Found friendships:', querySnapshot.docs.length);
      
      const friendIds: string[] = [];

      querySnapshot.docs.forEach((doc, index) => {
        const friendship = doc.data() as Friendship;
        console.log(`👥 Friendship ${index + 1} data:`, friendship);
        
        // Trim user IDs to remove any whitespace/newlines
        const trimmedUserId1 = friendship.userId1?.trim();
        const trimmedUserId2 = friendship.userId2?.trim();
        
        console.log(`🔍 Checking if ${userId} matches userId1: "${trimmedUserId1}" or userId2: "${trimmedUserId2}"`);
        
        if (trimmedUserId1 === userId) {
          friendIds.push(trimmedUserId2);
          console.log('➕ Added friend from userId1 position:', trimmedUserId2);
        } else if (trimmedUserId2 === userId) {
          friendIds.push(trimmedUserId1);
          console.log('➕ Added friend from userId2 position:', trimmedUserId1);
        } else {
          console.log('❌ No match found for this friendship');
        }
      });

      console.log('🎯 Total friend IDs found:', friendIds.length);

      // Get user details for each friend ID
      const friends: User[] = [];
      for (const friendId of friendIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', friendId));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            friends.push(userData);
            console.log('✅ Loaded friend:', userData.displayName);
          }
        } catch (error) {
          console.error('Error getting friend user data:', error);
        }
      }

      console.log('🎉 Final friends list:', friends.map(f => f.displayName));
      return friends;
    } catch (error) {
      console.error('Error getting user friends:', error);
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
      console.error('Error checking friendship status:', error);
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
      console.error('Error getting pending friend requests:', error);
      return [];
    }
  }

  // Get friendship count for a user
  static async getFriendCount(userId: string): Promise<number> {
    try {
      const friends = await this.getUserFriends(userId);
      return friends.length;
    } catch (error) {
      console.error('Error getting friend count:', error);
      return 0;
    }
  }
} 