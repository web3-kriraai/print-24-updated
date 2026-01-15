import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import BackButton from "../components/BackButton";
import {
  Printer,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  Loader,
  Phone,
  CheckCircle,
  X,
  ChevronDown,
} from "lucide-react";
import { API_BASE_URL_WITH_API } from "../lib/apiConfig";
import { scrollToInvalidField } from "../lib/validationUtils";

// Country code interface
interface CountryCode {
  code: string;
  country: string;
  name: string;
  flag: string;
  flagUrl: string;
  pattern: RegExp;
  minLength: number;
  maxLength: number;
  example: string;
  uniqueId?: string;
}

// Phone number validation patterns by country code
const phoneValidationRules: Record<string, { pattern: RegExp; minLength: number; maxLength: number; example: string }> = {
  "+1": { pattern: /^\d{10}$/, minLength: 10, maxLength: 10, example: "1234567890" },
  "+91": { pattern: /^[6-9]\d{9}$/, minLength: 10, maxLength: 10, example: "9876543210" },
  "+55": { pattern: /^[1-9]\d{10}$/, minLength: 11, maxLength: 11, example: "11987654321" },
  "+44": { pattern: /^[1-9]\d{9,10}$/, minLength: 10, maxLength: 11, example: "7123456789" },
  "+61": { pattern: /^[2-9]\d{8}$/, minLength: 9, maxLength: 9, example: "412345678" },
  "+971": { pattern: /^[2-9]\d{8}$/, minLength: 9, maxLength: 9, example: "501234567" },
  "+86": { pattern: /^1[3-9]\d{9}$/, minLength: 11, maxLength: 11, example: "13800138000" },
  "+81": { pattern: /^[789]0\d{8}$|^[789]\d{9}$/, minLength: 10, maxLength: 11, example: "9012345678" },
  "+49": { pattern: /^[1-9]\d{10,11}$/, minLength: 11, maxLength: 12, example: "15123456789" },
  "+33": { pattern: /^[67]\d{8}$/, minLength: 9, maxLength: 9, example: "612345678" },
  "+7": { pattern: /^[3-9]\d{9}$/, minLength: 10, maxLength: 10, example: "9123456789" },
  "+65": { pattern: /^[689]\d{7}$/, minLength: 8, maxLength: 8, example: "91234567" },
  "+60": { pattern: /^[1-9]\d{8,9}$/, minLength: 9, maxLength: 10, example: "123456789" },
  "+66": { pattern: /^[689]\d{8}$/, minLength: 9, maxLength: 9, example: "812345678" },
  "+82": { pattern: /^[1-9]\d{9,10}$/, minLength: 10, maxLength: 11, example: "1012345678" },
  "+34": { pattern: /^[6-9]\d{8}$/, minLength: 9, maxLength: 9, example: "612345678" },
  "+39": { pattern: /^[3]\d{9}$/, minLength: 10, maxLength: 10, example: "3123456789" },
  "+31": { pattern: /^[6]\d{8}$/, minLength: 9, maxLength: 9, example: "612345678" },
  "+46": { pattern: /^[7]\d{8}$/, minLength: 9, maxLength: 9, example: "712345678" },
  "+41": { pattern: /^[7-9]\d{8}$/, minLength: 9, maxLength: 9, example: "781234567" },
  "+27": { pattern: /^[6-9]\d{8}$/, minLength: 9, maxLength: 9, example: "812345678" },
};

