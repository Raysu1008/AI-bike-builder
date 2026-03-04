import { Router } from 'express';
import recommendRouter from './recommend';
import compatRouter from './compat';
import pricingRouter from './pricing';
import exportRouter from './export';
import authRouter from './auth';
import adminRouter from './admin';
import chatRouter from './chat';
import draftsRouter from './drafts';

const router = Router();

router.use('/auth',   authRouter);
router.use('/admin',  adminRouter);
router.use('/drafts', draftsRouter);
router.use('/bikes',  recommendRouter);
router.use('/chat',   chatRouter);
router.use('/compat', compatRouter);
router.use('/pricing', pricingRouter);
router.use('/export', exportRouter);

export default router;
