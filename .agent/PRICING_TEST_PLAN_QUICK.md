# 🧪 PRICING SYSTEM - COMPLETE TEST PLAN

**Your Goal:** Test all pricing behaviors from admin side  
**What You'll Learn:** How every pricing feature works  
**Time Needed:** 2-3 hours

---

## 🚀 **QUICK REFERENCE - Test Sequence**

```
Phase 1: Setup (30 min)
  → Create 5 Geo Zones
  → Create 3 User Segments  
  → Create 2 Price Books
  → Create 2 Products
  → Add Prices

Phase 2: Create Modifiers (30 min)
  → Zone-based (Manhattan +10%)
  → Segment-based (VIP -15%, Wholesale -25%)
  → Product-specific (Premium +20%)
  → Quantity-based (Bulk 500+ -10%)
  → Complex conditions (Florida Cards -5%)
  → Time-based (Holiday Sale)
  → Exclusive (Clearance -30%)

Phase 3: Test Pricing (30 min)
  → Basic: Retail in Manhattan
  → VIP: VIP in Manhattan
  → Bulk: 500 cards
  → Complex: VIP + Manhattan + 1000 cards
  → Regional: India pricing
  → Conditions: Florida promo

Phase 4: Virtual Views (15 min)
  → All products in Manhattan
  → VIP prices in Manhattan
  → Price hierarchy

Phase 5: Conflicts (15 min)
  → Create conflicting modifier
  → Detect conflict
  → Resolve with PRESERVE

Phase 6: Stacking (15 min)
  → Test stackable modifiers
  → Test exclusive modifier

Phase 7: Availability (15 min)
  → Restrict product in zone
  → Test restriction
```

---

## 📝 **DETAILED STEP-BY-STEP GUIDE**

See the comprehensive guide with all API calls, expected results, and validation steps in:

**`.agent/PRICING_TEST_PLAN_DETAILED.md`**

---

## ✅ **VALIDATION CHECKLIST**

After testing, check:

### **Context-Aware Pricing** ✅
- [ ] User segment detected
- [ ] Geo zone resolved
- [ ] Currency correct
- [ ] Quantity affects price

### **Hierarchical Zones** ✅
- [ ] Zone path correct
- [ ] Most specific wins
- [ ] Cascading works
- [ ] Parent-child OK

### **Virtual Price Books** ✅
- [ ] Master + Zone + Segment
- [ ] Filtered views work
- [ ] Source tracking OK
- [ ] Modifiers listed

### **Complex Modifiers** ✅
- [ ] AND logic works
- [ ] OR logic works
- [ ] NOT logic works
- [ ] All 7 dimensions tested

### **Conflict Detection** ✅
- [ ] Conflicts detected
- [ ] 3 options shown
- [ ] OVERWRITE works
- [ ] PRESERVE works
- [ ] RELATIVE works

### **Waterfall Resolution** ✅
- [ ] Priority respected
- [ ] Stacking works
- [ ] Exclusive overrides
- [ ] All logged

### **Availability Gating** ✅
- [ ] Restricted blocked
- [ ] Reason shown
- [ ] Available pass

---

## 🎯 **SUCCESS CRITERIA**

✅ All 7 phases complete  
✅ All checkboxes checked  
✅ Expected = Actual results  
✅ No server errors  
✅ Audit logs present

---

**Ready to start testing!** 🚀
