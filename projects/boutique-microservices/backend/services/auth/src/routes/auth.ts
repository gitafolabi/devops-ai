import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../database/connection';
import { publishEvent } from '../rabbitmq';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    if (!firstName || !String(firstName).trim()) {
      return res.status(400).json({ message: 'First name is required' });
    }
    if (!lastName || !String(lastName).trim()) {
      return res.status(400).json({ message: 'Last name is required' });
    }

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await query(
      'INSERT INTO users (email, password, password_hash, first_name, last_name, role) VALUES ($1, $2, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role, created_at, updated_at',
      [email.toLowerCase(), hashedPassword, String(firstName).trim(), String(lastName).trim(), 'customer']
    );

    const user = result.rows[0];

    // fire-and-forget — don't block the response if RabbitMQ is unavailable
    publishEvent('user.registered', { email: user.email, firstName: user.first_name });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      token: user.id.toString(),
      refreshToken: user.id.toString(),
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const result = await query(
      'SELECT id, email, password_hash, first_name, last_name, role, created_at, updated_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      token: user.id.toString(),
      refreshToken: user.id.toString(),
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out successfully' });
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken || refreshToken === 'undefined') {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  try {
    const result = await query('SELECT id FROM users WHERE id = $1', [refreshToken]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    res.json({ token: refreshToken, refreshToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  const userId = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!userId || userId === 'undefined') {
    return res.status(401).json({ message: 'Not logged in' });
  }

  try {
    const result = await query(
      'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }
    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      createdAt: user.created_at
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get user' });
  }
});

export { router as authRoutes };
