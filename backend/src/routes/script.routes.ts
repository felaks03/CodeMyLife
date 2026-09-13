import { Router, Response } from 'express';
import { z } from 'zod';
import { Script } from '../models/script.model';
import { User } from '../models/user.model';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

export const scriptRouter = Router();

const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/i;

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(280),
  category: z.string().min(1).max(40),
  blockedDomains: z.array(z.string().regex(DOMAIN_PATTERN)).min(1).max(50),
  allowCustomDomains: z.boolean().optional()
});

scriptRouter.use(requireAuth);

scriptRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const filter = query ? { $text: { $search: query } } : {};

  const scripts = await Script.find(filter)
    .sort(query ? { score: { $meta: 'textScore' } } : { usageCount: -1, createdAt: -1 })
    .limit(30);

  res.json(scripts);
});

scriptRouter.get('/mine', async (req: AuthenticatedRequest, res: Response) => {
  const scripts = await Script.find({ authorId: req.userId }).sort({ createdAt: -1 }).limit(50);
  res.json(scripts);
});

scriptRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid script data' });
    return;
  }

  const author = await User.findById(req.userId).select('name');
  if (!author) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const script = await Script.create({
    ...parsed.data,
    blockedDomains: [...new Set(parsed.data.blockedDomains.map((domain) => domain.toLowerCase()))],
    authorId: req.userId,
    authorName: author.name
  });

  res.status(201).json(script);
});
