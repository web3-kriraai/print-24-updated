import React, { useState, useEffect } from "react";
import { useClientOnly } from "../hooks/useClientOnly";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  MapPin,
  CheckCircle,
  Eye,
  X,
  Info,
  Edit,
  Loader,
  Phone,
  Building2,
  FileText,
  AlertCircle,
  Image as ImageIcon,
  Shield,
  Calendar,
} from "lucide-react";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../lib/apiConfig";
import BackButton from "../components/BackButton";

interface PrintPartnerProfile {
  businessName: string;
  ownerName: string;
  mobileNumber: string;
  whatsappNumber?: string;
  email: string;
  gstNumber?: string;
  address?: {
    fullAddress?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  proofDocument?: string;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  verifiedAt?: string;
}

interface CorporateProfile {
  organizationName: string;
  organizationType: string;
  authorizedPersonName: string;
  designation: string;
  mobileNumber: string;
  whatsappNumber?: string;
  officialEmail: string;
  gstNumber: string;
  address?: {
    fullAddress?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  proofDocument?: string;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  verifiedAt?: string;
}

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
  signupIntent?: string;
  approvalStatus?: string;
  isEmailVerified?: boolean;
  userSegment?: {
    _id: string;
    name: string;
    code: string;
    description?: string;
  };
  profile?: PrintPartnerProfile | CorporateProfile;
  createdAt?: string;
  updatedAt?: string;
}


// Format currency helper
const formatCurrency = (amount: number | undefined | null): string => {
  const safeAmount = amount ?? 0;
  return `₹${safeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

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

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const isClient = useClientOnly();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
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
          // Debug: Log user data to check if profile data is present
          console.log("Fetched user profile data:", data.user);
          console.log("User type:", data.user.userType);
          console.log("Profile data:", data.user.profile);
          console.log("Approval status:", data.user.approvalStatus);

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
      const fallbackData = (countryMap as any)[countryCode];
      if (fallbackData) {
        setCountryName(fallbackData.name);
        setCountryFlagUrl(`https://flagcdn.com/w40/${fallbackData.code}.png`);
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


  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
  };

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomColor = (name: string | undefined | null) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-teal-500",
    ];
    if (!name) return colors[0];
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
    return (
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Hello, {(userData.name || "User").split(" ")[0]}.
            </h1>
            <p className="text-slate-500 mt-2">
              Welcome to your account dashboard.
            </p>
          </div>
        </div>

        {/* Account Snapshot */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Account snapshot</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-100 rounded-xl p-6 min-h-[140px] flex flex-col justify-between hover:bg-slate-200 transition-colors cursor-pointer border border-transparent hover:border-slate-300 group">
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">
                Account Status
              </span>
              <span className="text-lg font-bold text-green-600 group-hover:text-green-700 flex items-center gap-1">
                Active <CheckCircle className="w-5 h-5" />
              </span>
            </div>
            <div className="bg-slate-100 rounded-xl p-6 min-h-[140px] flex flex-col justify-between hover:bg-slate-200 transition-colors border border-transparent hover:border-slate-300 group">
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">
                Member Since
              </span>
              <span className="text-lg font-bold text-slate-900">
                {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
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
                {userData.userType === "corporate" && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                    Corporate
                  </span>
                )}
                {/* Approval Status Badge */}
                {userData.approvalStatus && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${userData.approvalStatus === "approved"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : userData.approvalStatus === "rejected"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                    }`}>
                    {userData.approvalStatus === "approved" ? "✓ Verified" : userData.approvalStatus === "rejected" ? "Rejected" : "Pending Verification"}
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
                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
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
                                className="w-6 h-4 object-cover rounded shrink-0"
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
                {(userData.userType === "print partner" || userData.userType === "Print Partner") && userData.profile && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">Print Partner Details</h3>
                      {(userData.profile as PrintPartnerProfile).verificationStatus && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${(userData.profile as PrintPartnerProfile).verificationStatus === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : (userData.profile as PrintPartnerProfile).verificationStatus === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                          }`}>
                          {(userData.profile as PrintPartnerProfile).verificationStatus}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {/* Business Name */}
                      <div className="flex items-center gap-3 justify-center sm:justify-start">
                        <Building2 size={16} className="text-slate-400" />
                        <span className="text-slate-600">
                          <span className="font-medium">Business Name:</span> {(userData.profile as PrintPartnerProfile).businessName || "Not provided"}
                        </span>
                      </div>

                      {/* Owner Name */}
                      {(userData.profile as PrintPartnerProfile).ownerName && (
                        <div className="flex items-center gap-3 justify-center sm:justify-start">
                          <User size={16} className="text-slate-400" />
                          <span className="text-slate-600">
                            <span className="font-medium">Owner Name:</span> {(userData.profile as PrintPartnerProfile).ownerName}
                          </span>
                        </div>
                      )}

                      {/* GST Number */}
                      {(userData.profile as PrintPartnerProfile).gstNumber && (
                        <div className="flex items-center gap-3 justify-center sm:justify-start">
                          <FileText size={16} className="text-slate-400" />
                          <span className="text-slate-600">
                            <span className="font-medium">GST Number:</span> {(userData.profile as PrintPartnerProfile).gstNumber}
                          </span>
                        </div>
                      )}

                      {/* Business Address */}
                      {(userData.profile as PrintPartnerProfile).address && (
                        <div className="flex items-start gap-3 justify-center sm:justify-start">
                          <MapPin size={16} className="text-slate-400 mt-0.5" />
                          <span className="text-slate-600">
                            <span className="font-medium">Address:</span>{" "}
                            {[
                              (userData.profile as PrintPartnerProfile).address?.fullAddress,
                              (userData.profile as PrintPartnerProfile).address?.city,
                              (userData.profile as PrintPartnerProfile).address?.state,
                              (userData.profile as PrintPartnerProfile).address?.pincode
                            ].filter(Boolean).join(", ") || "Not provided"}
                          </span>
                        </div>
                      )}

                      {/* WhatsApp Number */}
                      {(userData.profile as PrintPartnerProfile).whatsappNumber && (
                        <div className="flex items-center gap-3 justify-center sm:justify-start">
                          <Phone size={16} className="text-slate-400" />
                          <span className="text-slate-600">
                            <span className="font-medium">WhatsApp:</span> {(userData.profile as PrintPartnerProfile).whatsappNumber}
                          </span>
                        </div>
                      )}

                      {/* Proof Document */}
                      {(userData.profile as PrintPartnerProfile).proofDocument && (
                        <div className="flex items-start gap-3 justify-center sm:justify-start">
                          <ImageIcon size={16} className="text-slate-400 mt-0.5" />
                          <div className="flex flex-col gap-2">
                            <span className="text-slate-600">
                              <span className="font-medium">Proof Document:</span>
                            </span>
                            <a
                              href={(userData.profile as PrintPartnerProfile).proofDocument}
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

                {/* Corporate Information Section */}
                {userData.userType === "corporate" && userData.profile && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">Corporate Details</h3>
                      {(userData.profile as CorporateProfile).verificationStatus && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${(userData.profile as CorporateProfile).verificationStatus === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : (userData.profile as CorporateProfile).verificationStatus === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                          }`}>
                          {(userData.profile as CorporateProfile).verificationStatus}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {/* Organization Name */}
                      <div className="flex items-center gap-3 justify-center sm:justify-start">
                        <Building2 size={16} className="text-slate-400" />
                        <span className="text-slate-600">
                          <span className="font-medium">Organization:</span> {(userData.profile as CorporateProfile).organizationName || "Not provided"}
                        </span>
                      </div>

                      {/* Organization Type */}
                      <div className="flex items-center gap-3 justify-center sm:justify-start">
                        <FileText size={16} className="text-slate-400" />
                        <span className="text-slate-600">
                          <span className="font-medium">Type:</span> {(userData.profile as CorporateProfile).organizationType?.replace(/_/g, " ") || "Not provided"}
                        </span>
                      </div>

                      {/* Authorized Person */}
                      <div className="flex items-center gap-3 justify-center sm:justify-start">
                        <User size={16} className="text-slate-400" />
                        <span className="text-slate-600">
                          <span className="font-medium">Authorized Person:</span> {(userData.profile as CorporateProfile).authorizedPersonName || "Not provided"}
                          {(userData.profile as CorporateProfile).designation && (
                            <span className="text-slate-500"> ({(userData.profile as CorporateProfile).designation?.replace(/_/g, " ")})</span>
                          )}
                        </span>
                      </div>

                      {/* GST Number */}
                      <div className="flex items-center gap-3 justify-center sm:justify-start">
                        <FileText size={16} className="text-slate-400" />
                        <span className="text-slate-600">
                          <span className="font-medium">GST Number:</span> {(userData.profile as CorporateProfile).gstNumber || "Not provided"}
                        </span>
                      </div>

                      {/* Address */}
                      {(userData.profile as CorporateProfile).address && (
                        <div className="flex items-start gap-3 justify-center sm:justify-start">
                          <MapPin size={16} className="text-slate-400 mt-0.5" />
                          <span className="text-slate-600">
                            <span className="font-medium">Address:</span>{" "}
                            {[
                              (userData.profile as CorporateProfile).address?.fullAddress,
                              (userData.profile as CorporateProfile).address?.city,
                              (userData.profile as CorporateProfile).address?.state,
                              (userData.profile as CorporateProfile).address?.pincode
                            ].filter(Boolean).join(", ") || "Not provided"}
                          </span>
                        </div>
                      )}

                      {/* WhatsApp Number */}
                      {(userData.profile as CorporateProfile).whatsappNumber && (
                        <div className="flex items-center gap-3 justify-center sm:justify-start">
                          <Phone size={16} className="text-slate-400" />
                          <span className="text-slate-600">
                            <span className="font-medium">WhatsApp:</span> {(userData.profile as CorporateProfile).whatsappNumber}
                          </span>
                        </div>
                      )}

                      {/* Proof Document */}
                      {(userData.profile as CorporateProfile).proofDocument && (
                        <div className="flex items-start gap-3 justify-center sm:justify-start">
                          <ImageIcon size={16} className="text-slate-400 mt-0.5" />
                          <div className="flex flex-col gap-2">
                            <span className="text-slate-600">
                              <span className="font-medium">Proof Document:</span>
                            </span>
                            <a
                              href={(userData.profile as CorporateProfile).proofDocument}
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
