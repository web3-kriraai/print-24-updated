import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    Clock,
    Phone,
    User,
    FileText,
    Image as ImageIcon,
    Star,
    TrendingUp,
} from 'lucide-react';
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

const Switch = ({ checked, onCheckedChange }: { checked: boolean, onCheckedChange: (val: boolean) => void }) => (
    <button
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`${checked ? 'bg-green-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2`}
    >
        <span
            className={`${checked ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
        />
    </button>
);

const Avatar = ({ children, className = "" }: any) => (
    <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`}>
        {children}
    </div>
);

const AvatarFallback = ({ children, className = "" }: any) => (
    <div className={`flex h-full w-full items-center justify-center rounded-full bg-muted ${className}`}>
        {children}
    </div>
);

// Mock queue data
const mockQueue = [
    {
        id: 'session-1',
        clientName: 'Rahul Sharma',
        waitTime: '2 mins',
        requestType: 'Logo Design',
        isPremium: true,
        previousSessions: 3,
        lastNote: 'Prefers minimalist design, blue color palette'
    },
    {
        id: 'session-2',
        clientName: 'Priya Patel',
        waitTime: '5 mins',
        requestType: 'Business Card',
        isPremium: false,
        previousSessions: 1,
        lastNote: 'First-time client, needs guidance on brand identity'
    },
    {
        id: 'session-3',
        clientName: 'Amit Kumar',
        waitTime: '8 mins',
        requestType: 'Flyer Design',
        isPremium: false,
        previousSessions: 0,
        lastNote: null
    },
];

// Mock designer stats
const designerStats = {
    sessionsToday: 5,
    totalDuration: '3h 45m',
    avgRating: 4.8,
    completedThisWeek: 23
};

export default function DesignerDashboard() {
    const [isAvailable, setIsAvailable] = useState(true);
    const [queue] = useState(mockQueue);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");

        if (!token || !user) {
            navigate("/login");
            return;
        }

        try {
            const userData = JSON.parse(user);
            if (userData.role !== 'designer') {
                toast.error("Unauthorized access");
                navigate("/");
            }
        } catch (e) {
            navigate("/login");
        }
    }, [navigate]);

    const handlePickUp = (sessionId: string, clientName: string) => {
        toast.success(`Connected with ${clientName}!`);
        // Simulated transition to session
        setTimeout(() => {
            navigate(`/session/${sessionId}`);
        }, 500);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Toaster position="top-right" />
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
                                    onCheckedChange={setIsAvailable}
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
                    {/* Main Queue Section */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">Today</p>
                                            <p className="text-2xl font-bold">{designerStats.sessionsToday}</p>
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
                                            <p className="text-2xl font-bold">{designerStats.totalDuration}</p>
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
                                            <p className="text-2xl font-bold">{designerStats.avgRating}</p>
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
                                            <p className="text-2xl font-bold">{designerStats.completedThisWeek}</p>
                                        </div>
                                        <TrendingUp className="w-8 h-8 text-green-500" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Live Queue */}
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
                                    {queue.length === 0 ? (
                                        <div className="text-center py-12">
                                            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500">No clients in queue</p>
                                            <p className="text-sm text-gray-400">New requests will appear here</p>
                                        </div>
                                    ) : (
                                        queue.map((client) => (
                                            <div
                                                key={client.id}
                                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                                                                {getInitials(client.clientName)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-semibold text-gray-900">{client.clientName}</p>
                                                                {client.isPremium && (
                                                                    <Badge variant="default" className="text-[10px] py-0">Premium</Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-500">{client.requestType}</p>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <Badge variant="outline" className="gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {client.waitTime}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {client.previousSessions > 0 && (
                                                    <div className="bg-blue-50 rounded-md p-3 mb-3">
                                                        <div className="flex items-start gap-2">
                                                            <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                                                            <div className="flex-1">
                                                                <p className="text-xs font-medium text-blue-900 mb-1">
                                                                    {client.previousSessions} previous session{client.previousSessions > 1 ? 's' : ''}
                                                                </p>
                                                                {client.lastNote && (
                                                                    <p className="text-xs text-blue-700">{client.lastNote}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <Button
                                                    className="w-full"
                                                    onClick={() => handlePickUp(client.id, client.clientName)}
                                                    disabled={!isAvailable}
                                                >
                                                    <Phone className="w-4 h-4 mr-2" />
                                                    Pick Up Client
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <Card>
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
                        </Card>

                        {/* Office Hours */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Office Hours</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Monday - Friday</span>
                                        <span className="font-medium">10:00 - 19:00</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Saturday</span>
                                        <span className="font-medium">10:00 - 15:00</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Sunday</span>
                                        <span className="font-medium text-red-600">Closed</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tips */}
                        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                            <CardHeader>
                                <CardTitle className="text-lg">💡 Pro Tip</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-700">
                                    Premium clients are prioritized in the queue. Review their previous session notes before picking up to provide personalized service.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
