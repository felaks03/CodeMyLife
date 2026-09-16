import { Router, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Commitment } from '../models/commitment.model';
import { Script } from '../models/script.model';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

export const commitmentRouter = Router();

const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/i;
const START_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const END_TIME_PATTERN = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;

export const createCommitmentSchema = z.object({
  scriptId: z.string().refine((value) => Types.ObjectId.isValid(value), 'Invalid scriptId'),
  name: z.string().min(1).max(80),
  customDomains: z.array(z.string().regex(DOMAIN_PATTERN)).max(50).optional(),
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  startTime: z.string().regex(START_TIME_PATTERN),
  endTime: z.string().regex(END_TIME_PATTERN),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date()
});

commitmentRouter.use(requireAuth);

commitmentRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const commitments = await Commitment.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100);
  res.json(commitments);
});

commitmentRouter.get('/active', async (req: AuthenticatedRequest, res: Response) => {
  const now = new Date();
  const commitments = await Commitment.find({
    userId: req.userId,
    status: 'active',
    startsAt: { $lte: now },
    endsAt: { $gte: now }
  });
  res.json(commitments);
});

commitmentRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createCommitmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid commitment data' });
    return;
  }

  const data = parsed.data;
  if (data.endsAt <= data.startsAt) {
    res.status(400).json({ error: 'endsAt must be after startsAt' });
    return;
  }
  if (data.endTime <= data.startTime) {
    res.status(400).json({ error: 'endTime must be after startTime' });
    return;
  }

  const script = await Script.findById(data.scriptId);
  if (!script) {
    res.status(404).json({ error: 'Script not found' });
    return;
  }

  const customDomains = script.allowCustomDomains
    ? (data.customDomains ?? []).map((domain) => domain.toLowerCase())
    : [];
  const blockedDomains = [...new Set([...script.blockedDomains, ...customDomains])];

  const commitment = await Commitment.create({
    name: data.name,
    days: [...new Set(data.days)].sort(),
    startTime: data.startTime,
    endTime: data.endTime,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    scriptId: script._id,
    scriptName: script.name,
    blockedDomains,
    userId: req.userId,
    status: 'active'
  });

  script.usageCount += 1;
  await script.save();

  res.status(201).json(commitment);
});

commitmentRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const commitment = await Commitment.findOne({ _id: req.params.id, userId: req.userId });
  if (!commitment) {
    res.status(404).json({ error: 'Commitment not found' });
    return;
  }

  const now = new Date();
  const isRunning = commitment.status === 'active' && commitment.startsAt <= now && commitment.endsAt >= now;
  if (isRunning) {
    res.status(409).json({ error: 'An active commitment cannot be cancelled' });
    return;
  }

  commitment.status = 'cancelled';
  await commitment.save();
  res.json(commitment);
});
