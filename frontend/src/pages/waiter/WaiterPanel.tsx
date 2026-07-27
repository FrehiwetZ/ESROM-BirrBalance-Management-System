import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { useTranslation } from "react-i18next";
import { Html5QrcodeScanner } from "html5-qrcode";
import { formatETB } from "../../utils/format";
import {
  QrCode,
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  Lock,
  UtensilsCrossed,
  RotateCcw,
} from "lucide-react";

export default function WaiterPanel() {
  const {
    user,
    apiGet,
    apiPost,
    addToOfflineQueue,
    isOffline,
    offlineQueue,
    offlineOrderResult,
    clearOfflineOrderResult,
  } = useApp();
  const { t } = useTranslation();

  // Workflow states: 'scan' | 'order' | 'success'
  const [step, setStep] = useState<
    "scan" | "verifying" | "order" | "success"
  >("scan");

  // Scanned session state
  const [scannedEmployee, setScannedEmployee] = useState<any | null>(null);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [cafeId, setCafeId] = useState<number | null>(null);
  const [lookupError, setLookupError] = useState("");

  // Cart / Menu states
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<{ item: any; quantity: number }[]>([]);

  // Transaction Authorization (employee's own password)
  const [employeePassword, setEmployeePassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [finalTxId, setFinalTxId] = useState("");
  const [finalTotal, setFinalTotal] = useState(0);
  const [finalRemaining, setFinalRemaining] = useState(0);
  const [retryCountdown, setRetryCountdown] = useState(15);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [offlineOrderQueued, setOfflineOrderQueued] = useState(false);

  // HTML5 QR Scanner
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (offlineQueue.length === 0) return;

    setRetryCountdown(15);
    const interval = setInterval(() => {
      setRetryCountdown((seconds) => (seconds <= 1 ? 15 : seconds - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [offlineQueue.length]);

  useEffect(() => {
    if (offlineQueue.length === 0) {
      setAuthError("");
      return;
    }

    setAuthError(
      `Connection lost — order saved. Retrying automatically in ${retryCountdown}s.`,
    );
  }, [offlineQueue.length, retryCountdown]);

  useEffect(() => {
    if (!offlineOrderResult) return;

    setFinalTxId(offlineOrderResult.order_id);
    setFinalTotal(offlineOrderResult.total_amount);
    setFinalRemaining(offlineOrderResult.remaining_balance);
    setEmployeePassword("");
    setAuthError("");
    setStep("success");
    clearOfflineOrderResult();
  }, [offlineOrderResult, clearOfflineOrderResult]);

  // Load menu items
  useEffect(() => {
    const loadMenu = async () => {
      try {
        const res = await apiGet("/api/waiter/menu");
        setMenuItems(res.data.filter((i: any) => i.is_available));
      } catch (err) {
        console.error(err);
      }
    };
    loadMenu();
  }, []);

  // HTML5 QR code scanning initialization
  useEffect(() => {
    if (step === "scan" && !scannerRef.current) {
      setTimeout(() => {
        const qrContainer = document.getElementById("qr-scanner-viewport");
        if (qrContainer) {
          try {
            const scanner = new Html5QrcodeScanner(
              "qr-scanner-viewport",
              { fps: 10, qrbox: { width: 250, height: 250 } },
              false,
            );

            scanner.render(
              async (decodedText) => {
                console.log("QR DETECTED:", decodedText);
                scanner.clear();
                scannerRef.current = null;
                setStep("verifying");
                await handleQrScan(decodedText.trim());
              },
              (err) => {
                // Ignore silent scans
              },
            );

            scannerRef.current = scanner;
          } catch (e) {
            console.warn("QR Code Scanner initialization failed or skipped", e);
          }
        }
      }, 500);
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {}
        scannerRef.current = null;
      }
    };
  }, [step]);

  // Handle scanned encrypted QR code
  const handleQrScan = async (qrToken: string) => {
    console.log("handleQrScan called with:", qrToken);
    if (!qrToken.trim()) return;
    setLookupError("");

    try {
      console.log("About to call /api/waiter/scan");
      const res = await apiPost("/api/waiter/scan", { qr_token: qrToken });
      console.log("Scan response:", res);
      setScannedEmployee(res.data.employee);
      setQrSessionId(res.data.qr_session_id);
      setCafeId(res.data.cafe_id);
      setCart([]);
      setOfflineOrderQueued(false);
      setStep("order");
    } catch (e: any) {
      setLookupError(e.message || "Error verifying QR token.");
      setStep("scan");
    }
  };

  const getBasketTotal = () => {
    return cart.reduce((sum, c) => sum + Number(c.item.price) * c.quantity, 0);
  };

  const addToCart = (item: any) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.item.id === item.id);
      if (idx !== -1) {
        return prev.map((c, i) =>
          i === idx ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const adjustCartQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.item.id === itemId);
      if (idx === -1) return prev;
      const newQuantity = prev[idx].quantity + delta;
      if (newQuantity <= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      return prev.map((c, i) =>
        i === idx ? { ...c, quantity: newQuantity } : c,
      );
    });
  };

  // Perform secure authorized debit — requires the EMPLOYEE's own password
  const handleConfirmDebit = async () => {
    if (!employeePassword) {
      setAuthError(
        "Please have the employee enter their password to authorize.",
      );
      return;
    }
    setAuthError("");
    setIsAuthorizing(true);

    try {
      const formattedItems = cart.map((c) => ({
        menu_item_id: c.item.id,
        quantity: c.quantity,
      }));

      const res = await apiPost("/api/waiter/order", {
        employee_id: scannedEmployee.id,
        cafe_id: cafeId,
        qr_session_id: qrSessionId,
        password: employeePassword,
        items: formattedItems,
      });

      try {
        const audioCtx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
        const oscillator = audioCtx.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } catch (e) {
        console.log("Audio beep blocked or unsupported");
      }

      setFinalTxId(res.data.order_id);
      setFinalTotal(res.data.total_amount);
      setFinalRemaining(res.data.remaining_balance);
      setEmployeePassword("");
      setStep("success");
    } catch (e: any) {
      const isNetworkError = e.message === "Failed to fetch" || isOffline;

      if (isNetworkError) {
        const formattedItems = cart.map((c) => ({
          menu_item_id: c.item.id,
          quantity: c.quantity,
        }));
        addToOfflineQueue({
          employee_id: scannedEmployee.id,
          cafe_id: cafeId,
          qr_session_id: qrSessionId,
          password: employeePassword,
          items: formattedItems,
        });
        setOfflineOrderQueued(true);
        setAuthError(
          "Connection lost — order saved and will submit automatically once you're back online.",
        );
      } else {
        setAuthError(
          e.message || "Authorization failed. Please check the password.",
        );
      }

      try {
        const audioCtx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
        const oscillator = audioCtx.createOscillator();
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        oscillator.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } catch (e) {}
    } finally {
      setIsAuthorizing(false);
    }
  };

  if (!user || user.role !== "waiter") return null;

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 md:py-10 space-y-8 font-sans">
      {/* Header banner */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-primary tracking-tight">
            Waiter Sales Portal
          </h1>
          <p className="text-[10px] text-subtle-text font-medium uppercase tracking-wider mt-1">
            Logged in: <strong>{user.fullName}</strong> &bull; Cashier Waiter
            Mode
          </p>
        </div>
        {step !== "scan" && (
          <button
            id="waiter-reset-btn"
            onClick={() => {
              setScannedEmployee(null);
              setQrSessionId(null);
              setCafeId(null);
              setCart([]);
              setOfflineOrderQueued(false);
              setStep("scan");
            }}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all focus:outline-none"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Scan</span>
          </button>
        )}
      </div>

      {step === "scan" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between space-y-6 max-w-lg mx-auto">
          <div className="text-center md:text-left">
            <h3 className="text-sm font-black text-primary tracking-tight">
              Scan Employee QR Token
            </h3>
            <p className="text-[10px] text-subtle-text font-medium mt-0.5">
              Place coupon in front of front-facing or mobile camera
            </p>
          </div>

          {lookupError && (
            <div className="p-3.5 bg-red-50 rounded-2xl border border-red-100 text-danger text-xs font-bold flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{lookupError}</span>
            </div>
          )}

          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
            <div
              id="qr-scanner-viewport"
              className="w-full max-w-sm rounded-2xl overflow-hidden shadow-inner text-xs font-mono font-bold text-slate-500"
            />
            <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <QrCode className="w-4 h-4 text-slate-300" />
              <span>Camera scan state online</span>
            </div>
          </div>
        </div>
      )}

      {step === "verifying" && (
        <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm max-w-lg mx-auto text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full border-4 border-slate-200 border-t-primary animate-spin" />
          <h3 className="text-sm font-black text-primary">Verifying QR code...</h3>
          <p className="text-xs text-subtle-text">
            Please wait while we verify the employee QR token.
          </p>
        </div>
      )}

      {step === "order" && scannedEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-primary font-black flex items-center justify-center uppercase shadow-sm">
                  {scannedEmployee.fullName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-primary">
                    {scannedEmployee.fullName}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">
                    {scannedEmployee.employeeId} &bull;{" "}
                    {scannedEmployee.department}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  Available Balance
                </span>
                <span className="text-base font-black text-success">
                  {formatETB(scannedEmployee.balance)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
              <h3 className="text-xs font-black text-primary uppercase tracking-wider">
                Quick Select Meals
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                {menuItems.map((item) => (
                  <button
                    id={`waiter-add-${item.id}`}
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="p-3 border border-slate-200 hover:border-primary rounded-2xl text-left hover:bg-slate-50/30 transition-all space-y-2 flex flex-col justify-between h-28"
                  >
                    <span className="font-extrabold text-primary line-clamp-2 leading-tight">
                      {item.name}
                    </span>
                    <div className="flex justify-between items-end w-full">
                      <span className="text-[10px] font-bold text-secondary">
                        {formatETB(item.price)}
                      </span>
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        +
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-5 text-xs">
            <div>
              <h3 className="text-sm font-black text-primary tracking-tight">
                Active Tray Details
              </h3>
              <p className="text-[10px] text-subtle-text font-medium mt-0.5">
                Meal selections ready to be authorized
              </p>
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-300 flex flex-col items-center justify-center space-y-2">
                <UtensilsCrossed className="w-8 h-8" />
                <p className="font-medium">No items in tray</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto pr-1">
                  {cart.map((c) => (
                    <div
                      key={c.item.id}
                      className="py-3 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-primary truncate">
                          {c.item.name}
                        </h5>
                        <p className="text-[10px] text-slate-400">
                          ETB {c.item.price} each
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          id={`waiter-cart-dec-${c.item.id}`}
                          onClick={() => adjustCartQuantity(c.item.id, -1)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 min-h-[32px] min-w-[32px] flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-primary w-4 text-center">
                          {c.quantity}
                        </span>
                        <button
                          id={`waiter-cart-inc-${c.item.id}`}
                          onClick={() => adjustCartQuantity(c.item.id, 1)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 min-h-[32px] min-w-[32px] flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Remaining Balance:</span>
                    <span>{formatETB(scannedEmployee.balance)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-primary pt-2 border-t mt-1">
                    <span>Total Debit:</span>
                    <span className="text-secondary font-black">
                      {formatETB(getBasketTotal())}
                    </span>
                  </div>
                </div>

                {getBasketTotal() > scannedEmployee.balance && (
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-danger text-[10px] font-bold flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>Overdraft error! Employee balance is insufficient.</p>
                  </div>
                )}

                {getBasketTotal() <= scannedEmployee.balance && (
                  <div className="space-y-3.5 pt-3 border-t">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Employee Password (for their approval) *</span>
                      </label>
                      <input
                        id="employee-auth-password"
                        type="password"
                        required
                        placeholder="Have the employee type their password..."
                        value={employeePassword}
                        onChange={(e) => setEmployeePassword(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-accent"
                      />
                    </div>

                    {authError && (
                      <p className="text-[10px] font-bold text-danger bg-red-50 p-2.5 rounded-xl border border-red-200">
                        {authError}
                      </p>
                    )}

                    <button
                      id="waiter-debit-submit-btn"
                      onClick={handleConfirmDebit}
                      disabled={
                        !employeePassword ||
                        isAuthorizing ||
                        offlineOrderQueued
                      }
                      className="w-full py-3.5 bg-primary hover:bg-secondary text-white font-bold uppercase text-[10px] tracking-wider rounded-xl transition-all shadow-md disabled:opacity-45"
                    >
                      {isAuthorizing
                        ? "Authorizing..."
                        : offlineOrderQueued
                          ? "Saved Offline"
                          : "Authorize & Debit Meal"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {step === "success" && (
        <div className="bg-white rounded-3xl p-8 max-w-md mx-auto shadow-xl border border-slate-100 text-center space-y-6 animate-scaleIn text-xs">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-green-50 text-success flex items-center justify-center shadow">
              <CheckCircle className="w-9 h-9" />
            </div>
            <h2 className="text-lg font-black text-primary tracking-tight">
              Debit Transaction Approved!
            </h2>
            <p className="text-subtle-text">
              The corporate meal coupon has been successfully processed.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2">
            <p className="text-[9px] font-bold text-subtle-text uppercase">
              Transaction Record
            </p>
            <div className="flex justify-between font-mono">
              <span>Receipt ID:</span>
              <span className="font-bold text-primary">{finalTxId}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span>Debited Cost:</span>
              <span className="font-bold text-danger">
                -{formatETB(finalTotal)}
              </span>
            </div>
            <div className="flex justify-between font-mono">
              <span>Remaining Balance:</span>
              <span className="font-bold text-success">
                {formatETB(finalRemaining)}
              </span>
            </div>
            <div className="flex justify-between font-mono pt-1.5 border-t">
              <span>Approved For:</span>
              <span className="font-bold text-primary">
                {scannedEmployee?.fullName}
              </span>
            </div>
          </div>

          <button
            id="waiter-success-close-btn"
            onClick={() => {
              setScannedEmployee(null);
              setQrSessionId(null);
              setCafeId(null);
              setCart([]);
              setStep("scan");
            }}
            className="w-full py-3.5 bg-primary hover:bg-secondary text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md min-h-[44px]"
          >
            Start Another Transaction
          </button>
        </div>
      )}
    </div>
  );
}
