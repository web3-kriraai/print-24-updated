import Design from "../models/uploadModal.js";

// Get user's own uploads
export const getMyUploads = async (req, res) => {
  try {
    const userId = req.user.id;

    const uploads = await Design.find({ user: userId })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    // Convert buffer data to base64 for frontend display
    const uploadsWithImages = uploads.map((upload) => {
      const frontImageBase64 = upload.frontImage?.data
        ? `data:${upload.frontImage.contentType};base64,${upload.frontImage.data.toString("base64")}`
        : null;

      const backImageBase64 = upload.backImage?.data
        ? `data:${upload.backImage.contentType};base64,${upload.backImage.data.toString("base64")}`
        : null;

      return {
        _id: upload._id,
        user: upload.user,
        height: upload.height,
        width: upload.width,
        description: upload.description,
        safeArea: upload.safeArea,
        bleedArea: upload.bleedArea,
        frontImage: frontImageBase64
          ? {
              data: frontImageBase64,
              filename: upload.frontImage.filename,
              size: upload.frontImage.size,
              contentType: upload.frontImage.contentType,
            }
          : null,
        backImage: backImageBase64
          ? {
              data: backImageBase64,
              filename: upload.backImage.filename,
              size: upload.backImage.size,
              contentType: upload.backImage.contentType,
            }
          : null,
        createdAt: upload.createdAt,
        updatedAt: upload.updatedAt,
      };
    });

    res.json(uploadsWithImages);
  } catch (err) {
    console.error("Get my uploads error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Delete user's own upload
export const deleteMyUpload = async (req, res) => {
  try {
    const userId = req.user.id;
    const uploadId = req.params.id;

    // Find the upload and verify it belongs to the user
    const upload = await Design.findById(uploadId);

    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }

    // Check if the upload belongs to the user
    if (upload.user.toString() !== userId) {
      return res.status(403).json({ error: "You don't have permission to delete this upload" });
    }

    // Delete the upload
    await Design.findByIdAndDelete(uploadId);

    res.json({ success: true, message: "Upload deleted successfully" });
  } catch (err) {
    console.error("Delete my upload error:", err);
    res.status(500).json({ error: err.message });
  }
};

