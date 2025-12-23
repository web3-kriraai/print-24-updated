# Nested Subcategory Feature - End-to-End Testing Guide

## Overview
This document provides a comprehensive testing guide for the nested subcategory feature. The feature allows creating subcategories inside other subcategories with unlimited nesting depth.

## Test Scenarios

### 1. Backend API Testing

#### Test 1.1: Get Subcategories with Nested Children
**Endpoint:** `GET /api/subcategories/category/:categoryId?includeChildren=true`

**Steps:**
1. Create a category (if not exists)
2. Create a top-level subcategory under that category
3. Create a nested subcategory under the top-level subcategory
4. Call the endpoint with `includeChildren=true`
5. Verify response includes nested structure with `children` array

**Expected Result:**
- Response should include top-level subcategories
- Each subcategory with children should have a `children` array
- Nested subcategories should be properly populated

#### Test 1.2: Get Nested Subcategories by Parent
**Endpoint:** `GET /api/subcategories/parent/:parentId?includeChildren=true`

**Steps:**
1. Create a parent subcategory
2. Create nested subcategories under it
3. Call the endpoint with parent subcategory ID
4. Verify response includes all nested children recursively

**Expected Result:**
- Response should include direct children
- If `includeChildren=true`, should include nested children recursively

#### Test 1.3: Create Nested Subcategory
**Endpoint:** `POST /api/subcategories`

**Request Body:**
```json
{
  "name": "Nested Subcategory",
  "description": "Test nested subcategory",
  "category": "categoryId",
  "parent": "parentSubcategoryId",
  "sortOrder": 0,
  "image": <file>
}
```

**Steps:**
1. Create a category
2. Create a parent subcategory
3. Create a nested subcategory with `parent` field set
4. Verify nested subcategory is created successfully
5. Verify it appears under parent when fetching

**Expected Result:**
- Nested subcategory created successfully
- Parent relationship is correctly set
- Category is inherited from parent subcategory

#### Test 1.4: Prevent Circular References
**Endpoint:** `PUT /api/subcategories/:id`

**Steps:**
1. Create subcategory A
2. Create subcategory B with parent A
3. Try to set A's parent to B (should fail)
4. Try to set A's parent to A (should fail)

**Expected Result:**
- Both attempts should return 400 error
- Error message should indicate circular reference

### 2. Admin Dashboard Testing

#### Test 2.1: Create Nested Subcategory via Admin Dashboard

**Steps:**
1. Log in to admin dashboard
2. Navigate to Categories tab
3. Select "Nested Subcategory" radio option
4. Select Type (Digital/Bulk)
5. Select Category
6. Select Parent Subcategory (should show all subcategories with indentation)
7. Fill in subcategory details (name, description, image, sort order)
8. Submit form

**Expected Result:**
- Form validates correctly
- Nested subcategory is created
- Success message displayed
- Subcategory appears in hierarchical view

#### Test 2.2: View Hierarchical Subcategories

**Steps:**
1. Navigate to Categories tab
2. Click on a category that has nested subcategories
3. Verify subcategories are displayed hierarchically
4. Check indentation for nested subcategories
5. Verify "(nested)" label appears for nested items

**Expected Result:**
- Top-level subcategories shown at level 0
- Nested subcategories indented (20px per level)
- "(nested)" label visible for nested items
- Sort order respected at each level

#### Test 2.3: Edit Nested Subcategory

**Steps:**
1. Click edit button on a nested subcategory
2. Verify form pre-populates correctly
3. Verify parent subcategory dropdown shows correct options
4. Change parent (if needed)
5. Update other fields
6. Submit changes

**Expected Result:**
- Form loads with correct data
- Parent options exclude current subcategory and its descendants
- Changes saved successfully
- Hierarchy updated correctly

#### Test 2.4: Delete Nested Subcategory

**Steps:**
1. Try to delete a subcategory that has nested children
2. Verify error message appears
3. Delete nested children first
4. Then delete parent subcategory

**Expected Result:**
- Cannot delete subcategory with children
- Error message: "Cannot delete subcategory. There are X nested subcategory(ies)..."
- After deleting children, parent can be deleted

