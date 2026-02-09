import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Clock,
  Package,
  Truck,
  FileCheck,
  Download,
  CreditCard,
  HelpCircle,
  AlertTriangle,
  Printer,
  Scissors,
  Layers,
  Box as BoxIcon,
  MapPin,
  Info,
  ChevronRight,
  Calendar,
  Hash,
  Tag,
  FileText,
  Shield,
  Truck as TruckIcon,
  Check,
  X,
  Sparkles,
  Copy,
  ExternalLink,
  RefreshCw,
  CheckCircle, // Added from the provided list
  AlertCircle, // Added from the provided list
} from 'lucide-react';
import { formatCurrency, calculateOrderBreakdown, OrderForCalculation } from '../utils/pricing';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../lib/apiConfig';
import BackButton from '../components/BackButton';
import { DepartmentApprovalTimeline } from '../components/DepartmentApprovalTimeline';
import ProductPriceBox from '../components/ProductPriceBox';

// Types (keep your existing types)
interface TimelineEvent {
  stage: string;
  status: 'completed' | 'in_progress' | 'pending';
  timestamp?: string;
  startedAt?: string;
  completedAt?: string;
  statusLabel?: string; // Add optional label for granular status
}

interface DepartmentStatus {
  departmentName: string;
  status: 'completed' | 'in_progress' | 'pending';
  startedAt?: string;
  completedAt?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  product: {
    _id: string;
    name: string;
    image: string;
    basePrice?: number;
    additionalDesignCharge?: number;
    subcategory?: {
      name: string;
      image?: string;
      category?: {
        name: string;
      };
    } | string;
    gstPercentage?: number;
    maxFileSizeMB?: number;
    options?: Array<{ name: string; priceAdd: number; description?: string }>;
    filters?: {
      filterPricesEnabled?: boolean;
      printingOptionPrices?: Array<{ name: string; priceAdd: number }>;
    };
  };
  quantity: number;
  finish: string;
  shape: string;
  selectedOptions: Array<{
    optionId?: string;
    name?: string;
    optionName?: string;
    priceAdd: number;
    description?: string;
    image?: string;
  }>;
  selectedDynamicAttributes?: Array<{
    attributeTypeId: string;
    attributeName: string;
    attributeValue: any;
    label: string;
    priceMultiplier?: number;
    priceAdd: number;
    description?: string;
    image?: string;
    uploadedImages?: Array<{
      data: Buffer | string;
      contentType: string;
      filename: string;
    }>;
  }>;
  totalPrice: number;
  status: 'request' | 'processing' | 'completed' | 'cancelled' | 'rejected';
  deliveryDate: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  packedAt?: string | null;
  movedToPackingAt?: string | null;
  dispatchedAt?: string | null;
  handedOverToCourierAt?: string | null;
  courierPartner?: string | null;
  trackingId?: string | null;
  uploadedDesign?: {
    frontImage?: {
      data: string;
      filename: string;
    };
    backImage?: {
      data: string;
      filename: string;
    };
  };
  advancePaid?: number;
  paymentStatus?: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  paymentGatewayInvoiceId?: string | null;

  // Modern pricing structure
  priceSnapshot?: {
    basePrice: number;
    unitPrice: number;
    quantity: number;
    appliedModifiers?: Array<{
      modifierType: string;
      value: number;
      source: string;
      beforeAmount: number;
      afterAmount: number;
      reason: string;
    }>;
    subtotal: number;
    gstPercentage: number;
    gstAmount: number;
    totalPayable: number;
    currency: string;
    calculatedAt: string;
  };

  // Enhanced payment details
  payment_details?: {
    transaction_id?: string;
    gateway_used?: 'RAZORPAY' | 'STRIPE' | 'PHONEPE' | 'PAYU' | 'CASHFREE';
    payment_method?: 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'QR' | 'BANK_TRANSFER' | 'EMI' | 'COD' | 'CREDIT';
    captured_at?: string;
    amount_paid?: number;
  };

  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  // Added user property
  user?: {
    name: string;
    email: string;
    mobileNumber?: string;
  };
  departmentStatuses?: Array<{
    department: {
      _id: string;
      name: string;
      sequence?: number;
    } | string;
    status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'stopped';
    startedAt?: string | null;
    completedAt?: string | null;
    whenAssigned?: string | null;
    pausedAt?: string | null;
    operator?: {
      _id: string;
      name: string;
    } | string;
    notes?: string;
  }>;
  currentDepartmentIndex?: number;
  productionTimeline?: Array<{
    department: {
      _id: string;
      name: string;
    } | string;
    action: string;
    timestamp: string;
  }>;

  // Courier/Shipment tracking fields
  awbCode?: string;
  shiprocketOrderId?: string;
  shiprocketShipmentId?: string;
  courierStatus?: string;
  courierTrackingUrl?: string;
  courierCompanyId?: number;
  courierTimeline?: Array<{
    status: string;
    location: string;
    timestamp: string;
    notes?: string;
  }>;
  courierCharges?: {
    freightCharge: number;
    codCharges?: number;
    totalCharge: number;
  };
  pickupDetails?: {
    pickupLocationId?: string;
    pickupLocationName?: string;
    pickupAddress?: string;
    pickupPincode?: string;
    scheduledPickupTime?: string;
    actualPickupTime?: string;
  };

  // Delivery destination details
  pincode?: string;
  address?: string;
  mobileNumber?: string;
  estimatedDeliveryDate?: string;

  // Production timeline fields
  productionStartDate?: string;
  productionEndDate?: string;

