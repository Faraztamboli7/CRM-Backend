const pool = require("../config/db");

// =====================================================
// 1. DASHBOARD SUMMARY
// =====================================================

const getDashboardReport = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM leads) AS total_leads,

                (SELECT COUNT(*) FROM customers) AS total_customers,

                (SELECT COUNT(*) FROM deals) AS total_deals,

                (
                    SELECT COUNT(*)
                    FROM deals
                    WHERE UPPER(stage) = 'CLOSED_WON'
                ) AS won_deals,

                (
                    SELECT COUNT(*)
                    FROM deals
                    WHERE UPPER(stage) = 'CLOSED_LOST'
                ) AS lost_deals,

                (SELECT COUNT(*) FROM sales) AS total_sales,

                (
                    SELECT COALESCE(SUM(final_amount), 0)
                    FROM sales
                ) AS total_revenue,

                (
                    SELECT COUNT(*)
                    FROM follow_ups
                    WHERE completed_at IS NULL
                ) AS pending_follow_ups,

                (
                    SELECT COUNT(*)
                    FROM follow_ups
                    WHERE completed_at IS NULL
                    AND scheduled_at < CURRENT_TIMESTAMP
                ) AS overdue_follow_ups
        `);

        const data = result.rows[0];

        const totalLeads = Number(data.total_leads);
        const wonDeals = Number(data.won_deals);

        const conversionRate =
            totalLeads > 0
                ? Number(((wonDeals / totalLeads) * 100).toFixed(2))
                : 0;

        res.status(200).json({
            success: true,
            message: "Dashboard report fetched successfully",
            data: {
                total_leads: totalLeads,
                total_customers: Number(data.total_customers),
                total_deals: Number(data.total_deals),
                won_deals: wonDeals,
                lost_deals: Number(data.lost_deals),
                total_sales: Number(data.total_sales),
                total_revenue: Number(data.total_revenue),
                pending_follow_ups: Number(data.pending_follow_ups),
                overdue_follow_ups: Number(data.overdue_follow_ups),
                conversion_rate: conversionRate
            }
        });

    } catch (error) {
        console.error("Dashboard report error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// =====================================================
// 2. LEAD ANALYTICS
// =====================================================

const getLeadReport = async (req, res) => {
    try {

        const summary = await pool.query(`
            SELECT
                COUNT(*) AS total_leads,

                COUNT(*) FILTER (
                    WHERE UPPER(status) = 'NEW'
                ) AS new_leads,

                COUNT(*) FILTER (
                    WHERE UPPER(status) = 'QUALIFIED'
                ) AS qualified_leads,

                COUNT(*) FILTER (
                    WHERE UPPER(status) = 'CONVERTED'
                ) AS converted_leads,

                COUNT(*) FILTER (
                    WHERE UPPER(status) = 'LOST'
                ) AS lost_leads
            FROM leads
        `);

        const statusBreakdown = await pool.query(`
            SELECT
                status,
                COUNT(*) AS count
            FROM leads
            GROUP BY status
            ORDER BY count DESC
        `);

        res.status(200).json({
            success: true,
            message: "Lead report fetched successfully",
            data: {
                summary: summary.rows[0],
                status_breakdown: statusBreakdown.rows
            }
        });

    } catch (error) {
        console.error("Lead report error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// =====================================================
// 3. SALES ANALYTICS
// =====================================================

const getSalesReport = async (req, res) => {
    try {

        const summary = await pool.query(`
            SELECT
                COUNT(*) AS total_sales,

                COALESCE(SUM(sale_amount), 0) AS gross_sales,

                COALESCE(SUM(discount), 0) AS total_discount,

                COALESCE(SUM(tax), 0) AS total_tax,

                COALESCE(SUM(final_amount), 0) AS total_revenue,

                COALESCE(AVG(final_amount), 0) AS average_sale
            FROM sales
        `);

        const paymentStatus = await pool.query(`
            SELECT
                payment_status,
                COUNT(*) AS count,
                COALESCE(SUM(final_amount), 0) AS amount
            FROM sales
            GROUP BY payment_status
            ORDER BY count DESC
        `);

        const paymentMethod = await pool.query(`
            SELECT
                payment_method,
                COUNT(*) AS count,
                COALESCE(SUM(final_amount), 0) AS amount
            FROM sales
            GROUP BY payment_method
            ORDER BY count DESC
        `);

        res.status(200).json({
            success: true,
            message: "Sales report fetched successfully",
            data: {
                summary: summary.rows[0],
                payment_status: paymentStatus.rows,
                payment_methods: paymentMethod.rows
            }
        });

    } catch (error) {
        console.error("Sales report error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// =====================================================
// 4. SALES PERSON PERFORMANCE
// =====================================================

const getPerformanceReport = async (req, res) => {
    try {

        const result = await pool.query(`
            SELECT
                u.id,
                u.name,

                COUNT(DISTINCT l.id) AS total_leads,

                COUNT(DISTINCT d.id) AS total_deals,

                COUNT(DISTINCT d.id) FILTER (
                    WHERE UPPER(d.stage) = 'CLOSED_WON'
                ) AS won_deals,

                COUNT(DISTINCT d.id) FILTER (
                    WHERE UPPER(d.stage) = 'CLOSED_LOST'
                ) AS lost_deals,

                COUNT(DISTINCT s.id) AS total_sales,

                COALESCE(SUM(s.final_amount), 0) AS total_revenue

            FROM users u

            LEFT JOIN leads l
                ON l.assigned_to = u.id

            LEFT JOIN deals d
                ON d.assigned_to = u.id

            LEFT JOIN sales s
                ON s.assigned_to = u.id

            GROUP BY u.id, u.name

            ORDER BY total_revenue DESC
        `);

        res.status(200).json({
            success: true,
            message: "Sales performance report fetched successfully",
            data: result.rows
        });

    } catch (error) {
        console.error("Performance report error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// =====================================================
// 5. FOLLOW-UP ANALYTICS
// =====================================================

const getFollowUpReport = async (req, res) => {
    try {

        const summary = await pool.query(`
            SELECT
                COUNT(*) AS total_follow_ups,

                COUNT(*) FILTER (
                    WHERE completed_at IS NULL
                ) AS pending_follow_ups,

                COUNT(*) FILTER (
                    WHERE completed_at IS NOT NULL
                ) AS completed_follow_ups,

                COUNT(*) FILTER (
                    WHERE completed_at IS NULL
                    AND scheduled_at < CURRENT_TIMESTAMP
                ) AS overdue_follow_ups
            FROM follow_ups
        `);

        const typeBreakdown = await pool.query(`
            SELECT
                follow_up_type,
                COUNT(*) AS count
            FROM follow_ups
            GROUP BY follow_up_type
            ORDER BY count DESC
        `);

        const statusBreakdown = await pool.query(`
            SELECT
                status,
                COUNT(*) AS count
            FROM follow_ups
            GROUP BY status
            ORDER BY count DESC
        `);

        res.status(200).json({
            success: true,
            message: "Follow-up report fetched successfully",
            data: {
                summary: summary.rows[0],
                type_breakdown: typeBreakdown.rows,
                status_breakdown: statusBreakdown.rows
            }
        });

    } catch (error) {
        console.error("Follow-up report error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


module.exports = {
    getDashboardReport,
    getLeadReport,
    getSalesReport,
    getPerformanceReport,
    getFollowUpReport
};