import multer from 'multer';
import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorMiddleware';

export const MAX_REPORT_IMAGE_BYTES = 5 * 1024 * 1024;
export const reportImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_REPORT_IMAGE_BYTES, files: 1, fields: 8, parts: 9 },
}).single('image');

export const handleReportImageUpload = (req: Request, res: Response, next: NextFunction) => {
  reportImageUpload(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') return next(new AppError('Image must be 5 MB or smaller', 413));
      if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') return next(new AppError('Upload one image using the image field', 400));
      return next(new AppError('Invalid image upload', 400));
    }
    next(error);
  });
};
