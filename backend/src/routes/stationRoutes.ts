import { Router } from 'express';
import {
  getStations,
  getStation,
  addStation,
  editStation,
  removeStation,
} from '../controllers/stationController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';
import { cacheResponse } from '../config/redis';

const router = Router();

router.get('/', cacheResponse(300), getStations);
router.get('/:id', cacheResponse(300), getStation);
router.post('/', authMiddleware, requireAdmin, addStation);
router.put('/:id', authMiddleware, requireAdmin, editStation);
router.delete('/:id', authMiddleware, requireAdmin, removeStation);

export default router;
