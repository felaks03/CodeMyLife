import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/user.model';
import { env } from '../config/env';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(80),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128)
});

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

authRouter.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid registration data' });
    return;
  }

  const { email, name, password } = parsed.data;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email: email.toLowerCase(), name, passwordHash });

  res.status(201).json({
    token: signToken(user._id.toString()),
    user: { id: user._id.toString(), email: user.email, name: user.name }
  });
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid credentials' });
    return;
  }

  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
  // Compare against a dummy hash when the user is missing to keep response time uniform.
  const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin';
  const valid = await bcrypt.compare(parsed.data.password, hash);

  if (!user || !valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  res.json({
    token: signToken(user._id.toString()),
    user: { id: user._id.toString(), email: user.email, name: user.name }
  });
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = await User.findById(req.userId).select('email name emailVerified createdAt');
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ id: user._id.toString(), email: user.email, name: user.name });
});
