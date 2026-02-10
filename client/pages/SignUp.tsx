import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader, ArrowLeft, Mail, Lock, AlertCircle, CheckCircle, 
  Users, Shield, Briefcase, Building, UserCheck, Sparkles,
  ChevronRight, Clock, ShieldCheck, FileText, Award
} from 'lucide-react';
import DynamicFormRenderer from '../components/DynamicFormRenderer';
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
    
    // Redirect to login page after 2 seconds
    setTimeout(() => {
      navigate('/login');
    }, 2000);
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
    
    // Default fallback icon
    return <Users className="w-6 h-6" />;
  };

  const steps = [
    { id: 1, name: 'Select Role', status: step === 'segment-selection' ? 'current' : step === 'form-filling' || step === 'success' ? 'complete' : 'upcoming' },
    { id: 2, name: 'Complete Form', status: step === 'form-filling' ? 'current' : step === 'success' ? 'complete' : 'upcoming' },
    { id: 3, name: 'Confirmation', status: step === 'success' ? 'current' : 'upcoming' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full border border-blue-100 mb-4">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Join Our Platform</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Create Your Account
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Choose your role and start your journey with us
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 rounded-full"></div>
            <div 
              className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 -translate-y-1/2 rounded-full transition-all duration-500"
              style={{ 
                width: step === 'segment-selection' ? '16.66%' : 
                       step === 'form-filling' ? '66.66%' : '100%' 
              }}
            ></div>
            <div className="relative flex justify-between">
              {steps.map((stepItem, index) => (
                <div key={stepItem.id} className="relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm ${
                    stepItem.status === 'complete' 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 border-blue-500 text-white shadow-lg' 
                      : stepItem.status === 'current'
                      ? 'bg-white border-blue-500 text-blue-600 shadow-md'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {stepItem.status === 'complete' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="font-semibold">{stepItem.id}</span>
                    )}
                  </div>
                  <span className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-3 text-sm font-medium whitespace-nowrap ${
                    stepItem.status === 'current' ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {stepItem.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl mx-auto">
          {/* Card Header */}
          <div className="border-b border-gray-100 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={handleBack}
                  className="mr-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-50"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {step === 'segment-selection' && 'Choose Your Role'}
                    {step === 'form-filling' && `Sign Up as ${selectedSegment?.name}`}
                    {step === 'success' && 'Congratulations!'}
                  </h2>
                  <p className="text-gray-600">
                    {step === 'segment-selection' && 'Select the option that best describes your role'}
                    {step === 'form-filling' && 'Please fill in your details below'}
                    {step === 'success' && 'Your application has been processed'}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
                Step {step === 'segment-selection' ? 1 : step === 'form-filling' ? 2 : 3} of 3
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-8">
            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6"
                >
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                    <div className="flex items-start">
                      <AlertCircle className="flex-shrink-0 h-5 w-5 text-red-500 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm text-red-700 font-medium">{error}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading State */}
            {loading && step === 'segment-selection' ? (
              <div className="py-16 text-center">
                <div className="relative">
                  <Loader className="animate-spin mx-auto mb-4 text-blue-600 w-12 h-12" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/30 to-transparent animate-pulse"></div>
                </div>
                <p className="text-gray-600 font-medium">Loading account types...</p>
                <p className="text-sm text-gray-500 mt-2">Please wait a moment</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {/* Step 1: Segment Selection */}
                {step === 'segment-selection' && (
                  <motion.div
                    key="segment-selection"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    {segments.length > 0 ? (
                      <>
                        <div className="mb-6">
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                            <Users className="w-4 h-4" />
                            <span>Available Account Types</span>
                            <span className="text-gray-300 mx-2">•</span>
                            <span>{segments.length} options</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {segments.map((segment) => (
                            <motion.button
                              key={segment._id}
                              onClick={() => handleSegmentSelect(segment)}
                              whileHover={{ y: -4, scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="group relative bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 text-left overflow-hidden"
                            >
                              {/* Background Gradient Overlay on Hover */}
                              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              
                              <div className="relative flex flex-col h-full">
                                {/* Icon and Color Bar */}
                                <div className="mb-4">
                                  <div 
                                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                                    style={{ 
                                      backgroundColor: segment.color ? `${segment.color}15` : '#eff6ff',
                                      color: segment.color || '#3b82f6'
                                    }}
                                  >
                                    {getSegmentIcon(segment.icon)}
                                  </div>
                                  
                                  {/* Title */}
                                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                                    {segment.name}
                                  </h3>

                                  {/* Description */}
                                  {segment.description && (
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                      {segment.description}
                                    </p>
                                  )}
                                </div>

                                {/* Spacer and Bottom Section */}
                                <div className="mt-auto">
                                  {/* Requires Approval Badge */}
                                  {segment.requiresApproval ? (
                                    <div className="flex items-center justify-between">
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                        <Shield className="w-3 h-3" />
                                        Requires Approval
                                      </span>
                                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors group-hover:translate-x-1" />
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                        <CheckCircle className="w-3 h-3" />
                                        Instant Access
                                      </span>
                                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors group-hover:translate-x-1" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </div>

                        {/* Help Text */}
                        <div className="mt-8 pt-6 border-t border-gray-100">
                          <div className="flex items-start gap-3 text-sm text-gray-500">
                            <ShieldCheck className="w-4 h-4 text-green-500 mt-0.5" />
                            <p>All account types are verified and secured. Choose the one that best fits your needs.</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* No Segments Available */
                      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">No account types available</p>
                        <p className="text-sm text-gray-500 mb-4">Please check back later or contact our support team</p>
                        <button
                          onClick={() => navigate('/')}
                          className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Return to Home
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 2: Form Filling */}
                {step === 'form-filling' && selectedSegment?.signupForm && (
                  <motion.div
                    key="form-filling"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    {/* Segment Info Banner */}
                    <div className="mb-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ 
                            backgroundColor: selectedSegment.color ? `${selectedSegment.color}20` : '#dbeafe',
                            color: selectedSegment.color || '#3b82f6'
                          }}
                        >
                          {getSegmentIcon(selectedSegment.icon)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900">Signing up as: {selectedSegment.name}</h3>
                            {selectedSegment.requiresApproval && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                <Clock className="w-3 h-3" />
                                Approval Required
                              </span>
                            )}
                          </div>
                          {selectedSegment.description && (
                            <p className="text-sm text-gray-600">{selectedSegment.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1 text-xs text-blue-600">
                              <FileText className="w-3 h-3" />
                              <span>Complete the form below</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Secure & encrypted</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Form */}
                    <DynamicFormRenderer
                      key={selectedSegment.code}
                      formSchema={selectedSegment.signupForm}
                      userSegmentCode={selectedSegment.code}
                      onSuccess={handleFormSuccess}
                      onError={handleFormError}
                    />
                  </motion.div>
                )}

                {/* Step 3: Success */}
                {step === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="py-12 text-center"
                  >
                    {/* Success Icon */}
                    <div className="relative mx-auto w-24 h-24 mb-8">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full animate-pulse"></div>
                      <div className="relative w-full h-full rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                        <CheckCircle className="w-12 h-12 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-md">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    {/* Success Message */}
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">
                      {selectedSegment?.requiresApproval
                        ? 'Application Submitted! 🎉'
                        : 'Account Created Successfully! 🎉'}
                    </h2>

                    <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">{successMessage}</p>

                    {/* Approval Required Content */}
                    {selectedSegment?.requiresApproval ? (
                      <div className="space-y-6 max-w-md mx-auto">
                        <div className="p-5 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-yellow-100">
                              <Clock className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div className="text-left">
                              <h4 className="font-semibold text-yellow-800 mb-2">What happens next?</h4>
                              <ul className="text-sm text-yellow-700 space-y-2">
                                <li className="flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5"></div>
                                  <span>Our team will review your application</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5"></div>
                                  <span>You'll receive an email notification once approved</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5"></div>
                                  <span>This usually takes 24-48 business hours</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                          <button
                            onClick={() => navigate('/my-applications')}
                            className="group relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-medium shadow-md hover:shadow-lg flex-1 max-w-xs mx-auto"
                          >
                            <span className="flex items-center justify-center gap-2">
                              <FileText className="w-4 h-4" />
                              View Application Status
                            </span>
                          </button>
                          <button
                            onClick={() => navigate('/')}
                            className="border border-gray-300 text-gray-700 px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-colors font-medium flex-1 max-w-xs mx-auto"
                          >
                            Return to Homepage
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Instant Access Content */
                      <div className="space-y-6 max-w-md mx-auto">
                        <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-green-100">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="text-left">
                              <h4 className="font-semibold text-green-800 mb-2">You're all set!</h4>
                              <p className="text-sm text-green-700">
                                Your account is now active. You can log in immediately and start exploring all the features.
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Primary Action Button */}
                        <button
                          onClick={() => navigate('/login')}
                          className="group relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl text-lg w-full max-w-xs mx-auto"
                        >
                          <span className="flex items-center justify-center gap-2">
                            <Lock className="w-5 h-5" />
                            Proceed to Login
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* Card Footer */}
          {step !== 'success' && (
            <div className="border-t border-gray-100 px-8 py-6 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span>Secure & encrypted registration</span>
                </div>
                <div className="text-sm text-gray-500">
                  Need assistance?{' '}
                  <button
                    onClick={() => navigate('/support')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Contact Support
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            By creating an account, you agree to our{' '}
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              Terms of Service
            </button>{' '}
            and{' '}
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              Privacy Policy
            </button>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            © {new Date().getFullYear()} Your Platform. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;