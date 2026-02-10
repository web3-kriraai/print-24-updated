/**
 * Migration Script: Dynamic Signup Forms System
 * 
 * This script:
 * 1. Creates default signup forms for existing segments (CUSTOMER, PRINT_PARTNER, CORPORATE)
 * 2. Migrates existing PrintPartnerProfile and CorporateProfile data to SegmentApplication
 * 3. Updates UserSegment documents with form references
 * 
 * Run this once before deploying the new dynamic forms system.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import SignupForm from "../models/SignupForm.js";
import UserSegment from "../models/UserSegment.js";
import SegmentApplication from "../models/SegmentApplication.js";
import PrintPartnerProfile from "../models/PrintPartnerProfile.js";
import CorporateProfile from "../models/CorporateProfile.js";
import { User } from "../models/User.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root (two levels up from scripts folder)
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI_PRICING;
    if (!mongoUri) {
      throw new Error("MONGO_URI_PRICING environment variable is not defined");
    }
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

// Create default form for CUSTOMER segment
const createCustomerForm = async () => {
  const customerForm = await SignupForm.create({
    name: "Customer Signup",
    code: "CUSTOMER_FORM",
    description: "Default signup form for regular customers",
    instructions: "Create your account to start ordering",
    fields: [
      {
        fieldId: "email",
        label: "Email Address",
        fieldType: "email",
        placeholder: "your@email.com",
        validation: {
          required: true,
          customErrorMessage: "Please enter a valid email address",
        },
        order: 1,
      },
      {
        fieldId: "password",
        label: "Password",
        fieldType: "text",
        placeholder: "Enter password",
        helpText: "Must be at least 6 characters",
        validation: {
          required: true,
          minLength: 6,
          customErrorMessage: "Password must be at least 6 characters",
        },
        order: 2,
      },
    ],
    submissionSettings: {
      successMessage: "Welcome to Prints24! Your account has been created successfully.",
      notifyAdmin: false,
      notifyApplicant: true,
    },
    isActive: true,
  });
  
  console.log("✅ Created CUSTOMER signup form");
  return customerForm;
};

// Create default form for PRINT_PARTNER segment
const createPrintPartnerForm = async () => {
  const printPartnerForm = await SignupForm.create({
    name: "Print Partner Application",
    code: "PRINT_PARTNER_FORM",
    description: "Application form for print service providers",
    instructions: "Register as a print partner to start your business journey",
    fields: [
      {
        fieldId: "businessName",
        label: "Business Name",
        fieldType: "text",
        placeholder: "Enter business name",
        validation: { required: true },
        order: 1,
      },
      {
        fieldId: "ownerName",
        label: "Owner Name",
        fieldType: "text",
        placeholder: "Enter owner name",
        validation: { required: true },
        order: 2,
      },
      {
        fieldId: "mobileNumber",
        label: "Mobile Number",
        fieldType: "phone",
        placeholder: "Enter mobile number",
        validation: { required: true },
        order: 3,
      },
      {
        fieldId: "whatsappNumber",
        label: "WhatsApp Number",
        fieldType: "phone",
        placeholder: "Enter WhatsApp number",
        validation: { required: true },
        order: 4,
      },
      {
        fieldId: "emailAddress",
        label: "Email Address",
        fieldType: "email",
        placeholder: "your@email.com",
        validation: { required: true },
        order: 5,
      },
      {
        fieldId: "password",
        label: "Password",
        fieldType: "text",
        placeholder: "Enter password",
        validation: { required: true, minLength: 6 },
        order: 6,
      },
      {
        fieldId: "gstNumber",
        label: "GST Number (Optional)",
        fieldType: "text",
        placeholder: "Enter GST number",
        validation: { required: false, minLength: 15, maxLength: 15 },
        order: 7,
      },
      {
        fieldId: "fullBusinessAddress",
        label: "Full Business Address",
        fieldType: "textarea",
        placeholder: "Enter complete address",
        validation: { required: true },
        order: 8,
      },
      {
        fieldId: "city",
        label: "City",
        fieldType: "text",
        placeholder: "Enter city",
        validation: { required: true },
        order: 9,
      },
      {
        fieldId: "state",
        label: "State",
        fieldType: "text",
        placeholder: "Enter state",
        validation: { required: true },
        order: 10,
      },
      {
        fieldId: "pincode",
        label: "Pincode",
        fieldType: "text",
        placeholder: "Enter pincode",
        validation: { required: true, minLength: 6, maxLength: 6 },
        order: 11,
      },
      {
        fieldId: "proofFile",
        label: "Upload Proof (Visiting Card or Shop Photo)",
        fieldType: "file",
        validation: { required: true },
        fileSettings: {
          acceptedTypes: ["image/jpeg", "image/png", "image/jpg"],
          maxSizeBytes: 5 * 1024 * 1024,
          multiple: false,
        },
        order: 12,
      },
    ],
    submissionSettings: {
      successMessage: "Your application has been submitted for review. We will notify you once approved.",
      notifyAdmin: true,
      notifyApplicant: true,
    },
    isActive: true,
  });
  
  console.log("✅ Created PRINT_PARTNER signup form");
  return printPartnerForm;
};

// Create default form for CORPORATE segment
const createCorporateForm = async () => {
  const corporateForm = await SignupForm.create({
    name: "Corporate Registration",
    code: "CORPORATE_FORM",
    description: "Registration form for corporate members",
    instructions: "Register your organization for corporate pricing",
    fields: [
      {
        fieldId: "organizationName",
        label: "Organization Name",
        fieldType: "text",
        placeholder: "Enter organization name",
        validation: { required: true },
        order: 1,
      },
      {
        fieldId: "organizationType",
        label: "Organization Type",
        fieldType: "select",
        validation: { required: true },
        options: [
          { label: "Private Limited", value: "PRIVATE_LIMITED" },
          { label: "LLP", value: "LLP" },
          { label: "Limited", value: "LIMITED" },
          { label: "Government", value: "GOVERNMENT" },
          { label: "Hospital", value: "HOSPITAL" },
          { label: "School", value: "SCHOOL" },
          { label: "Institute", value: "INSTITUTE" },
          { label: "NGO", value: "NGO" },
          { label: "Franchise", value: "FRANCHISE" },
          { label: "Other", value: "OTHER" },
        ],
        order: 2,
      },
      {
        fieldId: "authorizedPersonName",
        label: "Authorized Person Name",
        fieldType: "text",
        placeholder: "Enter authorized person name",
        validation: { required: true },
        order: 3,
      },
      {
        fieldId: "designation",
        label: "Designation",
        fieldType: "select",
        validation: { required: true },
        options: [
          { label: "Purchase Manager", value: "PURCHASE_MANAGER" },
          { label: "Marketing Head", value: "MARKETING_HEAD" },
          { label: "Admin", value: "ADMIN" },
          { label: "Finance Manager", value: "FINANCE_MANAGER" },
          { label: "Director", value: "DIRECTOR" },
          { label: "Other", value: "OTHER" },
        ],
        order: 4,
      },
      {
        fieldId: "mobileNumber",
        label: "Mobile Number",
        fieldType: "phone",
        placeholder: "Mobile number",
        validation: { required: true },
        order: 5,
      },
      {
        fieldId: "whatsappNumber",
        label: "WhatsApp Number",
        fieldType: "phone",
        placeholder: "WhatsApp number",
        validation: { required: false },
        order: 6,
      },
      {
        fieldId: "officialEmail",
        label: "Official Email",
        fieldType: "email",
        placeholder: "Official email",
        validation: { required: true },
        order: 7,
      },
      {
        fieldId: "password",
        label: "Password",
        fieldType: "text",
        placeholder: "Enter password",
        validation: { required: true, minLength: 6 },
        order: 8,
      },
      {
        fieldId: "gstNumber",
        label: "GST Number",
        fieldType: "text",
        placeholder: "GST number",
        validation: { required: true, minLength: 15, maxLength: 15 },
        order: 9,
      },
      {
        fieldId: "fullAddress",
        label: "Full Office Address",
        fieldType: "textarea",
        placeholder: "Full address",
        validation: { required: true },
        order: 10,
      },
      {
        fieldId: "city",
        label: "City",
        fieldType: "text",
        placeholder: "City",
        validation: { required: true },
        order: 11,
      },
      {
        fieldId: "state",
        label: "State",
        fieldType: "text",
        placeholder: "State",
        validation: { required: true },
        order: 12,
      },
      {
        fieldId: "pincode",
        label: "Pincode",
        fieldType: "text",
        placeholder: "Pincode",
        validation: { required: true, minLength: 6, maxLength: 6 },
        order: 13,
      },
      {
        fieldId: "proofFile",
        label: "Upload Proof (Letterhead/PO/ID)",
        fieldType: "file",
        validation: { required: true },
        fileSettings: {
          acceptedTypes: ["image/jpeg", "image/png", "image/jpg"],
          maxSizeBytes: 5 * 1024 * 1024,
          multiple: false,
        },
        order: 14,
      },
    ],
    submissionSettings: {
      successMessage: "Your application has been submitted for review. We will notify you once approved.",
      notifyAdmin: true,
      notifyApplicant: true,
    },
    isActive: true,
  });
  
  console.log("✅ Created CORPORATE signup form");
  return corporateForm;
};

// Update or create user segments with form references
const updateUserSegments = async (customerForm, printPartnerForm, corporateForm) => {
  // Update or create CUSTOMER segment
  let customerSegment = await UserSegment.findOne({ code: "CUSTOMER" });
  if (customerSegment) {
    customerSegment.signupForm = customerForm._id;
    customerSegment.requiresApproval = false;
    customerSegment.isPubliclyVisible = true;
    customerSegment.icon = "👤";
    customerSegment.color = "#3B82F6"; // Blue
    await customerSegment.save();
    console.log("✅ Updated CUSTOMER segment");
  } else {
    customerSegment = await UserSegment.create({
      code: "CUSTOMER",
      name: "Customer",
      description: "Regular customers for individual printing needs",
      signupForm: customerForm._id,
      requiresApproval: false,
      isPubliclyVisible: true,
      isDefault: true,
      isSystem: true,
      icon: "👤",
      color: "#3B82F6",
      isActive: true,
    });
    console.log("✅ Created CUSTOMER segment");
  }

  // Update or create PRINT_PARTNER segment
  let printPartnerSegment = await UserSegment.findOne({ code: "PRINT_PARTNER" });
  if (printPartnerSegment) {
    printPartnerSegment.signupForm = printPartnerForm._id;
    printPartnerSegment.requiresApproval = true;
    printPartnerSegment.isPubliclyVisible = true;
    printPartnerSegment.icon = "💼";
    printPartnerSegment.color = "#8B5CF6"; // Purple
    await printPartnerSegment.save();
    console.log("✅ Updated PRINT_PARTNER segment");
  } else {
    printPartnerSegment = await UserSegment.create({
      code: "PRINT_PARTNER",
      name: "Print Partner",
      description: "Print service providers",
      signupForm: printPartnerForm._id,
      requiresApproval: true,
      isPubliclyVisible: true,
      isSystem: true,
      icon: "💼",
      color: "#8B5CF6",
      isActive: true,
    });
    console.log("✅ Created PRINT_PARTNER segment");
  }

  // Update or create CORPORATE segment
  let corporateSegment = await UserSegment.findOne({ code: "CORPORATE" });
  if (corporateSegment) {
    corporateSegment.signupForm = corporateForm._id;
    corporateSegment.requiresApproval = true;
    corporateSegment.isPubliclyVisible = true;
    corporateSegment.icon = "🏢";
    corporateSegment.color = "#10B981"; // Green
    await corporateSegment.save();
    console.log("✅ Updated CORPORATE segment");
  } else {
    corporateSegment = await UserSegment.create({
      code: "CORPORATE",
      name: "Corporate",
      description: "Corporate members and organizations",
      signupForm: corporateForm._id,
      requiresApproval: true,
      isPubliclyVisible: true,
      isSystem: true,
      icon: "🏢",
      color: "#10B981",
      isActive: true,
    });
    console.log("✅ Created CORPORATE segment");
  }

  return { customerSegment, printPartnerSegment, corporateSegment };
};

// Migrate PrintPartnerProfile to SegmentApplication
const migratePrintPartnerProfiles = async (printPartnerSegment, printPartnerForm) => {
  const profiles = await PrintPartnerProfile.find({});
  let migratedCount = 0;

  for (const profile of profiles) {
    // Check if already migrated
    const existingApp = await SegmentApplication.findOne({ 
      email: profile.email,
      userSegment: printPartnerSegment._id,
    });

    if (existingApp) {
      console.log(`⏭️  Skipping already migrated: ${profile.email}`);
      continue;
    }

    // Convert profile to form data
    const formDataMap = new Map();
    formDataMap.set("businessName", profile.businessName);
    formDataMap.set("ownerName", profile.ownerName);
    formDataMap.set("mobileNumber", profile.mobileNumber);
    formDataMap.set("whatsappNumber", profile.whatsappNumber);
    formDataMap.set("emailAddress", profile.email);
    if (profile.gstNumber) formDataMap.set("gstNumber", profile.gstNumber);
    if (profile.address) {
      formDataMap.set("fullBusinessAddress", profile.address.street || "");
      formDataMap.set("city", profile.address.city || "");
      formDataMap.set("state", profile.address.state || "");
      formDataMap.set("pincode", profile.address.pincode || "");
    }

    // Prepare uploaded files
    const uploadedFiles = [];
    if (profile.proofDocument) {
      uploadedFiles.push({
        fieldId: "proofFile",
        fieldLabel: "Upload Proof (Visiting Card or Shop Photo)",
        fileUrl: profile.proofDocument,
        fileName: "proof_document",
        fileType: "image",
      });
    }

    // Determine status from verification status
    let status = "pending";
    if (profile.verificationStatus === "approved") status = "approved";
    if (profile.verificationStatus === "rejected") status = "rejected";

    // Create SegmentApplication
    const application = await SegmentApplication.create({
      user: profile.user,
      email: profile.email,
      userSegment: printPartnerSegment._id,
      signupForm: printPartnerForm._id,
      formData: formDataMap,
      uploadedFiles,
      status,
      isEmailVerified: true,
      reviewedAt: profile.verifiedAt || profile.updatedAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });

    // Update user's segmentApplication reference
    if (profile.user) {
      await User.findByIdAndUpdate(profile.user, {
        segmentApplication: application._id,
      });
    }

    migratedCount++;
    console.log(`✅ Migrated PrintPartner: ${profile.email}`);
  }

  console.log(`📊 Migrated ${migratedCount} print partner profiles`);
  return migratedCount;
};

// Migrate CorporateProfile to SegmentApplication
const migrateCorporateProfiles = async (corporateSegment, corporateForm) => {
  const profiles = await CorporateProfile.find({});
  let migratedCount = 0;

  for (const profile of profiles) {
    // Check if already migrated
    const existingApp = await SegmentApplication.findOne({
      email: profile.officialEmail,
      userSegment: corporateSegment._id,
    });

    if (existingApp) {
      console.log(`⏭️  Skipping already migrated: ${profile.officialEmail}`);
      continue;
    }

    // Convert profile to form data
    const formDataMap = new Map();
    formDataMap.set("organizationName", profile.organizationName);
    formDataMap.set("organizationType", profile.organizationType);
    formDataMap.set("authorizedPersonName", profile.authorizedPersonName);
    formDataMap.set("designation", profile.designation);
    formDataMap.set("mobileNumber", profile.mobileNumber);
    if (profile.whatsappNumber) formDataMap.set("whatsappNumber", profile.whatsappNumber);
    formDataMap.set("officialEmail", profile.officialEmail);
    if (profile.gstNumber) formDataMap.set("gstNumber", profile.gstNumber);
    if (profile.address) {
      formDataMap.set("fullAddress", profile.address.street || "");
      formDataMap.set("city", profile.address.city || "");
      formDataMap.set("state", profile.address.state || "");
      formDataMap.set("pincode", profile.address.pincode || "");
    }

    // Prepare uploaded files
    const uploadedFiles = [];
    if (profile.proofDocument) {
      uploadedFiles.push({
        fieldId: "proofFile",
        fieldLabel: "Upload Proof (Letterhead/PO/ID)",
        fileUrl: profile.proofDocument,
        fileName: "proof_document",
        fileType: "image",
      });
    }

    // Determine status
    let status = "pending";
    if (profile.verificationStatus === "approved") status = "approved";
    if (profile.verificationStatus === "rejected") status = "rejected";

    // Create SegmentApplication
    const application = await SegmentApplication.create({
      user: profile.user,
      email: profile.officialEmail,
      userSegment: corporateSegment._id,
      signupForm: corporateForm._id,
      formData: formDataMap,
      uploadedFiles,
      status,
      isEmailVerified: true,
      reviewedAt: profile.verifiedAt || profile.updatedAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });

    // Update user's segmentApplication reference
    if (profile.user) {
      await User.findByIdAndUpdate(profile.user, {
        segmentApplication: application._id,
      });
    }

    migratedCount++;
    console.log(`✅ Migrated Corporate: ${profile.officialEmail}`);
  }

  console.log(`📊 Migrated ${migratedCount} corporate profiles`);
  return migratedCount;
};

// Main migration function
const runMigration = async () => {
  console.log("\n🚀 Starting Dynamic Signup Forms Migration\n");
  console.log("=" .repeat(50));

  try {
    // Step 1: Create default forms
    console.log("\n📝 Step 1: Creating default signup forms...");
    const customerForm = await createCustomerForm();
    const printPartnerForm = await createPrintPartnerForm();
    const corporateForm = await createCorporateForm();

    // Step 2: Update user segments
    console.log("\n👥 Step 2: Updating user segments...");
    const { customerSegment, printPartnerSegment, corporateSegment } = 
      await updateUserSegments(customerForm, printPartnerForm, corporateForm);

    // Step 3: Migrate existing profiles
    console.log("\n🔄 Step 3: Migrating existing profiles...");
    const printPartnerCount = await migratePrintPartnerProfiles(printPartnerSegment, printPartnerForm);
    const corporateCount = await migrateCorporateProfiles(corporateSegment, corporateForm);

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("\n✅ Migration completed successfully!");
    console.log(`\n📊 Summary:`);
    console.log(`   - Forms created: 3`);
    console.log(`   - User segments updated: 3`);
    console.log(`   - Print partner profiles migrated: ${printPartnerCount}`);
    console.log(`   - Corporate profiles migrated: ${corporateCount}`);
    console.log(`   - Total applications migrated: ${printPartnerCount + corporateCount}`);
    console.log("\n💡 Next steps:");
    console.log("   1. Test the new signup flow");
    console.log("   2. Verify migrated data in admin panel");
    console.log("   3. Deploy frontend changes");
    console.log("\n");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  }
};

// Execute migration
const main = async () => {
  await connectDB();
  await runMigration();
  await mongoose.connection.close();
  console.log("👋 Database connection closed");
  process.exit(0);
};

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
