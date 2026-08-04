const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = req.uploadSubDir || 'general';
    const fullPath = path.join(uploadDir, subDir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter — only images
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'), false);
  }
};

// Upload middleware for complaint images
const uploadComplaintImages = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 }, // 5MB default
}).array('images', 5); // Max 5 images per complaint

// Upload middleware for single image (before/after verification)
const uploadSingleImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
}).single('image');

// Upload middleware for avatar
const uploadAvatar = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for avatars
}).single('avatar');

module.exports = { uploadComplaintImages, uploadSingleImage, uploadAvatar };
