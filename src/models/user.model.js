import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }, // <-- ADD THIS
  plan: { type: String, enum: ['free', 'premium'], default: 'free' },
  
  // WireGuard Provisioning Info
  assignedGateway: { type: mongoose.Schema.Types.ObjectId, ref: 'Gateway', default: null },
  vpnIp: { type: String, default: null },
  wgPublicKey: { type: String, default: null },
  
  // !! SECURITY WARNING !!
  // You MUST encrypt this private key in a real production app.
  wgPrivateKey: { type: String, default: null },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User;