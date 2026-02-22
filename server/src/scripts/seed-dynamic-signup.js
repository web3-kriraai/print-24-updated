import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import UserSegment from "../models/UserSegment.js";
import SignupForm from "../models/SignupForm.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from server folder
dotenv.config({ path: join(__dirname, "../../.env") });

const seedDynamicSignup = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    console.log("Starting seed process...");

    // ==========================================
    // 1. Create Default Signup Forms
    // ==========================================

    // --- Retail Form ---
    let retailForm = await SignupForm.findOne({ code: "RETAIL_FORM" });
    if (!retailForm) {
      console.log("Creating Retail Signup Form...");
      retailForm = await SignupForm.create({
        name: "Standard Registration",
        code: "RETAIL_FORM",
        description: "Standard signup form for retail customers",
        instructions: "Create an account to track orders and save your designs.",
        isActive: true,
        submissionSettings: {
          successMessage: "Welcome to Print24! Your account has been created successfully.",
          redirectUrl: "/dashboard",
          notifyAdmin: false,
          notifyApplicant: true,
        },
        fields: [
          {
            fieldId: "full_name",
            label: "Full Name",
            fieldType: "text",
            placeholder: "John Doe",
            order: 0,
            validation: { required: true, minLength: 2 },
          },
          {
            fieldId: "email",
            label: "Email Address",
            fieldType: "email",
            placeholder: "john@example.com",
            order: 1,
            validation: { required: true },
          },
          {
            fieldId: "phone",
            label: "Phone Number",
            fieldType: "phone",
            placeholder: "+91 9876543210",
            order: 2,
            validation: { required: true, pattern: "^[0-9]{10}$" },
          },
          {
            fieldId: "password",
            label: "Password",
            fieldType: "password",
            placeholder: "••••••••",
            order: 3,
            validation: { required: true, minLength: 6 },
          },
        ],
      });
    } else {
        console.log("Retail Signup Form already exists.");
    }

    // --- Print Partner Form ---
    let partnerForm = await SignupForm.findOne({ code: "PARTNER_FORM" });
    if (!partnerForm) {
      console.log("Creating Partner Signup Form...");
      partnerForm = await SignupForm.create({
        name: "Print Partner Application",
        code: "PARTNER_FORM",
        description: "Application form for print partners and resellers",
        instructions: "Apply to become a Print Partner. Please provide your business details.",
        isActive: true,
        submissionSettings: {
          successMessage: "Your application has been submitted! Our team will review your details and contact you shortly.",
          notifyAdmin: true, // Admin needs to approve
          notifyApplicant: true,
        },
        fields: [
          {
            fieldId: "full_name",
            label: "Contact Person Name",
            fieldType: "text",
            order: 0,
            validation: { required: true },
          },
          {
            fieldId: "email",
            label: "Business Email",
            fieldType: "email",
            order: 1,
            validation: { required: true },
          },
          {
            fieldId: "phone",
            label: "Mobile Number",
            fieldType: "phone",
            order: 2,
            validation: { required: true },
          },
          {
            fieldId: "company_name",
            label: "Business / Company Name",
            fieldType: "text",
            order: 3,
            validation: { required: true },
          },
          {
            fieldId: "gst_number",
            label: "GST Number",
            fieldType: "text",
            order: 4,
            validation: { required: true, pattern: "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$" }, // Basic GST Regex
          },
          {
            fieldId: "business_address",
            label: "Business Address",
            fieldType: "textarea",
            order: 5,
            validation: { required: true },
          },
           {
            fieldId: "password",
            label: "Account Password",
            fieldType: "password",
            placeholder: "Choose a secure password",
            order: 6,
            validation: { required: true, minLength: 6 },
          },
        ],
      });
    } else {
        console.log("Partner Signup Form already exists.");
    }

    // --- Corporate Form ---
    let corporateForm = await SignupForm.findOne({ code: "CORPORATE_FORM" });
    if (!corporateForm) {
      console.log("Creating Corporate Signup Form...");
      corporateForm = await SignupForm.create({
        name: "Corporate Account Inquiry",
        code: "CORPORATE_FORM",
        description: "Inquiry form for corporate bulk orders",
        instructions: "Interested in bulk pricing? Fill out this form for a corporate account.",
        isActive: true,
        submissionSettings: {
          successMessage: "Thank you for your interest! A corporate relationship manager will reach out to you.",
          notifyAdmin: true,
          notifyApplicant: true,
        },
        fields: [
          {
            fieldId: "full_name",
            label: "Contact Name",
            fieldType: "text",
            order: 0,
            validation: { required: true },
          },
          {
            fieldId: "email",
            label: "Official Email",
            fieldType: "email",
            order: 1,
            validation: { required: true },
          },
          {
            fieldId: "company_name",
            label: "Company Name",
            fieldType: "text",
            order: 2,
            validation: { required: true },
          },
          {
            fieldId: "industry",
            label: "Industry Type",
            fieldType: "select",
            order: 3,
            options: [
                { label: "Technology / IT", value: "tech" },
                { label: "Retail / FMCG", value: "retail" },
                { label: "Marketing / Advertising", value: "marketing" },
                { label: "Education", value: "education" },
                { label: "Other", value: "other" }
            ],
            validation: { required: true },
          },
          {
            fieldId: "expected_volume",
            label: "Expected Monthly Printing Volume",
            fieldType: "select",
            order: 4,
            options: [
                { label: "Less than ₹10,000", value: "low" },
                { label: "₹10,000 - ₹50,000", value: "medium" },
                { label: "₹50,000+", value: "high" }
            ],
          },
          {
            fieldId: "password",
            label: "Password",
            fieldType: "password",
            order: 5,
            validation: { required: true },
          }
        ],
      });
    } else {
        console.log("Corporate Signup Form already exists.");
    }

    // ==========================================
    // 2. Create User Segments & Link Forms
    // ==========================================

    // --- Customer Segment ---
    let customerSegment = await UserSegment.findOne({ code: "CUSTOMER" });
    if (!customerSegment) {
      console.log("Creating CUSTOMER Segment...");
      await UserSegment.create({
        name: "Retail Customer",
        code: "CUSTOMER",
        description: "Standard retail customers (B2C)",
        isDefault: true,
        isActive: true,
        isSystem: true,
        isPubliclyVisible: true,
        requiresApproval: false,
        priority: 10,
        icon: "Users",
        color: "#3B82F6", // Blue
        signupForm: retailForm._id,
      });
    } else {
      console.log("CUSTOMER Segment exists. Updating form link...");
      customerSegment.signupForm = retailForm._id;
      // Ensure it's default if no other is
      customerSegment.isDefault = true; 
      await customerSegment.save();
    }

    // --- Print Partner Segment ---
    let partnerSegment = await UserSegment.findOne({ code: "PRINT_PARTNER" });
    if (!partnerSegment) {
      console.log("Creating PRINT_PARTNER Segment...");
      await UserSegment.create({
        name: "Print Partner",
        code: "PRINT_PARTNER",
        description: "Verified print partners and resellers (B2B)",
        isDefault: false,
        isActive: true,
        isSystem: true,
        isPubliclyVisible: true,
        requiresApproval: true,
        priority: 20,
        icon: "Briefcase",
        color: "#8B5CF6", // Purple
        signupForm: partnerForm._id,
      });
    } else {
      console.log("PRINT_PARTNER Segment exists. Updating form link...");
      partnerSegment.signupForm = partnerForm._id;
      await partnerSegment.save();
    }

    // --- Corporate Segment ---
    let corporateSegment = await UserSegment.findOne({ code: "CORPORATE" });
    if (!corporateSegment) {
      console.log("Creating CORPORATE Segment...");
      await UserSegment.create({
        name: "Corporate Client",
        code: "CORPORATE",
        description: "High-volume corporate accounts",
        isDefault: false,
        isActive: true,
        isSystem: false, // Can be managed
        isPubliclyVisible: true,
        requiresApproval: true,
        priority: 30,
        icon: "Building",
        color: "#10B981", // Green
        signupForm: corporateForm._id,
      });
    } else {
      console.log("CORPORATE Segment exists. Updating form link...");
      corporateSegment.signupForm = corporateForm._id;
      await corporateSegment.save();
    }

    console.log("✅ Seed completed successfully!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
};

seedDynamicSignup();
