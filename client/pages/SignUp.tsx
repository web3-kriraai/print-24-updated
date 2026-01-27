import React, { useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Building2, Briefcase, Loader, ArrowLeft, Mail, Lock, AlertCircle, Printer, CheckCircle } from 'lucide-react';
import { API_BASE_URL_WITH_API } from '../lib/apiConfig';

// Lazy load heavy components for code splitting
const EmailVerification = lazy(() => import('../components/EmailVerification'));
const CorporateForm = lazy(() => import('../components/CorporateForm'));
const PrintPartnerForm = lazy(() => import('../components/PrintPartnerForm'));

type SignupIntent = 'CUSTOMER' | 'PRINT_PARTNER' | 'CORPORATE' | '';
type SignupStep = 'role-selection' | 'email-entry' | 'email-verification' | 'password-setup' | 'business-details' | 'success';

const SignUp: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<SignupStep>('role-selection');
  const [intent, setIntent] = useState<SignupIntent>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Role selection options with print-themed colors
  const roleOptions = [
    {
      id: 'CUSTOMER',
      title: 'Personal / Customer',
      description: 'For individual printing needs',
      icon: User,
      gradient: 'from-cyan-500/20 to-blue-500/20',
      borderColor: 'border-cyan-500/30',
      hoverBg: 'hover:bg-cyan-500/10',
      iconColor: 'text-cyan-400',
    },
    {
      id: 'PRINT_PARTNER',
      title: 'Print Partner',
      description: 'Join as a printing service provider',
      icon: Briefcase,
      gradient: 'from-purple-500/20 to-pink-500/20',
      borderColor: 'border-purple-500/30',
      hoverBg: 'hover:bg-purple-500/10',
      iconColor: 'text-purple-400',
    },
    {
      id: 'CORPORATE',
      title: 'Corporate Member',
      description: 'For businesses and organizations',
      icon: Building2,
      gradient: 'from-emerald-500/20 to-teal-500/20',
      borderColor: 'border-emerald-500/30',
      hoverBg: 'hover:bg-emerald-500/10',
      iconColor: 'text-emerald-400',
    },
  ];

  const handleRoleSelect = (selectedIntent: SignupIntent) => {
    setIntent(selectedIntent);
    setStep('email-entry');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setErrors({});
    setStep('email-verification');
  };

  const handleEmailVerified = () => {
    // After email is verified, move to password setup for customers
    // or business details for partners/corporate
    if (intent === 'CUSTOMER') {
      setStep('password-setup');
    } else {
      setStep('business-details');
    }
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Create customer account with verified email
      const response = await fetch(`${API_BASE_URL_WITH_API}/auth/complete-customer-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.message || 'Signup failed' });
        setIsLoading(false);
        return;
      }

      // If backend returns token and user, store them and redirect
      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/');
      } else {
        // Otherwise show success screen and redirect to login
        setStep('success');
      }
      setIsLoading(false);
    } catch (error) {
      setErrors({ general: 'Server error. Please try again.' });
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'email-entry') {
      setStep('role-selection');
      setIntent('');
    } else if (step === 'email-verification') {
      setStep('email-entry');
    } else if (step === 'password-setup' || step === 'business-details') {
      setStep('email-verification');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Print-Themed Background Elements */}
      <motion.div
        className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-orange-500/20 rounded-full blur-3xl pointer-events-none"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.3, 0.2]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* CMYK Floating Circles */}
      <motion.div
        className="absolute top-20 left-[20%] w-4 h-4 bg-cyan-400 rounded-full opacity-60 pointer-events-none"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-40 right-[25%] w-3 h-3 bg-pink-400 rounded-full opacity-60 pointer-events-none"
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-32 left-[30%] w-5 h-5 bg-yellow-400 rounded-full opacity-50 pointer-events-none"
        animate={{ y: [0, -25, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Back Button */}
        {step !== 'role-selection' && step !== 'success' && (
          <button
            onClick={handleBack}
            className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: Role Selection */}
          {step === 'role-selection' && (
            <motion.div
              key="role-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mx-auto w-20 h-20 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/25"
              >
                <Printer className="h-10 w-10 text-white" />
              </motion.div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-4">
                Join Prints24
              </h1>
              <p className="text-slate-400 mb-12">Choose how you'd like to sign up</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {roleOptions.map((option, index) => {
                  const Icon = option.icon;
                  return (
                    <motion.button
                      key={option.id}
                      onClick={() => handleRoleSelect(option.id as SignupIntent)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      whileHover={{ scale: 1.03, y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-6 rounded-2xl border-2 ${option.borderColor} bg-gradient-to-br ${option.gradient} ${option.hoverBg} backdrop-blur-sm transition-all text-left group`}
                    >
                      <div className={`w-14 h-14 rounded-xl bg-slate-800/80 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-7 w-7 ${option.iconColor}`} />
                      </div>
                      <h3 className="font-semibold text-lg text-white mb-2">
                        {option.title}
                      </h3>
                      <p className="text-sm text-slate-400">{option.description}</p>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Email Entry */}
          {step === 'email-entry' && (
            <motion.div
              key="email-entry"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-slate-700/50">
                <h2 className="font-serif text-2xl font-bold text-white mb-2">
                  Enter Your Email
                </h2>
                <p className="text-slate-400 mb-6">
                  We'll send you a verification code
                </p>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setErrors({});
                        }}
                        className={`appearance-none relative block w-full px-3 py-3.5 pl-10 border-2 ${errors.email
                          ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                          : "border-slate-600 focus:border-cyan-500 focus:ring-cyan-500/20"
                          } placeholder-slate-500 text-white bg-slate-900/50 rounded-xl focus:outline-none focus:ring-4 sm:text-sm transition-all duration-300`}
                        placeholder="your@email.com"
                        autoFocus
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-400 hover:to-teal-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/30 transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-0.5"
                  >
                    Continue
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Step 3: Email Verification */}
          {step === 'email-verification' && (
            <motion.div
              key="email-verification"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-slate-700/50"
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader className="h-8 w-8 animate-spin text-cyan-400" />
                  </div>
                }
              >
                <EmailVerification
                  email={email}
                  onVerified={handleEmailVerified}
                  onBack={handleBack}
                />
              </Suspense>
            </motion.div>
          )}

          {/* Step 4: Password Setup (Customer Only) */}
          {step === 'password-setup' && (
            <motion.div
              key="password-setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-slate-700/50">
                <h2 className="font-serif text-2xl font-bold text-white mb-2">
                  Create Your Password
                </h2>
                <p className="text-slate-400 mb-6">
                  Secure your account with a strong password
                </p>

                <form onSubmit={handlePasswordSetup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setErrors({});
                        }}
                        className={`appearance-none relative block w-full px-3 py-3.5 pl-10 border-2 ${errors.password
                          ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                          : "border-slate-600 focus:border-cyan-500 focus:ring-cyan-500/20"
                          } placeholder-slate-500 text-white bg-slate-900/50 rounded-xl focus:outline-none focus:ring-4 sm:text-sm transition-all duration-300`}
                        placeholder="Enter password"
                      />
                    </div>
                    {errors.password && (
                      <p className="mt-1.5 text-xs text-red-400">{errors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                      </div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setErrors({});
                        }}
                        className={`appearance-none relative block w-full px-3 py-3.5 pl-10 border-2 ${errors.confirmPassword
                          ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                          : "border-slate-600 focus:border-cyan-500 focus:ring-cyan-500/20"
                          } placeholder-slate-500 text-white bg-slate-900/50 rounded-xl focus:outline-none focus:ring-4 sm:text-sm transition-all duration-300`}
                        placeholder="Confirm password"
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword}</p>
                    )}
                  </div>

                  {errors.general && (
                    <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                      <AlertCircle size={16} />
                      {errors.general}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-400 hover:to-teal-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/30 transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="animate-spin h-5 w-5 mr-2" />
                        Creating Account...
                      </>
                    ) : (
                      'Complete Signup'
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Step 5: Business Details (Print Partner / Corporate) */}
          {step === 'business-details' && (
            <motion.div
              key="business-details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-slate-700/50"
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader className="h-8 w-8 animate-spin text-cyan-400" />
                  </div>
                }
              >
                {intent === 'CORPORATE' ? (
                  <CorporateForm
                    onBack={handleBack}
                    verifiedEmail={email}
                    onSuccess={() => setStep('success')}
                  />
                ) : (
                  <PrintPartnerForm onBack={handleBack} />
                )}
              </Suspense>
            </motion.div>
          )}

          {/* Step 6: Success */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto text-center"
            >
              <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-slate-700/50">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/25"
                >
                  <CheckCircle className="w-10 h-10 text-white" />
                </motion.div>

                <h2 className="font-serif text-2xl font-bold text-white mb-2">
                  {intent === 'CUSTOMER' ? 'Welcome to Prints24!' : 'Application Submitted!'}
                </h2>

                <p className="text-slate-400 mb-6">
                  {intent === 'CUSTOMER'
                    ? 'Your account has been created successfully. You can now login and start ordering.'
                    : 'Your application has been submitted for review. We will notify you once approved.'}
                </p>

                <button
                  onClick={() => navigate('/login')}
                  className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-400 hover:to-teal-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/30 transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-0.5"
                >
                  {intent === 'CUSTOMER' ? 'Go to Login' : 'Return to Home'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SignUp;
