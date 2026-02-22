import Sequence from "../models/sequenceModal.js";
import Department from "../models/departmentModal.js";

// Create a new sequence
export const createSequence = async (req, res) => {
  try {
    const { name, category, subcategory, departments, attributes } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Sequence name is required." });
    }

    if (!departments || !Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({ error: "At least one department is required." });
    }

    // Validate departments array - should be array of department IDs
    const departmentEntries = departments.map((deptId, index) => ({
      department: deptId,
      order: index + 1,
    }));

    const sequenceData = {
      name: name.trim(),
      category,
      subcategory,
      departments: departmentEntries,
      isDefault: false,
    };

    // Add attributes if provided
    if (attributes && Array.isArray(attributes)) {
      sequenceData.attributes = attributes;
    }

    const sequence = await Sequence.create(sequenceData);

    const populatedSequence = await Sequence.findById(sequence._id)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate({
        path: 'departments.department',
        select: 'name operators',
        populate: {
          path: 'operators',
          select: 'name email'
        }
      })
      .populate('attributes', 'attributeName inputStyle primaryEffectType isPricingAttribute');

    return res.json({
      success: true,
      message: "Sequence created successfully",
      data: populatedSequence,
    });
  } catch (err) {
    console.log("SEQUENCE CREATE ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// Get all sequences
export const getAllSequences = async (req, res) => {
  try {
    const { category, subcategory } = req.query;

    let query = {};
    if (category) {
      query.category = category;
    }
    if (subcategory) {
      query.subcategory = subcategory;
    }

    const sequences = await Sequence.find(query)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate({
        path: 'departments.department',
        select: 'name operators',
        populate: {
          path: 'operators',
          select: 'name email'
        }
      })
      .populate('attributes', 'attributeName inputStyle primaryEffectType isPricingAttribute')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: sequences,
    });
  } catch (err) {
    console.log("GET SEQUENCES ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// Get sequence by ID
export const getSingleSequence = async (req, res) => {
  try {
    const { id } = req.params;
    const sequence = await Sequence.findById(id)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate({
        path: 'departments.department',
        select: 'name operators',
        populate: {
          path: 'operators',
          select: 'name email'
        }
      })
      .populate('attributes', 'attributeName inputStyle primaryEffectType isPricingAttribute');

    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }

    return res.json({
      success: true,
      data: sequence,
    });
  } catch (err) {
    console.log("GET SEQUENCE ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// Get sequence by category and subcategory
export const getSequenceBySubcategory = async (req, res) => {
  try {
    const { subcategoryId } = req.params;

    const sequence = await Sequence.findOne({
      subcategory: subcategoryId,
      isDefault: true
    })
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate({
        path: 'departments.department',
        select: 'name operators',
        populate: {
          path: 'operators',
          select: 'name email'
        }
      })
      .populate('attributes', 'attributeName inputStyle primaryEffectType isPricingAttribute');

    if (!sequence) {
      // Return null if no default sequence found
      return res.json({
        success: true,
        data: null,
      });
    }

    return res.json({
      success: true,
      data: sequence,
    });
  } catch (err) {
    console.log("GET SEQUENCE BY SUBCATEGORY ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// Update sequence
export const updateSequence = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, subcategory, departments, attributes, isDefault } = req.body;

    const sequence = await Sequence.findById(id);
    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }

    if (name !== undefined) sequence.name = name.trim();
    if (category !== undefined) sequence.category = category;
    if (subcategory !== undefined) sequence.subcategory = subcategory;
    if (isDefault !== undefined) sequence.isDefault = isDefault;

    if (departments !== undefined && Array.isArray(departments) && departments.length > 0) {
      sequence.departments = departments.map((deptId, index) => ({
        department: deptId,
        order: index + 1,
      }));
    }

    if (attributes !== undefined && Array.isArray(attributes)) {
      sequence.attributes = attributes;
    }

    await sequence.save();

    const updatedSequence = await Sequence.findById(id)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate({
        path: 'departments.department',
        select: 'name operators',
        populate: {
          path: 'operators',
          select: 'name email'
        }
      })
      .populate('attributes', 'attributeName inputStyle primaryEffectType isPricingAttribute');

    return res.json({
      success: true,
      message: "Sequence updated successfully",
      data: updatedSequence,
    });
  } catch (err) {
    console.log("UPDATE SEQUENCE ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// Delete sequence
export const deleteSequence = async (req, res) => {
  try {
    const { id } = req.params;

    const sequence = await Sequence.findById(id);
    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }

    await Sequence.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Sequence deleted successfully",
    });
  } catch (err) {
    console.log("DELETE SEQUENCE ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

