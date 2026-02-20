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

// Separate upload instance for ZIP files (Excel bulk upload)
const zipFileFilter = (req, file, cb) => {
  if (file.mimetype === "application/zip" || file.mimetype === "application/x-zip-compressed") {
    cb(null, true);
  } else {
    cb(new Error("Only ZIP files are allowed for bulk upload!"), false);
  }
};

// Separate upload instance for PDF files (Bulk Order)
const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed!"), false);
  }
};

export const uploadPDF = multer({
  storage: storage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB for PDF files
  }
});

export const uploadZip = multer({
  storage: storage,
  fileFilter: zipFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB for ZIP files
  }
});

export default upload;