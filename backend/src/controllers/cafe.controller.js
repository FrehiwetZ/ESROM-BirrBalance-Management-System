import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendReportResponse } from "../utils/report.js";
import {
  createMenuItem,
  deleteMenuItem,
  getCafeStatistics,
  getMenuItems,
  getOperationalReport,
  setMenuItemAvailability,
  updateMenuItem,
} from "../services/cafe.service.js";
import {
  validateAvailability,
  validateCafeAnalyticsQuery,
  validateCafeReportQuery,
  validateMenuItemCreate,
  validateMenuItemId,
  validateMenuItemUpdate,
} from "../validators/cafe.validators.js";
import { getMonthRange } from "../utils/date.js";

export const listMenuItems = asyncHandler(async (req, res) => {
  const items = await getMenuItems(req.user, req.ip);
  return successResponse(res, items, "Menu items fetched successfully");
});

export const addMenuItem = asyncHandler(async (req, res) => {
  const payload = validateMenuItemCreate(req.body);
  const item = await createMenuItem(req.user, payload, req.file, req.ip);
  return successResponse(res, item, "Menu item created successfully", 201);
});

export const editMenuItem = asyncHandler(async (req, res) => {
  const id = validateMenuItemId(req.params);
  const payload = validateMenuItemUpdate(req.body);
  const item = await updateMenuItem(req.user, id, payload, req.file, req.ip);
  return successResponse(res, item, "Menu item updated successfully");
});

export const removeMenuItem = asyncHandler(async (req, res) => {
  const id = validateMenuItemId(req.params);
  const result = await deleteMenuItem(req.user, id, req.ip);
  return successResponse(res, result, result.message);
});

export const markMenuItemAvailability = asyncHandler(async (req, res) => {
  const id = validateMenuItemId(req.params);
  const payload = validateAvailability(req.body);
  const item = await setMenuItemAvailability(req.user, id, payload.is_available, req.ip);
  return successResponse(res, item, "Menu item availability updated successfully");
});

export const cafeAnalytics = asyncHandler(async (req, res) => {
  const params = validateCafeAnalyticsQuery(req.query);
  const monthRange = params.month ? getMonthRange(params.month) : null;
  const dateRange = monthRange
    ? { monthStart: monthRange.start, monthEnd: monthRange.end }
    : null;
  const stats = await getCafeStatistics(req.user, dateRange, req.ip);
  return successResponse(res, stats, "Cafe analytics fetched successfully");
});

export const cafeOperationalReport = asyncHandler(async (req, res) => {
  const params = validateCafeReportQuery(req.query);
  const report = await getOperationalReport(req.user, params, req.ip);

  if (report.format === "json") {
    return successResponse(res, report.data, "Cafe operational report generated successfully");
  }

  return sendReportResponse(res, report);
});
