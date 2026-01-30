import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { db, storage } from './firebase';

// Define the chat message interface for group chats
export interface GroupChatMessage {
  id: string;
  text?: string;
  userId: string;
  userName: string;
  timestamp: Date;
  type: 'text' | 'image' | 'checkin';
  imageUrl?: string;
  caption?: string;
  challengeTitle?: string;
  upvotes?: number;
  downvotes?: number;
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
        timestamp: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'messages'), messageData);
      return docRef.id;
    } catch (error) {
      console.error('Error sending text message:', error);
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
      console.error('Error sending image message:', error);
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
        return {
          id: doc.id,
          text: data.text || '',
          userId: data.userId,
          userName: data.userName,
          timestamp: data.timestamp?.toDate() || new Date(),
          type: data.type,
          imageUrl: data.imageUrl,
          caption: data.caption,
          challengeTitle: data.challengeTitle,
          upvotes: data.upvotes || 0,
          downvotes: data.downvotes || 0,
        } as GroupChatMessage;
      });
    } catch (error) {
      console.error('Error getting group messages:', error);
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
          return {
            id: doc.id,
            text: data.text || '',
            userId: data.userId,
            userName: data.userName,
            timestamp: data.timestamp?.toDate() || new Date(),
            type: data.type,
            imageUrl: data.imageUrl,
            caption: data.caption,
            challengeTitle: data.challengeTitle,
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
          } as GroupChatMessage;
        });
        callback(messages);
      },
      (error) => {
        console.error('Error in messages snapshot listener:', error);
        // Return empty array on error
        callback([]);
      }
    );
  }

  // Delete a message (only for message sender or group admin)
  static async deleteMessage(messageId: string): Promise<void> {
    try {
      // Note: You might want to add security rules to only allow deletion by sender
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
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
      console.error('Error getting message count:', error);
      return 0;
    }
  }

  // Upload image to Firebase Storage and return download URL
  static async uploadImage(imageUri: string): Promise<string> {
    try {
      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Generate unique filename
      const filename = `checkin_images/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const storageRef = ref(storage, filename);
      
      // Upload image to Firebase Storage
      await uploadBytes(storageRef, blob);
      const imageUrl = await getDownloadURL(storageRef);
      
      return imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
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
    challengeTitle?: string
  ): Promise<string> {
    try {
      const messageData = {
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
        timestamp: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'messages'), messageData);
      return docRef.id;
    } catch (error) {
      console.error('Error sending check-in message:', error);
      throw error;
    }
  }
} 