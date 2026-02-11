import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader, ArrowLeft, Mail, Lock, AlertCircle, CheckCircle, 
  Users, Shield, Briefcase, Building, UserCheck, Sparkles,
  ChevronRight, Clock, ShieldCheck, FileText, Award,
  Printer, Palette, ArrowRight, X
} from 'lucide-react';
import DynamicFormRenderer from '../components/DynamicFormRenderer';
import BackButton from "../components/BackButton";
import { useLogo } from "../hooks/useSiteSettings";
import axios from 'axios';

interface UserSegment {
  _id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  requiresApproval: boolean;
  signupForm?: {
    _id: string;
    name: string;
    code: string;
    fields: any[];
    instructions?: string;
    submissionSettings?: {
      successMessage?: string;
    };
  };
}

type SignupStep = 'segment-selection' | 'form-filling' | 'success';

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { logo } = useLogo();

  const [step, setStep] = useState<SignupStep>('segment-selection');
  const [segments, setSegments] = useState<UserSegment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<UserSegment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user-segments/public');
      setSegments(response.data.segments || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load segments');
    } finally {
      setLoading(false);
    }
  };

  const handleSegmentSelect = async (segment: UserSegment) => {
    try {
      setLoading(true);
      setError('');

      // Fetch the full segment details including form
      const response = await axios.get(`/api/user-segments/${segment.code}/form`);
      
      // Check if segment has a form
      if (response.data.form) {
        setSelectedSegment({
          ...response.data.segment,
          signupForm: response.data.form,
        });
        setStep('form-filling');
      } else {
        setError('This segment does not have a signup form configured yet.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load signup form');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = (data: any) => {
    setSuccessMessage(
      data.message ||
        selectedSegment?.signupForm?.submissionSettings?.successMessage ||
        'Application submitted successfully!'
    );
    setStep('success');
    
    // Redirect to login page after 3 seconds
    setTimeout(() => {
      navigate('/login');
    }, 3000);
  };

  const handleFormError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleBack = () => {
    if (step === 'form-filling') {
      setStep('segment-selection');
      setSelectedSegment(null);
      setError('');
    } else {
      navigate('/');
    }
  };

  const getSegmentIcon = (iconString?: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'user': <Users className="w-6 h-6" />,
      'shield': <Shield className="w-6 h-6" />,
      'briefcase': <Briefcase className="w-6 h-6" />,
      'building': <Building className="w-6 h-6" />,
      'user-check': <UserCheck className="w-6 h-6" />,
      'award': <Award className="w-6 h-6" />,
    };

    if (iconString && iconMap[iconString]) {
      return iconMap[iconString];
    }
    
    return <Users className="w-6 h-6" />;
  };

  const progressPercentage = step === 'segment-selection' ? 15 : step === 'form-filling' ? 65 : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 opacity-5">
          <Printer size={100} />
        </div>
        <div className="absolute bottom-10 right-10 opacity-5">
          <Printer size={100} />
        </div>
        <div className="absolute top-1/4 right-1/4 w-64 h-96 bg-gradient-to-br from-white/20 to-blue-100/10 rotate-12 rounded-lg shadow-lg border border-blue-200/20" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-80 bg-gradient-to-tr from-purple-100/10 to-white/20 -rotate-12 rounded-lg shadow-lg border border-purple-200/20" />
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px] opacity-5" />
      </div>

      {/* Back Button */}
      <div className="absolute top-6 left-6 z-20">
        <BackButton fallbackPath="/" label="Back to Home" className="text-blue-700 hover:text-blue-900 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-blue-200/50 shadow-sm" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl flex flex-col lg:flex-row rounded-3xl shadow-2xl overflow-hidden border border-white/20 backdrop-blur-sm bg-white/95 z-10"
      >
        {/* Left Side - Brand & Join Info */}
        <div className="lg:w-2/5 bg-gradient-to-br from-blue-600 to-purple-700 p-8 md:p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <Printer size={400} className="absolute -top-20 -left-20" />
            <FileText size={300} className="absolute -bottom-10 -right-10" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                <Printer className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {logo ? (
                    <img src={logo} alt="PrintHub Logo" className="h-12 object-contain filter brightness-0 invert" />
                  ) : (
                    <span>PrintHub Pro</span>
                  )}
                </h1>
                <p className="text-sm text-blue-100 opacity-90">Professional Printing Solutions</p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold mb-4">Join Our Print Community</h2>
                <p className="text-blue-100/90 text-lg">
                  Create an account to unlock advanced print management tools, custom pricing, and faster ordering.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Tailored Experience</h3>
                    <p className="text-blue-100/80">Signup flows designed specifically for Customers, Partners, or Corporate clients.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Priority Support</h3>
                    <p className="text-blue-100/80">Registered members get access to priority production and support channels.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Secure Management</h3>
                    <p className="text-blue-100/80">Your designs and data are protected with industry-standard encryption.</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/20">
                <p className="text-sm text-blue-100/70">
                  Already have an account? <Link to="/login" className="text-white font-bold hover:underline">Sign In here</Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Signup Content */}
        <div className="lg:w-3/5 p-8 md:p-12 flex flex-col">
          <div className="max-w-2xl mx-auto w-full">
            {/* Steps Progress */}
            {step !== 'success' && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step {step === 'segment-selection' ? '1' : '2'} of 2</span>
                  <span className="text-xs font-medium text-gray-500">{progressPercentage}% Complete</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"
                  />
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {step === 'segment-selection' && (
                <motion.div
                  key="selection"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Select Your Role</h2>
                    <p className="text-gray-600">Choose the account type that best describes you to continue.</p>
                  </div>

                  {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                      <Loader className="animate-spin text-blue-600 h-10 w-10 mb-4" />
                      <p className="text-gray-500 font-medium tracking-wide">Fetching account types...</p>
                    </div>
                  ) : segments.length > 0 ? (
                    <div className="grid gap-4">
                      {segments.map((segment) => (
                        <button
                          key={segment._id}
                          onClick={() => handleSegmentSelect(segment)}
                          className="group relative flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all text-left"
                        >
                          <div 
                            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                            style={{ 
                              backgroundColor: segment.color ? `${segment.color}15` : '#EFF6FF',
                              color: segment.color || '#3B82F6'
                            }}
                          >
                            {getSegmentIcon(segment.icon)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors uppercase tracking-tight">{segment.name}</h3>
                            {segment.description && (
                              <p className="text-sm text-gray-500 line-clamp-1">{segment.description}</p>
                            )}
                          </div>
                          <div className="p-2 bg-gray-50 rounded-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <ChevronRight size={20} />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No signup options available right now.</p>
                    </div>
                  )}

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}
                </motion.div>
              )}

              {step === 'form-filling' && selectedSegment && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <ArrowLeft size={16} />
                      Change Role
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
                      {selectedSegment.name}
                    </div>
                  </div>

                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Registration</h2>
                    <p className="text-gray-600">Please provide the required information below to create your profile.</p>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  <div className="bg-white rounded-2xl">
                    <DynamicFormRenderer
                      formSchema={selectedSegment.signupForm!}
                      userSegmentCode={selectedSegment.code}
                      onSuccess={handleFormSuccess}
                      onError={handleFormError}
                    />
                  </div>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 text-green-600 rounded-full mb-8 shadow-inner">
                    <CheckCircle size={48} />
                  </div>
                  <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Registration Received!</h2>
                  <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
                    {successMessage}
                  </p>
                  
                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 max-w-sm mx-auto flex items-center gap-4">
                    <Loader className="animate-spin text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-blue-800 text-left font-medium">
                      Redirecting you to the login page to access your new account...
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Footer support link */}
      <div className="absolute bottom-6 text-center w-full max-w-6xl flex flex-col md:flex-row justify-between px-8 text-gray-400 text-sm z-0">
        <p>© {new Date().getFullYear()} PrintHub Pro. All rights reserved.</p>
        <div className="flex gap-4">
          <Link to="/terms" className="hover:text-blue-600">Terms</Link>
          <Link to="/privacy" className="hover:text-blue-600">Privacy</Link>
          <Link to="/support" className="hover:text-blue-600">Support</Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;