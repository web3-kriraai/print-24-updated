import { jest } from '@jest/globals';
import ModifierEngine from '../../src/services/ModifierEngine.js';
import PriceModifier from '../../src/models/PriceModifier.js';

describe('Pricing Logic Verification', () => {
    let findSpy;

    beforeAll(() => {
        // Mock the find method to return our test modifiers
        findSpy = jest.spyOn(PriceModifier, 'find');
    });

    afterAll(() => {
        findSpy.mockRestore();
    });

    test('should match Admin Compounding Logic (100 + 10% + 30% - 50% = 71.5)', async () => {
        const mockModifiers = [
            {
                _id: 'mod1',
                name: '+10%',
                modifierType: 'PERCENT_INC',
                value: 10,
                priority: 30, // applied 1st
                appliesTo: 'GLOBAL',
                isActive: true,
                isStackable: true,
                appliesOn: 'UNIT'
            },
            {
                _id: 'mod2',
                name: '+30%',
                modifierType: 'PERCENT_INC',
                value: 30,
                priority: 20, // applied 2nd
                appliesTo: 'GLOBAL',
                isActive: true, // applied 2nd
                isStackable: true,
                appliesOn: 'UNIT'
            },
            {
                _id: 'mod3',
                name: '-50%',
                modifierType: 'PERCENT_DEC',
                value: 50,
                priority: 10, // applied 3rd
                appliesTo: 'GLOBAL',
                isActive: true,
                isStackable: true,
                appliesOn: 'UNIT'
            }
        ];

        // Ensure find returns a chainable object with sort().lean()
        findSpy.mockReturnValue({
            sort: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockModifiers)
            })
        });

        const context = {
            unitPrice: 100,
            subtotal: 1000,
            quantity: 10,
            productId: 'product1',
            geoZoneId: 'zone1',
            userSegmentId: 'segment1'
        };

        const result = await ModifierEngine.evaluate(context);

        // Debug output
        console.log('Result:', JSON.stringify(result, null, 2));

        // Additive Logic (Current):
        // 100 * 0.10 = 10
        // 100 * 0.30 = 30
        // 100 * -0.50 = -50
        // Total Adj = 10 + 30 - 50 = -10
        // Final Unit = 100 - 10 = 90

        // Compounding Logic (Target):
        // 100 + 10% = 110
        // 110 + 30% = 143
        // 143 - 50% = 71.5
        // Total Adj = 71.5 - 100 = -28.5

        // Assertions for Compounding Logic
        expect(result.unitAdjustment).toBeCloseTo(-28.5, 1);
        expect(100 + result.unitAdjustment).toBeCloseTo(71.5, 1);
    });
});
