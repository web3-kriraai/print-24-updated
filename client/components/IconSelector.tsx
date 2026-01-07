import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronDown } from 'lucide-react';
import * as Icons from 'lucide-react';

interface IconOption {
    name: string;
    component: React.ComponentType<any>;
}

interface IconSelectorProps {
    value: string;
    onChange: (iconName: string) => void;
    placeholder?: string;
    disabled?: boolean;
    label?: string;
}

// Comprehensive list of available icons
const AVAILABLE_ICONS: IconOption[] = [
    { name: 'Gift', component: Icons.Gift },
    { name: 'Printer', component: Icons.Printer },
    { name: 'Palette', component: Icons.Palette },
    { name: 'Users', component: Icons.Users },
    { name: 'Package', component: Icons.Package },
    { name: 'FileText', component: Icons.FileText },
    { name: 'PenTool', component: Icons.PenTool },
    { name: 'BookOpen', component: Icons.BookOpen },
    { name: 'Settings', component: Icons.Settings },
    { name: 'MapPin', component: Icons.MapPin },
    { name: 'Monitor', component: Icons.Monitor },
    { name: 'Calculator', component: Icons.Calculator },
    { name: 'Heart', component: Icons.Heart },
    { name: 'Star', component: Icons.Star },
    { name: 'Zap', component: Icons.Zap },
    { name: 'Award', component: Icons.Award },
    { name: 'Briefcase', component: Icons.Briefcase },
    { name: 'Camera', component: Icons.Camera },
    { name: 'Coffee', component: Icons.Coffee },
    { name: 'Compass', component: Icons.Compass },
    { name: 'Cpu', component: Icons.Cpu },
    { name: 'Droplet', component: Icons.Droplet },
    { name: 'Edit', component: Icons.Edit },
    { name: 'Eye', component: Icons.Eye },
    { name: 'Feather', component: Icons.Feather },
    { name: 'Film', component: Icons.Film },
    { name: 'Flag', component: Icons.Flag },
    { name: 'Globe', component: Icons.Globe },
    { name: 'Headphones', component: Icons.Headphones },
    { name: 'Image', component: Icons.Image },
    { name: 'Layers', component: Icons.Layers },
    { name: 'Mail', component: Icons.Mail },
    { name: 'Music', component: Icons.Music },
    { name: 'Phone', component: Icons.Phone },
    { name: 'ShoppingCart', component: Icons.ShoppingCart },
    { name: 'Smartphone', component: Icons.Smartphone },
    { name: 'Speaker', component: Icons.Speaker },
    { name: 'Tag', component: Icons.Tag },
    { name: 'Target', component: Icons.Target },
    { name: 'Truck', component: Icons.Truck },
    { name: 'Umbrella', component: Icons.Umbrella },
    { name: 'Video', component: Icons.Video },
    { name: 'Wifi', component: Icons.Wifi },
    // Print & Design Related
    { name: 'PrinterCheck', component: Icons.Printer }, // Alias or specific? Lucide has Printer
    { name: 'FileSpreadsheet', component: Icons.FileSpreadsheet },
    { name: 'FileType', component: Icons.FileType },
    { name: 'FileDigit', component: Icons.FileDigit },
    { name: 'Scan', component: Icons.Scan },
    { name: 'ScanLine', component: Icons.ScanLine },
    { name: 'Copy', component: Icons.Copy },
    { name: 'Scissors', component: Icons.Scissors },
    { name: 'Ruler', component: Icons.Ruler },
    { name: 'Paintbrush', component: Icons.Paintbrush },
    { name: 'Stamp', component: Icons.Stamp },
    { name: 'StickyNote', component: Icons.StickyNote },
    { name: 'Sticker', component: Icons.Sticker },
    { name: 'Layout', component: Icons.Layout },
    { name: 'LayoutGrid', component: Icons.LayoutGrid },
    { name: 'Palette', component: Icons.Palette },
    { name: 'ImagePlus', component: Icons.ImagePlus },
    { name: 'Type', component: Icons.Type },
    { name: 'Component', component: Icons.Component },
    { name: 'Container', component: Icons.Container },
    { name: 'BoxSelect', component: Icons.BoxSelect },
    { name: 'Brush', component: Icons.Brush },
    { name: 'DraftingCompass', component: Icons.DraftingCompass },
    // Business & Marketing
    { name: 'BriefcaseBusiness', component: Icons.BriefcaseBusiness },
    { name: 'Building', component: Icons.Building },
    { name: 'Building2', component: Icons.Building2 },
    { name: 'Store', component: Icons.Store },
    { name: 'ShoppingBag', component: Icons.ShoppingBag },
    { name: 'ShoppingCart', component: Icons.ShoppingCart },
    { name: 'CreditCard', component: Icons.CreditCard },
    { name: 'Banknote', component: Icons.Banknote },
    { name: 'Receipt', component: Icons.Receipt },
    { name: 'Ticket', component: Icons.Ticket },
    { name: 'Tags', component: Icons.Tags },
    { name: 'Percent', component: Icons.Percent },
    { name: 'DollarSign', component: Icons.DollarSign },
    { name: 'Euro', component: Icons.Euro },
    { name: 'PoundSterling', component: Icons.PoundSterling },
    { name: 'PieChart', component: Icons.PieChart },
    { name: 'BarChart', component: Icons.BarChart },
    { name: 'BarChart2', component: Icons.BarChart2 },
    { name: 'LineChart', component: Icons.LineChart },
    { name: 'TrendingUp', component: Icons.TrendingUp },
    { name: 'TrendingDown', component: Icons.TrendingDown },
    { name: 'Activity', component: Icons.Activity },
    { name: 'Target', component: Icons.Target },
    { name: 'Goal', component: Icons.Goal },
    { name: 'Award', component: Icons.Award },
    { name: 'Medal', component: Icons.Medal },
    { name: 'Crown', component: Icons.Crown },
    { name: 'Trophy', component: Icons.Trophy },
    { name: 'Gift', component: Icons.Gift },
    { name: 'PartyPopper', component: Icons.PartyPopper },
    { name: 'Heart', component: Icons.Heart },
    { name: 'HeartHandshake', component: Icons.HeartHandshake },
    { name: 'ThumbsUp', component: Icons.ThumbsUp },
    { name: 'Star', component: Icons.Star },
    { name: 'Sparkles', component: Icons.Sparkles },
    { name: 'Zap', component: Icons.Zap },
    { name: 'Lightbulb', component: Icons.Lightbulb },
    { name: 'Flag', component: Icons.Flag },
    { name: 'Bookmark', component: Icons.Bookmark },
    { name: 'Pin', component: Icons.Pin },
    { name: 'Paperclip', component: Icons.Paperclip },
    { name: 'Link', component: Icons.Link },
    { name: 'Share', component: Icons.Share },
    { name: 'Share2', component: Icons.Share2 },
    { name: 'Send', component: Icons.Send },
    { name: 'MessageCircle', component: Icons.MessageCircle },
    { name: 'MessageSquare', component: Icons.MessageSquare },
    { name: 'Mail', component: Icons.Mail },
    { name: 'Phone', component: Icons.Phone },
    { name: 'PhoneCall', component: Icons.PhoneCall },
    { name: 'Smartphone', component: Icons.Smartphone },
    { name: 'Monitor', component: Icons.Monitor },
    { name: 'Laptop', component: Icons.Laptop },
    { name: 'Tablet', component: Icons.Tablet },
    { name: 'Printer', component: Icons.Printer },
    { name: 'Camera', component: Icons.Camera },
    { name: 'Video', component: Icons.Video },
    { name: 'Mic', component: Icons.Mic },
    { name: 'Speaker', component: Icons.Speaker },
    { name: 'Headphones', component: Icons.Headphones },
    { name: 'Music', component: Icons.Music },
    { name: 'Film', component: Icons.Film },
    { name: 'Image', component: Icons.Image },
    { name: 'Map', component: Icons.Map },
    { name: 'MapPin', component: Icons.MapPin },
    { name: 'Navigation', component: Icons.Navigation },
    { name: 'Compass', component: Icons.Compass },
    { name: 'Globe', component: Icons.Globe },
    { name: 'Sun', component: Icons.Sun },
    { name: 'Moon', component: Icons.Moon },
    { name: 'Cloud', component: Icons.Cloud },
    { name: 'Umbrella', component: Icons.Umbrella },
    { name: 'Clock', component: Icons.Clock },
    { name: 'Calendar', component: Icons.Calendar },
    { name: 'Watch', component: Icons.Watch },
    { name: 'Timer', component: Icons.Timer },
    { name: 'AlarmClock', component: Icons.AlarmClock },
    { name: 'Bell', component: Icons.Bell },
    { name: 'Settings', component: Icons.Settings },
    { name: 'Sliders', component: Icons.Sliders },
    { name: 'Wrench', component: Icons.Wrench },
    { name: 'Hammer', component: Icons.Hammer },
    { name: 'Truck', component: Icons.Truck },
    { name: 'Package', component: Icons.Package },
    { name: 'Box', component: Icons.Box },
    { name: 'Container', component: Icons.Container },
    { name: 'Archive', component: Icons.Archive },
    { name: 'Trash', component: Icons.Trash },
    { name: 'Trash2', component: Icons.Trash2 },
    { name: 'Lock', component: Icons.Lock },
    { name: 'Unlock', component: Icons.Unlock },
    { name: 'Shield', component: Icons.Shield },
    { name: 'ShieldCheck', component: Icons.ShieldCheck },
    { name: 'Key', component: Icons.Key },
    { name: 'User', component: Icons.User },
    { name: 'Users', component: Icons.Users },
    { name: 'UserPlus', component: Icons.UserPlus },
    { name: 'UserCheck', component: Icons.UserCheck },
    { name: 'Smile', component: Icons.Smile },
    { name: 'Frown', component: Icons.Frown },
    { name: 'Meh', component: Icons.Meh },
    { name: 'HelpCircle', component: Icons.HelpCircle },
    { name: 'Info', component: Icons.Info },
    { name: 'AlertCircle', component: Icons.AlertCircle },
    { name: 'AlertTriangle', component: Icons.AlertTriangle },
    { name: 'Check', component: Icons.Check },
    { name: 'CheckCircle', component: Icons.CheckCircle },
    { name: 'CheckSquare', component: Icons.CheckSquare },
    { name: 'X', component: Icons.X },
    { name: 'XCircle', component: Icons.XCircle },
    { name: 'XSquare', component: Icons.XSquare },
    { name: 'Plus', component: Icons.Plus },
    { name: 'PlusCircle', component: Icons.PlusCircle },
    { name: 'PlusSquare', component: Icons.PlusSquare },
    { name: 'Minus', component: Icons.Minus },
    { name: 'MinusCircle', component: Icons.MinusCircle },
    { name: 'MinusSquare', component: Icons.MinusSquare },
    { name: 'ArrowRight', component: Icons.ArrowRight },
    { name: 'ArrowLeft', component: Icons.ArrowLeft },
    { name: 'ArrowUp', component: Icons.ArrowUp },
    { name: 'ArrowDown', component: Icons.ArrowDown },
    { name: 'ChevronRight', component: Icons.ChevronRight },
    { name: 'ChevronLeft', component: Icons.ChevronLeft },
    { name: 'ChevronUp', component: Icons.ChevronUp },
    { name: 'ChevronDown', component: Icons.ChevronDown },
    { name: 'MoreHorizontal', component: Icons.MoreHorizontal },
    { name: 'MoreVertical', component: Icons.MoreVertical },
    { name: 'Grid', component: Icons.Grid },
    { name: 'List', component: Icons.List },
    { name: 'Menu', component: Icons.Menu },
    { name: 'Search', component: Icons.Search },
    { name: 'File', component: Icons.File },
    { name: 'FileText', component: Icons.FileText },
    { name: 'Folder', component: Icons.Folder },
    { name: 'FolderPlus', component: Icons.FolderPlus },
    { name: 'FolderOpen', component: Icons.FolderOpen },
    // Additional 100+ Icons
    { name: 'Wifi', component: Icons.Wifi },
    { name: 'WifiOff', component: Icons.WifiOff },
    { name: 'Bluetooth', component: Icons.Bluetooth },
    { name: 'Cast', component: Icons.Cast },
    { name: 'Radio', component: Icons.Radio },
    { name: 'Tv', component: Icons.Tv },
    { name: 'Podcast', component: Icons.Podcast },
    { name: 'Voicemail', component: Icons.Voicemail },
    { name: 'Rss', component: Icons.Rss },
    { name: 'Wifi', component: Icons.Wifi },
    { name: 'Database', component: Icons.Database },
    { name: 'Server', component: Icons.Server },
    { name: 'HardDrive', component: Icons.HardDrive },
    { name: 'Cpu', component: Icons.Cpu },
    { name: 'MemoryStick', component: Icons.MemoryStick },
    { name: 'Usb', component: Icons.Usb },
    { name: 'Power', component: Icons.Power },
    { name: 'PowerOff', component: Icons.PowerOff },
    { name: 'Battery', component: Icons.Battery },
    { name: 'BatteryCharging', component: Icons.BatteryCharging },
    { name: 'Plug', component: Icons.Plug },
    { name: 'Zap', component: Icons.Zap },
    { name: 'Download', component: Icons.Download },
    { name: 'Upload', component: Icons.Upload },
    { name: 'CloudDownload', component: Icons.CloudDownload },
    { name: 'CloudUpload', component: Icons.CloudUpload },
    { name: 'Inbox', component: Icons.Inbox },
    { name: 'Outbox', component: Icons.Send },
    { name: 'RefreshCw', component: Icons.RefreshCw },
    { name: 'RotateCw', component: Icons.RotateCw },
    { name: 'RotateCcw', component: Icons.RotateCcw },
    { name: 'Repeat', component: Icons.Repeat },
    { name: 'Shuffle', component: Icons.Shuffle },
    { name: 'Play', component: Icons.Play },
    { name: 'Pause', component: Icons.Pause },
    { name: 'Stop', component: Icons.Square },
    { name: 'SkipForward', component: Icons.SkipForward },
    { name: 'SkipBack', component: Icons.SkipBack },
    { name: 'FastForward', component: Icons.FastForward },
    { name: 'Rewind', component: Icons.Rewind },
    { name: 'Volume', component: Icons.Volume2 },
    { name: 'Volume1', component: Icons.Volume1 },
    { name: 'VolumeX', component: Icons.VolumeX },
    { name: 'Maximize', component: Icons.Maximize },
    { name: 'Minimize', component: Icons.Minimize },
    { name: 'Maximize2', component: Icons.Maximize2 },
    { name: 'Minimize2', component: Icons.Minimize2 },
    { name: 'ZoomIn', component: Icons.ZoomIn },
    { name: 'ZoomOut', component: Icons.ZoomOut },
    { name: 'Eye', component: Icons.Eye },
    { name: 'EyeOff', component: Icons.EyeOff },
    { name: 'Filter', component: Icons.Filter },
    { name: 'Layers', component: Icons.Layers },
    { name: 'Layout', component: Icons.Layout },
    { name: 'Sidebar', component: Icons.PanelLeft },
    { name: 'Columns', component: Icons.Columns },
    { name: 'Rows', component: Icons.Rows },
    { name: 'AlignLeft', component: Icons.AlignLeft },
    { name: 'AlignCenter', component: Icons.AlignCenter },
    { name: 'AlignRight', component: Icons.AlignRight },
    { name: 'AlignJustify', component: Icons.AlignJustify },
    { name: 'Bold', component: Icons.Bold },
    { name: 'Italic', component: Icons.Italic },
    { name: 'Underline', component: Icons.Underline },
    { name: 'Type', component: Icons.Type },
    { name: 'Code', component: Icons.Code },
    { name: 'Code2', component: Icons.Code2 },
    { name: 'Terminal', component: Icons.Terminal },
    { name: 'Command', component: Icons.Command },
    { name: 'Hash', component: Icons.Hash },
    { name: 'AtSign', component: Icons.AtSign },
    { name: 'Anchor', component: Icons.Anchor },
    { name: 'Feather', component: Icons.Feather },
    { name: 'Droplet', component: Icons.Droplet },
    { name: 'Droplets', component: Icons.Droplets },
    { name: 'Flame', component: Icons.Flame },
    { name: 'Wind', component: Icons.Wind },
    { name: 'Snowflake', component: Icons.Snowflake },
    { name: 'CloudRain', component: Icons.CloudRain },
    { name: 'CloudSnow', component: Icons.CloudSnow },
    { name: 'CloudLightning', component: Icons.CloudLightning },
    { name: 'Sunrise', component: Icons.Sunrise },
    { name: 'Sunset', component: Icons.Sunset },
    { name: 'Thermometer', component: Icons.Thermometer },
    { name: 'Gauge', component: Icons.Gauge },
    { name: 'Activity', component: Icons.Activity },
    { name: 'Crosshair', component: Icons.Crosshair },
    { name: 'Aperture', component: Icons.Aperture },
    { name: 'Focus', component: Icons.Focus },
    { name: 'Scan', component: Icons.Scan },
    { name: 'ScanLine', component: Icons.ScanLine },
    { name: 'Fingerprint', component: Icons.Fingerprint },
    { name: 'QrCode', component: Icons.QrCode },
    { name: 'Barcode', component: Icons.Barcode },
    { name: 'ScanBarcode', component: Icons.ScanBarcode },
    { name: 'Wallet', component: Icons.Wallet },
    { name: 'Coins', component: Icons.Coins },
    { name: 'BadgeDollarSign', component: Icons.BadgeDollarSign },
];

