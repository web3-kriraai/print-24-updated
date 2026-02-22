import Design from "../models/uploadModal.js";
import {User} from "../models/User.js";
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
      bleedRight = 0
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

    // Check front image is present (COMPULSORY)
    if (!req.files || !req.files.frontImage) {
      return res.status(400).json({
        success: false,
        message: "Front image is compulsory",
      });
    }

    const frontImageFile = req.files.frontImage[0];
    const backImageFile = req.files.backImage ? req.files.backImage[0] : null;

    // Convert front image to CMYK (COMPULSORY)
    const frontImageBuffer = await sharp(frontImageFile.buffer)
      .toColourspace("cmyk")
      .jpeg({
        quality: 90,
        chromaSubsampling: '4:4:4'
      })
      .toBuffer();

    // Convert back image to CMYK if provided (OPTIONAL)
    let backImageBuffer = null;
    if (backImageFile) {
      backImageBuffer = await sharp(backImageFile.buffer)
        .toColourspace("cmyk")
        .jpeg({
          quality: 90,
          chromaSubsampling: '4:4:4'
        })
        .toBuffer();
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
      },
      frontImage: {
        data: frontImageBuffer,
        contentType: "image/jpeg",
        filename: frontImageFile.originalname,
        size: frontImageBuffer.length
      }
    };

    // Add back image only if provided (OPTIONAL)
    if (backImageBuffer) {
      designData.backImage = {
        data: backImageBuffer,
        contentType: "image/jpeg",
        filename: backImageFile.originalname,
        size: backImageBuffer.length
      };
    }

    // Save to MongoDB
    const design = await Design.create(designData);

    // Return success response
    return res.status(201).json({
      success: true,
      message: backImageBuffer ? "Design with front and back images uploaded successfully" : "Design with front image uploaded successfully",
      design: {
        id: design._id,
        user: design.user,
        height: design.height,
        width: design.width,
        description: design.description,
        safeArea: design.safeArea,
        bleedArea: design.bleedArea,
        hasBackImage: !!design.backImage,
        frontImageInfo: {
          filename: design.frontImage.filename,
          size: design.frontImage.size,
          contentType: design.frontImage.contentType
        },
        backImageInfo: design.backImage ? {
          filename: design.backImage.filename,
          size: design.backImage.size,
          contentType: design.backImage.contentType
        } : null,
        createdAt: design.createdAt
      }
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