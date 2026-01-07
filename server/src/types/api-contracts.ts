/**
 * API Contract Types v1.0.0
 * 
 * FROZEN: These types represent immutable API contracts.
 * Breaking changes require major version bump.
 */

// ============================================================================
// PDP (Product Detail Page) Contract Types
// ============================================================================

export interface PDPFileRules {
    maxFileSizeMB?: number;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    blockedFormats?: string[];
}

export interface PDPCategory {
    _id: string;
    name: string;
    description?: string;
    image?: string;
}

export interface PDPSubCategory extends PDPCategory {
    category?: PDPCategory;
}

export interface PDPProduct {
    _id: string;
    name: string;
    description: string;
    descriptionArray?: string[];
    image: string;
    category: PDPCategory;
    subcategory?: PDPSubCategory;
    productType?: string;
    options?: object;
    filters?: object;  // Legacy, read-only
    fileRules: PDPFileRules;
    additionalDesignCharge?: number;
    gstPercentage?: number;
    showPriceIncludingGst?: boolean;
    instructions?: string;
    productionSequence?: string[];
}

export interface PDPQuantityConfig {
    quantityType: 'SIMPLE' | 'STEP_WISE' | 'RANGE_WISE';
    minQuantity?: number;
    maxQuantity?: number;
    quantityMultiples?: number;
    stepWiseQuantities?: number[];
    rangeWiseQuantities?: Array<{
        min: number;
        max?: number;
        priceMultiplier?: number;
        label?: string;
    }>;
}

export interface PDPAttributeValue {
    value: string;
    label: string;
    image?: string;
    pricingKey?: string;  // Required if pricingBehavior !== "NONE"
}

export interface PDPAttribute {
    _id: string;
    attributeName: string;
    functionType: 'QUANTITY_PRICING' | 'PRINTING_IMAGE' | 'SPOT_UV_IMAGE' | 'GENERAL';
    inputStyle: 'DROPDOWN' | 'TEXT_FIELD' | 'FILE_UPLOAD' | 'NUMBER' | 'CHECKBOX' | 'RADIO' | 'POPUP';
    pricingBehavior: 'NONE' | 'SIGNAL_ONLY' | 'QUANTITY_DRIVER';
    primaryEffectType?: 'PRICE' | 'FILE' | 'VARIANT' | 'INFORMATIONAL';
    isRequired: boolean;
    displayOrder: number;
    defaultValue?: string;
    attributeValues: PDPAttributeValue[];
    quantityConfig?: object;  // Only if functionType === "QUANTITY_PRICING"
    productConfig: {
        isEnabled: boolean;
        isRequired?: boolean;
        displayOrder?: number;
    };
}

export interface PDPSubAttribute {
    _id: string;
    value: string;
    label: string;
    image?: string;
    parentValue: string;
    pricingKey: string;  // REQUIRED
}

export interface PDPSubAttributesMap {
    [key: string]: PDPSubAttribute[];  // Key format: "attributeId:parentValue"
}

export interface PDPRuleAction {
    action: 'SHOW' | 'HIDE' | 'SET_DEFAULT' | 'RESTRICT_VALUES' | 'TRIGGER_PRICING';
    targetAttribute?: object | string;
    allowedValues?: string[];
    defaultValue?: string;
}

export interface PDPRule {
    _id: string;
    name: string;
    when: {
        attribute: object | string;
        value: string;
    };
    then: PDPRuleAction[];
    priority: number;
    applicableCategory?: string;
    applicableProduct?: string;
}

export interface PDPResponse {
    product: PDPProduct;
    quantityConfig: PDPQuantityConfig | null;
    attributes: PDPAttribute[];
    subAttributes: PDPSubAttributesMap;
    rules: PDPRule[];
}

// ============================================================================
// Pricing API Contract Types
// ============================================================================

export interface PricingSelection {
    attributeType: string;
    value: string;
    pricingKey?: string;
}

export interface PricingRequest {
    productId: string;
    selections: PricingSelection[];
    quantity: number;
    segment?: string;
    zone?: string;
    promoCodes?: string[];
}

