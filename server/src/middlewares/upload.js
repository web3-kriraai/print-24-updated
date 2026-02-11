import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Allow multiple files for front and back images
export const uploadDesignFiles = upload.fields([
  { name: "frontImage", maxCount: 1 },
  { name: "backImage", maxCount: 1 }
]);

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