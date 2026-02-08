import React, { useState, useEffect } from "react";
import { useClientOnly } from "../hooks/useClientOnly";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Package,
  ShoppingBag,
  CreditCard,
  Truck,
  MapPin,
  CheckCircle,
  Clock,
  Eye,
  X,
  Image as ImageIcon,
  Info,
  ArrowRight,
  Box,
  AlertCircle,
  Settings as SettingsIcon,
  Edit,
  Loader,
  Phone,
  Building2,
  FileText,
} from "lucide-react";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../lib/apiConfig";
import { calculateOrderBreakdown, OrderForCalculation } from "../utils/pricing";
import BackButton from "../components/BackButton";

interface UserData {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  mobileNumber?: string;
  countryCode?: string;
  role: string;
  userType?: string;
  // Print Partner specific fields
  businessName?: string;
  ownerName?: string;
  whatsappNumber?: string;
  gstNumber?: string;
  fullBusinessAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  proofFileUrl?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  product: {
    _id: string;
    name: string;
    image: string;
    basePrice?: number;
    gstPercentage?: number;
    additionalDesignCharge?: number;
    options?: any[];
    filters?: any;
    subcategory?: {
      name: string;
      image?: string;
      category?: {
        name: string;
      };
    } | string;
  };
  quantity: number;
  finish: string;
  shape: string;
  selectedOptions: Array<{
    optionId: string;
    optionName: string;
    name?: string;
    priceAdd: number;
    description?: string;
    image?: string;
  }> | string[];
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
  advancePaid?: number;
  status: "request" | "production_ready" | "approved" | "processing" | "completed" | "cancelled" | "rejected";
  currentDepartment?: {
    _id: string;
    name: string;
    sequence: number;
  } | string | null;
  courierPartner?: string;
  trackingId?: string;
  deliveryDate: string | null;
  deliveredAt?: string | null;
  pincode: string;
  address: string;
  mobileNumber: string;
  createdAt: string;
  notes?: string;
  departmentStatuses?: Array<{
    department: {
      _id: string;
      name: string;
      sequence: number;
    } | string;
    status: "pending" | "in_progress" | "paused" | "completed" | "stopped";
    startedAt: string | null;
    pausedAt: string | null;
    completedAt: string | null;
    stoppedAt: string | null;
    operator: { _id: string; name: string; email: string } | null;
    notes: string;
  }>;
  productionTimeline?: Array<{
    department: {
      _id: string;
      name: string;
    } | string;
    action: string;
    timestamp: string;
    operator: { _id: string; name: string; email: string } | null;
    notes: string;
  }>;
}

