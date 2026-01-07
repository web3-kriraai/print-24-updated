// REPLACEMENT CODE FOR AdminDashboard.tsx Line 7293-7337
// Copy this code and paste it to replace the basePrice input field

                  {/* Dynamic Pricing Info - Prices managed in Price Books */}
                  <div className="col-span-2">
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <DollarSign className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                            💰 Dynamic Pricing Enabled
                          </h4>
                          <p className="text-sm text-blue-700 mb-3">
                            Prices for this product are managed through <strong>Price Books</strong> and <strong>Modifiers</strong>.
                            After creating the product, set up different prices for different user segments (Retail, VIP, Corporate) and locations.
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('price-books');
                                toast.success('Navigate to Price Books after saving this product');
                              }}
                              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Go to Price Books →
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('modifiers');
                                toast.success('Navigate to Modifiers after saving this product');
                              }}
                              className="text-sm bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              View Modifiers
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
