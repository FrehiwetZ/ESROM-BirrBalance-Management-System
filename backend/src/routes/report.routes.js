import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  generateXLSX,
  generateCSV,
  generatePDF,
} from "../services/report.service.js";

const router = express.Router();

router.use(authenticate);
router.use(requireRole("company_manager", "cafe_manager"));

router.get("/monthly", async (req, res) => {
  try {
    const { month, year, format } = req.query;

    if (!month || !year || !format) {
      return res.status(400).json({
        success: false,
        message: "month, year and format are required",
        data: null,
      });
    }

    if (format === "xlsx") {
      const buffer = await generateXLSX(parseInt(month), parseInt(year));
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=report-${month}-${year}.xlsx`,
      );
      return res.send(buffer);
    }

    if (format === "csv") {
      const csv = await generateCSV(parseInt(month), parseInt(year));
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=report-${month}-${year}.csv`,
      );
      return res.send(csv);
    }

    if (format === "pdf") {
      const pdf = await generatePDF(parseInt(month), parseInt(year));
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=report-${month}-${year}.pdf`,
      );
      return res.send(pdf);
    }

    return res.status(400).json({
      success: false,
      message: "Invalid format. Use xlsx, csv or pdf",
      data: null,
    });
  } catch (error) {
    console.error("Report error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
});

export default router;
