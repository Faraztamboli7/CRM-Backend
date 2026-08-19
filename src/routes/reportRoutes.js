const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
    getDashboardReport,
    getLeadReport,
    getSalesReport,
    getPerformanceReport,
    getFollowUpReport,
    getSalesPersonPerformance
} = require("../controllers/reportController");


// Dashboard
router.get(
    "/dashboard",
    authenticate,
    authorize("ADMIN", "SALES_PERSON"),
    getDashboardReport
);

// Lead analytics - ADMIN ONLY
router.get(
    "/leads",
    authenticate,
    authorize("ADMIN"),
    getLeadReport
);

// Sales analytics - ADMIN ONLY
router.get(
    "/sales",
    authenticate,
    authorize("ADMIN"),
    getSalesReport
);

// Salesperson performance - ADMIN ONLY
router.get(
    "/performance",
    authenticate,
    authorize("ADMIN"),
    getPerformanceReport
);

// Follow-up analytics - ADMIN ONLY
router.get(
    "/follow-ups",
    authenticate,
    authorize("ADMIN"),
    getFollowUpReport
);

// Individual sales person performance

router.get(
    "/performance/:userId",
    authenticate,
    authorize("ADMIN", "SALES_PERSON"),
    getSalesPersonPerformance
);

module.exports = router;