import React, { useState, useEffect } from 'react';
import {
    Clock,
    ChevronRight,
    MoreVertical,
    Calendar,
    User,
    Phone,
    MapPin,
    DollarSign,
    CheckCircle2,
    ArrowRight,
    Save,
    LayoutDashboard,
    Package,
    Star,
    TrendingUp,
    Plus,
    MessageCircle,
    Home,
    ArrowLeft,
    FileText,
    Image as ImageIcon,
    Navigation,
    X,
    Mail,
    AlertCircle,
    CheckCircle,
    Briefcase,
    Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getAuthHeaders, API_BASE_URL_WITH_API as API_BASE_URL } from '../../lib/apiConfig';
import { useAuth } from '../../context/AuthContext';
import { joinRoom, onSessionEvent, offSessionEvent } from '../../lib/socketClient';

// ─────────────────────────────────────────────────────────────────────────────
// Simple UI Components
// ─────────────────────────────────────────────────────────────────────────────

function Button({ children, variant = "default", size = "default", className = "", ...props }: any) {
    const base = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const variants: Record<string, string> = {
        default: "bg-gray-900 text-white hover:bg-gray-800 shadow-sm",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
        outline: "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50",
        ghost: "text-gray-700 hover:bg-gray-100",
        destructive: "bg-red-600 text-white hover:bg-red-700"
    };
    const sizes: Record<string, string> = {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-sm",
        icon: "h-10 w-10"
    };
    return (
        <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
            {children}
        </button>
    );
}

function Badge({ children, variant = "default", className = "", ...props }: any) {
    const variants: Record<string, string> = {
        default: "bg-blue-100 text-blue-800",
        secondary: "bg-gray-100 text-gray-800",
        outline: "border border-gray-200 text-gray-700 bg-white",
        success: "bg-green-100 text-green-800",
        warning: "bg-amber-100 text-amber-800"
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`} {...props}>
            {children}
        </span>
    );
}

function Card({ children, className = "", ...props }: any) {
    return <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`} {...props}>{children}</div>;
}

function CardHeader({ children, className = "", ...props }: any) {
    return <div className={`p-6 pb-2 ${className}`} {...props}>{children}</div>;
}

function CardTitle({ children, className = "", ...props }: any) {
    return <h3 className={`font-semibold text-gray-900 ${className}`} {...props}>{children}</h3>;
}

function CardDescription({ children, className = "", ...props }: any) {
    return <p className={`text-sm text-gray-500 mt-1 ${className}`} {...props}>{children}</p>;
}

function CardContent({ children, className = "", ...props }: any) {
    return <div className={`p-6 pt-4 ${className}`} {...props}>{children}</div>;
}

