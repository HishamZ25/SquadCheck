const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixChallengeGroupId() {
  try {
    console.log('🔧 Fixing Daily Workout challenge groupId...');
    
    const challengeId = 'M5c5Yq7lRJiNlw2iNiPk';
    const correctGroupId = '6PvOJdquh19TebqeTdPh'; // Fitness Squad
    
    // Update challenge
    await db.collection('challenges').doc(challengeId).update({
      groupId: correctGroupId
    });
    console.log('✅ Updated challenge groupId to:', correctGroupId);
    
    // Update all check-ins for this challenge
    const checkInsSnapshot = await db.collection('checkIns')
      .where('challengeId', '==', challengeId)
      .get();
    
    console.log(`📦 Found ${checkInsSnapshot.size} check-ins to update`);
    
    const batch = db.batch();
    checkInsSnapshot.forEach(doc => {
      batch.update(doc.ref, { groupId: correctGroupId });
    });
    
    await batch.commit();
    console.log('✅ Updated all check-ins with correct groupId');
    
    console.log('🎉 Done! All fixed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixChallengeGroupId();
