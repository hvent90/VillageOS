import { connectDatabase, disconnectDatabase } from './config/database';

async function main() {
  try {
    console.log('🚀 Starting VillageOS...');
    
    // Connect to database
    await connectDatabase();
    
    console.log('✅ Application initialized successfully');
    console.log('📝 Note: This is a foundational skeleton. Platform integration will be implemented in future phases.');
    
    // Keep the process running for now
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      await disconnectDatabase();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

main();
