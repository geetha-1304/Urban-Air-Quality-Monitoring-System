import { Router } from 'express';
import {
  createPollutionReport, getAdminReport, getAdminReportStats, getAdminReports,
  getMyReport, getMyReports, getReportImage, updateAdminReportRemarks,
  updateAdminReportStatus, reverseGeocode,
} from '../controllers/pollutionReportController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';
import { handleReportImageUpload } from '../middleware/reportUploadMiddleware';

const router = Router();
router.use(authMiddleware);

router.post('/', handleReportImageUpload, createPollutionReport);
router.get('/reverse-geocode', reverseGeocode);
router.get('/my', getMyReports);
router.get('/my/:id', getMyReport);

router.get('/admin/stats', requireAdmin, getAdminReportStats);
router.get('/', requireAdmin, getAdminReports);
router.get('/:id/image', getReportImage);
router.get('/:id', requireAdmin, getAdminReport);
router.patch('/:id/status', requireAdmin, updateAdminReportStatus);
router.patch('/:id/remarks', requireAdmin, updateAdminReportRemarks);

export default router;
