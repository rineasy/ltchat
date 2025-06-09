const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    enum: ['user', 'admin', 'ai', 'system'],
    required: true
  },
  userName: {
    type: String,
    default: 'Anonymous User'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userName: {
    type: String,
    default: 'Anonymous User'
  },
  messages: [messageSchema],
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800 // 7 days in seconds (7 * 24 * 60 * 60)
  }
});

// Index for better query performance
chatSchema.index({ lastActivity: -1 });
chatSchema.index({ status: 1 });

// Update lastActivity when messages are added
chatSchema.pre('save', function(next) {
  if (this.messages && this.messages.length > 0) {
    this.lastActivity = this.messages[this.messages.length - 1].timestamp;
  }
  next();
});

module.exports = mongoose.model('Chat', chatSchema); 