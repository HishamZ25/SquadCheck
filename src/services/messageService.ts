import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { db, storage } from './firebase';
import { GamificationService } from './gamificationService';
import { XP_VALUES } from '../constants/gamification';

const SYSTEM_USER_ID = 'system-missed';
const SYSTEM_USER_NAME = 'SquadCheck';

// Define the chat message interface for group chats
export interface GroupChatMessage {
  id: string;
  text?: string;
  userId: string;
  userName: string;
  timestamp: Date;
  type: 'text' | 'image' | 'checkin' | 'elimination' | 'winner';
  imageUrl?: string;
  caption?: string;
  challengeTitle?: string;
  /** For elimination/winner messages: challenge name shown in orange */
  challengeName?: string;
  upvotes?: number;
  downvotes?: number;
  upvotedBy?: string[];
  downvotedBy?: string[];
  streak?: number;
}

export class MessageService {
  // Send a text message
  static async sendTextMessage(
    groupId: string,
    userId: string,
    userName: string,
    text: string
  ): Promise<string> {
    try {
      const messageData = {
        groupId,
        userId,
        userName,
        text,
        type: 'text' as const,
        upvotes: 0,
        downvotes: 0,
        upvotedBy: [],
        downvotedBy: [],
        timestamp: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'messages'), messageData);
      return docRef.id;
    } catch (error) {
      if (__DEV__) console.error('Error sending text message:', error);
      throw error;
    }
  }

  /** Send elimination message: "[Name] has missed the check in for challenge: [Challenge]. They've been eliminated." (challengeName in orange in UI) */
  static async sendEliminationMessage(
    groupId: string,
    displayName: string,
    challengeName: string
  ): Promise<string> {
    try {
      const text = `${displayName} has missed the check in for challenge: ${challengeName}. They've been eliminated.`;
      const messageData = {
        groupId,
        userId: SYSTEM_USER_ID,
        userName: SYSTEM_USER_NAME,
        text,
        type: 'elimination' as const,
        challengeName,
        timestamp: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'messages'), messageData);
      return docRef.id;
    } catch (error) {
      if (__DEV__) console.error('Error sending elimination message:', error);
      throw error;
    }
  }

  /** Send winner message when last member remains in elimination: "[Name] was the last remaining member of [Challenge]. They win!" */
  static async sendWinnerMessage(
    groupId: string,
    winnerName: string,
    challengeName: string
  ): Promise<string> {
    try {
      const text = `${winnerName} was the last remaining member of ${challengeName}. They win!`;
      const messageData = {
        groupId,
        userId: SYSTEM_USER_ID,
        userName: SYSTEM_USER_NAME,
        text,
        type: 'winner' as const,
        challengeName,
        timestamp: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'messages'), messageData);
      return docRef.id;
    } catch (error) {
      if (__DEV__) console.error('Error sending winner message:', error);
      throw error;
    }
  }

  // Send an image message
  static async sendImageMessage(
    groupId: string,
    userId: string,
    userName: string,
    imageUri: string,
    caption?: string
  ): Promise<string> {
    try {
      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Generate unique filename
      const filename = `chat_images/${groupId}/${Date.now()}_${userId}.jpg`;
      const storageRef = ref(storage, filename);
      
      // Upload image to Firebase Storage
      await uploadBytes(storageRef, blob);
      const imageUrl = await getDownloadURL(storageRef);
      
      // Save message to Firestore
      const messageData = {
        groupId,
        userId,
        userName,
        imageUrl,
        caption: caption || '',
        type: 'image' as const,
        timestamp: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'messages'), messageData);
      return docRef.id;
    } catch (error) {
      if (__DEV__) console.error('Error sending image message:', error);
      throw error;
    }
  }

  // Get messages for a group (for initial load)
  static async getGroupMessages(groupId: string, limitCount: number = 50): Promise<GroupChatMessage[]> {
    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('groupId', '==', groupId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(messagesQuery);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const type = data.type || (data.challengeTitle ? 'checkin' : 'text');
        return {
          id: doc.id,
          text: data.text || '',
          userId: data.userId,
          userName: data.userName,
          timestamp: data.timestamp?.toDate() || new Date(),
          type,
          imageUrl: data.imageUrl,
          caption: data.caption,
          challengeTitle: data.challengeTitle,
          challengeName: data.challengeName,
          upvotes: data.upvotes || 0,
          downvotes: data.downvotes || 0,
          upvotedBy: data.upvotedBy || [],
          downvotedBy: data.downvotedBy || [],
          streak: data.streak || undefined,
        } as GroupChatMessage;
      });
    } catch (error) {
      if (__DEV__) console.error('Error getting group messages:', error);
      return [];
    }
  }

  // Listen to real-time messages for a group
  static subscribeToGroupMessages(
    groupId: string, 
    callback: (messages: GroupChatMessage[]) => void,
    limitCount: number = 50
  ) {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('groupId', '==', groupId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(
      messagesQuery, 
      (querySnapshot) => {
        const messages = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const type = data.type || (data.challengeTitle ? 'checkin' : 'text');
          return {
            id: doc.id,
            text: data.text || '',
            userId: data.userId,
            userName: data.userName,
            timestamp: data.timestamp?.toDate() || new Date(),
            type,
            imageUrl: data.imageUrl,
            caption: data.caption,
            challengeTitle: data.challengeTitle,
            challengeName: data.challengeName,
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
            upvotedBy: data.upvotedBy || [],
            downvotedBy: data.downvotedBy || [],
          } as GroupChatMessage;
        });
        callback(messages);
      },
      (error) => {
        if (__DEV__) console.warn('Firestore Listen (messages) transport error, will retry:', error?.code || error?.message);
        callback([]);
      }
    );
  }

  /**
   * Toggle upvote on a message. Awards +3 XP to author on new upvote.
   */
  static async toggleUpvote(
    messageId: string,
    voterId: string,
    messageAuthorId: string,
  ): Promise<void> {
    const msgRef = doc(db, 'messages', messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;

    const data = msgSnap.data();
    const upvotedBy: string[] = data.upvotedBy || [];
    const alreadyUpvoted = upvotedBy.includes(voterId);

    if (alreadyUpvoted) {
      // Remove upvote
      await updateDoc(msgRef, {
        upvotedBy: arrayRemove(voterId),
        upvotes: increment(-1),
      });
    } else {
      // Add upvote + award XP in parallel
      const ops: Promise<any>[] = [
        updateDoc(msgRef, {
          upvotedBy: arrayUnion(voterId),
          upvotes: increment(1),
        }),
      ];
      if (voterId !== messageAuthorId) {
        ops.push(
          GamificationService.updateUserXPOnly(messageAuthorId, XP_VALUES.UPVOTE_RECEIVED)
            .catch(e => { if (__DEV__) console.error('Upvote XP award error:', e); })
        );
      }
      await Promise.all(ops);
    }
  }

  /**
   * Toggle downvote on a message. No XP implications.
   */
  static async toggleDownvote(
    messageId: string,
    voterId: string,
  ): Promise<void> {
    const msgRef = doc(db, 'messages', messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;

    const data = msgSnap.data();
    const downvotedBy: string[] = data.downvotedBy || [];
    const alreadyDownvoted = downvotedBy.includes(voterId);

    if (alreadyDownvoted) {
      await updateDoc(msgRef, {
        downvotedBy: arrayRemove(voterId),
        downvotes: increment(-1),
      });
    } else {
      await updateDoc(msgRef, {
        downvotedBy: arrayUnion(voterId),
        downvotes: increment(1),
      });
    }
  }

  // Delete a message (only for message sender or group admin)
  static async deleteMessage(messageId: string): Promise<void> {
    try {
      // Note: You might want to add security rules to only allow deletion by sender
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
      if (__DEV__) console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Get message count for a group
  static async getGroupMessageCount(groupId: string): Promise<number> {
    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('groupId', '==', groupId)
      );
      
      const querySnapshot = await getDocs(messagesQuery);
      return querySnapshot.size;
    } catch (error) {
      if (__DEV__) console.error('Error getting message count:', error);
      return 0;
    }
  }

  // Upload image to Firebase Storage and return download URL
  static async uploadImage(imageUri: string): Promise<string> {
    try {
      // Use fetch to convert URI to blob (stable on modern Expo/RN — avoids XHR native crashes)
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Generate unique filename
      const filename = `checkin_images/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const storageRef = ref(storage, filename);

      // Upload image to Firebase Storage
      await uploadBytes(storageRef, blob);

      // Close the blob to free native memory
      if (typeof (blob as any).close === 'function') {
        (blob as any).close();
      }

      const imageUrl = await getDownloadURL(storageRef);
      return imageUrl;
    } catch (error) {
      if (__DEV__) console.error('Error uploading image:', error);
      throw error;
    }
  }

  // Send a check-in message
  static async sendCheckInMessage(
    groupId: string,
    userId: string,
    userName: string,
    caption: string,
    imageUrl?: string | null,
    challengeTitle?: string,
    streak?: number,
  ): Promise<string> {
    try {
      const messageData: Record<string, any> = {
        groupId,
        userId,
        userName,
        text: caption, // Use caption as text for check-ins
        type: 'checkin' as const,
        imageUrl: imageUrl || null,
        caption: caption,
        challengeTitle: challengeTitle || '',
        upvotes: 0,
        downvotes: 0,
        upvotedBy: [],
        downvotedBy: [],
        timestamp: serverTimestamp(),
      };
      if (streak && streak > 0) {
        messageData.streak = streak;
      }

      const docRef = await addDoc(collection(db, 'messages'), messageData);
      return docRef.id;
    } catch (error) {
      if (__DEV__) console.error('❌ Error sending check-in message:', error);
      throw error;
    }
  }
} 