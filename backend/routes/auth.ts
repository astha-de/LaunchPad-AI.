import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { User } from '../models/User.ts';
import { requireAuth, signAuthToken, type AuthenticatedRequest } from '../middleware/auth.ts';
import { requireDB } from '../middleware/dbCheck.ts';

const router = Router();

router.post('/signup', requireDB, async (req, res, next) => {
  try {
    const { name, email, password, targetRole } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      targetRole?: string;
    };

    const trimmedName = (name || '').trim();
    const normalizedEmail = (email || '').trim().toLowerCase();
    const rawPassword = password || '';

    if (trimmedName.length < 2) {
      res.status(400).json({ message: 'Full name must be at least 2 characters.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      res.status(400).json({ message: 'Please enter a valid email address.' });
      return;
    }

    if (rawPassword.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters.' });
      return;
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
      targetRole: (targetRole || '').trim(),
    });

    const token = signAuthToken(user._id.toString(), user.email);

    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        targetRole: user.targetRole,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', requireDB, async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const normalizedEmail = (email || '').trim().toLowerCase();
    const rawPassword = password || '';

    if (!normalizedEmail || !rawPassword) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(rawPassword, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const token = signAuthToken(user._id.toString(), user.email);

    res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        targetRole: user.targetRole,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

router.get('/me', requireAuth, requireDB, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ message: 'User account not found.' });
      return;
    }

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        targetRole: user.targetRole,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/profile', requireAuth, requireDB, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { name, targetRole } = req.body as { name?: string; targetRole?: string };
    const updates: { name?: string; targetRole?: string } = {};

    if (typeof name === 'string') {
      const trimmed = name.trim();
      if (trimmed.length < 2) {
        res.status(400).json({ message: 'Name must be at least 2 characters.' });
        return;
      }
      updates.name = trimmed;
    }

    if (typeof targetRole === 'string') {
      updates.targetRole = targetRole.trim();
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
      runValidators: true,
    }).select('-passwordHash');

    if (!user) {
      res.status(404).json({ message: 'User account not found.' });
      return;
    }

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        targetRole: user.targetRole,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
