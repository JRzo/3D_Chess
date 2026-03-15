import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '♟' },
  bio: { type: String, default: '' },
  stats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    totalGames: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    rank: { type: String, default: 'Bronze' },
  },
  achievements: [{ name: String, unlockedAt: { type: Date, default: Date.now } }],
  settings: {
    soundEnabled: { type: Boolean, default: true },
    musicEnabled: { type: Boolean, default: false },
    theme: { type: String, default: 'dark' },
    pieceStyle: { type: String, default: 'classic' },
    boardStyle: { type: String, default: 'wood' },
    showTutorial: { type: Boolean, default: true },
  },
  failedLoginAttempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);
