import { Router } from 'express';
import { getConfig } from '../controllers/vpn.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// This route is protected by the authMiddleware
router.get('/get-config', authMiddleware, getConfig);

export default router;