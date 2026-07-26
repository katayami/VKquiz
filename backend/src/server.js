require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const quizzesRoutes = require('./routes/quizzes');
const registerSocketHandlers = require('./sockets');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' },
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizzesRoutes);

registerSocketHandlers(io);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
