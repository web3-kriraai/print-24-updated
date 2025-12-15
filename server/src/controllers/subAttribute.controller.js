import SubAttribute from "../models/subAttributeSchema.js";
import AttributeType from "../models/attributeTypeModal.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

/**
 * Helper function to update hasSubAttributes field in parent AttributeType
 * @param {string} parentAttributeId - The ID of the parent attribute
 * @param {string} parentValue - The parent value to check
 */
const updateParentAttributeHasSubAttributes = async (parentAttributeId, parentValue) => {
  try {
    // Convert to string to ensure proper comparison
    const attrId = parentAttributeId.toString();
    const pValue = String(parentValue).trim();

    console.log(`[UPDATE] Looking up AttributeType with ID: ${attrId}`);
    const attributeType = await AttributeType.findById(attrId);
    if (!attributeType) {
      console.error(`[UPDATE] ERROR: AttributeType ${attrId} not found`);
      throw new Error(`AttributeType ${attrId} not found`);
    }

    console.log(`[UPDATE] Found AttributeType: "${attributeType.attributeName}"`);
    console.log(`[UPDATE] Searching for parentValue: "${pValue}"`);
    console.log(`[UPDATE] Available attributeValues:`, attributeType.attributeValues.map(av => ({ value: av.value, label: av.label, hasSubAttributes: av.hasSubAttributes })));

    // Check if there are any enabled sub-attributes for this parent value
    const subAttributesCount = await SubAttribute.countDocuments({
      parentAttribute: attrId,
      parentValue: pValue,
      isEnabled: true,
    });

    console.log(`[UPDATE] Found ${subAttributesCount} enabled sub-attributes for parentValue "${pValue}"`);

    // Find the attribute value in the attributeValues array
    // Use both value and label matching for better compatibility
    let attributeValueIndex = attributeType.attributeValues.findIndex(
      (av) => String(av.value).trim() === pValue || String(av.label).trim() === pValue
    );

    // If not found, try case-insensitive match
    if (attributeValueIndex === -1) {
      console.log(`[UPDATE] Exact match not found, trying case-insensitive match...`);
      attributeValueIndex = attributeType.attributeValues.findIndex(
        (av) => String(av.value).trim().toLowerCase() === pValue.toLowerCase() || 
                String(av.label).trim().toLowerCase() === pValue.toLowerCase()
      );
    }

    if (attributeValueIndex !== -1) {
      const oldValue = attributeType.attributeValues[attributeValueIndex].hasSubAttributes;
      const newValue = subAttributesCount > 0;
      
      console.log(`[UPDATE] Found attribute value at index ${attributeValueIndex}`);
      console.log(`[UPDATE] Current hasSubAttributes: ${oldValue}, New value: ${newValue}`);
      
      // Update the hasSubAttributes field
      attributeType.attributeValues[attributeValueIndex].hasSubAttributes = newValue;
      
      // Mark the array as modified to ensure Mongoose saves it
      // This is critical for nested array updates in Mongoose
      attributeType.markModified('attributeValues');
      
      // Also mark the specific nested object as modified (extra safety)
      attributeType.markModified(`attributeValues.${attributeValueIndex}`);
      
      // Save the document with validation
      const saved = await attributeType.save({ validateBeforeSave: true });
      
      // Verify the save worked
      const verify = await AttributeType.findById(attrId);
      const verifiedValue = verify.attributeValues[attributeValueIndex].hasSubAttributes;
      
      console.log(
        `[UPDATE] ✓ Successfully updated hasSubAttributes for "${attributeType.attributeName}" value "${pValue}": ${oldValue} → ${newValue} (${subAttributesCount} enabled sub-attributes)`
      );
      console.log(`[UPDATE] Verification: saved value is ${verifiedValue}`);
      
      if (verifiedValue !== newValue) {
        console.error(`[UPDATE] WARNING: Verification failed! Expected ${newValue} but got ${verifiedValue}`);
      }
    } else {
      const availableValues = attributeType.attributeValues.map(av => `"${av.value}" (label: "${av.label}")`).join(', ');
      console.warn(
        `[UPDATE] ⚠ Attribute value "${pValue}" not found in AttributeType "${attributeType.attributeName}". Available values: ${availableValues}`
      );
      throw new Error(`Attribute value "${pValue}" not found in AttributeType "${attributeType.attributeName}"`);
    }
  } catch (error) {
    console.error("[UPDATE] ERROR in updateParentAttributeHasSubAttributes:", error);
    console.error("[UPDATE] Error stack:", error.stack);
    throw error;
  }
};

/**
 * POST /admin/sub-attributes
 * Create a new sub-attribute
 */