export interface PricingModifier {
    name: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    applied: number;
}

export interface PricingAdjustment {
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    applied: number;
}

export interface PricingBreakdown {
    basePrice: number;
    attributeTotal: number;
    zoneAdjustment: number;
    segmentAdjustment: number;
    modifiersTotal: number;
    finalTotal: number;
}

export interface PricingResponse {
    basePrice: number;
    attributePrices: { [pricingKey: string]: number };
    modifiers: PricingModifier[];
    zoneAdjustment?: PricingAdjustment;
    segmentAdjustment?: PricingAdjustment;
    subtotal: number;
    total: number;
    breakdown: PricingBreakdown;
    currency: string;
    calculatedAt: string;  // ISO 8601
}

// ============================================================================
// AttributeRule Contract Types
// ============================================================================

export type AttributeRuleActionType =
    | 'SHOW'
    | 'HIDE'
    | 'SET_DEFAULT'
    | 'RESTRICT_VALUES'
    | 'TRIGGER_PRICING';

export type PricingSignalScope =
    | 'GLOBAL'
    | 'ZONE'
    | 'SEGMENT'
    | 'PRODUCT'
    | 'ATTRIBUTE';

export interface PricingSignal {
    pricingKey: string;
    scope: PricingSignalScope;
    priority?: number;
}

export interface AttributeRuleAction {
    action: AttributeRuleActionType;
    targetAttribute?: string;
    defaultValue?: string;
    allowedValues?: string[];
    pricingSignal?: PricingSignal;
}

export interface AttributeRuleWhen {
    attribute: string;
    value: string;
}

export interface AttributeRule {
    name: string;
    when: AttributeRuleWhen;
    then: AttributeRuleAction[];
    applicableCategory?: string;
    applicableProduct?: string;
    priority: number;
    isActive: boolean;
}

export interface RuleEvaluationRequest {
    productId?: string;
    categoryId?: string;
    selectedAttributes: Array<{
        attributeId: string;
        value: string;
    }>;
}

export interface RuleEvaluationResult {
    ruleId: string;
    ruleName: string;
    priority: number;
    conditionMet: boolean;
}

export interface RuleEffects {
    show: string[];
    hide: string[];
    setDefault: Array<{
        attributeId: string;
        defaultValue: string;
    }>;
    restrict: Array<{
        attributeId: string;
        allowedValues: string[];
    }>;
    triggerPricing: Array<{
        pricingKey: string;
        scope: string;
        priority: number;
    }>;
}

export interface RuleEvaluationResponse {
    success: boolean;
    evaluatedRules: RuleEvaluationResult[];
    effects: RuleEffects;
    context: {
        productId?: string;
        categoryId?: string;
        selectedAttributesCount: number;
    };
}

// ============================================================================
// pricingKey Types
// ============================================================================

/**
 * pricingKey format: UPPERCASE_SNAKE_CASE
 * Length: 3-50 characters
 * Allowed: A-Z, 0-9, _ (underscore)
 */
export type PricingKey = string;

export interface PricingKeyValidation {
    isValid: boolean;
    error?: string;
}

/**
 * Validates pricingKey format
 */
export function validatePricingKey(key: string): PricingKeyValidation {
    const regex = /^[A-Z0-9_]{3,50}$/;

    if (!key) {
        return { isValid: false, error: 'pricingKey is required' };
    }

    if (!regex.test(key)) {
        return {
            isValid: false,
            error: 'pricingKey must be UPPERCASE_SNAKE_CASE (3-50 chars, A-Z, 0-9, _)'
        };
    }

    return { isValid: true };
}

/**
 * Transforms string to valid pricingKey format
 */
export function toPricingKey(input: string): string {
    return input.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
}

// ============================================================================
// Version Information
// ============================================================================

export const API_CONTRACT_VERSION = '1.0.0';

export const CONTRACT_METADATA = {
    version: API_CONTRACT_VERSION,
    frozenDate: '2025-12-27',
    breakingChangePolicy: 'Major version bump required for breaking changes',
    deprecationPeriod: '30 days minimum'
};
