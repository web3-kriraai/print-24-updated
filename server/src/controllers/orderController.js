import BulkOrder from "../models/BulkOrder.js";
import Order from "../models/orderModal.js";
import Product from "../models/productModal.js";
import Department from "../models/departmentModal.js";
import { User } from "../models/User.js";
import sharp from "sharp";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import PricingService from "../services/pricing/PricingService.js";
import ModifierEngine from "../services/ModifierEngine.js";
import invoiceService from "../services/invoiceService.js";
// Email service temporarily disabled - uncomment when email configuration is ready
// import { sendAccountCreationEmail, sendOrderConfirmationEmail } from "../utils/emailService.js";

// Create a new order
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      productId,
      quantity,
      finish,
      shape,
      selectedOptions,
      pincode,
      address,
      mobileNumber,
      uploadedDesign,
      notes,
      promoCodes,  // NEW: Promo code support
      clientId,    // AGENT: Place order on behalf of client
    } = req.body;

    // ========== AGENT ORDER-ON-BEHALF ==========
    // If agent provides clientId, order is placed for the client using client's pricing
    let orderUserId = userId;
    let agentId = null;

    if (clientId) {
      // Verify agent has client_management feature and client is in their list
      const agentUser = await User.findById(userId);
      if (!agentUser) {
        return res.status(404).json({ error: "Agent user not found" });
      }

      const isMyClient = agentUser.clients?.some(
        (c) => c.toString() === clientId
      );

      if (!isMyClient) {
        return res.status(403).json({
          error: "This user is not in your client list. Add them first.",
        });
      }

      // Verify client exists
      const clientUser = await User.findById(clientId);
      if (!clientUser) {
        return res.status(404).json({ error: "Client user not found" });
      }

      orderUserId = clientId;  // Order belongs to the client
      agentId = userId;        // Track which agent placed it
      console.log(`🤝 Agent ${userId} placing order on behalf of client ${clientId}`);
    }

    // Validate required fields
    if (!productId || !quantity || !finish || !shape || !pincode || !address || !mobileNumber) {
      return res.status(400).json({
        error: "Missing required fields: productId, quantity, finish, shape, pincode, address, mobileNumber",
      });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Process uploaded design - convert base64 to Buffer and convert to CMYK format
    let processedDesign = null;
    if (uploadedDesign) {
      processedDesign = {};
      if (uploadedDesign.frontImage && uploadedDesign.frontImage.data) {
        try {
          // Handle both base64 string and data URL format
          let base64Data = uploadedDesign.frontImage.data;
          if (typeof base64Data !== 'string') {
            return res.status(400).json({ error: "Front image data must be a string." });
          }
          if (base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
          }
          // Validate base64 string
          if (!base64Data || base64Data.trim().length === 0) {
            return res.status(400).json({ error: "Front image data is empty." });
          }

          // Convert base64 to Buffer
          const imageBuffer = Buffer.from(base64Data, "base64");

          // Convert image to CMYK format using sharp
          const cmykBuffer = await sharp(imageBuffer)
            .toColourspace("cmyk")
            .jpeg({
              quality: 90,
              chromaSubsampling: '4:4:4'
            })
            .toBuffer();
          processedDesign.frontImage = {
            data: cmykBuffer,
            contentType: "image/jpeg", // CMYK images are stored as JPEG
            filename: (uploadedDesign.frontImage.filename || "front-design.png").replace(/\.(png|gif|webp)$/i, ".jpg"),
          };
        } catch (err) {
          console.error("Error processing front image:", err);
          console.error("Error details:", err.message);
          return res.status(400).json({
            error: "Invalid front image data format or conversion failed.",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
          });
        }
      }
      if (uploadedDesign.backImage && uploadedDesign.backImage.data) {
        try {
          // Handle both base64 string and data URL format
          let base64Data = uploadedDesign.backImage.data;
          if (typeof base64Data !== 'string') {
            console.warn("Back image data is not a string, skipping.");
          } else {
            if (base64Data.includes(',')) {
              base64Data = base64Data.split(',')[1];
            }
            if (base64Data && base64Data.trim().length > 0) {
              // Convert base64 to Buffer
              const imageBuffer = Buffer.from(base64Data, "base64");
              // Convert image to CMYK format using sharp
              const cmykBuffer = await sharp(imageBuffer)
                .toColourspace("cmyk")
                .jpeg({
                  quality: 90,
                  chromaSubsampling: '4:4:4'
                })
                .toBuffer();
              processedDesign.backImage = {
                data: cmykBuffer,
                contentType: "image/jpeg", // CMYK images are stored as JPEG
                filename: (uploadedDesign.backImage.filename || "back-design.png").replace(/\.(png|gif|webp)$/i, ".jpg"),
              };
            }
          }
        } catch (err) {
          console.error("Error processing back image:", err);
          // Back image is optional, so we'll just log the error and continue
          console.warn("Skipping back image due to error:", err.message);
        }
      }
    } else {
      return res.status(400).json({ error: "Uploaded design is required." });
    }

    // Generate unique order number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const orderNumber = `ORD-${timestamp}-${String(random).padStart(4, "0")}`;

    // DO NOT initialize department statuses at order creation
    // Department statuses will be created only after admin approval
    // Order status is "request" - waiting for admin approval
    let departmentStatuses = [];

    // Process selected options - enhance with description and image from product
    let enhancedSelectedOptions = [];
    if (selectedOptions && Array.isArray(selectedOptions)) {
      enhancedSelectedOptions = selectedOptions.map((opt) => {
        // Find matching option in product to get full details
        const productOption = product.options?.find(
          (pOpt) => pOpt._id?.toString() === opt.optionId || pOpt.name === opt.optionName
        );
        return {
          optionId: opt.optionId || null,
          optionName: opt.optionName || opt.name || "Option",
          priceAdd: opt.priceAdd || 0,
          description: opt.description || productOption?.description || null,
          image: opt.image || productOption?.image || null,
        };
      });
    }

    // Process selected dynamic attributes
    let processedDynamicAttributes = [];
    if (req.body.selectedDynamicAttributes && Array.isArray(req.body.selectedDynamicAttributes)) {
      // Process each attribute, including uploaded images
      for (const attr of req.body.selectedDynamicAttributes) {
        // Process uploaded images if any
        let processedUploadedImages = [];
        if (attr.uploadedImages && Array.isArray(attr.uploadedImages) && attr.uploadedImages.length > 0) {
          for (const img of attr.uploadedImages) {
            try {
              let base64Data = img.data;
              if (typeof base64Data === 'string') {
                if (base64Data.includes(',')) {
                  base64Data = base64Data.split(',')[1];
                }
                if (base64Data && base64Data.trim().length > 0) {
                  // Convert base64 to Buffer
                  const imageBuffer = Buffer.from(base64Data, "base64");
                  // Convert image to CMYK format using sharp (same as design images)
                  const cmykBuffer = await sharp(imageBuffer)
                    .toColourspace("cmyk")
                    .jpeg({
                      quality: 90,
                      chromaSubsampling: '4:4:4'
                    })
                    .toBuffer();
                  processedUploadedImages.push({
                    data: cmykBuffer,
                    contentType: "image/jpeg",
                    filename: (img.filename || "attribute-image.png").replace(/\.(png|gif|webp)$/i, ".jpg"),
                  });
                }
              }
            } catch (err) {
              console.error("Error processing attribute image:", err);
              // Continue with other images even if one fails
            }
          }
        }
        // Get the attribute type ID (support both formats)
        const attrTypeId = attr.attributeTypeId || attr.attributeType?._id || attr.attributeType || null;
        const attrValue = attr.attributeValue !== undefined ? attr.attributeValue : (attr.value !== undefined ? attr.value : null);
        const attrName = attr.attributeName || attr.attributeType?.attributeName || "Attribute";

        processedDynamicAttributes.push({
          // Support both ObjectId and String formats
          attributeType: attrTypeId,
          attributeTypeId: attrTypeId,
          attributeName: attrName,
          // Auto-generate pricingKey for pricing engine
          pricingKey: attr.pricingKey || `${attrName}_${attrValue}`,
          // Support both field names
          value: attrValue,
          attributeValue: attrValue,
          label: attr.label || attrValue?.toString() || null,
          priceMultiplier: attr.priceMultiplier || null,
          priceAdd: attr.priceAdd || 0,
          description: attr.description || null,
          image: attr.image || null,
          uploadedImages: processedUploadedImages.length > 0 ? processedUploadedImages : undefined,
        });
      }
    } else if (req.body.selectedDynamicAttributes && typeof req.body.selectedDynamicAttributes === 'object') {
      // Handle case where it's an object with attributeTypeId as keys
      // This is the format from the frontend where selectedDynamicAttributes is { [attributeTypeId]: value }
      // We need to get the product to match attribute types and get full details
      const productWithAttrs = await Product.findById(productId)
        .populate({
          path: "dynamicAttributes.attributeType",
          model: "AttributeType",
        })
        .lean();

      if (productWithAttrs && productWithAttrs.dynamicAttributes) {
        // Convert forEach to for...of to support async operations
        for (const attrTypeId of Object.keys(req.body.selectedDynamicAttributes)) {
          const value = req.body.selectedDynamicAttributes[attrTypeId];
          if (value !== null && value !== undefined && value !== "") {
            // Check if this is an object with uploadedImages (new format from frontend)
            const attrData = typeof value === 'object' && value !== null && !Array.isArray(value)
              ? value
              : { attributeValue: value };

            const actualValue = attrData.attributeValue !== undefined ? attrData.attributeValue : value;

            // Find the attribute in product
            const productAttr = productWithAttrs.dynamicAttributes.find(
              (attr) => attr.attributeType?._id?.toString() === attrTypeId
            );
            if (productAttr && productAttr.attributeType) {
              const attrType = productAttr.attributeType;
              const customValues = productAttr.customValues || [];
              const defaultValues = attrType.attributeValues || [];
              const allValues = customValues.length > 0 ? customValues : defaultValues;

              // Find the selected value details
              let selectedValueDetails = null;
              if (Array.isArray(actualValue)) {
                // Multiple selection
                selectedValueDetails = allValues.filter((av) => actualValue.includes(av.value));
              } else {
                // Single selection
                selectedValueDetails = allValues.find((av) => av.value === actualValue || av.value === actualValue.toString());
              }

              // Process uploaded images if any
              let processedUploadedImages = [];
              if (attrData.uploadedImages && Array.isArray(attrData.uploadedImages) && attrData.uploadedImages.length > 0) {
                for (const img of attrData.uploadedImages) {
                  try {
                    let base64Data = img.data;
                    if (typeof base64Data === 'string') {
                      if (base64Data.includes(',')) {
                        base64Data = base64Data.split(',')[1];
                      }
                      if (base64Data && base64Data.trim().length > 0) {
                        // Convert base64 to Buffer
                        const imageBuffer = Buffer.from(base64Data, "base64");
                        // Convert image to CMYK format using sharp (same as design images)
                        const cmykBuffer = await sharp(imageBuffer)
                          .toColourspace("cmyk")
                          .jpeg({
                            quality: 90,
                            chromaSubsampling: '4:4:4'
                          })
                          .toBuffer();
                        processedUploadedImages.push({
                          data: cmykBuffer,
                          contentType: "image/jpeg",
                          filename: (img.filename || "attribute-image.png").replace(/\.(png|gif|webp)$/i, ".jpg"),
                        });
                      }
                    }
                  } catch (err) {
                    console.error("Error processing attribute image:", err);
                    // Continue with other images even if one fails
                  }
                }
              }

              if (selectedValueDetails) {
                if (Array.isArray(selectedValueDetails)) {
                  // Multiple values selected
                  const labels = selectedValueDetails.map((sv) => sv.label || sv.value).join(", ");
                  const totalPriceMultiplier = selectedValueDetails.reduce((sum, sv) => sum + (sv.priceMultiplier || 0), 0);
                  processedDynamicAttributes.push({
                    attributeTypeId: attrTypeId,
                    attributeName: attrType.attributeName || "Attribute",
                    attributeValue: actualValue,
                    label: labels,
                    priceMultiplier: totalPriceMultiplier || null,
                    priceAdd: attrData.priceAdd || 0,
                    description: selectedValueDetails.map((sv) => sv.description).filter(Boolean).join("; ") || null,
                    image: selectedValueDetails[0]?.image || null,
                    uploadedImages: processedUploadedImages.length > 0 ? processedUploadedImages : undefined,
                  });
                } else {
                  // Single value selected
                  processedDynamicAttributes.push({
                    attributeTypeId: attrTypeId,
                    attributeName: attrType.attributeName || "Attribute",
                    attributeValue: actualValue,
                    label: selectedValueDetails.label || actualValue?.toString() || null,
                    priceMultiplier: selectedValueDetails.priceMultiplier || null,
                    priceAdd: attrData.priceAdd || 0,
                    description: selectedValueDetails.description || null,
                    image: selectedValueDetails.image || null,
                    uploadedImages: processedUploadedImages.length > 0 ? processedUploadedImages : undefined,
                  });
                }
              } else {
                // Value not found in predefined values, store as-is (for text/number inputs)
                processedDynamicAttributes.push({
                  attributeTypeId: attrTypeId,
                  attributeName: attrType.attributeName || "Attribute",
                  attributeValue: actualValue,
                  label: actualValue?.toString() || null,
                  priceMultiplier: null,
                  priceAdd: attrData.priceAdd || 0,
                  description: null,
                  image: null,
                  uploadedImages: processedUploadedImages.length > 0 ? processedUploadedImages : undefined,
                });
              }
            }
          }
        }
      }
    }

    // Calculate pricing using PricingService (NEW)
    // Use orderUserId for pricing - if agent placed on behalf, use client's pricing tier
    const pricingResult = await PricingService.resolvePrice({
      userId: orderUserId,
      productId,
      pincode,
      selectedDynamicAttributes: processedDynamicAttributes.map(attr => ({
        attributeType: attr.attributeTypeId,
        pricingKey: attr.pricingKey || `${attr.attributeName}_${attr.attributeValue}`,
        value: attr.attributeValue,
        attributeName: attr.attributeName,
      })),
      quantity: parseInt(quantity),
      promoCodes: promoCodes || [],
    });

    // Create order with immutable priceSnapshot
    const orderData = {
      user: orderUserId,
      placedByAgent: agentId || undefined,
      orderNumber: orderNumber,
      product: productId,
      quantity: parseInt(quantity),
      finish,
      shape,
      selectedOptions: enhancedSelectedOptions,
      selectedDynamicAttributes: processedDynamicAttributes,
      priceSnapshot: {
        basePrice: pricingResult.basePrice,
        unitPrice: pricingResult.basePrice,
        quantity: pricingResult.quantity,
        appliedModifiers: pricingResult.appliedModifiers,
        subtotal: pricingResult.subtotal,
        gstPercentage: pricingResult.gstPercentage,
        gstAmount: pricingResult.gstAmount,
        totalPayable: pricingResult.totalPayable,
        currency: pricingResult.currency,
        calculatedAt: pricingResult.calculatedAt,
      },
      pincode,
      address,
      mobileNumber,
      uploadedDesign: processedDesign,
      notes: notes || "",
      status: "REQUESTED",
      departmentStatuses: departmentStatuses,
      advancePaid: req.body.advancePaid ? parseFloat(req.body.advancePaid) : 0,
      paymentStatus: req.body.paymentStatus?.toUpperCase() || "PENDING",
      paymentGatewayInvoiceId: req.body.paymentGatewayInvoiceId || null,
      paperGSM: req.body.paperGSM || null,
      paperQuality: req.body.paperQuality || null,
      laminationType: req.body.laminationType || null,
      specialEffects: req.body.specialEffects || [],
    };

    const order = new Order(orderData);
    await order.save();

    // Create pricing calculation logs for audit trail
    if (pricingResult.appliedModifiers && pricingResult.appliedModifiers.length > 0) {
      try {
        const PricingCalculationLog = (await import("../models/PricingCalculationLogschema.js")).default;

        for (const modifier of pricingResult.appliedModifiers) {
          // Map the modifier source to valid scope enum
          const scopeMap = {
            'GLOBAL': 'GLOBAL',
            'ZONE': 'ZONE',
            'ZONE_BOOK': 'ZONE',
            'SEGMENT': 'SEGMENT',
            'PRODUCT': 'PRODUCT',
            'ATTRIBUTE': 'ATTRIBUTE',
            'PROMO_CODE': 'GLOBAL',
            'FIXED': 'GLOBAL',
          };
          const scope = scopeMap[modifier.source] || 'GLOBAL';

          await PricingCalculationLog.create({
            order: order._id,
            pricingKey: modifier.pricingKey || `${modifier.source}_${modifier.modifierType}`,
            modifier: modifier.modifierId || null,
            scope: scope,
            beforeAmount: modifier.beforeAmount || pricingResult.basePrice,
            afterAmount: modifier.afterAmount || pricingResult.subtotal,
            reason: modifier.reason || `${modifier.modifierType} modifier applied`,
            appliedAt: new Date(),
          });
        }
        console.log(`ðŸ“ Created ${pricingResult.appliedModifiers.length} pricing audit logs for order ${order.orderNumber}`);
      } catch (logError) {
        console.error("Failed to create pricing logs:", logError);
        // Don't fail the order creation if logging fails
      }
    }

    // FIX 4: Increment promo usage count (CRITICAL)
    const promoModifierIds = pricingResult.appliedModifiers
      .filter(m => m.source === "PROMO_CODE")
      .map(m => m.modifierId);

    if (promoModifierIds.length > 0) {
      await ModifierEngine.incrementUsage(promoModifierIds);
    }
    await order.populate({
      path: "product",
      select: "name image subcategory options discount description instructions attributes minFileWidth maxFileWidth minFileHeight maxFileHeight filters gstPercentage additionalDesignCharge productionSequence",
      populate: [
        { path: "subcategory", select: "name" },
        { path: "productionSequence", select: "name sequence" }
      ]
    });
    await order.populate("user", "name email");
    // Populate currentDepartment if it exists
    if (order.currentDepartment) {
      await order.populate("currentDepartment", "name sequence");
    }

    res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error("Create order error:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    if (error.name === 'ValidationError') {
      console.error("Validation errors:", error.errors);
      const validationDetails = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      console.error("Validation details:", validationDetails);
      return res.status(400).json({
        error: "Validation error",
        details: validationDetails
      });
    }
    if (error.name === 'MongoServerError' && error.code === 11000) {
      console.error("Duplicate key error:", error.keyValue);
      return res.status(400).json({
        error: "Duplicate order number. Please try again."
      });
    }
    if (error.name === 'CastError') {
      console.error("Cast error:", error.path, error.value);
      return res.status(400).json({
        error: `Invalid value for field: ${error.path}`,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    res.status(500).json({
      error: "Failed to create order.",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      errorType: error.name
    });
  }
};

// Create order with automatic account creation (for unauthenticated users)
export const createOrderWithAccount = async (req, res) => {
  try {
    const {
      // User information
      name,
      email,
      mobileNumber,
      // Order information
      productId,
      quantity,
      finish,
      shape,
      selectedOptions,
      selectedDynamicAttributes,
      pincode,
      address,
      uploadedDesign,
      notes,
      promoCodes,  // NEW: Promo code support
      // Payment information
      advancePaid,
      paymentStatus,
      paymentGatewayInvoiceId,
      // Legacy fields
      paperGSM,
      paperQuality,
      laminationType,
      specialEffects,
    } = req.body;

    // Validate required fields
    if (!name || !email || !mobileNumber) {
      return res.status(400).json({
        error: "Missing required user fields: name, email, mobileNumber",
      });
    }

    if (!productId || !quantity || !finish || !shape || !pincode || !address) {
      return res.status(400).json({
        error: "Missing required order fields: productId, quantity, finish, shape, pincode, address",
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    let isNewUser = false;
    let tempPassword = null;

    if (!user) {
      // Generate a random password
      tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + "!@#";
      // Hash password
      const hashed = await bcrypt.hash(tempPassword, 10);

      // Create new user
      user = await User.create({
        name,
        email,
        password: hashed,
        role: "user",
      });
      isNewUser = true;

      // Email service temporarily disabled - uncomment when email configuration is ready
      // await sendAccountCreationEmail(email, name, tempPassword);
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Process uploaded design - convert base64 to Buffer and convert to CMYK format
    let processedDesign = null;
    if (uploadedDesign) {
      processedDesign = {};
      if (uploadedDesign.frontImage && uploadedDesign.frontImage.data) {
        try {
          let base64Data = uploadedDesign.frontImage.data;
          if (typeof base64Data !== 'string') {
            return res.status(400).json({ error: "Front image data must be a string." });
          }
          if (base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
          }
          if (!base64Data || base64Data.trim().length === 0) {
            return res.status(400).json({ error: "Front image data is empty." });
          }
          const imageBuffer = Buffer.from(base64Data, "base64");
          const cmykBuffer = await sharp(imageBuffer)
            .toColourspace("cmyk")
            .jpeg({
              quality: 90,
              chromaSubsampling: '4:4:4'
            })
            .toBuffer();
          processedDesign.frontImage = {
            data: cmykBuffer,
            contentType: "image/jpeg",
            filename: (uploadedDesign.frontImage.filename || "front-design.png").replace(/\.(png|gif|webp)$/i, ".jpg"),
          };
        } catch (err) {
          console.error("Error processing front image:", err);
          return res.status(400).json({
            error: "Invalid front image data format or conversion failed.",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
          });
        }
      }
      if (uploadedDesign.backImage && uploadedDesign.backImage.data) {
        try {
          let base64Data = uploadedDesign.backImage.data;
          if (typeof base64Data !== 'string') {
            console.warn("Back image data is not a string, skipping.");
          } else {
            if (base64Data.includes(',')) {
              base64Data = base64Data.split(',')[1];
            }
            if (base64Data && base64Data.trim().length > 0) {
              const imageBuffer = Buffer.from(base64Data, "base64");
              const cmykBuffer = await sharp(imageBuffer)
                .toColourspace("cmyk")
                .jpeg({
                  quality: 90,
                  chromaSubsampling: '4:4:4'
                })
                .toBuffer();
              processedDesign.backImage = {
                data: cmykBuffer,
                contentType: "image/jpeg",
                filename: (uploadedDesign.backImage.filename || "back-design.png").replace(/\.(png|gif|webp)$/i, ".jpg"),
              };
            }
          }
        } catch (err) {
          console.warn("Skipping back image due to error:", err.message);
        }
      }
    } else {
      return res.status(400).json({ error: "Uploaded design is required." });
    }

    // Generate unique order number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const orderNumber = `ORD-${timestamp}-${String(random).padStart(4, "0")}`;

    // DO NOT initialize department statuses at order creation
    let departmentStatuses = [];

    // Process selected options - enhance with description and image from product
    let enhancedSelectedOptions = [];
    if (selectedOptions && Array.isArray(selectedOptions)) {
      enhancedSelectedOptions = selectedOptions.map((opt) => {
        const productOption = product.options?.find(
          (pOpt) => pOpt._id?.toString() === opt.optionId || pOpt.name === opt.optionName
        );
        return {
          optionId: opt.optionId || null,
          optionName: opt.optionName || opt.name || "Option",
          priceAdd: opt.priceAdd || 0,
          description: opt.description || productOption?.description || null,
          image: opt.image || productOption?.image || null,
        };
      });
    }

    // Process dynamic attributes
    let processedDynamicAttributes = [];
    if (selectedDynamicAttributes && Array.isArray(selectedDynamicAttributes)) {
      // Get product with dynamic attributes
      const productWithAttrs = await Product.findById(productId).populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType",
      });

      if (productWithAttrs && productWithAttrs.dynamicAttributes) {
        for (const attr of selectedDynamicAttributes) {
          const attrTypeId = attr.attributeTypeId;
          const value = attr.attributeValue;

          // Find the attribute type in product
          const productAttr = productWithAttrs.dynamicAttributes.find(
            (pa) => {
              const attrType = typeof pa.attributeType === 'object' ? pa.attributeType : null;
              return attrType?._id?.toString() === attrTypeId;
            }
          );

          if (productAttr) {
            const attrType = typeof productAttr.attributeType === 'object' ? productAttr.attributeType : null;
            if (attrType) {
              const customValues = productAttr.customValues || [];
              const defaultValues = attrType.attributeValues || [];
              const allValues = customValues.length > 0 ? customValues : defaultValues;

              // Find selected value details
              let selectedValueDetails = null;
              if (Array.isArray(value)) {
                selectedValueDetails = allValues.filter((av) => value.includes(av.value));
              } else {
                selectedValueDetails = allValues.find((av) => av.value === value || av.value === value.toString());
              }

              if (selectedValueDetails) {
                // Process uploaded images if any
                let processedUploadedImages = [];
                if (attr.uploadedImages && Array.isArray(attr.uploadedImages) && attr.uploadedImages.length > 0) {
                  for (const img of attr.uploadedImages) {
                    try {
                      let base64Data = img.data;
                      if (typeof base64Data === 'string') {
                        if (base64Data.includes(',')) {
                          base64Data = base64Data.split(',')[1];
                        }
                        if (base64Data && base64Data.trim().length > 0) {
                          // Convert base64 to Buffer
                          const imageBuffer = Buffer.from(base64Data, "base64");
                          // Convert image to CMYK format using sharp (same as design images)
                          const cmykBuffer = await sharp(imageBuffer)
                            .toColourspace("cmyk")
                            .jpeg({
                              quality: 90,
                              chromaSubsampling: '4:4:4'
                            })
                            .toBuffer();
                          processedUploadedImages.push({
                            data: cmykBuffer,
                            contentType: "image/jpeg",
                            filename: (img.filename || "attribute-image.png").replace(/\.(png|gif|webp)$/i, ".jpg"),
                          });
                        }
                      }
                    } catch (err) {
                      console.error("Error processing attribute image:", err);
                      // Continue with other images even if one fails
                    }
                  }
                }
                if (Array.isArray(selectedValueDetails)) {
                  const labels = selectedValueDetails.map((sv) => sv.label || sv.value).join(", ");
                  const totalPriceMultiplier = selectedValueDetails.reduce((sum, sv) => sum + (sv.priceMultiplier || 0), 0);
                  processedDynamicAttributes.push({
                    attributeTypeId: attrTypeId,
                    attributeName: attrType.attributeName || "Attribute",
                    attributeValue: value,
                    label: labels,
                    priceMultiplier: totalPriceMultiplier || undefined,
                    priceAdd: attr.priceAdd || 0,
                    description: selectedValueDetails.map((sv) => sv.description).filter(Boolean).join("; ") || undefined,
                    image: selectedValueDetails[0]?.image || undefined,
                    uploadedImages: processedUploadedImages.length > 0 ? processedUploadedImages : undefined,
                  });
                } else {
                  processedDynamicAttributes.push({
                    attributeTypeId: attrTypeId,
                    attributeName: attrType.attributeName || "Attribute",
                    attributeValue: value,
                    label: selectedValueDetails.label || value?.toString() || "",
                    priceMultiplier: selectedValueDetails.priceMultiplier || undefined,
                    priceAdd: attr.priceAdd || 0,
                    description: selectedValueDetails.description || undefined,
                    image: selectedValueDetails.image || undefined,
                    uploadedImages: processedUploadedImages.length > 0 ? processedUploadedImages : undefined,
                  });
                }
              } else {
                processedDynamicAttributes.push({
                  attributeTypeId: attrTypeId,
                  attributeName: attrType.attributeName || "Attribute",
                  attributeValue: value,
                  label: value?.toString() || null,
                  priceMultiplier: null,
                  priceAdd: 0,
                  description: null,
                  image: null,
                });
              }
            }
          }
        }
      }
    }

    // Calculate pricing using PricingService (NEW)
    const pricingResult = await PricingService.resolvePrice({
      userId: user._id.toString(),
      productId,
      pincode,
      selectedDynamicAttributes: processedDynamicAttributes.map(attr => ({
        attributeType: attr.attributeTypeId,
        pricingKey: attr.pricingKey || `${attr.attributeName}_${attr.attributeValue}`,
        value: attr.attributeValue,
        attributeName: attr.attributeName,
      })),
      quantity: parseInt(quantity),
      promoCodes: promoCodes || [],
    });

    // Create order with immutable priceSnapshot
    const orderData = {
      user: user._id,
      orderNumber: orderNumber,
      product: productId,
      quantity: parseInt(quantity),
      finish,
      shape,
      selectedOptions: enhancedSelectedOptions,
      selectedDynamicAttributes: processedDynamicAttributes,
      priceSnapshot: {
        basePrice: pricingResult.basePrice,
        unitPrice: pricingResult.basePrice,
        quantity: pricingResult.quantity,
        appliedModifiers: pricingResult.appliedModifiers,
        subtotal: pricingResult.subtotal,
        gstPercentage: pricingResult.gstPercentage,
        gstAmount: pricingResult.gstAmount,
        totalPayable: pricingResult.totalPayable,
        currency: pricingResult.currency,
        calculatedAt: pricingResult.calculatedAt,
      },
      pincode,
      address,
      mobileNumber,
      uploadedDesign: processedDesign,
      notes: notes || "",
      status: "REQUESTED",
      departmentStatuses: departmentStatuses,
      advancePaid: advancePaid ? parseFloat(advancePaid) : 0,
      paymentStatus: paymentStatus?.toUpperCase() || "PENDING",
      paymentGatewayInvoiceId: paymentGatewayInvoiceId || null,
      paperGSM: paperGSM || null,
      paperQuality: paperQuality || null,
      laminationType: laminationType || null,
      specialEffects: specialEffects || [],
    };

    const order = new Order(orderData);
    await order.save();

    // Create pricing calculation logs for audit trail
    if (pricingResult.appliedModifiers && pricingResult.appliedModifiers.length > 0) {
      try {
        const PricingCalculationLog = (await import("../models/PricingCalculationLogschema.js")).default;

        for (const modifier of pricingResult.appliedModifiers) {
          // Map the modifier source to valid scope enum
          const scopeMap = {
            'GLOBAL': 'GLOBAL',
            'ZONE': 'ZONE',
            'ZONE_BOOK': 'ZONE',
            'SEGMENT': 'SEGMENT',
            'PRODUCT': 'PRODUCT',
            'ATTRIBUTE': 'ATTRIBUTE',
            'PROMO_CODE': 'GLOBAL',
            'FIXED': 'GLOBAL',
          };
          const scope = scopeMap[modifier.source] || 'GLOBAL';

          await PricingCalculationLog.create({
            order: order._id,
            pricingKey: modifier.pricingKey || `${modifier.source}_${modifier.modifierType}`,
            modifier: modifier.modifierId || null,
            scope: scope,
            beforeAmount: modifier.beforeAmount || pricingResult.basePrice,
            afterAmount: modifier.afterAmount || pricingResult.subtotal,
            reason: modifier.reason || `${modifier.modifierType} modifier applied`,
            appliedAt: new Date(),
          });
        }
        console.log(`ðŸ“ Created ${pricingResult.appliedModifiers.length} pricing audit logs for order ${order.orderNumber}`);
      } catch (logError) {
        console.error("Failed to create pricing logs:", logError);
        // Don't fail the order creation if logging fails
      }
    }

    // FIX 4: Increment promo usage count (CRITICAL)
    const promoModifierIds = pricingResult.appliedModifiers
      .filter(m => m.source === "PROMO_CODE")
      .map(m => m.modifierId);

    if (promoModifierIds.length > 0) {
      await ModifierEngine.incrementUsage(promoModifierIds);
    }

    await order.populate({
      path: "product",
      select: "name image subcategory options discount description instructions attributes minFileWidth maxFileWidth minFileHeight maxFileHeight filters gstPercentage additionalDesignCharge productionSequence",
      populate: [
        { path: "subcategory", select: "name" },
        { path: "productionSequence", select: "name sequence" }
      ]
    });
    // Populate currentDepartment if it exists
    if (order.currentDepartment) {
      await order.populate("currentDepartment", "name sequence");
    }

    // Email service temporarily disabled - uncomment when email configuration is ready
    // await sendOrderConfirmationEmail(
    //   email,
    //   name,
    //   orderNumber,
    //   {
    //     productName: typeof order.product === 'object' ? order.product.name : 'N/A',
    //     quantity: order.quantity,
    //     totalPrice: order.totalPrice,
    //     status: order.status,
    //   }
    // );

    // Create JWT token for the user
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Order created successfully",
      order,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
      isNewUser,
      tempPassword: isNewUser ? tempPassword : undefined, // Only send temp password for new users
    });
  } catch (error) {
    console.error("Create order with account error:", error);
    if (error.name === 'ValidationError') {
      const validationDetails = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      return res.status(400).json({
        error: "Validation error",
        details: validationDetails
      });
    }
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return res.status(400).json({
        error: "Email already registered or duplicate order number. Please try again."
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: `Invalid value for field: ${error.path}`,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    res.status(500).json({
      error: "Failed to create order.",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      errorType: error.name
    });
  }
};

// Get single order by ID
export const getSingleOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    // Validate orderId is a valid ObjectId
    if (!orderId || !/^[0-9a-fA-F]{24}$/.test(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format." });
    }

    // Find order and verify it belongs to the user (unless admin) - Optimized with lean()
    let order = await Order.findById(orderId)
      .populate({
        path: "product",
        select: "name image basePrice subcategory options discount description instructions attributes minFileWidth maxFileWidth minFileHeight maxFileHeight filters gstPercentage additionalDesignCharge maxFileSizeMB",
        populate: {
          path: "subcategory",
          select: "name image",
          populate: {
            path: "category",
            select: "name"
          }
        }
      })
      .populate("user", "name email")
      .populate({
        path: "currentDepartment",
        select: "name sequence",
      })
      // designerSessionId is valid if using Designer Service
      .populate({
        path: "designerSessionId",
        select: "designerId status",
      })
      .lean(); // Use lean() for faster queries - returns plain JavaScript objects

    if (!order) {
      // Fallback: Check if it's a BulkOrder
      const bulkOrder = await BulkOrder.findById(orderId)
        .populate({
          path: "product",
          select: "name image basePrice subcategory options attributes filters gstPercentage additionalDesignCharge maxFileSizeMB",
          populate: {
            path: "subcategory",
            select: "name image",
            populate: {
              path: "category",
              select: "name"
            }
          }
        })
        .populate("user", "name email")
        .lean();

      if (bulkOrder) {
        // Map BulkOrder to Order-like structure for frontend compatibility
        const statusMapping = {
          'UPLOADED': 'request',
          'VALIDATING': 'processing',
          'PROCESSING': 'processing',
          'SPLIT_COMPLETE': 'processing',
          'ORDER_CREATED': 'completed',
          'FAILED': 'rejected',
          'CANCELLED': 'cancelled'
        };

        order = {
          ...bulkOrder,
          quantity: bulkOrder.totalCopies,
          totalPrice: bulkOrder.price?.totalPrice || 0,
          status: statusMapping[bulkOrder.status] || 'request',
          isBulkParent: true,
          priceSnapshot: {
            unitPrice: bulkOrder.price?.unitPrice || 0,
            quantity: bulkOrder.totalCopies,
            subtotal: bulkOrder.price?.netAmount || 0,
            gstPercentage: bulkOrder.product?.gstPercentage || 18,
            gstAmount: bulkOrder.price?.gstAmount || 0,
            totalPayable: bulkOrder.price?.totalPrice || 0,
            currency: bulkOrder.price?.currency || 'INR',
            calculatedAt: bulkOrder.createdAt
          }
        };

        // Map design file
        if (bulkOrder.compositeFile?.url) {
          order.uploadedDesign = {
            frontImage: {
              data: bulkOrder.compositeFile.url,
              filename: bulkOrder.compositeFile.filename || 'composite-design.pdf'
            }
          };
        }
      }
    }

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if user owns the order, is admin, or is an employee
    const userRole = req.user.role;
    const orderUserId = typeof order.user === 'object' ? order.user._id.toString() : order.user.toString();
    if (orderUserId !== userId && userRole !== "admin" && userRole !== "emp") {
      return res.status(403).json({ error: "Access denied. This order does not belong to you." });
    }

    // Debug: Log selectedOptions and selectedDynamicAttributes to verify they're included
    if (process.env.NODE_ENV === 'development') {
      console.log('Order selectedOptions:', JSON.stringify(order.selectedOptions, null, 2));
      console.log('Order selectedDynamicAttributes:', JSON.stringify(order.selectedDynamicAttributes, null, 2));
    }

    // Convert uploaded design buffers to base64 for frontend
    // Since we're using lean(), order is already a plain object
    if (order.uploadedDesign?.frontImage?.data && !order.uploadedDesign.frontImage.data.startsWith('http') && !order.uploadedDesign.frontImage.data.startsWith('data:')) {
      const buffer = Buffer.isBuffer(order.uploadedDesign.frontImage.data)
        ? order.uploadedDesign.frontImage.data
        : Buffer.from(order.uploadedDesign.frontImage.data);
      order.uploadedDesign.frontImage.data = `data:${order.uploadedDesign.frontImage.contentType || 'image/png'};base64,${buffer.toString("base64")}`;
    }
    if (order.uploadedDesign?.backImage?.data && !order.uploadedDesign.backImage.data.startsWith('http') && !order.uploadedDesign.backImage.data.startsWith('data:')) {
      const buffer = Buffer.isBuffer(order.uploadedDesign.backImage.data)
        ? order.uploadedDesign.backImage.data
        : Buffer.from(order.uploadedDesign.backImage.data);
      order.uploadedDesign.backImage.data = `data:${order.uploadedDesign.backImage.contentType || 'image/png'};base64,${buffer.toString("base64")}`;
    }

    // Fetch child orders if this is a bulk parent
    const childOrders = await Order.find({
      $or: [
        { parentOrderId: order._id },
        { bulkParentOrderId: order._id },
        { _id: { $in: order.childOrderIds || [] } }
      ]
    })
      .select('orderNumber status paymentStatus quantity product priceSnapshot')
      .sort({ designSequence: 1 })
      .lean();

    if (childOrders.length > 0) {
      order.childOrders = childOrders;
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("Get single order error:", error);
    res.status(500).json({ error: "Failed to fetch order details." });
  }
};

// Get user's orders - Supporting filter by parentOrderId
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    const parentId = req.query.parentOrderId || req.query.parent; // Support both
    const onlyParents = req.query.onlyParents === 'true';
    const onlyChildren = req.query.onlyChildren === 'true';

    const query = { user: userId };

    // If filtering by parent, strictly match children; otherwise exclude children by default? 
    // Actually, usually MyOrders shows all. But if we want to see children of a specific order, we filter.
    if (parentId) {
      query.$or = [
        { parentOrderId: parentId },
        { bulkParentOrderId: parentId }
      ];
    } else if (onlyParents) {
      // Only show parent orders (no parentOrderId or bulkParentOrderId)
      query.parentOrderId = { $exists: false };
      query.bulkParentOrderId = { $exists: false };
    } else if (onlyChildren) {
      // Only show child orders (has parentOrderId or bulkParentOrderId)
      query.$or = [
        { parentOrderId: { $exists: true } },
        { bulkParentOrderId: { $exists: true } }
      ];
    }

    const orders = await Order.find(query)
      .select("-uploadedDesign -notes -adminNotes -designTimeline -productionTimeline -courierTimeline -productionDetails -designOption -designerAssigned -designFileSentAt -customerResponse -fileUploadedAt -fileStatus -fileRejectionReason -productionStartedAt -movedToPackingAt -packedAt -packedBy -numberOfBoxes -movedToDispatchAt -handedOverToCourierAt -invoiceNumber -invoiceGeneratedAt -invoiceUrl -courierPartner -trackingId -dispatchedAt -courierStatus -deliveredAt -courierTrackingUrl +payment_details +priceSnapshot +totalPrice +paymentStatus +advancePaid") // Explicitly include price fields 
      .populate({
        path: "product",
        select: "name image basePrice subcategory gstPercentage",
        populate: {
          path: "subcategory",
          select: "name image",
          populate: {
            path: "category",
            select: "name"
          }
        }
      })
      .populate({
        path: "currentDepartment",
        select: "name sequence",
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    res.status(200).json({ orders }); // Wrap in object to match MyOrders.tsx expectation
  } catch (error) {
    console.error("Get my orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders." });
  }
};

// Get all orders (Admin only)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: "product",
        select: "name image basePrice subcategory options discount instructions attributes minFileWidth maxFileWidth minFileHeight maxFileHeight filters gstPercentage additionalDesignCharge productionSequence",
        populate: [
          { path: "subcategory", select: "name" },
          { path: "productionSequence", select: "name sequence _id" }
        ]
      })
      .populate("user", "name email")
      .populate({
        path: "currentDepartment",
        select: "name sequence",
      })
      .sort({ createdAt: -1 });

    // Convert uploaded design buffers to base64 for frontend
    const ordersWithImages = orders.map((order) => {
      const orderObj = order.toObject();
      if (order.uploadedDesign?.frontImage?.data) {
        orderObj.uploadedDesign.frontImage.data = `data:${order.uploadedDesign.frontImage.contentType};base64,${order.uploadedDesign.frontImage.data.toString("base64")}`;
      }
      if (order.uploadedDesign?.backImage?.data) {
        orderObj.uploadedDesign.backImage.data = `data:${order.uploadedDesign.backImage.contentType};base64,${order.uploadedDesign.backImage.data.toString("base64")}`;
      }

      return orderObj;
    });

    res.status(200).json(ordersWithImages);
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders." });
  }
};

