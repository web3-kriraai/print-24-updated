/**
 * COMPLAINT MANAGEMENT SYSTEM - OrderDetails Enhancement
 * Created: 2026-02-04
 * 
 * Add this code to your OrderDetails.tsx file to enable complaint registration
 * Add the import and the button component where appropriate
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

import { API_BASE_URL_WITH_API } from '../lib/apiConfig';

const API_BASE_URL = API_BASE_URL_WITH_API;

interface ComplaintButtonProps {
    orderId: string;
    orderStatus: string;
}

export const ComplaintButton: React.FC<ComplaintButtonProps> = ({ orderId, orderStatus }) => {
    const navigate = useNavigate();

    const [checking, setChecking] = React.useState(false);

    const handleComplaintClick = async () => {
        setChecking(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/complaints/check-eligibility/${orderId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const data = await response.json();

            if (data.existingComplaint) {
                // Redirect to existing complaint
                navigate(`/complaints/${data.complaintId}`);
            } else if (data.eligible) {
                // Go to registration form
                navigate(`/complaints/register/${orderId}`);
            } else {
                // Show error message
                alert(data.message || 'Cannot register complaint at this time');
            }
        } catch (error) {
            console.error('Error checking complaint eligibility:', error);
            alert('Failed to check complaint eligibility');
        } finally {
            setChecking(false);
        }
    };

    // Show button for status: DELIVERED, or other relevant statuses
    // if (!['DELIVERED', 'IN_PRODUCTION', 'APPROVED'].includes(orderStatus)) {
    //     return null;
    // }

    return (
        <button
            onClick={handleComplaintClick}
            disabled={checking}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
            <AlertCircle className="w-5 h-5" />
            {checking ? 'Checking...' : 'Register Complaint'}
        </button>
    );
};

export default ComplaintButton;
