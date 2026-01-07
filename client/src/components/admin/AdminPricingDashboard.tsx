import React, { useState } from 'react';
import SmartViewMatrix from './SmartViewMatrix';
import ConflictDetectionModal from './ConflictDetectionModal';
import ModifierRuleBuilder from './ModifierRuleBuilder';

/**
 * Admin Pricing Dashboard
 * 
 * Main page integrating all virtual pricing components:
 * - SmartViewMatrix: Manage price books
 * - ConflictDetectionModal: Resolve pricing conflicts
 * - ModifierRuleBuilder: Create combination modifiers
 */

const AdminPricingDashboard = () => {
  const [activeTab, setActiveTab] = useState('matrix');
  const [conflict, setConflict] = useState(null);

  // Handle price change from SmartViewMatrix
  const handlePriceChange = async (zoneId, segmentId, productId, newPrice) => {
    try {
      // Detect conflicts
      const response = await fetch('/api/admin/pricing/detect-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId, segmentId, productId, newPrice })
      });

      const data = await response.json();
      
      if (data.success && data.data.hasConflicts) {
        // Show conflict modal
        setConflict({
          ...data.data,
          zoneId,
          segmentId,
          productId,
          newPrice
        });
      } else {
        // No conflicts, apply price directly
        await applyPrice(zoneId, segmentId, productId, newPrice);
      }
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      alert('Failed to check for conflicts');
    }
  };

  // Apply price without conflicts
  const applyPrice = async (zoneId, segmentId, productId, newPrice) => {
    try {
      // TODO: Implement direct price update API
      console.log('Applying price:', { zoneId, segmentId, productId, newPrice });
      alert('Price updated successfully!');
    } catch (error) {
      console.error('Error applying price:', error);
      alert('Failed to update price');
    }
  };

  // Handle conflict resolution
  const handleResolveConflict = async (resolutionId) => {
    try {
      const response = await fetch('/api/admin/pricing/resolve-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionId,
          conflicts: conflict.conflicts,
          newPrice: conflict.newPrice,
          zoneId: conflict.zoneId,
          segmentId: conflict.segmentId,
          productId: conflict.productId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Conflict resolved using ${resolutionId} strategy!`);
        setConflict(null);
        // Refresh the matrix view
        window.location.reload();
      } else {
        alert('Failed to resolve conflict');
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
      alert('Failed to resolve conflict');
    }
  };

  // Handle modifier save
  const handleModifierSave = async (conditions) => {
    try {
      // TODO: Integrate with modifier creation API
      console.log('Saving modifier with conditions:', conditions);
      alert('Modifier rule saved successfully!');
    } catch (error) {
      console.error('Error saving modifier:', error);
      alert('Failed to save modifier');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              💰 Pricing Management
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage virtual price books, resolve conflicts, and create targeting rules
            </p>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8 border-t border-gray-200">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'matrix'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Smart View Matrix
            </button>
            <button
              onClick={() => setActiveTab('modifiers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'modifiers'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔧 Modifier Rules
            </button>
            <button
              onClick={() => setActiveTab('books')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'books'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📘 Price Books
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'matrix' && (
          <SmartViewMatrix onPriceChange={handlePriceChange} />
        )}

        {activeTab === 'modifiers' && (
          <ModifierRuleBuilder onChange={handleModifierSave} />
        )}

        {activeTab === 'books' && (
          <PriceBooksManager />
        )}
      </div>

      {/* Conflict Detection Modal */}
      {conflict && (
        <ConflictDetectionModal
          conflict={conflict}
          onResolve={handleResolveConflict}
          onCancel={() => setConflict(null)}
        />
      )}
    </div>
  );
};

/**
 * Price Books Manager Component
 * Simple list of price books with create/edit actions
 */
const PriceBooksManager = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchPriceBooks();
  }, []);

  const fetchPriceBooks = async () => {
    try {
      const response = await fetch('/api/admin/pricing/price-books-hierarchy');
      const data = await response.json();
      
      if (data.success) {
        const allBooks = [data.data.master, ...(data.data.children || [])].filter(Boolean);
        setBooks(allBooks);
      }
    } catch (error) {
      console.error('Error fetching price books:', error);
    } finally {
      setLoading(false);
    }
  };

  const createMasterBook = async () => {
    try {
      const response = await fetch('/api/admin/pricing/master-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Master Price Book',
          description: 'Base prices for all products',
          currency: 'INR'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Master price book created!');
        fetchPriceBooks();
      } else {
        alert(data.error || 'Failed to create master book');
      }
    } catch (error) {
      console.error('Error creating master book:', error);
      alert('Failed to create master book');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Price Books</h2>
        {books.length === 0 && (
          <button
            onClick={createMasterBook}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            + Create Master Book
          </button>
        )}
      </div>

      {books.length === 0 ? (
        <div className="px-6 py-12 text-center text-gray-500">
          <p className="text-lg mb-2">No price books found</p>
          <p className="text-sm">Create a master price book to get started</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {books.map((book) => (
            <div key={book._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{book.name}</h3>
                    {book.isMaster && (
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded">
                        MASTER
                      </span>
                    )}
                    {book.zone && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                        ZONE
                      </span>
                    )}
                    {book.segment && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                        SEGMENT
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{book.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{book.currency}</span>
                  <button className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPricingDashboard;