function Switch({ checked, onCheckedChange }: { checked: boolean, onCheckedChange: (val: boolean) => void }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={() => onCheckedChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${checked ? 'translate-x-6' : 'translate-x-1'}`}
            />
        </button>
    );
}

function Avatar({ children, className = "" }: any) {
    return <div className={`w-10 h-10 rounded-full flex items-center justify-center ${className}`}>{children}</div>;
}

function AvatarFallback({ children, className = "" }: any) {
    return <div className={`w-full h-full rounded-full flex items-center justify-center text-sm font-bold ${className}`}>{children}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PhysicalStats {
    totalVisits: number;
    completedVisits: number;
    upcomingVisits: number;
    totalEarnings: number;
    totalDurationMinutes: number;
}

// Mock visual stats (kept for UI placeholders until a real API is built)
const defaultVisualStats = {
    sessionsToday: 0,
    totalDuration: '0h 0m',
    avgRating: 5.0,
    completedThisWeek: 0
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function DesignerDashboard() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    // Shared state
    const [activeTab, setActiveTab] = useState<'visual' | 'physical'>('visual');
    const [isAvailable, setIsAvailable] = useState(false);

    // Visual tab state
    const [isLoading, setIsLoading] = useState(true);
    const [queue, setQueue] = useState<any[]>([]);
    const [settings, setSettings] = useState({
        baseDuration: 900,
        basePrice: 500,
        extensionDuration: 900,
        extensionPrice: 300
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Physical tab state
    const [physicalBookings, setPhysicalBookings] = useState<any[]>([]);
    const [isLoadingPhysical, setIsLoadingPhysical] = useState(false);
    const [physicalStats, setPhysicalStats] = useState<PhysicalStats>({
        totalVisits: 0, completedVisits: 0, upcomingVisits: 0,
        totalEarnings: 0, totalDurationMinutes: 0
    });
    const [isLoadingPhysicalStats, setIsLoadingPhysicalStats] = useState(false);
    const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<any | null>(null);

    // Profile form state (for physical sidebar)
    const [profileForm, setProfileForm] = useState({ mobileNumber: '', address: '', hourlyRate: 500, homeVisitCharge: 500, termsAndConditions: '' });
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // ── Data Fetchers ─────────────────────────────────────────────────────────

    const fetchOrders = async () => {
        try {
            const [ordersRes, requestsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/designer-orders`, { headers: getAuthHeaders() }),
                fetch(`${API_BASE_URL}/designer-requests`, { headers: getAuthHeaders() })
            ]);

            let combinedQueue: any[] = [];

            if (ordersRes.ok) {
                const ordersData = await ordersRes.json();
                combinedQueue = [...combinedQueue, ...ordersData.map((o: any) => ({ ...o, isRequest: false }))];
            }

            if (requestsRes.ok) {
                const requestsData = await requestsRes.json();
                combinedQueue = [...combinedQueue, ...requestsData.map((r: any) => ({ ...r, isRequest: true }))];
            }

            combinedQueue.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            setQueue(combinedQueue);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/session/settings`, {
                headers: getAuthHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setSettings(data.settings);
                setIsAvailable(data.isOnline || false);
                // Pre-fill profile form from DB values returned by API
                setProfileForm({
                    mobileNumber: data.mobileNumber || '',
                    address: data.address || '',
                    hourlyRate: data.hourlyRate || 500,
                    homeVisitCharge: data.homeVisitCharge || 500,
                    termsAndConditions: data.termsAndConditions || ''
                });
            }
        } catch (err) {
            console.error("Failed to fetch settings:", err);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            const response = await fetch(`${API_BASE_URL}/session/settings/profile`, {
                method: 'PATCH',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileForm)
            });

            if (response.ok) {
                const data = await response.json();
                if (user) {
                    updateUser({ ...user, ...data.profile });
                }
                toast.success('Profile updated successfully!');
            } else {
                const err = await response.json();
                toast.error(err.error || 'Failed to update profile');
            }
        } catch (err) {
            console.error('Failed to update profile:', err);
            toast.error('Network error');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const fetchPhysicalBookings = async () => {
        setIsLoadingPhysical(true);
        try {
            const response = await fetch(`${API_BASE_URL}/physical/designer-bookings`, {
                headers: getAuthHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setPhysicalBookings(data.bookings);
            }
        } catch (err) {
            console.error("Failed to fetch physical bookings:", err);
        } finally {
            setIsLoadingPhysical(false);
        }
    };

    const fetchPhysicalStats = async () => {
        setIsLoadingPhysicalStats(true);
        try {
            const response = await fetch(`${API_BASE_URL}/physical/designer-stats`, {
                headers: getAuthHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setPhysicalStats(data.stats);
            }
        } catch (err) {
            console.error("Failed to fetch physical stats:", err);
        } finally {
            setIsLoadingPhysicalStats(false);
        }
    };

    // ── Initial load ──────────────────────────────────────────────────────────

    useEffect(() => {
        if (user?._id || user?.id) {
            const userId = user?._id || user?.id;
            joinRoom(`user_${userId}`);

            const handleNewBooking = (data: any) => {
                console.log('[Socket] New physical booking assignment:', data);
                toast.success(data.message);
                if (activeTab === 'physical') {
                    fetchPhysicalBookings();
                    fetchPhysicalStats();
                }
            };

            const handleUpdate = (data: any) => {
                console.log('[Socket] Physical visit update received:', data);
                if (data.status === 'Cancelled') {
                    toast.error(data.message);
                } else {
                    toast.success(data.message);
                }
                if (activeTab === 'physical') {
                    fetchPhysicalBookings();
                    fetchPhysicalStats();
                }
            };

            onSessionEvent('new_physical_booking', handleNewBooking);
            onSessionEvent('physical_visit_update', handleUpdate);

            return () => {
                offSessionEvent('new_physical_booking', handleNewBooking);
                offSessionEvent('physical_visit_update', handleUpdate);
            };
        }
    }, [user, activeTab]);

    useEffect(() => {
        fetchOrders();
        fetchSettings();
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    // ── Tab-change data fetch ─────────────────────────────────────────────────

    useEffect(() => {
        if (activeTab === 'physical') {
            fetchPhysicalBookings();
            fetchPhysicalStats();
        } else {
            fetchOrders();
        }
    }, [activeTab]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handlePickUp = async (id: string, clientName: string, isRequest: boolean) => {
        if (!isAvailable) {
            toast.error("Set yourself as Available first!");
            return;
        }

        try {
            const endpoint = isRequest
                ? `${API_BASE_URL}/designer-requests/${id}`
                : `${API_BASE_URL}/designer-orders/${id}/pickup`;

            const body = isRequest ? JSON.stringify({ designStatus: 'InDesign', assignedDesigner: user?._id || user?.id }) : undefined;

            const response = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(`Picked up ${isRequest ? 'request' : 'order'} for ${clientName}!`);
                setTimeout(() => {
                    navigate(`/session/${data.sessionId || (data.request?._id) || id}`);
                }, 500);
            } else {
                const error = await response.json();
                toast.error(error.error || "Failed to pick up");
            }
        } catch (err) {
            toast.error("Network error. Try again.");
        }
    };

    const handleToggleAvailability = async (checked: boolean) => {
        setIsAvailable(checked);
        try {
            const response = await fetch(`${API_BASE_URL}/session/settings/status`, {
                method: 'PATCH',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isOnline: checked })
            });

            if (response.ok) {
                toast.success(`You are now ${checked ? 'Online' : 'Offline'}`);
            } else {
                setIsAvailable(!checked);
                toast.error("Failed to update status");
            }
        } catch (err) {
            setIsAvailable(!checked);
            toast.error("Network error");
        }
    };

    const handleUpdateSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingSettings(true);
        try {
            const response = await fetch(`${API_BASE_URL}/session/settings`, {
                method: 'PATCH',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                toast.success("Settings updated successfully!");
            } else {
                toast.error("Failed to update settings");
            }
        } catch (err) {
            console.error("Failed to update settings:", err);
            toast.error("Network error");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handlePhysicalVisitAction = async (bookingId: string, action: 'accept' | 'start' | 'end') => {
        try {
            const response = await fetch(`${API_BASE_URL}/physical/${bookingId}/${action}`, {
                method: 'PATCH',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message || `Visit ${action}ed successfully!`);
                fetchPhysicalBookings();
                fetchPhysicalStats();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || `Failed to ${action} visit.`);
            }
        } catch (err) {
            console.error(`Error during ${action} visit:`, err);
            toast.error("Network error");
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gray-50 pb-12">


            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Designer Dashboard</h1>
                                <p className="text-sm text-gray-500">Manage your client queue</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 ml-14 sm:ml-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">
                                    {isAvailable ? 'Available' : 'Unavailable'}
                                </span>
                                <Switch
                                    checked={isAvailable}
                                    onCheckedChange={handleToggleAvailability}
                                />
                            </div>
                            <Badge
                                variant={isAvailable ? "default" : "secondary"}
                                className="gap-1.5"
                            >
                                <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-400' : 'bg-gray-400'}`} />
                                {isAvailable ? 'Online' : 'Offline'}
                            </Badge>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Section (2 cols) */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* ── Stats Cards ──────────────────────────────────────── */}
                        {activeTab === 'visual' ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-600">Today</p>
                                                <p className="text-2xl font-bold">{defaultVisualStats.sessionsToday}</p>
                                            </div>
                                            <Phone className="w-8 h-8 text-blue-500" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-600">Duration</p>
                                                <p className="text-2xl font-bold">{defaultVisualStats.totalDuration}</p>
                                            </div>
                                            <Clock className="w-8 h-8 text-indigo-500" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-600">Rating</p>
                                                <p className="text-2xl font-bold">{defaultVisualStats.avgRating}</p>
                                            </div>
                                            <Star className="w-8 h-8 text-yellow-500" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-600">This Week</p>
                                                <p className="text-2xl font-bold">{defaultVisualStats.completedThisWeek}</p>
                                            </div>
                                            <TrendingUp className="w-8 h-8 text-green-500" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-600">Total Visits</p>
                                                <p className="text-2xl font-bold">{isLoadingPhysicalStats ? '...' : physicalStats.totalVisits}</p>
                                            </div>
                                            <Briefcase className="w-8 h-8 text-purple-500" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-600">Earnings</p>
                                                <p className="text-2xl font-bold">₹{isLoadingPhysicalStats ? '...' : physicalStats.totalEarnings}</p>
                                            </div>
                                            <DollarSign className="w-8 h-8 text-green-500" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-600">Upcoming</p>
                                                <p className="text-2xl font-bold">{isLoadingPhysicalStats ? '...' : physicalStats.upcomingVisits}</p>
                                            </div>
                                            <Calendar className="w-8 h-8 text-amber-500" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-600">Completed</p>
                                                <p className="text-2xl font-bold">{isLoadingPhysicalStats ? '...' : physicalStats.completedVisits}</p>
                                            </div>
                                            <CheckCircle className="w-8 h-8 text-teal-500" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ── Tab Navigation ───────────────────────────────────── */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('visual')}
                                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'visual' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Activity size={16} />
                                Visual Requests ({queue.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('physical')}
                                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'physical' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <MapPin size={16} />
                                Physical Visits ({physicalBookings.length})
                            </button>
                        </div>

                        {/* ── Tab Content ───────────────────────────────────────── */}
                        {activeTab === 'visual' ? (
                            /* ═══ VISUAL: Live Queue ═══ */
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Live Queue</CardTitle>
                                            <CardDescription>
                                                {queue.length} {queue.length === 1 ? 'client' : 'clients'} waiting
                                            </CardDescription>
                                        </div>
                                        <Badge variant="outline">{queue.length} in queue</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {!isAvailable && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                                            <p className="text-sm text-amber-800">
                                                You're currently offline. Turn on availability to accept clients.
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {isLoading ? (
                                            <div className="text-center py-12">
                                                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                                <p className="text-gray-500">Loading queue...</p>
                                            </div>
                                        ) : queue.length === 0 ? (
                                            <div className="text-center py-12">
                                                <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500">No clients in queue</p>
                                                <p className="text-sm text-gray-400">New requests will appear here</p>
                                            </div>
                                        ) : (
                                            queue.map((order) => (
                                                <div
                                                    key={order._id}
                                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar>
                                                                <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                                                                    {getInitials(order.user?.name || "Customer")}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-semibold text-gray-900">{order.user?.name || "Anonymous"}</p>
                                                                    <Badge variant="outline" className="text-[10px] py-0">#{order.orderNumber}</Badge>
                                                                </div>
                                                                <p className="text-sm text-gray-500">{order.designForm?.designFor || "Custom Design"}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-gray-50 rounded-md p-3 mb-3 text-xs text-gray-600">
                                                        <p><strong>Status:</strong> {order.designStatus}</p>
                                                        <p><strong>Submitted:</strong> {new Date(order.createdAt).toLocaleString()}</p>
                                                    </div>

                                                    <Button
                                                        className="w-full"
                                                        onClick={() => handlePickUp(order._id, order.user?.name || "Customer", order.isRequest)}
                                                        disabled={!isAvailable}
                                                    >
                                                        <Phone className="w-4 h-4 mr-2" />
                                                        {order.isRequest ? 'Pick Up Meeting' : 'Pick Up Order'}
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            /* ═══ PHYSICAL: Bookings List ═══ */
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Physical Designer Visits</CardTitle>
                                            <CardDescription>
                                                {physicalBookings.length} {physicalBookings.length === 1 ? 'visit' : 'visits'} assigned to you
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {isLoadingPhysical ? (
                                            <div className="text-center py-12">
                                                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                                <p className="text-gray-500">Loading visits...</p>
                                            </div>
                                        ) : physicalBookings.length === 0 ? (
                                            <div className="text-center py-12">
                                                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500">No physical visits scheduled</p>
                                            </div>
                                        ) : (
                                            physicalBookings.map((booking) => (
                                                <div
                                                    key={booking._id}
                                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                                >
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar>
                                                                <AvatarFallback className="bg-purple-100 text-purple-700 font-bold">
                                                                    {getInitials(booking.customerId?.name || "Customer")}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-semibold text-gray-900">{booking.customerId?.name || "Anonymous"}</p>
                                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                                    <Badge variant="outline" className="text-[10px] py-0">#{booking.orderId?.orderNumber}</Badge>
                                                                    <span>{booking.productSnapshot?.productName || "Product"}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Badge variant="outline" className={booking.visitLocation === 'HOME' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                                                                {booking.visitLocation === 'HOME' ? 'Home Visit' : 'Office Visit'}
                                                            </Badge>
                                                            <Badge>{booking.visitStatus}</Badge>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 mb-4 text-xs text-gray-600">
                                                        <div className="space-y-1">
                                                            <p className="flex items-center gap-1 font-medium text-gray-900">
                                                                <Calendar className="w-3 h-3 text-gray-400" />
                                                                Visit Date
                                                            </p>
                                                            <p>{new Date(booking.visitDate).toLocaleString()}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="flex items-center gap-1 font-medium text-gray-900">
                                                                <MapPin className="w-3 h-3 text-gray-400" />
                                                                Address
                                                            </p>
                                                            <p className="line-clamp-2">{booking.visitAddress || '—'}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="flex items-center gap-1 font-medium text-gray-900">
                                                                <Phone className="w-3 h-3 text-gray-400" />
                                                                Customer Phone
                                                            </p>
                                                            <p>{booking.customerPhone || booking.customerId?.mobileNumber || '—'}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="flex items-center gap-1 font-medium text-gray-900">
                                                                <Clock className="w-3 h-3 text-gray-400" />
                                                                Time Slot
                                                            </p>
                                                            <p>{booking.timeSlot || '—'}</p>
                                                        </div>
                                                        {booking.visitLocation === 'HOME' && (
                                                            <div className="space-y-1">
                                                                <p className="flex items-center gap-1 font-medium text-gray-900">
                                                                    <DollarSign className="w-3 h-3 text-gray-400" />
                                                                    Home Charge
                                                                </p>
                                                                <p className="font-semibold text-amber-600">₹{booking.homeVisitCharge || 500}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        {booking.visitStatus === 'Scheduled' && (
                                                            <Button
                                                                className="flex-1 text-sm h-9"
                                                                variant="outline"
                                                                onClick={() => handlePhysicalVisitAction(booking._id, 'accept')}
                                                            >
                                                                Accept Visit
                                                            </Button>
                                                        )}
                                                        {booking.visitStatus === 'Accepted' && (
                                                            <Button
                                                                className="flex-1 text-sm h-9 bg-blue-600 hover:bg-blue-700"
                                                                onClick={() => handlePhysicalVisitAction(booking._id, 'start')}
                                                            >
                                                                <Navigation className="w-3 h-3 mr-2" />
                                                                Start Visit
                                                            </Button>
                                                        )}
                                                        {booking.visitStatus === 'InProgress' && (
                                                            <Button
                                                                className="flex-1 text-sm h-9 bg-green-600 hover:bg-green-700"
                                                                onClick={() => handlePhysicalVisitAction(booking._id, 'end')}
                                                            >
                                                                Complete & Bill
                                                            </Button>
                                                        )}
                                                        {booking.visitStatus === 'Completed' && (
                                                            <Button className="flex-1 text-sm h-9" variant="secondary" disabled>
                                                                Visit Completed
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            className="flex-shrink-0 text-sm h-9 px-3"
                                                            onClick={() => setSelectedBookingForDetails(booking)}
                                                        >
                                                            View
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* ── Sidebar (1 col) ───────────────────────────────────────── */}
                    <div className="space-y-6">

                        {activeTab === 'visual' ? (
                            /* ═══ VISUAL SIDEBAR: Session Settings ═══ */
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Session Settings</CardTitle>
                                    <CardDescription>Customize your session duration and pricing</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleUpdateSettings} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-500 uppercase">Base Session</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-gray-400">Duration (min)</span>
                                                    <input
                                                        type="number"
                                                        value={Math.floor(settings.baseDuration / 60)}
                                                        onChange={(e) => setSettings({ ...settings, baseDuration: Number(e.target.value) * 60 })}
                                                        className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-gray-400">Price (₹)</span>
                                                    <input
                                                        type="number"
                                                        value={settings.basePrice}
                                                        onChange={(e) => setSettings({ ...settings, basePrice: Number(e.target.value) })}
                                                        className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-500 uppercase">Extension</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-gray-400">Duration (min)</span>
                                                    <input
                                                        type="number"
                                                        value={Math.floor(settings.extensionDuration / 60)}
                                                        onChange={(e) => setSettings({ ...settings, extensionDuration: Number(e.target.value) * 60 })}
                                                        className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-gray-400">Price (₹)</span>
                                                    <input
                                                        type="number"
                                                        value={settings.extensionPrice}
                                                        onChange={(e) => setSettings({ ...settings, extensionPrice: Number(e.target.value) })}
                                                        className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <Button type="submit" className="w-full h-9 text-sm" disabled={isSavingSettings}>
                                            {isSavingSettings ? "Saving..." : "Save Session Settings"}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        ) : (
                            /* ═══ PHYSICAL SIDEBAR: Profile + Visit Info ═══ */
                            <>
                                {/* My Profile – editable by designer */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <User className="w-4 h-4 text-blue-500" />
                                            My Profile
                                        </CardTitle>
                                        <CardDescription>Update your contact details for physical visits</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> Mobile Number
                                                </label>
                                                <input
                                                    type="tel"
                                                    placeholder="e.g. 9876543210"
                                                    value={profileForm.mobileNumber}
                                                    onChange={(e) => setProfileForm({ ...profileForm, mobileNumber: e.target.value })}
                                                    className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> Address
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    placeholder="Enter your full address..."
                                                    value={profileForm.address}
                                                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" /> Hourly Rate (₹)
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="e.g. 500"
                                                    value={profileForm.hourlyRate}
                                                    onChange={(e) => setProfileForm({ ...profileForm, hourlyRate: Number(e.target.value) })}
                                                    className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" /> Home Visit Extra Charge (₹)
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="e.g. 500"
                                                    value={profileForm.homeVisitCharge}
                                                    onChange={(e) => setProfileForm({ ...profileForm, homeVisitCharge: Number(e.target.value) })}
                                                    className="w-full h-9 px-3 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                                    <FileText className="w-3 h-3" /> Visit Terms & Conditions
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    placeholder="Standard service terms apply."
                                                    value={profileForm.termsAndConditions}
                                                    onChange={(e) => setProfileForm({ ...profileForm, termsAndConditions: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                                />
                                            </div>

                                            <Button
                                                type="submit"
                                                className="w-full h-9 text-sm"
                                                disabled={isSavingProfile}
                                            >
                                                <Save className="w-3.5 h-3.5 mr-2" />
                                                {isSavingProfile ? 'Saving...' : 'Save Profile'}
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>

                                {/* Physical Visit Info */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Physical Visit Info</CardTitle>
                                        <CardDescription>Your physical visit configuration</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-medium text-gray-500 uppercase">Hourly Rate</p>
                                                <p className="text-xl font-bold text-gray-900">₹{profileForm.hourlyRate || (user as any)?.hourlyRate || 500}/hr</p>
                                            </div>
                                            <DollarSign className="w-8 h-8 text-green-500" />
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-medium text-gray-500 uppercase">Home Visit Charge</p>
                                                <p className="text-xl font-bold text-gray-900">₹{profileForm.homeVisitCharge || (user as any)?.homeVisitCharge || 500}</p>
                                            </div>
                                            <Home className="w-8 h-8 text-blue-500" />
                                        </div>
                                        <p className="text-[11px] text-gray-400 text-center">Update your rates in the profile section above</p>

                                        {/* <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-medium text-gray-500 uppercase">Total Hours Worked</p>
                                                <p className="text-xl font-bold text-gray-900">
                                                    {isLoadingPhysicalStats ? '...' : `${(physicalStats.totalDurationMinutes / 60).toFixed(1)}h`}
                                                </p>
                                            </div>
                                            <Clock className="w-8 h-8 text-indigo-500" />
                                        </div> */}
                                    </CardContent>
                                </Card>

                                {/* Office Hours */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Office Hours</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Monday - Saturday</span>
                                                <span className="font-medium">09:00 - 20:00</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Sunday</span>
                                                <span className="font-medium text-red-600">Closed</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {/* Shared: Quick Actions */}
                        {/* <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button variant="outline" className="w-full justify-start" size="sm">
                                    <FileText className="w-4 h-4 mr-2" />
                                    View Session History
                                </Button>
                                <Button variant="outline" className="w-full justify-start" size="sm">
                                    <ImageIcon className="w-4 h-4 mr-2" />
                                    Access Resource Library
                                </Button>
                                <Button variant="outline" className="w-full justify-start" size="sm">
                                    <Star className="w-4 h-4 mr-2" />
                                    View Ratings & Feedback
                                </Button>
                            </CardContent>
                        </Card> */}

                        {/* Shared: Pro Tip */}
                        {/* <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                            <CardHeader>
                                <CardTitle className="text-lg">💡 Pro Tip</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-700">
                                    {activeTab === 'visual'
                                        ? 'Premium clients are prioritized in the queue. Review their previous session notes before picking up to provide personalized service.'
                                        : 'Complete visits on time to maintain a high rating. Clients appreciate punctuality and clear communication about arrival times.'}
                                </p>
                            </CardContent>
                        </Card> */}
                    </div>
                </div>
            </div>

            {/* ── Booking Details Modal ─────────────────────────────────────────── */}
            {
                selectedBookingForDetails && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Booking Details</h3>
                                    <p className="text-sm text-gray-500">View complete information for this visit</p>
                                </div>
                                <button
                                    onClick={() => setSelectedBookingForDetails(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 space-y-8">
                                {/* Status Section */}
                                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Status</p>
                                        <Badge className="text-sm px-3 py-1">{selectedBookingForDetails.visitStatus}</Badge>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order ID</p>
                                        <p className="font-bold text-gray-900">#{selectedBookingForDetails.orderId?.orderNumber}</p>
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <User size={16} className="text-blue-500" /> Customer Information
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-gray-400">Name</p>
                                            <p className="font-medium text-gray-900">{selectedBookingForDetails.customerId?.name || "N/A"}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-gray-400">Mobile</p>
                                            <p className="font-medium text-gray-900 flex items-center gap-1">
                                                <Phone size={12} className="text-gray-400" />
                                                {selectedBookingForDetails.customerPhone || selectedBookingForDetails.customerId?.mobileNumber || "N/A"}
                                            </p>
                                        </div>
                                        <div className="space-y-0.5 md:col-span-2">
                                            <p className="text-xs text-gray-400">Email</p>
                                            <p className="font-medium text-gray-900 flex items-center gap-1">
                                                <Mail size={12} className="text-gray-400" />
                                                {selectedBookingForDetails.customerId?.email || "N/A"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Product Info */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <ImageIcon size={16} className="text-purple-500" /> Project Details
                                    </h4>
                                    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                                            <p className="font-bold text-gray-900">{selectedBookingForDetails.productSnapshot?.productName || "Custom Project"}</p>
                                        </div>
                                        <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-8">
                                            <div className="space-y-0.5">
                                                <p className="text-xs text-gray-400">Quantity</p>
                                                <p className="text-sm font-medium">{selectedBookingForDetails.productSnapshot?.quantity || 0}</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs text-gray-400">Printing Type</p>
                                                <p className="text-sm font-medium">{selectedBookingForDetails.productSnapshot?.printingType || "N/A"}</p>
                                            </div>
                                            {selectedBookingForDetails.productSnapshot?.foilType && (
                                                <div className="space-y-0.5">
                                                    <p className="text-xs text-gray-400">Foil Type</p>
                                                    <p className="text-sm font-medium">{selectedBookingForDetails.productSnapshot.foilType}</p>
                                                </div>
                                            )}
                                            {selectedBookingForDetails.productSnapshot?.spotUV && (
                                                <div className="space-y-0.5">
                                                    <p className="text-xs text-gray-400">Spot UV</p>
                                                    <p className="text-sm font-medium">Yes</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Visit Details */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <Calendar size={16} className="text-amber-500" /> Visit Information
                                    </h4>
                                    <div className="space-y-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                                        <div className="flex gap-4">
                                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg h-10 w-10 flex items-center justify-center shrink-0">
                                                <Calendar size={20} />
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs text-gray-400">Scheduled For</p>
                                                <p className="font-medium text-gray-900">{new Date(selectedBookingForDetails.visitDate).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg h-10 w-10 flex items-center justify-center shrink-0">
                                                <MapPin size={20} />
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs text-gray-400">Location / Address</p>
                                                <p className="font-medium text-gray-900">{selectedBookingForDetails.visitAddress || "N/A"}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="p-2 bg-green-50 text-green-600 rounded-lg h-10 w-10 flex items-center justify-center shrink-0">
                                                <Phone size={20} />
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs text-gray-400">Customer Phone</p>
                                                <p className="font-medium text-gray-900">{selectedBookingForDetails.customerPhone || selectedBookingForDetails.customerId?.mobileNumber || "N/A"}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg h-10 w-10 flex items-center justify-center shrink-0">
                                                <Clock size={20} />
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs text-gray-400">Time Slot</p>
                                                <p className="font-medium text-gray-900">{selectedBookingForDetails.timeSlot || "N/A"}</p>
                                            </div>
                                        </div>
                                        {selectedBookingForDetails.productSnapshot?.specialInstructions && (
                                            <div className="flex gap-4 pt-2 border-t border-gray-50">
                                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg h-10 w-10 flex items-center justify-center shrink-0">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-xs text-gray-400">Special Instructions</p>
                                                    <p className="text-sm text-gray-700 leading-relaxed">{selectedBookingForDetails.productSnapshot.specialInstructions}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Billing & Time */}
                                {(selectedBookingForDetails.visitStartTime || selectedBookingForDetails.visitStatus === 'Completed') && (
                                    <div className="space-y-3 pb-4">
                                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <Clock size={16} className="text-green-500" /> Timing & Billing
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Start Time</p>
                                                    <p className="text-xs font-medium">
                                                        {selectedBookingForDetails.visitStartTime ? new Date(selectedBookingForDetails.visitStartTime).toLocaleTimeString() : '--:--'}
                                                    </p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">End Time</p>
                                                    <p className="text-xs font-medium">
                                                        {selectedBookingForDetails.visitEndTime ? new Date(selectedBookingForDetails.visitEndTime).toLocaleTimeString() : '--:--'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-bold text-blue-400 uppercase">Duration</p>
                                                    <p className="text-sm font-bold text-blue-900">{selectedBookingForDetails.totalDurationMinutes || 0} mins</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-bold text-blue-400 uppercase">Total Amount</p>
                                                    <p className="text-sm font-bold text-blue-900">₹{selectedBookingForDetails.totalAmount || 0}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4">
                                <Button
                                    className="flex-1"
                                    variant="secondary"
                                    onClick={() => setSelectedBookingForDetails(null)}
                                >
                                    Close View
                                </Button>
                                {selectedBookingForDetails.visitStatus === 'Accepted' && (
                                    <Button
                                        className="flex-[2] bg-blue-600 hover:bg-blue-700"
                                        onClick={() => {
                                            handlePhysicalVisitAction(selectedBookingForDetails._id, 'start');
                                            setSelectedBookingForDetails(null);
                                        }}
                                    >
                                        Start Visit Now
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
