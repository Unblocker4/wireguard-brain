import Gateway from '../models/gateway.model.js';
import { generateWgKeys, assignIp, buildWgConfig } from '../services/vpn.service.js';
import axios from 'axios';

export const getConfig = async (req, res) => {
  try {
    // req.user is attached by the authMiddleware
    const user = req.user;

    // --- 1. User ALREADY has a config ---
    if (user.assignedGateway && user.wgPublicKey) {
      console.log(`[INFO] Returning existing config for user ${user.email}`);
      const gateway = await Gateway.findById(user.assignedGateway);
      
      const config = buildWgConfig(user, gateway);
      res.set('Content-Type', 'text/plain');
      return res.status(200).send(config);
    }

    // --- 2. User is NEW (First-time provisioning) ---
    console.log(`[INFO] Provisioning new config for user ${user.email}`);

    // A. Find the least busy gateway
    const gateway = await Gateway.findOne().sort({ activeUserCount: 1 });
    if (!gateway) {
      return res.status(503).json({ error: 'Service Unavailable: No gateways found' });
    }

    // B. Generate new WireGuard keys for the user
    const { privateKey, publicKey } = await generateWgKeys();

    // C. Assign a new IP (simple random IP for this example)
    const vpnIp = assignIp(gateway.subnet); // Remember to improve this logic

    // D. Tell the "Muscle" (Agent) to add this peer
    await axios.post(
      `${gateway.apiEndpoint}/add-peer`,
      { publicKey: publicKey, vpnIp: vpnIp },
      { headers: { 'x-api-key': gateway.apiKey } }
    );

    // E. Save provisioning info to the user's document
    user.assignedGateway = gateway._id;
    user.vpnIp = vpnIp;
    user.wgPublicKey = publicKey;
    user.wgPrivateKey = privateKey; // !! Remember: Encrypt this!
    await user.save();
    
    // F. Build and return the new config string
    const config = buildWgConfig(user, gateway);
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