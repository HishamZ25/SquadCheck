import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Group, GroupInvitation } from '../types';

export class FirebaseSetupService {
  // Initialize groups collection with sample data
  static async initializeGroupsCollection(): Promise<void> {
    try {
      // Check if groups collection already has data
      const groupsQuery = query(collection(db, 'groups'));
      const groupsSnapshot = await getDocs(groupsQuery);
      
      if (groupsSnapshot.empty) {
        console.log('Initializing groups collection with sample data...');
        
        // Add sample group
        const sampleGroup: Omit<Group, 'id'> = {
          name: 'Fitness Squad',
          goal: 'Complete 30 days of consistent exercise',
          requirements: ['Work out 5 days a week', 'Take progress photos', 'Log workouts'],
          rewards: {
            points: 100,
            title: 'Fitness Warrior',
            badge: '🏃‍♂️'
          },
          penalty: 10,
          creatorId: 'sample-user-id',
          memberIds: ['sample-user-id'],
          createdAt: new Date(),
          status: 'active',
          groupType: 'team'
        };
        
        await addDoc(collection(db, 'groups'), sampleGroup);
        console.log('Sample group created successfully');
      } else {
        console.log('Groups collection already has data');
      }
    } catch (error) {
      console.error('Error initializing groups collection:', error);
      throw error;
    }
  }

  // Initialize groupInvitations collection
  static async initializeInvitationsCollection(): Promise<void> {
    try {
      // Check if invitations collection already has data
      const invitationsQuery = query(collection(db, 'groupInvitations'));
      const invitationsSnapshot = await getDocs(invitationsQuery);
      
      if (invitationsSnapshot.empty) {
        console.log('Initializing groupInvitations collection...');
        
        // Add sample invitation
        const sampleInvitation: Omit<GroupInvitation, 'id'> = {
          groupId: 'sample-group-id',
          inviterId: 'sample-user-id',
          inviteeId: 'invited-user-id',
          status: 'pending',
          sentAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        };
        
        await addDoc(collection(db, 'groupInvitations'), sampleInvitation);
        console.log('Sample invitation created successfully');
      } else {
        console.log('GroupInvitations collection already has data');
      }
    } catch (error) {
      console.error('Error initializing invitations collection:', error);
      throw error;
    }
  }

  // Initialize all required collections
  static async initializeAllCollections(): Promise<void> {
    try {
      console.log('Starting Firebase collections initialization...');
      
      await this.initializeGroupsCollection();
      await this.initializeInvitationsCollection();
      
      console.log('All Firebase collections initialized successfully!');
    } catch (error) {
      console.error('Error initializing Firebase collections:', error);
      throw error;
    }
  }

  // Check collection status
  static async checkCollectionStatus(): Promise<{
    groups: { exists: boolean; count: number };
    invitations: { exists: boolean; count: number };
  }> {
    try {
      const groupsQuery = query(collection(db, 'groups'));
      const groupsSnapshot = await getDocs(groupsQuery);
      
      const invitationsQuery = query(collection(db, 'groupInvitations'));
      const invitationsSnapshot = await getDocs(invitationsQuery);
      
      return {
        groups: {
          exists: !groupsSnapshot.empty,
          count: groupsSnapshot.size
        },
        invitations: {
          exists: !invitationsSnapshot.empty,
          count: invitationsSnapshot.size
        }
      };
    } catch (error) {
      console.error('Error checking collection status:', error);
      throw error;
    }
  }
} 