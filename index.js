// Load environment variables from .env
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');

// Constants
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// ✅ Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });

// 📦 MongoDB Schema & Model
const EventSchema = new mongoose.Schema({
  request_id: String,
  author: String,
  from_branch: String,
  to_branch: String,
  timestamp: { type: Date, default: Date.now }
});
const Event = mongoose.model("Event", EventSchema);

// 🧩 Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// ✅ Health Check Route
app.get('/', (req, res) => {
  res.send('✅ GitHub Webhook Listener is Running!');
});

// 📬 GitHub Webhook Receiver
app.post('/webhook', async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  console.log("📩 Incoming GitHub webhook...");
  console.log("📌 Event Type:", event);

  if (event === 'pull_request') {
    const pr = payload.pull_request;

    const eventData = {
      request_id: pr.id.toString(),
      author: pr.user.login,
      from_branch: pr.head.ref,
      to_branch: pr.base.ref,
      timestamp: new Date(pr.updated_at || pr.created_at)
    };

    try {
      const savedEvent = await Event.create(eventData);
      console.log("✅ Pull request event saved to MongoDB");
      io.emit('github-event', savedEvent);
      res.status(200).send("Pull request event stored");
    } catch (err) {
      console.error("❌ Error saving event:", err.message);
      res.status(500).send("Error saving pull request event");
    }

  } else {
    console.log("ℹ️ Skipping unsupported event type:", event);
    res.status(200).send("Event received but not stored");
  }
});

// 🔌 WebSocket Setup
io.on('connection', (socket) => {
  console.log('🔌 Client connected via WebSocket');
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected');
  });
});

// 🚀 Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
