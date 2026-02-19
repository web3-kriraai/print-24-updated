import React, { useState, useEffect } from 'react';
import { Video, Clock, ArrowLeft, Calendar, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { getAuthHeaders, API_BASE_URL_WITH_API as API_BASE_URL } from '../lib/apiConfig';

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
    const [designers, setDesigners] = useState<any[]>([]);
    const [isLoadingDesigners, setIsLoadingDesigners] = useState(true);
    const [selectedDesigner, setSelectedDesigner] = useState<string | null>(null);

    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/orders/my-orders`, {
                headers: getAuthHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                // Filter only orders that requested a designer
                setOrders(data.filter((o: any) => o.needDesigner));
            }
        } catch (err) {
            console.error("Fetch orders error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDesigners = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/session/settings/designers`, {
                headers: getAuthHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setDesigners(data.designers);
            }
        } catch (err) {
            console.error("Fetch designers error:", err);
        } finally {
            setIsLoadingDesigners(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }
        fetchOrders();
        fetchDesigners();
    }, [navigate]);

    const handleConnectNow = async (designerId?: string) => {
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");
        if (!token || !userStr) {
            navigate("/login");
            return;
        }

        if (!isOfficeHours) {
            toast.error('Our designers are offline. Please schedule a callback.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/designer-requests`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    designerType: 'visual', // Default to visual for live meetings
                    assignedDesigner: designerId || null,
                    designForm: {
                        source: 'Live Dashboard',
                        timestamp: new Date().toISOString()
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(designerId ? `Connecting you with your selected designer...` : 'Added to queue! A designer will connect with you shortly.');
                setQueuePosition(1); // Real position logic could be added here
            } else {
                toast.error('Failed to connect with designer');
            }
        } catch (err) {
            console.error("Connect error:", err);
            toast.error('Network error. Please try again.');
        }
    };

    const handleScheduleCallback = () => {
        toast.success('Callback scheduling will be available in Phase 6', { icon: 'ℹ️' });
    };

    return (
        <div className="min-h-screen bg-gray-50">
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

                        {/* Designer List Section */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-gray-900 px-1">Available Designers</h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {isLoadingDesigners ? (
                                    <div className="col-span-full py-12 flex justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                    </div>
                                ) : designers.length === 0 ? (
                                    <p className="col-span-full text-center text-gray-500 py-8 bg-white rounded-lg border">No designers currently available</p>
                                ) : (
                                    designers.map((designer) => (
                                        <Card key={designer._id} className="overflow-hidden flex flex-col">
                                            <CardHeader className="p-4 pb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                                        {designer.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg">{designer.name}</CardTitle>
                                                        <Badge variant="outline" className="text-[10px] py-0">Professional Designer</Badge>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between">
                                                <div className="space-y-2 mb-4">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-gray-500">Base Price ({Math.floor(designer.sessionSettings.baseDuration / 60)} min)</span>
                                                        <span className="font-bold text-gray-900">₹{designer.sessionSettings.basePrice}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-gray-500">Extension ({Math.floor(designer.sessionSettings.extensionDuration / 60)} min)</span>
                                                        <span className="font-semibold text-gray-700">₹{designer.sessionSettings.extensionPrice}</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => handleConnectNow(designer._id)}
                                                    className="w-full"
                                                    size="sm"
                                                    disabled={!!queuePosition}
                                                >
                                                    Connect with {designer.name.split(' ')[0]}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Design Request Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Design Request Status</CardTitle>
                                <CardDescription>
                                    Track progress on your design requirements
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {isLoading ? (
                                        <p className="text-center text-gray-500 py-8">Loading requests...</p>
                                    ) : orders.length === 0 ? (
                                        <p className="text-center text-gray-500 py-8 italic">No active design requests</p>
                                    ) : (
                                        orders.map((order) => (
                                            <div
                                                key={order._id}
                                                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <p className="font-semibold text-gray-900">Order #{order.orderNumber}</p>
                                                        <p className="text-sm text-gray-500">
                                                            {order.designForm?.designFor || "Custom Design"}
                                                        </p>
                                                    </div>
                                                    <Badge
                                                        variant={order.designStatus === "FinalReady" ? "default" : "outline"}
                                                        className={order.designStatus === "InDesign" ? "bg-blue-100 text-blue-700 border-none" : ""}
                                                    >
                                                        {order.designStatus || "Pending"}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-4 mt-3">
                                                    <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-500 ${order.designStatus === "FinalReady" ? 'bg-green-500 w-full' :
                                                                order.designStatus === "InDesign" ? 'bg-blue-500 w-2/3' :
                                                                    'bg-amber-500 w-1/3'
                                                                }`}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] uppercase font-bold text-gray-400">
                                                        {order.designStatus === "FinalReady" ? "100%" :
                                                            order.designStatus === "InDesign" ? "66%" : "33%"}
                                                    </span>
                                                </div>

                                                {order.designStatus === "FinalReady" && (
                                                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                                                        <Button size="sm" variant="default" onClick={() => navigate(`/orders/${order._id}`)}>
                                                            View Final Design
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
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
