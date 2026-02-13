const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Test users with different timezones
const users = [
  { email: 'alice@test.com', name: 'Alice Johnson', timezone: 'America/New_York', offset: 300 },    // EST (UTC-5)
  { email: 'bob@test.com', name: 'Bob Smith', timezone: 'America/Los_Angeles', offset: 480 },       // PST (UTC-8)
  { email: 'charlie@test.com', name: 'Charlie Brown', timezone: 'America/Chicago', offset: 360 },   // CST (UTC-6)
  { email: 'diana@test.com', name: 'Diana Prince', timezone: 'America/Denver', offset: 420 },       // MST (UTC-7)
  { email: 'eve@test.com', name: 'Eve Williams', timezone: 'America/New_York', offset: 300 },       // EST
  { email: 'frank@test.com', name: 'Frank Miller', timezone: 'America/Los_Angeles', offset: 480 },  // PST
];

const password = 'Test123!';

async function createUser(userData) {
  try {
    // Create auth user
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(userData.email);
      console.log(`   ⚠️  User ${userData.email} already exists in auth`);
    } catch (error) {
      userRecord = await auth.createUser({
        email: userData.email,
        password: password,
        displayName: userData.name,
      });
      console.log(`   ✅ Created auth user: ${userData.name}`);
    }

    // Create Firestore user document
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,  // IMPORTANT: Add the id field!
      email: userData.email,
      displayName: userData.name,
      photoURL: null,
      title: 'Accountability Seeker',
      badges: [],
      unlockedTitles: [],
      unlockedProfileIcons: [],
      createdAt: admin.firestore.Timestamp.now(),
      lastActive: admin.firestore.Timestamp.now(),
      timezone: userData.timezone,
      timezoneOffset: userData.offset,
    });

    return userRecord.uid;
  } catch (error) {
    console.error(`   ❌ Error creating user ${userData.email}:`, error.message);
    throw error;
  }
}

