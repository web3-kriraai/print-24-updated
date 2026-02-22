import DesignerRequest from '../models/DesignerRequest.js';
import { createSession } from '../services/session.service.js';
import DesignerSession from '../models/DesignerSession.js';

/**
 * CREATE DESIGNER REQUEST
 * POST /api/designer-requests
 */
export const createDesignerRequest = async (req, res) => {
    try {
        const { productId, designerType, designForm } = req.body;
        const userId = req.user.id; // From auth middleware

        // Create new designer request
        const designerRequest = await DesignerRequest.create({
            user: userId,
            productId: productId || null,
            designerType: designerType || 'visual',
            designStatus: 'PendingDesign',
            designForm: designForm || {},
        });

        // Populate user details
        await designerRequest.populate('user', 'name email mobileNumber');
        if (productId) {
            await designerRequest.populate('productId', 'name image');
        }

        console.log(`[DesignerRequest] Created request ${designerRequest._id} for user ${userId}`);

        res.status(201).json({
            success: true,
            message: 'Designer request created successfully',
            request: designerRequest,
        });
    } catch (error) {
        console.error('[DesignerRequest] Create Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET DESIGNER REQUESTS (FIFO Queue)
 * GET /api/designer-requests
 */
export const getDesignerRequests = async (req, res) => {
    try {
        const { designerType, assignedDesigner } = req.query;

        const query = {
            designStatus: { $in: ['PendingDesign', 'InDesign'] },
        };

        if (designerType) {
            query.designerType = designerType;
        } else {
            // Default to both or current logic
            query.designerType = { $in: ['visual', 'physical'] };
        }

        if (assignedDesigner) {
            query.assignedDesigner = assignedDesigner;
        }

        console.log('[DEBUG] getDesignerRequests Query:', query);

        // Sort by createdAt ASC (Oldest First - FIFO)
        const requests = await DesignerRequest.find(query)
            .sort({ createdAt: 1 })
            .populate('user', 'name email mobileNumber')
            .populate('productId', 'name image');

        console.log(`[DEBUG] getDesignerRequests Found ${requests.length} requests`);

        res.json(requests);
    } catch (error) {
        console.error('[DesignerRequest] Get Requests Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET SINGLE DESIGNER REQUEST
 * GET /api/designer-requests/:id
 */
export const getDesignerRequestById = async (req, res) => {
    try {
        const { id } = req.params;

        const request = await DesignerRequest.findById(id)
            .populate('user', 'name email mobileNumber')
            .populate('productId', 'name image')
            .populate('assignedDesigner', 'name email');

        if (!request) {
            return res.status(404).json({ error: 'Designer request not found' });
        }

        res.json(request);
    } catch (error) {
        console.error('[DesignerRequest] Get Request Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * UPDATE DESIGNER REQUEST STATUS
 * PATCH /api/designer-requests/:id
 */
export const updateDesignerRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { designStatus, assignedDesigner, notes } = req.body;

        const request = await DesignerRequest.findById(id);
        if (!request) {
            return res.status(404).json({ error: 'Designer request not found' });
        }

        if (designStatus) request.designStatus = designStatus;
        if (assignedDesigner) request.assignedDesigner = assignedDesigner;
        if (notes !== undefined) request.notes = notes;

        // If status is being changed to InDesign, create a session
        let sessionId = null;
        if (designStatus === 'InDesign') {
            const designerId = assignedDesigner || req.user.id;

            // Look for existing session explicitly linked to THIS request
            let session = await DesignerSession.findOne({
                requestId: id,
                status: { $in: ['Scheduled', 'Active'] }
            });

            if (!session) {
                session = await createSession(request.user._id.toString(), designerId, request.productId || null, id);
                console.log(`[DesignerRequest] Created new session ${session._id} for request ${id} with baseDuration ${session.baseDuration}s`);
            } else {
                console.log(`[DesignerRequest] Found existing session ${session._id} for request ${id}`);
            }
            sessionId = session._id;
            request.sessionId = sessionId;
        }

        await request.save();
        await request.populate('user', 'name email mobileNumber');
        await request.populate('assignedDesigner', 'name email');

        console.log(`[DesignerRequest] Updated request ${id} - Status: ${request.designStatus}`);

        res.json({
            success: true,
            message: 'Designer request updated',
            request,
            sessionId // Return sessionId for frontend use
        });
    } catch (error) {
        console.error('[DesignerRequest] Update Error:', error);
        res.status(500).json({ error: error.message });
    }
};
