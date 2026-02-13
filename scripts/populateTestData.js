/**
 * Script to populate Firebase with test data:
 * - Creates multiple users (all friends with each other)
 * - Creates groups
 * - Creates challenges (solo and group)
 * 
 * Usage:
 * 1. Get Firebase Admin service account key from Firebase Console
 * 2. Save it as 'serviceAccountKey.json' in the scripts folder
 * 3. Run: node scripts/populateTestData.js
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: serviceAccountKey.json not found!');
  console.log('\n📝 To get your service account key:');
  console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.log('2. Click "Generate New Private Key"');
  console.log('3. Save the JSON file as "scripts/serviceAccountKey.json"');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// Test users configuration
const TEST_USERS = [
  { email: 'alice@test.com', password: 'Test123!', displayName: 'Alice Johnson', title: 'Fitness Enthusiast' },
  { email: 'bob@test.com', password: 'Test123!', displayName: 'Bob Smith', title: 'Coding Master' },
  { email: 'charlie@test.com', password: 'Test123!', displayName: 'Charlie Brown', title: 'Meditation Guru' },
  { email: 'diana@test.com', password: 'Test123!', displayName: 'Diana Prince', title: 'Yoga Instructor' },
  { email: 'eve@test.com', password: 'Test123!', displayName: 'Eve Williams', title: 'Productivity Expert' },
  { email: 'frank@test.com', password: 'Test123!', displayName: 'Frank Miller', title: 'Early Riser' },
];

// Groups configuration (simplified schema)
const GROUPS = [
  {
    name: 'Fitness Squad',
    memberEmails: ['alice@test.com', 'diana@test.com', 'eve@test.com']
  },
  {
    name: 'Code Warriors',
    memberEmails: ['bob@test.com', 'charlie@test.com', 'frank@test.com']
  },
  {
    name: 'Morning Champions',
    memberEmails: ['alice@test.com', 'eve@test.com', 'frank@test.com']
  },
  {
    name: 'Wellness Circle',
    memberEmails: ['charlie@test.com', 'diana@test.com', 'alice@test.com', 'bob@test.com']
  },
  {
    name: 'Productivity Pros',
    memberEmails: ['eve@test.com', 'frank@test.com', 'bob@test.com', 'diana@test.com']
  }
];

async function createUsers() {
  console.log('\n👥 Creating users...');
  const userIds = {};
  
  for (const user of TEST_USERS) {
    try {
      // Check if user already exists
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(user.email);
        console.log(`   ⚠️  User ${user.email} already exists, skipping creation`);
      } catch (error) {
        // User doesn't exist, create it
        userRecord = await auth.createUser({
          email: user.email,
          password: user.password,
          displayName: user.displayName,
          emailVerified: true
        });
        console.log(`   ✅ Created user: ${user.email}`);
      }
      
      userIds[user.email] = userRecord.uid;
      
      // Create user document in Firestore
      const userDoc = {
        id: userRecord.uid,
        email: user.email,
        displayName: user.displayName,
        title: user.title,
        badges: [],
        unlockedTitles: [],
        unlockedProfileIcons: [],
        createdAt: admin.firestore.Timestamp.now(),
        lastActive: admin.firestore.Timestamp.now()
      };
      
      await db.collection('users').doc(userRecord.uid).set(userDoc);
      console.log(`   ✅ Created user document for: ${user.displayName}`);
    } catch (error) {
      console.error(`   ❌ Error creating user ${user.email}:`, error.message);
    }
  }
  
  return userIds;
}

async function createFriendships(userIds) {
  console.log('\n🤝 Creating friendships (all users are friends with each other)...');
  const userIdArray = Object.values(userIds);
  let friendshipCount = 0;
  
  for (let i = 0; i < userIdArray.length; i++) {
    for (let j = i + 1; j < userIdArray.length; j++) {
      const userId1 = userIdArray[i];
      const userId2 = userIdArray[j];
      
      try {
        // Check if friendship already exists
        const existingFriendships = await db.collection('friendships')
          .where('userId1', '==', userId1)
          .where('userId2', '==', userId2)
          .get();
        
        const existingFriendships2 = await db.collection('friendships')
          .where('userId1', '==', userId2)
          .where('userId2', '==', userId1)
          .get();
        
        if (existingFriendships.empty && existingFriendships2.empty) {
          await db.collection('friendships').add({
            userId1: userId1,
            userId2: userId2,
            status: 'accepted',
            requestedBy: userId1,
            requestedAt: admin.firestore.Timestamp.now(),
            acceptedAt: admin.firestore.Timestamp.now()
          });
          friendshipCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error creating friendship:`, error.message);
      }
    }
  }
  
  console.log(`   ✅ Created ${friendshipCount} friendships`);
}

async function createGroups(userIds) {
  console.log('\n👨‍👩‍👧‍👦 Creating groups...');
  const groupIds = [];
  
  for (const group of GROUPS) {
    try {
      const memberIds = group.memberEmails.map(email => userIds[email]).filter(Boolean);
      
      if (memberIds.length === 0) {
        console.log(`   ⚠️  Skipping group "${group.name}" - no valid members`);
        continue;
      }
      
      // Use first member as creator
      const creatorId = memberIds[0];
      
      // New simplified schema
      const groupDoc = {
        name: group.name,
        memberIds: memberIds,
        createdBy: creatorId,
        createdAt: admin.firestore.Timestamp.now()
      };
      
      const groupRef = await db.collection('groups').add(groupDoc);
      groupIds.push(groupRef.id);
      console.log(`   ✅ Created group: ${group.name} (${memberIds.length} members)`);
    } catch (error) {
      console.error(`   ❌ Error creating group "${group.name}":`, error.message);
    }
  }
  
  return groupIds;
}

async function createChallenges(userIds, groupIds) {
  console.log('\n🏆 Creating challenges...');
  
  // Helper function to get today's date key
  const getTodayKey = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];  // YYYY-MM-DD
  };
  
  // Challenge templates with new schema
  const challenges = [
    {
      title: 'Daily Workout',
      description: 'Complete a 30-minute workout every day',
      type: 'elimination',
      groupIndex: 0,  // Fitness Squad
      cadence: { unit: 'daily' },
      submission: {
        inputType: 'boolean',
        requireAttachment: true,
        attachmentTypes: ['photo']
      },
      due: {
        dueTimeLocal: '21:00',
        timezoneMode: 'userLocal',
        timezone: 'America/New_York',
        timezoneOffset: 300  // EST is UTC-5 (300 minutes)
      },
      rules: {
        elimination: {
          strikesAllowed: 2,
          eliminateOn: 'miss'
        }
      }
    },
    {
      title: 'Code Streak',
      description: 'Code for at least 1 hour daily - miss once and you\'re eliminated',
      type: 'elimination',
      groupIndex: 1,  // Code Warriors
      cadence: { unit: 'daily' },
      submission: {
        inputType: 'timer',
        unitLabel: 'minutes',
        minValue: 60,
        requireAttachment: true,
        attachmentTypes: ['screenshot']
      },
      due: {
        dueTimeLocal: '23:59',
        timezoneMode: 'userLocal',
        timezone: 'America/New_York',
        timezoneOffset: 300  // EST is UTC-5 (300 minutes)
      },
      rules: {
        elimination: {
          strikesAllowed: 0,
          eliminateOn: 'miss'
        }
      }
    }
  ];
  
  let challengeCount = 0;
  
  for (const challengeTemplate of challenges) {
    try {
      if (!groupIds[challengeTemplate.groupIndex]) {
        console.log(`   ⚠️  Skipping challenge "${challengeTemplate.title}" - group not found`);
        continue;
      }
      
      const groupId = groupIds[challengeTemplate.groupIndex];
      const groupDoc = await db.collection('groups').doc(groupId).get();
      
      if (!groupDoc.exists) {
        console.log(`   ⚠️  Skipping challenge "${challengeTemplate.title}" - group document not found`);
        continue;
      }
      
      const groupData = groupDoc.data();
      const memberIds = groupData.memberIds;
      const creatorId = memberIds[0];
      
      // Create challenge document
      const challengeDoc = {
        groupId: groupId,
        title: challengeTemplate.title,
        description: challengeTemplate.description,
        type: challengeTemplate.type,
        cadence: challengeTemplate.cadence,
        submission: challengeTemplate.submission,
        due: challengeTemplate.due,
        ...(challengeTemplate.rules && { rules: challengeTemplate.rules }),
        createdBy: creatorId,
        createdAt: admin.firestore.Timestamp.now(),
        isArchived: false
      };
      
      const challengeRef = await db.collection('challenges').add(challengeDoc);
      const challengeId = challengeRef.id;
      challengeCount++;
      console.log(`   ✅ Created challenge: ${challengeTemplate.title}`);
      
      // Create ChallengeMember for each member
      for (const memberId of memberIds) {
        const memberDoc = {
          challengeId: challengeId,
          groupId: groupId,
          userId: memberId,
          state: 'active',
          strikes: 0,
          joinedAt: admin.firestore.Timestamp.now()
        };
        
        await db.collection('challengeMembers').doc(`${challengeId}_${memberId}`).set(memberDoc);
      }
      
      // Create sample check-ins for some members (completed today)
      const todayKey = getTodayKey();
      for (let i = 0; i < Math.min(2, memberIds.length); i++) {
        const checkInDoc = {
          groupId: groupId,
          challengeId: challengeId,
          userId: memberIds[i],
          period: {
            unit: 'daily',
            dayKey: todayKey
          },
          payload: {
            booleanValue: true
          },
          status: 'completed',
          createdAt: admin.firestore.Timestamp.now()
        };
        
        await db.collection('checkIns').add(checkInDoc);
      }
    } catch (error) {
      console.error(`   ❌ Error creating challenge "${challengeTemplate.title}":`, error.message);
    }
  }
  
  console.log(`   ✅ Created ${challengeCount} challenges with members and check-ins`);
}

async function main() {
  console.log('🚀 Starting test data population...\n');
  
  try {
    // Create users
    const userIds = await createUsers();
    
    // Create friendships (all users are friends with each other)
    await createFriendships(userIds);
    
    // Create groups
    const groupIds = await createGroups(userIds);
    
    // Create challenges
    await createChallenges(userIds, groupIds);
    
    console.log('\n✅ Test data population complete!\n');
    console.log('📋 User Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    TEST_USERS.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log(`Name: ${user.displayName}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
    console.log('\n✨ You can now login with any of these accounts!');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