  // Courier selection from Shiprocket serviceability
  selectedCourier?: {
    courierId?: number;
    courierName?: string;
    estimatedDays?: number;
    rate?: number;
  };
}

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig: Record<string, { color: string; bg: string; icon?: React.ReactNode }> = {
    request: {
      color: 'text-yellow-800',
      bg: 'bg-yellow-100',
      icon: <Clock className="w-3 h-3" />
    },
    processing: {
      color: 'text-blue-800',
      bg: 'bg-blue-100',
      icon: <Package className="w-3 h-3" />
    },
    completed: {
      color: 'text-green-800',
      bg: 'bg-green-100',
      icon: <CheckCircle2 className="w-3 h-3" />
    },
    cancelled: {
      color: 'text-red-800',
      bg: 'bg-red-100',
      icon: <X className="w-3 h-3" />
    },
    rejected: {
      color: 'text-red-800',
      bg: 'bg-red-100',
      icon: <X className="w-3 h-3" />
    },
  };

  const config = statusConfig[status] || { color: 'text-gray-800', bg: 'bg-gray-100' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.color} ${config.bg} uppercase tracking-wide`}>
      {config.icon}
      {status.replace('_', ' ')}
    </span>
  );
};

// Enhanced TimelineStep Component with progress animation
const TimelineStep: React.FC<{
  event: TimelineEvent;
  isLast: boolean;
  isActive: boolean;
  isNextAfterCompleted?: boolean; // New prop to identify first pending after last completed
}> = ({ event, isLast, isActive, isNextAfterCompleted }) => {
  const isCompleted = event.status === 'completed';
  const isPending = event.status === 'pending';
  const isCourierStage = event.stage === 'Courier';

  // Get status color for courier stage
  const getCourierStatusColor = (label?: string) => {
    if (!label) return 'text-blue-600';
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('delivered')) return 'text-green-600';
    if (lowerLabel.includes('out for delivery')) return 'text-blue-600';
    if (lowerLabel.includes('transit')) return 'text-indigo-600';
    if (lowerLabel.includes('pickup') || lowerLabel.includes('picked')) return 'text-yellow-600';
    if (lowerLabel.includes('return') || lowerLabel.includes('rto') || lowerLabel.includes('cancel')) return 'text-red-600';
    return 'text-blue-600';
  };

  return (
    <div className={`flex-1 relative ${isLast ? '' : 'mb-8 md:mb-0'}`}>
      {/* Connecting line with progress animation */}
      {!isLast && (
        <div className="absolute left-3.5 top-8 w-0.5 h-[calc(100%-2rem)] md:w-[calc(100%-2rem)] md:h-0.5 md:left-8 md:top-3.5 overflow-hidden">
          {/* Base line */}
          <div className={`absolute inset-0 ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />

          {/* Animated shimmer on line after last completed (progress indicator) */}
          {isCompleted && (
            <div className="absolute inset-0">
              {/* Shimmer effect - moves from left to right */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-green-300 to-transparent opacity-60"
                style={{
                  animation: 'shimmer 2s ease-in-out infinite',
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex md:flex-col items-center gap-4 md:gap-3">
        {/* Circle indicator with enhanced animations */}
        <div
          className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted
            ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-200'
            : isActive
              ? 'bg-white border-blue-500 text-blue-500 shadow-lg shadow-blue-200 animate-pulse'
              : isNextAfterCompleted
                ? 'bg-white border-green-300 text-green-400 shadow-md shadow-green-100'
                : 'bg-white border-gray-300 text-gray-300'
            }`}
          style={isNextAfterCompleted ? {
            animation: 'pulse-glow 2s ease-in-out infinite',
          } : undefined}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : isActive ? (
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
          ) : isNextAfterCompleted ? (
            // Animated dot for next stage
            <div
              className="w-2.5 h-2.5 bg-green-400 rounded-full"
              style={{
                animation: 'ping-soft 1.5s ease-in-out infinite',
              }}
            />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </div>
        <div className="md:text-center">
          <p
            className={`text-sm font-semibold ${isActive ? 'text-blue-600' : isCompleted ? 'text-gray-900' : isNextAfterCompleted ? 'text-green-600' : 'text-gray-400'
              }`}
          >
            {event.stage}
          </p>
          {event.timestamp && (
            <p className="text-xs text-gray-500 mt-1">
              {new Date(event.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          )}
          {/* Show status label for Courier stage in all states */}
          {isCourierStage && event.statusLabel && (
            <span className={`inline-block mt-1 text-[10px] uppercase tracking-wider font-bold ${isCompleted ? 'text-green-600' : getCourierStatusColor(event.statusLabel)
              }`}>
              {event.statusLabel}
            </span>
          )}
          {/* Show in_progress for non-courier stages */}
          {isActive && !isCourierStage && (
            <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-bold text-blue-600">
              {event.statusLabel || 'In Progress'}
            </span>
          )}
          {/* Show "NEXT" indicator for next stage after completed */}
          {isNextAfterCompleted && !isActive && (
            <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-bold text-green-500">
              NEXT
            </span>
          )}
        </div>
      </div>

      {/* CSS Keyframes for animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4);
          }
          50% { 
            box-shadow: 0 0 0 8px rgba(74, 222, 128, 0);
          }
        }
        @keyframes ping-soft {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.3);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};


// Enhanced ProductSpecsPanel with better layout
const ProductSpecsPanel: React.FC<{ order: Order }> = ({ order }) => {
  if (!order.product) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Package className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Product Configuration</h3>
        </div>
        <p className="text-gray-600">Product information not available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Product Details</h3>
            <p className="text-sm text-gray-600">Configuration and specifications</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Basic Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Product</p>
            </div>
            <p className="text-gray-900 font-bold text-lg">{order.product.name}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Shape</p>
            </div>
            <p className="text-gray-900 font-bold text-lg">{order.shape}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Finish</p>
            </div>
            <p className="text-gray-900 font-bold text-lg">{order.finish}</p>
          </div>
        </div>

        {/* Attributes Section */}
        <div className="mb-8">
          <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            Selected Attributes
          </h4>

          {order.selectedDynamicAttributes && order.selectedDynamicAttributes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {order.selectedDynamicAttributes.map((attr, idx) => (
                <div
                  key={idx}
                  className="group relative bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-1">
                        {attr.attributeName}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mb-1">{attr.label}</p>
                      {attr.description && (
                        <p className="text-xs text-gray-600 leading-relaxed">{attr.description}</p>
                      )}
                    </div>
                    {(attr.priceAdd > 0 || attr.priceMultiplier) && (
                      <div className="text-right">
                        <span className="text-sm font-bold text-blue-600">
                          +{formatCurrency(attr.priceAdd)}
                          <span className="text-xs text-gray-500 font-normal ml-1">/unit</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No attributes configured</p>
            </div>
          )}
        </div>

        {/* Options Section */}
        <div>
          <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Additional Options
          </h4>

          {order.selectedOptions && order.selectedOptions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {order.selectedOptions.map((opt, idx) => {
                const name = opt.optionName || opt.name || 'Option';
                return (
                  <div
                    key={idx}
                    className="group relative bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-300 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                          <Check className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{name}</p>
                          {opt.description && (
                            <p className="text-xs text-gray-600">{opt.description}</p>
                          )}
                        </div>
                      </div>
                      {opt.priceAdd > 0 && (
                        <span className="text-sm font-bold text-green-600">
                          +{formatCurrency(opt.priceAdd)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-center">
              No additional options configured
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced PriceBreakdownPanel with better visual hierarchy
const PriceBreakdownPanel: React.FC<{ order: Order }> = ({ order }) => {
  if (!order.product) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Price Breakdown</h3>
        <p className="text-gray-600">Product information not available.</p>
      </div>
    );
  }

  // Use priceSnapshot if available (modern schema), otherwise calculate (legacy)
  const usePriceSnapshot = Boolean(order.priceSnapshot);

  let unitPrice: number, quantity: number, subtotal: number, gstPercentage: number, gstAmount: number, finalTotal: number;
  let appliedModifiers: any[] = [];

  if (usePriceSnapshot && order.priceSnapshot) {
    // Modern pricing structure - use snapshot (frozen prices at order time)
    quantity = order.priceSnapshot.quantity;
    subtotal = order.priceSnapshot.subtotal;
    gstPercentage = order.priceSnapshot.gstPercentage;
    gstAmount = order.priceSnapshot.gstAmount;
    finalTotal = order.priceSnapshot.totalPayable;
    appliedModifiers = order.priceSnapshot.appliedModifiers || [];

    // Use unitPrice from priceSnapshot - this is the correct calculated unit price
    // For legacy orders where unitPrice might be basePrice, fallback to subtotal/quantity
    const storedUnitPrice = order.priceSnapshot.unitPrice || 0;
    const calculatedUnitPrice = quantity > 0 ? subtotal / quantity : 0;
    // If stored unitPrice seems like basePrice (way less than calculated), use calculated
    unitPrice = (storedUnitPrice < calculatedUnitPrice * 0.5) ? calculatedUnitPrice : storedUnitPrice;
  } else {
    // Legacy calculation for old orders
    const orderForCalc: OrderForCalculation = {
      quantity: order.quantity,
      product: {
        basePrice: order.product?.basePrice || 0,
        gstPercentage: order.product?.gstPercentage || 18,
        options: order.product?.options || [],
        filters: order.product?.filters || {},
        quantityDiscounts: (order.product as any)?.quantityDiscounts || [],
      },
      finish: order.finish,
      shape: order.shape,
      selectedOptions: (order.selectedOptions || []).map((opt) => ({
        name: opt.optionName || opt.name,
        optionName: opt.optionName || opt.name,
        priceAdd: opt.priceAdd || 0,
      })),
      selectedDynamicAttributes: order.selectedDynamicAttributes?.map((attr) => ({
        attributeName: attr.attributeName,
        label: attr.label,
        priceMultiplier: attr.priceMultiplier,
        priceAdd: attr.priceAdd,
      })),
    };

    const calculations = calculateOrderBreakdown(orderForCalc) as any;
    const additionalDesignCharge = (order.product as any)?.additionalDesignCharge || 0;

    const subtotalBeforeDiscount = calculations.subtotalBeforeGst || calculations.rawBaseTotal + calculations.optionBreakdowns.reduce((sum: number, opt: any) => sum + opt.cost, 0);
    const subtotalAfterDiscount = calculations.subtotalAfterDiscount || calculations.subtotal || subtotalBeforeDiscount;
    const subtotalWithDesignCharge = subtotalAfterDiscount + additionalDesignCharge;

    quantity = order.quantity;
    subtotal = subtotalWithDesignCharge;
    unitPrice = quantity > 0 ? subtotal / quantity : (order.product?.basePrice || 0);
    gstPercentage = order.product?.gstPercentage || 18;
    gstAmount = (subtotalWithDesignCharge * gstPercentage) / 100;
    finalTotal = subtotalWithDesignCharge + gstAmount;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Tag className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Price Breakdown</h3>
            <p className="text-sm text-gray-600">
              {usePriceSnapshot ? 'Dynamic pricing applied' : 'Detailed cost calculation'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Quantity & Base Price */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="text-sm text-gray-600">Quantity</p>
              <p className="text-2xl font-bold text-gray-900">{quantity.toLocaleString()} units</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Unit Price</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(unitPrice)}</p>
            </div>
          </div>
        </div>

        {/* Applied Modifiers (if using priceSnapshot) */}
        {appliedModifiers.length > 0 && (
          <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <p className="text-xs font-semibold text-purple-900 mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Applied Price Adjustments
            </p>
            {appliedModifiers.map((mod: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-xs py-1.5 px-2 bg-white/50 rounded mb-1">
                <span className="text-purple-700 font-medium">{mod.source}</span>
                <span className="text-purple-900 font-bold">
                  {mod.modifierType === 'FIXED' ? formatCurrency(mod.value) : `${mod.value}%`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Price Breakdown */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
          </div>

          <div className="flex justify-between items-center py-3 border-t border-gray-200">
            <span className="text-gray-600">GST ({gstPercentage}%)</span>
            <span className="text-purple-600 font-semibold">+{formatCurrency(gstAmount)}</span>
          </div>
        </div>

        {/* Total */}
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-lg font-bold text-gray-900">Includes all taxes</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(finalTotal)}
            </p>
          </div>
        </div>

        {/* Payment Status Badge */}
        {order.paymentStatus === 'PENDING' && (
          <div className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <p className="text-sm font-medium text-orange-700">Payment Required</p>
            </div>
          </div>
        )}

        {order.paymentStatus === 'COMPLETED' && order.payment_details && (
          <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm font-bold text-green-700">Payment Completed</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
              {order.payment_details.gateway_used && (
                <div>
                  <span className="font-medium">Gateway:</span> {order.payment_details.gateway_used}
                </div>
              )}
              {order.payment_details.payment_method && (
                <div>
                  <span className="font-medium">Method:</span> {order.payment_details.payment_method}
                </div>
              )}
              {order.payment_details.captured_at && (
                <div className="col-span-2">
                  <span className="font-medium">Paid on:</span> {new Date(order.payment_details.captured_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced FileUploadPanel
const FileUploadPanel: React.FC<{ order: Order }> = ({ order }) => {
  const files: Array<{ type: string; fileName: string; uploadedAt: string; sizeMb: number; data?: string }> = [];

  if (order.uploadedDesign?.frontImage) {
    files.push({
      type: 'front',
      fileName: order.uploadedDesign.frontImage.filename || 'front-design.png',
      uploadedAt: order.createdAt,
      sizeMb: 0,
      data: order.uploadedDesign.frontImage.data,
    });
  }

  if (order.uploadedDesign?.backImage) {
    files.push({
      type: 'back',
      fileName: order.uploadedDesign.backImage.filename || 'back-design.png',
      uploadedAt: order.createdAt,
      sizeMb: 0,
      data: order.uploadedDesign.backImage.data,
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FileCheck className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Design Files</h3>
            <p className="text-sm text-gray-600">CMYK format required</p>
          </div>
          <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
            Max {order.product?.maxFileSizeMB || 10}MB
          </span>
        </div>
      </div>

      <div className="p-6">
        {files.length > 0 ? (
          <div className="space-y-4">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-gray-50 to-white hover:border-purple-300 transition-colors group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-purple-600 border border-gray-200 group-hover:border-purple-300 transition-colors">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{file.fileName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                          {file.type.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">CMYK</span>
                        <span className="text-xs text-gray-500">
                          {new Date(file.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {file.data && (
                    <a
                      href={file.data}
                      download={file.fileName}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {file.data && (
                  <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <img
                      src={file.data}
                      alt={`${file.type} design`}
                      className="w-full h-40 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileCheck className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">No design files uploaded</p>
            <p className="text-sm text-gray-400">Upload your CMYK design files to proceed</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced DepartmentChip
const DepartmentChip: React.FC<{ status: DepartmentStatus }> = ({ status }) => {
  const isCompleted = status.status === 'completed';
  const isInProgress = status.status === 'in_progress';

  const getIcon = (name: string) => {
    if (name.includes('Prepress')) return <FileCheck className="w-4 h-4" />;
    if (name.includes('Print')) return <Printer className="w-4 h-4" />;
    if (name.includes('Cut')) return <Scissors className="w-4 h-4" />;
    if (name.includes('Plate')) return <Layers className="w-4 h-4" />;
    return <BoxIcon className="w-4 h-4" />;
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 ${isCompleted
        ? 'bg-gradient-to-r from-green-50 to-white border-green-200'
        : isInProgress
          ? 'bg-gradient-to-r from-blue-50 to-white border-blue-300 shadow-sm'
          : 'bg-gray-50 border-gray-200'
        }`}
    >
      <div
        className={`p-2 rounded-lg ${isCompleted
          ? 'bg-green-100 text-green-600'
          : isInProgress
            ? 'bg-blue-100 text-blue-600 animate-pulse'
            : 'bg-gray-100 text-gray-400'
          }`}
      >
        {getIcon(status.departmentName)}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold truncate ${isCompleted ? 'text-green-800' : isInProgress ? 'text-blue-800' : 'text-gray-500'
            }`}
        >
          {status.departmentName}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {status.completedAt
            ? `Completed at ${new Date(status.completedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}`
            : status.startedAt
              ? `Started at ${new Date(status.startedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}`
              : 'Pending'}
        </p>
      </div>
      {isInProgress && (
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
      )}
    </div>
  );
};

// Delivery Schedule Panel Component
const DeliverySchedulePanel: React.FC<{ order: Order }> = ({ order }) => {
  // Log complete shipment details for debugging
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📦 [DeliverySchedule] COMPLETE SHIPMENT DATA:');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 Order Info:');
  console.log('   - Order ID:', order._id);
  console.log('   - Order Number:', order.orderNumber);
  console.log('   - Quantity:', order.quantity);
  console.log('');
  console.log('🏭 Production Timeline:');
  console.log('   - Production Start:', order.productionStartDate);
  console.log('   - Production End:', order.productionEndDate);
  console.log('   - Production Days:', order.productionStartDate && order.productionEndDate
    ? Math.ceil((new Date(order.productionEndDate).getTime() - new Date(order.productionStartDate).getTime()) / (1000 * 60 * 60 * 24))
    : 'N/A');
  console.log('');
  console.log('🚚 Selected Courier (from checkout):');
  console.log('   - Courier ID:', order.selectedCourier?.courierId);
  console.log('   - Courier Name:', order.selectedCourier?.courierName);
  console.log('   - Estimated Days:', order.selectedCourier?.estimatedDays);
  console.log('   - Rate:', order.selectedCourier?.rate);
  console.log('');
  console.log('📦 Shipment Details:');
  console.log('   - AWB Code:', order.awbCode);
  console.log('   - Courier Partner:', order.courierPartner);
  console.log('   - Courier Status:', order.courierStatus);
  console.log('   - Shiprocket Order ID:', order.shiprocketOrderId);
  console.log('   - Shiprocket Shipment ID:', order.shiprocketShipmentId);
  console.log('   - Dispatched At:', order.dispatchedAt);
  console.log('');
  console.log('📍 Pickup Details:');
  console.log('   - Pickup Pincode:', order.pickupDetails?.pickupPincode);
  console.log('   - Pickup Location:', order.pickupDetails?.pickupLocationName);
  console.log('   - Scheduled Pickup Time:', order.pickupDetails?.scheduledPickupTime);
  console.log('');
  console.log('💰 Courier Charges:');
  console.log('   - Freight Charge:', order.courierCharges?.freightCharge);
  console.log('   - Total Charge:', order.courierCharges?.totalCharge);
  console.log('');
  console.log('📅 Delivery Dates:');
  console.log('   - Stored Estimated Delivery:', order.estimatedDeliveryDate);
  console.log('   - Delivery Pincode:', order.pincode);
  console.log('');
  console.log('📜 Courier Timeline:', order.courierTimeline);
  console.log('═══════════════════════════════════════════════════════════════');

  // Calculate production days
  const calculateProductionDays = () => {
    if (!order.productionStartDate || !order.productionEndDate) return null;
    const start = new Date(order.productionStartDate);
    const end = new Date(order.productionEndDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const productionDays = calculateProductionDays();

  // Calculate shipment days (delivery date - production end date)
  const calculateShipmentDays = () => {
    console.log('[DeliverySchedule] Calculating shipment days...');
    console.log('[DeliverySchedule] - selectedCourier:', order.selectedCourier);
    console.log('[DeliverySchedule] - estimatedDays:', order.selectedCourier?.estimatedDays);
    console.log('[DeliverySchedule] - productionEndDate:', order.productionEndDate);
    console.log('[DeliverySchedule] - estimatedDeliveryDate:', order.estimatedDeliveryDate);

    // Priority 1: Use stored courier estimate (from Shiprocket serviceability) if available
    // This is the most accurate as it's the actual courier's estimate from backend
    if (order.selectedCourier?.estimatedDays) {
      console.log('[DeliverySchedule] ✓ Using courier estimated days:', order.selectedCourier.estimatedDays);
      return order.selectedCourier.estimatedDays;
    }

    // Priority 2: Calculate from actual dates if both are available
    // This is a backup calculation when courier data is missing but dates exist
    if (order.productionEndDate && order.estimatedDeliveryDate) {
      const prodEnd = new Date(order.productionEndDate);
      const delivery = new Date(order.estimatedDeliveryDate);
      const diffTime = delivery.getTime() - prodEnd.getTime();
      const calculatedDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      console.log('[DeliverySchedule] ✓ Calculated from dates:', calculatedDays, 'days');
      console.log('[DeliverySchedule]   Production End:', prodEnd.toISOString());
      console.log('[DeliverySchedule]   Delivery Date:', delivery.toISOString());
      return calculatedDays;
    }

    // Priority 3: Default fallback (only when no other data is available)
    console.log('[DeliverySchedule] ⚠ Using default 5 days (no courier data or dates available)');
    return 5;
  };

  const shipmentDays = calculateShipmentDays();

  // Calculate the CORRECT estimated delivery date
  // Priority: Recalculate from productionEndDate + shipmentDays for accuracy
  // This fixes cases where stored estimatedDeliveryDate might be incorrect
  const getCorrectDeliveryDate = (): string | null => {
    // If we have production end date and shipment days, recalculate
    if (order.productionEndDate && shipmentDays !== null) {
      const prodEnd = new Date(order.productionEndDate);
      const correctDelivery = new Date(prodEnd);
      correctDelivery.setDate(correctDelivery.getDate() + shipmentDays);
      console.log('[DeliverySchedule] Recalculated delivery date:', correctDelivery.toISOString());
      return correctDelivery.toISOString();
    }
    // Fall back to stored date if recalculation not possible
    return order.estimatedDeliveryDate || null;
  };

  const correctDeliveryDate = getCorrectDeliveryDate();

  // Recalculate days remaining using corrected delivery date
  const calculateDaysRemainingFromCorrect = () => {
    if (!correctDeliveryDate) return null;
    const now = new Date();
    const deliveryDate = new Date(correctDeliveryDate);
    const diffTime = deliveryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemainingCorrected = calculateDaysRemainingFromCorrect();

  // Format date nicely
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Delivery Schedule</h3>
              <p className="text-sm text-gray-600">Production timeline and delivery estimate</p>
            </div>
          </div>
          {daysRemainingCorrected !== null && daysRemainingCorrected > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Est. Delivery In</p>
              <p className="text-2xl font-bold text-blue-600">{daysRemainingCorrected} days</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Production Timeline */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-purple-600" />
            <h4 className="text-sm font-bold text-purple-900">Production Timeline</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-purple-700 font-medium mb-1">Production Start</p>
              <p className="text-sm font-bold text-gray-900">{formatDate(order.productionStartDate || order.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-purple-700 font-medium mb-1">Production End</p>
              <p className="text-sm font-bold text-gray-900">{formatDate(order.productionEndDate)}</p>
            </div>
          </div>
          {productionDays && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <p className="text-xs text-purple-700">
                <span className="font-bold text-purple-900">{productionDays} days</span> production time for {order.quantity.toLocaleString()} units
              </p>
            </div>
          )}
        </div>

        {/* Shipment Transit */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-green-600" />
            <h4 className="text-sm font-bold text-green-900">Shipment Transit</h4>
          </div>
          <p className="text-xs text-green-700 mb-2">
            Estimated <span className="font-bold text-green-900">{shipmentDays} days</span> for delivery after production completion
            {order.selectedCourier?.courierName && (
              <> via <span className="font-semibold">{order.selectedCourier.courierName}</span></>
            )}
          </p>
        </div>

        {/* Estimated Delivery */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border-2 border-blue-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-700 font-medium mb-1">ESTIMATED DELIVERY DATE</p>
              <p className="text-xl font-bold text-gray-900">{formatDate(correctDeliveryDate)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <TruckIcon className="w-6 h-6 text-white" />
            </div>
          </div>
          {daysRemainingCorrected !== null && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-700">
                {daysRemainingCorrected > 0
                  ? `Your order should arrive in approximately ${daysRemainingCorrected} ${daysRemainingCorrected === 1 ? 'day' : 'days'}`
                  : daysRemainingCorrected === 0
                    ? 'Your order should arrive today!'
                    : 'Delivery date has passed. Please check shipment tracking or contact support.'}
              </p>
            </div>
          )}
        </div>

        {/* Info Note */}
        <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600">
            Delivery dates are estimates based on production time and standard shipping. Actual delivery may vary based on courier performance and location.
          </p>
        </div>
      </div>
    </div>
  );
};

// Shipment Tracking Panel Component
const ShipmentTrackingPanel: React.FC<{ order: Order; onRefresh?: () => void; isRefreshing?: boolean }> = ({ order, onRefresh, isRefreshing }) => {
  const [copied, setCopied] = useState(false);

  // Format currency for shipping charges
  const formatShippingCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Check if there's any shipment-related data to display
  const hasShipmentData = order.awbCode ||
    order.shiprocketOrderId ||
    order.courierPartner ||
    order.courierStatus ||
    order.pickupDetails?.pickupPincode ||
    (order.courierCharges && (order.courierCharges.freightCharge > 0 || order.courierCharges.totalCharge > 0)) ||
    (order.courierTimeline && order.courierTimeline.length > 0);


  // Check if all departments are completed
  const allDepartmentsComplete = order.departmentStatuses?.every(
    ds => ds.status === 'completed'
  ) ?? false;

  // Check if payment is completed
  const isPaymentComplete = order.paymentStatus === 'COMPLETED';

  // Show "Awaiting Production Completion" panel when payment is complete but departments are still working
  if (!allDepartmentsComplete && isPaymentComplete) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Production In Progress</h3>
                <p className="text-sm text-gray-600">Awaiting production completion</p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              In Production
            </span>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Your order is being produced</p>
              <p className="text-sm text-gray-600">Shipment details will appear here once all production departments complete their work.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show "Shipment Pending" panel when all departments are complete but no shipment data yet
  if (!hasShipmentData && isPaymentComplete && allDepartmentsComplete) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-yellow-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Truck className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Shipment Pending</h3>
                <p className="text-sm text-gray-600">External Courier (Shiprocket)</p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
              Processing
            </span>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-gray-900">Your shipment is being prepared</p>
              <p className="text-sm text-gray-600">Shipment details will appear here once the courier is assigned.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Only show if there's shipment data
  if (!hasShipmentData) {
    return null;
  }

  const copyAwbCode = () => {
    if (order.awbCode) {
      navigator.clipboard.writeText(order.awbCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get status badge color based on courier status
  const getStatusConfig = (status?: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('delivered')) {
      return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', wrapper: 'bg-green-50', label: 'Delivered' };
    }
    if (statusLower.includes('out_for_delivery') || statusLower.includes('out for delivery')) {
      return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', wrapper: 'bg-blue-50', label: 'Out for Delivery' };
    }
    if (statusLower.includes('in_transit') || statusLower.includes('transit')) {
      return { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', wrapper: 'bg-indigo-50', label: 'In Transit' };
    }
    if (statusLower.includes('pickup') || statusLower.includes('picked')) {
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', wrapper: 'bg-yellow-50', label: statusLower.includes('picked') ? 'Picked Up' : 'Pickup Scheduled' };
    }
    if (statusLower.includes('cancelled') || statusLower.includes('rto') || statusLower.includes('return')) {
      return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', wrapper: 'bg-red-50', label: 'Cancelled/RTO' };
    }
    return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', wrapper: 'bg-gray-50', label: status || 'Processing' };
  };

  const statusConfig = getStatusConfig(order.courierStatus);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-green-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Shipment Tracking</h3>
              <p className="text-sm text-gray-600">External Courier (Shiprocket)</p>
            </div>
          </div>
          {order.courierStatus && (
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-lg hover:bg-green-100 transition-colors ${isRefreshing ? 'animate-spin text-green-600' : 'text-gray-500 hover:text-green-600'}`}
              title="Refresh Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* AWB and Shipment Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* AWB Code */}
          {order.awbCode && (
            <div className="bg-gradient-to-r from-green-50 to-white p-4 rounded-lg border border-green-100">
              <p className="text-sm text-gray-600 mb-2">AWB Code</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-lg font-bold text-gray-900 bg-white px-3 py-2 rounded border border-gray-200 flex-1">
                  {order.awbCode}
                </p>
                <button
                  onClick={copyAwbCode}
                  className={`p-2 rounded-lg border transition-all ${copied ? 'bg-green-100 border-green-300 text-green-600' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-600'}`}
                  title="Copy AWB Code"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Courier Partner */}
          {order.courierPartner && (
            <div className="bg-gradient-to-r from-blue-50 to-white p-4 rounded-lg border border-blue-100">
              <p className="text-sm text-gray-600 mb-2">Courier Partner</p>
              <p className="text-lg font-semibold text-gray-900">{order.courierPartner}</p>
              {order.shiprocketShipmentId && (
                <p className="text-xs text-gray-500 mt-1">Shipment ID: {order.shiprocketShipmentId}</p>
              )}
            </div>
          )}
        </div>

        {/* Current Courier Status - Prominent Display */}
        {order.courierStatus && (
          <div className={`p-4 rounded-lg border mb-4 ${statusConfig.wrapper} ${statusConfig.border}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusConfig.bg}`}>
                  <Truck className={`w-5 h-5 ${statusConfig.text}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Current Status</p>
                  <p className={`text-lg font-bold ${statusConfig.text}`}>
                    {statusConfig.label}
                  </p>
                </div>
              </div>
              {order.pickupDetails?.scheduledPickupTime && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Scheduled Pickup</p>
                  <p className="text-sm font-medium text-gray-700">
                    {new Date(order.pickupDetails.scheduledPickupTime).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
              {order.deliveredAt && (
                <div className="text-right">
                  <p className="text-xs text-green-600">Delivered</p>
                  <p className="text-sm font-bold text-green-700">
                    {new Date(order.deliveredAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Courier Charges */}
        {order.courierCharges && (order.courierCharges.freightCharge > 0 || order.courierCharges.totalCharge > 0) && (
          <div className="bg-gradient-to-r from-purple-50 to-white p-4 rounded-lg border border-purple-100 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <p className="text-sm font-semibold text-gray-900">Shipping Charges</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Freight Charge:</span>
                <span className="ml-2 font-semibold text-gray-900">{formatShippingCurrency(order.courierCharges.freightCharge)}</span>
              </div>
              {order.courierCharges.codCharges && order.courierCharges.codCharges > 0 && (
                <div>
                  <span className="text-gray-500">COD Charges:</span>
                  <span className="ml-2 font-semibold text-gray-900">{formatShippingCurrency(order.courierCharges.codCharges)}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Total:</span>
                <span className="ml-2 font-bold text-purple-700">{formatShippingCurrency(order.courierCharges.totalCharge)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Pickup Details */}
        {order.pickupDetails && order.pickupDetails.pickupPincode && (
          <div className="bg-gradient-to-r from-orange-50 to-white p-4 rounded-lg border border-orange-100 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-orange-600" />
              <p className="text-sm font-semibold text-gray-900">Pickup Information</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Location:</span>
                <span className="ml-2 font-medium text-gray-900">{order.pickupDetails.pickupLocationName || 'Warehouse'}</span>
              </div>
              <div>
                <span className="text-gray-500">Pincode:</span>
                <span className="ml-2 font-medium text-gray-900">{order.pickupDetails.pickupPincode}</span>
              </div>
              {order.pickupDetails.scheduledPickupTime && (
                <div className="col-span-2">
                  <span className="text-gray-500">Scheduled Pickup:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {new Date(order.pickupDetails.scheduledPickupTime).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })} at{' '}
                    {new Date(order.pickupDetails.scheduledPickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              {order.pickupDetails.actualPickupTime && (
                <div className="col-span-2">
                  <span className="text-gray-500">Actual Pickup:</span>
                  <span className="ml-2 font-medium text-green-700">
                    {new Date(order.pickupDetails.actualPickupTime).toLocaleDateString()} at{' '}
                    {new Date(order.pickupDetails.actualPickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delivery Information - Destination based on pincode */}
        {order.pincode && (
          <div className="bg-gradient-to-r from-teal-50 to-white p-4 rounded-lg border border-teal-100 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              <p className="text-sm font-semibold text-gray-900">Delivery Information</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Destination Pincode:</span>
                <span className="ml-2 font-medium text-gray-900">{order.pincode}</span>
              </div>
              {order.address && (
                <div className="col-span-2">
                  <span className="text-gray-500">Delivery Address:</span>
                  <span className="ml-2 font-medium text-gray-900">{order.address}</span>
                </div>
              )}
              {order.estimatedDeliveryDate && (
                <div className="col-span-2">
                  <span className="text-gray-500">Estimated Delivery:</span>
                  <span className="ml-2 font-medium text-teal-700">
                    {new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Track Shipment Button */}
        {order.courierTrackingUrl && (
          <a
            href={order.courierTrackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 px-6 rounded-lg font-medium transition-all shadow-lg"
          >
            <ExternalLink className="w-5 h-5" />
            Track Shipment on Shiprocket
          </a>
        )}

        {/* Delivered status */}
        {order.deliveredAt && (
          <div className="mt-4 pt-4 border-t border-green-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <p className="text-green-700 font-medium">
                Delivered on {new Date(order.deliveredAt).toLocaleDateString()} at{' '}
                {new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main OrderDetails Component with Enhanced Layout
const OrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    try {
      setPaymentProcessing(true);
      const token = localStorage.getItem('token');

      // 1. Initialize Payment
      const initRes = await fetch(`${API_BASE_URL}/payment/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId: order._id,
          preferredGateway: 'RAZORPAY',
          paymentMethod: 'CARD' // Default
        })
      });

      const initData = await initRes.json();

      if (!initData.success) {
        throw new Error(initData.error || 'Payment initialization failed');
      }

      // 2. Load Razorpay Script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // 3. Open Razorpay Checkout
      const options = {
        key: initData.checkout_data.key,
        amount: initData.checkout_data.amount,
        currency: initData.checkout_data.currency,
        name: "Print24",
        description: `Order #${order.orderNumber}`,
        order_id: initData.gateway_order_id,
        handler: async function (response: any) {
          try {
            // 4. Verify Payment
            const verifyRes = await fetch(`${API_BASE_URL}/payment/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                gateway: 'RAZORPAY'
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              // Success! Refresh order details API
              await fetchOrderDetails();
              alert('Payment Successful!');
            } else {
              alert('Payment Verification Failed: ' + verifyData.error);
            }
          } catch (error) {
            console.error('Verification error:', error);
            alert('Payment occurred but verification failed. Please contact support.');
          }
        },
        prefill: {
          name: order.user?.name || '',
          email: order.user?.email || '',
          contact: order.user?.mobileNumber || ''
        },
        theme: {
          color: "#3B82F6"
        },
        modal: {
          ondismiss: function () {
            setPaymentProcessing(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (error: any) {
      console.error('Payment Error:', error);
      alert(error.message || 'Payment failed to initialize');
    } finally {
      setPaymentProcessing(false);
    }
  };
  const [error, setError] = useState<string | null>(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  useEffect(() => {
    // Check for payment success/failure params
    const paymentSuccess = searchParams.get('payment_success');
    const paymentFailed = searchParams.get('payment_failed');
    const paymentError = searchParams.get('error');

    if (paymentSuccess === 'true') {
      setShowPaymentSuccess(true);
      // Clean up URL
      setSearchParams({}, { replace: true });
    } else if (paymentFailed === 'true' || paymentError) {
      setError(paymentError ? `Payment Error: ${paymentError}` : 'Payment failed. Please try again.');
      // Clean up URL
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchOrderDetails = React.useCallback(async (isBackground = false) => {
    if (!orderId) {
      setError('Order ID is required');
      setLoading(false);
      return;
    }

    try {
      if (!isBackground) {
        setRefreshing(true);
      }

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      setOrder(data);
    } catch (err) {
      // Only show error if it's the initial load or explicit refresh
      if (!isBackground) {
        setError(err instanceof Error ? err.message : 'Failed to load order details');
      }
      console.error('Error fetching order details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId, navigate]);

  // Initial load and polling
  useEffect(() => {
    fetchOrderDetails();

    // Poll every 30 seconds
    const intervalId = setInterval(() => {
      fetchOrderDetails(true);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchOrderDetails]);

  const getProductionTimeline = (): TimelineEvent[] => {
    if (!order) return [];

    const stages: TimelineEvent[] = [];

    // Stage 1: Order Placed (always completed when order exists)
    stages.push({
      stage: 'Order Placed',
      status: 'completed',
      timestamp: order.createdAt,
      startedAt: order.createdAt,
      completedAt: order.createdAt,
    });

    // Dynamic Department Stages (from departmentStatuses)
    if (order.departmentStatuses && order.departmentStatuses.length > 0) {
      order.departmentStatuses.forEach((ds) => {
        const dept = typeof ds.department === 'object' ? ds.department : null;
        const deptName = dept?.name || 'Department';
        const status = typeof ds === 'object' ? ds.status : 'pending';

        let timelineStatus: 'completed' | 'in_progress' | 'pending' = 'pending';
        if (status === 'completed') {
          timelineStatus = 'completed';
        } else if (status === 'in_progress') {
          timelineStatus = 'in_progress';
        }

        stages.push({
          stage: deptName,
          status: timelineStatus,
          timestamp: ds.completedAt || ds.startedAt || ds.whenAssigned,
          startedAt: ds.startedAt || undefined,
          completedAt: ds.completedAt || undefined,
        });
      });
    }

    // Check if all departments are completed
    const allDepartmentsCompleted = order.departmentStatuses?.every((ds) => {
      const status = typeof ds === 'object' ? ds.status : null;
      return status === 'completed';
    }) ?? false;

    // Map Shiprocket courier status to human-readable labels
    // Includes both internal statuses AND actual Shiprocket webhook status names
    const getCourierStatusLabel = (status?: string): string => {
      if (!status) return 'Processing';

      const statusMap: Record<string, string> = {
        // Internal status mappings
        'PENDING': 'Pending',
        'PICKUP_SCHEDULED': 'Pickup Scheduled',
        'PICKUP SCHEDULED': 'Pickup Scheduled',
        'pickup_scheduled': 'Pickup Scheduled',
        'PICKED_UP': 'Picked Up',
        'PICKED UP': 'Picked Up',
        'picked_up': 'Picked Up',
        'IN_TRANSIT': 'In Transit',
        'IN TRANSIT': 'In Transit',
        'in_transit': 'In Transit',
        'OUT_FOR_DELIVERY': 'Out for Delivery',
        'OUT FOR DELIVERY': 'Out for Delivery',
        'out_for_delivery': 'Out for Delivery',
        'DELIVERED': 'Delivered',
        'delivered': 'Delivered',
        'RTO': 'Return to Origin',
        'rto': 'Return to Origin',
        'return_to_origin': 'Return to Origin',
        'RTO_DELIVERED': 'RTO Delivered',
        'rto_delivered': 'RTO Delivered',
        'CANCELLED': 'Cancelled',
        'cancelled': 'Cancelled',

        // Actual Shiprocket webhook status names (as received from courier)
        'Pickup Scheduled': 'Pickup Scheduled',
        'Pickup Generated': 'Pickup Scheduled',
        'Pickup Queued': 'Pickup Scheduled',
        'Out For Pickup': 'Out for Pickup',
        'Pickup Error': 'Pickup Failed',
        'Pickup Rescheduled': 'Pickup Rescheduled',
        'Shipped': 'Shipped',
        'In Transit': 'In Transit',
        'Reached at Destination Hub': 'At Destination Hub',
        'Out For Delivery': 'Out for Delivery',
        'Delivered': 'Delivered',
        'RTO Initiated': 'Return Initiated',
        'RTO In-Transit': 'Return In Transit',
        'RTO Delivered': 'Returned',
        'RTO Acknowledged': 'Return Completed',
        'Cancelled': 'Cancelled',
        'Lost': 'Lost',
        'Damaged': 'Damaged',
        'NDR': 'Delivery Attempted',
        'Undelivered': 'Undelivered',
        'Misrouted': 'Misrouted',
      };

      // Return exact match if found, otherwise format nicely
      if (statusMap[status]) {
        return statusMap[status];
      }

      // Format unknown status nicely
      return status.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };


    // Shipment/Courier Stage - Shows pickup scheduled date from productionEndDate
    const dispatchedAt = order.dispatchedAt || order.handedOverToCourierAt;
    const isDelivered = Boolean(order.deliveredAt) || order.courierStatus?.toUpperCase() === 'DELIVERED';
    const hasCourierInfo = order.courierPartner || order.awbCode || order.trackingId || order.courierStatus;

    // Helper to check if status is a "scheduled" or "pending" type (not yet acted upon)
    const isScheduledStatus = (status?: string): boolean => {
      if (!status) return false;
      const lowerStatus = status.toLowerCase();
      return lowerStatus.includes('scheduled') || lowerStatus === 'pending';
    };

    // Define courier status progression order (lower = earlier in flow)
    const statusProgressionOrder: Record<string, number> = {
      'pickup_scheduled': 1, 'PICKUP_SCHEDULED': 1, 'Pickup Scheduled': 1, 'Pickup Generated': 1, 'Pickup Queued': 1,
      'Out For Pickup': 2,
      'Shipped': 3, 'shipped': 3, 'SHIPPED': 3,
      'picked_up': 3, 'PICKED_UP': 3, 'Picked Up': 3,
      'in_transit': 4, 'IN_TRANSIT': 4, 'In Transit': 4, 'Reached at Destination Hub': 4,
      'out_for_delivery': 5, 'OUT_FOR_DELIVERY': 5, 'Out For Delivery': 5,
      'delivered': 6, 'DELIVERED': 6, 'Delivered': 6,
      'rto': 7, 'RTO': 7, 'RTO Initiated': 7, 'return_to_origin': 7,
      'rto_delivered': 8, 'RTO Delivered': 8, 'RTO Acknowledged': 8,
      'cancelled': 9, 'Cancelled': 9,
    };

    const getStatusOrder = (status: string): number => statusProgressionOrder[status] ?? 0;

    // Add courier timeline entries as individual stages
    if (order.courierTimeline && order.courierTimeline.length > 0) {
      // Sort timeline by status progression order (not timestamp) to show logical flow
      const sortedTimeline = [...order.courierTimeline].sort((a, b) => {
        const orderA = getStatusOrder(a.status);
        const orderB = getStatusOrder(b.status);
        // If same progression level, sort by timestamp
        if (orderA === orderB) {
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        }
        return orderA - orderB;
      });

      // Find the highest progression level in the timeline (current state)
      const maxProgressionLevel = Math.max(...sortedTimeline.map(e => getStatusOrder(e.status)));

      // Add each courier status as a separate stage
      sortedTimeline.forEach((entry, index) => {
        const isLastEntry = index === sortedTimeline.length - 1;
        const statusLabel = getCourierStatusLabel(entry.status);
        const isDeliveredEntry = statusLabel.toLowerCase() === 'delivered';
        const isScheduled = isScheduledStatus(entry.status);
        const entryProgressionLevel = getStatusOrder(entry.status);

        // Determine the timeline status:
        // - Delivered = completed
        // - If this entry's progression is less than max = completed (we've moved past it)
        // - If this entry's progression equals max and not delivered = in_progress
        // - Scheduled status that's been superseded by later statuses = completed
        let timelineStatus: 'completed' | 'in_progress' | 'pending' = 'completed';

        if (isDeliveredEntry) {
          timelineStatus = 'completed';
        } else if (entryProgressionLevel < maxProgressionLevel) {
          // We've moved past this status, mark as completed
          timelineStatus = 'completed';
        } else if (isLastEntry && !isDelivered) {
          // This is the current/latest status
          // FIX: If it's a scheduled status (like Pickup Scheduled), it should be PENDING, not in_progress
          timelineStatus = isScheduled ? 'pending' : 'in_progress';
        }

        // Use actual entry timestamp (not scheduled future date for completed pickups)
        const entryTimestamp = entry.timestamp;

        stages.push({
          stage: statusLabel,
          status: timelineStatus,
          timestamp: entryTimestamp,
          startedAt: entry.timestamp,
          completedAt: timelineStatus === 'completed' ? entry.timestamp : undefined,
          statusLabel: entry.location || statusLabel,
        });
      });

    } else if (hasCourierInfo && !isDelivered) {
      // Show current courier status if no timeline entries yet
      const isScheduled = isScheduledStatus(order.courierStatus);

      // Use scheduledPickupTime for pickup scheduled status
      const timestamp = isScheduled && order.pickupDetails?.scheduledPickupTime
        ? order.pickupDetails.scheduledPickupTime
        : dispatchedAt || order.productionEndDate || order.updatedAt;

      stages.push({
        stage: getCourierStatusLabel(order.courierStatus),
        status: isScheduled ? 'pending' : 'in_progress', // Scheduled = pending, others = in_progress
        timestamp: timestamp,
        statusLabel: isScheduled ? 'Scheduled' : 'In Progress',
      });
    } else if (allDepartmentsCompleted && !hasCourierInfo) {
      // Departments complete, awaiting shipment
      stages.push({
        stage: 'Shipment',
        status: 'pending',
        statusLabel: 'Awaiting Pickup',
      });
    } else if (!allDepartmentsCompleted) {
      // Departments not yet completed - no courier stage yet
    }

    // Final Delivery stage with estimated delivery date
    // Only add if not already present in courier timeline
    const estimatedDelivery = order.estimatedDeliveryDate || order.pickupDetails?.scheduledPickupTime;
    const hasDeliveredInTimeline = order.courierTimeline?.some(entry =>
      entry.status?.toLowerCase().includes('delivered') ||
      entry.status?.toLowerCase() === 'delivered'
    );

    if (isDelivered && !hasDeliveredInTimeline) {
      // Only add Delivered stage if not already in courier timeline
      stages.push({
        stage: 'Delivered',
        status: 'completed',
        timestamp: order.deliveredAt,
        completedAt: order.deliveredAt,
        statusLabel: 'Package Delivered',
      });
    } else if (!isDelivered && !hasDeliveredInTimeline && (estimatedDelivery || hasCourierInfo)) {
      // Add pending Delivery stage if order not yet delivered
      stages.push({
        stage: 'Delivery',
        status: 'pending',
        timestamp: estimatedDelivery,
        statusLabel: estimatedDelivery
          ? `Est. ${new Date(estimatedDelivery).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
          : 'Pending',
      });
    }

    return stages;
  };


  const getDepartmentStatuses = (): DepartmentStatus[] => {
    if (!order?.departmentStatuses) return [];

    return order.departmentStatuses
      .map((ds) => {
        const dept = typeof ds.department === 'object' ? ds.department : null;
        const status = typeof ds === 'object' ? ds.status : 'pending';
        return {
          departmentName: dept?.name || 'Unknown',
          status: status as 'completed' | 'in_progress' | 'pending',
          startedAt: typeof ds === 'object' ? ds.startedAt || undefined : undefined,
          completedAt: typeof ds === 'object' ? ds.completedAt || undefined : undefined,
        };
      })
      .sort((a, b) => {
        const deptA = order.departmentStatuses?.find(
          (ds) => {
            const dept = typeof ds.department === 'object' ? ds.department : null;
            return dept?.name === a.departmentName;
          }
        );
        const deptB = order.departmentStatuses?.find(
          (ds) => {
            const dept = typeof ds.department === 'object' ? ds.department : null;
            return dept?.name === b.departmentName;
          }
        );
        const seqA = typeof deptA?.department === 'object' ? deptA.department.sequence : 0;
        const seqB = typeof deptB?.department === 'object' ? deptB.department.sequence : 0;
        return seqA - seqB;
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading order details...</p>
          <p className="text-sm text-gray-400">Please wait a moment</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h3>
          <p className="text-gray-600 mb-6">{error || 'The order you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/profile')}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  if (!order.product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Product Information Missing</h3>
          <p className="text-gray-600 mb-6">This order is missing product details. Please contact support.</p>
          <button
            onClick={() => navigate('/profile')}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  const isPaymentPending = order.paymentStatus !== 'COMPLETED';
  const productionTimeline = getProductionTimeline();
  const departmentStatuses = getDepartmentStatuses();
  const categoryName: string =
    typeof order.product.subcategory === 'object' && order.product.subcategory !== null
      ? order.product.subcategory.name || 'N/A'
      : (typeof order.product.subcategory === 'string' ? order.product.subcategory : 'N/A');

  // Helper to construct price data
  const getPriceData = () => {
    if (order.priceSnapshot) {
      return {
        pricing: order.priceSnapshot,
        meta: {
          userSegment: 'N/A',
          userSegmentName: 'Order Record',
          geoZone: null,
          pincode: order.pincode || '',
          detectedBy: 'ORDER',
          isGuest: false
        }
      };
    }

    // Fallback for legacy orders
    const gstPercent = order.product?.gstPercentage || 18;
    const total = order.totalPrice || 0;
    const subtotal = total / (1 + gstPercent / 100);
    const gstAmount = total - subtotal;

    return {
      pricing: {
        basePrice: order.product?.basePrice || 0,
        totalPayable: total,
        subtotal: subtotal,
        gstAmount: gstAmount,
        gstPercentage: gstPercent,
        appliedModifiers: [],
        currency: 'INR',
        calculatedAt: order.createdAt,
        quantity: order.quantity
      },
      meta: {
        userSegment: 'N/A',
        userSegmentName: 'Order Record',
        geoZone: null,
        pincode: order.pincode || '',
        detectedBy: 'ORDER',
        isGuest: false
      }
    };
  };

  const finalPriceData = getPriceData();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Payment Success Banner */}
        {showPaymentSuccess && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-2xl p-6 shadow-sm animate-fade-in-up">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-800">Payment Successful!</h3>
                <p className="text-green-700">Your payment has been processed and your order is now in production.</p>
              </div>
              <button
                onClick={() => setShowPaymentSuccess(false)}
                className="ml-auto text-green-600 hover:text-green-800 p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Order Summary Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between gap-6 md:items-start">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Hash className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Order Number</p>
                      <h2 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h2>
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Order Date</p>
                      <p className="font-medium text-gray-900">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Quantity</p>
                      <p className="font-bold text-gray-900 text-lg">{order.quantity.toLocaleString()} units</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Delivery</p>
                      <p className="font-medium text-gray-900">
                        {order.estimatedDeliveryDate
                          ? new Date(order.estimatedDeliveryDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                          : order.deliveredAt
                            ? `Delivered on ${new Date(order.deliveredAt).toLocaleDateString()}`
                            : 'Calculating...'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-white rounded-xl border border-blue-200 flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{order.product.name}</p>
                    <p className="text-gray-600">{categoryName}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {order.paymentStatus === 'COMPLETED' && (
                  <button
                    onClick={() => {
                      // Generate invoice download
                      const token = localStorage.getItem('token');
                      window.open(`${API_BASE_URL}/orders/${order._id}/invoice?token=${token}`, '_blank');
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-300 hover:border-blue-500 text-gray-700 hover:text-blue-600 rounded-lg font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Invoice
                  </button>
                )}
                <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all shadow-lg">
                  <HelpCircle className="w-4 h-4" />
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Payment Status Section */}
        {isPaymentPending && (
          <div className="mb-8">
            <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 border-2 border-orange-300 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/30 rounded-full flex items-center justify-center animate-pulse">
                      <CreditCard className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Payment Required</h3>
                      <p className="text-orange-100 text-sm">Complete payment to start production</p>
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/30">
                    <p className="text-xs text-orange-100 font-medium uppercase tracking-wide">Amount Due</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {formatCurrency(
                        order.priceSnapshot?.totalPayable || order.totalPrice - (order.advancePaid || 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body with price breakdown preview */}
              <div className="p-6 md:p-8">
                <div className="grid md:grid-cols-5 gap-6 items-center">
                  {/* Left: Warning and Price Details */}
                  <div className="md:col-span-3 space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-white/60 rounded-lg border border-orange-100">
                      <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700 text-sm">
                        Your order has been created but <span className="font-bold">production will not start</span> until payment is confirmed.
                      </p>
                    </div>

                    {/* Inline Price Breakdown */}
                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Price Breakdown
                      </h4>
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(
                              order.priceSnapshot?.subtotal ||
                              (order.totalPrice / 1.18) // Rough estimate if no snapshot
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">
                            GST ({order.priceSnapshot?.gstPercentage || 18}%):
                          </span>
                          <span className="font-semibold text-purple-600">
                            +{formatCurrency(
                              order.priceSnapshot?.gstAmount ||
                              (order.totalPrice - (order.totalPrice / 1.18))
                            )}
                          </span>
                        </div>
                        <div className="border-t border-gray-200 pt-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-base font-bold text-gray-900">Total Amount:</span>
                            <span className="text-xl font-bold text-blue-600">
                              {formatCurrency(order.priceSnapshot?.totalPayable || order.totalPrice)}
                            </span>
                          </div>
                        </div>
                        {order.advancePaid && order.advancePaid > 0 && (
                          <>
                            <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed">
                              <span className="text-gray-500">Advance Paid:</span>
                              <span className="text-green-600 font-semibold">-{formatCurrency(order.advancePaid)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-700">Balance Due:</span>
                              <span className="text-lg font-bold text-orange-600">
                                {formatCurrency((order.priceSnapshot?.totalPayable || order.totalPrice) - order.advancePaid)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Pay Now CTA */}
                  <div className="md:col-span-2 flex flex-col items-center justify-center text-center space-y-4">
                    <button
                      onClick={handlePayment}
                      disabled={paymentProcessing}
                      className={`group relative w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-600 hover:via-emerald-600 hover:to-green-700 text-white px-8 py-5 rounded-xl font-bold text-lg shadow-2xl shadow-green-500/40 transition-all duration-300 transform hover:scale-105 hover:shadow-green-500/60 overflow-hidden ${paymentProcessing ? 'opacity-75 cursor-wait' : ''}`}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        {paymentProcessing ? (
                          <RefreshCw className="w-6 h-6 animate-spin" />
                        ) : (
                          <CreditCard className="w-6 h-6" />
                        )}
                        {paymentProcessing ? 'Processing...' : 'Pay Now'}
                      </span>
                      {/* Animated shimmer effect */}
                      {!paymentProcessing && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:translate-x-full transition-transform duration-1000"></div>
                      )}
                    </button>

                    <div className="flex flex-col items center text-xs text-gray-600 space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-500" />
                        <span>Secure payment • SSL encrypted</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Check className="w-3 h-3" />
                        <span>Multiple payment options available</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Production Timeline */}
        {!isPaymentPending && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Production Status</h3>
                <p className="text-sm text-gray-600">Track your order progress</p>
              </div>
              <div className="text-right flex items-center gap-4">
                <button
                  onClick={() => fetchOrderDetails(false)}
                  disabled={refreshing}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${refreshing
                    ? 'bg-blue-50 text-blue-400 cursor-not-allowed'
                    : 'bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200'
                    }`}
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{refreshing ? 'Updating...' : 'Refresh'}</span>
                </button>
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="font-medium text-gray-900">
                    {new Date(order.updatedAt || order.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="mb-8">
              <div className="relative">
                <div className="flex flex-col md:flex-row justify-between items-start">
                  {productionTimeline.map((event, idx) => {
                    // Find the index of the first non-completed stage (first pending/in_progress after last completed)
                    const firstPendingIndex = productionTimeline.findIndex(e => e.status !== 'completed');
                    const isNextAfterCompleted = idx === firstPendingIndex && firstPendingIndex > 0;

                    return (
                      <TimelineStep
                        key={idx}
                        event={event}
                        isLast={idx === productionTimeline.length - 1}
                        isActive={event.status === 'in_progress'}
                        isNextAfterCompleted={isNextAfterCompleted}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            {/* CourierTimeline Component */}

          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <ProductSpecsPanel order={order} />

            {/* Replaced Uploaded Image with ProductPriceBox as requested */}
            {order.uploadedDesign && (
              <FileUploadPanel order={order} />
            )}

            {/* Delivery Information */}
            {order.shippingAddress && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <MapPin className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Delivery Address</h3>
                      <p className="text-sm text-gray-600">Shipment destination</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <TruckIcon className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{order.shippingAddress.street}</p>
                        <p className="text-gray-600">
                          {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                        </p>
                        <p className="text-gray-600">{order.shippingAddress.country}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shipment Tracking Panel - shows AWB, status, timeline from webhooks */}
            <ShipmentTrackingPanel
              order={order}
              onRefresh={() => fetchOrderDetails(false)}
              isRefreshing={refreshing}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Replaced PriceBreakdownPanel with ProductPriceBox */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Tag className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Price Details</h3>
                    <p className="text-sm text-gray-600">Product pricing and attributes</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <ProductPriceBox
                  productId={order.product._id}
                  quantity={order.quantity}
                  selectedDynamicAttributes={order.selectedDynamicAttributes}
                  showBreakdown={true}
                  priceData={finalPriceData}
                />
              </div>
            </div>

            {/* Delivery Schedule Panel */}
            <DeliverySchedulePanel order={order} />

            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
                <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-4 space-y-3">
                <button
                  onClick={() => {
                    if (order.paymentStatus === 'COMPLETED') {
                      const token = localStorage.getItem('token');
                      window.open(`${API_BASE_URL}/orders/${order._id}/invoice?token=${token}`, '_blank');
                    }
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 transition-colors ${order.paymentStatus === 'COMPLETED'
                    ? 'bg-gray-50 hover:bg-gray-100 cursor-pointer'
                    : 'bg-gray-100 cursor-not-allowed opacity-50'
                    }`}
                  disabled={order.paymentStatus !== 'COMPLETED'}
                >
                  <span className="font-medium text-gray-700">Download Invoice</span>
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                  <span className="font-medium text-gray-700">Contact Support</span>
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </button>
                {order.courierTrackingUrl ? (
                  <a
                    href={order.courierTrackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                  >
                    <span className="font-medium text-green-700">Track Shipment</span>
                    <ExternalLink className="w-4 h-4 text-green-600" />
                  </a>
                ) : order.awbCode ? (
                  <a
                    href={`https://shiprocket.co/tracking/${order.awbCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                  >
                    <span className="font-medium text-green-700">Track Shipment</span>
                    <ExternalLink className="w-4 h-4 text-green-600" />
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-200 cursor-not-allowed opacity-50"
                  >
                    <span className="font-medium text-gray-500">Track Order</span>
                    <Truck className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Order Summary Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
              <h4 className="font-bold text-gray-900 mb-4">Order Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Order Number</span>
                  <span className="font-mono font-semibold text-gray-900">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Order Date</span>
                  <span className="font-medium text-gray-900">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment</span>
                  <span className={`font-medium ${order.paymentStatus === 'COMPLETED' ? 'text-green-600' : 'text-orange-600'}`}>
                    {order.paymentStatus === 'COMPLETED' ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div >
    </div >
  );
};

export default OrderDetails;
