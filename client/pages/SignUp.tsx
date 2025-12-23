import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import BackButton from "../components/BackButton";
import PrintPartnerForm from "../components/PrintPartnerForm";
import { Printer, User, Mail, Lock, ArrowRight, Loader, Briefcase, Building2, Phone, X, CheckCircle, ChevronDown } from "lucide-react";
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
  uniqueId?: string; // Unique identifier for React keys
}

// Phone number validation patterns by country code
const phoneValidationRules: Record<string, { pattern: RegExp; minLength: number; maxLength: number; example: string }> = {
  "+1": { pattern: /^\d{10}$/, minLength: 10, maxLength: 10, example: "1234567890" },
  "+91": { pattern: /^[6-9]\d{9}$/, minLength: 10, maxLength: 10, example: "9876543210" }, // India - exactly 10 digits
  "+55": { pattern: /^[1-9]\d{10}$/, minLength: 11, maxLength: 11, example: "11987654321" }, // Brazil - exactly 11 digits
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

const SignUp: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [userIntent, setUserIntent] = useState<string>("");
  const [selectedIntentId, setSelectedIntentId] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    firstName: "",
    lastName: "",
    countryCode: "+91",
    mobileNo: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<CountryCode[]>([]);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch countries from REST Countries API
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setIsLoadingCountries(true);
        // Fetch countries with calling codes
        const response = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2,flag,flags,idd");
        const data = await response.json();

        // Process and filter countries with calling codes
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
              uniqueId: `${callingCode}-${country.cca2}`, // Unique identifier for React keys
            };
          })
          .sort((a: CountryCode, b: CountryCode) => a.name.localeCompare(b.name));

        setCountryCodes(processedCountries);
        setFilteredCountries(processedCountries);
      } catch (error) {
        console.error("Error fetching countries:", error);
        // Fallback to a few common countries
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
        country.code.replace("+", "").includes(query) ||
        country.country.toLowerCase().includes(query)
    );
    setFilteredCountries(filtered);
  }, [countrySearchQuery, countryCodes]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target as Node)
      ) {
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

  const [errors, setErrors] = useState<{
    name?: string;
    firstName?: string;
    lastName?: string;
    countryCode?: string;
    mobileNo?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [otpSentTo, setOtpSentTo] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [otpError, setOtpError] = useState<string>("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // For mobile number, only allow digits
    if (name === "mobileNo") {
      const digitsOnly = value.replace(/\D/g, "");
      const country = getCountryByCode(formData.countryCode, countryCodes);
      if (country && digitsOnly.length <= country.maxLength) {
        setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
      } else if (!country) {
        setFormData((prev) => ({ ...prev, [name]: digitsOnly.slice(0, 15) }));
      }
    } else {
    setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear errors when user types (for better UX)
    // Validation only happens on form submit, not during typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCountryCodeChange = (code: string) => {
    const selectedCountry = getCountryByCode(code, countryCodes);
    // Only update country code, don't modify mobile number
    setFormData((prev) => ({ ...prev, countryCode: code }));
    // Update search query with selected country name - filter applies automatically
    if (selectedCountry) {
      setCountrySearchQuery(selectedCountry.name);
    }
    // Close dropdown after selection
    setShowCountryDropdown(false);
    if (errors.mobileNo) {
      setErrors((prev) => ({ ...prev, mobileNo: undefined }));
    }
    if (errors.countryCode) {
      setErrors((prev) => ({ ...prev, countryCode: undefined }));
    }
  };

  const validate = () => {
    const newErrors: typeof errors = {};

    // For customer signup (option 1)
    if (selectedIntentId === "personal") {
      if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
      if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
      if (!formData.countryCode) newErrors.countryCode = "Country code is required";
      
      // Country-specific mobile number validation
      const country = getCountryByCode(formData.countryCode, countryCodes);
      if (!formData.mobileNo.trim()) {
        newErrors.mobileNo = "Mobile number is required";
      } else if (country) {
        const mobileNo = formData.mobileNo.trim();
        // Check exact length requirement based on country
        if (country.minLength === country.maxLength) {
          // For countries with fixed length (like India = 10, Brazil = 11)
          if (mobileNo.length !== country.minLength) {
            newErrors.mobileNo = `Mobile number must be exactly ${country.minLength} digits`;
          } else if (!country.pattern.test(mobileNo)) {
            newErrors.mobileNo = `Invalid mobile number format. Example: ${country.example}`;
          }
        } else {
          // For countries with range
          if (mobileNo.length < country.minLength || mobileNo.length > country.maxLength) {
            newErrors.mobileNo = `Mobile number must be ${country.minLength}-${country.maxLength} digits`;
          } else if (!country.pattern.test(mobileNo)) {
            newErrors.mobileNo = `Invalid mobile number format. Example: ${country.example}`;
          }
        }
      } else {
        // Fallback validation if country not found
        if (formData.mobileNo.trim().length < 8 || formData.mobileNo.trim().length > 15) {
          newErrors.mobileNo = "Please enter a valid mobile number (8-15 digits)";
        }
      }
    } else {
      // For other signup types
    if (!formData.name.trim()) newErrors.name = "Name is required";
    }

    // Email is optional for customer signup, but if provided, must be valid
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    
    // Auto-scroll to first invalid field
    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0];
      scrollToInvalidField(firstErrorField, firstErrorField);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const sendOtp = async () => {
    if (!validate()) return;

    setIsSendingOtp(true);
    setOtpError("");

    try {
      const fullMobileNumber = `${formData.countryCode}${formData.mobileNo.trim()}`;
      
      const response = await fetch(
        `${API_BASE_URL_WITH_API}/auth/send-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mobileNumber: fullMobileNumber,
            email: formData.email || undefined, // Email is optional
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setIsSendingOtp(false);
        // Check if it's a duplicate mobile number error
        if (response.status === 409 && data.message?.includes("Mobile number already registered")) {
          setErrors((prev) => ({ ...prev, mobileNo: "This mobile number is already registered. Please use a different number or login." }));
        } else {
          alert(data.message || "Failed to send OTP. Please try again.");
        }
        return;
      }

      setOtpSentTo(fullMobileNumber);
      setShowOtpPopup(true);
      setIsSendingOtp(false);
      
      // Log OTP to console if available (for testing)
      if (data.otp) {
        console.log("=".repeat(50));
        console.log(`OTP for ${fullMobileNumber}: ${data.otp}`);
        console.log("=".repeat(50));
      }
    } catch (err) {
      console.error(err);
      setIsSendingOtp(false);
      alert("Server error. Please try again.");
    }
  };

  const verifyOtpAndRegister = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");

    try {
      const fullMobileNumber = `${formData.countryCode}${formData.mobileNo.trim()}`;
      
      const response = await fetch(
        `${API_BASE_URL_WITH_API}/auth/verify-otp-and-register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            countryCode: formData.countryCode,
            mobileNumber: fullMobileNumber,
            email: formData.email,
            password: formData.password,
            otp: otp.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setIsVerifyingOtp(false);
        // Check if it's a duplicate mobile number error
        if (response.status === 409 && data.message?.includes("Mobile number already registered")) {
          setOtpError("This mobile number is already registered. Please use a different number or login.");
        } else {
          setOtpError(data.message || "OTP verification failed. Please try again.");
        }
        return;
      }

      // Registration successful
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setIsVerifyingOtp(false);
      setShowOtpPopup(false);
      
      // Show success popup
      setShowSuccessPopup(true);
      
      // Redirect to profile after 2 seconds
      setTimeout(() => {
        navigate("/profile");
      }, 2000);
    } catch (err) {
      console.error(err);
      setIsVerifyingOtp(false);
      setOtpError("Server error. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For customer signup, send OTP first
    if (selectedIntentId === "personal") {
      await sendOtp();
      return;
    }

    // For other signup types, proceed with normal registration
    if (!validate()) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL_WITH_API}/auth/register`,
        {
          method: "POST",
          headers: {
          "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            userIntent, // Although not used by backend yet, sending it just in case or for future extension
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setIsLoading(false);
        alert(data.message || "Registration failed");
        return;
      }

      localStorage.setItem("token", data.token);
      setIsLoading(false);
      navigate("/login");
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      alert("Server error. Please try again.");
    }
  };

  const handleIntentSelect = (intentId: string, intentLabel: string) => {
    setSelectedIntentId(intentId);
    setUserIntent(intentLabel);
    setStep(2);
  };

  const intentOptions = [
    {
      id: "personal",
      label: "I want to place printing orders for myself.",
      icon: User,
    },
    {
      id: "all_business",
      label: "I run a printing or designing business.",
      icon: Briefcase,
    },
    {
      id: "company",
      label: "I’m placing orders on behalf of a Company or Organization.",
      icon: Building2,
    },
  ];

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-cream-200 rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-cream-300 rounded-full blur-3xl opacity-30 pointer-events-none" />

      {/* Back Button */}
      <div className="absolute top-4 left-4 z-20">
        {step === 1 ? (
           <BackButton fallbackPath="/login" label="Back to Login" className="text-cream-600 hover:text-cream-900" />
        ) : (
           <button onClick={() => setStep(1)} className="flex items-center text-cream-600 hover:text-cream-900 font-medium transition-colors">
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              Back to Selection
           </button>
        )}
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="max-w-2xl w-full space-y-6 sm:space-y-8 bg-white p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl shadow-xl border border-cream-100 relative z-10"
      >
        <div className="text-center">
          {step === 1 && (
          <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 bg-cream-900 rounded-full flex items-center justify-center text-cream-50 mb-3 sm:mb-4 shadow-lg">
            <Printer size={24} className="sm:w-8 sm:h-8" />
          </div>
          )}
          {step === 1 && (
            <>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cream-900">
                What do you want to do on Prints24?
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-cream-600">
                Select the option that describes you best
              </p>
            </>
          )}
          {step === 2 && selectedIntentId !== "all_business" && (
            <>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cream-900">
                Create Account
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-cream-600">
                Join Prints24 today for premium printing services
              </p>
            </>
          )}
        </div>

        {step === 1 ? (
           <div className="space-y-4 mt-8">
             {intentOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleIntentSelect(option.id, option.label)}
                  className="w-full text-left p-4 rounded-xl border border-cream-200 hover:border-cream-900 hover:bg-cream-50 transition-all group flex items-start gap-4"
                >
                  <div className="p-2 bg-cream-100 rounded-lg group-hover:bg-cream-200 transition-colors">
                    <option.icon className="h-6 w-6 text-cream-900" />
                  </div>
                  <div>
                    <h3 className="font-medium text-cream-900">{option.label}</h3>
                  </div>
                  <div className="ml-auto self-center">
                     <ArrowRight className="h-5 w-5 text-cream-400 group-hover:text-cream-900 transition-colors" />
                  </div>
                </button>
             ))}
              <div className="text-center mt-6">
                <p className="text-sm text-cream-600">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-bold text-cream-900 hover:text-cream-700 underline transition-colors"
                  >
                    Login
                  </Link>
                </p>
              </div>
           </div>
        ) : (
        <>
            {/* Print Partner Form (Option 2) */}
            {selectedIntentId === "all_business" ? (
              <PrintPartnerForm onBack={() => setStep(1)} />
            ) : (
            <>
            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              {/* Customer-specific fields (Option 1) */}
              {selectedIntentId === "personal" ? (
                <>
                  {/* First Name and Last Name */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="firstName"
                        className="block text-sm font-medium text-cream-700 mb-1"
                      >
                        First Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-cream-400" />
                        </div>
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          value={formData.firstName}
                          onChange={handleChange}
                          className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                            errors.firstName
                              ? "border-red-300 focus:ring-red-500"
                              : "border-cream-200 focus:ring-cream-900"
                          } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                          placeholder="John"
                        />
                      </div>
                      {errors.firstName && (
                        <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="lastName"
                        className="block text-sm font-medium text-cream-700 mb-1"
                      >
                        Last Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-cream-400" />
                        </div>
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          value={formData.lastName}
                          onChange={handleChange}
                          className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                            errors.lastName
                              ? "border-red-300 focus:ring-red-500"
                              : "border-cream-200 focus:ring-cream-900"
                          } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                          placeholder="Doe"
                        />
                      </div>
                      {errors.lastName && (
                        <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  {/* Country Code and Mobile Number */}
                  <div>
                    <label
                      htmlFor="mobileNo"
                      className="block text-sm font-medium text-cream-700 mb-1"
                    >
                      Mobile Number
                    </label>
                    <div className="flex gap-2">
                      {/* Country Code Dropdown */}
                      <div className="relative" ref={countryDropdownRef}>
                        <button
                          type="button"
                          onClick={() => {
                            const isOpening = !showCountryDropdown;
                            setShowCountryDropdown(isOpening);
                            // When opening dropdown, populate search with selected country name if available
                            if (isOpening && formData.countryCode && !countrySearchQuery) {
                              const selectedCountry = getCountryByCode(formData.countryCode, countryCodes);
                              if (selectedCountry) {
                                setCountrySearchQuery(selectedCountry.name);
                              }
                            }
                          }}
                          className={`flex items-center gap-2 px-3 py-3 border ${
                            errors.countryCode
                              ? "border-red-300 focus:ring-red-500"
                              : "border-cream-200 focus:ring-cream-900"
                          } text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all bg-white min-w-[140px] justify-between hover:bg-cream-50`}
                        >
                          <span className="flex items-center gap-2">
                            {isLoadingCountries ? (
                              <Loader className="h-4 w-4 animate-spin text-cream-400" />
                            ) : (
                              <>
                                <img
                                  src={getCountryByCode(formData.countryCode, countryCodes)?.flagUrl || "https://flagcdn.com/w40/in.png"}
                                  alt={getCountryByCode(formData.countryCode, countryCodes)?.name || "Country"}
                                  className="w-6 h-4 object-cover rounded"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = `https://flagcdn.com/w40/${getCountryByCode(formData.countryCode, countryCodes)?.country.toLowerCase() || 'in'}.png`;
                                  }}
                                />
                                <span className="font-medium">
                                  {formData.countryCode}
                                </span>
                              </>
                            )}
                          </span>
                          <ChevronDown 
                            className={`h-4 w-4 text-cream-400 transition-transform ${
                              showCountryDropdown ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                          {showCountryDropdown && (
                            <>
                              {/* Backdrop */}
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowCountryDropdown(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute z-50 mt-1 w-72 bg-white border border-cream-200 rounded-xl shadow-2xl"
                              >
                                {/* Search Input */}
                                <div className="p-2 border-b border-cream-200">
                                  <div className="relative">
                                    <div className="relative w-full">
                                      <input
                                        type="text"
                                        placeholder="Search country or code..."
                                        value={countrySearchQuery}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setCountrySearchQuery(value);
                                          // Live filtering happens automatically via useEffect
                                        }}
                                        onKeyDown={(e) => {
                                          // Allow Enter to trigger search
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            // Filter is already applied via useEffect, but we can ensure it's triggered
                                          }
                                        }}
                                        className="w-full px-3 py-2 pl-9 pr-8 border border-cream-200 rounded-lg text-sm text-cream-900 focus:outline-none focus:ring-2 focus:ring-cream-900 transition-all"
                                        autoFocus
                                      />
                                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-cream-400" />
                                      {countrySearchQuery && (
                                        <button
                                          type="button"
                                          onClick={() => setCountrySearchQuery("")}
                                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cream-400 hover:text-cream-900 transition-colors"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {countrySearchQuery && filteredCountries.length > 0 && (
                                    <p className="text-xs text-cream-500 mt-1 px-1">
                                      {filteredCountries.length} {filteredCountries.length === 1 ? 'country' : 'countries'} found
                                    </p>
                                  )}
                                </div>

                                {/* Countries List */}
                                <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                                  {isLoadingCountries ? (
                                    <div className="p-8 text-center">
                                      <Loader className="h-6 w-6 animate-spin text-cream-400 mx-auto mb-2" />
                                      <p className="text-sm text-cream-600">Loading countries...</p>
                                    </div>
                                  ) : filteredCountries.length === 0 ? (
                                    <div className="p-8 text-center">
                                      <p className="text-sm text-cream-600">No countries found</p>
                                    </div>
                                  ) : (
                                    <div className="p-2">
                                      {filteredCountries.map((country, index) => (
                                        <button
                                          key={country.uniqueId || `${country.code}-${country.country}-${index}`}
                                          type="button"
                                          onClick={() => handleCountryCodeChange(country.code)}
                                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-cream-50 transition-colors text-left ${
                                            formData.countryCode === country.code
                                              ? "bg-cream-100 border border-cream-300"
                                              : ""
                                          }`}
                                        >
                                          <img
                                            src={country.flagUrl}
                                            alt={country.name}
                                            className="w-8 h-6 object-cover rounded flex-shrink-0"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.src = `https://flagcdn.com/w40/${country.country.toLowerCase()}.png`;
                                            }}
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-cream-900 text-sm">
                                              {country.name} ({country.code})
                                            </div>
                                          </div>
                                          {formData.countryCode === country.code && (
                                            <CheckCircle className="h-4 w-4 text-cream-900 flex-shrink-0" />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Mobile Number Input */}
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-cream-400" />
                        </div>
                        <input
                          id="mobileNo"
                          name="mobileNo"
                          type="tel"
                          value={formData.mobileNo}
                          onChange={handleChange}
                          className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                            errors.mobileNo
                              ? "border-red-300 focus:ring-red-500"
                              : "border-cream-200 focus:ring-cream-900"
                          } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                          placeholder={
                            getCountryByCode(formData.countryCode, countryCodes)?.example || "1234567890"
                          }
                          maxLength={getCountryByCode(formData.countryCode, countryCodes)?.maxLength || 15}
                        />
                      </div>
                    </div>
                    {errors.mobileNo && (
                      <p className="mt-1 text-xs text-red-500">{errors.mobileNo}</p>
                    )}
                    {errors.countryCode && (
                      <p className="mt-1 text-xs text-red-500">{errors.countryCode}</p>
                    )}
                  </div>
                </>
              ) : (
                /* Name field for other signup types */
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-cream-700 mb-1"
                >
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-cream-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                      errors.name
                        ? "border-red-300 focus:ring-red-500"
                        : "border-cream-200 focus:ring-cream-900"
                    } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                    placeholder="John Doe"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                )}
              </div>
              )}

              {/* Email - Optional for customer signup */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-cream-700 mb-1"
                >
                  Email Address {selectedIntentId === "personal" && <span className="text-cream-500 text-xs">(Optional)</span>}
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
                    className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                      errors.email
                        ? "border-red-300 focus:ring-red-500"
                        : "border-cream-200 focus:ring-cream-900"
                    } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                    placeholder="john@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Password + Confirm */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                        errors.password
                          ? "border-red-300 focus:ring-red-500"
                          : "border-cream-200 focus:ring-cream-900"
                      } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                      placeholder="******"
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-cream-700 mb-1"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-cream-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                        errors.confirmPassword
                          ? "border-red-300 focus:ring-red-500"
                          : "border-cream-200 focus:ring-cream-900"
                      } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                      placeholder="******"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading || isSendingOtp}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-cream-50 bg-cream-900 hover:bg-cream-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cream-500 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading || isSendingOtp ? (
                    <Loader className="animate-spin h-5 w-5" />
                  ) : (
                    <>
                      {selectedIntentId === "personal" ? "Send OTP" : "Create Account"}
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
            <div className="text-center mt-4">
              <p className="text-sm text-cream-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-bold text-cream-900 hover:text-cream-700 underline transition-colors"
                >
                  Login
                </Link>
              </p>
            </div>
            </>
            )}
        </>
        )}
      </motion.div>

      {/* OTP Verification Popup */}
      <AnimatePresence>
        {showOtpPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => {
              if (!isVerifyingOtp) {
                setShowOtpPopup(false);
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
              {!isVerifyingOtp && (
                <button
                  onClick={() => setShowOtpPopup(false)}
                  className="absolute top-4 right-4 text-cream-400 hover:text-cream-900 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}

              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-cream-900 mb-2">
                  Verify Your Mobile Number
                </h3>
                <p className="text-sm text-cream-600 mb-2">
                  We've sent a 6-digit verification code to:
                </p>
                <p className="text-lg font-semibold text-cream-900 mb-1">
                  {otpSentTo}
                </p>
                <p className="text-xs text-cream-500 mb-6">
                  Please enter the code below to complete your registration
                </p>
                
                {/* OTP Input - Production Ready */}
                <div className="mb-6">
                  <label
                    htmlFor="otp"
                    className="block text-sm font-medium text-cream-700 mb-3 text-left"
                  >
                    Enter Verification Code
                  </label>
                  <div className="relative">
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtp(value);
                        setOtpError("");
                      }}
                      placeholder="------"
                      maxLength={6}
                      className={`appearance-none relative block w-full px-4 py-4 border-2 ${
                        otpError
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-cream-200 focus:ring-cream-900 focus:border-cream-900"
                      } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-2 text-center text-3xl font-bold tracking-[0.5em] sm:text-4xl transition-all bg-cream-50`}
                      autoFocus
                      autoComplete="one-time-code"
                    />
                  </div>
                  {otpError && (
                    <p className="mt-3 text-sm text-red-500 flex items-center justify-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {otpError}
                    </p>
                  )}
                  {!otpError && otp.length === 6 && (
                    <p className="mt-3 text-sm text-green-600 flex items-center justify-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Code entered
                    </p>
                  )}
                  <p className="mt-3 text-xs text-cream-500">
                    Didn't receive the code? Check your messages or click "Resend OTP" below
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={verifyOtpAndRegister}
                    disabled={isVerifyingOtp || otp.length !== 6}
                    className="w-full bg-cream-900 text-cream-50 py-3 px-4 rounded-xl font-medium hover:bg-cream-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <Loader className="animate-spin h-5 w-5" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Register
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                  <button
                    onClick={sendOtp}
                    disabled={isSendingOtp || isVerifyingOtp}
                    className="w-full bg-cream-100 text-cream-900 py-2 px-4 rounded-xl font-medium hover:bg-cream-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isSendingOtp ? "Sending..." : "Resend OTP"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Popup */}
      <AnimatePresence>
        {showSuccessPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative text-center"
            >
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-cream-900 mb-2">
                Welcome!
              </h3>
              <p className="text-lg text-cream-700 mb-6">
                You can now place orders.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-cream-600">
                <Loader className="h-4 w-4 animate-spin" />
                <span>Redirecting to your profile...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SignUp;