export const createSubAttribute = async (req, res) => {
  try {
    // Extract fields from req.body (FormData fields are strings)
    const parentAttribute = req.body.parentAttribute;
    const parentValue = req.body.parentValue;
    const value = req.body.value;
    const label = req.body.label;
    const image = req.body.image;
    const priceAdd = req.body.priceAdd;
    const isEnabled = req.body.isEnabled;
    
    console.log('[CREATE] Received sub-attribute data:', {
      parentAttribute,
      parentValue,
      value,
      label,
      priceAdd,
      isEnabled
    });

    if (!parentAttribute) {
      return res.status(400).json({ error: "Parent attribute is required" });
    }

    if (!parentValue) {
      return res.status(400).json({ error: "Parent value is required" });
    }

    if (!value) {
      return res.status(400).json({ error: "Value is required" });
    }

    if (!label) {
      return res.status(400).json({ error: "Label is required" });
    }

    // Validate parentAttribute exists
    console.log('[CREATE] Looking up parent attribute with ID:', parentAttribute);
    const attributeType = await AttributeType.findById(parentAttribute);
    if (!attributeType) {
      console.error('[CREATE] Parent attribute not found:', parentAttribute);
      return res.status(400).json({ error: "Parent attribute not found" });
    }
    console.log('[CREATE] Found parent attribute:', attributeType.attributeName);
    console.log('[CREATE] Parent attribute values:', attributeType.attributeValues.map(av => ({ value: av.value, label: av.label })));

    // Check for duplicate (same parentAttribute, parentValue, and value)
    const existing = await SubAttribute.findOne({
      parentAttribute,
      parentValue,
      value,
    });

    if (existing) {
      return res.status(400).json({
        error: "Sub-attribute with this parent attribute, parent value, and value already exists",
      });
    }

    let imageUrl = image || null;

    // Handle file upload if present
    if (req.file) {
      const uploadStream = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "sub-attributes" },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const result = await uploadStream();
      imageUrl = result.secure_url;
    }

    const subAttribute = await SubAttribute.create({
      parentAttribute,
      parentValue,
      value,
      label,
      image: imageUrl,
      priceAdd: priceAdd !== undefined ? parseFloat(priceAdd) : 0,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
    });

    // Update parent attribute's hasSubAttributes field
    // IMPORTANT: This must happen after sub-attribute is created so countDocuments works correctly
    console.log(`[CREATE] Updating hasSubAttributes for parentAttribute: ${parentAttribute}, parentValue: ${parentValue}`);
    try {
      await updateParentAttributeHasSubAttributes(parentAttribute, parentValue);
      console.log(`[CREATE] Successfully updated hasSubAttributes`);
    } catch (updateError) {
      console.error("[CREATE] ERROR: Failed to update parent attribute hasSubAttributes:", updateError);
      console.error("[CREATE] Error stack:", updateError.stack);
      // Continue - don't fail the request, but log the error
    }

    // Populate parentAttribute
    const populatedSubAttribute = await SubAttribute.findById(subAttribute._id)
      .populate({
        path: "parentAttribute",
        select: "_id attributeName",
      })
      .lean();

    return res.status(201).json({
      success: true,
      message: "Sub-attribute created successfully",
      data: populatedSubAttribute,
    });
  } catch (err) {
    console.error("Error creating sub-attribute:", err);
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    return res.status(500).json({ error: err.message || "Failed to create sub-attribute" });
  }
};

/**
 * GET /admin/sub-attributes
 * Get all sub-attributes (with optional filter by attributeId)
 */
export const getAllSubAttributes = async (req, res) => {
  try {
    const { attributeId, parentValue, isEnabled } = req.query;

    const query = {};

    if (attributeId) {
      query.parentAttribute = attributeId;
    }

    if (parentValue) {
      query.parentValue = parentValue;
    }

    if (isEnabled !== undefined) {
      query.isEnabled = isEnabled === "true" || isEnabled === true;
    }

    const subAttributes = await SubAttribute.find(query)
      .populate({
        path: "parentAttribute",
        select: "_id attributeName",
      })
      .sort({ parentAttribute: 1, parentValue: 1, label: 1 })
      .lean();

    return res.json(subAttributes);
  } catch (err) {
    console.error("Error fetching sub-attributes:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch sub-attributes" });
  }
};

/**
 * PUT /admin/sub-attributes/:id
 * Update a sub-attribute
 */
