const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function deleteRecentCheckIns() {
  try {
    console.log('Finding recent check-ins to delete...');
    
    // Get all check-ins from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const checkInsSnapshot = await db.collection('checkIns')
      .where('createdAt', '>', sevenDaysAgo.getTime())
      .get();
    
    console.log(`Found ${checkInsSnapshot.size} check-ins to delete`);
    
    const batch = db.batch();
    let count = 0;
    
    checkInsSnapshot.forEach(doc => {
      console.log(`Deleting check-in ${doc.id}:`, {
        userId: doc.data().userId,
        challengeId: doc.data().challengeId,
        period: doc.data().period,
        createdAt: new Date(doc.data().createdAt)
      });
      batch.delete(doc.ref);
      count++;
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`✅ Successfully deleted ${count} check-in(s)`);
    } else {
      console.log('No check-ins found to delete');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error deleting check-ins:', error);
    process.exit(1);
  }
}

deleteRecentCheckIns();
