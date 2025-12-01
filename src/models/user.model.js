import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  plan: { type: String, enum: ['free', 'premium'], default: 'free' },
  
  // WireGuard Config - stored as a complete config string
  wireguardConfig: { type: String, default: null },
  // Gateway assignment for statistics
  assignedGateway: { type: mongoose.Schema.Types.ObjectId, ref: 'Gateway', default: null },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User;