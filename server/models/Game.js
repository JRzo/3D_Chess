import mongoose from 'mongoose';

const moveSchema = new mongoose.Schema({
  from: String,
  to: String,
  piece: String,
  san: String,
  fen: String,
  timestamp: { type: Date, default: Date.now },
});

const gameSchema = new mongoose.Schema({
  white: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  black: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  whiteUsername: String,
  blackUsername: String,
  moves: [moveSchema],
  pgn: String,
  fen: String,
  result: { type: String, enum: ['white', 'black', 'draw', 'ongoing'], default: 'ongoing' },
  resultReason: String,
  status: { type: String, enum: ['waiting', 'active', 'completed'], default: 'active' },
  timeControl: { type: Number, default: 600 },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
});

export default mongoose.model('Game', gameSchema);
