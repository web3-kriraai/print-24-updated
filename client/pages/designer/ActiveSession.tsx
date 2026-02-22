import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Mic,
    MicOff,
    Video as VideoIcon,
    VideoOff,
    Monitor,
    MonitorOff,
    PhoneOff,
    Clock,
    MessageSquare,
    FileText,
    Image as ImageIcon,
    Plus,
    Loader2,
    AlertCircle,
    Send,
    Upload,
    Download,
    ArrowLeft,
    DollarSign,
    CheckCircle,
    AlertTriangle,
    Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { getAuthHeaders, API_BASE_URL_WITH_API as API_BASE_URL } from '../../lib/apiConfig';
import { useAuth } from '../../context/AuthContext';
import { useSessionTimer } from '../../hooks/useSessionTimer';
import { startSession, extendSession, completeSession, addArtifact, getArtifacts } from '../../lib/designerSessionApi';
import { registerDesigner, onSessionEvent, offSessionEvent, sendMessage, onMessage, offMessage } from '../../lib/socketClient';

// Simple UI Components (Self-contained)
const Button = ({ children, variant = "default", size = "default", className = "", ...props }: any) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-white";
    const variants: Record<string, string> = {
        default: "bg-gray-900 text-white hover:bg-gray-800",
        secondary: "bg-gray-700 text-white hover:bg-gray-600",
        outline: "border border-gray-700 bg-transparent hover:bg-gray-800 text-white",
        ghost: "hover:bg-gray-700 text-gray-300",
        destructive: "bg-red-600 text-white hover:bg-red-700",
    };
    const sizes: Record<string, string> = {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md text-sm",
        lg: "h-11 px-8 rounded-md text-base",
        icon: "h-10 w-10",
    };
    return (
        <button
            className={`${baseStyles} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

const Badge = ({ children, variant = "default", className = "", ...props }: any) => {
    const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
    const variants: Record<string, string> = {
        default: "border-transparent bg-gray-900 text-gray-50 hover:bg-gray-900/80",
        secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80",
        outline: "text-white border-gray-700",
    };
    return (
        <div className={`${baseStyles} ${variants[variant] || variants.default} ${className}`} {...props}>
            {children}
        </div>
    );
};

const Card = ({ children, className = "", ...props }: any) => (
    <div className={`rounded-lg border border-gray-700 bg-gray-900 text-white shadow-sm ${className}`} {...props}>
        {children}
    </div>
);

const CardHeader = ({ children, className = "", ...props }: any) => (
    <div className={`flex flex-col space-y-1.5 p-4 ${className}`} {...props}>
        {children}
    </div>
);

const CardTitle = ({ children, className = "", ...props }: any) => (
    <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props}>
        {children}
    </h3>
);

const CardDescription = ({ children, className = "", ...props }: any) => (
    <p className={`text-sm text-gray-400 ${className}`} {...props}>
        {children}
    </p>
);

const CardContent = ({ children, className = "", ...props }: any) => (
    <div className={`p-4 pt-0 ${className}`} {...props}>
        {children}
    </div>
);

const Input = ({ className = "", ...props }: any) => (
    <input
        className={`flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
    />
);

const Tabs = ({ children, defaultValue, className = "" }: any) => {
    const [activeTab, setActiveTab] = React.useState(defaultValue);
    return (
        <div className={`${className} flex flex-col`}>
            {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child as any, { activeTab, setActiveTab });
                }
                return child;
            })}
        </div>
    );
};

const TabsList = ({ children, className = "", activeTab, setActiveTab }: any) => (
    <div className={`${className} inline-flex h-10 items-center justify-center rounded-md bg-gray-900 p-1 text-gray-400`}>
        {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
                return React.cloneElement(child as any, { activeTab, setActiveTab });
            }
            return child;
        })}
    </div>
);

const TabsTrigger = ({ value, children, className = "", activeTab, setActiveTab }: any) => (
    <button
        onClick={() => setActiveTab(value)}
        className={`${className} inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${activeTab === value ? 'bg-gray-800 text-white shadow-sm' : ''
            }`}
    >
        {children}
    </button>
);

const TabsContent = ({ value, children, activeTab }: any) => (
    activeTab === value ? <div>{children}</div> : null
);

// Mock Hook for LiveKit (UI-only as requested)
const useLiveKitMock = () => {
    return {
        room: null,
        isConnecting: false,
        isConnected: true,
        error: null,
    };
};

