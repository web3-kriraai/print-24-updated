import Department from "../models/departmentModal.js";
import Order from "../models/orderModal.js";
import Sequence from "../models/sequenceModal.js";

// Create a new department
export const createDepartment = async (req, res) => {
  try {
    const { name, description, isEnabled, operators } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Department name is required." });
    }

    // Check if department with same name already exists
    const existingDepartment = await Department.findOne({ name: name.trim() });
    if (existingDepartment) {
      return res.status(400).json({ error: "Department with this name already exists." });
    }

    const department = await Department.create({
      name: name.trim(),
      description: description || "",
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      operators: operators || [],
    });

    return res.json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (err) {
    console.log("DEPARTMENT CREATE ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// Get all departments
export const getAllDepartments = async (req, res) => {
  try {
    const { isEnabled } = req.query;
    
    let query = {};
    if (isEnabled !== undefined) {
      query.isEnabled = isEnabled === 'true';
    }

    const departments = await Department.find(query)
      .populate('operators', '_id name email')
      .sort({ sequence: 1, name: 1 });

    return res.json({
      success: true,
      data: departments,
    });
  } catch (err) {
    console.log("GET DEPARTMENTS ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// Get single department
export const getSingleDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id)
      .populate('operators', '_id name email');

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    return res.json({
      success: true,
      data: department,
    });
  } catch (err) {
    console.log("GET DEPARTMENT ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// Update department
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isEnabled, operators } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Check if name is being changed and if new name already exists
    if (name && name.trim() !== department.name) {
      const existingDepartment = await Department.findOne({ name: name.trim() });
      if (existingDepartment) {
        return res.status(400).json({ error: "Department with this name already exists." });
      }
      department.name = name.trim();
    }

    if (description !== undefined) department.description = description;
    if (isEnabled !== undefined) department.isEnabled = isEnabled;
    if (operators !== undefined) department.operators = operators;

    await department.save();

    const updatedDepartment = await Department.findById(id)
      .populate('operators', '_id name email');

    return res.json({
      success: true,
      message: "Department updated successfully",
      data: updatedDepartment,
    });
  } catch (err) {
    console.log("UPDATE DEPARTMENT ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

// Delete department
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id);
    
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Check if department is used in any sequences
    const sequencesUsingDepartment = await Sequence.find({
      "departments.department": id
    });

    if (sequencesUsingDepartment.length > 0) {
      const sequenceNames = sequencesUsingDepartment.map(seq => seq.name).join(", ");
      return res.status(400).json({ 
        error: `Cannot delete department. It is being used in ${sequencesUsingDepartment.length} sequence(s): ${sequenceNames}. Please remove this department from the sequence(s) before deleting.` 
      });
    }

    // Check if department has any active jobs
    const activeOrders = await Order.find({
      "departmentStatuses.department": id,
      status: { $in: ["request", "processing"] }
    });

    if (activeOrders.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete department. ${activeOrders.length} active order(s) are assigned to this department.` 
      });
    }

    await Department.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (err) {
    console.log("DELETE DEPARTMENT ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};

