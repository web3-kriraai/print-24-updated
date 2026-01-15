import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, User, Phone, Mail, MapPin, FileImage, CheckCircle, Loader, X, AlertCircle, ChevronDown, Lock as LockIcon } from "lucide-react";
import { API_BASE_URL_WITH_API } from "../lib/apiConfig";

interface PrintPartnerFormProps {
  onBack: () => void;
}

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

interface FormData {
  businessName: string;
  ownerName: string;
  mobileCountryCode: string;
  mobileNumber: string;
  whatsappCountryCode: string;
  whatsappNumber: string;
  emailAddress: string;
  password: string;
  confirmPassword: string;
  gstNumber: string;
  fullBusinessAddress: string;
  city: string;
  state: string;
  pincode: string;
  proofFile: File | null;
}

interface FormErrors {
  businessName?: string;
  ownerName?: string;
  mobileCountryCode?: string;
  mobileNumber?: string;
  whatsappCountryCode?: string;
  whatsappNumber?: string;
  emailAddress?: string;
  password?: string;
  confirmPassword?: string;
  gstNumber?: string;
  fullBusinessAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  proofFile?: string;
}

const PrintPartnerForm: React.FC<PrintPartnerFormProps> = ({ onBack }) => {
  const [formData, setFormData] = useState<FormData>({
    businessName: "",
    ownerName: "",
    mobileCountryCode: "+91",
    mobileNumber: "",
    whatsappCountryCode: "+91",
    whatsappNumber: "",
    emailAddress: "",
    password: "",
    confirmPassword: "",
    gstNumber: "",
    fullBusinessAddress: "",
    city: "",
    state: "",
    pincode: "",
    proofFile: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sameAsMobile, setSameAsMobile] = useState(false);

  // Country code dropdown states
  const [showMobileCountryDropdown, setShowMobileCountryDropdown] = useState(false);
  const [showWhatsappCountryDropdown, setShowWhatsappCountryDropdown] = useState(false);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [filteredMobileCountries, setFilteredMobileCountries] = useState<CountryCode[]>([]);
  const [filteredWhatsappCountries, setFilteredWhatsappCountries] = useState<CountryCode[]>([]);
  const [mobileCountrySearchQuery, setMobileCountrySearchQuery] = useState("");
  const [whatsappCountrySearchQuery, setWhatsappCountrySearchQuery] = useState("");
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const mobileCountryDropdownRef = useRef<HTMLDivElement>(null);
  const whatsappCountryDropdownRef = useRef<HTMLDivElement>(null);

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
        setFilteredMobileCountries(processedCountries);
        setFilteredWhatsappCountries(processedCountries);
      } catch (error) {
        console.error("Error fetching countries:", error);
        const fallbackCountries = [
          { code: "+1", country: "US", name: "United States", flag: "🇺🇸", flagUrl: "https://flagcdn.com/w40/us.png", pattern: /^\d{10}$/, minLength: 10, maxLength: 10, example: "1234567890", uniqueId: "+1-US" },
          { code: "+91", country: "IN", name: "India", flag: "🇮🇳", flagUrl: "https://flagcdn.com/w40/in.png", pattern: /^[6-9]\d{9}$/, minLength: 10, maxLength: 10, example: "9876543210", uniqueId: "+91-IN" },
          { code: "+44", country: "GB", name: "United Kingdom", flag: "🇬🇧", flagUrl: "https://flagcdn.com/w40/gb.png", pattern: /^[1-9]\d{9,10}$/, minLength: 10, maxLength: 11, example: "7123456789", uniqueId: "+44-GB" },
        ];
        setCountryCodes(fallbackCountries);
        setFilteredMobileCountries(fallbackCountries);
        setFilteredWhatsappCountries(fallbackCountries);
      } finally {
        setIsLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  // Filter countries based on search query for mobile
  useEffect(() => {
    if (!countryCodes.length) {
      setFilteredMobileCountries([]);
      return;
    }
    
    if (!mobileCountrySearchQuery || mobileCountrySearchQuery.trim() === "") {
      setFilteredMobileCountries(countryCodes);
      return;
    }

    const query = mobileCountrySearchQuery.toLowerCase().trim();
    const filtered = countryCodes.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query) ||
        country.code.replace("+", "").includes(query) ||
        country.country.toLowerCase().includes(query)
    );
    setFilteredMobileCountries(filtered);
  }, [mobileCountrySearchQuery, countryCodes]);

  // Filter countries based on search query for WhatsApp
  useEffect(() => {
    if (!countryCodes.length) {
      setFilteredWhatsappCountries([]);
      return;
    }
    
    if (!whatsappCountrySearchQuery || whatsappCountrySearchQuery.trim() === "") {
      setFilteredWhatsappCountries(countryCodes);
      return;
    }

    const query = whatsappCountrySearchQuery.toLowerCase().trim();
    const filtered = countryCodes.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query) ||
        country.code.replace("+", "").includes(query) ||
        country.country.toLowerCase().includes(query)
    );
    setFilteredWhatsappCountries(filtered);
  }, [whatsappCountrySearchQuery, countryCodes]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileCountryDropdownRef.current &&
        !mobileCountryDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMobileCountryDropdown(false);
      }
      if (
        whatsappCountryDropdownRef.current &&
        !whatsappCountryDropdownRef.current.contains(event.target as Node)
      ) {
        setShowWhatsappCountryDropdown(false);
      }
    };

    if (showMobileCountryDropdown || showWhatsappCountryDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMobileCountryDropdown, showWhatsappCountryDropdown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // For mobile number, only allow digits
    if (name === "mobileNumber") {
      const digitsOnly = value.replace(/\D/g, "");
      const country = getCountryByCode(formData.mobileCountryCode, countryCodes);
      if (country && digitsOnly.length <= country.maxLength) {
        setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
        // If "same as mobile" is checked, update WhatsApp number too
        if (sameAsMobile) {
          setFormData((prev) => ({ ...prev, whatsappNumber: digitsOnly }));
        }
      } else if (!country) {
        setFormData((prev) => ({ ...prev, [name]: digitsOnly.slice(0, 15) }));
        // If "same as mobile" is checked, update WhatsApp number too
        if (sameAsMobile) {
          setFormData((prev) => ({ ...prev, whatsappNumber: digitsOnly.slice(0, 15) }));
        }
      }
    } else if (name === "whatsappNumber") {
      // Don't allow manual editing if "same as mobile" is checked
      if (sameAsMobile) {
        return;
      }
      const digitsOnly = value.replace(/\D/g, "");
      const country = getCountryByCode(formData.whatsappCountryCode, countryCodes);
      if (country && digitsOnly.length <= country.maxLength) {
        setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
      } else if (!country) {
        setFormData((prev) => ({ ...prev, [name]: digitsOnly.slice(0, 15) }));
      }
    } else if (name === "pincode") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error when user types
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleMobileCountryCodeChange = (code: string) => {
    const selectedCountry = getCountryByCode(code, countryCodes);
    setFormData((prev) => ({ ...prev, mobileCountryCode: code }));
    if (selectedCountry) {
      setMobileCountrySearchQuery(selectedCountry.name);
    }
    setShowMobileCountryDropdown(false);
    if (errors.mobileNumber) {
      setErrors((prev) => ({ ...prev, mobileNumber: undefined }));
    }
    if (errors.mobileCountryCode) {
      setErrors((prev) => ({ ...prev, mobileCountryCode: undefined }));
    }
    // If "same as mobile" is checked, update WhatsApp country code too
    if (sameAsMobile) {
      setFormData((prev) => ({ ...prev, whatsappCountryCode: code }));
      setWhatsappCountrySearchQuery(selectedCountry?.name || "");
    }
  };

  const handleWhatsappCountryCodeChange = (code: string) => {
    const selectedCountry = getCountryByCode(code, countryCodes);
    setFormData((prev) => ({ ...prev, whatsappCountryCode: code }));
    if (selectedCountry) {
      setWhatsappCountrySearchQuery(selectedCountry.name);
    }
    setShowWhatsappCountryDropdown(false);
    if (errors.whatsappNumber) {
      setErrors((prev) => ({ ...prev, whatsappNumber: undefined }));
    }
    if (errors.whatsappCountryCode) {
      setErrors((prev) => ({ ...prev, whatsappCountryCode: undefined }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({ ...prev, proofFile: "Please upload an image file" }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, proofFile: "File size must be less than 5MB" }));
        return;
      }

      setFormData((prev) => ({ ...prev, proofFile: file }));
      setErrors((prev) => ({ ...prev, proofFile: undefined }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = "Business name is required";
    }

    if (!formData.ownerName.trim()) {
      newErrors.ownerName = "Owner name is required";
    }

    if (!formData.mobileCountryCode) {
      newErrors.mobileCountryCode = "Country code is required";
    }
    
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = "Mobile number is required";
    } else {
      const mobileNo = formData.mobileNumber.trim();
      // Only validate if country codes are loaded
      if (countryCodes.length > 0) {
        const country = getCountryByCode(formData.mobileCountryCode, countryCodes);
        if (country) {
          if (country.minLength === country.maxLength) {
            if (mobileNo.length !== country.minLength) {
              newErrors.mobileNumber = `Mobile number must be exactly ${country.minLength} digits`;
            } else if (!country.pattern.test(mobileNo)) {
              newErrors.mobileNumber = `Invalid mobile number format. Example: ${country.example}`;
            }
          } else {
            if (mobileNo.length < country.minLength || mobileNo.length > country.maxLength) {
              newErrors.mobileNumber = `Mobile number must be ${country.minLength}-${country.maxLength} digits`;
            } else if (!country.pattern.test(mobileNo)) {
              newErrors.mobileNumber = `Invalid mobile number format. Example: ${country.example}`;
            }
          }
        } else {
          // Country not found, use generic validation
          if (mobileNo.length < 8 || mobileNo.length > 15) {
            newErrors.mobileNumber = "Please enter a valid mobile number (8-15 digits)";
          }
        }
      } else {
        // Countries not loaded yet, use basic validation
        if (mobileNo.length < 8 || mobileNo.length > 15) {
          newErrors.mobileNumber = "Please enter a valid mobile number (8-15 digits)";
        }
      }
    }

    if (!formData.whatsappCountryCode) {
      newErrors.whatsappCountryCode = "Country code is required";
    }
    
    if (!formData.whatsappNumber.trim()) {
      newErrors.whatsappNumber = "WhatsApp number is required";
    } else {
      const whatsappNo = formData.whatsappNumber.trim();
      // Only validate if country codes are loaded
      if (countryCodes.length > 0) {
        const country = getCountryByCode(formData.whatsappCountryCode, countryCodes);
        if (country) {
          if (country.minLength === country.maxLength) {
            if (whatsappNo.length !== country.minLength) {
              newErrors.whatsappNumber = `WhatsApp number must be exactly ${country.minLength} digits`;
            } else if (!country.pattern.test(whatsappNo)) {
              newErrors.whatsappNumber = `Invalid WhatsApp number format. Example: ${country.example}`;
            }
          } else {
            if (whatsappNo.length < country.minLength || whatsappNo.length > country.maxLength) {
              newErrors.whatsappNumber = `WhatsApp number must be ${country.minLength}-${country.maxLength} digits`;
            } else if (!country.pattern.test(whatsappNo)) {
              newErrors.whatsappNumber = `Invalid WhatsApp number format. Example: ${country.example}`;
            }
          }
        } else {
          // Country not found, use generic validation
          if (whatsappNo.length < 8 || whatsappNo.length > 15) {
            newErrors.whatsappNumber = "Please enter a valid WhatsApp number (8-15 digits)";
          }
        }
      } else {
        // Countries not loaded yet, use basic validation
        if (whatsappNo.length < 8 || whatsappNo.length > 15) {
          newErrors.whatsappNumber = "Please enter a valid WhatsApp number (8-15 digits)";
        }
      }
    }

    if (!formData.emailAddress.trim()) {
      newErrors.emailAddress = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.emailAddress)) {
      newErrors.emailAddress = "Invalid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // GST Number is optional, but if provided, validate format (15 characters, alphanumeric)
    if (formData.gstNumber.trim() && formData.gstNumber.length !== 15) {
      newErrors.gstNumber = "GST number must be 15 characters";
    }

    if (!formData.fullBusinessAddress.trim()) {
      newErrors.fullBusinessAddress = "Full business address is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (formData.pincode.length !== 6) {
      newErrors.pincode = "Pincode must be 6 digits";
    }

    if (!formData.proofFile) {
      newErrors.proofFile = "Please upload a proof (visiting card or shop photo)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append("businessName", formData.businessName);
      submitData.append("ownerName", formData.ownerName);
      submitData.append("mobileNumber", `${formData.mobileCountryCode}${formData.mobileNumber}`);
      submitData.append("whatsappNumber", `${formData.whatsappCountryCode}${formData.whatsappNumber}`);
      submitData.append("emailAddress", formData.emailAddress);
      submitData.append("password", formData.password);
      submitData.append("gstNumber", formData.gstNumber || "");
      submitData.append("fullBusinessAddress", formData.fullBusinessAddress);
      submitData.append("city", formData.city);
      submitData.append("state", formData.state);
      submitData.append("pincode", formData.pincode);
      
      if (formData.proofFile) {
        submitData.append("proofFile", formData.proofFile);
      }

      const response = await fetch(
        `${API_BASE_URL_WITH_API}/auth/submit-print-partner-request`,
        {
          method: "POST",
          body: submitData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setIsSubmitting(false);
        alert(data.message || "Failed to submit request. Please try again.");
        return;
      }

      // Show success message
      setShowSuccess(true);
      setIsSubmitting(false);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      alert("Server error. Please try again.");
    }
  };

  const handleSameAsMobileChange = (checked: boolean) => {
    setSameAsMobile(checked);
    if (checked) {
      // Copy mobile number and country code to WhatsApp
      setFormData((prev) => ({
        ...prev,
        whatsappCountryCode: prev.mobileCountryCode,
        whatsappNumber: prev.mobileNumber,
      }));
      // Update WhatsApp country search query
      const selectedCountry = getCountryByCode(formData.mobileCountryCode, countryCodes);
      if (selectedCountry) {
        setWhatsappCountrySearchQuery(selectedCountry.name);
      }
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-cream-900">
          Print Partner
        </h2>
        <p className="mt-2 text-sm sm:text-base text-cream-600">
          Register as a print partner to start your business journey
        </p>
      </div>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        {/* Business Name */}
        <div>
          <label
            htmlFor="businessName"
            className="block text-sm font-medium text-cream-700 mb-1"
          >
            Business Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 className="h-5 w-5 text-cream-400" />
            </div>
            <input
              id="businessName"
              name="businessName"
              type="text"
              value={formData.businessName}
              onChange={handleChange}
              className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                errors.businessName
                  ? "border-red-300 focus:ring-red-500"
                  : "border-cream-200 focus:ring-cream-900"
              } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
              placeholder="Enter business name"
            />
          </div>
          {errors.businessName && (
            <p className="mt-1 text-xs text-red-500">{errors.businessName}</p>
          )}
        </div>

        {/* Owner Name */}
        <div>
          <label
            htmlFor="ownerName"
            className="block text-sm font-medium text-cream-700 mb-1"
          >
            Owner Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-cream-400" />
            </div>
            <input
              id="ownerName"
              name="ownerName"
              type="text"
              value={formData.ownerName}
              onChange={handleChange}
              className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                errors.ownerName
                  ? "border-red-300 focus:ring-red-500"
                  : "border-cream-200 focus:ring-cream-900"
              } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
              placeholder="Enter owner name"
            />
          </div>
          {errors.ownerName && (
            <p className="mt-1 text-xs text-red-500">{errors.ownerName}</p>
          )}
        </div>

        {/* Mobile Number */}
        <div>
            <label
              htmlFor="mobileNumber"
              className="block text-sm font-medium text-cream-700 mb-1"
            >
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {/* Country Code Dropdown */}
              <div className="relative" ref={mobileCountryDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    const isOpening = !showMobileCountryDropdown;
                    setShowMobileCountryDropdown(isOpening);
                    if (isOpening && formData.mobileCountryCode && !mobileCountrySearchQuery) {
                      const selectedCountry = getCountryByCode(formData.mobileCountryCode, countryCodes);
                      if (selectedCountry) {
                        setMobileCountrySearchQuery(selectedCountry.name);
                      }
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-3 border ${
                    errors.mobileCountryCode
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
                          src={getCountryByCode(formData.mobileCountryCode, countryCodes)?.flagUrl || "https://flagcdn.com/w40/in.png"}
                          alt={getCountryByCode(formData.mobileCountryCode, countryCodes)?.name || "Country"}
                          className="w-6 h-4 object-cover rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://flagcdn.com/w40/${getCountryByCode(formData.mobileCountryCode, countryCodes)?.country.toLowerCase() || 'in'}.png`;
                          }}
                        />
                        <span className="font-medium">
                          {formData.mobileCountryCode}
                        </span>
                      </>
                    )}
                  </span>
                  <ChevronDown 
                    className={`h-4 w-4 text-cream-400 transition-transform ${
                      showMobileCountryDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showMobileCountryDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMobileCountryDropdown(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 mt-1 w-72 bg-white border border-cream-200 rounded-xl shadow-2xl"
                      >
                        <div className="p-2 border-b border-cream-200">
                          <div className="relative">
                            <div className="relative w-full">
                              <input
                                type="text"
                                placeholder="Search country or code..."
                                value={mobileCountrySearchQuery}
                                onChange={(e) => setMobileCountrySearchQuery(e.target.value)}
                                className="w-full px-3 py-2 pl-9 pr-8 border border-cream-200 rounded-lg text-sm text-cream-900 focus:outline-none focus:ring-2 focus:ring-cream-900 transition-all"
                                autoFocus
                              />
                              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-cream-400" />
                              {mobileCountrySearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setMobileCountrySearchQuery("")}
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cream-400 hover:text-cream-900 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          {mobileCountrySearchQuery && filteredMobileCountries.length > 0 && (
                            <p className="text-xs text-cream-500 mt-1 px-1">
                              {filteredMobileCountries.length} {filteredMobileCountries.length === 1 ? 'country' : 'countries'} found
                            </p>
                          )}
                        </div>

                        <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                          {isLoadingCountries ? (
                            <div className="p-8 text-center">
                              <Loader className="h-6 w-6 animate-spin text-cream-400 mx-auto mb-2" />
                              <p className="text-sm text-cream-600">Loading countries...</p>
                            </div>
                          ) : filteredMobileCountries.length === 0 ? (
                            <div className="p-8 text-center">
                              <p className="text-sm text-cream-600">No countries found</p>
                            </div>
                          ) : (
                            <div className="p-2">
                              {filteredMobileCountries.map((country, index) => (
                                <button
                                  key={country.uniqueId || `${country.code}-${country.country}-${index}`}
                                  type="button"
                                  onClick={() => handleMobileCountryCodeChange(country.code)}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-cream-50 transition-colors text-left ${
                                    formData.mobileCountryCode === country.code
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
                                  {formData.mobileCountryCode === country.code && (
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
                  id="mobileNumber"
                  name="mobileNumber"
                  type="tel"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                    errors.mobileNumber
                      ? "border-red-300 focus:ring-red-500"
                      : "border-cream-200 focus:ring-cream-900"
                  } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                  placeholder={
                    getCountryByCode(formData.mobileCountryCode, countryCodes)?.example || "1234567890"
                  }
                  maxLength={getCountryByCode(formData.mobileCountryCode, countryCodes)?.maxLength || 15}
                />
              </div>
            </div>
            {errors.mobileNumber && (
              <p className="mt-1 text-xs text-red-500">{errors.mobileNumber}</p>
            )}
            {errors.mobileCountryCode && (
              <p className="mt-1 text-xs text-red-500">{errors.mobileCountryCode}</p>
            )}
            {/* Same as mobile number checkbox */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="sameAsMobile"
                checked={sameAsMobile}
                onChange={(e) => handleSameAsMobileChange(e.target.checked)}
                className="w-4 h-4 text-cream-900 border-cream-300 rounded focus:ring-cream-900"
              />
              <label
                htmlFor="sameAsMobile"
                className="text-sm text-cream-700 cursor-pointer"
              >
                Same as mobile number
              </label>
            </div>
          </div>

        {/* WhatsApp Number */}
        <div>
            <label
              htmlFor="whatsappNumber"
              className="block text-sm font-medium text-cream-700 mb-1"
            >
              WhatsApp Number <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {/* Country Code Dropdown */}
              <div className="relative" ref={whatsappCountryDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (sameAsMobile) return;
                    const isOpening = !showWhatsappCountryDropdown;
                    setShowWhatsappCountryDropdown(isOpening);
                    if (isOpening && formData.whatsappCountryCode && !whatsappCountrySearchQuery) {
                      const selectedCountry = getCountryByCode(formData.whatsappCountryCode, countryCodes);
                      if (selectedCountry) {
                        setWhatsappCountrySearchQuery(selectedCountry.name);
                      }
                    }
                  }}
                  disabled={sameAsMobile}
                  className={`flex items-center gap-2 px-3 py-3 border ${
                    errors.whatsappCountryCode
                      ? "border-red-300 focus:ring-red-500"
                      : "border-cream-200 focus:ring-cream-900"
                  } text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all bg-white min-w-[140px] justify-between hover:bg-cream-50 ${
                    sameAsMobile ? "bg-cream-100 cursor-not-allowed opacity-75" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {isLoadingCountries ? (
                      <Loader className="h-4 w-4 animate-spin text-cream-400" />
                    ) : (
                      <>
                        <img
                          src={getCountryByCode(formData.whatsappCountryCode, countryCodes)?.flagUrl || "https://flagcdn.com/w40/in.png"}
                          alt={getCountryByCode(formData.whatsappCountryCode, countryCodes)?.name || "Country"}
                          className="w-6 h-4 object-cover rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://flagcdn.com/w40/${getCountryByCode(formData.whatsappCountryCode, countryCodes)?.country.toLowerCase() || 'in'}.png`;
                          }}
                        />
                        <span className="font-medium">
                          {formData.whatsappCountryCode}
                        </span>
                      </>
                    )}
                  </span>
                  <ChevronDown 
                    className={`h-4 w-4 text-cream-400 transition-transform ${
                      showWhatsappCountryDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showWhatsappCountryDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowWhatsappCountryDropdown(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 mt-1 w-72 bg-white border border-cream-200 rounded-xl shadow-2xl"
                      >
                        <div className="p-2 border-b border-cream-200">
                          <div className="relative">
                            <div className="relative w-full">
                              <input
                                type="text"
                                placeholder="Search country or code..."
                                value={whatsappCountrySearchQuery}
                                onChange={(e) => setWhatsappCountrySearchQuery(e.target.value)}
                                className="w-full px-3 py-2 pl-9 pr-8 border border-cream-200 rounded-lg text-sm text-cream-900 focus:outline-none focus:ring-2 focus:ring-cream-900 transition-all"
                                autoFocus
                              />
                              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-cream-400" />
                              {whatsappCountrySearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setWhatsappCountrySearchQuery("")}
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cream-400 hover:text-cream-900 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          {whatsappCountrySearchQuery && filteredWhatsappCountries.length > 0 && (
                            <p className="text-xs text-cream-500 mt-1 px-1">
                              {filteredWhatsappCountries.length} {filteredWhatsappCountries.length === 1 ? 'country' : 'countries'} found
                            </p>
                          )}
                        </div>

                        <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                          {isLoadingCountries ? (
                            <div className="p-8 text-center">
                              <Loader className="h-6 w-6 animate-spin text-cream-400 mx-auto mb-2" />
                              <p className="text-sm text-cream-600">Loading countries...</p>
                            </div>
                          ) : filteredWhatsappCountries.length === 0 ? (
                            <div className="p-8 text-center">
                              <p className="text-sm text-cream-600">No countries found</p>
                            </div>
                          ) : (
                            <div className="p-2">
                              {filteredWhatsappCountries.map((country, index) => (
                                <button
                                  key={country.uniqueId || `${country.code}-${country.country}-${index}`}
                                  type="button"
                                  onClick={() => handleWhatsappCountryCodeChange(country.code)}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-cream-50 transition-colors text-left ${
                                    formData.whatsappCountryCode === country.code
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
                                  {formData.whatsappCountryCode === country.code && (
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

              {/* WhatsApp Number Input */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-cream-400" />
                </div>
                <input
                  id="whatsappNumber"
                  name="whatsappNumber"
                  type="tel"
                  value={formData.whatsappNumber}
                  onChange={handleChange}
                  disabled={sameAsMobile}
                  className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                    errors.whatsappNumber
                      ? "border-red-300 focus:ring-red-500"
                      : "border-cream-200 focus:ring-cream-900"
                  } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all ${
                    sameAsMobile ? "bg-cream-100 cursor-not-allowed opacity-75" : ""
                  }`}
                  placeholder={
                    getCountryByCode(formData.whatsappCountryCode, countryCodes)?.example || "1234567890"
                  }
                  maxLength={getCountryByCode(formData.whatsappCountryCode, countryCodes)?.maxLength || 15}
                />
              </div>
            </div>
            {errors.whatsappNumber && (
              <p className="mt-1 text-xs text-red-500">{errors.whatsappNumber}</p>
            )}
            {errors.whatsappCountryCode && (
              <p className="mt-1 text-xs text-red-500">{errors.whatsappCountryCode}</p>
            )}
          </div>

        {/* Email Address */}
        <div>
          <label
            htmlFor="emailAddress"
            className="block text-sm font-medium text-cream-700 mb-1"
          >
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-cream-400" />
            </div>
            <input
              id="emailAddress"
              name="emailAddress"
              type="email"
              value={formData.emailAddress}
              onChange={handleChange}
              className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                errors.emailAddress
                  ? "border-red-300 focus:ring-red-500"
                  : "border-cream-200 focus:ring-cream-900"
              } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
              placeholder="business@example.com"
            />
          </div>
          {errors.emailAddress && (
            <p className="mt-1 text-xs text-red-500">{errors.emailAddress}</p>
          )}
        </div>

        {/* Password and Confirm Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-cream-700 mb-1"
            >
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockIcon className="h-5 w-5 text-cream-400" />
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
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockIcon className="h-5 w-5 text-cream-400" />
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
              <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* GST Number (Optional) */}
        <div>
          <label
            htmlFor="gstNumber"
            className="block text-sm font-medium text-cream-700 mb-1"
          >
            GST Number <span className="text-cream-500 text-xs">(Optional)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 className="h-5 w-5 text-cream-400" />
            </div>
            <input
              id="gstNumber"
              name="gstNumber"
              type="text"
              value={formData.gstNumber}
              onChange={handleChange}
              maxLength={15}
              className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                errors.gstNumber
                  ? "border-red-300 focus:ring-red-500"
                  : "border-cream-200 focus:ring-cream-900"
              } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
              placeholder="15-character GST number"
            />
          </div>
          {errors.gstNumber && (
            <p className="mt-1 text-xs text-red-500">{errors.gstNumber}</p>
          )}
        </div>

        {/* Full Business Address */}
        <div>
          <label
            htmlFor="fullBusinessAddress"
            className="block text-sm font-medium text-cream-700 mb-1"
          >
            Full Business Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3 flex items-start pointer-events-none">
              <MapPin className="h-5 w-5 text-cream-400" />
            </div>
            <textarea
              id="fullBusinessAddress"
              name="fullBusinessAddress"
              value={formData.fullBusinessAddress}
              onChange={handleChange}
              rows={3}
              className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                errors.fullBusinessAddress
                  ? "border-red-300 focus:ring-red-500"
                  : "border-cream-200 focus:ring-cream-900"
              } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all resize-none`}
              placeholder="Enter complete business address"
            />
          </div>
          {errors.fullBusinessAddress && (
            <p className="mt-1 text-xs text-red-500">{errors.fullBusinessAddress}</p>
          )}
        </div>

        {/* City, State, Pincode */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-cream-700 mb-1"
            >
              City <span className="text-red-500">*</span>
            </label>
            <input
              id="city"
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              className={`appearance-none relative block w-full px-3 py-3 border ${
                errors.city
                  ? "border-red-300 focus:ring-red-500"
                  : "border-cream-200 focus:ring-cream-900"
              } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
              placeholder="City"
            />
            {errors.city && (
              <p className="mt-1 text-xs text-red-500">{errors.city}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="state"
              className="block text-sm font-medium text-cream-700 mb-1"
            >
              State <span className="text-red-500">*</span>
            </label>
            <input
              id="state"
              name="state"
              type="text"
              value={formData.state}
              onChange={handleChange}
              className={`appearance-none relative block w-full px-3 py-3 border ${
                errors.state
                  ? "border-red-300 focus:ring-red-500"
                  : "border-cream-200 focus:ring-cream-900"
              } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
              placeholder="State"
            />
            {errors.state && (
              <p className="mt-1 text-xs text-red-500">{errors.state}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="pincode"
              className="block text-sm font-medium text-cream-700 mb-1"
            >
              Pincode <span className="text-red-500">*</span>
            </label>
            <input
              id="pincode"
              name="pincode"
              type="text"
              value={formData.pincode}
              onChange={handleChange}
              maxLength={6}
              className={`appearance-none relative block w-full px-3 py-3 border ${
                errors.pincode
                  ? "border-red-300 focus:ring-red-500"
                  : "border-cream-200 focus:ring-cream-900"
              } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
              placeholder="123456"
            />
            {errors.pincode && (
              <p className="mt-1 text-xs text-red-500">{errors.pincode}</p>
            )}
          </div>
        </div>

        {/* Upload Proof */}
        <div>
          <label
            htmlFor="proofFile"
            className="block text-sm font-medium text-cream-700 mb-1"
          >
            Upload Proof (Visiting card or shop photo) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="proofFile"
              name="proofFile"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full px-4 py-3 border-2 border-dashed rounded-xl transition-all ${
                errors.proofFile
                  ? "border-red-300 bg-red-50"
                  : formData.proofFile
                  ? "border-green-300 bg-green-50"
                  : "border-cream-300 bg-cream-50 hover:border-cream-900 hover:bg-cream-100"
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <FileImage className={`h-8 w-8 ${
                  errors.proofFile
                    ? "text-red-400"
                    : formData.proofFile
                    ? "text-green-600"
                    : "text-cream-400"
                }`} />
                <span className={`text-sm ${
                  errors.proofFile
                    ? "text-red-600"
                    : formData.proofFile
                    ? "text-green-700"
                    : "text-cream-600"
                }`}>
                  {formData.proofFile
                    ? formData.proofFile.name
                    : "Click to upload visiting card or shop photo"}
                </span>
                {formData.proofFile && (
                  <span className="text-xs text-cream-500">
                    {(formData.proofFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                )}
              </div>
            </button>
          </div>
          {errors.proofFile && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.proofFile}
            </p>
          )}
          {previewUrl && (
            <div className="mt-3">
              <img
                src={previewUrl}
                alt="Proof preview"
                className="max-w-full h-auto max-h-48 rounded-lg border border-cream-200"
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-cream-50 bg-cream-900 hover:bg-cream-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cream-500 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader className="animate-spin h-5 w-5 mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </button>
        </div>
      </form>

      {/* Success Message Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
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
              <h3 className="text-2xl font-bold text-cream-900 mb-4">
                Request Submitted Successfully!
              </h3>
              <div className="space-y-3 text-left mb-6">
                <p className="text-sm text-cream-700">
                  Your request has been submitted successfully.
                </p>
                <p className="text-sm text-cream-700">
                  Our verification team will review your details.
                </p>
                <p className="text-sm text-cream-700">
                  You will receive an update within one working day via Call, WhatsApp, SMS, or Email.
                </p>
              </div>
              <button
                onClick={onBack}
                className="w-full bg-cream-900 text-cream-50 py-3 px-4 rounded-xl font-medium hover:bg-cream-800 transition-colors"
              >
                Back to Login
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PrintPartnerForm;

