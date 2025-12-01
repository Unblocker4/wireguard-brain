import Gateway from '../models/gateway.model.js';
import axios from 'axios';

export const getConfig = async (req, res) => {
  try {
    // req.user is attached by the authMiddleware
    const user = req.user;

    // --- 1. User ALREADY has a config ---
    if (user.wireguardConfig) {
      console.log(`[INFO] Returning existing config for user ${user.email}`);
      res.set('Content-Type', 'text/plain');
      return res.status(200).send(user.wireguardConfig);
    }

    // --- 2. User is NEW (First-time provisioning) ---
    console.log(`[INFO] Provisioning new config for user ${user.email}`);

    // A. Find the least busy gateway
    const gateway = await Gateway.findOne().sort({ activeUserCount: 1 });
    if (!gateway) {
      return res.status(503).json({ error: 'Service Unavailable: No gateways found' });
    }

    // B. Call the gateway API to generate a client config
    // Gateway only needs authentication, no keys or IPs needed
    const response = await axios.post(
      `${gateway.apiEndpoint}/add-peer`,
      {peer_name: user.email.split('@')[0]},
      { headers: { 'x-api-key': gateway.apiKey } }
    );

    // C. Extract the config string from the response body
    const config = response.data.config;
    if (!config) {
      throw new Error('Gateway did not return a config in the response');
    }

    // D. Save the config string and assigned gateway to the user's document
    user.wireguardConfig = config;
    user.assignedGateway = gateway._id;
    await user.save();
    
    // E. Return the config string
    res.set('Content-Type', 'text/plain');
    res.status(200).send(config);

  } catch (error) {
    console.error(`[ERROR] /get-config failed: ${error.message}`);
    // Check if it was an agent API error
    if (error.response) {
      console.error('[AGENT-ERROR]', error.response.data);
    }
    res.status(500).json({ error: 'Failed to generate config' });
  }
};