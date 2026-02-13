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

async function cleanupAll() {
  try {
    console.log('🧹 Starting complete cleanup...\n');

    // Delete all check-ins
    console.log('🗑️  Deleting all check-ins...');
    const checkInsSnapshot = await db.collection('checkIns').get();
    const checkInBatch = db.batch();
    checkInsSnapshot.docs.forEach(doc => checkInBatch.delete(doc.ref));
    if (checkInsSnapshot.size > 0) {
      await checkInBatch.commit();
      console.log(`   ✅ Deleted ${checkInsSnapshot.size} check-ins`);
    } else {
      console.log('   ℹ️  No check-ins to delete');
    }

    // Delete all challenge members
    console.log('🗑️  Deleting all challenge members...');
    const challengeMembersSnapshot = await db.collection('challengeMembers').get();
    const memberBatch = db.batch();
    challengeMembersSnapshot.docs.forEach(doc => memberBatch.delete(doc.ref));
    if (challengeMembersSnapshot.size > 0) {
      await memberBatch.commit();
      console.log(`   ✅ Deleted ${challengeMembersSnapshot.size} challenge members`);
    } else {
      console.log('   ℹ️  No challenge members to delete');
    }

    // Delete all challenges
    console.log('🗑️  Deleting all challenges...');
    const challengesSnapshot = await db.collection('challenges').get();
    const challengeBatch = db.batch();
    challengesSnapshot.docs.forEach(doc => challengeBatch.delete(doc.ref));
    if (challengesSnapshot.size > 0) {
      await challengeBatch.commit();
      console.log(`   ✅ Deleted ${challengesSnapshot.size} challenges`);
    } else {
      console.log('   ℹ️  No challenges to delete');
    }

    // Delete all messages
    console.log('🗑️  Deleting all messages...');
    const messagesSnapshot = await db.collection('messages').get();
    const messageBatch = db.batch();
    messagesSnapshot.docs.forEach(doc => messageBatch.delete(doc.ref));
    if (messagesSnapshot.size > 0) {
      await messageBatch.commit();
      console.log(`   ✅ Deleted ${messagesSnapshot.size} messages`);
    } else {
      console.log('   ℹ️  No messages to delete');
    }

    // Delete all groups
    console.log('🗑️  Deleting all groups...');
    const groupsSnapshot = await db.collection('groups').get();
    const groupBatch = db.batch();
    groupsSnapshot.docs.forEach(doc => groupBatch.delete(doc.ref));
    if (groupsSnapshot.size > 0) {
      await groupBatch.commit();
      console.log(`   ✅ Deleted ${groupsSnapshot.size} groups`);
    } else {
      console.log('   ℹ️  No groups to delete');
    }

    // Delete all friendships
    console.log('🗑️  Deleting all friendships...');
    const friendshipsSnapshot = await db.collection('friendships').get();
    const friendshipBatch = db.batch();
    friendshipsSnapshot.docs.forEach(doc => friendshipBatch.delete(doc.ref));
    if (friendshipsSnapshot.size > 0) {
      await friendshipBatch.commit();
      console.log(`   ✅ Deleted ${friendshipsSnapshot.size} friendships`);
    } else {
      console.log('   ℹ️  No friendships to delete');
    }

    // Delete all user documents
    console.log('🗑️  Deleting all user documents...');
    const usersSnapshot = await db.collection('users').get();
    const userBatch = db.batch();
    usersSnapshot.docs.forEach(doc => userBatch.delete(doc.ref));
    if (usersSnapshot.size > 0) {
      await userBatch.commit();
      console.log(`   ✅ Deleted ${usersSnapshot.size} user documents`);
    } else {
      console.log('   ℹ️  No user documents to delete');
    }

    // Delete all auth users
    console.log('🗑️  Deleting all auth users...');
    const listUsersResult = await auth.listUsers();
    const deletePromises = listUsersResult.users.map(user => auth.deleteUser(user.uid));
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`   ✅ Deleted ${deletePromises.length} auth users`);
    } else {
      console.log('   ℹ️  No auth users to delete');
    }

    console.log('\n🎉 Complete cleanup finished!');
    console.log('📋 Summary:');
    console.log(`   - Check-ins: ${checkInsSnapshot.size}`);
    console.log(`   - Challenge members: ${challengeMembersSnapshot.size}`);
    console.log(`   - Challenges: ${challengesSnapshot.size}`);
    console.log(`   - Messages: ${messagesSnapshot.size}`);
    console.log(`   - Groups: ${groupsSnapshot.size}`);
    console.log(`   - Friendships: ${friendshipsSnapshot.size}`);
    console.log(`   - User documents: ${usersSnapshot.size}`);
    console.log(`   - Auth users: ${listUsersResult.users.length}`);
    console.log('\n✨ Database is now clean!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupAll();
