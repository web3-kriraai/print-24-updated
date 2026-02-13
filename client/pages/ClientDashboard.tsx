import React, { useState, useEffect } from 'react';
import { Video, Clock, ArrowLeft, Calendar, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

// Simple UI Components
const Button = ({ children, variant = "default", size = "default", className = "", ...props }: any) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-white";
    const variants: Record<string, string> = {
        default: "bg-gray-900 text-white hover:bg-gray-800",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
        outline: "border border-gray-200 bg-white hover:bg-gray-100 text-gray-900",
        ghost: "hover:bg-gray-100 text-gray-700",
    };
    const sizes: Record<string, string> = {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
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
        default: "border-transparent bg-gray-900 text-white hover:bg-gray-800/80",
        secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80",
        outline: "text-gray-950 border-gray-200",
    };
    return (
        <div className={`${baseStyles} ${variants[variant] || variants.default} ${className}`} {...props}>
            {children}
        </div>
    );
};

const Card = ({ children, className = "", ...props }: any) => (
    <div className={`rounded-lg border border-gray-200 bg-white text-gray-950 shadow-sm ${className}`} {...props}>
        {children}
    </div>
);

const CardHeader = ({ children, className = "", ...props }: any) => (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
        {children}
    </div>
);

const CardTitle = ({ children, className = "", ...props }: any) => (
    <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props}>
        {children}
    </h3>
);

const CardDescription = ({ children, className = "", ...props }: any) => (
    <p className={`text-sm text-gray-500 ${className}`} {...props}>
        {children}
    </p>
);

const CardContent = ({ children, className = "", ...props }: any) => (
    <div className={`p-6 pt-0 ${className}`} {...props}>
        {children}
    </div>
);

// Mock data for demonstration
const mockSessionHistory = [
    {
        id: '1',
        date: '2026-02-10',
        duration: '45 mins',
        designer: 'Sarah Chen',
        notes: 'Discussed logo refinements. Client prefers bold sans-serif fonts.',
        artifacts: ['Logo_v2.png', 'Brand_Guidelines.pdf']
    },
    {
        id: '2',
        date: '2026-02-05',
        duration: '30 mins',
        designer: 'Mike Johnson',
        notes: 'Initial consultation for business card design. Color palette: #FF5733, #1E88E5',
        artifacts: ['Business_Card_Mockup.jpg']
    }
];

export default function ClientDashboard() {
    const navigate = useNavigate();
    const [isOfficeHours] = useState(true);
    const [queuePosition, setQueuePosition] = useState<number | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");

        if (!token || !user) {
            navigate("/login");
        }
    }, [navigate]);

    const handleConnectNow = () => {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");
        if (!token || !user) {
            navigate("/login");
            return;
        }

        if (!isOfficeHours) {
            toast.error('Our designers are offline. Please schedule a callback.');
            return;
        }

        // Simulate adding to queue
        setQueuePosition(3);
        toast.success('Added to queue! A designer will connect with you shortly.');
    };

    const handleScheduleCallback = () => {
        toast.success('Callback scheduling will be available in Phase 6', { icon: 'ℹ️' });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Toaster position="top-right" />
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <h1 className="text-2xl font-bold text-gray-900">Client Dashboard</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={isOfficeHours ? "default" : "secondary"} className="gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${isOfficeHours ? 'bg-green-400' : 'bg-gray-400'}`} />
                                {isOfficeHours ? 'Designers Available' : 'Offline'}
                            </Badge>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Connect Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Video className="w-5 h-5" />
                                    Connect with a Designer
                                </CardTitle>
                                <CardDescription>
                                    Get instant help or schedule a session for later
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {queuePosition && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-blue-900">You're in the queue</p>
                                                <p className="text-sm text-blue-700">Position: #{queuePosition}</p>
                                            </div>
                                            <div className="animate-pulse">
                                                <Clock className="w-6 h-6 text-blue-600" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid sm:grid-cols-2 gap-3">
                                    <Button
                                        size="lg"
                                        className="w-full"
                                        onClick={handleConnectNow}
                                        disabled={!!queuePosition}
                                    >
                                        <Video className="w-4 h-4 mr-2" />
                                        {queuePosition ? 'Waiting...' : 'Connect Now'}
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="w-full"
                                        onClick={handleScheduleCallback}
                                    >
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Schedule Callback
                                    </Button>
                                </div>

                                {!isOfficeHours && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                        <p className="text-sm text-amber-800">
                                            <strong>Office Hours:</strong> 10:00 AM - 7:00 PM IST (Mon-Fri)
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Session History */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Session History</CardTitle>
                                <CardDescription>
                                    Your previous design consultations and saved context
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {mockSessionHistory.map((session) => (
                                        <div
                                            key={session.id}
                                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{session.designer}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {new Date(session.date).toLocaleDateString('en-US', {
                                                            month: 'long',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                                <Badge variant="outline">{session.duration}</Badge>
                                            </div>

                                            <p className="text-sm text-gray-700 mb-3">{session.notes}</p>

                                            {session.artifacts.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {session.artifacts.map((artifact, idx) => (
                                                        <Badge key={idx} variant="secondary" className="gap-1.5">
                                                            <ImageIcon className="w-3 h-3" />
                                                            {artifact}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Pricing Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Session Pricing</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">First 15 minutes</span>
                                    <span className="font-semibold">₹500</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Additional 15 min</span>
                                    <span className="font-semibold">₹300</span>
                                </div>
                                <div className="border-t pt-3">
                                    <p className="text-xs text-gray-500">
                                        Sessions can be extended during the call. You'll receive a warning before time runs out.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Need Help With</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button variant="outline" className="w-full justify-start" size="sm">
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Logo Design
                                </Button>
                                <Button variant="outline" className="w-full justify-start" size="sm">
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Business Cards
                                </Button>
                                <Button variant="outline" className="w-full justify-start" size="sm">
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Flyers & Posters
                                </Button>
                                <Button variant="outline" className="w-full justify-start" size="sm">
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    General Consultation
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
