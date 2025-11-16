import { Router } from 'express';
import authRoutes from './auth.routes.js';
import vpnRoutes from './vpn.routes.js';
import adminRoutes from './admin.routes.js'; 

const router = Router();

// Mount the specific routers
router.use('/auth', authRoutes);
router.use('/api/v1', vpnRoutes);
router.use('/admin', adminRoutes); // <-- ADD THIS

export default router;