export const updateSubAttribute = async (req, res) => {
  try {
    const subAttributeId = req.params.id;
    const { parentAttribute, parentValue, value, label, image, priceAdd, isEnabled } = req.body;

    // Get existing sub-attribute first to preserve image if no new one uploaded
    const existingSubAttribute = await SubAttribute.findById(subAttributeId);
    if (!existingSubAttribute) {
      return res.status(404).json({ error: "Sub-attribute not found" });
    }

    let imageUrl = existingSubAttribute.image; // Preserve existing image by default

    // Handle file upload if present
    if (req.file) {
      const uploadStream = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "sub-attributes" },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const result = await uploadStream();
      imageUrl = result.secure_url;
    }

    if (!subAttributeId) {
      return res.status(400).json({ error: "Sub-attribute ID is required" });
    }

    // Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(subAttributeId)) {
      return res.status(400).json({ error: "Invalid sub-attribute ID format" });
    }

    if (!parentAttribute) {
      return res.status(400).json({ error: "Parent attribute is required" });
    }

    if (!parentValue) {
      return res.status(400).json({ error: "Parent value is required" });
    }

    if (!value) {
      return res.status(400).json({ error: "Value is required" });
    }

    if (!label) {
      return res.status(400).json({ error: "Label is required" });
    }

    // Validate parentAttribute exists
    const attributeType = await AttributeType.findById(parentAttribute);
    if (!attributeType) {
      return res.status(400).json({ error: "Parent attribute not found" });
    }

    // Check for duplicate (excluding current sub-attribute)
    const existing = await SubAttribute.findOne({
      parentAttribute,
      parentValue,
      value,
      _id: { $ne: subAttributeId },
    });

    if (existing) {
      return res.status(400).json({
        error: "Sub-attribute with this parent attribute, parent value, and value already exists",
      });
    }

    // Store old parentValue and parentAttribute before update (in case they change)
    const oldParentValue = existingSubAttribute.parentValue;
    const oldParentAttribute = existingSubAttribute.parentAttribute.toString();
    const newParentAttribute = parentAttribute.toString();

    const updatedSubAttribute = await SubAttribute.findByIdAndUpdate(
      subAttributeId,
      {
        parentAttribute,
        parentValue,
        value,
        label,
        image: imageUrl, // Use uploaded image or preserve existing
        priceAdd: priceAdd !== undefined ? parseFloat(priceAdd) : 0,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      },
      { new: true }
    );

    // Update parent attribute's hasSubAttributes field for both old and new parent values
    // (in case parentValue or parentAttribute changed)
    
    // Check if parent value or parent attribute changed
    const parentValueChanged = oldParentValue !== parentValue;
    const parentAttributeChanged = oldParentAttribute !== newParentAttribute;
    
    // Wrap in try-catch to ensure it doesn't break the response if update fails
    try {
      // Update old parent value (set to false if no sub-attributes remain)
      // Only update if the parent value or parent attribute actually changed
      if ((parentValueChanged || parentAttributeChanged) && oldParentValue && oldParentAttribute) {
        await updateParentAttributeHasSubAttributes(oldParentAttribute, oldParentValue);
      }
      
      // Update new parent value (always update to reflect current state)
      await updateParentAttributeHasSubAttributes(newParentAttribute, parentValue);
    } catch (updateError) {
      console.error("Warning: Failed to update parent attribute hasSubAttributes, but sub-attribute was updated:", updateError);
      // Continue - don't fail the request
    }

    // Populate parentAttribute
    const populatedSubAttribute = await SubAttribute.findById(updatedSubAttribute._id)
      .populate({
        path: "parentAttribute",
        select: "_id attributeName",
      })
      .lean();

    return res.json({
      success: true,
      message: "Sub-attribute updated successfully",
      data: populatedSubAttribute,
    });
  } catch (err) {
    console.error("Error updating sub-attribute:", err);
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    return res.status(500).json({ error: err.message || "Failed to update sub-attribute" });
  }
};

/**
 * DELETE /admin/sub-attributes/:id
 * Delete a sub-attribute
 */
export const deleteSubAttribute = async (req, res) => {
  try {
    const subAttributeId = req.params.id;

    if (!subAttributeId) {
      return res.status(400).json({ error: "Sub-attribute ID is required" });
    }

    // Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(subAttributeId)) {
      return res.status(400).json({ error: "Invalid sub-attribute ID format" });
    }

    const subAttribute = await SubAttribute.findById(subAttributeId);

    if (!subAttribute) {
      return res.status(404).json({ error: "Sub-attribute not found" });
    }

    // Store parent info before deletion
    const parentAttributeId = subAttribute.parentAttribute.toString();
    const parentValue = subAttribute.parentValue;

    await SubAttribute.findByIdAndDelete(subAttributeId);

    // Update parent attribute's hasSubAttributes field
    // Wrap in try-catch to ensure it doesn't break the response if update fails
    try {
      await updateParentAttributeHasSubAttributes(parentAttributeId, parentValue);
    } catch (updateError) {
      console.error("Warning: Failed to update parent attribute hasSubAttributes, but sub-attribute was deleted:", updateError);
      // Continue - don't fail the request
    }

    return res.json({
      success: true,
      message: "Sub-attribute deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting sub-attribute:", err);
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid sub-attribute ID format" });
    }
    return res.status(500).json({ error: err.message || "Failed to delete sub-attribute" });
  }
};
