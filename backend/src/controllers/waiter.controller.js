import prisma from "../config/db.js";
import { comparePassword } from "../services/auth.service.js";
import { createQRSession, consumeQRSession, decryptQRToken, hashQRToken } from "../services/qr.service.js";
import { getEmployeeBalance } from "../services/balance.service.js";
import { createOrderWithBalanceDeduction } from "../services/order.service.js";
import { validateOfflineOrder } from "../validators/order.validators.js";
import { successResponse } from "../utils/response.js";
import { AppError } from "../utils/AppError.js";
import { writeAuditLog } from "../services/audit.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listWaiterMenu = asyncHandler(async (req, res) => {
  if (!req.user.cafeId) {
    throw new AppError("Waiter is not assigned to a cafe", 403);
  }

  const items = await prisma.menu_items.findMany({
    where: { cafe_id: req.user.cafeId, is_available: true },
    orderBy: { name: "asc" },
  });

  return successResponse(
    res,
    items.map((item) => ({
      id: item.id,
      cafe_id: item.cafe_id,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      image_url: item.image_url,
      is_available: item.is_available,
    })),
    "Menu items fetched successfully",
  );
});

export const scanQR = async (req, res, next) => {
  try {
    const { qr_token } = req.body;

    if (!qr_token) {
      throw new AppError("QR token is required", 400);
    }

    const decoded = decryptQRToken(qr_token);

    if (!decoded) {
      throw new AppError("Invalid or expired QR code", 400);
    }

    const employee = await prisma.users.findUnique({
      where: { id: decoded.employee_id },
      select: {
        id: true,
        fullname: true,
        employee_external_id: true,
        is_active: true,
        departments: {
          select: { name: true },
        },
        employee_qr_codes: {
          select: { token_hash: true, is_active: true, expires_at: true },
        },
      },
    });

    if (!employee || !employee.is_active) {
      throw new AppError("Employee not found or inactive", 404);
    }

    const storedQr = employee.employee_qr_codes;
    if (
      !storedQr?.is_active ||
      storedQr.token_hash !== hashQRToken(qr_token) ||
      (storedQr.expires_at && storedQr.expires_at <= new Date())
    ) {
      throw new AppError("QR code is inactive", 400);
    }

    if (!req.user.cafeId) {
      throw new AppError("Waiter is not assigned to a cafe", 403);
    }

    const balance = await getEmployeeBalance(employee.id);
    const session = await prisma.$transaction(async (tx) => {
      const qrSession = await createQRSession({
        employeeId: employee.id,
        waiterId: req.user.id,
        cafeId: req.user.cafeId,
        tx,
      });

      await writeAuditLog(
        {
          userId: req.user.id,
          action: "qr.session.create",
          entityType: "qr_sessions",
          description: `Created QR session for employee ${employee.id}`,
          ipAddress: req.ip,
        },
        tx,
      );

      return qrSession;
    });

    return successResponse(
      res,
      {
        employee: {
          id: employee.id,
          fullname: employee.fullname,
          employee_external_id: employee.employee_external_id,
          department: employee.departments?.name,
          balance,
        },
        qr_session_id: session.qrSessionId,
        session_expires_at: session.expiresAt,
      },
      "Employee verified successfully",
    );
  } catch (error) {
    next(error);
  }
};

export const createOfflineOrder = async (req, res, next) => {
  try {
    const { employee_id, password, items, cafe_id, qr_session_id } = validateOfflineOrder(req.body);

    const employee = await prisma.users.findUnique({
      where: { id: employee_id },
    });

    if (!employee || !employee.is_active) {
      throw new AppError("Employee not found or inactive", 404);
    }

    const isPasswordValid = await comparePassword(
      password,
      employee.password_hash,
    );

    if (!isPasswordValid) {
      throw new AppError("Invalid password", 401);
    }

    const result = await createOrderWithBalanceDeduction({
      employeeId: employee_id,
      cafeId: cafe_id,
      waiterId: req.user.id,
      items,
      orderMethod: "offline_qr",
      actor: req.user,
      ipAddress: req.ip,
      beforeCreate: (tx) => consumeQRSession({
        sessionId: qr_session_id,
        employeeId: employee_id,
        waiterId: req.user.id,
        cafeId: cafe_id,
        tx,
      }),
    });

    return successResponse(
      res,
      {
        order_id: result.order.id,
        order_uuid: result.order.order_uuid,
        total_amount: result.total_amount,
        remaining_balance: result.remaining_balance,
      },
      "Order created successfully",
      201,
    );
  } catch (error) {
    next(error);
  }
};
