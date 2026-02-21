import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  AlertCircle,
  Plus,
  ExternalLink,
  Copy,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatCurrency, calculateOrderBreakdown, OrderForCalculation } from '../utils/pricing';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../lib/apiConfig';
import BackButton from '../components/BackButton';

// Types (keep your existing types)
interface TimelineEvent {
  stage: string;
  status: 'completed' | 'in_progress' | 'pending';
  timestamp?: string;
  startedAt?: string;
  completedAt?: string;
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
    productionSequence?: any[];
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
      data: any | string;
      contentType: string;
      filename: string;
    }>;
  }>;
  totalPrice: number;
  status: 'request' | 'confirmed' | 'production_ready' | 'processing' | 'completed' | 'cancelled' | 'rejected';
  deliveryDate: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  packedAt?: string | null;
  movedToPackingAt?: string | null;
  dispatchedAt?: string | null;
  handedOverToCourierAt?: string | null;
  courierPartner?: string | null;
  pickupWarehouseName?: string | null;   // Warehouse used for courier pickup (from geo zone)
  pickupWarehousePincode?: string | null;
  trackingId?: string | null;
  awbCode?: string | null;
  shiprocketOrderId?: string | null;
  courierStatus?: 'shipment_created' | 'pickup_scheduled' | 'pickup_completed' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'return_to_origin' | 'cancelled' | null;
  courierTrackingUrl?: string | null;
  estimatedDeliveryDate?: string | null;
  pickupScheduledDate?: string | null;
  isMockShipment?: boolean;
  courierTimeline?: Array<{
    status: string;
    location?: string;
    timestamp: string;
    notes?: string;
  }>;
  uploadedDesign?: {
    frontImage?: {
      data?: string;
      url?: string;
      filename?: string;
    };
    backImage?: {
      data?: string;
      url?: string;
      filename?: string;
    };
    pdfFile?: {
      url?: string;
      publicId?: string;
      filename?: string;
      pageCount?: number;
    };
  };
  advancePaid?: number;
  paymentStatus?: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

  paymentGatewayInvoiceId?: string | null;
  bulkOrderRef?: string; // BulkOrder document ID
  childOrders?: Array<{
    _id: string;
    orderNumber: string;
    quantity: number;
    status: string;
    paymentStatus?: string;
    designSequence?: number;
    totalPrice?: number;
    priceSnapshot?: { totalPayable: number };
    product?: { _id: string; name: string; image?: string };
    uploadedDesign?: {
      frontImage?: { url?: string; data?: string; filename?: string };
    };
    createdAt?: string;
  }>;

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
  departmentStatuses?: Array<{
    department: {
      _id: string;
      name: string;
      sequence: number;
    } | string;
    status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'stopped';
    startedAt: string | null;
    completedAt: string | null;
  }>;
  productionTimeline?: Array<{
    department: {
      _id: string;
      name: string;
    } | string;
    action: string;
    timestamp: string;
  }>;
  isBulkParent?: boolean;
  isBulkChild?: boolean;
  parentOrderId?: string | { _id: string, orderNumber: string };
  distinctDesigns?: number;
}

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig: Record<string, { color: string; bg: string; icon?: React.ReactNode }> = {
    request: {
      color: 'text-yellow-800',
      bg: 'bg-yellow-100',
      icon: <Clock className="w-3 h-3" />
    },
    confirmed: {
      color: 'text-green-800',
      bg: 'bg-green-100',
      icon: <CheckCircle2 className="w-3 h-3" />
    },
    approved: {
      color: 'text-green-800',
      bg: 'bg-green-100',
      icon: <CheckCircle2 className="w-3 h-3" />
    },
    production_ready: {
      color: 'text-indigo-800',
      bg: 'bg-indigo-100',
      icon: <Package className="w-3 h-3" />
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
      {status.replace(/_/g, ' ')}
    </span>
  );
};

