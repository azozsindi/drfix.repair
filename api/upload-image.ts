import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Helper to safely get upload directory for images
function getSafeImageUploadDir(): string {
  const primaryDir = path.join(process.cwd(), 'public', 'uploads', 'images');
  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    return primaryDir;
  } catch (err) {
    const fallbackDir = path.join('/tmp', 'uploads', 'images');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    return fallbackDir;
  }
}

// Configure multer storage for images
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = getSafeImageUploadDir();
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    cb(null, `img_${uniqueSuffix}${cleanExt.toLowerCase()}`);
  }
});

// Up to 25MB image files supported (modern smartphone cameras)
export const imageUploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  },
  fileFilter: (_req, file, cb) => {
    const isImageMime = file.mimetype.startsWith('image/');
    const isImageExt = /\.(jpe?g|png|webp|gif|svg|bmp|tiff?|ico|heic|heif|avif)$/i.test(file.originalname);
    if (isImageMime || isImageExt) {
      cb(null, true);
    } else {
      cb(new Error('صيغة الملف غير مدعومة. يرجى اختيار ملف صورة صالح (JPG, PNG, WebP, GIF, SVG, HEIC)'));
    }
  }
}).single('image');

export default async function uploadImageHandler(req: Request, res: Response) {
  imageUploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('Multer image upload error:', err);
      let errorMsg = 'فشل رفع ملف الصورة';
      if (err.code === 'LIMIT_FILE_SIZE') {
        errorMsg = 'حجم الصورة يتجاوز الحد المسموح (25 ميجابايت). يرجى اختيار صورة أصغر.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      return res.status(400).json({
        success: false,
        error: errorMsg
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم استلام أي ملف صورة'
      });
    }

    const imageUrl = `/uploads/images/${req.file.filename}`;
    
    return res.status(200).json({
      success: true,
      imageUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
}
