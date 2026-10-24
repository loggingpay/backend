const {
  getPaymentEventDetails,
  getPaymentEventSummary,
  getPaymentEventAnalytics,
} = require("../models/paymentEvents.model");

const getPaymentEventsController = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        message: "page must be >= 1 and limit must be between 1 and 100",
      });
    }

    const { event_type, currency, from, to } = req.query;

    const allowedEventTypes = [
      "payment_intent.succeeded",
      "payment_intent.payment_failed",
    ];

    if (event_type && !allowedEventTypes.includes(event_type)) {
      return res.status(400).json({
        message: "Invalid event_type",
      });
    }

    if (from && Number.isNaN(Date.parse(from))) {
      return res.status(400).json({
        message: "Invalid from date",
      });
    }

    if (to && Number.isNaN(Date.parse(to))) {
      return res.status(400).json({
        message: "Invalid to date",
      });
    }

    if (from && to && new Date(from) > new Date(to)) {
      return res.status(400).json({
        message: "from date must be before or equal to to date",
      });
    }

    const result = await getPaymentEventDetails({
      tenant_id,
      event_type,
      currency,
      from,
      to,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Get payment events error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const getPaymentEventSummaryController = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const { from, to } = req.query;

    if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      return res.status(400).json({
        message: "from must use YYYY-MM-DD format",
      });
    }

    if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({
        message: "to must use YYYY-MM-DD format",
      });
    }

    if (from && Number.isNaN(Date.parse(from))) {
      return res.status(400).json({
        message: "Invalid from date",
      });
    }

    if (to && Number.isNaN(Date.parse(to))) {
      return res.status(400).json({
        message: "Invalid to date",
      });
    }

    if (from && to && from > to) {
      return res.status(400).json({
        message: "from must be before or equal to to",
      });
    }

    const summary = await getPaymentEventSummary({
      tenant_id,
      from,
      to,
    });

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (err) {
    console.error("Get payment event summary error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const getPaymentEventAnalyticsController = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const { from, to } = req.query;

    // Default to the last 30 calendar days, including today.
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

    const startDate = from || thirtyDaysAgo.toISOString().slice(0, 10);
    const endDate = to || today;

    const isValidDate = (value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    };

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(400).json({
        success: false,
        message: "Dates must use valid YYYY-MM-DD format",
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "from must be before or equal to to",
      });
    }

    const days =
      (Date.parse(`${endDate}T00:00:00Z`) -
        Date.parse(`${startDate}T00:00:00Z`)) /
      86400000;

    if (days > 364) {
      return res.status(400).json({
        success: false,
        message: "Date range cannot exceed 365 days",
      });
    }

    const analytics = await getPaymentEventAnalytics({
      tenant_id,
      from: startDate,
      to: endDate,
    });

    return res.status(200).json({
      success: true,
      range: { from: startDate, to: endDate },
      analytics,
    });
  } catch (err) {
    console.error("Get payment event analytics error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getPaymentEventsController,
  getPaymentEventSummaryController,
  getPaymentEventAnalyticsController,
};