// Get country code details by code
const getCountryByCode = (code: string, countries: CountryCode[]): CountryCode | undefined => {
  return countries.find((country) => country.code === code);
};

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  message?: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"email" | "otp" | "newPassword">("email");
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [forgotPasswordErrors, setForgotPasswordErrors] = useState<{
    email?: string;
    otp?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [otpSentTo, setOtpSentTo] = useState("");

  // Country code dropdown states
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<CountryCode[]>([]);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Get success message from registration redirect
  const successMessage = location.state?.message;

  // Fetch countries from REST Countries API
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setIsLoadingCountries(true);
        const response = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2,flag,flags,idd");
        const data = await response.json();

        const processedCountries: CountryCode[] = data
          .filter((country: any) => country.idd?.root && country.idd?.suffixes?.length > 0)
          .map((country: any) => {
            const callingCode = country.idd.root + (country.idd.suffixes[0] || "");
            const validationRule = phoneValidationRules[callingCode] || {
              pattern: /^\d{8,15}$/,
              minLength: 8,
              maxLength: 15,
              example: "1234567890",
            };

            return {
              code: callingCode,
              country: country.cca2,
              name: country.name.common,
              flag: country.flag || "🏳️",
              flagUrl: country.flags?.png || `https://flagcdn.com/w40/${country.cca2.toLowerCase()}.png`,
              pattern: validationRule.pattern,
              minLength: validationRule.minLength,
              maxLength: validationRule.maxLength,
              example: validationRule.example,
              uniqueId: `${callingCode}-${country.cca2}`,
            };
          })
          .sort((a: CountryCode, b: CountryCode) => a.name.localeCompare(b.name));

        setCountryCodes(processedCountries);
        setFilteredCountries(processedCountries);
      } catch (error) {
        console.error("Error fetching countries:", error);
        const fallbackCountries = [
          { code: "+1", country: "US", name: "United States", flag: "🇺🇸", flagUrl: "https://flagcdn.com/w40/us.png", pattern: /^\d{10}$/, minLength: 10, maxLength: 10, example: "1234567890", uniqueId: "+1-US" },
          { code: "+91", country: "IN", name: "India", flag: "🇮🇳", flagUrl: "https://flagcdn.com/w40/in.png", pattern: /^[6-9]\d{9}$/, minLength: 10, maxLength: 10, example: "9876543210", uniqueId: "+91-IN" },
          { code: "+44", country: "GB", name: "United Kingdom", flag: "🇬🇧", flagUrl: "https://flagcdn.com/w40/gb.png", pattern: /^[1-9]\d{9,10}$/, minLength: 10, maxLength: 11, example: "7123456789", uniqueId: "+44-GB" },
        ];
        setCountryCodes(fallbackCountries);
        setFilteredCountries(fallbackCountries);
      } finally {
        setIsLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  // Filter countries based on search query - Live filtering
  useEffect(() => {
    if (!countryCodes.length) {
      setFilteredCountries([]);
      return;
    }

    if (!countrySearchQuery || countrySearchQuery.trim() === "") {
      setFilteredCountries(countryCodes);
      return;
    }

    const query = countrySearchQuery.toLowerCase().trim();
    const filtered = countryCodes.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query) ||
        country.country.toLowerCase().includes(query)
    );
    setFilteredCountries(filtered);
  }, [countrySearchQuery, countryCodes]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    };

    if (showCountryDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCountryDropdown]);

  const handleCountryCodeChange = (code: string) => {
    const selectedCountry = getCountryByCode(code, countryCodes);
    setForgotPasswordData((prev) => ({ ...prev, countryCode: code }));
    if (selectedCountry) {
      setCountrySearchQuery(selectedCountry.name);
    }
    setShowCountryDropdown(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear specific error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }));
    }
  };

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);

    // Auto-scroll to first invalid field
    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0];
      scrollToInvalidField(firstErrorField, firstErrorField);
    }

    return Object.keys(newErrors).length === 0;
  };


  // Forgot Password Handlers
  const handleForgotPasswordEmail = async () => {
    // Validate email
    if (!forgotPasswordData.email.trim()) {
      setForgotPasswordErrors({ email: "Email is required" });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(forgotPasswordData.email)) {
      setForgotPasswordErrors({ email: "Please enter a valid email address" });
      return;
    }

    setIsSendingOtp(true);
    setForgotPasswordErrors({});

    try {
      const response = await fetch(`${API_BASE_URL_WITH_API}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: forgotPasswordData.email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsSendingOtp(false);
        // If user not found (404), show validation error on email field
        if (response.status === 404) {
          setForgotPasswordErrors({
            email: data.message || "No account found with this email address. Please check and try again.",
          });
        } else {
          setForgotPasswordErrors({
            general: data.message || "Failed to send OTP. Please try again.",
          });
        }
        return;
      }

      setOtpSentTo(forgotPasswordData.email.trim());
      setForgotPasswordStep("otp");
      setIsSendingOtp(false);
    } catch (error) {
      console.error("Error sending OTP:", error);
      setIsSendingOtp(false);
      setForgotPasswordErrors({
        general: "Network error. Please try again.",
      });
    }
  };

  const handleVerifyOtp = async () => {
    if (!forgotPasswordData.otp || forgotPasswordData.otp.length !== 6) {
      setForgotPasswordErrors({ otp: "Please enter a valid 6-digit OTP" });
      return;
    }

    setIsVerifyingOtp(true);
    setForgotPasswordErrors({});

    try {
      const response = await fetch(`${API_BASE_URL_WITH_API}/auth/verify-otp-password-reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: forgotPasswordData.email.trim(),
          otp: forgotPasswordData.otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsVerifyingOtp(false);
        setForgotPasswordErrors({
          otp: data.message || "Invalid OTP. Please try again.",
        });
        return;
      }

      setForgotPasswordStep("newPassword");
      setIsVerifyingOtp(false);
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setIsVerifyingOtp(false);
      setForgotPasswordErrors({
        general: "Network error. Please try again.",
      });
    }
  };

  const handleResetPassword = async () => {
    // Validate passwords
    const newErrors: { newPassword?: string; confirmPassword?: string } = {};

    if (!forgotPasswordData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (forgotPasswordData.newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!forgotPasswordData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setForgotPasswordErrors(newErrors);
      return;
    }

    setIsResettingPassword(true);
    setForgotPasswordErrors({});

    try {
      const response = await fetch(`${API_BASE_URL_WITH_API}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: forgotPasswordData.email.trim(),
          otp: forgotPasswordData.otp,
          newPassword: forgotPasswordData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsResettingPassword(false);
        setForgotPasswordErrors({
          general: data.message || "Failed to reset password. Please try again.",
        });
        return;
      }

      // Success - close modal and show success message
      setShowForgotPassword(false);
      setForgotPasswordStep("email");
      setForgotPasswordData({
        email: "",
        otp: "",
        newPassword: "",
        confirmPassword: "",
      });
      setForgotPasswordErrors({});
      setOtpSentTo("");

      // Show success message (you can add a toast notification here)
      alert("Password reset successfully! You can now login with your new password.");
    } catch (error) {
      console.error("Error resetting password:", error);
      setIsResettingPassword(false);
      setForgotPasswordErrors({
        general: "Network error. Please try again.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL_WITH_API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const text = await response.text();

      // Check if server returned HTML instead of JSON
      if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
        throw new Error(
          "Server returned HTML instead of JSON. Please check your server configuration."
        );
      }

      const data = JSON.parse(text);

      if (!response.ok) {
        setErrors({
          general: data.message || "Login failed. Please check credentials.",
        });
        return;
      }

      // Success
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect based on role
      if (data.user.role === "admin") {
        navigate("/admin/dashboard");
      } else if (data.user.role === "emp") {
        navigate("/employee/dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrors({
        general: "Network error. Please check if the server is running.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-cream-200 rounded-full blur-3xl opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-cream-300 rounded-full blur-3xl opacity-40 pointer-events-none" />

      {/* Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <BackButton fallbackPath="/" label="Back to Home" className="text-cream-600 hover:text-cream-900" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full space-y-6 sm:space-y-8 bg-white p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl shadow-xl border border-cream-100 relative z-10"
      >
        <div className="text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cream-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-cream-600">
            Sign in to manage your prints and orders
          </p>
        </div>

        {/* Success Message from Registration */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
          >
            <AlertCircle size={16} />
            {successMessage}
          </motion.div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.general && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
            >
              <AlertCircle size={16} />
              {errors.general}
            </motion.div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-cream-700 mb-1"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-cream-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${errors.email
                    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                    : "border-cream-200 focus:ring-cream-900 focus:border-cream-900"
                    } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                  placeholder="Enter your email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-cream-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-cream-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${errors.password
                    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                    : "border-cream-200 focus:ring-cream-900 focus:border-cream-900"
                    } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                  placeholder="Enter your password"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end">
            <div className="text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setForgotPasswordStep("email");
                  setForgotPasswordData({
                    email: "",
                    otp: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                  setForgotPasswordErrors({});
                  setOtpSentTo("");
                }}
                className="font-medium text-cream-900 hover:text-cream-700 hover:underline"
              >
                Forgot your password?
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-cream-50 bg-cream-900 hover:bg-cream-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cream-500 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader className="animate-spin h-5 w-5" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>

        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-cream-600">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-bold text-cream-900 hover:text-cream-700 underline transition-colors"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              if (!isSendingOtp && !isVerifyingOtp && !isResettingPassword) {
                setShowForgotPassword(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative"
            >
              {!isSendingOtp && !isVerifyingOtp && !isResettingPassword && (
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="absolute top-4 right-4 text-cream-400 hover:text-cream-900 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}

              {/* Step 1: Email */}
              {forgotPasswordStep === "email" && (
                <div>
                  <div className="text-center mb-6">
                    <div className="mx-auto w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mb-4">
                      <Mail className="h-8 w-8 text-cream-900" />
                    </div>
                    <h3 className="text-2xl font-bold text-cream-900 mb-2">
                      Forgot Password?
                    </h3>
                    <p className="text-sm text-cream-600">
                      Enter your email address to receive a verification code
                    </p>
                  </div>

                  {forgotPasswordErrors.general && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle size={16} />
                      {forgotPasswordErrors.general}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-cream-700 mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-cream-400" />
                        </div>
                        <input
                          type="email"
                          value={forgotPasswordData.email}
                          onChange={(e) => {
                            setForgotPasswordData({ ...forgotPasswordData, email: e.target.value });
                            setForgotPasswordErrors({ ...forgotPasswordErrors, email: undefined });
                          }}
                          className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${forgotPasswordErrors.email
                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                            : "border-cream-200 focus:ring-cream-900 focus:border-cream-900"
                            } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                          placeholder="Enter your email address"
                        />
                      </div>
                      {forgotPasswordErrors.email && (
                        <p className="mt-1 text-xs text-red-500">{forgotPasswordErrors.email}</p>
                      )}
                    </div>

                    <button
                      onClick={handleForgotPasswordEmail}
                      disabled={isSendingOtp || !forgotPasswordData.email}
                      className="w-full bg-cream-900 text-cream-50 py-3 px-4 rounded-xl font-medium hover:bg-cream-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSendingOtp ? (
                        <>
                          <Loader className="animate-spin h-5 w-5" />
                          Sending OTP...
                        </>
                      ) : (
                        <>
                          Send OTP
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: OTP Verification */}
              {forgotPasswordStep === "otp" && (
                <div>
                  <div className="text-center mb-6">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-cream-900 mb-2">
                      Verify OTP
                    </h3>
                    <p className="text-sm text-cream-600 mb-2">
                      We've sent a 6-digit code to:
                    </p>
                    <p className="text-lg font-semibold text-cream-900 mb-6">
                      {otpSentTo}
                    </p>
                  </div>

                  {forgotPasswordErrors.otp && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle size={16} />
                      {forgotPasswordErrors.otp}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-cream-700 mb-2">
                        Enter OTP
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={forgotPasswordData.otp}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setForgotPasswordData({ ...forgotPasswordData, otp: value });
                          setForgotPasswordErrors({ ...forgotPasswordErrors, otp: undefined });
                        }}
                        className={`w-full px-4 py-3 border-2 ${forgotPasswordErrors.otp
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-cream-200 focus:ring-cream-900 focus:border-cream-900"
                          } rounded-xl focus:outline-none focus:ring-2 text-center text-3xl font-bold tracking-widest bg-cream-50`}
                        placeholder="------"
                        maxLength={6}
                        autoFocus
                        autoComplete="one-time-code"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleVerifyOtp}
                        disabled={isVerifyingOtp || forgotPasswordData.otp.length !== 6}
                        className="flex-1 bg-cream-900 text-cream-50 py-3 px-4 rounded-xl font-medium hover:bg-cream-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isVerifyingOtp ? (
                          <>
                            <Loader className="animate-spin h-5 w-5" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            Verify OTP
                            <ArrowRight className="h-5 w-5" />
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleForgotPasswordEmail}
                        disabled={isSendingOtp || isVerifyingOtp}
                        className="px-4 py-3 bg-cream-100 text-cream-900 rounded-xl font-medium hover:bg-cream-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {isSendingOtp ? "Sending..." : "Resend"}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setForgotPasswordStep("email");
                        setForgotPasswordData({ ...forgotPasswordData, otp: "" });
                        setForgotPasswordErrors({});
                      }}
                      className="w-full text-sm text-cream-600 hover:text-cream-900 underline"
                    >
                      Change email address
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: New Password */}
              {forgotPasswordStep === "newPassword" && (
                <div>
                  <div className="text-center mb-6">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <Lock className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-cream-900 mb-2">
                      Set New Password
                    </h3>
                    <p className="text-sm text-cream-600">
                      Enter your new password below
                    </p>
                  </div>

                  {forgotPasswordErrors.general && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle size={16} />
                      {forgotPasswordErrors.general}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-cream-700 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={forgotPasswordData.newPassword}
                        onChange={(e) => {
                          setForgotPasswordData({ ...forgotPasswordData, newPassword: e.target.value });
                          setForgotPasswordErrors({ ...forgotPasswordErrors, newPassword: undefined });
                        }}
                        className={`w-full px-3 py-2 border ${forgotPasswordErrors.newPassword
                          ? "border-red-300 focus:ring-red-500"
                          : "border-cream-200 focus:ring-cream-900"
                          } rounded-lg focus:outline-none focus:ring-2 text-sm`}
                        placeholder="Enter new password (min 6 characters)"
                        autoFocus
                      />
                      {forgotPasswordErrors.newPassword && (
                        <p className="mt-1 text-xs text-red-500">{forgotPasswordErrors.newPassword}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-cream-700 mb-2">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={forgotPasswordData.confirmPassword}
                        onChange={(e) => {
                          setForgotPasswordData({ ...forgotPasswordData, confirmPassword: e.target.value });
                          setForgotPasswordErrors({ ...forgotPasswordErrors, confirmPassword: undefined });
                        }}
                        className={`w-full px-3 py-2 border ${forgotPasswordErrors.confirmPassword
                          ? "border-red-300 focus:ring-red-500"
                          : "border-cream-200 focus:ring-cream-900"
                          } rounded-lg focus:outline-none focus:ring-2 text-sm`}
                        placeholder="Confirm new password"
                      />
                      {forgotPasswordErrors.confirmPassword && (
                        <p className="mt-1 text-xs text-red-500">{forgotPasswordErrors.confirmPassword}</p>
                      )}
                    </div>

                    <button
                      onClick={handleResetPassword}
                      disabled={isResettingPassword || !forgotPasswordData.newPassword || !forgotPasswordData.confirmPassword}
                      className="w-full bg-cream-900 text-cream-50 py-3 px-4 rounded-xl font-medium hover:bg-cream-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isResettingPassword ? (
                        <>
                          <Loader className="animate-spin h-5 w-5" />
                          Resetting Password...
                        </>
                      ) : (
                        <>
                          Reset Password
                          <CheckCircle className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
