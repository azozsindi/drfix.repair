import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    cb(null, `inspection_${uniqueSuffix}${cleanExt}`);
  }
});

// Up to 50MB video files supported
export const videoUploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.originalname.match(/\.(mp4|mov|webm|avi|m4v|3gp)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
}).single('video');

export default async function uploadVideoHandler(req: Request, res: Response) {
  videoUploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('Multer video upload error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'فشل رفع ملف الفيديو'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم استلام أي ملف فيديو'
      });
    }

    const videoUrl = `/uploads/videos/${req.file.filename}`;
    
    return res.status(200).json({
      success: true,
      videoUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
}
