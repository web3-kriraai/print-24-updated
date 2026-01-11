import Order from "../models/orderModal.js";
import Department from "../models/departmentModal.js";
import Product from "../models/productModal.js";

// Department action: Start, Pause, Stop, Resume, Complete
export const departmentAction = async (req, res) => {
  try {
    const { orderId, departmentId } = req.params;
    const { action, notes } = req.body;
    const operatorId = req.user?.id; // Get operator from authenticated user

    // Validate action
    const validActions = ["start", "pause", "resume", "stop", "complete"];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: "Invalid action. Allowed: start, pause, resume, stop, complete" });
    }

    // Find order with product populated
    const order = await Order.findById(orderId).populate("product");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if order is approved (status must be "approved", "processing", or "completed")
    if (order.status === "request") {
      return res.status(400).json({ 
        error: "Order must be approved by admin before starting production. Current status: request" 
      });
    }

    // Find department
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Check if department is enabled
    if (!department.isEnabled) {
      return res.status(400).json({ error: "Department is disabled" });
    }

    // Special department ID that allows all employees to perform actions
    const ALL_EMPLOYEES_DEPARTMENT_ID = "69327f9850162220fa7bff29";
    
    // Check if operator is assigned to department (if operators are specified)
    // Exception: Allow all employees for the specific department
    if (departmentId !== ALL_EMPLOYEES_DEPARTMENT_ID) {
      if (department.operators && department.operators.length > 0) {
        const isOperator = department.operators.some(op => op.toString() === operatorId);
        if (!isOperator) {
          return res.status(403).json({ error: "You are not authorized to perform actions for this department" });
        }
      }
    }

    // Get product to find production sequence - handle both populated and unpopulated cases
    const productId = order.product._id || order.product;
    const product = await Product.findById(productId).populate("productionSequence");
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Get departments in sequence order
    let departmentsInSequence = [];
    if (product.productionSequence && product.productionSequence.length > 0) {
      const deptIds = product.productionSequence.map(dept => typeof dept === 'object' ? dept._id : dept);
      const departments = await Department.find({ 
        _id: { $in: deptIds },
        isEnabled: true 
      });
      departmentsInSequence = deptIds
        .map(id => departments.find(d => d._id.toString() === id.toString()))
        .filter(d => d !== undefined);
    } else {
      departmentsInSequence = await Department.find({ isEnabled: true }).sort({ name: 1 });
    }

    // Find current department index in sequence
    const currentDeptIndex = departmentsInSequence.findIndex(
      d => d._id.toString() === departmentId
    );

    // Initialize department status if not exists (MUST be done before validation)
    let deptStatus = order.departmentStatuses?.find(
      (ds) => ds.department.toString() === departmentId
    );

    if (!deptStatus) {
      // Create new department status entry
      deptStatus = {
        department: departmentId,
        status: "pending",
        startedAt: null,
        pausedAt: null,
        completedAt: null,
        stoppedAt: null,
        operator: null,
        notes: "",
      };
      if (!order.departmentStatuses) {
        order.departmentStatuses = [];
      }
      order.departmentStatuses.push(deptStatus);
      deptStatus = order.departmentStatuses[order.departmentStatuses.length - 1];
    }

    // Validate: Can only start if department has received a request (status: "pending")
    // Note: Sequential validation is handled in getDepartmentOrders - orders won't appear until previous departments complete
    if (action === "start") {
      // Check if department has received a request (status must be "pending")
      if (deptStatus.status !== "pending") {
        return res.status(400).json({ 
          error: `Cannot start "${department.name}". Department must receive a request first (current status: ${deptStatus.status}).` 
        });
      }
    }

    // Validate state transitions
    const currentStatus = deptStatus.status;
    const validTransitions = {
      pending: ["start", "stop"],
      in_progress: ["pause", "stop", "complete"],
      paused: ["resume", "stop"],
      stopped: [], // Cannot transition from stopped
      completed: [], // Cannot transition from completed
    };

    if (!validTransitions[currentStatus]?.includes(action)) {
      return res.status(400).json({ 
        error: `Invalid transition. Current status: ${currentStatus}. Allowed actions: ${validTransitions[currentStatus]?.join(", ") || "none"}` 
      });
    }

    // Update status based on action
    const now = new Date();
    switch (action) {
      case "start":
        deptStatus.status = "in_progress";
        deptStatus.startedAt = now;
        deptStatus.operator = operatorId;
        deptStatus.pausedAt = null;
        deptStatus.stoppedAt = null;
        // Update current department when department starts work
        order.currentDepartment = departmentId;
        order.currentDepartmentIndex = currentDeptIndex;
        // Change order status to "processing" when first department starts
        if (order.status === "approved") {
          order.status = "processing";
        }
        break;
      case "pause":
        deptStatus.status = "paused";
        deptStatus.pausedAt = now;
        break;
      case "resume":
        deptStatus.status = "in_progress";
        deptStatus.pausedAt = null;
        break;
      case "stop":
        deptStatus.status = "stopped";
        deptStatus.stoppedAt = now;
        break;
      case "complete":
        deptStatus.status = "completed";
        deptStatus.completedAt = now;
        break;
    }

    if (notes) {
      deptStatus.notes = notes;
    }

    // Add to production timeline
    if (!order.productionTimeline) {
      order.productionTimeline = [];
    }
    
    // Map action to timeline action format (must match enum in Order model: ["started", "paused", "resumed", "stopped", "completed"])
    const actionMap = {
      "start": "started",
      "resume": "resumed",
      "complete": "completed",
      "pause": "paused",
      "stop": "stopped"
    };
    const timelineAction = actionMap[action] || "started";
    
    order.productionTimeline.push({
      department: departmentId,
      action: timelineAction,
      timestamp: now,
      operator: operatorId,
      notes: notes || "",
    });

    // Update overall order status based on department progress
    // Only check departments that are in the sequence for this product
    const sequenceDeptIds = new Set(departmentsInSequence.map(d => d._id.toString()));
    const relevantDeptStatuses = (order.departmentStatuses || []).filter(
      ds => {
        const deptId = typeof ds.department === 'object' ? ds.department._id?.toString() : ds.department?.toString();
        return sequenceDeptIds.has(deptId);
      }
    );
    
    const allCompleted = relevantDeptStatuses.length > 0 && 
      relevantDeptStatuses.every(ds => ds.status === "completed");
    const anyInProgress = relevantDeptStatuses.some(ds => ds.status === "in_progress");
    const anyStopped = relevantDeptStatuses.some(ds => ds.status === "stopped");

    if (anyStopped) {
      order.status = "processing"; // Keep as processing if stopped (may need reprint)
    } else if (allCompleted && relevantDeptStatuses.length === departmentsInSequence.length) {
      // All departments in sequence are completed
      order.status = "completed";
    } else if (anyInProgress || action === "start") {
      order.status = "processing";
    }

    await order.save();

    // If department completed, send request to next department in sequence
    if (action === "complete" && currentDeptIndex >= 0 && currentDeptIndex < departmentsInSequence.length - 1) {
      const nextDept = departmentsInSequence[currentDeptIndex + 1];
      if (nextDept) {
        // Check if next department status exists
        let nextDeptStatus = order.departmentStatuses?.find(
          (ds) => ds.department.toString() === nextDept._id.toString()
        );

        // If next department status doesn't exist or is not already in progress/completed, send request
        const shouldSendRequest = !nextDeptStatus || 
          (nextDeptStatus.status !== "in_progress" && 
           nextDeptStatus.status !== "completed" && 
           nextDeptStatus.status !== "paused");

        if (shouldSendRequest) {
          const nextNow = new Date();
          const nextDeptIndex = currentDeptIndex + 1;

          if (!nextDeptStatus) {
            // Create new department status entry
            nextDeptStatus = {
              department: nextDept._id,
              status: "pending", // Request sent, waiting for department to start
              whenAssigned: nextNow, // Timestamp when assigned to this department
              startedAt: null,
              pausedAt: null,
              completedAt: null,
              stoppedAt: null,
              operator: null,
              notes: "",
            };
            if (!order.departmentStatuses) {
              order.departmentStatuses = [];
            }
            order.departmentStatuses.push(nextDeptStatus);
          } else {
            // Update existing status to pending if it was stopped or doesn't have a status
            if (nextDeptStatus.status === "stopped" || !nextDeptStatus.status) {
              nextDeptStatus.status = "pending";
              nextDeptStatus.stoppedAt = null;
            }
            // Update whenAssigned if not set
            if (!nextDeptStatus.whenAssigned) {
              nextDeptStatus.whenAssigned = nextNow;
            }
            // Update the status in the array
            const deptStatusIndex = order.departmentStatuses.findIndex(
              (ds) => ds.department.toString() === nextDept._id.toString()
            );
            if (deptStatusIndex >= 0) {
              order.departmentStatuses[deptStatusIndex] = nextDeptStatus;
            }
          }

          // Update current department to next department
          order.currentDepartment = nextDept._id;
          order.currentDepartmentIndex = nextDeptIndex;

          // Add to production timeline
          if (!order.productionTimeline) {
            order.productionTimeline = [];
          }
          order.productionTimeline.push({
            department: nextDept._id,
            action: "requested",
            timestamp: nextNow,
            operator: operatorId,
            notes: `Request sent after "${department.name}" completed`,
          });

          order.status = "processing"; // Ensure order is in processing status

          // Save order again after sending request to next department
          await order.save();
        }
      }
    }

    // Populate before returning
    await order.populate({
      path: "product",
      select: "name image basePrice subcategory options discount description instructions attributes minFileWidth maxFileWidth minFileHeight maxFileHeight filters gstPercentage additionalDesignCharge productionSequence",
      populate: [
        { path: "subcategory", select: "name" },
        { path: "productionSequence", select: "name sequence" }
      ]
    });
    await order.populate({
      path: "departmentStatuses.department",
      select: "name sequence",
    });
    await order.populate({
      path: "departmentStatuses.operator",
      select: "name email",
    });
    await order.populate({
      path: "productionTimeline.operator",
      select: "name email",
    });
    await order.populate({
      path: "productionTimeline.department",
      select: "name",
    });
    
    // Convert uploaded design buffers to base64 for frontend
    const orderObj = order.toObject();
    if (order.uploadedDesign?.frontImage?.data) {
      orderObj.uploadedDesign.frontImage.data = `data:${order.uploadedDesign.frontImage.contentType};base64,${order.uploadedDesign.frontImage.data.toString("base64")}`;
    }
    if (order.uploadedDesign?.backImage?.data) {
      orderObj.uploadedDesign.backImage.data = `data:${order.uploadedDesign.backImage.contentType};base64,${order.uploadedDesign.backImage.data.toString("base64")}`;
    }

    return res.json({
      success: true,
      message: `Department action "${action}" performed successfully`,
      order: orderObj,
    });
  } catch (err) {
    console.error("DEPARTMENT ACTION ERROR ===>", err);
    console.error("Error details:", err.message);
    console.error("Error stack:", err.stack);
    return res.status(500).json({ 
      error: err.message || "Failed to perform department action",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/**
 * Get orders for a specific department
 * 
 * This API returns orders where:
 * 1. The department ID is present in the product's productionSequence array
 * 2. The department has a status entry in the order's departmentStatuses
 * 3. All previous departments in the sequence are completed (for sequential workflow)
 * 4. The order status is approved, processing, or completed
 * 
 * Query Parameters:
 * - status (optional): Filter by department status (pending, in_progress, paused, completed, stopped)
 * 
 * Route: GET /api/departments/:departmentId/orders
 */
export const getDepartmentOrders = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { status } = req.query; // Filter by department status: pending, in_progress, paused, completed, stopped
    
    // Special department ID that should show orders even if not in sequence
    const ALL_EMPLOYEES_DEPARTMENT_ID = "69327f9850162220fa7bff29";

    // Find department
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Build query to find orders where this specific department has the requested status
    // Use $elemMatch to match orders where departmentStatuses array contains an entry with this department
    let query = {
      "departmentStatuses": {
        $elemMatch: {
          department: departmentId,
        }
      },
      // Only show orders that are approved or processing (approved = sent to first dept, processing = work started)
      status: { $in: ["approved", "processing", "completed"] }
    };

    if (status) {
      query["departmentStatuses"] = {
        $elemMatch: {
          department: departmentId,
          status: status,
        }
      };
      query.status = { $in: ["approved", "processing", "completed"] };
    }

    // Optimized query: use lean() and exclude heavy fields for faster loading
    // Note: selectedOptions and selectedDynamicAttributes are included by default (not excluded)
    const orders = await Order.find(query)
      .select("-uploadedDesign -notes -adminNotes -designTimeline -productionTimeline -courierTimeline -productionDetails") // Exclude heavy fields, but keep selectedOptions and selectedDynamicAttributes
      .populate("user", "name email")
      .populate({
        path: "product",
        select: "name image basePrice subcategory gstPercentage productionSequence", // Include productionSequence for filtering
        populate: [
          { path: "subcategory", select: "name image", populate: { path: "category", select: "name" } },
          { path: "productionSequence", select: "name sequence _id" }, // Populate productionSequence
        ]
      })
      .populate("currentDepartment", "name sequence")
      .populate({
        path: "departmentStatuses.department",
        select: "name sequence",
      })
      .populate({
        path: "departmentStatuses.operator",
        select: "name email",
      })
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for faster queries

    // Performance optimization: Batch collect all unique department IDs from all orders
    // to avoid N+1 query problem
    const allDeptIdsSet = new Set();
    orders.forEach(order => {
      // Since we're using lean(), productionSequence might not be populated
      // We'll handle this in the filtering logic below
    });
    
    // Single batch query for all departments
    const allDepartmentsMap = new Map();
    if (allDeptIdsSet.size > 0) {
      const allDepartments = await Department.find({ 
        _id: { $in: Array.from(allDeptIdsSet) }
      });
      allDepartments.forEach(dept => {
        allDepartmentsMap.set(dept._id.toString(), dept);
      });
    }

    // Additional filtering to ensure we only return orders where:
    // 1. This specific department has the correct status
    // 2. The department is present in the product's production sequence
    // 3. All previous departments in the sequence are completed (so order is ready for this department)
    // Filter orders: only show if department is in sequence and all previous departments are completed
    const filteredOrders = [];
    
    for (const order of orders) {
      const deptStatus = order.departmentStatuses?.find(
        (ds) => {
          const deptId = typeof ds.department === 'object' ? ds.department._id?.toString() : ds.department?.toString();
          return deptId === departmentId;
        }
      );

      if (!deptStatus) {
        continue;
      }

      // Get product to find production sequence
      const product = order.product;
      if (!product) {
        continue;
      }

      // Get departments in sequence order - need to fetch product with productionSequence
      // Since we're using lean(), productionSequence might not be populated
      // We'll need to fetch it separately or include it in the query
      let departmentsInSequence = [];
      
      // Try to get productionSequence from product (might be populated or just IDs)
      const productionSequence = product.productionSequence || [];
      
      if (productionSequence.length > 0) {
        // Handle both populated objects and ObjectIds
        const deptIds = productionSequence.map(dept => {
          if (typeof dept === 'object' && dept._id) {
            return dept._id.toString();
          }
          return typeof dept === 'object' ? dept.toString() : dept?.toString();
        }).filter(id => id);
        
        // Fetch departments if not already in map
        const missingDeptIds = deptIds.filter(id => !allDepartmentsMap.has(id));
        if (missingDeptIds.length > 0) {
          const missingDepts = await Department.find({ _id: { $in: missingDeptIds } });
          missingDepts.forEach(dept => {
            allDepartmentsMap.set(dept._id.toString(), dept);
          });
        }
        
        departmentsInSequence = deptIds
          .map(id => allDepartmentsMap.get(id))
          .filter(d => d !== undefined && d !== null);
      } else {
        // If no production sequence defined, check if this is the special department
        if (departmentId === ALL_EMPLOYEES_DEPARTMENT_ID) {
          // Special department can see orders even without production sequence
          if (status && deptStatus.status !== status) {
            continue; // Skip if status filter doesn't match
          }
          filteredOrders.push(order);
          continue;
        }
        // If no production sequence defined, skip this order
        continue;
      }

      // Find current department index in sequence
      const currentDeptIndex = departmentsInSequence.findIndex(
        d => d._id.toString() === departmentId
      );

      // STRICT CHECK: Only show orders where department is present in the production sequence
      // Exception: Special department should show orders even if not in sequence (as long as it has status entry)
      if (currentDeptIndex === -1) {
        // If this is the special department, show orders even if not in sequence
        if (departmentId === ALL_EMPLOYEES_DEPARTMENT_ID && deptStatus) {
          // Show order if status matches filter (or no filter)
          if (status && deptStatus.status !== status) {
            continue; // Skip if status filter doesn't match
          }
          filteredOrders.push(order);
          continue;
        }
        // Department is NOT in the production sequence - skip this order
        continue;
      }

      // For the first department (index 0), always show if it has the correct status
      // For other departments, only show if all previous departments are completed
      if (currentDeptIndex === 0) {
        // First department - show if status matches filter (or no filter)
        // This ensures first department sees orders immediately after admin approval
        if (status && deptStatus.status !== status) {
          continue; // Skip if status filter doesn't match
        }
        filteredOrders.push(order);
        continue;
      }

      // If this is not the first department, check if all previous departments are completed
      // Exception: Special department can see orders regardless of previous departments
      if (currentDeptIndex > 0 && departmentId !== ALL_EMPLOYEES_DEPARTMENT_ID) {
        let allPreviousCompleted = true;
        for (let i = 0; i < currentDeptIndex; i++) {
          const prevDept = departmentsInSequence[i];
          const prevDeptStatus = order.departmentStatuses?.find(
            (ds) => {
              const deptId = typeof ds.department === 'object' ? ds.department._id?.toString() : ds.department?.toString();
              return deptId === prevDept._id.toString();
            }
          );
          
          // If previous department doesn't exist or is not completed, don't show this order
          if (!prevDeptStatus || prevDeptStatus.status !== "completed") {
            allPreviousCompleted = false;
            break;
          }
        }
        
        if (!allPreviousCompleted) {
          continue; // Skip this order - previous departments not completed yet
        }
      }

      // If status filter is specified, match it exactly
      if (status && deptStatus.status !== status) {
        continue;
      }

      // Order passed all checks - include it
      filteredOrders.push(order);
    }

    // Convert uploaded design buffers to base64 for frontend (only if needed)
    // Performance: Only convert images when explicitly requested via query param
    const includeImages = req.query.includeImages === 'true';
    const ordersWithImages = filteredOrders.map((order) => {
      const orderObj = order.toObject();
      
      // Only convert images if explicitly requested (for detail views)
      // For list views, exclude image data to reduce payload size
      if (includeImages) {
        if (order.uploadedDesign?.frontImage?.data) {
          orderObj.uploadedDesign.frontImage.data = `data:${order.uploadedDesign.frontImage.contentType};base64,${order.uploadedDesign.frontImage.data.toString("base64")}`;
        }
        if (order.uploadedDesign?.backImage?.data) {
          orderObj.uploadedDesign.backImage.data = `data:${order.uploadedDesign.backImage.contentType};base64,${order.uploadedDesign.backImage.data.toString("base64")}`;
        }
      } else {
        // Remove image data to reduce payload size for list views
        if (orderObj.uploadedDesign?.frontImage) {
          orderObj.uploadedDesign.frontImage.data = null;
          orderObj.uploadedDesign.frontImage.hasData = true; // Flag to indicate data exists
        }
        if (orderObj.uploadedDesign?.backImage) {
          orderObj.uploadedDesign.backImage.data = null;
          orderObj.uploadedDesign.backImage.hasData = true; // Flag to indicate data exists
        }
      }

      return orderObj;
    });

    return res.json({
      success: true,
      data: ordersWithImages,
      department: {
        _id: department._id,
        name: department.name,
        sequence: department.sequence,
      },
      totalOrders: ordersWithImages.length,
      message: `Found ${ordersWithImages.length} order(s) where this department is in the production sequence`,
    });
  } catch (err) {
    console.log("GET DEPARTMENT ORDERS ERROR ===>", err);
    return res.status(500).json({ error: err.message });
  }
};


