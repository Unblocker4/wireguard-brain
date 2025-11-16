import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { startStatJob } from './jobs/gatewayStats.job.js';

const startServer = async () => {
  try {
    // 1. Connect to the database
    await connectDB();
    
    // 2. Start the Express server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[INFO] "Brain" API running on http://0.0.0.0:4000`);
      
      // 3. Start background jobs
      startStatJob();
    });
  } catch (error) {
    console.error('[FATAL] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();