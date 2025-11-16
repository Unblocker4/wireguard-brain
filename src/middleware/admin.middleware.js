export const adminMiddleware = (req, res, next) => {
    // Assumes authMiddleware has already run and attached req.user
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
  };