import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Helper to safely get upload directory (falls back to /tmp on serverless read-only filesystems)
function getSafeDir(subDir: 'images' | 'videos'): string {
  const primaryDir = path.join(process.cwd(), 'public', 'uploads', subDir);
  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    return primaryDir;
  } catch (err) {
    const fallbackDir = path.join('/tmp', 'uploads', subDir);
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    return fallbackDir;
  }
}

// Multer storage engine routing images to /uploads/images and videos to /uploads/videos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isVideo = file.mimetype.startsWith('video/') || /\.(mp4|mov|webm|avi|m4v|3gp)$/i.test(file.originalname);
    const targetDir = getSafeDir(isVideo ? 'videos' : 'images');
    cb(null, targetDir);
  },
  filename: (_req, file, cb) => {
    const isVideo = file.mimetype.startsWith('video/') || /\.(mp4|mov|webm|avi|m4v|3gp)$/i.test(file.originalname);
    const ext = path.extname(file.originalname) || (isVideo ? '.mp4' : '.jpg');
    const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const prefix = isVideo ? 'inspection' : 'img';
    cb(null, `${prefix}_${uniqueSuffix}${cleanExt.toLowerCase()}`);
  }
});

// Single unified upload middleware accepting up to 50MB (images up to 25MB, videos up to 50MB)
export const mediaUploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (_req, file, cb) => {
    const isImageMime = file.mimetype.startsWith('image/');
    const isImageExt = /\.(jpe?g|png|webp|gif|svg|bmp|tiff?|ico|heic|heif|avif)$/i.test(file.originalname);
    const isVideoMime = file.mimetype.startsWith('video/');
    const isVideoExt = /\.(mp4|mov|webm|avi|m4v|3gp)$/i.test(file.originalname);

    if (isImageMime || isImageExt || isVideoMime || isVideoExt) {
      cb(null, true);
    } else {
      cb(new Error('صيغة الملف غير مدعومة. يرجى اختيار ملف صورة أو فيديو صالح'));
    }
  }
}).any();

export default async function uploadHandler(req: Request, res: Response) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  mediaUploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('[Upload Error]:', err);
      let errorMsg = 'فشل رفع الملف';
      if (err.code === 'LIMIT_FILE_SIZE') {
        errorMsg = 'حجم الملف يتجاوز الحد المسموح (50 ميجابايت). يرجى اختيار ملف أصغر.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      return res.status(400).json({
        success: false,
        error: errorMsg
      });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    const uploadedFile = files[0] || (req as any).file;

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم استلام أي ملف'
      });
    }

    const isVideo = uploadedFile.mimetype.startsWith('video/') || /\.(mp4|mov|webm|avi|m4v|3gp)$/i.test(uploadedFile.filename);
    const fileUrl = isVideo ? `/uploads/videos/${uploadedFile.filename}` : `/uploads/images/${uploadedFile.filename}`;

    return res.status(200).json({
      success: true,
      url: fileUrl,
      imageUrl: fileUrl,
      videoUrl: fileUrl,
      filename: uploadedFile.filename,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype
    });
  });
}
