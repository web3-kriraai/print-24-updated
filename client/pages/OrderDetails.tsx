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

// Main OrderDetails Component with Enhanced Layout
const OrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setError('Order ID is required');
        setLoading(false);
        return;
      }

      try {
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
        setError(err instanceof Error ? err.message : 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, navigate]);

  const getProductionTimeline = (): TimelineEvent[] => {
    if (!order) return [];

    const getFirstDepartmentStart = () => {
      const firstDept = order.departmentStatuses?.find((ds) => {
        const status = typeof ds === 'object' ? ds.status : null;
        return status === 'in_progress' || status === 'completed';
      });
      return typeof firstDept === 'object' ? firstDept.startedAt : undefined;
    };

    const getLastDepartmentComplete = () => {
      const completedDepts = order.departmentStatuses?.filter((ds) => {
        const status = typeof ds === 'object' ? ds.status : null;
        return status === 'completed';
      });
      if (!completedDepts || completedDepts.length === 0) return undefined;

      const lastCompleted = completedDepts.reduce((latest, ds) => {
        const dsObj = typeof ds === 'object' ? ds : null;
        const latestObj = typeof latest === 'object' ? latest : null;
        if (!dsObj?.completedAt) return latest;
        if (!latestObj?.completedAt) return ds;
        return new Date(dsObj.completedAt) > new Date(latestObj.completedAt) ? ds : latest;
      });

      return typeof lastCompleted === 'object' ? lastCompleted.completedAt : undefined;
    };

    const stages: TimelineEvent[] = [
      {
        stage: 'Order Placed',
        status: 'completed',
        timestamp: order.createdAt,
        startedAt: order.createdAt,
        completedAt: order.createdAt,
      },
    ];

    // Design & File Prep
    const fileUploadedAt = order.uploadedDesign?.frontImage || order.uploadedDesign?.backImage
      ? order.createdAt
      : undefined;

    if (fileUploadedAt) {
      stages.push({
        stage: 'Design & File Prep',
        status: 'completed',
        timestamp: fileUploadedAt,
        startedAt: order.createdAt,
        completedAt: fileUploadedAt,
      });
    } else {
      stages.push({
        stage: 'Design & File Prep',
        status: 'pending',
      });
    }

    // Production
    const hasProductionStarted = order.departmentStatuses?.some(
      (ds) => {
        const status = typeof ds === 'object' ? ds.status : null;
        return status === 'in_progress' || status === 'completed';
      }
    );

    if (hasProductionStarted) {
      const allCompleted = order.departmentStatuses?.every((ds) => {
        const status = typeof ds === 'object' ? ds.status : null;
        return status === 'completed';
      });

      stages.push({
        stage: 'Production',
        status: allCompleted ? 'completed' : 'in_progress',
        timestamp: getFirstDepartmentStart(),
        startedAt: getFirstDepartmentStart(),
        completedAt: allCompleted ? getLastDepartmentComplete() : undefined,
      });
    } else {
      stages.push({
        stage: 'Production',
        status: 'pending',
      });
    }

    // Packing
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

    // Courier
    const dispatchedAt = order.dispatchedAt || order.handedOverToCourierAt;
    if (order.courierPartner || order.trackingId || dispatchedAt) {
      stages.push({
        stage: 'Courier',
        status: 'completed',
        timestamp: dispatchedAt || order.updatedAt,
        startedAt: dispatchedAt || order.handedOverToCourierAt || order.updatedAt,
        completedAt: order.deliveredAt || undefined,
      });
    } else {
      stages.push({
        stage: 'Courier',
        status: 'pending',
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
                      <p className="text-sm text-gray-500">Delivery</p>
                      <p className="font-medium text-gray-900">
                        {order.deliveryDate
                          ? new Date(order.deliveryDate).toLocaleDateString()
                          : 'Not scheduled'}
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
                      window.open(`${API_BASE_URL}/orders/${order._id}/invoice`, '_blank');
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
                    <button className="group relative w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-600 hover:via-emerald-600 hover:to-green-700 text-white px-8 py-5 rounded-xl font-bold text-lg shadow-2xl shadow-green-500/40 transition-all duration-300 transform hover:scale-105 hover:shadow-green-500/60 overflow-hidden">
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        <CreditCard className="w-6 h-6" />
                        Pay Now
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

        {/* Production Timeline */}
        {!isPaymentPending && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Production Status</h3>
                <p className="text-sm text-gray-600">Track your order progress</p>
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

            {/* Timeline */}
            <div className="mb-8">
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

            {/* Department Status */}
            {departmentStatuses.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-900">Production Departments</h4>
                  <span className="text-xs text-blue-600 font-medium">Live Tracking</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {departmentStatuses.map((dept, idx) => (
                    <DepartmentChip key={idx} status={dept} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <ProductSpecsPanel order={order} />

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

            {/* Tracking Information */}
            {order.status === 'completed' && (order.courierPartner || order.trackingId) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Truck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Tracking Information</h3>
                      <p className="text-sm text-gray-600">Delivery updates</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="bg-gradient-to-r from-green-50 to-white p-4 rounded-lg border border-green-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Tracking Number</p>
                        <p className="font-mono text-lg font-bold text-gray-900 bg-white px-3 py-2 rounded border border-gray-200">
                          {order.trackingId || 'TRK-99887766'}
                        </p>
                      </div>
                      {order.courierPartner && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Courier Partner</p>
                          <p className="text-lg font-semibold text-gray-900">{order.courierPartner}</p>
                        </div>
                      )}
                    </div>
                    {order.deliveredAt && (
                      <div className="mt-4 pt-4 border-t border-green-100">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <p className="text-green-700 font-medium">
                            Delivered on {new Date(order.deliveredAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
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
                <button className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                  <span className="font-medium text-gray-700">Track Order</span>
                  <Truck className="w-4 h-4 text-gray-400" />
                </button>
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
      </div>
    </div>
  );
};

export default OrderDetails;