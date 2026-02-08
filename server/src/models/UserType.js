import mongoose from "mongoose";

/**
 * UserType Schema
 * 
 * For dynamic privilege management system (PMS) - replaces
 * fixed role system with configurable user types and features.
 */

const UserTypeSchema = new mongoose.Schema(
  {
    /* =====================
       BASIC INFO
    ====================== */
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      // Dynamic user type names - no enum restriction for flexibility
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    displayName: {
      type: String,
      trim: true,
    },

    description: String,

    /* =====================
       PRICING TIER
    ====================== */
    pricingTier: {
      type: Number,
      min: 0,
      max: 4,
      default: 0,
      index: true,
      // 0 = Retail (highest price)
      // 4 = VIP (lowest price)
    },

    /* =====================
       HIERARCHY
    ====================== */
    parentType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserType",
      default: null,
      index: true,
    },

    inheritFromParent: {
      type: Boolean,
      default: true,
      // Whether to inherit privileges and views from parent type
    },

    /* =====================
       STATUS
    ====================== */
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    /* =====================
       FEATURES
    ====================== */
    features: [
      {
        featureKey: {
          type: String,
          required: true,
        },
        isEnabled: {
          type: Boolean,
          default: false,
        },
        config: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],

    /* =====================
       UI CONFIGURATION
    ====================== */
    viewConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // JSON configuration for UI customization
    },

    /* =====================
       PERMISSIONS
    ====================== */
    permissions: [
      {
        resource: String, // e.g., "orders", "products", "users"
        actions: [String], // e.g., ["read", "write", "delete"]
      },
    ],

    /* =====================
       PRIVILEGE BUNDLES
    ====================== */
    privilegeBundleIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PrivilegeBundle",
      },
    ],

    /* =====================
       LIMITS
    ====================== */
    limits: {
      maxOrdersPerDay: {
        type: Number,
        default: null,
        // Max orders allowed per day (null = unlimited)
      },
      maxClients: {
        type: Number,
        default: null,
        // Max clients this user type can manage
      },
      maxCreditLimit: {
        type: Number,
        default: null,
        // Max credit limit for orders
      },
      allowedPaymentTerms: [
        {
          type: String,
          // e.g., ["COD", "NET30", "NET60"]
        },
      ],
    },

    /* =====================
       RESTRICTIONS
    ====================== */
    territoryRestrictions: [
      {
        type: String,
        trim: true,
        // Array of pincodes or zone identifiers
      },
    ],

    productCategoryRestrictions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        // Restrict access to specific product categories
      },
    ],

    /* =====================
       SIGNUP SETTINGS
    ====================== */
    autoApproveSignup: {
      type: Boolean,
      default: false,
      // Whether signups for this type are auto-approved
    },

    maxUsersAllowed: {
      type: Number,
      default: null,
      // Max number of users of this type (null = unlimited)
    },
  },
  { timestamps: true }
);

/* =====================
   HOOKS
====================== */

/**
 * Pre-save hook to prevent circular inheritance
 */
UserTypeSchema.pre("save", async function (next) {
  if (this.isModified("parentType") && this.parentType) {
    if (this.parentType.toString() === this._id.toString()) {
      return next(new Error("Circular inheritance detected: UserType cannot be its own parent."));
    }

    let currentParentId = this.parentType;
    const MAX_DEPTH = 10;
    let depth = 0;

    // Traverse up the hierarchy to ensure no cycles
    while (currentParentId && depth < MAX_DEPTH) {
      // Check if we've circled back to the original user type
      if (currentParentId.toString() === this._id.toString()) {
        return next(new Error(`Circular inheritance detected. Cycle found involving ${this.name}.`));
      }

      const parent = await mongoose.model("UserType").findById(currentParentId);
      if (!parent) break;

      currentParentId = parent.parentType;
      depth++;
    }

    if (depth >= MAX_DEPTH) {
      return next(new Error("Inheritance depth exceeded maximum allowed limit (10)."));
    }
  }
  next();
});

/* =====================
   INDEXES
====================== */
UserTypeSchema.index({ isActive: 1, pricingTier: 1 });

