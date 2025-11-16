import { Router } from 'express';
import { createGateway, listGateways, updateGateway, deleteGateway } from '../controllers/admin.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';

const router = Router();

// These routes are protected by auth AND admin middleware
router.post(
  '/gateways', 
  authMiddleware, 
  adminMiddleware, 
  createGateway
);

router.get(
  '/gateways', 
  authMiddleware, 
  adminMiddleware, 
  listGateways
);

router.put(
  '/gateways/:id',
  authMiddleware,
  adminMiddleware,
  updateGateway
);

router.delete(
  '/gateways/:id',
  authMiddleware,
  adminMiddleware,
  deleteGateway
);

export default router;