// Update order status (Admin only)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, deliveryDate, adminNotes } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Validate status
    // Validate status
    // FIX: Added "DELIVERED" and other strict schema statuses
    const validStatuses = [
      "REQUESTED", "DESIGN", "APPROVED", "PRODUCTION", "QC", "PACKED", "DISPATCHED", "DELIVERED", "CANCELLED", "REJECTED", // Schema statuses (Uppercase)
      "request", "production_ready", "approved", "processing", "completed", "cancelled", "rejected", "delivered" // Legacy/Controller statuses (Lowercase)
    ];

    if (status) {
      // Check case-insensitive
      const statusUpper = status.toUpperCase();
      const isValid = validStatuses.some(s => s.toUpperCase() === statusUpper);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid status" });
      }
    }

    // Check for special action: start_production
    const { action } = req.body;
    if (action === "start_production") {
      if (order.status !== "production_ready" && order.status !== "PRODUCTION") {
        return res.status(400).json({ error: `Cannot start production. Order must be in "production_ready" status.` });
      }
      // Set status to approved and send to first department
      order.status = "APPROVED";
      status = "APPROVED"; // Set for the logic below
    }

    // Update order
    const previousStatus = order.status;

    // Normalize status to uppercase if it matches schema enum
    let newStatus = status;
    const schemaStatuses = ["REQUESTED", "DESIGN", "APPROVED", "PRODUCTION", "QC", "PACKED", "DISPATCHED", "DELIVERED", "CANCELLED", "REJECTED"];
    if (status && schemaStatuses.includes(status.toUpperCase())) {
      newStatus = status.toUpperCase();
    }

    if (newStatus) order.status = newStatus;

    // FIX: Map 'deliveryDate' to 'actualDeliveryDate' and auto-set on DELIVERED
    if (deliveryDate) {
      // If deliveryDate is provided, use it for actualDeliveryDate
      order.actualDeliveryDate = new Date(deliveryDate);
    } else if (
      (newStatus === 'DELIVERED' || newStatus === 'completed') &&
      !order.actualDeliveryDate
    ) {
      // Auto-set actualDeliveryDate if not provided and status is valid
      order.actualDeliveryDate = new Date();
    }
    if (adminNotes !== undefined) order.adminNotes = adminNotes;

    // If admin approves order (request -> approved) or starts production (production_ready -> approved), send to first department
    if ((previousStatus === "request" && (status === "approved" || status === "processing")) ||
      (previousStatus === "production_ready" && status === "approved") ||
      action === "start_production") {
      // Set status to "approved" (not "processing" yet - processing starts when first dept starts)
      if (status === "processing") {
        order.status = "approved";
      } else if (action === "start_production") {
        order.status = "approved";
      }
      // Get product to find production sequence - handle both populated and unpopulated cases
      const productId = order.product._id || order.product;
      const product = await Product.findById(productId).populate("productionSequence");
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Get departments in sequence order - optimized single query
      let departmentsToUse = [];
      if (product.productionSequence && product.productionSequence.length > 0) {
        const deptIds = product.productionSequence.map(dept => typeof dept === 'object' ? dept._id : dept);
        const departments = await Department.find({
          _id: { $in: deptIds },
          isEnabled: true
        });
        // Create a map for O(1) lookup instead of O(n) find
        const deptMap = new Map(departments.map(d => [d._id.toString(), d]));
        departmentsToUse = deptIds
          .map(id => {
            const idStr = typeof id === 'object' ? id.toString() : id?.toString();
            return idStr ? deptMap.get(idStr) : null;
          })
          .filter(d => d !== null && d !== undefined);
      } else {
        departmentsToUse = await Department.find({ isEnabled: true }).sort({ name: 1 });
      }

      // Send request to first department (status: "pending")
      if (departmentsToUse.length > 0) {
        const firstDept = departmentsToUse[0];
        const now = new Date();
        // Initialize departmentStatuses array if it doesn't exist
        if (!order.departmentStatuses) {
          order.departmentStatuses = [];
        }

        // Check if department status already exists
        let deptStatusIndex = order.departmentStatuses.findIndex(
          (ds) => {
            const deptId = typeof ds.department === 'object' ? ds.department._id?.toString() : ds.department?.toString();
            return deptId === firstDept._id.toString();
          }
        );

        if (deptStatusIndex === -1) {
          // Create new department status entry
          order.departmentStatuses.push({
            department: firstDept._id,
            status: "pending", // Request sent, waiting for department to start
            whenAssigned: now, // Timestamp when assigned to this department
            startedAt: null,
            pausedAt: null,
            completedAt: null,
            stoppedAt: null,
            operator: null,
            notes: "",
          });
          deptStatusIndex = order.departmentStatuses.length - 1;
        } else {
          // Update existing department status
          const existingStatus = order.departmentStatuses[deptStatusIndex];
          existingStatus.status = "pending";
          if (!existingStatus.whenAssigned) {
            existingStatus.whenAssigned = now;
          }
        }

        // Mark the array as modified for Mongoose
        order.markModified('departmentStatuses');

        // Set current department to first department
        order.currentDepartment = firstDept._id;
        order.currentDepartmentIndex = 0;

        // Add to production timeline
        if (!order.productionTimeline) {
          order.productionTimeline = [];
        }
        order.productionTimeline.push({
          department: firstDept._id,
          action: "requested",
          timestamp: now,
          operator: req.user.id,
          notes: "Request sent to department by admin approval",
        });

        // Mark timeline as modified
        order.markModified('productionTimeline');
      }
    }

    // Mark nested arrays as modified for Mongoose to detect changes
    if (order.departmentStatuses && order.departmentStatuses.length > 0) {
      order.markModified('departmentStatuses');
    }
    if (order.productionTimeline && order.productionTimeline.length > 0) {
      order.markModified('productionTimeline');
    }

    // Save the order
    await order.save();

    await order.populate({
      path: "product",
      select: "name image basePrice subcategory options discount description instructions attributes minFileWidth maxFileWidth minFileHeight maxFileHeight filters gstPercentage additionalDesignCharge productionSequence",
      populate: [
        { path: "subcategory", select: "name" },
        { path: "productionSequence", select: "name sequence" }
      ]
    });
    await order.populate("user", "name email");
    // Populate currentDepartment if it exists
    if (order.currentDepartment) {
      await order.populate("currentDepartment", "name sequence");
    }

    // Convert uploaded design buffers to base64
    const orderObj = order.toObject();
    if (order.uploadedDesign?.frontImage?.data) {
      orderObj.uploadedDesign.frontImage.data = `data:${order.uploadedDesign.frontImage.contentType};base64,${order.uploadedDesign.frontImage.data.toString("base64")}`;
    }
    if (order.uploadedDesign?.backImage?.data) {
      orderObj.uploadedDesign.backImage.data = `data:${order.uploadedDesign.backImage.contentType};base64,${order.uploadedDesign.backImage.data.toString("base64")}`;
    }

    res.status(200).json({
      message: "Order updated successfully",
      order: orderObj,
    });
  } catch (error) {
    console.error("Update order error:", error);
    res.status(500).json({ error: "Failed to update order." });
  }
};

