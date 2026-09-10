import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Helper to safely get upload directory (falls back to /tmp on serverless read-only filesystems)
function getSafeUploadDir(): string {
  const primaryDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    return primaryDir;
  } catch (err) {
    const fallbackDir = path.join('/tmp', 'uploads', 'videos');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    return fallbackDir;
  }
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = getSafeUploadDir();
    cb(null, dir);
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
