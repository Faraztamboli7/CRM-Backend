const express = require("express");

const {
    createLead,
    getLeads,
    getLeadById,
    updateLead,
    deleteLead,
    updateLeadStatus,
    assignLead
} = require("../controllers/leadController");

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// CREATE
router.post(
    "/",
    authenticate,
    authorize("ADMIN", "SALES_PERSON"),
    createLead
);

// GET ALL
router.get(
    "/",
    authenticate,
    authorize("ADMIN", "SALES_PERSON"),
    getLeads
);

// GET ONE
router.get(
    "/:id",
    authenticate,
    authorize("ADMIN", "SALES_PERSON"),
    getLeadById
);

// UPDATE
router.put(
    "/:id",
    authenticate,
    authorize("ADMIN", "SALES_PERSON"),
    updateLead
);

// DELETE - ADMIN ONLY
router.delete(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    deleteLead
);

// UPDATE STATUS
router.patch(
    "/:id/status",
    authenticate,
    authorize("ADMIN", "SALES_PERSON"),
    updateLeadStatus
);

// ASSIGN / REASSIGN - ADMIN ONLY
router.patch(
    "/:id/assign",
    authenticate,
    authorize("ADMIN"),
    assignLead
);

module.exports = router;