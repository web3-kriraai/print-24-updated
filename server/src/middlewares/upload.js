import multer from "multer";

const storage = multer.memoryStorage();

// Updated file filter to accept images, PDFs, and CDR files
const designFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
    'application/pdf',
    'application/x-coreldraw', 'application/coreldraw'
  ];

  // Also check file extension for CDR (some browsers don't set correct MIME type)
  const isCdr = file.originalname.toLowerCase().endsWith('.cdr');

  if (allowedMimeTypes.includes(file.mimetype) || isCdr) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Accepted: Images (JPEG, PNG, WEBP), PDF, CDR. Received: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: designFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB to accommodate PDF files
  }
});

// Allow multiple files for design uploads
// frontImage/backImage: traditional image uploads
// designFile: PDF or CDR file
// extractedPages: PNG images extracted from PDF (client-side)
export const uploadDesignFiles = upload.fields([
  { name: "frontImage", maxCount: 1 },
  { name: "backImage", maxCount: 1 },
  { name: "designFile", maxCount: 1 },
  { name: "extractedPages", maxCount: 50 }
]);

// Legacy image-only filter (kept for backwards compatibility)
const imageOnlyFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const imageOnlyUpload = multer({
  storage: storage,
  fileFilter: imageOnlyFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// PDF upload for bulk orders
const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed for bulk uploads!"), false);
  }
};

export const uploadPDF = multer({
  storage: storage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB for PDFs
  }
});

export default upload;
