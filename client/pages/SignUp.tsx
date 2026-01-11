import React, { useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Building2, Briefcase, Loader, ArrowLeft, Mail, Lock, AlertCircle } from 'lucide-react';
import BackButton from '../components/BackButton';

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

  // Role selection options
  const roleOptions = [
    {
      id: 'CUSTOMER',
      title: 'Personal / Customer',
      description: 'For individual printing needs',
      icon: User,
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    },
    {
      id: 'PRINT_PARTNER',
      title: 'Print Partner',
      description: 'Join as a printing service provider',
      icon: Briefcase,
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    },
    {
      id: 'CORPORATE',
      title: 'Corporate Member',
      description: 'For businesses and organizations',
      icon: Building2,
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
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
      const response = await fetch('http://localhost:5000/api/auth/complete-customer-signup', {
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

  const handleBusinessFormSuccess = () => {
    setStep('success');
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
    <div className="min-h-screen bg-linear-to-br from-cream-50 via-white to-cream-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        {step !== 'role-selection' && step !== 'success' && (
          <button
            onClick={handleBack}
            className="mb-6 flex items-center gap-2 text-cream-600 hover:text-cream-900 transition-colors"
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
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-cream-900 mb-4">
                Join Prints24
              </h1>
              <p className="text-cream-600 mb-12">Choose how you'd like to sign up</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {roleOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <motion.button
                      key={option.id}
                      onClick={() => handleRoleSelect(option.id as SignupIntent)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-6 rounded-2xl border-2 ${option.color} transition-all text-left`}
                    >
                      <Icon className="h-12 w-12 mb-4 text-cream-900" />
                      <h3 className="font-semibold text-lg text-cream-900 mb-2">
                        {option.title}
                      </h3>
                      <p className="text-sm text-cream-600">{option.description}</p>
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
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="font-serif text-2xl font-bold text-cream-900 mb-2">
                  Enter Your Email
                </h2>
                <p className="text-cream-600 mb-6">
                  We'll send you a verification code
                </p>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setErrors({});
                        }}
                        className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${errors.email
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-cream-200 focus:ring-cream-900 focus:border-cream-900"
                          } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                        placeholder="your@email.com"
                        autoFocus
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-cream-50 bg-cream-900 hover:bg-cream-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cream-500 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
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
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader className="h-8 w-8 animate-spin text-cream-900" />
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
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="font-serif text-2xl font-bold text-cream-900 mb-2">
                  Create Your Password
                </h2>
                <p className="text-cream-600 mb-6">
                  Secure your account with a strong password
                </p>

                <form onSubmit={handlePasswordSetup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-cream-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-cream-400" />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setErrors({});
                        }}
                        className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${errors.password
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-cream-200 focus:ring-cream-900 focus:border-cream-900"
                          } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                        placeholder="Enter password"
                      />
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cream-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-cream-400" />
                      </div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setErrors({});
                        }}
                        className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${errors.confirmPassword
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-cream-200 focus:ring-cream-900 focus:border-cream-900"
                          } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                        placeholder="Confirm password"
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
                    )}
                  </div>

                  {errors.general && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle size={16} />
                      {errors.general}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-cream-50 bg-cream-900 hover:bg-cream-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cream-500 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
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
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader className="h-8 w-8 animate-spin text-cream-900" />
                  </div>
                }
              >
                {intent === 'CORPORATE' ? (
                  <CorporateForm
                    onBack={handleBack}
                    onSuccess={handleBusinessFormSuccess}
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
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <h2 className="font-serif text-2xl font-bold text-cream-900 mb-2">
                  {intent === 'CUSTOMER' ? 'Welcome to Prints24!' : 'Application Submitted!'}
                </h2>

                <p className="text-cream-600 mb-6">
                  {intent === 'CUSTOMER'
                    ? 'Your account has been created successfully. You can now login and start ordering.'
                    : 'Your application has been submitted for review. We will notify you once approved.'}
                </p>

                <button
                  onClick={() => navigate('/login')}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-cream-50 bg-cream-900 hover:bg-cream-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cream-500 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
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
