const { Router } = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const router = Router();
const ROLES = ['organizer', 'participant'];

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

router.post('/register', async (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name || !ROLES.includes(role)) {
    return res.status(400).json({ error: 'email, password, name и role (organizer|participant) обязательны' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role },
  });

  res.status(201).json({ token: signToken(user), user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email и password обязательны' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Неверный email или пароль' });

  res.json({ token: signToken(user), user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

module.exports = router;