### 3. User-Facing Pages Testing

#### Test 3.1: Navigate Through Nested Subcategories (VisitingCards)

**Steps:**
1. Navigate to `/digital-print/:categoryId/:subcategoryId`
2. If subcategory has nested children, they should be displayed
3. Click on a nested subcategory
4. Verify URL updates correctly
5. Verify products or further nested subcategories are shown

**Expected Result:**
- Nested subcategories displayed correctly
- Navigation works at any depth
- URL structure: `/digital-print/:categoryId/:subcategoryId/:nestedSubcategoryId`
- Auto-redirect if only one nested subcategory exists

#### Test 3.2: Deep Nesting (3+ Levels)

**Steps:**
1. Create: Category → Subcategory A → Subcategory B → Subcategory C
2. Navigate through each level
3. Verify all levels are accessible
4. Verify products can be associated with deepest level

**Expected Result:**
- All nesting levels work correctly
- Navigation through all levels successful
- Products display correctly at any level

#### Test 3.3: DigitalPrint Page with Nested Subcategories

**Steps:**
1. Navigate to Digital Print page
2. Select a category
3. Verify subcategories are displayed (including nested ones)
4. Click on nested subcategory
5. Verify navigation works

**Expected Result:**
- All subcategories displayed (flattened with hierarchy info)
- Nested subcategories show parent name or indentation
- Clicking navigates correctly

### 4. Edge Cases

#### Test 4.1: Empty Nested Subcategory
- Create nested subcategory with no children
- Verify it displays correctly
- Verify it can have products

#### Test 4.2: Multiple Siblings at Same Level
- Create multiple nested subcategories under same parent
- Verify all display correctly
- Verify sort order works

#### Test 4.3: Mixed Levels
- Create mix of top-level and nested subcategories
- Verify display is correct
- Verify navigation works for both types

#### Test 4.4: Maximum Depth
- Create subcategories at maximum practical depth (5-10 levels)
- Verify system handles it correctly
- Verify performance is acceptable

### 5. Integration Testing

#### Test 5.1: Product Association
**Steps:**
1. Create nested subcategory structure
2. Add products to deepest nested subcategory
3. Verify products display correctly
4. Verify products can be edited/updated

**Expected Result:**
- Products associate correctly with nested subcategories
- Products display when viewing nested subcategory
- Product management works normally

#### Test 5.2: Order Management
**Steps:**
1. Create nested subcategory structure
2. Create order with product from nested subcategory
3. Verify order processes correctly
4. Verify order appears in admin/employee dashboards

**Expected Result:**
- Orders work correctly with nested subcategories
- Order flow unaffected by nesting

## Quick Test Checklist

- [ ] Backend: Create nested subcategory via API
- [ ] Backend: Fetch subcategories with children recursively
- [ ] Backend: Prevent circular references
- [ ] Admin: Create nested subcategory via UI
- [ ] Admin: View hierarchical display
- [ ] Admin: Edit nested subcategory
- [ ] Admin: Delete nested subcategory (with children check)
- [ ] User: Navigate through nested subcategories
- [ ] User: View products in nested subcategory
- [ ] User: Deep nesting (3+ levels)
- [ ] Edge: Multiple siblings, mixed levels
- [ ] Integration: Products, Orders work correctly

## API Endpoints Reference

### Subcategory Endpoints
- `GET /api/subcategories` - Get all subcategories
- `GET /api/subcategories/category/:categoryId?includeChildren=true` - Get subcategories by category (with nested children)
- `GET /api/subcategories/parent/:parentId?includeChildren=true` - Get nested subcategories by parent
- `GET /api/subcategories/:id` - Get single subcategory
- `POST /api/subcategories` - Create subcategory (supports `parent` field)
- `PUT /api/subcategories/:id` - Update subcategory (supports `parent` field)
- `DELETE /api/subcategories/:id` - Delete subcategory (checks for children)

## Notes

- All endpoints support both ObjectId and slug identifiers
- Circular reference prevention is built into update endpoint
- Nested subcategories inherit category from parent
- Sort order works at each nesting level independently
- Backward compatible with existing flat subcategories