/* =====================
   METHODS
====================== */

/**
 * Check if feature is enabled for this user type
 */
UserTypeSchema.methods.hasFeature = function (featureKey) {
  const feature = this.features.find((f) => f.featureKey === featureKey);
  return feature?.isEnabled || false;
};

/**
 * Get feature config
 */
UserTypeSchema.methods.getFeatureConfig = function (featureKey) {
  const feature = this.features.find((f) => f.featureKey === featureKey);
  return feature?.config || {};
};

/**
 * Get all ancestors (parent types)
 */
UserTypeSchema.methods.getAncestors = async function () {
  const ancestors = [];
  let current = this;

  while (current.parentType) {
    const parent = await mongoose.model("UserType").findById(current.parentType);
    if (!parent) break;
    ancestors.push(parent);
    current = parent;
  }

  return ancestors;
};

/**
 * Get effective privileges (including inherited from parent)
 */
UserTypeSchema.methods.getEffectivePrivileges = async function () {
  const PrivilegeBundle = mongoose.model("PrivilegeBundle");

  // Start with own privilege bundles
  const ownBundles = await PrivilegeBundle.find({
    _id: { $in: this.privilegeBundleIds },
    isActive: true,
  });

  let allBundles = [...ownBundles];

  // Add inherited bundles if inheritance is enabled
  if (this.inheritFromParent && this.parentType) {
    const parent = await mongoose.model("UserType").findById(this.parentType);
    if (parent) {
      const parentPrivileges = await parent.getEffectivePrivileges();
      // Merge parent bundles (avoid duplicates)
      const existingIds = new Set(allBundles.map((b) => b._id.toString()));
      parentPrivileges.bundles.forEach((b) => {
        if (!existingIds.has(b._id.toString())) {
          allBundles.push(b);
        }
      });
    }
  }

  // Aggregate all privileges from bundles
  const aggregatedPrivileges = PrivilegeBundle.aggregatePrivileges(allBundles);

  // Merge with direct permissions
  const directPrivileges = this.permissions || [];
  const mergedMap = new Map();

  // Add aggregated bundle privileges
  aggregatedPrivileges.forEach((priv) => {
    mergedMap.set(priv.resource, new Set(priv.actions));
  });

  // Add direct permissions
  directPrivileges.forEach((priv) => {
    const resource = priv.resource.toUpperCase();
    if (!mergedMap.has(resource)) {
      mergedMap.set(resource, new Set());
    }
    priv.actions.forEach((action) => {
      mergedMap.get(resource).add(action.toLowerCase());
    });
  });

  // Convert back to array
  const effectivePrivileges = [];
  mergedMap.forEach((actions, resource) => {
    effectivePrivileges.push({
      resource,
      actions: Array.from(actions),
    });
  });

  return {
    bundles: allBundles,
    privileges: effectivePrivileges,
  };
};

/**
 * Check if user type can perform specific action on resource
 */
UserTypeSchema.methods.canPerformAction = async function (resource, action) {
  const { privileges } = await this.getEffectivePrivileges();

  return privileges.some(
    (priv) =>
      priv.resource.toUpperCase() === resource.toUpperCase() &&
      priv.actions.includes(action.toLowerCase())
  );
};

/**
 * Get view style for a specific component
 */
UserTypeSchema.methods.getViewStyleForComponent = async function (componentName) {
  const UserTypeViewAssignment = mongoose.model("UserTypeViewAssignment");

  // Try to get own assignment first
  let assignment = await UserTypeViewAssignment.getViewForType(this._id, componentName);

  // If not found and inheritance enabled, try parent
  if (!assignment && this.inheritFromParent && this.parentType) {
    const parent = await mongoose.model("UserType").findById(this.parentType);
    if (parent) {
      assignment = await parent.getViewStyleForComponent(componentName);
    }
  }

  // If still not found, get default view style
  if (!assignment) {
    const ViewStyle = mongoose.model("ViewStyle");
    assignment = await ViewStyle.getDefault();
  }

  return assignment;
};


export default mongoose.model("UserType", UserTypeSchema);
