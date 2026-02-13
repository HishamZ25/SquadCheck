const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixTimezones() {
  try {
    console.log('🕐 Fixing timezone data for challenges...\n');

    // Get user's timezone offset (assuming EST for existing data)
    const estOffset = 300; // EST is UTC-5 (5 * 60 = 300 minutes)

    // Update all challenges
    const challengesSnapshot = await db.collection('challenges').get();
    console.log(`📦 Found ${challengesSnapshot.size} challenges to update\n`);

    const batch = db.batch();
    let count = 0;

    challengesSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Add timezone info if due object exists
      if (data.due) {
        batch.update(doc.ref, {
          'due.timezone': 'America/New_York',
          'due.timezoneOffset': estOffset
        });
        count++;
        console.log(`✅ Updated challenge: ${data.title || doc.id}`);
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`\n🎉 Updated ${count} challenges with timezone info!`);
    } else {
      console.log('\nℹ️  No challenges needed updating.');
    }

    // Now fix any existing check-ins that might have wrong day keys
    console.log('\n🔍 Checking for check-ins that need period correction...');
    const checkInsSnapshot = await db.collection('checkIns').get();
    console.log(`📦 Found ${checkInsSnapshot.size} check-ins\n`);

    // We'll log any that might have incorrect periods, but won't auto-fix
    // since we can't be 100% sure without knowing the exact submission time
    let incorrectPeriods = 0;
    checkInsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.period && data.period.dayKey && data.createdAt) {
        // Convert timestamp to local date
        const createdDate = new Date(data.createdAt);
        const localDayKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}-${String(createdDate.getDate()).padStart(2, '0')}`;
        
        if (data.period.dayKey !== localDayKey) {
          incorrectPeriods++;
          console.log(`⚠️  Check-in ${doc.id}: period.dayKey = ${data.period.dayKey}, but createdAt suggests ${localDayKey}`);
        }
      }
    });

    if (incorrectPeriods > 0) {
      console.log(`\n⚠️  Found ${incorrectPeriods} check-ins with potentially incorrect periods.`);
      console.log('These were likely created using UTC instead of local time.');
      console.log('Going forward, new check-ins will use correct local timezone.\n');
    } else {
      console.log('\n✅ All check-in periods look correct!\n');
    }

    console.log('🎉 Timezone fix complete!');
    console.log('\nNext steps:');
    console.log('1. Delete existing test check-ins: node scripts/deleteCheckIn.js');
    console.log('2. Re-populate test data: node scripts/populateTestData.js');
    console.log('3. Test check-in submission in the app');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixTimezones();
