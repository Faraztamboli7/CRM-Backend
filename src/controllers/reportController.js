const pool = require("../config/db");

// =====================================================
// 1. DASHBOARD SUMMARY
// =====================================================

const getDashboardReport = async (req, res) => {
    try {

        // =============================================
        // ADMIN DASHBOARD
        // =============================================

        if (req.user.role === "ADMIN") {

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

            return res.status(200).json({
                success: true,
                message: "Admin dashboard report fetched successfully",
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
        }


        // =============================================
        // SALES PERSON DASHBOARD
        // =============================================

        if (req.user.role === "SALES_PERSON") {

            const userId = req.user.id;

            const result = await pool.query(`
                SELECT

                    -- Leads
                    (
                        SELECT COUNT(*)
                        FROM leads
                        WHERE assigned_to = $1
                    ) AS total_leads,

                    -- Contacts
                    (
                        SELECT COUNT(*)
                        FROM contacts
                        WHERE owner_id = $1
                    ) AS total_contacts,

                    -- Customers
                    (
                        SELECT COUNT(*)
                        FROM customers
                        WHERE assigned_to = $1
                    ) AS total_customers,

                    -- Deals
                    (
                        SELECT COUNT(*)
                        FROM deals
                        WHERE assigned_to = $1
                    ) AS total_deals,

                    -- Won deals
                    (
                        SELECT COUNT(*)
                        FROM deals
                        WHERE assigned_to = $1
                        AND UPPER(stage) = 'CLOSED_WON'
                    ) AS won_deals,

                    -- Lost deals
                    (
                        SELECT COUNT(*)
                        FROM deals
                        WHERE assigned_to = $1
                        AND UPPER(stage) = 'CLOSED_LOST'
                    ) AS lost_deals,

                    -- Sales
                    (
                        SELECT COUNT(*)
                        FROM sales
                        WHERE assigned_to = $1
                    ) AS total_sales,

                    -- Revenue
                    (
                        SELECT COALESCE(SUM(final_amount), 0)
                        FROM sales
                        WHERE assigned_to = $1
                    ) AS total_revenue,

                    -- Pending follow-ups
                    (
                        SELECT COUNT(*)
                        FROM follow_ups
                        WHERE assigned_to = $1
                        AND completed_at IS NULL
                    ) AS pending_follow_ups,

                    -- Overdue follow-ups
                    (
                        SELECT COUNT(*)
                        FROM follow_ups
                        WHERE assigned_to = $1
                        AND completed_at IS NULL
                        AND scheduled_at < CURRENT_TIMESTAMP
                    ) AS overdue_follow_ups

            `, [userId]);

            const data = result.rows[0];

            const totalLeads = Number(data.total_leads);
            const wonDeals = Number(data.won_deals);

            const conversionRate =
                totalLeads > 0
                    ? Number(((wonDeals / totalLeads) * 100).toFixed(2))
                    : 0;

            return res.status(200).json({
                success: true,
                message: "Sales person dashboard report fetched successfully",
                data: {
                    total_leads: totalLeads,
                    total_contacts: Number(data.total_contacts),
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
        }


        // =============================================
        // OTHER ROLES
        // =============================================

        return res.status(403).json({
            success: false,
            message: "Dashboard access not allowed for this role"
        });

    } catch (error) {

        console.error("Dashboard report error:", error);

        return res.status(500).json({
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

// =====================================================
// 6. INDIVIDUAL SALES PERSON PERFORMANCE
// =====================================================

const getSalesPersonPerformance = async (req, res) => {
    try {
        const { userId } = req.params;

        // Only ADMIN can view another salesperson's data.
        // SALES_PERSON can only view their own data.
        if (
            req.user.role === "SALES_PERSON" &&
            Number(userId) !== Number(req.user.id)
        ) {
            return res.status(403).json({
                success: false,
                message: "You can only view your own performance"
            });
        }

        // Check user
        const userResult = await pool.query(
            `
            SELECT
                u.id,
                u.name,
                u.email,
                u.status,
                r.name AS role
            FROM users u
            JOIN roles r
                ON u.role_id = r.id
            WHERE u.id = $1
            `,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Sales person not found"
            });
        }

        const user = userResult.rows[0];

        if (user.role !== "SALES_PERSON") {
            return res.status(400).json({
                success: false,
                message: "Selected user is not a sales person"
            });
        }

        // Leads
        const leadsResult = await pool.query(
            `
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
            WHERE assigned_to = $1
            `,
            [userId]
        );

        // Deals
        const dealsResult = await pool.query(
            `
            SELECT
                COUNT(*) AS total_deals,

                COUNT(*) FILTER (
                    WHERE UPPER(status) = 'OPEN'
                ) AS open_deals,

                COUNT(*) FILTER (
                    WHERE UPPER(stage) = 'CLOSED_WON'
                ) AS won_deals,

                COUNT(*) FILTER (
                    WHERE UPPER(stage) = 'CLOSED_LOST'
                ) AS lost_deals,

                COALESCE(
                    SUM(amount) FILTER (
                        WHERE UPPER(stage) = 'CLOSED_WON'
                    ),
                    0
                ) AS won_deal_value

            FROM deals
            WHERE assigned_to = $1
            `,
            [userId]
        );

        // Customers
        const customersResult = await pool.query(
            `
            SELECT
                COUNT(*) AS total_customers
            FROM customers
            WHERE assigned_to = $1
            `,
            [userId]
        );

        // Sales
        const salesResult = await pool.query(
            `
            SELECT
                COUNT(*) AS total_sales,
                COALESCE(SUM(final_amount), 0) AS total_revenue
            FROM sales
            WHERE assigned_to = $1
            `,
            [userId]
        );

        // Follow-ups
        const followUpsResult = await pool.query(
            `
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
            WHERE assigned_to = $1
            `,
            [userId]
        );

        const leads = leadsResult.rows[0];
        const deals = dealsResult.rows[0];
        const customers = customersResult.rows[0];
        const sales = salesResult.rows[0];
        const followUps = followUpsResult.rows[0];

        return res.status(200).json({
            success: true,
            message: "Sales person performance fetched successfully",
            data: {
                sales_person: user,

                leads: {
                    total: Number(leads.total_leads),
                    new: Number(leads.new_leads),
                    qualified: Number(leads.qualified_leads),
                    converted: Number(leads.converted_leads),
                    lost: Number(leads.lost_leads)
                },

                deals: {
                    total: Number(deals.total_deals),
                    open: Number(deals.open_deals),
                    won: Number(deals.won_deals),
                    lost: Number(deals.lost_deals),
                    won_value: Number(deals.won_deal_value)
                },

                customers: {
                    total: Number(customers.total_customers)
                },

                sales: {
                    total: Number(sales.total_sales),
                    revenue: Number(sales.total_revenue)
                },

                follow_ups: {
                    total: Number(followUps.total_follow_ups),
                    pending: Number(followUps.pending_follow_ups),
                    completed: Number(followUps.completed_follow_ups),
                    overdue: Number(followUps.overdue_follow_ups)
                }
            }
        });

    } catch (error) {
        console.error(
            "Sales person performance error:",
            error
        );

        return res.status(500).json({
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
    getFollowUpReport,
    getSalesPersonPerformance
};