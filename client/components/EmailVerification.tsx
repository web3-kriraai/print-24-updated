import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Loader, CheckCircle, ArrowRight } from 'lucide-react';
import { API_BASE_URL_WITH_API } from '../lib/apiConfig';

interface EmailVerificationProps {
    email: string;
    onVerified: () => void;
    onBack: () => void;
}

const EmailVerification: React.FC<EmailVerificationProps> = ({ email, onVerified, onBack }) => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);

    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    // Timer countdown
    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setCanResend(true);
        }
    }, [timer]);

    // Auto-send OTP on mount
    useEffect(() => {
        sendOtp();
    }, []);

    const sendOtp = async () => {
        setIsSending(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL_WITH_API}/auth/send-email-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, signupIntent: 'CUSTOMER' }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Failed to send OTP');
                setIsSending(false);
                return;
            }

            setTimer(60);
            setCanResend(false);
            setIsSending(false);
        } catch (err) {
            setError('Failed to send OTP. Please try again.');
            setIsSending(false);
        }
    };

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        setError('');

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all filled
        if (newOtp.every((digit) => digit !== '') && index === 5) {
            verifyOtp(newOtp.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (!/^\d+$/.test(pastedData)) return;

        const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
        setOtp(newOtp);

        if (pastedData.length === 6) {
            verifyOtp(pastedData);
        }
    };

    const verifyOtp = async (otpCode: string) => {
        setIsVerifying(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL_WITH_API}/auth/verify-email-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Invalid OTP');
                setIsVerifying(false);
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                onVerified();
            }, 1500);
        } catch (err) {
            setError('Verification failed. Please try again.');
            setIsVerifying(false);
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const otpCode = otp.join('');
        if (otpCode.length === 6) {
            verifyOtp(otpCode);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
        >
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-cream-100 rounded-full mb-4">
                    <Mail className="h-8 w-8 text-cream-900" />
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cream-900">
                    Verify Your Email
                </h2>
                <p className="mt-2 text-sm text-cream-600">
                    We've sent a 6-digit code to
                </p>
                <p className="font-medium text-cream-900">{email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* OTP Input */}
                <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => {
                                inputRefs.current[index] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={index === 0 ? handlePaste : undefined}
                            disabled={isVerifying || success}
                            className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-cream-900 transition-all ${error
                                ? 'border-red-300 bg-red-50'
                                : success
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-cream-200 bg-white'
                                } ${isVerifying || success ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                    ))}
                </div>

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center text-sm text-red-500"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Success Message */}
                {success && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-center gap-2 text-green-600"
                    >
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Email verified successfully!</span>
                    </motion.div>
                )}

                {/* Resend OTP */}
                <div className="text-center">
                    {canResend ? (
                        <button
                            type="button"
                            onClick={sendOtp}
                            disabled={isSending}
                            className="text-sm text-cream-900 font-medium hover:underline disabled:opacity-50"
                        >
                            {isSending ? 'Sending...' : 'Resend OTP'}
                        </button>
                    ) : (
                        <p className="text-sm text-cream-600">
                            Resend OTP in <span className="font-medium text-cream-900">{timer}s</span>
                        </p>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={otp.some((d) => !d) || isVerifying || success}
                    className="w-full bg-cream-900 text-cream-50 py-3 rounded-xl font-medium hover:bg-cream-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isVerifying ? (
                        <>
                            <Loader className="h-5 w-5 animate-spin" />
                            Verifying...
                        </>
                    ) : success ? (
                        <>
                            <CheckCircle className="h-5 w-5" />
                            Verified
                        </>
                    ) : (
                        <>
                            Verify Email
                            <ArrowRight className="h-5 w-5" />
                        </>
                    )}
                </button>

                {/* Back Button */}
                <button
                    type="button"
                    onClick={onBack}
                    className="w-full text-sm text-cream-600 hover:text-cream-900 transition-colors"
                >
                    Change email address
                </button>
            </form>
        </motion.div>
    );
};

export default EmailVerification;