export default function ActiveSession() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isDesigner = user?.role === 'designer';
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Use Socket.io timer hook
    const { timeLeft, session: backendSession, isLoading: isLoadingSession, error: sessionError, refreshSession } = useSessionTimer({
        sessionId: sessionId || '',
        roomName: undefined // Will be set after fetching session
    });

    const [isCameraEnabled, setIsCameraEnabled] = useState(true);
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const [notes, setNotes] = useState('');
    const [chatInput, setChatInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isExtending, setIsExtending] = useState(false);

    const [order, setOrder] = useState<any>(null);
    const [isLoadingOrder, setIsLoadingOrder] = useState(true);

    // Fetch order when session is loaded
    useEffect(() => {
        if (backendSession?.orderId) {
            const orderIdToFetch = typeof backendSession.orderId === 'object'
                ? (backendSession.orderId as any)._id || backendSession.orderId
                : backendSession.orderId;
            console.log('[ActiveSession] Fetching order:', orderIdToFetch);
            fetchOrderById(orderIdToFetch);
        }
    }, [backendSession]);

    // Register designer and setup Socket.io event listeners
    useEffect(() => {
        if (!backendSession) return;

        // Register as designer for auto-pause/resume
        const designerId = backendSession.designerId;
        if (designerId) {
            registerDesigner(designerId);
        }

        // Session warning handler
        const handleWarning = (data: any) => {
            console.log('[ActiveSession] Warning:', data);
            toast.error(data.message || '1 minute remaining!', {
                duration: 5000,
                icon: '⏰',
            });
        };

        // Session ended handler
        const handleEnded = (data: any) => {
            console.log('[ActiveSession] Session ended:', data);
            toast.success(`Session completed! Duration: ${Math.floor(data.duration / 60)} minutes`);

            setTimeout(() => {
                const dashboardPath = isDesigner ? '/designer/dashboard' : '/client-dashboard';
                navigate(dashboardPath);
            }, 2000);
        };

        // Session extended handler
        const handleExtended = (data: any) => {
            console.log('[ActiveSession] Session extended:', data);
            toast.success(`Session extended by ${Math.floor(data.added / 60)} minutes!`);
        };

        onSessionEvent('SESSION_WARNING', handleWarning);
        onSessionEvent('SESSION_EXTENDED', handleExtended);
        const dashboardPath = isDesigner ? '/designer/dashboard' : '/client-dashboard';

        return () => {
            offSessionEvent('SESSION_WARNING', handleWarning);
            offSessionEvent('SESSION_ENDED', handleEnded);
            offSessionEvent('SESSION_EXTENDED', handleExtended);
        };
    }, [backendSession, navigate, isDesigner]);

    // Immediate redirection if session is already completed
    useEffect(() => {
        if (backendSession?.status === 'Completed' && !isLoadingSession) {
            console.log('[ActiveSession] Session already completed, redirecting...');
            const dashboardPath = isDesigner ? '/designer/dashboard' : '/client-dashboard';
            navigate(dashboardPath);
        }
    }, [backendSession?.status, isLoadingSession, navigate, isDesigner]);

    // Fetch order by ID
    const fetchOrderById = async (orderId: string) => {
        try {
            console.log('[ActiveSession] Fetching order by ID:', orderId);
            const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                headers: getAuthHeaders()
            });
            console.log('[ActiveSession] Order response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('[ActiveSession] Order data:', data);
                setOrder(data);
            } else {
                const errorData = await response.json();
                console.error('[ActiveSession] Order fetch failed:', errorData);
                toast.error("Failed to load order details");
            }
        } catch (err) {
            console.error("Fetch order error:", err);
        } finally {
            setIsLoadingOrder(false);
        }
    };

    const { isConnecting, isConnected, error } = useLiveKitMock();

    // Mock UI Data (LiveKit)
    const sessionData = {
        clientName: 'Rahul Sharma',
        requestType: 'Logo Design',
    };

    const mockArtifacts = [
        { fileName: 'Logo_Mockup_v1.png', uploadedBy: 'Designer' }
    ];

    // Start session handler
    const handleStartSession = async () => {
        if (!sessionId) return;

        setIsStarting(true);
        try {
            await startSession(sessionId);
            toast.success('Session started!');
            // Socket event will update the timer and status, but we refresh ensures it's caught
            await refreshSession();
        } catch (error) {
            console.error('[ActiveSession] Start error:', error);
            toast.error('Failed to start session');
        } finally {
            setIsStarting(false);
        }
    };

    // Pay-to-extend handler
    const handleExtendSession = async () => {
        if (!sessionId) return;

        setIsExtending(true);
        try {
            // Generate a unique payment ID (in production, this would come from payment gateway)
            const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // Use dynamic duration and price from backend snapshot
            const extensionDuration = backendSession?.extensionDuration || 900;
            const amount = backendSession?.extensionPrice || 300;

            // TODO: Integrate real payment gateway here
            // For now, we'll just call the extend API directly
            const result = await extendSession(sessionId, extensionDuration, paymentId, amount);

            if (result.skipped) {
                toast.error('This payment was already processed');
            } else {
                toast.success(`Session extended by ${Math.floor(extensionDuration / 60)} minutes!`);
                await refreshSession();
            }
        } catch (error) {
            console.error('[ActiveSession] Extend error:', error);
            toast.error('Failed to extend session');
        } finally {
            setIsExtending(false);
        }
    };

    const formatTime = (seconds: number) => {
        const totalSeconds = Math.max(0, seconds);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEndSession = async () => {
        if (!sessionId) return;

        try {
            await completeSession(sessionId);
            toast.success('Session ended successfully');
            const dashboardPath = isDesigner ? '/designer/dashboard' : '/client-dashboard';
            navigate(dashboardPath);
        } catch (error) {
            console.error('[ActiveSession] End session error:', error);
            toast.error('Failed to end session');
        }
    };

    // State for artifacts
    const [savedNotes, setSavedNotes] = useState<any[]>([]);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Initial fetch of artifacts
    useEffect(() => {
        if (!sessionId) return;

        const fetchArtifacts = async () => {
            try {
                // Fetch Notes
                const notesData = await getArtifacts(sessionId, 'Note');
                if (notesData.success) setSavedNotes(notesData.artifacts);

                // Fetch Chat
                const chatData = await getArtifacts(sessionId, 'Chat');
                if (chatData.success) setChatMessages(chatData.artifacts);
            } catch (err) {
                console.error("Failed to fetch artifacts:", err);
            }
        };

        fetchArtifacts();
    }, [sessionId]);

    // Socket listeners for Chat
    useEffect(() => {
        const handleNewMessage = (msg: any) => {
            // Only add if it belongs to this session
            if (msg.sessionId === sessionId) {
                setChatMessages(prev => [...prev, msg]);
                // Scroll to bottom
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        };

        onMessage(handleNewMessage);
        return () => {
            offMessage(handleNewMessage);
        };
    }, [sessionId]);


    // Save Note Handler
    const handleSaveNotes = async () => {
        if (!notes.trim() || !sessionId || !backendSession) return;

        setIsSavingNotes(true);
        try {
            const result = await addArtifact(
                sessionId,
                'Note',
                notes,
                backendSession.designerId, // Notes by designer
                'Designer'
            );

            if (result.success) {
                toast.success('Note saved');
                setSavedNotes(prev => [result.artifact, ...prev]); // Add to top
                setNotes('');
            }
        } catch (error) {
            console.error('Save note error:', error);
            toast.error('Failed to save note');
        } finally {
            setIsSavingNotes(false);
        }
    };

    // Send Message Handler
    const handleSendMessage = () => {
        if (!chatInput.trim() || !sessionId || !backendSession) return;

        // Emit socket event (Server saves it and broadcasts back)
        sendMessage({
            sessionId,
            message: chatInput,
            userId: backendSession.designerId,
            createdBy: 'Designer',
            type: 'Chat'
        });

        // Optimistic update? No, wait for server ack via socket to avoid dupes/ordering issues
        // But for better UX clear input immediately
        setChatInput('');
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check if file is PDF
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            toast.error("Format Error: Please upload a PDF file.");
            return;
        }

        // Strict naming validation
        const expectedName = `${order?.orderNumber}.pdf`;
        if (file.name !== expectedName) {
            toast.error(`Strict Naming Required: Filename must be "${expectedName}"`);
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('finalPDF', file);

            const response = await fetch(`${API_BASE_URL}/designer-orders/${sessionId}/upload-final`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                    // No Content-Type header needed for FormData
                },
                body: formData
            });

            if (response.ok) {
                toast.success('Final PDF Accepted! Design Fulfilled.');
                setTimeout(() => {
                    navigate('/designer/dashboard');
                }, 1000);
            } else {
                const err = await response.json();
                toast.error(err.error || "Upload failed");
            }
        } catch (err) {
            toast.error("Network error during upload");
        } finally {
            setIsUploading(false);
        }
    };

    if (isConnecting) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-900">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-white text-lg">Connecting to session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">

            {/* Header */}
            <header className="bg-gray-900 border-b border-gray-800 px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h2 className="text-white font-bold text-lg">{order?.user?.name || 'Loading...'}</h2>
                            <p className="text-xs text-gray-400 capitalize">{order?.designerType || 'Visual'} Design Request</p>
                        </div>
                        <Badge variant="outline" className="ml-2 font-mono text-[10px]">
                            {sessionId}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className={`font-mono text-xl font-bold ${timeLeft <= 60 ? 'text-red-500 animate-pulse' : 'text-white'
                                }`}>
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Video Area */}
                <div className="flex-1 flex flex-col p-4 space-y-4 relative">
                    {/* Session Status Overlays */}
                    {backendSession?.status === 'Scheduled' && (
                        <div className="absolute inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center">
                            <div className="text-center p-8 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4">
                                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-blue-500/20">
                                    <Clock className="w-10 h-10 text-blue-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Ready to Start?</h3>
                                <p className="text-gray-400 mb-8">
                                    Start the session to begin the timer and enable recording.
                                    The customer will be notified.
                                </p>
                                <Button
                                    size="lg"
                                    className="w-full text-lg bg-blue-600 hover:bg-blue-700 h-14"
                                    onClick={handleStartSession}
                                    disabled={isStarting}
                                >
                                    {isStarting ? (
                                        <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Starting...</>
                                    ) : (
                                        "Start Session"
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {backendSession?.status === 'Completed' && (
                        <div className="absolute inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center">
                            <div className="text-center p-8 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4">
                                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-green-500/20">
                                    <CheckCircle className="w-10 h-10 text-green-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Session Completed</h3>
                                <p className="text-gray-400 mb-8">
                                    This session has ended. You can view the history or return to dashboard.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <Button
                                        size="lg"
                                        className="w-full bg-gray-800 hover:bg-gray-700"
                                        onClick={() => navigate('/designer/dashboard')}
                                    >
                                        Return to Dashboard
                                    </Button>
                                    {/* Only show extend option in Completed screen if they are actually low on time/expired */}
                                    {timeLeft < 120 && (
                                        <div className="pt-2 border-t border-gray-800 mt-4">
                                            <p className="text-xs text-gray-500 mb-3">
                                                Session expired. You have a few minutes to extend.
                                            </p>
                                            <Button
                                                onClick={handleExtendSession}
                                                disabled={isExtending}
                                                className="w-full bg-blue-600 hover:bg-blue-700 font-bold h-12"
                                            >
                                                {isExtending ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Extending...</>
                                                ) : (
                                                    <>Extend (+{Math.floor((backendSession?.extensionDuration || 900) / 60)} min) - ₹{backendSession?.extensionPrice || 300}</>
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 grid grid-rows-2 gap-4">
                        {/* Designer View */}
                        <div className="bg-gray-900 rounded-2xl relative overflow-hidden ring-1 ring-gray-800 shadow-2xl">
                            {isScreenSharing ? (
                                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                    <Monitor className="w-20 h-20 text-blue-500/20" />
                                    <Badge className="absolute top-4 left-4 bg-red-600">Screen Sharing</Badge>
                                </div>
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center border-4 border-gray-700 mx-auto shadow-inner">
                                            {isCameraEnabled ? (
                                                <span className="text-4xl font-black text-gray-400">DS</span>
                                            ) : (
                                                <VideoOff className="w-12 h-12 text-gray-600" />
                                            )}
                                        </div>
                                        <p className="text-gray-400 mt-4 font-medium">Designer (You)</p>
                                    </div>
                                </div>
                            )}
                            <div className="absolute bottom-4 left-4 flex gap-2">
                                {!isMicEnabled && <Badge variant="outline" className="bg-red-900 text-red-200 border-none px-2"><MicOff size={14} /></Badge>}
                            </div>
                        </div>

                        {/* Client View */}
                        <div className="bg-gray-900 rounded-2xl relative overflow-hidden ring-1 ring-gray-800 shadow-2xl">
                            <div className="w-full h-full bg-gradient-to-br from-indigo-950/20 to-gray-900 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-24 h-24 bg-indigo-900/30 rounded-full flex items-center justify-center border-4 border-gray-800 mx-auto">
                                        <span className="text-3xl font-black text-indigo-400">
                                            {order?.user?.name ? order.user.name.split(' ').map((n: any) => n[0]).join('') : 'U'}
                                        </span>
                                    </div>
                                    <p className="text-indigo-400 mt-4 font-medium">{order?.user?.name || 'Customer'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pay-to-Extend Button (Improved Premium UI) */}
                    <AnimatePresence>
                        {timeLeft > 0 && timeLeft < 120 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                className="relative overflow-hidden group"
                            >
                                {/* Animated Pulsing Background */}
                                <motion.div
                                    animate={{
                                        boxShadow: timeLeft < 60
                                            ? ["0 0 0px rgba(59, 130, 246, 0)", "0 0 20px rgba(59, 130, 246, 0.4)", "0 0 0px rgba(59, 130, 246, 0)"]
                                            : "none"
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="bg-gradient-to-r from-blue-600/90 via-purple-600/90 to-blue-600/90 backdrop-blur-md rounded-2xl p-5 border border-blue-400/30 shadow-2xl relative z-10"
                                >
                                    <div className="flex items-center justify-between gap-4 relative">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl ${timeLeft < 60 ? 'bg-red-500 animate-pulse' : 'bg-blue-500/20'}`}>
                                                {timeLeft < 60 ? (
                                                    <AlertTriangle className="w-6 h-6 text-white" />
                                                ) : (
                                                    <Zap className="w-6 h-6 text-blue-200" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-lg tracking-tight flex items-center gap-2">
                                                    {timeLeft < 60 ? "Critical Warning!" : "Time Running Low!"}
                                                    <span className="text-blue-200 font-mono bg-blue-900/40 px-2 py-0.5 rounded text-sm">
                                                        {formatTime(timeLeft)}
                                                    </span>
                                                </h4>
                                                <p className="text-blue-100/80 text-sm font-medium">
                                                    Extend now to avoid immediate disconnection
                                                </p>
                                            </div>
                                        </div>

                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Button
                                                onClick={handleExtendSession}
                                                disabled={isExtending}
                                                className="relative bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 h-12 rounded-xl border-b-4 border-blue-200 active:border-b-0 transition-all shadow-lg group"
                                            >
                                                {isExtending ? (
                                                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Extending...</>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span>Add {Math.floor((backendSession?.extensionDuration || 900) / 60)} min</span>
                                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs ml-1">₹{backendSession?.extensionPrice || 300}</span>
                                                    </div>
                                                )}

                                                {/* Shimmer Effect */}
                                                <div className="absolute inset-0 overflow-hidden rounded-xl">
                                                    <motion.div
                                                        animate={{ x: ['-100%', '200%'] }}
                                                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1, ease: "linear" }}
                                                        className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                                                    />
                                                </div>
                                            </Button>
                                        </motion.div>
                                    </div>

                                    {/* Small Progress Countdown Line */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20 overflow-hidden">
                                        <motion.div
                                            initial={{ width: "100%" }}
                                            animate={{ width: `${(timeLeft / 120) * 100}%` }}
                                            transition={{ ease: "linear" }}
                                            className={`h-full ${timeLeft < 60 ? 'bg-red-400' : 'bg-blue-400'}`}
                                        />
                                    </div>
                                </motion.div>

                                {/* Background Decorative Circle */}
                                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-32 h-32 bg-blue-400/10 blur-3xl -z-0 rounded-full" />
                                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-48 h-48 bg-purple-400/10 blur-3xl -z-0 rounded-full" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Controls */}
                    <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl p-4 ring-1 ring-gray-800 shadow-xl">
                        <div className="flex items-center justify-center gap-6">
                            <Button
                                variant={isMicEnabled ? "secondary" : "destructive"}
                                className="rounded-full w-14 h-14"
                                onClick={() => setIsMicEnabled(!isMicEnabled)}
                            >
                                {isMicEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                            </Button>

                            <Button
                                variant={isCameraEnabled ? "secondary" : "destructive"}
                                className="rounded-full w-14 h-14"
                                onClick={() => setIsCameraEnabled(!isCameraEnabled)}
                            >
                                {isCameraEnabled ? <VideoIcon size={24} /> : <VideoOff size={24} />}
                            </Button>

                            <Button
                                variant={isScreenSharing ? "default" : "secondary"}
                                className="rounded-full w-14 h-14"
                                onClick={() => setIsScreenSharing(!isScreenSharing)}
                            >
                                {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
                            </Button>

                            <div className="w-px h-10 bg-gray-800 mx-2" />

                            <Button
                                variant="destructive"
                                className="rounded-full w-16 h-16 shadow-lg shadow-red-900/20"
                                onClick={handleEndSession}
                            >
                                <PhoneOff size={28} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-[400px] bg-gray-900 border-l border-gray-800 flex flex-col p-4 space-y-4">
                    <Tabs defaultValue="notes" className="flex-1">
                        <TabsList className="grid w-full grid-cols-3 mb-6">
                            <TabsTrigger value="notes">Notes</TabsTrigger>
                            <TabsTrigger value="chat">Chat</TabsTrigger>
                            <TabsTrigger value="files">Files</TabsTrigger>
                        </TabsList>

                        <TabsContent value="notes" className="space-y-4 h-[calc(100vh-200px)] overflow-y-auto pr-2">
                            <Card className="bg-gray-800/50 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400">Add Note</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full h-32 bg-gray-900 text-gray-100 border border-gray-700 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-600"
                                        placeholder="Enter key session decisions..."
                                    />
                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                        onClick={handleSaveNotes}
                                        disabled={isSavingNotes || !notes}
                                    >
                                        {isSavingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Session Note'}
                                    </Button>
                                </CardContent>
                            </Card>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase px-2">History</h4>
                                {savedNotes.length === 0 && (
                                    <p className="text-gray-500 text-xs px-2 italic">No notes saved yet.</p>
                                )}
                                {savedNotes.map((note, idx) => (
                                    <div key={idx} className="bg-gray-800/30 p-4 rounded-xl border border-gray-800/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                {new Date(note.createdAt).toLocaleTimeString()}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] py-0">{note.createdBy || 'Designer'}</Badge>
                                        </div>
                                        <p className="text-sm text-gray-300 leading-relaxed">{note.content}</p>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="chat" className="flex flex-col h-[calc(100vh-200px)]">
                            <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-700 overflow-y-auto flex-1">
                                {chatMessages.length === 0 && (
                                    <div className="text-center text-gray-500 text-sm mt-10">
                                        No messages yet. Start the conversation!
                                    </div>
                                )}
                                <div className="space-y-4">
                                    {chatMessages.map((msg, idx) => (
                                        <div key={idx} className={`flex flex-col ${msg.createdBy === 'Designer' ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[85%] rounded-2xl p-3 ${msg.createdBy === 'Designer'
                                                ? 'bg-blue-600/20 text-blue-100 rounded-br-none border border-blue-500/30'
                                                : 'bg-gray-700/50 text-gray-200 rounded-bl-none border border-gray-600'
                                                }`}>
                                                <p className="text-sm">{msg.content || msg.message}</p>
                                            </div>
                                            <span className="text-[10px] text-gray-600 mt-1 px-1">
                                                {msg.createdBy} • {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyPress={(e: any) => e.key === 'Enter' && handleSendMessage()}
                                    className="border-gray-700 bg-gray-900"
                                    placeholder="Message client..."
                                />
                                <Button size="sm" onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700">
                                    <Send size={18} />
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="files" className="space-y-4 h-[calc(100vh-200px)] overflow-y-auto pr-2">
                            <Card className="bg-gray-800/50 border-gray-700 border-dashed">
                                <CardContent className="pt-6 pb-6 text-center">
                                    <div
                                        className="cursor-pointer group"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-gray-800 transition-colors">
                                            {isUploading ? <Loader2 className="w-6 h-6 text-blue-500 animate-spin" /> : <Upload className="w-6 h-6 text-gray-500 group-hover:text-blue-500" />}
                                        </div>
                                        <p className="text-sm font-medium text-gray-300">
                                            {isUploading ? "Uploading..." : "Fulfill: Upload Final PDF"}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">Must be named: {order?.orderNumber}.pdf</p>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </CardContent>
                            </Card>

                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-gray-500 uppercase px-2 mb-3">Session Artifacts</h4>
                                {mockArtifacts.map((file, idx) => (
                                    <div key={idx} className="bg-gray-800/50 p-3 rounded-xl flex items-center gap-3 border border-gray-800">
                                        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                                            <ImageIcon size={20} className="text-blue-400" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-medium text-gray-200 truncate">{file.fileName}</p>
                                            <p className="text-[10px] text-gray-500 uppercase">{file.uploadedBy}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
                                            <Download size={18} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
