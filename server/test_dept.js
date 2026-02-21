import mongoose from 'mongoose';
import Order from './src/models/orderModal.js';
import Department from './src/models/departmentModal.js';
import Product from './src/models/productModal.js';
import { User } from './src/models/User.js';
import Category from './src/models/categoryModal.js';
import SubCategory from './src/models/subCategoryModal.js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const departmentId = '69991c174b47188f1c564b50'; // Graphic team

async function fetchOrders() {
    await mongoose.connect(process.env.MONGO_URI);

    let query = {
        "departmentStatuses": {
            $elemMatch: {
                department: departmentId,
            }
        },
        status: { $in: ["approved", "processing", "completed"] }
    };

    const orders = await Order.find(query)
        .select("-uploadedDesign -notes -adminNotes -designTimeline -productionTimeline -courierTimeline -productionDetails")
        .populate("user", "name email")
        .populate({
            path: "product",
            select: "name image basePrice subcategory gstPercentage productionSequence",
            populate: [
                { path: "subcategory", select: "name image", populate: { path: "category", select: "name" } },
                { path: "productionSequence", select: "name sequence _id" },
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
        .lean();

    console.log(`Initial orders matched: ${orders.length}`);

    const filteredOrders = [];

    for (const order of orders) {
        const deptStatus = order.departmentStatuses?.find(
            (ds) => {
                const deptId = typeof ds.department === 'object' ? ds.department._id?.toString() : ds.department?.toString();
                return deptId === departmentId;
            }
        );

        if (!deptStatus) {
            console.log(`Skipping order ${order._id} - No deptStatus matched`);
            continue;
        }

        const product = order.product;
        if (!product) {
            console.log(`Skipping order ${order._id} - No product`);
            continue;
        }

        let departmentsInSequence = [];
        const productionSequence = product.productionSequence || [];

        if (productionSequence.length > 0) {
            departmentsInSequence = productionSequence.map(dept => {
                if (typeof dept === 'object' && dept !== null) {
                    return {
                        _id: dept._id?.toString() || dept.toString(),
                        name: dept.name,
                        sequence: dept.sequence
                    };
                }
                return { _id: dept?.toString() };
            });
        } else {
            console.log(`Skipping order ${order._id} - No prod seq`);
            continue;
        }

        const currentDeptIndex = departmentsInSequence.findIndex(
            d => d._id === departmentId
        );

        console.log(`Order ${order._id} currentDeptIndex: ${currentDeptIndex}, seqLength: ${departmentsInSequence.length}`);

        if (currentDeptIndex === -1) {
            continue;
        }

        if (currentDeptIndex === 0) {
            filteredOrders.push(order);
            continue;
        }

        if (currentDeptIndex > 0 && departmentId !== "69327f9850162220fa7bff29") {
            let allPreviousCompleted = true;
            for (let i = 0; i < currentDeptIndex; i++) {
                const prevDept = departmentsInSequence[i];
                const prevDeptStatus = order.departmentStatuses?.find(
                    (ds) => {
                        const deptId = typeof ds.department === 'object' ? ds.department._id?.toString() : ds.department?.toString();
                        return deptId === prevDept._id;
                    }
                );

                if (!prevDeptStatus || prevDeptStatus.status !== "completed") {
                    allPreviousCompleted = false;
                    break;
                }
            }

            if (!allPreviousCompleted) {
                console.log(`Skipping order ${order._id} - previous incomplete`);
                continue;
            }
        }

        filteredOrders.push(order);
    }

    // Check missing orders
    const allOrders = await Order.find({ orderNumber: 'ORD-1771642774872-2219' });
    console.log(`\n\nSpecific test order:`, allOrders.length > 0 ? allOrders[0].orderNumber : 'Not found');
    if (allOrders.length > 0) {
        console.log('Status:', allOrders[0].status);
        console.log('Dept Statuses:', allOrders[0].departmentStatuses);
    }

    console.log(`Final returned orders: ${filteredOrders.length}`);
    mongoose.disconnect();
}

fetchOrders().catch(console.error);
