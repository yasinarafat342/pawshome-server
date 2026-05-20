import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// In-memory user store is NOT used here.
// This route just issues JWTs for Firebase-authenticated users.
// Firebase handles actual user auth; we just verify and issue our own JWT.

// POST /api/auth/jwt  — called after Firebase login to get a server JWT
router.post('/jwt', (req, res) => {
  const { email, name, photoURL } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const token = jwt.sign(
    { email, name, photoURL },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res
    .cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    .json({ success: true, token });
});

// POST /api/auth/logout — clear cookie
router.post('/logout', (req, res) => {
  res
    .clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    })
    .json({ success: true, message: 'Logged out successfully' });
});

export default router;
