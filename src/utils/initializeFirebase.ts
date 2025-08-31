import { FirebaseSetupService } from '../services/firebaseSetup';

// Function to initialize Firebase collections
export const initializeFirebaseCollections = async () => {
  try {
    console.log('🔄 Initializing Firebase collections...');
    
    // Check current status
    const status = await FirebaseSetupService.checkCollectionStatus();
    console.log('📊 Current collection status:', status);
    
    // Initialize collections
    await FirebaseSetupService.initializeAllCollections();
    
    // Check status again
    const newStatus = await FirebaseSetupService.checkCollectionStatus();
    console.log('✅ Final collection status:', newStatus);
    
    return { success: true, status: newStatus };
  } catch (error) {
    console.error('❌ Error initializing Firebase collections:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Function to check collection status only
export const checkFirebaseCollections = async () => {
  try {
    const status = await FirebaseSetupService.checkCollectionStatus();
    return { success: true, status };
  } catch (error) {
    console.error('❌ Error checking Firebase collections:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}; 