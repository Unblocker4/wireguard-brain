import Gateway from '../models/gateway.model.js';
import axios from 'axios';

/**
 * This job runs, gets stats from all
 * gateway agents, and updates the "activeUserCount" in the DB.
 */
async function updateGatewayStats() {
  console.log('[JOB] Running gateway stat update...');
  try {
    const gateways = await Gateway.find();
    
    await Promise.all(gateways.map(async (gw) => {
      try {
        const { data } = await axios.get(`${gw.apiEndpoint}/stats`, {
          headers: { 'x-api-key': gw.apiKey },
          timeout: 5000, // 5 second timeout
        });
        
        // Update the gateway in the DB
        gw.activeUserCount = data.active_users;
        gw.totalPeers = data.total_peers;
        await gw.save();
        console.log(`[JOB] Updated stats for ${gw.name}: ${data.active_users} active`);
        
      } catch (error) {
        console.error(`[JOB-ERROR] Failed to update stats for ${gw.name}: ${error.message}`);
        // Mark as "down" by setting a negative count (so it's not selected)
        gw.activeUserCount = -1; 
        await gw.save();
      }
    }));
  } catch (error) {
    console.error('[JOB-FATAL] Could not fetch gateways for stat update:', error.message);
  }
}

/**
 * Exports a function to start the job.
 * Called by server.js on startup.
 */
export const startStatJob = () => {
  // Run the job once on startup, then every 30 seconds
  updateGatewayStats();
  setInterval(updateGatewayStats, 30000); // 30 seconds
};