const IconSelector: React.FC<IconSelectorProps> = ({
    value,
    onChange,
    placeholder = 'Select an icon',
    disabled = false,
    label
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [displayCount, setDisplayCount] = useState(20); // Initial display count
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Filter icons based on search query
    const filteredIcons = AVAILABLE_ICONS.filter(icon =>
        icon.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Icons to display (limited by displayCount)
    const displayedIcons = filteredIcons.slice(0, displayCount);
    const hasMore = displayCount < filteredIcons.length;

    // Get selected icon component
    const selectedIcon = AVAILABLE_ICONS.find(icon => icon.name === value);
    const SelectedIconComponent = selectedIcon?.component;

    // Reset display count when search changes
    useEffect(() => {
        setDisplayCount(20);
    }, [searchQuery]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
                setDisplayCount(20);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle scroll for infinite loading
    useEffect(() => {
        const handleScroll = () => {
            if (!scrollRef.current || !hasMore || isLoadingMore) return;

            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            if (scrollHeight - scrollTop - clientHeight < 100) {
                loadMoreIcons();
            }
        };

        const scrollElement = scrollRef.current;
        if (scrollElement) {
            scrollElement.addEventListener('scroll', handleScroll);
            return () => scrollElement.removeEventListener('scroll', handleScroll);
        }
    }, [hasMore, isLoadingMore, displayCount]);

    const loadMoreIcons = () => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        // Simulate loading delay for smooth UX
        setTimeout(() => {
            setDisplayCount(prev => Math.min(prev + 20, filteredIcons.length));
            setIsLoadingMore(false);
        }, 200);
    };

    const handleSelect = (iconName: string) => {
        onChange(iconName);
        setIsOpen(false);
        setSearchQuery('');
        setDisplayCount(20);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    {SelectedIconComponent ? (
                        <>
                            <SelectedIconComponent size={20} className="text-gray-600" />
                            <span className="text-gray-900">{value}</span>
                        </>
                    ) : (
                        <span className="text-gray-500">{placeholder}</span>
                    )}
                </div>
                <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-hidden"
                    >
                        {/* Search Input */}
                        <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search icons..."
                                    className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Icon Grid */}
                        <div className="overflow-y-auto max-h-80 p-2" ref={scrollRef}>
                            {filteredIcons.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-4 gap-1">
                                        {displayedIcons.map((icon) => {
                                            const IconComponent = icon.component;
                                            const isSelected = value === icon.name;

                                            return (
                                                <button
                                                    key={icon.name}
                                                    type="button"
                                                    onClick={() => handleSelect(icon.name)}
                                                    className={`flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-50'
                                                        }`}
                                                    title={icon.name}
                                                >
                                                    <IconComponent
                                                        size={24}
                                                        className={isSelected ? 'text-blue-600' : 'text-gray-600'}
                                                    />
                                                    <span className={`text-xs truncate w-full text-center ${isSelected ? 'text-blue-600 font-medium' : 'text-gray-600'
                                                        }`}>
                                                        {icon.name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Loading indicator */}
                                    {isLoadingMore && (
                                        <div className="flex justify-center items-center py-4">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                                        </div>
                                    )}

                                    {/* Load more button */}
                                    {hasMore && !isLoadingMore && (
                                        <div className="text-center py-2">
                                            <button
                                                type="button"
                                                onClick={loadMoreIcons}
                                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                                Load More Icons ({filteredIcons.length - displayCount} remaining)
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Search size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No icons found</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center">
                            Showing {displayedIcons.length} of {filteredIcons.length} icon{filteredIcons.length !== 1 ? 's' : ''}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default IconSelector;
