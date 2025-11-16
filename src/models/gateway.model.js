import mongoose from 'mongoose';

const gatewaySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g., "us-east-1"
  apiEndpoint: { type: String, required: true }, // e.g., "http://1.2.3.4:3001"
  apiKey: { type: String, required: true },       // The secret for that agent
  subnet: { type: String, required: true },        // e.g., "10.10.0.0/16"
  wgPublicKey: { type: String, required: true },  // The gateway's public key
  activeUserCount: { type: Number, default: 0 },
  totalPeers: { type: Number, default: 0 },
});

const Gateway = mongoose.model('Gateway', gatewaySchema);

export default Gateway;