// Format currency helper
const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Subcategory Image Component with error handling
const SubcategoryImage: React.FC<{
  subcategory: Order["product"]["subcategory"];
}> = ({ subcategory }) => {
  const [imageError, setImageError] = useState(false);
  const subcategoryImage =
    typeof subcategory === "object" ? subcategory?.image : null;

  if (subcategoryImage && !imageError) {
    return (
      <img
        src={subcategoryImage}
        alt={typeof subcategory === "object" ? subcategory.name : "Subcategory"}
        className="w-24 h-24 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300 shadow-sm"
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300 group-hover:scale-105 transition-transform duration-300">
      <Box className="w-8 h-8" />
    </div>
  );
};

// OrdersList Component
interface OrdersListProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

const OrdersList: React.FC<OrdersListProps> = ({ orders, onSelectOrder }) => {
  const isClient = useClientOnly();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrderExpansion = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const isCompleted = order.status === "completed";
        const isProcessing = order.status === "processing" || order.status === "approved" || order.status === "production_ready";
        const isPendingPayment = order.status === "request";

        // Calculate progress percentage based on department completion
        const departmentStatuses = order.departmentStatuses || [];
        const totalDepts = departmentStatuses.length;

        // Count completed departments - handle both object and lean() formats
        const completedDepts = departmentStatuses.filter((ds) => {
          if (!ds) return false;
          // Handle both Mongoose document and plain object formats
          if (typeof ds === "object" && ds.status) {
            return ds.status === "completed";
          }
          return false;
        }).length;

        // Calculate progress percentage
        let progressPercent = 0;
        if (totalDepts > 0) {
          progressPercent = Math.round((completedDepts / totalDepts) * 100);
        } else if (isCompleted) {
          // If order is completed but no departments, show 100%
          progressPercent = 100;
        } else if (isProcessing) {
          // If order is in production but no departments yet, show 0% (just starting)
          progressPercent = 0;
        }

        // Show progress bar if order is not pending payment
        // Show for all non-pending-payment orders (processing, approved, production_ready, completed)
        const shouldShowProgress = !isPendingPayment;

        const isExpanded = expandedOrders.has(order._id);

        // Calculate price breakdown
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
            name: typeof opt === 'string' ? opt : (opt.optionName || opt.name || ''),
            optionName: typeof opt === 'string' ? opt : (opt.optionName || opt.name || ''),
            priceAdd: typeof opt === 'string' ? 0 : (opt.priceAdd || 0),
          })),
          selectedDynamicAttributes: order.selectedDynamicAttributes?.map((attr) => ({
            attributeName: attr.attributeName,
            label: attr.label,
            priceMultiplier: attr.priceMultiplier,
            priceAdd: attr.priceAdd,
          })),
        };

        const calculations = calculateOrderBreakdown(orderForCalc) as any;

        // Get additional design charge from product
        const additionalDesignCharge = (order.product as any)?.additionalDesignCharge || 0;

        // New calculation order:
        // 1. Base Price = quantity * price
        // 2. Add options/attributes/charges
        // 3. Subtotal before discount
        // 4. Apply discount to subtotal
        // 5. Add design charge
        // 6. Subtotal including design charge (after discount)
        // 7. Add GST (on discounted subtotal + design charge)
        // 8. Final total

        const subtotalBeforeDiscount = calculations.subtotalBeforeGst || calculations.rawBaseTotal + calculations.optionBreakdowns.reduce((sum: number, opt: any) => sum + opt.cost, 0);
        const subtotalAfterDiscount = calculations.subtotalAfterDiscount || calculations.subtotal || subtotalBeforeDiscount;
        const discountAmount = calculations.discountAmount || (subtotalBeforeDiscount - subtotalAfterDiscount);
        const subtotalWithDesignCharge = subtotalAfterDiscount + additionalDesignCharge;
        // GST is calculated on discounted subtotal + design charge
        const gstAmount = (subtotalWithDesignCharge * (order.product?.gstPercentage || 18)) / 100;
        const finalTotal = subtotalWithDesignCharge + gstAmount;

        // Use stored totalPrice as source of truth
        const storedTotal = order.totalPrice;

        return (
          <div
            key={order._id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-brand-300 transition-all duration-200 overflow-hidden group"
          >
            <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
              {/* Subcategory Image */}
              <div className="shrink-0">
                <SubcategoryImage subcategory={order.product?.subcategory} />
              </div>

              {/* Main Info */}
              <div className="flex-1 min-w-0 self-start md:self-center">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {order.orderNumber}
                  </span>
                  <span className="text-xs text-slate-400">
                    {!isClient
                      ? "Loading..."
                      : new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Category & Subcategory */}
                {order.product?.subcategory && (
                  <div className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-0.5">
                    {typeof order.product.subcategory === "object"
                      ? order.product.subcategory.category
                        ? `${order.product.subcategory.category.name} • ${order.product.subcategory.name}`
                        : order.product.subcategory.name
                      : order.product.subcategory}
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-900 truncate pr-4">
                  {order.product?.name || "Product"}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {order.quantity.toLocaleString()} units • {order.finish}
                </p>
              </div>

              {/* Status & Price */}
              <div className="flex flex-col md:items-end gap-2 md:w-64 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 mt-4 md:mt-0">
                <div className="flex items-center justify-between md:justify-end gap-3 w-full">
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(order.totalPrice)}
                  </span>
                  <div
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${isCompleted
                      ? "bg-green-50 text-green-700 border-green-200"
                      : isProcessing
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                  >
                    {order.status.replace("_", " ").toUpperCase()}
                  </div>
                </div>

                {isPendingPayment ? (
                  <div className="flex items-center justify-end text-red-600 text-sm font-medium gap-1.5 animate-pulse w-full">
                    <AlertCircle className="w-4 h-4" />
                    Payment Required
                  </div>
                ) : shouldShowProgress ? (
                  <div className="w-full md:max-w-[200px] group/progress cursor-pointer">
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>Production Progress</span>
                      <span className="font-semibold text-slate-700">{progressPercent}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden relative group-hover/progress:bg-slate-200 transition-colors">
                      <div
                        className="h-full bg-green-400 group-hover/progress:bg-green-300 rounded-full transition-all duration-300 ease-out shadow-sm group-hover/progress:shadow-md"
                        style={{
                          width: `${Math.max(0, Math.min(100, progressPercent))}%`,
                          minWidth: progressPercent > 0 ? '4px' : '0px'
                        }}
                      />
                    </div>
                    {totalDepts > 0 ? (
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        {completedDepts} of {totalDepts} departments completed
                      </p>
                    ) : isCompleted ? (
                      <p className="text-[10px] text-green-600 mt-1.5 font-medium">Order completed</p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1.5">Production starting...</p>
                    )}
                  </div>
                ) : (
                  <div className="w-full md:max-w-[200px]">
                    <p className="text-xs text-slate-400">Waiting for production to start</p>
                  </div>
                )}
              </div>

              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={(e) => toggleOrderExpansion(order._id, e)}
                  className="text-xs text-slate-500 hover:text-brand-600 font-medium px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors"
                >
                  {isExpanded ? 'Hide' : 'Show'} Breakdown
                </button>
                <div className="text-slate-300 group-hover:text-brand-500 transition-colors">
                  <ArrowRight className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Price Breakdown Panel - Same as Order Summary */}
            {isExpanded && (
              <div className="border-t border-slate-200 bg-slate-50">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CreditCard size={18} />
                    Price Breakdown
                  </h3>
                  <div className="space-y-3 text-sm">
                    {/* Step 1: Base Price = quantity * price */}
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <div className="text-slate-600">
                        <span>
                          Base Price ({order.quantity.toLocaleString()} ×{' '}
                          {formatCurrency(order.product?.basePrice || 0)})
                        </span>
                      </div>
                      <span className="font-medium text-slate-900">{formatCurrency(calculations.rawBaseTotal)}</span>
                    </div>

                    {/* Step 2: Options, Attributes, and Charges */}
                    {calculations.optionBreakdowns.map((opt: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-slate-600">
                        <span>
                          {opt.name} {opt.isPerUnit ? `(${order.quantity} × ${formatCurrency(opt.priceAdd)})` : ''}
                        </span>
                        <span>+{formatCurrency(opt.cost)}</span>
                      </div>
                    ))}

                    {/* Step 3: Subtotal (before discount) */}
                    <div className="flex justify-between items-center pt-2 font-medium text-slate-900 border-t border-slate-100">
                      <span>Subtotal (Before Discount)</span>
                      <span>{formatCurrency(subtotalBeforeDiscount)}</span>
                    </div>

                    {/* Step 4: Discount (applied to subtotal before GST) */}
                    {calculations.discountPercentage > 0 && discountAmount > 0 && (
                      <div className="flex justify-between items-center text-green-600 bg-green-50 p-2 rounded-md">
                        <div>
                          <span className="font-semibold">
                            Bulk Discount ({calculations.discountPercentage}%)
                          </span>
                          <p className="text-xs opacity-80">Applied for {order.quantity} units</p>
                        </div>
                        <span className="font-bold">-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}

                    {/* Step 5: Subtotal (after discount) */}
                    <div className="flex justify-between items-center pt-2 font-medium text-slate-900 border-t border-slate-100">
                      <span>Subtotal (After Discount)</span>
                      <span>{formatCurrency(subtotalAfterDiscount)}</span>
                    </div>

                    {/* Step 6: Additional Design Charge */}
                    {additionalDesignCharge > 0 && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Additional Design Charge</span>
                        <span>+{formatCurrency(additionalDesignCharge)}</span>
                      </div>
                    )}

                    {/* Step 7: Subtotal (including design charge) */}
                    {additionalDesignCharge > 0 && (
                      <div className="flex justify-between items-center pt-2 font-medium text-slate-900 border-t border-slate-100">
                        <span>Subtotal (Including Design Charge)</span>
                        <span>{formatCurrency(subtotalWithDesignCharge)}</span>
                      </div>
                    )}

                    {/* Step 8: GST (calculated on discounted subtotal + design charge) */}
                    <div className="flex justify-between items-center text-slate-500 text-xs">
                      <span>GST ({order.product?.gstPercentage || 18}%)</span>
                      <span>+{formatCurrency(gstAmount)}</span>
                    </div>

                    {/* Advance Paid / Balance Due (before Total Amount) */}
                    {(order.advancePaid !== undefined && order.advancePaid > 0) && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-500">Advance Paid</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(order.advancePaid || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Balance Due</span>
                          <span
                            className={`font-bold ${order.totalPrice - (order.advancePaid || 0) > 0
                              ? 'text-red-600'
                              : 'text-slate-400'
                              }`}
                          >
                            {formatCurrency(order.totalPrice - (order.advancePaid || 0))}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Step 9: Final Total - Displayed at the end */}
                    <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-slate-300">
                      <span className="text-lg font-bold text-slate-900">Total Amount</span>
                      <span className="text-xl font-bold text-brand-600">{formatCurrency(storedTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Clickable area for navigation */}
            <div
              onClick={() => onSelectOrder(order)}
              className="cursor-pointer"
            >
              <div className="px-6 pb-4 md:pb-6 flex items-center justify-between">
                <button className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                  View Full Details
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="md:hidden">
                  <button
                    onClick={(e) => toggleOrderExpansion(order._id, e)}
                    className="text-xs text-slate-500 hover:text-brand-600 font-medium px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    {isExpanded ? 'Hide' : 'Show'} Breakdown
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const isClient = useClientOnly();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [currentView, setCurrentView] = useState<"dashboard" | "orders">("dashboard");
  const [previousProgress, setPreviousProgress] = useState<{ [key: string]: number }>({});
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [updatingEmail, setUpdatingEmail] = useState(false);

  // Profile editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobileNumber: "",
    countryCode: "+91",
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // OTP states for mobile update
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSentTo, setOtpSentTo] = useState("");

  // Country data for displaying country name and flag
  const [countryName, setCountryName] = useState<string>("");
  const [countryFlagUrl, setCountryFlagUrl] = useState<string>("");
  const [countryNameFetched, setCountryNameFetched] = useState<boolean>(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(user);
      setUserData(parsedUser);
      setLoading(false);
      // Fetch country name if country code exists in localStorage
      if (parsedUser.countryCode) {
        fetchCountryName(parsedUser.countryCode);
      }
      // Fetch full profile from API
      fetchUserProfile();
      // Fetch orders immediately
      fetchRecentOrders();
    } catch (error) {
      console.error("Error parsing user data:", error);
      navigate("/login");
    }
  }, [navigate]);

  // Fetch user profile from API
  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          // Debug: Log user data to check if print partner fields are present
          console.log("Fetched user profile data:", data.user);
          console.log("User type:", data.user.userType);
          console.log("Print partner fields:", {
            businessName: data.user.businessName,
            ownerName: data.user.ownerName,
            gstNumber: data.user.gstNumber,
          });

          setUserData(data.user);
          // Update localStorage
          localStorage.setItem("user", JSON.stringify(data.user));
          // Initialize edit form
          setEditFormData({
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            email: data.user.email || "",
            mobileNumber: data.user.mobileNumber?.replace(data.user.countryCode || "", "") || "",
            countryCode: data.user.countryCode || "+91",
          });

          // Fetch country name based on country code
          if (data.user.countryCode) {
            setCountryNameFetched(false);
            fetchCountryName(data.user.countryCode);
          } else {
            setCountryNameFetched(true);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  // Fetch country name and flag from REST Countries API
  const fetchCountryName = async (countryCode: string) => {
    if (!countryCode) {
      setCountryNameFetched(true);
      return;
    }

    // First try fallback mapping (faster and more reliable)
    const countryMap: Record<string, { name: string; code: string }> = {
      "+1": { name: "United States", code: "us" },
      "+91": { name: "India", code: "in" },
      "+44": { name: "United Kingdom", code: "gb" },
      "+55": { name: "Brazil", code: "br" },
      "+61": { name: "Australia", code: "au" },
      "+971": { name: "United Arab Emirates", code: "ae" },
      "+86": { name: "China", code: "cn" },
      "+81": { name: "Japan", code: "jp" },
      "+49": { name: "Germany", code: "de" },
      "+33": { name: "France", code: "fr" },
      "+7": { name: "Russia", code: "ru" },
      "+65": { name: "Singapore", code: "sg" },
      "+60": { name: "Malaysia", code: "my" },
      "+66": { name: "Thailand", code: "th" },
      "+82": { name: "South Korea", code: "kr" },
      "+39": { name: "Italy", code: "it" },
      "+34": { name: "Spain", code: "es" },
      "+31": { name: "Netherlands", code: "nl" },
      "+32": { name: "Belgium", code: "be" },
      "+41": { name: "Switzerland", code: "ch" },
      "+46": { name: "Sweden", code: "se" },
      "+47": { name: "Norway", code: "no" },
      "+45": { name: "Denmark", code: "dk" },
      "+358": { name: "Finland", code: "fi" },
      "+48": { name: "Poland", code: "pl" },
      "+351": { name: "Portugal", code: "pt" },
      "+30": { name: "Greece", code: "gr" },
      "+27": { name: "South Africa", code: "za" },
      "+20": { name: "Egypt", code: "eg" },
      "+52": { name: "Mexico", code: "mx" },
      "+54": { name: "Argentina", code: "ar" },
      "+56": { name: "Chile", code: "cl" },
      "+57": { name: "Colombia", code: "co" },
      "+51": { name: "Peru", code: "pe" },
      "+92": { name: "Pakistan", code: "pk" },
      "+880": { name: "Bangladesh", code: "bd" },
      "+94": { name: "Sri Lanka", code: "lk" },
      "+95": { name: "Myanmar", code: "mm" },
      "+84": { name: "Vietnam", code: "vn" },
      "+62": { name: "Indonesia", code: "id" },
      "+63": { name: "Philippines", code: "ph" },
      "+64": { name: "New Zealand", code: "nz" },
      "+246": { name: "British Indian Ocean Territory", code: "io" },
    };

    // Check fallback first (instant result)
    if (countryMap[countryCode]) {
      setCountryName(countryMap[countryCode].name);
      setCountryFlagUrl(`https://flagcdn.com/w40/${countryMap[countryCode].code}.png`);
      setCountryNameFetched(true);
      return;
    }

    // If not in fallback, try API with AbortController to handle errors gracefully
    const abortController = new AbortController();
    try {
      const numericCode = countryCode.replace("+", "");
      const response = await fetch(`https://restcountries.com/v3.1/callingcode/${numericCode}`, {
        signal: abortController.signal,
      });

      // Handle 404 and other non-ok responses gracefully
      if (!response.ok) {
        // If API returns 404 or other error, just set empty values
        setCountryName("");
        setCountryFlagUrl("");
        setCountryNameFetched(true);
        return;
      }

      const countries = await response.json();
      if (countries && Array.isArray(countries) && countries.length > 0) {
        // Get the first country (some codes map to multiple countries)
        const country = countries[0];
        setCountryName(country.name?.common || "");
        // Get country code for flag (cca2 is the 2-letter country code)
        const countryCode2 = country.cca2?.toLowerCase() || "";
        if (countryCode2) {
          setCountryFlagUrl(`https://flagcdn.com/w40/${countryCode2}.png`);
        } else {
          setCountryFlagUrl("");
        }
        setCountryNameFetched(true);
        return;
      }

      // If no countries found, set empty
      setCountryName("");
      setCountryFlagUrl("");
      setCountryNameFetched(true);
    } catch (error: any) {
      // Handle aborted requests and network errors silently
      if (error.name === 'AbortError' || (error instanceof TypeError && error.message.includes('fetch'))) {
        // Network error or aborted - silently fail
        setCountryName("");
        setCountryFlagUrl("");
        setCountryNameFetched(true);
      } else if (error.name !== 'AbortError') {
        // Other errors - log but don't break
        console.warn("Error fetching country name:", error);
        setCountryName("");
        setCountryFlagUrl("");
        setCountryNameFetched(true);
      }

      // Try fallback mapping as last resort
      const fallback = countryMap[countryCode];
      if (fallback) {
        setCountryName(fallback.name);
        setCountryFlagUrl(`https://flagcdn.com/w40/${fallback.code}.png`);
        setCountryNameFetched(true);
      }
    }
  };

  // Helper function to format mobile number (remove country code if already included)
  const formatMobileNumber = (mobileNumber: string | undefined, countryCode: string | undefined): string => {
    if (!mobileNumber) return "";
    if (!countryCode) return mobileNumber;

    // Remove country code from mobile number if it's already included
    const codeWithoutPlus = countryCode.replace("+", "");
    let cleanNumber = mobileNumber;

    // Check if mobile number starts with country code
    if (mobileNumber.startsWith(countryCode)) {
      cleanNumber = mobileNumber.replace(countryCode, "");
    } else if (mobileNumber.startsWith(codeWithoutPlus)) {
      cleanNumber = mobileNumber.replace(codeWithoutPlus, "");
    }

    // Return formatted: countryCode + space + number
    return `${countryCode} ${cleanNumber}`;
  };

  // Fetch country name when country code is available
  useEffect(() => {
    if (userData?.countryCode) {
      // Reset fetch state when country code changes
      setCountryNameFetched(false);
      setCountryName("");
      setCountryFlagUrl("");
      // Only fetch if we don't already have the country name or if country code changed
      fetchCountryName(userData.countryCode);
    } else {
      setCountryNameFetched(true);
    }
  }, [userData?.countryCode]);

  // Real-time polling for order updates - Optimized to not show loader
  useEffect(() => {
    if (!userData) return;

    // Poll every 15 seconds for order updates (reduced frequency for better performance)
    const pollInterval = setInterval(() => {
      fetchRecentOrders();
    }, 15000); // 15 seconds

    return () => clearInterval(pollInterval);
  }, [userData, orders.length]); // Include orders.length to avoid stale closure

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
  };

  // Fetch user's orders from API - Optimized for fast loading
  const fetchRecentOrders = async () => {
    // Don't show loader if we already have orders (for polling updates)
    const isInitialLoad = orders.length === 0;
    if (isInitialLoad) {
      setLoadingOrders(true);
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setOrders([]);
        return;
      }

      // Fetch with limit for faster initial load
      const response = await fetch(`${API_BASE_URL}/orders/my-orders?limit=50`, {
        method: "GET",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
      });

      const text = await response.text();

      // Check if server returned HTML instead of JSON
      if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
        console.warn("Server returned HTML instead of JSON");
        setOrders([]);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = JSON.parse(text);
      // Backend returns array directly for faster response
      const newOrders = Array.isArray(data) ? data : [];

      // Update previous progress for smooth animations (only if changed)
      const progressUpdates: { [key: string]: number } = {};
      newOrders.forEach((order: Order) => {
        const totalDepts = order.departmentStatuses?.length || 0;
        const completedDepts =
          order.departmentStatuses?.filter((ds) => {
            const status = typeof ds === "object" ? ds.status : null;
            return status === "completed";
          }).length || 0;

        const progressPercent = totalDepts > 0 ? (completedDepts / totalDepts) * 100 : 0;

        if (previousProgress[order._id] !== progressPercent) {
          progressUpdates[order._id] = progressPercent;
        }
      });

      // Batch update progress state
      if (Object.keys(progressUpdates).length > 0) {
        setPreviousProgress((prev) => ({
          ...prev,
          ...progressUpdates,
        }));
      }

      setOrders(newOrders);
    } catch (err) {
      console.error("Error fetching orders:", err);
      // Don't clear orders on error during polling, only on initial load
      if (isInitialLoad) {
        setOrders([]);
      }
    } finally {
      if (isInitialLoad) {
        setLoadingOrders(false);
      }
    }
  };

  const handleSelectOrder = (order: Order) => {
    navigate(`/order/${order._id}`);
    window.scrollTo(0, 0);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-teal-500",
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  // Validate email function
  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return "Email is required";
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return "Invalid email format. Please enter a valid email address (e.g., user@example.com)";
    }

    // Check if email is the same as current
    if (email.trim() === userData?.email) {
      return "New email must be different from current email";
    }

    // Check for common email issues
    if (email.trim().length > 254) {
      return "Email is too long (maximum 254 characters)";
    }

    if (email.includes("..")) {
      return "Email cannot contain consecutive dots";
    }

    if (email.startsWith(".") || email.endsWith(".")) {
      return "Email cannot start or end with a dot";
    }

    if (email.includes("@.") || email.includes(".@")) {
      return "Invalid email format";
    }

    return null; // Valid email
  };

  // Update Profile
  const handleUpdateProfile = async () => {
    // Validate required fields
    if (!editFormData.firstName || !editFormData.lastName) {
      setProfileError("First name and last name are required.");
      return;
    }

    // Validate email if provided
    if (editFormData.email && validateEmail(editFormData.email)) {
      setProfileError(validateEmail(editFormData.email));
      return;
    }

    setUpdatingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          firstName: editFormData.firstName.trim(),
          lastName: editFormData.lastName.trim(),
          email: editFormData.email.trim() || undefined,
          // Note: mobileNumber and countryCode are not included as they cannot be changed
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to update profile");
      }

      setProfileSuccess("Profile updated successfully!");

      // Update user data in state and localStorage
      const updatedUserData = {
        ...userData!,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        name: data.user.name,
        email: data.user.email,
        countryCode: data.user.countryCode,
      };
      setUserData(updatedUserData);
      localStorage.setItem("user", JSON.stringify(updatedUserData));

      // Fetch country name if country code exists
      if (data.user.countryCode) {
        fetchCountryName(data.user.countryCode);
      } else if (updatedUserData.countryCode) {
        fetchCountryName(updatedUserData.countryCode);
      }

      // Reset form after a short delay
      setTimeout(() => {
        setIsEditingProfile(false);
        setProfileSuccess(null);
      }, 2000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdateEmail = async () => {
    // Validate email
    const validationError = validateEmail(newEmail);
    if (validationError) {
      setEmailError(validationError);
      return;
    }

    setUpdatingEmail(true);
    setEmailError(null);
    setEmailSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-email`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          email: newEmail.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to update email");
      }

      setEmailSuccess("Email updated successfully!");

      // Update user data in state and localStorage
      const updatedUserData = {
        ...userData!,
        email: data.user.email,
      };
      setUserData(updatedUserData);
      localStorage.setItem("user", JSON.stringify(updatedUserData));

      // Reset form after a short delay
      setTimeout(() => {
        setIsEditingEmail(false);
        setNewEmail("");
        setEmailSuccess(null);
      }, 2000);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Failed to update email");
    } finally {
      setUpdatingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <div className="max-w-6xl mx-auto space-y-10">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Hello, {userData.name.split(" ")[0]}.
                </h1>
                <p className="text-slate-500 mt-2">
                  Here's what's going on in your account.
                </p>
              </div>
              <button
                onClick={() => setCurrentView("orders")}
                className="flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 font-medium px-5 py-2.5 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
              >
                <SettingsIcon className="w-4 h-4" />
                View All Orders
              </button>
            </div>

            {/* Account Snapshot */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Account snapshot</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div
                  onClick={() => setCurrentView("orders")}
                  className="bg-slate-100 rounded-xl p-6 min-h-[140px] flex flex-col justify-between hover:bg-slate-200 transition-colors cursor-pointer border border-transparent hover:border-slate-300 group"
                >
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">
                    Orders
                  </span>
                  <span className="text-4xl font-bold text-slate-900">{orders.length}</span>
                </div>
                <div className="bg-slate-100 rounded-xl p-6 min-h-[140px] flex flex-col justify-between hover:bg-slate-200 transition-colors cursor-pointer border border-transparent hover:border-slate-300 group">
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">
                    Account Status
                  </span>
                  <span className="text-lg font-bold text-slate-900 text-green-600 group-hover:text-green-700 flex items-center gap-1">
                    Active <CheckCircle className="w-5 h-5" />
                  </span>
                </div>
              </div>

              {/* Latest Delivery Arrive Time */}
              {(() => {
                const deliveredOrders = orders.filter(
                  (order) => order.deliveredAt && order.status === "completed"
                );
                const latestDelivery = deliveredOrders.sort(
                  (a, b) =>
                    new Date(b.deliveredAt || 0).getTime() -
                    new Date(a.deliveredAt || 0).getTime()
                )[0];

                if (latestDelivery && latestDelivery.deliveredAt) {
                  return (
                    <div className="mt-6 bg-green-50 rounded-xl p-6 border border-green-200">
                      <div className="flex items-center gap-3 mb-2">
                        <Truck className="w-5 h-5 text-green-600" />
                        <h3 className="text-sm font-bold text-slate-900">Latest Delivery</h3>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">
                        Order: <span className="font-mono font-medium">{latestDelivery.orderNumber}</span>
                      </p>
                      <p className="text-sm text-slate-600">
                        Arrived on:{" "}
                        <span className="font-semibold text-green-700">
                          {new Date(latestDelivery.deliveredAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Latest Delivery Section */}
            {(() => {
              const deliveredOrders = orders.filter(
                (order) => order.deliveredAt && order.status === "completed"
              );
              const latestDelivery = deliveredOrders.sort(
                (a, b) =>
                  new Date(b.deliveredAt || 0).getTime() -
                  new Date(a.deliveredAt || 0).getTime()
              )[0];

              if (latestDelivery) {
                return (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <Truck className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Latest Delivery</h2>
                        <p className="text-sm text-slate-600">
                          Your most recent order delivery
                        </p>
                      </div>
                    </div>
                    <div
                      onClick={() => handleSelectOrder(latestDelivery)}
                      className="bg-white rounded-lg p-4 border border-green-200 hover:border-green-300 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {latestDelivery.product?.image && (
                            <img
                              src={latestDelivery.product.image}
                              alt={latestDelivery.product.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <p className="font-semibold text-slate-900">
                              {latestDelivery.product?.name || "Product"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {latestDelivery.orderNumber}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 mb-1">Delivered on</p>
                          <p className="font-semibold text-green-700">
                            {new Date(latestDelivery.deliveredAt || "").toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-green-100">
                        <span className="text-sm text-slate-600">
                          {latestDelivery.quantity.toLocaleString()} units
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(latestDelivery.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Recent Orders Preview */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Recent Orders</h2>
                <button
                  onClick={() => setCurrentView("orders")}
                  className="text-sm font-semibold text-slate-900 underline hover:text-brand-600"
                >
                  View all
                </button>
              </div>
              {loadingOrders && orders.length === 0 ? (
                // Skeleton loaders for faster perceived performance
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                      <div className="flex items-center gap-6">
                        <div className="flex-1 space-y-3">
                          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                          <div className="h-5 bg-slate-200 rounded w-2/3"></div>
                          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                        </div>
                        <div className="w-32 space-y-2">
                          <div className="h-6 bg-slate-200 rounded"></div>
                          <div className="h-2 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                  <Package size={48} className="mx-auto mb-4 opacity-50 text-slate-400" />
                  <p className="text-slate-600 mb-4">You haven't placed any orders yet.</p>
                  <Link
                    to="/"
                    className="inline-block bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors"
                  >
                    Browse Products
                  </Link>
                </div>
              ) : (
                <OrdersList orders={orders.slice(0, 2)} onSelectOrder={handleSelectOrder} />
              )}
            </div>
          </div>
        );

      case "orders":
        return (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Order History</h1>
              <button
                onClick={() => setCurrentView("dashboard")}
                className="text-sm font-semibold text-slate-600 hover:text-brand-600"
              >
                ← Back to Dashboard
              </button>
            </div>
            {loadingOrders && orders.length === 0 ? (
              // Skeleton loaders for faster perceived performance
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                    <div className="flex items-center gap-6">
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-5 bg-slate-200 rounded w-2/3"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      </div>
                      <div className="w-32 space-y-2">
                        <div className="h-6 bg-slate-200 rounded"></div>
                        <div className="h-2 bg-slate-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <Package size={48} className="mx-auto mb-4 opacity-50 text-slate-400" />
                <p className="text-slate-600 mb-4">You haven't placed any orders yet.</p>
                <Link
                  to="/"
                  className="inline-block bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors"
                >
                  Browse Products
                </Link>
              </div>
            ) : (
              <OrdersList orders={orders} onSelectOrder={handleSelectOrder} />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Information Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-8"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full ${getRandomColor(
                userData.name
              )} flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-lg ring-4 ring-white`}
            >
              {getInitials(userData.name)}
            </motion.div>

            {/* User Details */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-3 mb-2 flex-wrap justify-center sm:justify-start">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {userData.name}
                </h1>
                {(userData.userType === "print partner" || userData.userType === "Print Partner") && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                    Print Partner
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="w-full">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <Mail size={16} className="text-slate-400 shrink-0 mt-1 sm:mt-0" />
                    {isEditingEmail ? (
                      <div className="flex-1 w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNewEmail(value);
                            setEmailSuccess(null);

                            // Real-time validation (only show error if user has started typing and moved away or if it's clearly invalid)
                            if (value.trim() && value.trim() !== userData?.email) {
                              const error = validateEmail(value);
                              setEmailError(error);
                            } else {
                              setEmailError(null);
                            }
                          }}
                          onBlur={(e) => {
                            // Validate on blur
                            const value = e.target.value;
                            if (value.trim()) {
                              const error = validateEmail(value);
                              setEmailError(error);
                            } else {
                              setEmailError(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              // Validate before submitting
                              const error = validateEmail(newEmail);
                              if (error) {
                                setEmailError(error);
                              } else {
                                handleUpdateEmail();
                              }
                            } else if (e.key === "Escape") {
                              setIsEditingEmail(false);
                              setNewEmail("");
                              setEmailError(null);
                              setEmailSuccess(null);
                            }
                          }}
                          className={`flex-1 w-full sm:min-w-[200px] px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition-colors ${emailError
                            ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
                            : newEmail.trim() && newEmail.trim() !== userData?.email && !validateEmail(newEmail)
                              ? 'border-green-300 bg-green-50'
                              : 'border-slate-300'
                            }`}
                          placeholder="Enter new email"
                          autoFocus
                        />
                        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => {
                              const error = validateEmail(newEmail);
                              if (error) {
                                setEmailError(error);
                              } else {
                                handleUpdateEmail();
                              }
                            }}
                            disabled={updatingEmail || !newEmail.trim() || !!validateEmail(newEmail)}
                            className="flex-1 sm:flex-initial px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm whitespace-nowrap"
                          >
                            {updatingEmail ? (
                              <>
                                <Loader className="animate-spin" size={14} />
                                Saving...
                              </>
                            ) : (
                              <>
                                <CheckCircle size={14} />
                                Save
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingEmail(false);
                              setNewEmail("");
                              setEmailError(null);
                              setEmailSuccess(null);
                            }}
                            disabled={updatingEmail}
                            className="flex-1 sm:flex-initial px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm whitespace-nowrap"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-slate-600">{userData.email}</span>
                      </>
                    )}
                  </div>
                  {isEditingEmail && (
                    <div className="ml-7 mt-1 space-y-1">
                      {emailError && (
                        <p className="text-xs text-red-600 flex items-start gap-1.5">
                          <AlertCircle size={12} className="mt-0.5 shrink-0" />
                          <span>{emailError}</span>
                        </p>
                      )}
                      {emailSuccess && (
                        <p className="text-xs text-green-600 flex items-center gap-1.5">
                          <CheckCircle size={12} />
                          {emailSuccess}
                        </p>
                      )}
                      {!emailError && !emailSuccess && newEmail.trim() && newEmail.trim() !== userData?.email && !validateEmail(newEmail) && (
                        <p className="text-xs text-green-600 flex items-center gap-1.5">
                          <CheckCircle size={12} />
                          Email is valid. Press Enter to save or Escape to cancel.
                        </p>
                      )}
                      {!emailError && !emailSuccess && !newEmail.trim() && (
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Info size={12} />
                          Enter a new email address
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {/* Customer Details Section */}
                {(userData.firstName || userData.lastName || userData.mobileNumber) && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-900">Customer Details</h3>
                      {!isEditingProfile && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingProfile(true);
                            setEditFormData({
                              firstName: userData.firstName || "",
                              lastName: userData.lastName || "",
                              email: userData.email || "",
                              mobileNumber: userData.mobileNumber?.replace(userData.countryCode || "", "") || "",
                              countryCode: userData.countryCode || "+91",
                            });
                            setProfileError(null);
                            setProfileSuccess(null);
                          }}
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                          title="Edit profile"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                    </div>

                    {isEditingProfile ? (
                      <div className="space-y-4">
                        {/* First Name - Editable */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            First Name
                          </label>
                          <input
                            type="text"
                            value={editFormData.firstName}
                            onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                            placeholder="Enter first name"
                          />
                        </div>

                        {/* Last Name - Editable */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={editFormData.lastName}
                            onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                            placeholder="Enter last name"
                          />
                        </div>

                        {/* Email - Editable */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                            placeholder="Enter email"
                          />
                        </div>

                        {/* Mobile Number - Read Only (Display as single field) */}
                        {userData.mobileNumber && (
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Mobile Number (Cannot be changed)
                            </label>
                            <input
                              type="text"
                              value={formatMobileNumber(userData.mobileNumber, userData.countryCode)}
                              disabled
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-500 text-sm cursor-not-allowed"
                            />
                          </div>
                        )}

                        {/* Error/Success Messages */}
                        {profileError && (
                          <p className="text-xs text-red-600 flex items-start gap-1.5">
                            <AlertCircle size={12} className="mt-0.5 shrink-0" />
                            <span>{profileError}</span>
                          </p>
                        )}
                        {profileSuccess && (
                          <p className="text-xs text-green-600 flex items-center gap-1.5">
                            <CheckCircle size={12} />
                            {profileSuccess}
                          </p>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleUpdateProfile}
                            disabled={updatingProfile}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm"
                          >
                            {updatingProfile ? (
                              <>
                                <Loader className="animate-spin" size={14} />
                                Saving...
                              </>
                            ) : (
                              <>
                                <CheckCircle size={14} />
                                Save Changes
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingProfile(false);
                              setProfileError(null);
                              setProfileSuccess(null);
                            }}
                            disabled={updatingProfile}
                            className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* First Name */}
                        {userData.firstName && (
                          <div className="flex items-center gap-3 justify-center sm:justify-start">
                            <User size={16} className="text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">First Name:</span> {userData.firstName}
                            </span>
                          </div>
                        )}

                        {/* Last Name */}
                        {userData.lastName && (
                          <div className="flex items-center gap-3 justify-center sm:justify-start">
                            <User size={16} className="text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">Last Name:</span> {userData.lastName}
                            </span>
                          </div>
                        )}

                        {/* Mobile Number - Read Only (Single field) */}
                        {userData.mobileNumber && (
                          <div className="flex items-center gap-3 justify-center sm:justify-start">
                            <Phone size={16} className="text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">Mobile:</span> {formatMobileNumber(userData.mobileNumber, userData.countryCode)}
                            </span>
                          </div>
                        )}

                        {/* Country Name */}
                        {userData.countryCode && (
                          <div className="flex items-center gap-3 justify-center sm:justify-start">
                            {countryFlagUrl ? (
                              <img
                                src={countryFlagUrl}
                                alt={countryName || "Country flag"}
                                className="w-6 h-4 object-cover rounded flex-shrink-0"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  // Fallback to MapPin icon if flag fails to load
                                  target.style.display = "none";
                                }}
                              />
                            ) : (
                              <MapPin size={16} className="text-slate-400" />
                            )}
                            <span className="text-slate-600">
                              <span className="font-medium">Country:</span> {countryNameFetched ? (countryName || userData.countryCode || "Unknown") : "Loading..."}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Print Partner Information Section */}
                {(userData.userType === "print partner" || userData.userType === "Print Partner") && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-slate-900">Print Partner Details</h3>
                    </div>
                    <div className="space-y-3">
                      {/* Business Name */}
                      <div className="flex items-center gap-3 justify-center sm:justify-start">
                        <Building2 size={16} className="text-slate-400" />
                        <span className="text-slate-600">
                          <span className="font-medium">Business Name:</span> {userData.businessName || "Not provided"}
                        </span>
                      </div>

                      {/* GST Number */}
                      <div className="flex items-center gap-3 justify-center sm:justify-start">
                        <FileText size={16} className="text-slate-400" />
                        <span className="text-slate-600">
                          <span className="font-medium">GST Number:</span> {userData.gstNumber || "Not provided"}
                        </span>
                      </div>

                      {/* Business Address */}
                      <div className="flex items-start gap-3 justify-center sm:justify-start">
                        <MapPin size={16} className="text-slate-400 mt-0.5" />
                        <span className="text-slate-600">
                          <span className="font-medium">Business Address:</span> {userData.fullBusinessAddress || "Not provided"}
                        </span>
                      </div>

                      {/* City, State, Pincode */}
                      <div className="flex items-center gap-3 justify-center sm:justify-start">
                        <MapPin size={16} className="text-slate-400" />
                        <span className="text-slate-600">
                          <span className="font-medium">Location:</span>{" "}
                          {[userData.city, userData.state, userData.pincode].filter(Boolean).join(", ") || "Not provided"}
                        </span>
                      </div>

                      {/* Owner Name (Optional - only show if exists) */}
                      {userData.ownerName && (
                        <div className="flex items-center gap-3 justify-center sm:justify-start">
                          <User size={16} className="text-slate-400" />
                          <span className="text-slate-600">
                            <span className="font-medium">Owner Name:</span> {userData.ownerName}
                          </span>
                        </div>
                      )}

                      {/* WhatsApp Number (Optional - only show if exists) */}
                      {userData.whatsappNumber && (
                        <div className="flex items-center gap-3 justify-center sm:justify-start">
                          <Phone size={16} className="text-slate-400" />
                          <span className="text-slate-600">
                            <span className="font-medium">WhatsApp:</span> {userData.whatsappNumber}
                          </span>
                        </div>
                      )}

                      {/* Proof Document (Optional - only show if exists) */}
                      {userData.proofFileUrl && (
                        <div className="flex items-start gap-3 justify-center sm:justify-start">
                          <ImageIcon size={16} className="text-slate-400 mt-0.5" />
                          <div className="flex flex-col gap-2">
                            <span className="text-slate-600">
                              <span className="font-medium">Proof Document:</span>
                            </span>
                            <a
                              href={userData.proofFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-sm flex items-center gap-1"
                            >
                              <Eye size={14} />
                              View Proof Document
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 justify-center sm:justify-start">
                  <Shield size={16} className="text-slate-400" />
                  <span className="text-slate-600 capitalize">{userData.role}</span>
                </div>
                <div className="flex items-center gap-3 justify-center sm:justify-start">
                  <Calendar size={16} className="text-slate-400" />
                  <span className="text-slate-600">
                    Member since{" "}
                    {!isClient
                      ? "Loading..."
                      : new Date().toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default Profile;
