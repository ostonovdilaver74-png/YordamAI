const express = require("express");

const {
  getPlans,
  getMyPlan,
  updateUserPlanByAdmin,
  cancelUserPlanByAdmin,
  getUsersByPlan,
} = require("../controllers/planController");

const {
  protect,
  requireAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getPlans);

router.get("/me", protect, getMyPlan);

router.get(
  "/admin/users",
  protect,
  requireAdmin,
  getUsersByPlan
);

router.patch(
  "/admin/users/:userId",
  protect,
  requireAdmin,
  updateUserPlanByAdmin
);

router.post(
  "/admin/users/:userId/cancel",
  protect,
  requireAdmin,
  cancelUserPlanByAdmin
);

module.exports = router;