const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../middleware/error');

const router = express.Router();

const sign = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const publicUser = (u) => ({ _id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role });

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) throw httpError(400, 'Name, email and password are required');
    if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
    if (await User.findOne({ email: email.toLowerCase() })) throw httpError(409, 'Email is already registered');
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, phone, password: hash, role: 'user' });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw httpError(400, 'Email and password are required');
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) throw httpError(401, 'Invalid email or password');
    res.json({ token: sign(user), user: publicUser(user) });
  })
);

router.get('/me', protect, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;
