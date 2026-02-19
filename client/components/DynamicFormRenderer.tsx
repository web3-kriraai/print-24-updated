import React, { useState } from 'react';
import axios from 'axios';
import {
  Eye, EyeOff, Upload, X, FileText, Mail, Phone, Lock,
  Calendar, Hash, Type, CheckSquare, ListFilter, CheckCircle,
  Shield, Loader, Key, Globe, User, Building, Briefcase,
  Smartphone, Link, CalendarDays, FileCheck, AlertTriangle,
  Clock, ShieldCheck, Sparkles, ChevronDown
} from 'lucide-react';

interface FormFieldSchema {
  fieldId: string;
  label: string;
  fieldType: string;
  placeholder?: string;
  helpText?: string;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    customErrorMessage?: string;
  };
  options?: Array<{ label: string; value: string }>;
  fileSettings?: {
    acceptedTypes?: string[];
    maxSizeBytes?: number;
    multiple?: boolean;
  };
  order?: number;
}

interface DynamicFormRendererProps {
  formSchema: {
    _id: string;
    name: string;
    code: string;
    fields: FormFieldSchema[];
    instructions?: string;
    submissionSettings?: {
      successMessage?: string;
    };
  };
  userSegmentCode: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  formSchema,
  userSegmentCode,
  onSuccess,
  onError,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  // OTP Verification State
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Password Validation State
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordsMatch, setPasswordsMatch] = useState(false);

  const handleChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleFileChange = (fieldId: string, fileList: FileList | null) => {
    if (!fileList) return;
    const filesArray = Array.from(fileList);
    setFiles((prev) => ({ ...prev, [fieldId]: filesArray }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const removeFile = (fieldId: string, index: number) => {
    setFiles((prev) => {
      const newFiles = { ...prev };
      newFiles[fieldId] = newFiles[fieldId].filter((_, i) => i !== index);
      if (newFiles[fieldId].length === 0) {
        delete newFiles[fieldId];
      }
      return newFiles;
    });
  };

  const validateField = (field: FormFieldSchema): string | null => {
    const value = formData[field.fieldId];
    const validation = field.validation;

    if (!validation) return null;

    // Required validation
    if (validation.required && !value && !files[field.fieldId]) {
      return validation.customErrorMessage || `${field.label} is required`;
    }

    if (!value) return null; // Skip other validations if no value

    // Confirm Password - must match password field
    if (field.fieldId === 'confirmPassword') {
      const password = formData['password'];
      if (value !== password) {
        return 'Passwords do not match';
      }
    }

    // Email validation
    if (field.fieldType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    // Phone validation
    if (field.fieldType === 'phone') {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 10) {
        return 'Please enter a valid phone number (at least 10 digits)';
      }
    }

    // URL validation
    if (field.fieldType === 'url') {
      try {
        new URL(value);
      } catch {
        return 'Please enter a valid URL';
      }
    }

    // String length validations
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        return `${field.label} must be at least ${validation.minLength} characters`;
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return `${field.label} must not exceed ${validation.maxLength} characters`;
      }
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          return validation.customErrorMessage || `${field.label} format is invalid`;
        }
      }
    }

    // Number validations
    if (field.fieldType === 'number' && typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        return `${field.label} must be at least ${validation.min}`;
      }
      if (validation.max !== undefined && value > validation.max) {
        return `${field.label} must not exceed ${validation.max}`;
      }
    }

    return null;
  };

  // Send OTP to email
  const handleSendOTP = async (fieldId: string) => {
    const email = formData[fieldId];

    if (!email) {
      setOtpError('Please enter your email first');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setOtpError('Please enter a valid email address');
      return;
    }

    setSendingOtp(true);
    setOtpError('');

    try {
      const response = await axios.post('/api/otp/send-email', { email });

      if (response.data.success) {
        setOtpSent(true);
        setOtpError('');
      } else {
        setOtpError(response.data.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      setOtpError(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (fieldId: string) => {
    const email = formData[fieldId];

    if (!otp || otp.length !== 6) {
      setOtpError('Please enter the 6-digit code');
      return;
    }

    setVerifyingOtp(true);
    setOtpError('');

    try {
      const response = await axios.post('/api/otp/verify-email', { email, otp });

      if (response.data.success) {
        setEmailVerified(true);
        setOtpError('');
        setOtpSent(false);
      } else {
        setOtpError(response.data.message || 'Invalid OTP');
      }
    } catch (error: any) {
      setOtpError(error.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Calculate password strength
  const calculatePasswordStrength = (password: string): number => {
    if (!password) return 0;

    let strength = 0;

    // Length check
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 10;

    // Character variety checks
    if (/[a-z]/.test(password)) strength += 20; // lowercase
    if (/[A-Z]/.test(password)) strength += 20; // uppercase
    if (/\d/.test(password)) strength += 15; // numbers
    if (/[@$!%*?&]/.test(password)) strength += 15; // special chars

    return Math.min(strength, 100);
  };

  // Check if passwords match
  const checkPasswordsMatch = (): boolean => {
    const password = formData['password'];
    const confirmPassword = formData['confirmPassword'];

    if (!password || !confirmPassword) return false;
    return password === confirmPassword;
  };

  // Update password strength when password changes
  React.useEffect(() => {
    const password = formData['password'];
    if (password) {
      setPasswordStrength(calculatePasswordStrength(password));
    } else {
      setPasswordStrength(0);
    }

    // Check if passwords match
    setPasswordsMatch(checkPasswordsMatch());
  }, [formData['password'], formData['confirmPassword']]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check email verification first (only if form has an email field)
    const hasEmailField = formSchema.fields.some(f => f.fieldType === 'email');
    if (hasEmailField && !emailVerified) {
      setErrors({ email: 'Please verify your email before submitting' });
      return;
    }

    // Check password matching
    if (formData['password'] && formData['confirmPassword']) {
      if (formData['password'] !== formData['confirmPassword']) {
        setErrors({ confirmPassword: 'Passwords do not match' });
        return;
      }
    }

    // Validate all fields
    const newErrors: Record<string, string> = {};
    formSchema.fields.forEach((field) => {
      const error = validateField(field);
      if (error) {
        newErrors[field.fieldId] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);

      // Prepare form data for submission
      const submitData = new FormData();
      submitData.append('userSegmentCode', userSegmentCode);
      submitData.append('email', formData.email || formData.emailAddress || formData.officialEmail || '');
      submitData.append('formData', JSON.stringify(formData));

      // Append files
      Object.entries(files).forEach(([fieldId, fileList]) => {
        fileList.forEach((file) => {
          submitData.append('files', file, file.name);
          submitData.append(`${fieldId}_label`, formSchema.fields.find(f => f.fieldId === fieldId)?.label || fieldId);
        });
      });

      const response = await axios.post('/api/segment-applications', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // If token is returned, store it for auto-login
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        console.log('✅ User logged in automatically after signup');
      }

      if (onSuccess) {
        onSuccess(response.data);
      }

      // Clear form
      setFormData({});
      setFiles({});
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to submit application';
      if (onError) {
        onError(errorMessage);
      }
      setErrors({ _form: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  const getFieldIcon = (fieldType: string, fieldId?: string) => {
    const iconProps = { className: "w-5 h-5" };

    switch (fieldType) {
      case 'email': return <Mail {...iconProps} />;
      case 'password':
      case 'confirmPassword': return <Key {...iconProps} />;
      case 'phone': return <Smartphone {...iconProps} />;
      case 'number': return <Hash {...iconProps} />;
      case 'textarea': return <FileText {...iconProps} />;
      case 'date': return <CalendarDays {...iconProps} />;
      case 'file': return <Upload {...iconProps} />;
      case 'checkbox': return <CheckSquare {...iconProps} />;
      case 'select':
      case 'radio': return <ListFilter {...iconProps} />;
      case 'url': return <Link {...iconProps} />;
      case 'text':
        if (fieldId?.includes('name')) return <User {...iconProps} />;
        if (fieldId?.includes('company')) return <Building {...iconProps} />;
        if (fieldId?.includes('job')) return <Briefcase {...iconProps} />;
        return <Type {...iconProps} />;
      default: return <Type {...iconProps} />;
    }
  };

  const getFieldColor = (fieldType: string) => {
    switch (fieldType) {
      case 'email': return 'text-blue-600 bg-blue-50';
      case 'password': return 'text-purple-600 bg-purple-50';
      case 'phone': return 'text-green-600 bg-green-50';
      case 'file': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Render field without icons and with grid support
  const renderField = (field: FormFieldSchema) => {
    const value = formData[field.fieldId] || '';
    const error = errors[field.fieldId];

    // Determine column span
    // Email, Textarea, File, Radio, Checkbox, and Section headers take full width
    const isFullWidth = ['email', 'textarea', 'file', 'radio', 'checkbox'].includes(field.fieldType) || field.fieldId === 'section_header';
    const colSpanClass = isFullWidth ? 'col-span-1 md:col-span-2' : 'col-span-1';

    const baseInputStyles = `w-full px-4 py-3 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 text-gray-800 placeholder-gray-400 ${error
        ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-200'
        : 'border-gray-300 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-blue-200'
      }`;

    // Common label rendering
    const Label = () => (
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {field.label}
        {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
      </label>
    );

    // Common error rendering
    const ErrorMessage = () => (
      error ? (
        <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
          <AlertTriangle size={12} />
          {error}
        </p>
      ) : null
    );

    // Common help using rendering
    const HelpText = () => (
      field.helpText ? (
        <p className="text-xs text-gray-500 mt-1.5">{field.helpText}</p>
      ) : null
    );

    switch (field.fieldType) {
      case 'email':
        return (
          <div key={field.fieldId} className={colSpanClass}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                {field.label}
                {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {emailVerified && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  <ShieldCheck size={12} />
                  Verified
                </span>
              )}
            </div>

            <div className="flex gap-3 items-start">
              <div className="flex-1 relative">
                <input
                  type="email"
                  value={value}
                  onChange={(e) => handleChange(field.fieldId, e.target.value)}
                  placeholder={field.placeholder || "you@example.com"}
                  className={`${baseInputStyles} ${emailVerified ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed' : ''}`}
                  disabled={emailVerified}
                />
                <ErrorMessage />
                <HelpText />
              </div>

              {!emailVerified && (
                <button
                  type="button"
                  onClick={() => handleSendOTP(field.fieldId)}
                  disabled={sendingOtp || !value || otpSent}
                  className="shrink-0 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm whitespace-nowrap h-[46px]"
                >
                  {sendingOtp ? (
                    <Loader size={18} className="animate-spin" />
                  ) : otpSent ? (
                    'Sent'
                  ) : (
                    'Verify Email'
                  )}
                </button>
              )}
            </div>

            {/* OTP Verification UI - Inline below input */}
            {!emailVerified && otpSent && (
              <div className="mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-lg animate-fadeIn">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <div className="text-sm text-gray-600 font-medium whitespace-nowrap">
                    Enter Code:
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-40 px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono tracking-widest bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleVerifyOTP(field.fieldId)}
                    disabled={verifyingOtp || otp.length !== 6}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 font-medium text-sm w-full sm:w-auto"
                  >
                    {verifyingOtp ? <Loader size={16} className="animate-spin text-white" /> : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendOTP(field.fieldId)}
                    disabled={sendingOtp}
                    className="text-xs text-blue-600 hover:text-blue-800 underline ml-auto sm:ml-2"
                  >
                    Resend Code
                  </button>
                </div>
                {otpError && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1 font-medium">
                    <AlertTriangle size={12} />
                    {otpError}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 'text':
      case 'phone':
      case 'url':
      case 'number':
      case 'date':
        return (
          <div key={field.fieldId} className={colSpanClass}>
            <Label />
            <input
              type={field.fieldType === 'url' ? 'text' : field.fieldType}
              value={value}
              onChange={(e) => handleChange(field.fieldId, e.target.value)}
              placeholder={field.placeholder}
              className={baseInputStyles}
            />
            <ErrorMessage />
            <HelpText />
          </div>
        );

      case 'password':
        const isPasswordField = field.fieldId === 'password';
        const isConfirmPasswordField = field.fieldId === 'confirmPassword';

        return (
          <div key={field.fieldId} className={colSpanClass}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                {field.label}
                {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {isConfirmPasswordField && formData['confirmPassword'] && (
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${passwordsMatch ? 'text-green-700' : 'text-red-700'
                  }`}>
                  {passwordsMatch ? <CheckCircle size={12} /> : <X size={12} />}
                  {passwordsMatch ? 'Match' : 'Mismatch'}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showPassword[field.fieldId] ? 'text' : 'password'}
                value={value}
                onChange={(e) => handleChange(field.fieldId, e.target.value)}
                placeholder={field.placeholder || (isPasswordField ? "At least 8 characters" : "Confirm password")}
                className={`${baseInputStyles} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => ({ ...prev, [field.fieldId]: !prev[field.fieldId] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword[field.fieldId] ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <ErrorMessage />

            {/* Password Strength Indicator */}
            {isPasswordField && value && (
              <div className="mt-3">
                <div className="flex gap-1 h-1 mb-2">
                  <div className={`flex-1 rounded-full ${passwordStrength >= 20 ? 'bg-red-500' : 'bg-gray-200'}`} />
                  <div className={`flex-1 rounded-full ${passwordStrength >= 40 ? 'bg-orange-500' : 'bg-gray-200'}`} />
                  <div className={`flex-1 rounded-full ${passwordStrength >= 70 ? 'bg-yellow-500' : 'bg-gray-200'}`} />
                  <div className={`flex-1 rounded-full ${passwordStrength >= 100 ? 'bg-green-500' : 'bg-gray-200'}`} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {[
                    { label: '8+ chars', check: value.length >= 8 },
                    { label: 'Uppercase', check: /[A-Z]/.test(value) },
                    { label: 'Lowercase', check: /[a-z]/.test(value) },
                    { label: 'Number', check: /\d/.test(value) },
                    { label: 'Symbol', check: /[@$!%*?&]/.test(value) }
                  ].map((item, idx) => (
                    <div key={idx} className={`flex items-center gap-1.5 text-xs ${item.check ? 'text-green-600 font-medium' : 'text-gray-400'
                      }`}>
                      {item.check ? <CheckCircle size={10} /> : <div className="w-2.5 h-2.5 rounded-full border border-gray-300" />}
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <HelpText />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.fieldId} className={colSpanClass}>
            <Label />
            <div className="relative">
              <textarea
                value={value}
                onChange={(e) => handleChange(field.fieldId, e.target.value)}
                placeholder={field.placeholder}
                rows={4}
                className={`${baseInputStyles} resize-y min-h-[100px]`}
              />
              <div className="absolute right-2 bottom-2 text-xs text-gray-400 pointer-events-none bg-white px-1">
                {value.length}{field.validation?.maxLength ? `/${field.validation.maxLength}` : ''}
              </div>
            </div>
            <ErrorMessage />
            <HelpText />
          </div>
        );

      case 'select':
        return (
          <div key={field.fieldId} className={colSpanClass}>
            <Label />
            <div className="relative">
              <select
                value={value}
                onChange={(e) => handleChange(field.fieldId, e.target.value)}
                className={`${baseInputStyles} appearance-none cursor-pointer pr-10`}
              >
                <option value="" className="text-gray-400">Select...</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value} className="text-gray-800">
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>
            </div>
            <ErrorMessage />
            <HelpText />
          </div>
        );

      case 'radio':
        return (
          <div key={field.fieldId} className={colSpanClass}>
            <Label />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field.options?.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 border rounded-lg transition-all cursor-pointer ${value === option.value
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <input
                    type="radio"
                    name={field.fieldId}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => handleChange(field.fieldId, e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            <ErrorMessage />
            <HelpText />
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.fieldId} className={colSpanClass}>
            <label className={`flex items-start p-4 border rounded-lg transition-all cursor-pointer ${value === true ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
              <input
                type="checkbox"
                checked={value === true}
                onChange={(e) => handleChange(field.fieldId, e.target.checked)}
                className="w-5 h-5 text-blue-600 focus:ring-blue-500 mt-0.5 border-gray-300 rounded"
              />
              <div className="ml-3 flex-1">
                <span className="block text-sm font-semibold text-gray-700 mb-0.5">
                  {field.label}
                  {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
                </span>
                {field.helpText && <span className="text-xs text-gray-500">{field.helpText}</span>}
              </div>
            </label>
            <ErrorMessage />
          </div>
        );

      case 'file':
        return (
          <div key={field.fieldId} className={colSpanClass}>
            <Label />
            <div className={`relative border-2 border-dashed rounded-xl p-6 transition-all text-center ${error
                ? 'border-red-300 bg-red-50/20'
                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/30'
              }`}>
              <input
                type="file"
                onChange={(e) => handleFileChange(field.fieldId, e.target.files)}
                accept={field.fileSettings?.acceptedTypes?.join(',')}
                multiple={field.fileSettings?.multiple}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="pointer-events-none">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  {field.fileSettings?.multiple ? 'Choose files' : 'Choose a file'} or drag & drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {field.fileSettings?.acceptedTypes?.join(', ') || 'Any file type'}
                  {field.fileSettings?.maxSizeBytes && ` • Max ${(field.fileSettings.maxSizeBytes / 1024 / 1024).toFixed(1)}MB`}
                </p>
              </div>
            </div>

            {files[field.fieldId] && files[field.fieldId].length > 0 && (
              <div className="mt-3 grid gap-2">
                {files[field.fieldId].map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="truncate text-gray-700 font-medium">{file.name}</span>
                      <span className="text-gray-400 text-xs shrink-0">({(file.size / 1024).toFixed(0)}KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(field.fieldId, index)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <ErrorMessage />
            <HelpText />
          </div>
        );

      default:
        return null;
    }
  };

  const sortedFields = formSchema.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
  const requiredFields = sortedFields.filter(f => f.validation?.required).length;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Form Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">{formSchema.name}</h2>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full uppercase tracking-wide">
            {requiredFields} required
          </span>
        </div>

        {formSchema.instructions && (
          <p className="text-gray-600 text-sm leading-relaxed">{formSchema.instructions}</p>
        )}
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            {sortedFields.map((field) => renderField(field))}
          </div>

          {errors._form && (
            <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-900">Submission Error</h4>
                <p className="text-sm text-red-700 mt-1">{errors._form}</p>
              </div>
            </div>
          )}
        </div>

        {/* Form Footer */}
        <div className="bg-gray-50 px-6 md:px-8 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-green-600" />
            Secure Form
          </p>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setFormData({});
                setFiles({});
                setErrors({});
              }}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 rounded-lg transition-colors"
            >
              Clear
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Submit Application
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Progress Bar */}
      <div className="mt-4 flex items-center gap-3 px-1">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, (Object.keys(formData).length / sortedFields.length) * 100)}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-500 w-8 text-right">
          {Math.round((Object.keys(formData).length / sortedFields.length) * 100)}%
        </span>
      </div>
    </div>
  );
};

export default DynamicFormRenderer;