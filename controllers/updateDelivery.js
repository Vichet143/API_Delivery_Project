const DeliveryModel = require("../modals/createdelivery");

const updateDeliveryStatus = async (req, res) => {
  try {
    const user_id = req.user.id; // comes from authenticate middleware
    const { status } = req.body;

    if (!status) return res.status(400).json({ message: "Status is required" });

    // Update delivery where user_id matches the logged-in user
    const { data, error } = await DeliveryModel.updateStatus(user_id, status);

    if (error) return res.status(400).json({ message: error.message });
    if (!data || data.length === 0) return res.status(404).json({ message: "No delivery found for this user" });

    return res.status(200).json({
      message: `Your delivery status updated to "${status}"`,
      data: data[0],
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = updateDeliveryStatus;