async function populateData() {
  try {
    console.log('🚀 Starting comprehensive test data population...\n');

    // Create users
    console.log('👥 Creating users with different timezones...');
    const userIds = {};
    for (const user of users) {
      const uid = await createUser(user);
      userIds[user.email] = uid;
    }
    console.log('');

    // Create friendships (everyone is friends)
    console.log('🤝 Creating friendships...');
    const userEmails = Object.keys(userIds);
    let friendshipCount = 0;
    for (let i = 0; i < userEmails.length; i++) {
      for (let j = i + 1; j < userEmails.length; j++) {
        await db.collection('friendships').add({
          userId1: userIds[userEmails[i]],
          userId2: userIds[userEmails[j]],
          status: 'accepted',
          requestedBy: userIds[userEmails[i]],
          requestedAt: admin.firestore.Timestamp.now(),
          acceptedAt: admin.firestore.Timestamp.now(),
        });
        friendshipCount++;
      }
    }
    console.log(`   ✅ Created ${friendshipCount} friendships\n`);

    // Create groups with challenges
    console.log('👨‍👩‍👧‍👦 Creating groups and challenges...\n');

    // Group 1: Fitness Squad (3 members, 2 challenges)
    const group1Ref = await db.collection('groups').add({
      name: 'Fitness Squad',
      description: 'Stay fit together!',
      memberIds: [userIds['alice@test.com'], userIds['bob@test.com'], userIds['charlie@test.com']],
      createdBy: userIds['alice@test.com'],
      createdAt: admin.firestore.Timestamp.now(),
      status: 'active',
    });
    console.log('   📁 Created group: Fitness Squad');

    // Challenge 1.1: Daily Workout (creator: Alice - EST timezone)
    const challenge1_1 = await db.collection('challenges').add({
      groupId: group1Ref.id,
      title: 'Daily Workout',
      description: 'Complete a 30-minute workout every day',
      type: 'elimination',
      cadence: { unit: 'daily' },
      submission: {
        inputType: 'boolean',
        requireAttachment: true,
        attachmentTypes: ['photo']
      },
      due: {
        dueTimeLocal: '21:00',  // 9 PM in creator's timezone (EST)
        timezoneMode: 'userLocal',
        timezone: 'America/New_York',
        timezoneOffset: 300
      },
      rules: {
        elimination: { strikesAllowed: 2, eliminateOn: 'miss' }
      },
      createdBy: userIds['alice@test.com'],
      createdAt: admin.firestore.Timestamp.now(),
      isArchived: false
    });
    
    // Add challenge members
    for (const email of ['alice@test.com', 'bob@test.com', 'charlie@test.com']) {
      await db.collection('challengeMembers').doc(`${challenge1_1.id}_${userIds[email]}`).set({
        challengeId: challenge1_1.id,
        groupId: group1Ref.id,
        userId: userIds[email],
        state: 'active',
        strikes: 0,
        joinedAt: admin.firestore.Timestamp.now()
      });
    }
    console.log('      ✅ Challenge: Daily Workout (9 PM EST due time)');

    // Challenge 1.2: Morning Run (creator: Bob - PST timezone)
    const challenge1_2 = await db.collection('challenges').add({
      groupId: group1Ref.id,
      title: 'Morning Run',
      description: 'Run at least 2 miles every morning',
      type: 'standard',
      cadence: { unit: 'daily' },
      submission: {
        inputType: 'number',
        unitLabel: 'miles',
        minValue: 2,
        requireAttachment: true
      },
      due: {
        dueTimeLocal: '10:00',  // 10 AM in creator's timezone (PST)
        timezoneMode: 'userLocal',
        timezone: 'America/Los_Angeles',
        timezoneOffset: 480
      },
      createdBy: userIds['bob@test.com'],
      createdAt: admin.firestore.Timestamp.now(),
      isArchived: false
    });
    
    for (const email of ['alice@test.com', 'bob@test.com', 'charlie@test.com']) {
      await db.collection('challengeMembers').doc(`${challenge1_2.id}_${userIds[email]}`).set({
        challengeId: challenge1_2.id,
        groupId: group1Ref.id,
        userId: userIds[email],
        state: 'active',
        strikes: 0,
        joinedAt: admin.firestore.Timestamp.now()
      });
    }
    console.log('      ✅ Challenge: Morning Run (10 AM PST due time)\n');

    // Group 2: Code Warriors (4 members, 1 challenge)
    const group2Ref = await db.collection('groups').add({
      name: 'Code Warriors',
      description: 'Code together, grow together!',
      memberIds: [userIds['alice@test.com'], userIds['charlie@test.com'], userIds['diana@test.com'], userIds['eve@test.com']],
      createdBy: userIds['charlie@test.com'],
      createdAt: admin.firestore.Timestamp.now(),
      status: 'active',
    });
    console.log('   📁 Created group: Code Warriors');

    const challenge2_1 = await db.collection('challenges').add({
      groupId: group2Ref.id,
      title: 'Code Streak',
      description: 'Write code for at least 60 minutes every day',
      type: 'elimination',
      cadence: { unit: 'daily' },
      submission: {
        inputType: 'timer',
        minValue: 60,
        requireAttachment: true,
        attachmentTypes: ['screenshot']
      },
      due: {
        dueTimeLocal: '23:59',  // 11:59 PM CST
        timezoneMode: 'userLocal',
        timezone: 'America/Chicago',
        timezoneOffset: 360
      },
      rules: {
        elimination: { strikesAllowed: 1, eliminateOn: 'miss' }
      },
      createdBy: userIds['charlie@test.com'],
      createdAt: admin.firestore.Timestamp.now(),
      isArchived: false
    });
    
    for (const email of ['alice@test.com', 'charlie@test.com', 'diana@test.com', 'eve@test.com']) {
      await db.collection('challengeMembers').doc(`${challenge2_1.id}_${userIds[email]}`).set({
        challengeId: challenge2_1.id,
        groupId: group2Ref.id,
        userId: userIds[email],
        state: 'active',
        strikes: 0,
        joinedAt: admin.firestore.Timestamp.now()
      });
    }
    console.log('      ✅ Challenge: Code Streak (11:59 PM CST due time)\n');

    // Group 3: Wellness Circle (3 members, 3 challenges)
    const group3Ref = await db.collection('groups').add({
      name: 'Wellness Circle',
      description: 'Health and wellness journey together!',
      memberIds: [userIds['bob@test.com'], userIds['diana@test.com'], userIds['frank@test.com']],
      createdBy: userIds['diana@test.com'],
      createdAt: admin.firestore.Timestamp.now(),
      status: 'active',
    });
    console.log('   📁 Created group: Wellness Circle');

    const challenge3_1 = await db.collection('challenges').add({
      groupId: group3Ref.id,
      title: 'Meditation',
      description: 'Meditate for 10 minutes daily',
      type: 'standard',
      cadence: { unit: 'daily' },
      submission: { inputType: 'boolean', requireAttachment: false },
      due: {
        dueTimeLocal: '07:00',  // 7 AM MST
        timezoneMode: 'userLocal',
        timezone: 'America/Denver',
        timezoneOffset: 420
      },
      createdBy: userIds['diana@test.com'],
      createdAt: admin.firestore.Timestamp.now(),
      isArchived: false
    });

    const challenge3_2 = await db.collection('challenges').add({
      groupId: group3Ref.id,
      title: 'Hydration',
      description: 'Drink 8 glasses of water',
      type: 'standard',
      cadence: { unit: 'daily' },
      submission: { inputType: 'number', unitLabel: 'glasses', minValue: 8 },
      due: {
        dueTimeLocal: '22:00',  // 10 PM MST
        timezoneMode: 'userLocal',
        timezone: 'America/Denver',
        timezoneOffset: 420
      },
      createdBy: userIds['diana@test.com'],
      createdAt: admin.firestore.Timestamp.now(),
      isArchived: false
    });

    const challenge3_3 = await db.collection('challenges').add({
      groupId: group3Ref.id,
      title: 'Weekly Reading',
      description: 'Read for 3 hours per week',
      type: 'standard',
      cadence: { unit: 'weekly', requiredCount: 3, weekStartsOn: 1 },
      submission: { inputType: 'timer', minValue: 60 },
      due: {
        dueTimeLocal: '23:59',
        timezoneMode: 'userLocal',
        timezone: 'America/Denver',
        timezoneOffset: 420
      },
      createdBy: userIds['diana@test.com'],
      createdAt: admin.firestore.Timestamp.now(),
      isArchived: false
    });
    
    for (const challengeId of [challenge3_1.id, challenge3_2.id, challenge3_3.id]) {
      for (const email of ['bob@test.com', 'diana@test.com', 'frank@test.com']) {
        await db.collection('challengeMembers').doc(`${challengeId}_${userIds[email]}`).set({
          challengeId: challengeId,
          groupId: group3Ref.id,
          userId: userIds[email],
          state: 'active',
          strikes: 0,
          joinedAt: admin.firestore.Timestamp.now()
        });
      }
    }
    console.log('      ✅ Challenge: Meditation (7 AM MST)');
    console.log('      ✅ Challenge: Hydration (10 PM MST)');
    console.log('      ✅ Challenge: Weekly Reading\n');

    // Group 4: Solo Challenge for Alice
    const soloChallenge = await db.collection('challenges').add({
      groupId: null,
      title: 'Personal Journal',
      description: 'Write in journal every day',
      type: 'standard',
      cadence: { unit: 'daily' },
      submission: { inputType: 'text', requireText: true, minTextLength: 50 },
      due: {
        dueTimeLocal: '20:00',  // 8 PM EST
        timezoneMode: 'userLocal',
        timezone: 'America/New_York',
        timezoneOffset: 300
      },
      createdBy: userIds['alice@test.com'],
      createdAt: admin.firestore.Timestamp.now(),
      isArchived: false
    });
    
    await db.collection('challengeMembers').doc(`${soloChallenge.id}_${userIds['alice@test.com']}`).set({
      challengeId: soloChallenge.id,
      groupId: null,
      userId: userIds['alice@test.com'],
      state: 'active',
      strikes: 0,
      joinedAt: admin.firestore.Timestamp.now()
    });
    console.log('   📁 Created solo challenge: Personal Journal (Alice)\n');

    console.log('✅ Test data population complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Groups: 3 group challenges + 1 solo`);
    console.log(`   - Total challenges: 7`);
    console.log(`   - Friendships: ${friendshipCount}`);
    console.log('\n📋 User Credentials (all timezones represented):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    users.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${password}`);
      console.log(`Name: ${user.name}`);
      console.log(`Timezone: ${user.timezone} (${user.offset === 300 ? 'EST' : user.offset === 480 ? 'PST' : user.offset === 360 ? 'CST' : 'MST'})`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
    console.log('\n🌍 Timezone Examples:');
    console.log('   • Alice creates challenge at 9 PM EST');
    console.log('   • Bob (PST) sees it due at 6 PM PST');
    console.log('   • Charlie (CST) sees it due at 8 PM CST');
    console.log('   • Everyone submits at their own local time!');
    console.log('\n✨ You can now test timezone-aware submissions!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

populateData();
