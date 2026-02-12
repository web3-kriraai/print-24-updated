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
  Sparkles,
  Shield,
  Palette,
  FileText,
} from "lucide-react";
import { API_BASE_URL_WITH_API } from "../lib/apiConfig";
import { scrollToInvalidField } from "../lib/validationUtils";
import { useLogo } from "../hooks/useSiteSettings";

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
  const { logo } = useLogo();
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordData.email.trim())) {
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
        if (response.status === 404) {
          setForgotPasswordErrors({
            email: data.message || "No account found with this email address.",
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
      setIsResettingPassword(false);

      // Show success message
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Printing-themed background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Printer pattern */}
        <div className="absolute top-10 left-10 opacity-5">
          <Printer size={100} />
        </div>
        <div className="absolute bottom-10 right-10 opacity-5">
          <Printer size={100} />
        </div>

        {/* Paper sheet pattern */}
        <div className="absolute top-1/4 right-1/4 w-64 h-96 bg-gradient-to-br from-white/20 to-blue-100/10 rotate-12 rounded-lg shadow-lg border border-blue-200/20" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-80 bg-gradient-to-tr from-purple-100/10 to-white/20 -rotate-12 rounded-lg shadow-lg border border-purple-200/20" />

        {/* Printing dots pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px] opacity-5" />
      </div>

      {/* Back Button */}
      <div className="absolute top-6 left-6 z-20">
        <BackButton fallbackPath="/" label="Back to Home" className="text-blue-700 hover:text-blue-900 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-blue-200/50 shadow-sm" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl flex flex-col lg:flex-row rounded-3xl shadow-2xl overflow-hidden border border-white/20 backdrop-blur-sm bg-white/95"
      >
        {/* Left side - Brand & Info */}
        <div className="lg:w-2/5 bg-gradient-to-br from-blue-600 to-purple-700 p-8 md:p-12 text-white relative overflow-hidden">
          {/* Brand watermark */}
          <div className="absolute inset-0 opacity-5">
            <Printer size={400} className="absolute -top-20 -left-20" />
            <FileText size={300} className="absolute -bottom-10 -right-10" />
          </div>

          <div className="relative z-10">
            {/* Brand Logo */}
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                <Printer className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  <img
                    src={logo}
                    alt="PrintHub Logo"
                    className="h-12 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <span className="hidden">PrintHub Pro</span>
                </h1>
                <p className="text-sm text-blue-100 opacity-90">Professional Printing Solutions</p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold mb-4">Welcome Back to PrintHub Pro</h2>
                <p className="text-blue-100/90 text-lg">
                  Sign in to access your professional printing dashboard, manage orders, and track your print projects.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <Palette className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Premium Quality Prints</h3>
                    <p className="text-blue-100/80">High-resolution printing with vibrant colors and professional finishes.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Order Management</h3>
                    <p className="text-blue-100/80">Track, manage, and organize all your print orders in one place.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Secure & Protected</h3>
                    <p className="text-blue-100/80">Enterprise-grade security for your designs and personal information.</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/20">
                <p className="text-sm text-blue-100/70">
                  Trusted by over 10,000+ businesses worldwide for their printing needs.
                </p>
              </div>
            </div>
          </div>

          {/* Decorative corner */}
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-blue-500/20 to-transparent rounded-tl-3xl" />
        </div>

        {/* Right side - Login Form */}
        <div className="lg:w-3/5 p-8 md:p-12">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl mb-4 border border-blue-200/50">
                <Printer className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In to Your Account</h2>
              <p className="text-gray-600">Access your professional printing dashboard</p>
            </div>

            {/* Success Message from Registration */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-700 px-5 py-4 rounded-xl text-sm flex items-center gap-3"
              >
                <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </motion.div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {errors.general && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-600 px-5 py-4 rounded-xl text-sm flex items-center gap-3"
                >
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <span className="font-medium">{errors.general}</span>
                </motion.div>
              )}

              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"
                  >
                    <Mail size={16} className="text-blue-500" />
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`appearance-none relative block w-full px-3 py-3.5 pl-10 border ${errors.email
                        ? "border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        } placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none transition-all shadow-sm hover:shadow`}
                      placeholder="Enter your email address"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"
                  >
                    <Lock size={16} className="text-blue-500" />
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`appearance-none relative block w-full px-3 py-3.5 pl-10 border ${errors.password
                        ? "border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        } placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none transition-all shadow-sm hover:shadow`}
                      placeholder="Enter your password"
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.password}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
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
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {isLoading ? (
                    <>
                      <Loader className="animate-spin h-5 w-5 mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in to Dashboard
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div>
                <Link
                  to="/signup"
                  className="w-full flex justify-center py-3.5 px-4 border-2 border-gray-300 rounded-xl text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300"
                >
                  <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
                  Create new account
                </Link>
              </div>

              <div className="text-center pt-4">
                <p className="text-sm text-gray-600">
                  By signing in, you agree to our{" "}
                  <Link to="/policy" className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/policy" className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </motion.div>

      {/* Forgot Password Modal - Rest of the modal code remains the same */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
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
              {/* Close Button */}
              <button
                onClick={() => {
                  if (!isSendingOtp && !isVerifyingOtp && !isResettingPassword) {
                    setShowForgotPassword(false);
                  }
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl mb-3">
                  <Lock className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {forgotPasswordStep === "email" && "Reset Password"}
                  {forgotPasswordStep === "otp" && "Verify OTP"}
                  {forgotPasswordStep === "newPassword" && "Set New Password"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {forgotPasswordStep === "email" && "Enter your registered email to receive a verification code"}
                  {forgotPasswordStep === "otp" && `We sent a 6-digit code to ${otpSentTo}`}
                  {forgotPasswordStep === "newPassword" && "Create a strong new password for your account"}
                </p>
              </div>

              {/* Step Progress */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {["email", "otp", "newPassword"].map((step, idx) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${forgotPasswordStep === step
                      ? "bg-blue-600 text-white"
                      : ["email", "otp", "newPassword"].indexOf(forgotPasswordStep) > idx
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                      }`}>
                      {["email", "otp", "newPassword"].indexOf(forgotPasswordStep) > idx ? (
                        <CheckCircle size={16} />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    {idx < 2 && (
                      <div className={`w-8 h-0.5 ${["email", "otp", "newPassword"].indexOf(forgotPasswordStep) > idx
                        ? "bg-green-500"
                        : "bg-gray-200"
                        }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* General Error */}
              {forgotPasswordErrors.general && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {forgotPasswordErrors.general}
                </div>
              )}

              {/* Step 1: Email Input */}
              {forgotPasswordStep === "email" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Mail size={16} className="text-blue-500" />
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={forgotPasswordData.email}
                        onChange={(e) => {
                          setForgotPasswordData((prev) => ({ ...prev, email: e.target.value }));
                          setForgotPasswordErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        placeholder="Enter your registered email"
                        className={`w-full px-3 py-3 pl-10 border rounded-xl focus:outline-none focus:ring-2 transition-all ${forgotPasswordErrors.email
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                          }`}
                        onKeyDown={(e) => e.key === "Enter" && handleForgotPasswordEmail()}
                      />
                    </div>
                    {forgotPasswordErrors.email && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {forgotPasswordErrors.email}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleForgotPasswordEmail}
                    disabled={isSendingOtp}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSendingOtp ? (
                      <><Loader className="animate-spin h-5 w-5" /> Sending OTP...</>
                    ) : (
                      <>Send OTP <ArrowRight size={18} /></>
                    )}
                  </button>
                </div>
              )}

              {/* Step 2: OTP Verification */}
              {forgotPasswordStep === "otp" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Shield size={16} className="text-blue-500" />
                      Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={forgotPasswordData.otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setForgotPasswordData((prev) => ({ ...prev, otp: val }));
                        setForgotPasswordErrors((prev) => ({ ...prev, otp: undefined }));
                      }}
                      placeholder="000000"
                      className={`w-full px-4 py-3 border rounded-xl text-center text-2xl font-mono focus:outline-none focus:ring-2 transition-all placeholder:tracking-normal placeholder:text-gray-300 ${forgotPasswordErrors.otp
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        }`}
                      style={{ letterSpacing: forgotPasswordData.otp ? '0.5em' : 'normal' }}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                      autoFocus
                    />
                    {forgotPasswordErrors.otp && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {forgotPasswordErrors.otp}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={isVerifyingOtp || forgotPasswordData.otp.length !== 6}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isVerifyingOtp ? (
                      <><Loader className="animate-spin h-5 w-5" /> Verifying...</>
                    ) : (
                      <>Verify OTP <ArrowRight size={18} /></>
                    )}
                  </button>
                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => setForgotPasswordStep("email")}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      ← Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleForgotPasswordEmail}
                      disabled={isSendingOtp}
                      className="text-blue-600 hover:text-blue-800 font-medium transition-colors disabled:opacity-50"
                    >
                      {isSendingOtp ? "Sending..." : "Resend OTP"}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: New Password */}
              {forgotPasswordStep === "newPassword" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Lock size={16} className="text-blue-500" />
                      New Password
                    </label>
                    <input
                      type="password"
                      value={forgotPasswordData.newPassword}
                      onChange={(e) => {
                        setForgotPasswordData((prev) => ({ ...prev, newPassword: e.target.value }));
                        setForgotPasswordErrors((prev) => ({ ...prev, newPassword: undefined }));
                      }}
                      placeholder="Enter new password (min 6 characters)"
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${forgotPasswordErrors.newPassword
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        }`}
                    />
                    {forgotPasswordErrors.newPassword && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {forgotPasswordErrors.newPassword}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Lock size={16} className="text-blue-500" />
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={forgotPasswordData.confirmPassword}
                      onChange={(e) => {
                        setForgotPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }));
                        setForgotPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      }}
                      placeholder="Confirm your new password"
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${forgotPasswordErrors.confirmPassword
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        }`}
                      onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                    />
                    {forgotPasswordErrors.confirmPassword && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {forgotPasswordErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleResetPassword}
                    disabled={isResettingPassword}
                    className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isResettingPassword ? (
                      <><Loader className="animate-spin h-5 w-5" /> Resetting...</>
                    ) : (
                      <><CheckCircle size={18} /> Reset Password</>
                    )}
                  </button>
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