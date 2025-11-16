import express from 'express';
import allRoutes from './routes/index.js';

const app = express();

// Global middleware
app.use(express.json());

// Mount all routes
app.use('/', allRoutes);

// Optional: Add a 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Optional: Add a global error handler

export default app;