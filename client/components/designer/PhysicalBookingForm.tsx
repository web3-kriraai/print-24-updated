import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, X, Loader2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

interface PhysicalBookingFormProps {
  orderId?: string;
  onSuccess: () => void;
  onCancel: () => void;
  onSubmitData?: (data: { visitDate: string; reason: string }) => void;
}

const PhysicalBookingForm: React.FC<PhysicalBookingFormProps> = ({ orderId, onSuccess, onCancel, onSubmitData }) => {
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitDate || !visitTime || !reason) {
      toast.error('All fields are required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!orderId) {
        // Pre-order mode: Just return the data
        if (onSubmitData) {
          onSubmitData({
            visitDate: `${visitDate}T${visitTime}`,
            reason
          });
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
        body: JSON.stringify({
          visitDate: `${visitDate}T${visitTime}`,
          reason
        }),
      });

      if (!response.ok) throw new Error('Failed to book designer visit');

      toast.success('Physical designer visit booked successfully!');
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <MapPin size={20} className="text-purple-600" />
          Book Physical Designer Visit
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <Calendar size={14} /> Preferred Date
            </label>
            <input
              type="date"
              value={visitDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <Clock size={14} /> Preferred Time
            </label>
            <input
              type="time"
              value={visitTime}
              onChange={(e) => setVisitTime(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for Visit</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full h-32 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none"
            placeholder="e.g., Color matching needed on-site, brand workshop, etc."
          />
        </div>

        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
          <p className="text-xs text-purple-800 leading-relaxed font-medium">
            Note: Our designer will call you to confirm the visit. Physical visits may incur additional travel charges depending on your location.
          </p>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-black transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              'Book Visit'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default PhysicalBookingForm;
