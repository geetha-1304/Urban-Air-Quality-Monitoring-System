import { Router } from 'express';
import {
  getReadings,
  getReading,
  addReading,
  editReading,
  removeReading,
  getCurrentReading,
  getHistory,
  getTrends,
  refreshLiveData,
} from '../controllers/readingController';
import { authMiddleware } from '../middleware/authMiddleware';
import { cacheResponse } from '../config/redis';

const router = Router();

// IMPORTANT: these specific routes must be registered BEFORE '/:id',
// otherwise Express would match "current", "history" or "trends"
// as if they were an :id value.
router.get('/current/:stationId', cacheResponse(30), getCurrentReading);
router.get('/history/:stationId', cacheResponse(60), getHistory);
router.get('/trends/:stationId', cacheResponse(60), getTrends);
router.post('/refresh', authMiddleware, refreshLiveData);

router.get('/', cacheResponse(30), getReadings);
router.get('/:id', cacheResponse(30), getReading);
router.post('/', authMiddleware, addReading);
router.put('/:id', authMiddleware, editReading);
router.delete('/:id', authMiddleware, removeReading);

export default router;
