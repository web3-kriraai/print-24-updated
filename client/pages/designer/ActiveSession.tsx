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
    ArrowLeft
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [timeRemaining, setTimeRemaining] = useState(900); // 15 minutes
    const [isCameraEnabled, setIsCameraEnabled] = useState(true);
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const [notes, setNotes] = useState('');
    const [chatInput, setChatInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    const { isConnecting, isConnected, error } = useLiveKitMock();

    // Mock UI Data
    const sessionData = {
        clientName: 'Rahul Sharma',
        requestType: 'Logo Design',
    };

    const mockSavedNotes = [
        { authorName: 'Designer', timestamp: new Date().toISOString(), notes: 'Focused on brand values and color preferences.' }
    ];

    const mockChatMessages = [
        { senderName: 'Designer', message: 'Hi Rahul, I have your brief here.', timestamp: new Date().toISOString() },
        { senderName: 'Rahul Sharma', message: 'Hello! Excited to get started.', timestamp: new Date().toISOString() }
    ];

    const mockArtifacts = [
        { fileName: 'Logo_Mockup_v1.png', uploadedBy: 'Designer' }
    ];

    // Timer logic
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEndSession = () => {
        toast.success('Session ended successfully');
        navigate('/designer/dashboard');
    };

    const handleSaveNotes = () => {
        setIsSavingNotes(true);
        setTimeout(() => {
            toast.success('Notes saved');
            setIsSavingNotes(false);
            setNotes('');
        }, 800);
    };

    const handleSendMessage = () => {
        if (!chatInput) return;
        setChatInput('');
        toast.success('Message sent');
    };

    const handleFileUpload = () => {
        setIsUploading(true);
        setTimeout(() => {
            toast.success('File uploaded');
            setIsUploading(false);
        }, 1500);
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
            <Toaster position="top-right" />

            {/* Header */}
            <header className="bg-gray-900 border-b border-gray-800 px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h2 className="text-white font-bold text-lg">{sessionData.clientName}</h2>
                            <p className="text-xs text-gray-400">{sessionData.requestType}</p>
                        </div>
                        <Badge variant="outline" className="ml-2 font-mono text-[10px]">
                            {sessionId}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className={`font-mono text-xl font-bold ${timeRemaining <= 60 ? 'text-red-500 animate-pulse' : 'text-white'
                                }`}>
                                {formatTime(timeRemaining)}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Video Area */}
                <div className="flex-1 flex flex-col p-4 space-y-4">
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
                                        <span className="text-3xl font-black text-indigo-400">RS</span>
                                    </div>
                                    <p className="text-indigo-400 mt-4 font-medium">{sessionData.clientName}</p>
                                </div>
                            </div>
                        </div>
                    </div>

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
                                {mockSavedNotes.map((note, idx) => (
                                    <div key={idx} className="bg-gray-800/30 p-4 rounded-xl border border-gray-800/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                {new Date(note.timestamp).toLocaleTimeString()}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] py-0">{note.authorName}</Badge>
                                        </div>
                                        <p className="text-sm text-gray-300 leading-relaxed">{note.notes}</p>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="chat" className="flex flex-col h-[calc(100vh-200px)]">
                            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                                {mockChatMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex flex-col ${msg.senderName === 'Designer' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl ${msg.senderName === 'Designer'
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-gray-800 text-gray-200 rounded-tl-none'
                                            }`}>
                                            <p className="text-sm">{msg.message}</p>
                                        </div>
                                        <span className="text-[10px] text-gray-600 mt-1 px-1">
                                            {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
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
                                            <Upload className="w-6 h-6 text-gray-500 group-hover:text-blue-500" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-300">Click to upload assets</p>
                                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</p>
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