// Enhanced TimelineStep Component
const TimelineStep: React.FC<{
  event: TimelineEvent;
  isLast: boolean;
  isActive: boolean;
}> = ({ event, isLast, isActive }) => {
  const isCompleted = event.status === 'completed';
  const isPending = event.status === 'pending';

  return (
    <div className={`flex-1 relative ${isLast ? '' : 'mb-8 md:mb-0'}`}>
      {!isLast && (
        <div
          className={`absolute left-3.5 top-8 w-0.5 h-[calc(100%-2rem)] md:w-[calc(100%-2rem)] md:h-0.5 md:left-8 md:top-3.5 ${isCompleted ? 'bg-green-400' : 'bg-gray-200'
            }`}
        />
      )}
      <div className="flex md:flex-col items-center gap-4 md:gap-3">
        <div
          className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted
            ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-200'
            : isActive
              ? 'bg-white border-blue-500 text-blue-500 shadow-lg shadow-blue-200 animate-pulse'
              : 'bg-white border-gray-300 text-gray-300'
            }`}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : isActive ? (
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </div>
        <div className="md:text-center">
          <p
            className={`text-sm font-semibold ${isActive ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'
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
          {isActive && (
            <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-bold text-blue-600">
              In Progress
            </span>
          )}
        </div>
      </div>
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
        <div className={`grid grid-cols-1 ${order.isBulkParent ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4 mb-8`}>
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Product</p>
            </div>
            <p className="text-gray-900 font-bold text-lg">{order.product.name}</p>
          </div>

          {order.isBulkParent && (
            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Designs</p>
              </div>
              <p className="text-gray-900 font-bold text-lg">{order.distinctDesigns || 0}</p>
            </div>
          )}

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

  let basePrice: number, quantity: number, subtotal: number, gstPercentage: number, gstAmount: number, finalTotal: number;
  let appliedModifiers: any[] = [];

  if (usePriceSnapshot && order.priceSnapshot) {
    // Modern pricing structure - use snapshot
    basePrice = order.priceSnapshot.unitPrice;
    quantity = order.priceSnapshot.quantity;
    subtotal = order.priceSnapshot.subtotal;
    gstPercentage = order.priceSnapshot.gstPercentage;
    gstAmount = order.priceSnapshot.gstAmount;
    finalTotal = order.priceSnapshot.totalPayable;
    appliedModifiers = order.priceSnapshot.appliedModifiers || [];
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

    basePrice = order.product?.basePrice || 0;
    quantity = order.quantity;
    subtotal = subtotalWithDesignCharge;
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
              <p className="text-xl font-bold text-blue-600">{formatCurrency(basePrice)}</p>
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

        {/* Amount Paid */}
        {(order.paymentStatus === 'COMPLETED' || (order.payment_details?.amount_paid && order.payment_details.amount_paid > 0) || (order.advancePaid && order.advancePaid > 0)) && (
          <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-emerald-800">Amount Paid</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Full payment received
                </p>
              </div>
              <p className="text-xl font-bold text-emerald-700">
                {formatCurrency(order.payment_details?.amount_paid || order.advancePaid || finalTotal)}
              </p>
            </div>
          </div>
        )}

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
    const imgSrc = order.uploadedDesign.frontImage.url || order.uploadedDesign.frontImage.data;
    if (imgSrc) {
      files.push({
        type: 'front',
        fileName: order.uploadedDesign.frontImage.filename || 'front-design.pdf',
        uploadedAt: order.createdAt,
        sizeMb: 0,
        data: imgSrc,
      });
    }
  }

  if (order.uploadedDesign?.backImage) {
    const imgSrc = order.uploadedDesign.backImage.url || order.uploadedDesign.backImage.data;
    if (imgSrc) {
      files.push({
        type: 'back',
        fileName: order.uploadedDesign.backImage.filename || 'back-design.pdf',
        uploadedAt: order.createdAt,
        sizeMb: 0,
        data: imgSrc,
      });
    }
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

// Main OrderDetails Component with Enhanced Layout
const OrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const fetchOrderDetails = async () => {
    if (!orderId) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch order details');
      const data = await response.json();
      const parentId = typeof data.parentOrderId === 'object' ? data.parentOrderId?._id : data.parentOrderId;
      if (data.isBulkParent && parentId && data._id !== parentId) {
        navigate(`/order/${parentId}`, { replace: true });
        return;
      }
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId, navigate]);

  // Handle redirect back from PayU full-page redirect with ?payment=success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setPaymentSuccess(true);
      // Remove query params from URL without reload
      window.history.replaceState({}, '', window.location.pathname);
      // Refresh order data to reflect new status
      fetchOrderDetails();
    }
  }, []);

  // ── Pay Now handler ──────────────────────────────────────────────
  const handlePayNow = async () => {
    if (!order) return;
    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }

      const amount = order.priceSnapshot?.totalPayable || order.totalPrice;

      // Step 1: Initialize payment
      const initRes = await fetch(`${API_BASE_URL}/payment/initialize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order._id,
          amount,
          currency: 'INR',
          returnUrl: `${window.location.origin}/order/${order._id}?payment=success`,
          cancelUrl: `${window.location.origin}/order/${order._id}?payment=failed`,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.success) {
        throw new Error(initData.error || 'Failed to initialize payment');
      }

      // initializePayment returns: { success, gateway, transaction_id, checkout_data, checkout_url, redirect_required }
      const { gateway, checkout_data, checkout_url, redirect_required, transaction_id } = initData;

      if (redirect_required || (gateway === 'PAYU' && checkout_url)) {
        // PayU or other redirect gateways: full-page form POST
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = checkout_url;
        Object.entries(checkout_data || {}).forEach(([k, v]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = k;
          input.value = String(v);
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
        return; // page will navigate away
      }

      if (gateway === 'RAZORPAY' && checkout_data?.order_id) {
        // Razorpay: open popup
        const Razorpay = (window as any).Razorpay;
        if (!Razorpay) throw new Error('Razorpay SDK not loaded');
        const rzp = new Razorpay({
          key: checkout_data.key,
          amount: checkout_data.amount,
          currency: checkout_data.currency,
          order_id: checkout_data.order_id,
          name: 'Print24',
          description: `Order #${order.orderNumber}`,
          handler: async (response: any) => {
            try {
              const verifyRes = await fetch(`${API_BASE_URL}/payment/verify`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  transactionId: transaction_id,
                  gateway: 'RAZORPAY',
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                setPaymentSuccess(true);
                await fetchOrderDetails(); // refresh order status
              } else {
                setPaymentError('Payment verification failed. Please contact support.');
              }
            } catch {
              setPaymentError('Payment verification failed. Please contact support.');
            } finally {
              setPaymentLoading(false);
            }
          },
          modal: { ondismiss: () => setPaymentLoading(false) },
        });
        rzp.open();
        return;
      }

      // Stripe or other: open hosted checkout URL
      if (checkout_url) {
        window.location.href = checkout_url;
        return;
      }

      throw new Error('Gateway configuration not supported for retry payment');
    } catch (err: any) {
      setPaymentError(err.message || 'Payment failed. Please try again.');
      setPaymentLoading(false);
    }
  };

  const getProductionTimeline = (): TimelineEvent[] => {
    if (!order) return [];

    // ── 1. Order Placed ──────────────────────────────────
    const stages: TimelineEvent[] = [
      {
        stage: 'Order Placed',
        status: 'completed',
        timestamp: order.createdAt,
        startedAt: order.createdAt,
        completedAt: order.createdAt,
      },
    ];

    // ── 2. Design & File Prep ────────────────────────────
    // Removed as per request


    // ── 3. Individual Department Steps ───────────────────
    const departmentStatuses = getDepartmentStatuses();

    if (departmentStatuses.length > 0) {
      // Show each department as its own timeline step
      departmentStatuses.forEach((dept) => {
        stages.push({
          stage: dept.departmentName,
          status: dept.status,
          timestamp: dept.startedAt || dept.completedAt,
          startedAt: dept.startedAt,
          completedAt: dept.completedAt,
        });
      });
    } else {
      // No department data yet — show generic "Production" as pending
      stages.push({
        stage: 'Production',
        status: 'pending',
      });
    }

    // ── 4. Packing ───────────────────────────────────────
    const packedAt = order.packedAt || (order.status === 'completed' ? order.updatedAt : undefined);
    if (packedAt) {
      stages.push({
        stage: 'Packing',
        status: 'completed',
        timestamp: packedAt,
        startedAt: order.movedToPackingAt || packedAt,
        completedAt: packedAt,
      });
    } else {
      stages.push({
        stage: 'Packing',
        status: 'pending',
      });
    }

    // ── 5. Shipped / In Transit ──────────────────────────
    const hasShipment = order.awbCode || order.courierPartner || order.trackingId;
    const dispatchedAt = order.dispatchedAt || order.handedOverToCourierAt || order.pickupScheduledDate;
    const isShipped = order.courierStatus && ['in_transit', 'out_for_delivery', 'delivered', 'pickup_completed', 'pickup_scheduled', 'shipment_created'].includes(order.courierStatus);

    if (hasShipment || isShipped) {
      const isDelivered = order.courierStatus === 'delivered';
      const isInTransit = order.courierStatus === 'in_transit' || order.courierStatus === 'out_for_delivery';
      stages.push({
        stage: order.courierStatus === 'out_for_delivery' ? 'Out for Delivery' : 'Shipped',
        status: isDelivered ? 'completed' : isInTransit ? 'completed' : hasShipment ? 'in_progress' : 'pending',
        timestamp: dispatchedAt || order.updatedAt,
        startedAt: dispatchedAt || order.updatedAt,
        completedAt: isDelivered ? order.deliveredAt || undefined : undefined,
      });
    } else {
      stages.push({
        stage: 'Shipped',
        status: 'pending',
      });
    }

    // ── 6. Delivered ─────────────────────────────────────
    if (order.courierStatus === 'delivered' || order.deliveredAt) {
      stages.push({
        stage: 'Delivered',
        status: 'completed',
        timestamp: order.deliveredAt || order.updatedAt,
        startedAt: order.deliveredAt || order.updatedAt,
        completedAt: order.deliveredAt || order.updatedAt,
      });
    } else {
      stages.push({
        stage: 'Delivered',
        status: 'pending',
      });
    }

    return stages;
  };

  const getDepartmentStatuses = (): DepartmentStatus[] => {
    if (!order) return [];

    // If the product has a specific production sequence defined and it's populated
    const sequence = order.product?.productionSequence;

    if (sequence && Array.isArray(sequence) && sequence.length > 0 && typeof sequence[0] === 'object') {
      return sequence.map((seqDept: any) => {
        const deptId = seqDept._id || seqDept;
        const deptName = seqDept.name || 'Unknown';

        // Find if this order actually has a status entry for this sequence department
        const ds = order.departmentStatuses?.find(d => {
          const id = typeof d.department === 'object' ? d.department._id : d.department;
          return id === deptId;
        });

        // Translate paused/stopped back to in_progress for timeline UI purposes
        let statusValue = ds ? ds.status : 'pending';
        if (statusValue === 'paused' || statusValue === 'stopped') {
          statusValue = 'in_progress';
        }

        return {
          departmentName: deptName,
          status: statusValue as 'completed' | 'in_progress' | 'pending',
          startedAt: (typeof ds === 'object' ? ds.startedAt : undefined) || undefined,
          completedAt: (typeof ds === 'object' ? ds.completedAt : undefined) || undefined,
        };
      });
    }

    // Fallback if productionSequence isn't populated or available
    if (!order.departmentStatuses) return [];

    return order.departmentStatuses
      .map((ds) => {
        const dept = typeof ds.department === 'object' ? ds.department : null;
        let status = typeof ds === 'object' ? ds.status : 'pending';
        if (status === 'paused' || status === 'stopped') {
          status = 'in_progress';
        }
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                      <p className="text-sm text-gray-500">Estimated Delivery</p>
                      <p className="font-medium text-gray-900">
                        {(() => {
                          const isProdCompleted = order.status === 'completed' || order.packedAt || order.dispatchedAt || order.courierStatus;
                          const showFinalDate = isProdCompleted && order.estimatedDeliveryDate;
                          const dateToShow = showFinalDate ? order.estimatedDeliveryDate : (order.deliveryDate || order.estimatedDeliveryDate);

                          return dateToShow
                            ? new Date(dateToShow).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })
                            : 'Calculating...';
                        })()}
                      </p>
                      {order.courierStatus && (
                        <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${order.courierStatus === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.courierStatus === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                            order.courierStatus === 'out_for_delivery' ? 'bg-orange-100 text-orange-700' :
                              order.courierStatus === 'return_to_origin' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                          }`}>
                          <Truck className="w-3 h-3" />
                          {order.courierStatus.replace(/_/g, ' ')}
                        </span>
                      )}
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

                {order.isBulkChild && order.parentOrderId && (
                  <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-700">
                      <Layers className="w-5 h-5" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider">Child Order</p>
                        <p className="text-sm">Main order: <span className="font-mono font-bold">{(order.parentOrderId as any).orderNumber || 'Parent Order'}</span></p>
                      </div>
                    </div>
                    <a 
                      href={`/order/${typeof order.parentOrderId === 'object' ? order.parentOrderId._id : order.parentOrderId}`}
                      className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-1"
                    >
                      View Parent
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {order.paymentStatus === 'COMPLETED' && (
                  <button
                    onClick={() => {
                      // Generate invoice download
                      window.open(`${API_BASE_URL}/orders/${order._id}/invoice`, '_blank');
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-300 hover:border-blue-500 text-gray-700 hover:text-blue-600 rounded-lg font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Invoice
                  </button>
                )}
                {/* 🔧 Complaint Management System - Register Complaint Button */}
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      if (!token) {
                        alert('Please login to register a complaint');
                        return;
                      }
                      const response = await fetch(
                        `${API_BASE_URL}/complaints/check-eligibility/${order._id}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                      );
                      const data = await response.json();

                      console.log('📋 Eligibility check response:', data);

                      if (data.existingComplaint) {
                        // ✅ Validate complaint ID before navigation
                        const complaintId = data.existingComplaint._id || data.existingComplaint.id;

                        if (!complaintId) {
                          console.error('❌ Existing complaint found but ID is missing:', data.existingComplaint);
                          alert('Error: Complaint ID not found. Please contact support.');
                          return;
                        }

                        console.log('✅ Navigating to existing complaint:', complaintId);

                        // Show informative message
                        alert(
                          '⚠️ Complaint Already Exists\n\n' +
                          'A complaint has already been registered for this order.\n\n' +
                          'You cannot create a new complaint for the same order.\n\n' +
                          'You will be redirected to view and continue the existing complaint.'
                        );

                        navigate(`/complaints/${complaintId}`);
                      } else if (data.canRegister) {
                        console.log('✅ Can register new complaint for order:', order._id);
                        navigate(`/complaints/register/${order._id}`);
                      } else {
                        console.log('⚠️ Cannot register complaint:', data.message);
                        alert(data.message || 'Cannot register complaint at this time');
                      }
                    } catch (error) {
                      console.error('Complaint check error:', error);
                      alert('Error checking complaint eligibility');
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors shadow-lg"
                >
                  <AlertCircle className="w-4 h-4" />
                  Register Complaint
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
                    {paymentSuccess && (
                      <div className="w-full mb-2 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        Payment successful! Your order is now <strong>confirmed</strong>.
                      </div>
                    )}
                    {paymentError && (
                      <div className="w-full mb-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {paymentError}
                      </div>
                    )}
                    <button
                      onClick={handlePayNow}
                      disabled={paymentLoading}
                      className="group relative w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-600 hover:via-emerald-600 hover:to-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-5 rounded-xl font-bold text-lg shadow-2xl shadow-green-500/40 transition-all duration-300 transform hover:scale-105 hover:shadow-green-500/60 overflow-hidden"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        {paymentLoading ? (
                          <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                        ) : (
                          <><CreditCard className="w-6 h-6" /> Pay Now</>
                        )}
                      </span>
                      {/* Animated shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:translate-x-full transition-transform duration-1000"></div>
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

        {/* Unified Order Progress */}
        {!isPaymentPending && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Order Progress</h3>
                <p className="text-sm text-gray-600">Track your order from production to delivery</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="font-medium text-gray-900">
                  {new Date(order.updatedAt || order.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {/* Unified Timeline */}
            <div className="mb-6">
              <div className="relative">
                <div className="flex flex-col md:flex-row justify-between items-start">
                  {productionTimeline.map((event, idx) => (
                    <TimelineStep
                      key={idx}
                      event={event}
                      isLast={idx === productionTimeline.length - 1}
                      isActive={event.status === 'in_progress'}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Inline Shipment Info (AWB, Courier, EDD) */}
            {(order.awbCode || order.courierPartner || order.trackingId || order.courierStatus) && (
              <div className="border-t border-gray-200 pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-green-600" />
                  <h4 className="text-sm font-bold text-gray-900">Shipment Info</h4>
                  {order.isMockShipment && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">TEST</span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* AWB Code */}
                  <div className="bg-gradient-to-r from-green-50 to-white p-3 rounded-lg border border-green-100">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">AWB / Tracking #</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-bold text-gray-900">
                        {order.awbCode || order.trackingId || 'Generating...'}
                      </p>
                      {(order.awbCode || order.trackingId) && (
                        <button
                          onClick={() => navigator.clipboard.writeText(order.awbCode || order.trackingId || '')}
                          className="p-1 text-gray-400 hover:text-green-600 rounded transition-colors"
                          title="Copy"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Courier Partner + Status */}
                  <div className="bg-gradient-to-r from-blue-50 to-white p-3 rounded-lg border border-blue-100">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Courier Partner</p>
                    <p className="text-sm font-semibold text-gray-900">{order.courierPartner || 'Assigning...'}</p>
                    {order.courierStatus && (
                      <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${order.courierStatus === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.courierStatus === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                          order.courierStatus === 'out_for_delivery' ? 'bg-amber-100 text-amber-700' :
                            order.courierStatus === 'return_to_origin' ? 'bg-red-100 text-red-700' :
                              order.courierStatus === 'shipment_created' ? 'bg-purple-100 text-purple-700' :
                                order.courierStatus === 'pickup_scheduled' ? 'bg-indigo-100 text-indigo-700' :
                                  'bg-gray-100 text-gray-600'
                        }`}>
                        {order.courierStatus.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* EDD & Pickup dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {order.estimatedDeliveryDate && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium">Estimated Delivery</p>
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(order.estimatedDeliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })},{' '}
                          {new Date(order.estimatedDeliveryDate).toLocaleDateString('en-GB', { weekday: 'short' })}
                        </p>
                      </div>
                    </div>
                  )}
                  {order.pickupScheduledDate && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <Package className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-500 font-medium">Pickup Scheduled</p>
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(order.pickupScheduledDate).toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pickup / Dispatch Location (from GeoZone warehouse) */}
                {order.pickupWarehouseName && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-0.5">Dispatching Warehouse</p>
                      <p className="text-sm font-bold text-gray-900">{order.pickupWarehouseName}</p>
                      {order.pickupWarehousePincode && (
                        <p className="text-xs text-gray-500 mt-0.5">Pincode: {order.pickupWarehousePincode}</p>
                      )}
                    </div>
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">PICKUP POINT</span>
                  </div>
                )}

                {/* Delivered Banner */}
                {order.deliveredAt && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <p className="text-gray-900 font-bold">
                        Delivered
                      </p>
                      <p className="text-green-700 font-bold text-sm">
                        Delivered on {new Date(order.deliveredAt).toLocaleDateString('en-US', {
                          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Track on courier website */}
                {order.courierTrackingUrl && (
                  <a
                    href={order.courierTrackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Track on Courier Website
                  </a>
                )}

                {/* Courier Timeline / Activity Log */}
                {order.courierTimeline && order.courierTimeline.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      Shipment Activity
                    </h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {[...order.courierTimeline].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((event, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-2 h-2 rounded-full mt-1.5 ${idx === 0 ? 'bg-blue-500 ring-2 ring-blue-200' : 'bg-gray-300'
                              }`} />
                            {idx < order.courierTimeline!.length - 1 && (
                              <div className="w-0.5 h-full bg-gray-200 mt-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-3">
                            <p className={`text-sm font-medium capitalize ${idx === 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                              {event.status ? event.status.replace(/_/g, ' ') : 'Unknown'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {event.location && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {event.location}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {new Date(event.timestamp).toLocaleString('en-US', {
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <ProductSpecsPanel order={order} />

            {/* ─── Bulk Order Child Designs Section ─────────────────── */}
            {order.isBulkParent && (
              <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <Layers className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Bulk Order — Individual Designs</h3>
                        <p className="text-indigo-200 text-sm mt-0.5">
                          {order.distinctDesigns} design{(order.distinctDesigns || 0) > 1 ? 's' : ''} •{' '}
                          {order.quantity?.toLocaleString()} total copies
                        </p>
                      </div>
                    </div>
                    {order.bulkOrderRef && (
                      <a
                        href={`/bulk-order/${order.bulkOrderRef}`}
                        className="flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all"
                      >
                        Track Bulk Status
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-4 mt-5">
                    <div className="bg-white/10 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-white">{order.distinctDesigns || 0}</p>
                      <p className="text-xs text-indigo-200 font-semibold uppercase tracking-wide mt-1">Designs</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-white">{order.quantity?.toLocaleString()}</p>
                      <p className="text-xs text-indigo-200 font-semibold uppercase tracking-wide mt-1">Total Copies</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-white">
                        {order.distinctDesigns ? Math.round((order.quantity || 0) / order.distinctDesigns) : 0}
                      </p>
                      <p className="text-xs text-indigo-200 font-semibold uppercase tracking-wide mt-1">Copies / Design</p>
                    </div>
                  </div>
                </div>

                {/* Child Order Cards */}
                <div className="p-6">
                  {order.childOrders && order.childOrders.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {order.childOrders.map((child, idx) => {
                        const designImg = child.uploadedDesign?.frontImage?.url || child.uploadedDesign?.frontImage?.data;
                        const productName = typeof child.product === 'object' ? child.product?.name : (order.product?.name || 'Product');
                        const childTotal = child.priceSnapshot?.totalPayable || child.totalPrice || 0;
                        const designNum = child.designSequence ?? (idx + 1);

                        const statusColor = child.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                          child.status === 'processing' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          child.status === 'request' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          'bg-gray-100 text-gray-700 border-gray-200';

                        return (
                          <div
                            key={child._id || idx}
                            className="group relative bg-gradient-to-br from-gray-50 to-white border border-gray-200 hover:border-indigo-300 hover:shadow-md rounded-xl overflow-hidden transition-all duration-200"
                          >
                            {/* Design Number Badge */}
                            <div className="absolute top-3 left-3 z-10 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                              {designNum}
                            </div>

                            {/* Design Preview */}
                            <div className="h-36 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center overflow-hidden border-b border-gray-100">
                              {designImg ? (
                                <img
                                  src={designImg}
                                  alt={`Design ${designNum}`}
                                  className="h-full w-full object-contain p-2"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-2 text-indigo-300">
                                  <ImageIcon className="w-10 h-10" />
                                  <span className="text-xs font-medium">Design {designNum}</span>
                                </div>
                              )}
                            </div>

                            {/* Card Body */}
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">Order</p>
                                  <a
                                    href={`/order/${child._id}`}
                                    className="text-sm font-bold text-indigo-600 hover:text-indigo-800 font-mono truncate block"
                                  >
                                    {child.orderNumber || `—`}
                                  </a>
                                </div>
                                <a
                                  href={`/order/${child._id}`}
                                  className="ml-2 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>

                              <p className="text-sm text-gray-700 font-medium mb-3 truncate">{productName}</p>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-gray-600">
                                  <Package className="w-3.5 h-3.5" />
                                  <span className="text-sm font-semibold">{child.quantity?.toLocaleString() || 0} units</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900">
                                  {formatCurrency(childTotal)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor}`}>
                                  {child.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> :
                                   child.status === 'request' ? <Clock className="w-3 h-3" /> :
                                   <Package className="w-3 h-3" />}
                                  {(child.status || 'pending').replace(/_/g, ' ')}
                                </span>
                                {child.paymentStatus === 'COMPLETED' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <Check className="w-3 h-3" /> Paid
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Child orders not yet created (payment pending or processing)
                    <div className="text-center py-10 px-4">
                      <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Layers className="w-8 h-8 text-indigo-400" />
                      </div>
                      <h4 className="text-base font-bold text-gray-900 mb-2">Designs Being Processed</h4>
                      <p className="text-sm text-gray-500 max-w-xs mx-auto">
                        Individual design orders are created automatically after payment confirmation. 
                        {order.paymentStatus !== 'COMPLETED' && ' Complete payment to start processing.'}
                      </p>
                      {order.bulkOrderRef && (
                        <a
                          href={`/bulk-order/${order.bulkOrderRef}`}
                          className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Track Processing Status
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

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



          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <PriceBreakdownPanel order={order} />

            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
                <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-4 space-y-3">
                <button
                  onClick={() => {
                    if (order.paymentStatus === 'COMPLETED') {
                      window.open(`${API_BASE_URL}/orders/${order._id}/invoice`, '_blank');
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
                <button
                  onClick={() => {
                    if (order.courierTrackingUrl) {
                      window.open(order.courierTrackingUrl, '_blank');
                    }
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 transition-colors ${order.courierTrackingUrl
                    ? 'bg-gray-50 hover:bg-gray-100 cursor-pointer'
                    : 'bg-gray-100 cursor-not-allowed opacity-50'
                    }`}
                  disabled={!order.courierTrackingUrl}
                >
                  <span className="font-medium text-gray-700">Track Order</span>
                  <Truck className="w-4 h-4 text-gray-400" />
                </button>
                {/* View Child Orders Button for Bulk Parents */}
                {order.childOrders && order.childOrders.length > 0 && (
                  <button
                    onClick={() => navigate(`/my-orders?parent=${order._id}`)}
                    className="w-full flex items-center justify-between p-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors mt-2"
                  >
                    <span className="font-medium text-indigo-700">View Child Orders</span>
                    <Layers className="w-4 h-4 text-indigo-500" />
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
                {(order.paymentStatus === 'COMPLETED' || (order.payment_details?.amount_paid && order.payment_details.amount_paid > 0) || (order.advancePaid && order.advancePaid > 0)) && (
                  <div className="flex justify-between items-center pt-2 border-t border-blue-200/50">
                    <span className="text-gray-600 font-medium">Amount Paid</span>
                    <span className="font-bold text-green-700">
                      {formatCurrency(order.payment_details?.amount_paid || order.advancePaid || order.priceSnapshot?.totalPayable || order.totalPrice)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;