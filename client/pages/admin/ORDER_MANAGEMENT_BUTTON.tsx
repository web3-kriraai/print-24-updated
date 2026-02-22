// Quick Navigation Component for Order Management
// Add this to your AdminDashboard.tsx

import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

// Add this button in your AdminDashboard navigation section:

<button
    onClick={() => window.location.href = '/admin/orders'}
    className="flex items-center gap-3 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
>
    <ShoppingBag size={20} />
    <span>Order Management</span>
</button>

/* 
INTEGRATION INSTRUCTIONS:

1. Find your AdminDashboard navigation section (usually at the top or sidebar)
2. Add the above button near your other admin navigation buttons
3. Or directly navigate to: http://localhost:5173/admin/orders

The route is now active and ready to use!
*/
