import React, { useState, useEffect } from 'react';
import { Video, Clock, ArrowLeft, Calendar, MessageSquare, Image as ImageIcon, MapPin, Activity, User, Briefcase, DollarSign, CheckCircle, Smartphone, Phone } from 'lucide-react';
import { joinRoom, onSessionEvent, offSessionEvent } from '../lib/socketClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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

    const [physicalBookings, setPhysicalBookings] = useState<any[]>([]);
    const [isLoadingPhysical, setIsLoadingPhysical] = useState(true);
    const [officeConfig, setOfficeConfig] = useState<any>(null);

    const [activeTab, setActiveTab] = useState<'visual' | 'physical'>('visual');
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

    const fetchPhysicalBookings = async () => {
        try {
            // Adjust URL based on API_BASE_URL structure
            const baseUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
            const response = await fetch(`${baseUrl}/api/physical/my-bookings`, {
                headers: getAuthHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setPhysicalBookings(data.bookings || (Array.isArray(data) ? data : []));
            }
        } catch (err) {
            console.error("Fetch physical bookings error:", err);
        } finally {
            setIsLoadingPhysical(false);
        }
    };

    const fetchOfficeConfig = async () => {
        try {
            const baseUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
            const response = await fetch(`${baseUrl}/api/physical/office-config`, {
                headers: getAuthHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setOfficeConfig(data);
            }
        } catch (err) {
            console.error("Fetch office config error:", err);
        }
    };
    useEffect(() => {
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");
        if (!token || !userStr) {
            navigate("/login");
            return;
        }

        const userData = JSON.parse(userStr);
        const userId = userData._id || userData.id;

        if (userId) {
            joinRoom(`user_${userId}`);

            const handleUpdate = (data: any) => {
                console.log('[Socket] Physical visit update received:', data);
                toast.success(data.message);
                fetchPhysicalBookings();
            };

            onSessionEvent('physical_visit_update', handleUpdate);

            return () => {
                offSessionEvent('physical_visit_update', handleUpdate);
            };
        }
    }, [navigate]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        fetchOrders();
        fetchDesigners();
        fetchPhysicalBookings();
        fetchOfficeConfig();
    }, []);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Tab Navigation */}
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 mb-8 max-w-md">
                <button
                    onClick={() => setActiveTab('visual')}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'visual' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    <Activity size={18} />
                    Visual Design
                </button>
                <button
                    onClick={() => setActiveTab('physical')}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'physical' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    <MapPin size={18} />
                    Physical Visits
                </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'visual' ? (
                        <>
                            {/* Connect Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <Video className="w-5 h-5 text-blue-600" />
                                        Instant Design Consultation
                                    </CardTitle>
                                    <CardDescription>
                                        Connect with a professional designer via video call right now
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {queuePosition && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-100 rounded-lg">
                                                        <Clock className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-blue-900">You're in the queue</p>
                                                        <p className="text-sm text-blue-700">Estimated wait: ~10 mins (Position: #{queuePosition})</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <Button
                                            size="lg"
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100"
                                            onClick={handleConnectNow}
                                            disabled={!!queuePosition}
                                        >
                                            <Video className="w-5 h-5 mr-2" />
                                            {queuePosition ? 'Waiting for Designer...' : 'Connect Now'}
                                        </Button>
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className="w-full border-gray-200 hover:bg-gray-50"
                                            onClick={handleScheduleCallback}
                                        >
                                            <Calendar className="w-5 h-5 mr-2" />
                                            Schedule for Later
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Designer List */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h2 className="text-xl font-bold text-gray-900">Experts Online</h2>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase tracking-wider font-bold">Live</Badge>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {isLoadingDesigners ? (
                                        <div className="col-span-full py-12 flex justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                        </div>
                                    ) : designers.length === 0 ? (
                                        <Card className="col-span-full p-8 text-center border-dashed">
                                            <User className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                            <p className="text-gray-500 font-medium">No designers available right now</p>
                                            <p className="text-sm text-gray-400">Our team will be back online shortly</p>
                                        </Card>
                                    ) : (
                                        designers.map((designer) => (
                                            <Card key={designer._id} className="overflow-hidden group hover:shadow-md transition-all">
                                                <CardHeader className="p-4 pb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg shadow-sm border-2 border-white ring-1 ring-indigo-50">
                                                            {designer.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <CardTitle className="text-lg">{designer.name}</CardTitle>
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                                                                <Badge variant="outline" className="py-0 px-1.5 h-4 text-[9px] bg-gray-50">TOP RATED</Badge>
                                                                <span>• Specialist Designer</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-4 pt-0">
                                                    <div className="bg-gray-50 rounded-lg p-3 my-3 space-y-1.5">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-gray-500">Base Price ({Math.floor(designer.sessionSettings.baseDuration / 60)}m)</span>
                                                            <span className="font-bold text-gray-900">₹{designer.sessionSettings.basePrice}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-gray-500">Extension per {Math.floor(designer.sessionSettings.extensionDuration / 60)}m</span>
                                                            <span className="font-semibold text-gray-600">₹{designer.sessionSettings.extensionPrice}</span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={() => handleConnectNow(designer._id)}
                                                        className="w-full h-9 text-xs font-bold"
                                                        variant="default"
                                                        disabled={!!queuePosition}
                                                    >
                                                        Chat with {designer.name.split(' ')[0]}
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Design Status */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl">Your Design Projects</CardTitle>
                                    <CardDescription>
                                        In-progress and completed design requirements
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {isLoading ? (
                                            <div className="text-center py-8">
                                                <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                                <p className="text-sm text-gray-500">Loading your projects...</p>
                                            </div>
                                        ) : orders.length === 0 ? (
                                            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
                                                <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                                                <p className="text-gray-500 italic">No active design projects found</p>
                                            </div>
                                        ) : (
                                            orders.map((order) => (
                                                <div
                                                    key={order._id}
                                                    className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-all border-l-4 border-l-blue-500 bg-white shadow-sm"
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-gray-900 text-base">Order #{order.orderNumber}</p>
                                                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none font-bold text-[10px]">DESIGN ONLY</Badge>
                                                            </div>
                                                            <p className="text-sm text-gray-500 mt-1 font-medium">
                                                                {order.designForm?.designFor || "Custom Layout"}
                                                            </p>
                                                        </div>
                                                        <Badge
                                                            variant={order.designStatus === "FinalReady" ? "default" : "outline"}
                                                            className={`px-3 py-1 ${order.designStatus === "FinalReady" ? 'bg-green-600' :
                                                                order.designStatus === "InDesign" ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                    'bg-amber-50 text-amber-700 border-amber-100'}`}
                                                        >
                                                            {order.designStatus || "Pending"}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex items-center gap-4 mt-4">
                                                        <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden shadow-inner">
                                                            <div
                                                                className={`h-full transition-all duration-700 ease-out shadow-sm ${order.designStatus === "FinalReady" ? 'bg-green-500 w-full' :
                                                                    order.designStatus === "InDesign" ? 'bg-blue-500 w-2/3' :
                                                                        'bg-amber-500 w-1/3'
                                                                    }`}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-black text-gray-400">
                                                            {order.designStatus === "FinalReady" ? "100%" :
                                                                order.designStatus === "InDesign" ? "66%" : "33%"}
                                                        </span>
                                                    </div>

                                                    {order.designStatus === "FinalReady" && (
                                                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                                                            <Button size="sm" className="bg-gray-900 rounded-full px-4" onClick={() => navigate(`/orders/${order._id}`)}>
                                                                View & Approve Design
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        /* ═══ PHYSICAL TAB CONTENT ═══ */
                        <Card className="border-none shadow-none bg-transparent">
                            <CardHeader className="px-1 pt-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-gray-900">Physical Visit Bookings</CardTitle>
                                        <CardDescription>Scheduled designer visits to your office or home</CardDescription>
                                    </div>
                                    <Badge variant="outline" className="font-bold bg-white">{(physicalBookings || []).length} TOTAL</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="px-0 pt-6">
                                <div className="space-y-4">
                                    {isLoadingPhysical ? (
                                        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                            <p className="text-gray-500 font-medium tracking-tight">Syncing your bookings...</p>
                                        </div>
                                    ) : (physicalBookings || []).length === 0 ? (
                                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                                            <Calendar className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                                            <p className="text-gray-900 font-bold text-lg">No scheduled visits</p>
                                            <p className="text-gray-500 max-w-xs mx-auto mt-1">Book a physical visit to have a designer visit your premises for measurements and samples.</p>
                                        </div>
                                    ) : (
                                        (physicalBookings || []).map((booking) => (
                                            <div
                                                key={booking._id}
                                                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg transition-all relative overflow-hidden group"
                                            >
                                                {/* Visit Type Accent Bar */}
                                                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${booking.visitLocation === 'HOME' ? 'bg-amber-500' : 'bg-blue-500'}`} />

                                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                    <div className="flex-1 space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2.5 rounded-xl ${booking.visitLocation === 'HOME' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {booking.visitLocation === 'HOME' ? <MapPin size={24} /> : <Briefcase size={24} />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="font-black text-gray-900 text-lg">
                                                                        {booking.visitLocation === 'HOME' ? 'Home Visit' : 'Office Visit'}
                                                                    </p>
                                                                    <Badge
                                                                        variant={booking.visitStatus === "Completed" ? "default" : "secondary"}
                                                                        className={booking.visitStatus === "Completed" ? "bg-green-600" : "bg-gray-100 border-none font-bold text-[10px]"}
                                                                    >
                                                                        {booking.visitStatus}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-sm text-gray-500 font-medium">#{booking.orderId?.orderNumber || 'BOOKING-ID'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 mt-2">
                                                            <div className="flex items-start gap-2.5">
                                                                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Date & Schedule</p>
                                                                    <p className="text-sm font-bold text-gray-800">
                                                                        {new Date(booking.visitDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                                                    </p>
                                                                    <p className="text-xs text-indigo-600 font-black">
                                                                        {booking.visitLocation === 'HOME' ? '10:00 AM - 06:00 PM' : (booking.timeSlot || 'Timing TBD')}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-start gap-2.5">
                                                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                                                        {booking.visitLocation === 'OFFICE' ? 'Office Address' : 'Visit Address'}
                                                                    </p>
                                                                    <p className="text-sm font-medium text-gray-700 line-clamp-2 leading-snug">
                                                                        {booking.visitLocation === 'OFFICE'
                                                                            ? (booking.designerId?.address || 'Office Address Unavailable')
                                                                            : (booking.visitAddress || 'No address provided')}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-start gap-2.5">
                                                                <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Assigned Designer</p>
                                                                    <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                                                        {booking.designerId?.name || 'Assigning soon...'}
                                                                        {booking.designerId?.name && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-start gap-2.5">
                                                                <Smartphone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Designer Phone</p>
                                                                    <p className="text-sm font-bold text-gray-800">
                                                                        {booking.designerId?.mobileNumber || 'Contact info will appear here'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {officeConfig?.officePhone && (
                                                                <div className="flex items-start gap-2.5">
                                                                    <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                                                    <div className="space-y-0.5">
                                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Office Phone</p>
                                                                        <p className="text-sm font-bold text-gray-800">
                                                                            {officeConfig.officePhone}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="md:w-48 flex flex-col justify-between items-end gap-4 shrink-0">
                                                        <div className="text-right">
                                                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col items-end">
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Current Estimate</p>
                                                                <p className="text-2xl font-black text-gray-900 leading-none mt-1">
                                                                    {booking.totalAmount ? `₹${booking.totalAmount}` : '₹0'}
                                                                </p>
                                                                {booking.visitLocation === 'HOME' && (
                                                                    <span className="text-[9px] text-amber-600 font-black mt-1 uppercase">Incl. ₹{booking.homeVisitCharge || 500} Visit Charge</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <Button
                                                            variant="outline"
                                                            className="w-full rounded-full border-gray-200 text-xs font-bold hover:bg-gray-50 py-2 h-auto"
                                                            onClick={() => {/* View Details */ }}
                                                        >
                                                            View Billing Details
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {activeTab === 'visual' ? (
                        <>
                            {/* Live Support / Hotline */}
                            <Card className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 border-none text-white overflow-hidden shadow-xl shadow-blue-100">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-white text-lg flex items-center gap-2">
                                        <Activity className="w-5 h-5" />
                                        Design Support
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-xs text-blue-100 font-medium">Need immediate help with your live design session?</p>
                                    <a href="tel:+917600156255" className="flex items-center justify-between bg-white/10 hover:bg-white/20 transition-all p-3 rounded-xl border border-white/20 group">
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-black text-blue-200 uppercase tracking-[2px]">Technical Hotline</p>
                                            <p className="font-black text-base">+91 76001 56255</p>
                                        </div>
                                        <div className="bg-white text-blue-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                                            <Smartphone size={16} />
                                        </div>
                                    </a>
                                </CardContent>
                            </Card>

                            {/* Online Pricing Info */}
                            <Card>
                                <CardHeader className="pb-2 border-b border-gray-50">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-green-600" />
                                        Consultation Fees
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-900">Base Session</span>
                                                <span className="text-[10px] text-gray-500">First 15 minutes</span>
                                            </div>
                                            <span className="text-sm font-black text-gray-900">₹500</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-900">Extension</span>
                                                <span className="text-[10px] text-gray-500">Every 15 minutes thereafter</span>
                                            </div>
                                            <span className="text-sm font-black text-indigo-600">₹300</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                        <p className="text-[10px] text-blue-800 leading-relaxed">
                                            *Fees are automatically calculated and billed after the session ends.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Requirements */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <Briefcase className="w-5 h-5 text-purple-600" />
                                        Design Requests
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Button variant="outline" className="w-full justify-start text-xs border-gray-100 hover:border-purple-200 hover:bg-purple-50 group" size="sm">
                                        <MessageSquare className="w-3.5 h-3.5 mr-2 text-gray-400 group-hover:text-purple-600" />
                                        Modify Existing Design
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start text-xs border-gray-100 hover:border-purple-200 hover:bg-purple-50 group" size="sm">
                                        <MessageSquare className="w-3.5 h-3.5 mr-2 text-gray-400 group-hover:text-purple-600" />
                                        Request Source Files
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start text-xs border-gray-100 hover:border-purple-200 hover:bg-purple-50 group" size="sm">
                                        <MessageSquare className="w-3.5 h-3.5 mr-2 text-gray-400 group-hover:text-purple-600" />
                                        Priority Tracking
                                    </Button>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <>
                            {/* Visit Assistance */}
                            <Card className="bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 border-none text-white overflow-hidden shadow-xl shadow-amber-100">
                                {/* <CardHeader className="pb-2">
                                    <CardTitle className="text-white text-lg flex items-center gap-2">
                                        <MapPin className="w-5 h-5" />
                                        Visit Assistance
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-xs text-amber-100 font-medium">Questions about your physical visit or measurements?</p>
                                    <a href="tel:+917600156255" className="flex items-center justify-between bg-white/10 hover:bg-white/20 transition-all p-3 rounded-xl border border-white/20 group">
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-black text-amber-200 uppercase tracking-[2px]">Logistics Support</p>
                                            <p className="font-black text-base">+91 76001 56255</p>
                                        </div>
                                        <div className="bg-white text-amber-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                                            <Smartphone size={16} />
                                        </div>
                                    </a>
                                </CardContent> */}
                            </Card>

                            {/* Physical Pricing Info */}
                            <Card>
                                <CardHeader className="pb-2 border-b border-gray-50">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-green-600" />
                                        Visit Charges
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border-l-4 border-l-blue-500">
                                            <span className="text-xs font-bold text-gray-900">Office Visit Fee</span>
                                            <span className="text-xs font-black text-green-600 uppercase">Free</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border-l-4 border-l-amber-500">
                                            <span className="text-xs font-bold text-gray-900">Home Visit Fee</span>
                                            <span className="text-xs font-black text-gray-900">From ₹500</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-amber-800 leading-relaxed font-medium text-center">
                                        *Fees vary by designer. Hourly rates and visit charges are displayed in the selection menu.
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Visit Instructions */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        Visit Guidelines
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex gap-2 text-xs text-gray-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                                        <p>Keep your primary reference samples ready for the designer.</p>
                                    </div>
                                    <div className="flex gap-2 text-xs text-gray-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                                        <p>Ensure space for measurements if booking for large signage.</p>
                                    </div>
                                    <div className="flex gap-2 text-xs text-gray-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                                        <p>Office visits require you to be on-time for your 1-hour slot.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
