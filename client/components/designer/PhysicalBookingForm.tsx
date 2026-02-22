import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, X, Loader2, MapPin, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSocketId, joinSlotRoom, onSessionEvent, offSessionEvent } from '../../lib/socketClient';

// IST Time Helpers
const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const getISTTime = (input?: string | number | Date) => {
    const date = input ? new Date(input) : new Date();
    return new Date(date.getTime() + IST_OFFSET);
};

const formatISTDate = (input?: string | number | Date) => {
    const istDate = getISTTime(input);
    const year = istDate.getUTCFullYear();
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface PhysicalBookingFormProps {
    orderId?: string;
    designerId?: string;
    onSuccess: () => void;
    onCancel: () => void;
    onSubmitData?: (data: {
        visitDate: string;
        timeSlot: string;
        visitLocation: 'HOME' | 'OFFICE';
        visitAddress: string;
        reason: string;
        designerId?: string;
    }) => void;
}

const PhysicalBookingForm: React.FC<PhysicalBookingFormProps> = ({ orderId, designerId: initialDesignerId, onSuccess, onCancel, onSubmitData }) => {
    const [visitDate, setVisitDate] = useState('');
    const [visitTime, setVisitTime] = useState('');
    const [visitLocation, setVisitLocation] = useState<'HOME' | 'OFFICE'>('OFFICE');
    const [visitAddress, setVisitAddress] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [designerId, setDesignerId] = useState<string | null>(initialDesignerId || null);
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    // Fetch designerId if not provided but orderId is present
    React.useEffect(() => {
        if (!designerId && orderId) {
            const fetchOrderDesigner = async () => {
                try {
                    const res = await fetch(`/api/orders/${orderId}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.designerId) setDesignerId(data.designerId._id || data.designerId);
                        else if (data.product?.designerId) setDesignerId(data.product.designerId);
                    }
                } catch (err) {
                    console.error("Failed to fetch order designer:", err);
                }
            };
            fetchOrderDesigner();
        }
    }, [orderId, designerId]);

    // Fetch slots when date or designer changes
    React.useEffect(() => {
        if (designerId && visitDate) {
            const fetchSlots = async () => {
                setIsLoadingSlots(true);
                try {
                    const res = await fetch(`/api/physical/${designerId}/slots?date=${visitDate}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setAvailableSlots(data.slots || []);
                    }
                } catch (err) {
                    console.error("Failed to fetch slots:", err);
                } finally {
                    setIsLoadingSlots(false);
                }
            };
            fetchSlots();
            setVisitTime(''); // Reset selected time when date changes
        }
    }, [designerId, visitDate]);

    // Real-time Slot Updates
    useEffect(() => {
        if (designerId && visitDate) {
            // Join the room
            joinSlotRoom(designerId, visitDate);

            // Listen for slotBooked events
            const handleSlotBooked = (data: { designerId: string; visitDate: string; timeSlot: string; socketId?: string }) => {
                console.log('[Socket] Received slotBooked in PhysicalBookingForm:', data);

                const myId = getSocketId();
                if (data.socketId && myId && data.socketId === myId) return;

                if (data.designerId === designerId && data.visitDate === visitDate) {
                    setAvailableSlots(prev => prev.map(slot =>
                        slot.time === data.timeSlot ? { ...slot, isBooked: true } : slot
                    ));

                    if (visitTime === data.timeSlot) {
                        setVisitTime('');
                        toast.error("The slot you selected was just booked by someone else.", { id: 'modal-slot-conflict' });
                    }
                }
            };

            onSessionEvent('slotBooked', handleSlotBooked);
            return () => offSessionEvent('slotBooked', handleSlotBooked);
        }
    }, [designerId, visitDate, visitTime]);

    // Real-time "isPast" update timer (Runs every minute)
    useEffect(() => {
        if (availableSlots.length === 0 || !visitDate) return;

        const updateIsPast = () => {
            const todayStr = formatISTDate();
            const isToday = visitDate === todayStr;
            const isPastDate = visitDate < todayStr;
            const currentIST = getISTTime();
            const currentHourMin = `${String(currentIST.getUTCHours()).padStart(2, '0')}:${String(currentIST.getUTCMinutes()).padStart(2, '0')}`;

            setAvailableSlots(prev => prev.map(slot => ({
                ...slot,
                isPast: isPastDate || (isToday && slot.start < currentHourMin)
            })));
        };

        updateIsPast();
        const interval = setInterval(updateIsPast, 60000);
        return () => clearInterval(interval);
    }, [visitDate, availableSlots.length]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!visitDate || (visitLocation === 'OFFICE' && !visitTime) || !reason) {
            toast.error('Please fill all required fields');
            return;
        }

        if (visitLocation === 'HOME' && !visitAddress.trim()) {
            toast.error('Please provide a visit address');
            return;
        }

        setIsSubmitting(true);
        try {
            const bookingData = {
                visitDate,
                timeSlot: visitTime,
                visitLocation,
                visitAddress: visitLocation === 'OFFICE' ? 'At Prints24 Office' : visitAddress,
                reason,
                designerId: designerId || undefined
            };

            if (!orderId) {
                // Pre-order mode: Just return the data
                if (onSubmitData) {
                    onSubmitData(bookingData);
                    onSuccess();
                }
                return;
            }

            const response = await fetch(`/api/designer-orders/${orderId}/physical-booking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(bookingData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to book designer visit');
            }

            toast.success('Physical designer visit booked successfully!');
            onSuccess();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-2xl w-full mx-auto"
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <MapPin size={24} className="text-purple-600" />
                    Book Physical Designer Visit
                </h3>
                <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Date Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar size={16} className="text-purple-500" /> Preferred Date
                        </label>
                        <input
                            type="date"
                            value={visitDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setVisitDate(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all shadow-sm"
                        />
                    </div>

                    {/* Visit Location */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <MapPin size={16} className="text-purple-500" /> Meeting Location
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setVisitLocation('OFFICE')}
                                className={`py-2.5 rounded-xl text-sm font-semibold transition-all border ${visitLocation === 'OFFICE'
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                                    }`}
                            >
                                Prints24 Office
                            </button>
                            <button
                                type="button"
                                onClick={() => setVisitLocation('HOME')}
                                className={`py-2.5 rounded-xl text-sm font-semibold transition-all border ${visitLocation === 'HOME'
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                                    }`}
                            >
                                Your Location
                            </button>
                        </div>
                    </div>
                </div>

                {/* Home Address Input */}
                {visitLocation === 'HOME' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                    >
                        <label className="block text-sm font-bold text-gray-700">Detailed Visit Address</label>
                        <textarea
                            value={visitAddress}
                            onChange={(e) => setVisitAddress(e.target.value)}
                            placeholder="Enter your full address for the designer visit..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none shadow-sm"
                            rows={3}
                        />
                    </motion.div>
                )}

                {/* Time Slot Selection (Only for Office Visits or as preference) */}
                <div className="space-y-3">
                    <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Clock size={16} className="text-purple-500" />
                        {visitLocation === 'OFFICE' ? 'Available Slots at Office' : 'Preferred Time (Optional)'}
                    </label>

                    {!visitDate ? (
                        <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center text-gray-500 text-sm">
                            Please select a date first to see available slots
                        </div>
                    ) : isLoadingSlots ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                            <span className="ml-2 text-gray-500 text-sm">Fetching available slots...</span>
                        </div>
                    ) : availableSlots.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {availableSlots.map((slot) => (
                                <button
                                    key={slot.time}
                                    type="button"
                                    disabled={slot.isBooked || slot.isPast}
                                    onClick={() => setVisitTime(slot.time)}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all border ${visitTime === slot.time
                                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                        : slot.isBooked || slot.isPast
                                            ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed'
                                            : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                                        }`}
                                >
                                    {slot.time}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-center text-red-600 text-sm">
                            No slots available for this date. Please try another date.
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Instructions / Reason for Visit</label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full h-24 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none shadow-sm"
                        placeholder="e.g. Need on-site measurement, color matching with existing decor, etc."
                    />
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 items-start">
                    <Info size={18} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                        Our designer will call you to confirm the visit. Note that home visits may incur additional travel charges depending on your location. {visitLocation === 'OFFICE' && "Please arrive at the office 5-10 minutes early."}
                    </p>
                </div>

                <div className="pt-2 flex gap-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                    >
                        Go Back
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || (visitLocation === 'OFFICE' && !visitTime)}
                        className="flex-[2] px-4 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            'Confirm Booking'
                        )}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default PhysicalBookingForm;
