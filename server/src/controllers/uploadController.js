import Design from "../models/uploadModal.js";
import { User } from "../models/User.js";
import sharp from "sharp";

export const uploadDesign = async (req, res) => {
  try {
    const {
      userId,
      height,
      width,
      description,
      // Safe area margins
      safeTop = 0,
      safeBottom = 0,
      safeLeft = 0,
      safeRight = 0,
      // Bleed area margins
      bleedTop = 0,
      bleedBottom = 0,
      bleedLeft = 0,
      bleedRight = 0,
      // PDF page mapping metadata (JSON string)
      pageMapping
    } = req.body;

    // Validate required fields
    if (!userId || !height || !width) {
      return res.status(400).json({
        success: false,
        message: "UserId, height, and width are required"
      });
    }

    // Check user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get uploaded files
    const frontImageFile = req.files?.frontImage?.[0];
    const backImageFile = req.files?.backImage?.[0];
    const designFile = req.files?.designFile?.[0]; // PDF or CDR
    const extractedPages = req.files?.extractedPages || []; // Extracted PNG pages

    // Require either traditional images OR design file
    if (!frontImageFile && !designFile) {
      return res.status(400).json({
        success: false,
        message: "Either front image or design file (PDF/CDR) is required",
      });
    }

    // Create design data
    const designData = {
      user: userId,
      height: parseInt(height),
      width: parseInt(width),
      description: description || "",
      safeArea: {
        top: parseFloat(safeTop),
        bottom: parseFloat(safeBottom),
        left: parseFloat(safeLeft),
        right: parseFloat(safeRight)
      },
      bleedArea: {
        top: parseFloat(bleedTop),
        bottom: parseFloat(bleedBottom),
        left: parseFloat(bleedLeft),
        right: parseFloat(bleedRight)
      }
    };

    // Handle traditional front image if provided
    if (frontImageFile) {
      // Convert front image to CMYK
      const frontImageBuffer = await sharp(frontImageFile.buffer)
        .toColourspace("cmyk")
        .jpeg({
          quality: 90,
          chromaSubsampling: '4:4:4'
        })
        .toBuffer();

      designData.frontImage = {
        data: frontImageBuffer,
        contentType: "image/jpeg",
        filename: frontImageFile.originalname,
        size: frontImageBuffer.length
      };
    }

    // Handle traditional back image if provided
    if (backImageFile) {
      const backImageBuffer = await sharp(backImageFile.buffer)
        .toColourspace("cmyk")
        .jpeg({
          quality: 90,
          chromaSubsampling: '4:4:4'
        })
        .toBuffer();

      designData.backImage = {
        data: backImageBuffer,
        contentType: "image/jpeg",
        filename: backImageFile.originalname,
        size: backImageBuffer.length
      };
    }

    // Handle design file (PDF or CDR)
    if (designFile) {
      const isPdf = designFile.mimetype === 'application/pdf' ||
        designFile.originalname.toLowerCase().endsWith('.pdf');
      const isCdr = designFile.originalname.toLowerCase().endsWith('.cdr');

      designData.designFile = {
        data: designFile.buffer,
        contentType: designFile.mimetype,
        filename: designFile.originalname,
        size: designFile.buffer.length,
        fileType: isPdf ? 'PDF' : (isCdr ? 'CDR' : 'UNKNOWN'),
        extractedPageCount: extractedPages.length
      };

      // Store page mapping metadata if provided
      if (pageMapping) {
        try {
          designData.pageMapping = JSON.parse(pageMapping);
        } catch (e) {
          console.warn('Failed to parse pageMapping JSON:', e);
        }
      }

      // Handle extracted pages (PNG images from PDF)
      if (extractedPages.length > 0) {
        designData.extractedPages = await Promise.all(
          extractedPages.map(async (page, index) => {
            // Convert extracted pages to CMYK for print
            const processedBuffer = await sharp(page.buffer)
              .toColourspace("cmyk")
              .jpeg({
                quality: 90,
                chromaSubsampling: '4:4:4'
              })
              .toBuffer();

            return {
              data: processedBuffer,
              contentType: "image/jpeg",
              filename: page.originalname || `page-${index + 1}.jpg`,
              size: processedBuffer.length,
              pageNumber: index + 1
            };
          })
        );
      }
    }

    // Save to MongoDB
    const design = await Design.create(designData);

    // Build response
    const responseData = {
      id: design._id,
      user: design.user,
      height: design.height,
      width: design.width,
      description: design.description,
      safeArea: design.safeArea,
      bleedArea: design.bleedArea,
      createdAt: design.createdAt
    };

    // Add traditional image info if present
    if (design.frontImage) {
      responseData.frontImageInfo = {
        filename: design.frontImage.filename,
        size: design.frontImage.size,
        contentType: design.frontImage.contentType
      };
    }

    if (design.backImage) {
      responseData.hasBackImage = true;
      responseData.backImageInfo = {
        filename: design.backImage.filename,
        size: design.backImage.size,
        contentType: design.backImage.contentType
      };
    }

    // Add design file info if present
    if (design.designFile) {
      responseData.designFileInfo = {
        filename: design.designFile.filename,
        size: design.designFile.size,
        fileType: design.designFile.fileType,
        extractedPageCount: design.designFile.extractedPageCount
      };
    }

    if (design.extractedPages && design.extractedPages.length > 0) {
      responseData.extractedPagesCount = design.extractedPages.length;
    }

    // Return success response
    return res.status(201).json({
      success: true,
      message: designFile
        ? `Design file (${designFile.originalname}) uploaded successfully with ${extractedPages.length} extracted pages`
        : backImageFile
          ? "Design with front and back images uploaded successfully"
          : "Design with front image uploaded successfully",
      design: responseData
    });

  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
