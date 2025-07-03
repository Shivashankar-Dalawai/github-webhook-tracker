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
  event: String,
  payload: Object,
  receivedAt: { type: Date, default: Date.now },
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

  try {
    const savedEvent = await Event.create({ event, payload });
    console.log(`✅ Received GitHub event: ${event}`);
    io.emit('github-event', savedEvent); // Real-time event push
    res.status(200).send("Event received and stored");
  } catch (err) {
    console.error("❌ Error saving event:", err.message);
    res.status(500).send("Error saving event");
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
