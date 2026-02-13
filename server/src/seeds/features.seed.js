import mongoose from 'mongoose';
import Feature from '../models/Feature.js';

/**
 * FEATURE SEED FILE
 * 
 * This file creates all system features that will be used to control UI and functionality.
 * Features are READ-ONLY and can only be assigned to segments, not created/edited via UI.
 * 
 * Run this seed file once to populate the Feature collection.
 */

const features = [
    {
        key: 'bulk_order_upload',
        name: 'Bulk Order Upload',
        description: 'Upload composite PDFs and split into multiple orders automatically',
        category: 'ORDERS',
        subcategory: 'BULK_OPERATIONS',
        isActive: true,
        isBeta: false,
        isPremium: true,
        icon: '📦',
        sortOrder: 10,
        configSchema: {
            type: 'object',
            properties: {
                maxFileSize: {
                    type: 'number',
                    description: 'Maximum file size in bytes',
                    default: 104857600 // 100MB
                },
                maxDesigns: {
                    type: 'number',
                    description: 'Maximum number of distinct designs',
                    default: 50
                },
                maxTotalCopies: {
                    type: 'number',
                    description: 'Maximum total copies across all designs',
                    default: 100000
                }
            }
        }
    },
    {
        key: 'advanced_analytics',
        name: 'Advanced Analytics',
        description: 'Access to detailed analytics dashboards and reports',
        category: 'ANALYTICS',
        subcategory: null,
        isActive: true,
        isBeta: false,
        isPremium: true,
        icon: '📊',
        sortOrder: 20,
        configSchema: {
            type: 'object',
            properties: {
                dashboards: {
                    type: 'array',
                    description: 'Available dashboard types',
                    items: { type: 'string' },
                    default: ['sales', 'orders', 'customers']
                },
                exportFormats: {
                    type: 'array',
                    description: 'Allowed export formats',
                    items: { type: 'string' },
                    default: ['pdf', 'csv', 'excel']
                }
            }
        }
    },
    {
        key: 'view_brand_kit',
        name: 'Brand Kit Access',
        description: 'Access and manage brand kits with logos, colors, and templates',
        category: 'BRANDING',
        subcategory: 'BRAND_MANAGEMENT',
        isActive: true,
        isBeta: false,
        isPremium: false,
        icon: '🎨',
        sortOrder: 30,
        configSchema: {
            type: 'object',
            properties: {
                maxTemplates: {
                    type: 'number',
                    description: 'Maximum number of templates',
                    default: 10
                },
                customColors: {
                    type: 'boolean',
                    description: 'Allow custom color selection',
                    default: true
                }
            }
        }
    },
    {
        key: 'priority_support',
        name: 'Priority Support',
        description: 'Get priority customer support with faster response times',
        category: 'SUPPORT',
        subcategory: null,
        isActive: true,
        isBeta: false,
        isPremium: true,
        icon: '🎯',
        sortOrder: 40,
        configSchema: {
            type: 'object',
            properties: {
                maxResponseTimeMinutes: {
                    type: 'number',
                    description: 'Maximum response time in minutes',
                    default: 30
                },
                dedicatedManager: {
                    type: 'boolean',
                    description: 'Assign dedicated account manager',
                    default: false
                }
            }
        }
    },
    {
        key: 'credit_limit_management',
        name: 'Credit Limit Management',
        description: 'View and manage credit limits for orders',
        category: 'FINANCIAL',
        subcategory: 'CREDIT',
        isActive: true,
        isBeta: false,
        isPremium: false,
        icon: '💳',
        sortOrder: 50,
        configSchema: {
            type: 'object',
            properties: {
                maxCreditLimit: {
                    type: 'number',
                    description: 'Maximum credit limit allowed',
                    default: 100000
                },
                autoApproval: {
                    type: 'boolean',
                    description: 'Auto-approve credit orders within limit',
                    default: false
                }
            }
        }
    },
    {
        key: 'custom_pricing',
        name: 'Custom Pricing',
        description: 'Access to custom pricing tiers and negotiated rates',
        category: 'PRICING',
        subcategory: 'CUSTOM_RATES',
        isActive: true,
        isBeta: false,
        isPremium: true,
        icon: '💰',
        sortOrder: 60,
        configSchema: {
            type: 'object',
            properties: {
                discountPercentage: {
                    type: 'number',
                    description: 'Maximum discount percentage',
                    default: 20
                },
                customRates: {
                    type: 'boolean',
                    description: 'Allow product-specific custom rates',
                    default: true
                }
            }
        }
    },
    {
        key: 'white_label',
        name: 'White Label Branding',
        description: 'Use your own branding on deliverables and communications',
        category: 'BRANDING',
        subcategory: 'WHITE_LABEL',
        isActive: true,
        isBeta: true,
        isPremium: true,
        icon: '🏷️',
        sortOrder: 70,
        configSchema: {
            type: 'object',
            properties: {
                customDomain: {
                    type: 'boolean',
                    description: 'Allow custom domain',
                    default: false
                },
                removeBranding: {
                    type: 'boolean',
                    description: 'Remove platform branding',
                    default: true
                }
            }
        }
    },
    {
        key: 'api_access',
        name: 'API Access',
        description: 'Programmatic access to platform via REST API',
        category: 'INTEGRATION',
        subcategory: 'API',
        isActive: true,
        isBeta: false,
        isPremium: true,
        icon: '🔌',
        sortOrder: 80,
        configSchema: {
            type: 'object',
            properties: {
                rateLimitPerHour: {
                    type: 'number',
                    description: 'API calls allowed per hour',
                    default: 1000
                },
                webhooks: {
                    type: 'boolean',
                    description: 'Enable webhook notifications',
                    default: true
                }
            }
        }
    },
    {
        key: 'download_invoices',
        name: 'Download Invoices',
        description: 'Download and print invoices for all orders',
        category: 'ORDERS',
        subcategory: 'INVOICING',
        isActive: true,
        isBeta: false,
        isPremium: false,
        icon: '📄',
        sortOrder: 90,
        configSchema: {
            type: 'object',
            properties: {
                formats: {
                    type: 'array',
                    description: 'Available invoice formats',
                    items: { type: 'string' },
                    default: ['pdf']
                },
                bulkDownload: {
                    type: 'boolean',
                    description: 'Allow bulk invoice downloads',
                    default: false
                }
            }
        }
    },
    {
        key: 'order_tracking',
        name: 'Advanced Order Tracking',
        description: 'Track orders in real-time with detailed status updates',
        category: 'ORDERS',
        subcategory: 'TRACKING',
        isActive: true,
        isBeta: false,
        isPremium: false,
        icon: '📍',
        sortOrder: 100,
        configSchema: {
            type: 'object',
            properties: {
                realtimeUpdates: {
                    type: 'boolean',
                    description: 'Enable real-time tracking updates',
                    default: true
                },
                smsNotifications: {
                    type: 'boolean',
                    description: 'Send SMS for status updates',
                    default: false
                }
            }
        }
    }
];

/**
 * Seed function to populate features
 */
export async function seedFeatures() {
    try {
        console.log('🌱 Starting feature seed...');

        // Connect to MongoDB if not already connected
        if (mongoose.connection.readyState !== 1) {
            console.log('⚠️  Database not connected. Please ensure database connection before running seed.');
            return;
        }

        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const featureData of features) {
            const existing = await Feature.findOne({ key: featureData.key });

            if (existing) {
                // Update existing feature (in case you want to update descriptions/configs)
                await Feature.findByIdAndUpdate(existing._id, featureData);
                updated++;
                console.log(`  ✓ Updated feature: ${featureData.key}`);
            } else {
                // Create new feature
                await Feature.create(featureData);
                created++;
                console.log(`  ✓ Created feature: ${featureData.key}`);
            }
        }

        console.log('\n✅ Feature seed completed!');
        console.log(`   Created: ${created}`);
        console.log(`   Updated: ${updated}`);
        console.log(`   Total features: ${features.length}`);

    } catch (error) {
        console.error('❌ Feature seed failed:', error);
        throw error;
    }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    // This would require database connection setup
    console.log('Run this seed through your main seed script or server startup');
}

export default { seedFeatures, features };