// Cancel order (User)
export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Only allow cancellation if order is in request or processing status
    if (order.status === "completed" || order.status === "cancelled" || order.status === "rejected") {
      return res.status(400).json({
        error: `Cannot cancel order with status: ${order.status}`,
      });
    }

    order.status = "cancelled";
    await order.save();

    res.status(200).json({
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ error: "Failed to cancel order." });
  }
};

/**
 * Generate PDF invoice for an order
 */
export const generateInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId; // Changed from req.params.id to match route

    // Fetch order with populated fields
    const order = await Order.findById(orderId)
      .populate('product')
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Optional: Check if user has access to this order
    // if (req.user && req.user.id !== order.user._id.toString() && req.user.role !== 'admin') {
    //   return res.status(403).json({ error: 'Unauthorized access to this order' });
    // }

    // Generate PDF
    const pdfDoc = invoiceService.generateInvoice(order);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);

    // Pipe the PDF document to response
    pdfDoc.pipe(res);

  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
};

// ===================================
// ENHANCED ORDER MANAGEMENT FUNCTIONS
// Added: 2026-02-05
// ===================================

/**
 * Get Orders with Advanced Filtering (Enhanced getAllOrders)
 * Supports: search, status filters, payment filters, date range, amount range, etc.
 */
export const getOrdersWithFilters = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      paymentStatus = '',
      startDate = '',
      endDate = '',
      minAmount = 0,
      maxAmount = 0,
      deliveryStatus = '',
      hasComplaint = '',
      activeComplaint = '',
      customerType = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build filter query
    const filter = {};

    // Search filter (order number, customer name, email, product name)
    // Note: For user fields, we need to do a separate query first
    let userIds = [];
    if (search) {
      // First, find users matching the search
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { mobileNumber: { $regex: search, $options: 'i' } },
        ],
      }).select('_id').lean();

      userIds = users.map(u => u._id);

      // Then filter orders
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { user: { $in: userIds } },
      ];
    }

    // Status filter (multiple)
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      filter.status = { $in: statuses };
    }

    // Payment status filter (multiple)
    if (paymentStatus) {
      const paymentStatuses = paymentStatus.split(',').map(s => s.trim());
      filter.paymentStatus = { $in: paymentStatuses };
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day
        filter.createdAt.$lte = end;
      }
    }

    // Amount range filter
    if (minAmount > 0 || maxAmount > 0) {
      filter['priceSnapshot.totalPayable'] = {};
      if (minAmount > 0) filter['priceSnapshot.totalPayable'].$gte = Number(minAmount);
      if (maxAmount > 0) filter['priceSnapshot.totalPayable'].$lte = Number(maxAmount);
    }

    // Delivery status filter (multiple)
    if (deliveryStatus) {
      const deliveryStatuses = deliveryStatus.split(',').map(s => s.trim());
      filter.deliveryStatus = { $in: deliveryStatuses };
    }

    // Customer type filter
    if (customerType) {
      const types = customerType.split(',').map(t => t.trim());
      // Need to query users first
      const usersOfType = await User.find({ role: { $in: types } }).select('_id').lean();
      const typeUserIds = usersOfType.map(u => u._id);

      if (filter.user) {
        // Merge with existing user filter
        filter.user.$in = filter.user.$in.filter(id => typeUserIds.some(tId => tId.toString() === id.toString()));
      } else {
        filter.user = { $in: typeUserIds };
      }
    }

    // Build populate and projection
    const orders = await Order.find(filter)
      .populate({
        path: 'product',
        select: 'name image',
      })
      .populate({
        path: 'user',
        select: 'name email mobileNumber role',
      })
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    // If hasComplaint or activeComplaint filter is set, fetch complaints
    let filteredOrders = orders;
    if (hasComplaint === 'true' || activeComplaint === 'true') {
      const Complaint = (await import('../models/ComplaintSchema.js')).default;
      const orderIds = orders.map(o => o._id);
      const complaints = await Complaint.find({ order: { $in: orderIds } })
        .select('order status')
        .lean();

      const complaintsMap = {};
      complaints.forEach(c => {
        complaintsMap[c.order.toString()] = c;
      });

      filteredOrders = orders.filter(order => {
        const complaint = complaintsMap[order._id.toString()];
        if (hasComplaint === 'true' && !complaint) return false;
        if (activeComplaint === 'true') {
          if (!complaint) return false;
          const activeStatuses = ['REGISTERED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'];
          if (!activeStatuses.includes(complaint.status)) return false;
        }
        // Attach complaint to order
        if (complaint) {
          order.complaint = complaint;
        }
        return true;
      });
    }

    // Get total count
    const total = await Order.countDocuments(filter);

    res.status(200).json({
      orders: filteredOrders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get orders with filters error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

/**
 * Get Order Statistics
 */
export const getOrderStats = async (req, res) => {
  try {
    // Total orders - EXCLUDE child orders
    const totalOrders = await Order.countDocuments({
      parentOrderId: { $exists: false },
      bulkParentOrderId: { $exists: false },
    });

    // Pending payment - EXCLUDE child orders
    const pendingPayment = await Order.aggregate([
      {
        $match: {
          paymentStatus: { $in: ['PENDING', 'PARTIAL'] },
          parentOrderId: { $exists: false },
          bulkParentOrderId: { $exists: false },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: {
            $sum: {
              $ifNull: ['$payment_details.amount_paid', '$priceSnapshot.totalPayable'],
            },
          },
        },
      },
    ]);

    // Active complaints
    let activeComplaints = 0;
    try {
      const Complaint = (await import('../models/complaintModal.js')).default;
      const complaints = await Complaint.find({
        status: { $in: ['REGISTERED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] },
      });
      activeComplaints = complaints.length;
    } catch (err) {
      console.log('Complaint model not available, skipping complaint stats');
    }

    // Today's revenue - EXCLUDE child orders to avoid double-counting
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today },
          paymentStatus: 'COMPLETED',
          // Exclude child orders - only count parent/standalone orders
          parentOrderId: { $exists: false },
          bulkParentOrderId: { $exists: false },
        },
      },
      {
        $group: {
          _id: null,
          // Use payment_details.amount_paid as primary source, fallback to priceSnapshot.totalPayable
          total: {
            $sum: {
              $ifNull: ['$payment_details.amount_paid', '$priceSnapshot.totalPayable'],
            },
          },
        },
      },
    ]);

    // Average processing time (delivered orders)
    const deliveredOrders = await Order.find({
      status: 'DELIVERED',
      actualDeliveryDate: { $exists: true },
    })
      .select('createdAt actualDeliveryDate')
      .lean();

    let avgProcessingTime = 0;
    if (deliveredOrders.length > 0) {
      const totalDays = deliveredOrders.reduce((sum, order) => {
        const days = Math.floor(
          (new Date(order.actualDeliveryDate) - new Date(order.createdAt)) /
          (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0);
      avgProcessingTime = Math.round(totalDays / deliveredOrders.length * 10) / 10;
    }

    res.status(200).json({
      totalOrders,
      pendingPayment: {
        count: pendingPayment[0]?.count || 0,
        amount: pendingPayment[0]?.amount || 0,
      },
      activeComplaints,
      todayRevenue: todayRevenue[0]?.total || 0,
      avgProcessingTime,
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

/**
 * Bulk Update Orders
 */
export const bulkUpdateOrders = async (req, res) => {
  try {
    const { orderIds, action, payload } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Invalid order IDs' });
    }

    let updateData = {};

    switch (action) {
      case 'UPDATE_STATUS':
        if (!payload.status) {
          return res.status(400).json({ error: 'Status is required' });
        }
        updateData.status = payload.status;
        // Auto-set actualDeliveryDate if status is DELIVERED
        if (payload.status === 'DELIVERED') {
          updateData.actualDeliveryDate = new Date();
        }
        break;

      case 'UPDATE_PAYMENT':
        if (!payload.paymentStatus) {
          return res.status(400).json({ error: 'Payment status is required' });
        }
        updateData.paymentStatus = payload.paymentStatus;
        break;

      case 'ASSIGN_DEPARTMENT':
        if (!payload.departmentId) {
          return res.status(400).json({ error: 'Department ID is required' });
        }
        updateData.currentDepartment = payload.departmentId;
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    // Update all orders
    const result = await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: updateData }
    );

    res.status(200).json({
      message: `Successfully updated ${result.modifiedCount} orders`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to bulk update orders' });
  }
};

/**
 * Bulk Delete Orders
 */
export const bulkDeleteOrders = async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Invalid order IDs' });
    }

    // Delete orders
    const result = await Order.deleteMany({ _id: { $in: orderIds } });

    res.status(200).json({
      message: `Successfully deleted ${result.deletedCount} orders`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to bulk delete orders' });
  }
};

/**
 * Export Orders (CSV)
 */
export const exportOrders = async (req, res) => {
  try {
    const { orderIds } = req.body;

    let query = {};
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      query._id = { $in: orderIds };
    }

    const orders = await Order.find(query)
      .populate('product', 'name')
      .populate('user', 'name email')
      .lean();

    // Create CSV data
    const csvHeaders = [
      'Order Number',
      'Customer Name',
      'Customer Email',
      'Product',
      'Quantity',
      'Amount',
      'Status',
      'Payment Status',
      'Created Date',
    ];

    const csvRows = orders.map(order => [
      order.orderNumber,
      order.user?.name || '',
      order.user?.email || '',
      order.product?.name || '',
      order.quantity,
      order.priceSnapshot?.totalPayable || 0,
      order.status,
      order.paymentStatus,
      new Date(order.createdAt).toLocaleDateString('en-IN'),
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=orders_export_${new Date().toISOString().split('T')[0]}.csv`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export orders error:', error);
    res.status(500).json({ error: 'Failed to export orders' });
  }
};


/**
 * Get Filter Options - Dynamic filter values from model enums and database
 * @route GET /api/admin/orders/filter-options
 */
export const getFilterOptions = async (req, res) => {
  try {
    const orderStatusEnum = Order.schema.path('status').enumValues;
    const paymentStatusEnum = Order.schema.path('paymentStatus').enumValues;

    let customerTypes = [
      { value: 'retail', label: 'Retail' },
      { value: 'wholesale', label: 'Wholesale' },
      { value: 'corporate', label: 'Corporate' }
    ];

    try {
      const UserSegment = (await import('../models/UserSegment.js')).default;
      const segments = await UserSegment.find({}).select('segmentCode name').lean();
      if (segments && segments.length > 0) {
        customerTypes = segments.map(seg => ({
          value: seg.segmentCode.toLowerCase(),
          label: seg.name
        }));
      }
    } catch (segError) {
      console.log('[Filter Options] Using default customer types - segments not available');
    }

    res.status(200).json({
      orderStatuses: orderStatusEnum,
      paymentStatuses: paymentStatusEnum,
      deliveryStatuses: ['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'],
      customerTypes
    });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(200).json({
      orderStatuses: ['REQUESTED', 'D ESIGN', 'APPROVED', 'PRODUCTION', 'QC', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REJECTED'],
      paymentStatuses: ['PENDING', 'PARTIAL', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
      deliveryStatuses: ['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'],
      customerTypes: [
        { value: 'retail', label: 'Retail' },
        { value: 'wholesale', label: 'Wholesale' },
        { value: 'corporate', label: 'Corporate' }
      ]
    });
  }
};
