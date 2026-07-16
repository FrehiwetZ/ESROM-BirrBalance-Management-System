import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { formatETB } from '../../utils/format';
import { normalizeMenuItem, unwrapData } from '../../utils/apiMappers';
import {
  QrCode,
  Search,
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  Lock,
  UtensilsCrossed,
  RotateCcw
} from 'lucide-react';

export default function WaiterPanel() {
  const { user, apiGet, apiPost, addToOfflineQueue, isOffline } = useApp();
  const { t } = useTranslation();

  const [step, setStep] = useState<'scan' | 'order' | 'success'>('scan');
  const [manualToken, setManualToken] = useState('');
  const [scannedEmployee, setScannedEmployee] = useState<any | null>(null);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [cafeId, setCafeId] = useState<number | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<{ item: any; quantity: number }[]>([]);
  const [employeePassword, setEmployeePassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [finalTxId, setFinalTxId] = useState('');
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const res = await apiGet('/api/waiter/menu');
        const items = unwrapData(res);
        const list = Array.isArray(items) ? items : items?.items ?? [];
        setMenuItems(list.map(normalizeMenuItem).filter((i: any) => i.available));
        if (list[0]?.cafe_id) setCafeId(Number(list[0].cafe_id));
      } catch (err) {
        console.error(err);
      }
    };
    loadMenu();
  }, [apiGet]);

  useEffect(() => {
    if (step === 'scan' && !scannerRef.current) {
      setTimeout(() => {
        const qrContainer = document.getElementById('qr-scanner-viewport');
        if (qrContainer) {
          try {
            const scanner = new Html5QrcodeScanner(
              'qr-scanner-viewport',
              { fps: 10, qrbox: { width: 250, height: 250 } },
              false
            );

            scanner.render(
              async (decodedText) => {
                scanner.clear();
                scannerRef.current = null;
                await handleQrScan(decodedText.trim());
              },
              () => {}
            );

            scannerRef.current = scanner;
          } catch (e) {
            console.warn('QR Code Scanner initialization failed or skipped', e);
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

  const applyScanResult = (data: any) => {
    const emp = data.employee;
    setScannedEmployee({
      id: emp.id,
      fullName: emp.fullname,
      employeeId: emp.employee_external_id,
      department: emp.department || '',
      balance: Number(emp.balance ?? 0),
    });
    setQrSessionId(data.qr_session_id);
    setCart([]);
    setStep('order');
  };

  const handleQrScan = async (qrString: string) => {
    if (!qrString.trim()) return;
    setLookupError('');
    setLoading(true);

    try {
      const res = await apiPost('/api/waiter/scan', { qr_token: qrString });
      applyScanResult(unwrapData(res));
    } catch (e: any) {
      setLookupError(e.message || 'Error verifying encrypted QR token.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    handleQrScan(manualToken);
  };

  const getBasketTotal = () => {
    return cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
  };

  const addToCart = (item: any) => {
    setCart((prev) => {
      const idx = prev.findIndex(c => c.item.id === item.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx].quantity += 1;
        return next;
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const adjustCartQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const idx = prev.findIndex(c => c.item.id === itemId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx].quantity += delta;
      if (next[idx].quantity <= 0) {
        next.splice(idx, 1);
      }
      return next;
    });
  };

  const handleConfirmDebit = async () => {
    if (!employeePassword) {
      setAuthError('Please enter the employee confirmation password.');
      return;
    }
    if (!qrSessionId || !scannedEmployee) {
      setAuthError('QR session expired. Please scan again.');
      return;
    }
    setAuthError('');
    setLoading(true);

    const payload = {
      employee_id: Number(scannedEmployee.id),
      cafe_id: cafeId ?? Number(menuItems[0]?.cafeId),
      qr_session_id: qrSessionId,
      password: employeePassword,
      items: cart.map(c => ({
        menu_item_id: Number(c.item.id),
        quantity: c.quantity,
      })),
    };

    try {
      if (isOffline) {
        addToOfflineQueue(payload);
        setFinalTxId('OFFLINE-QUEUED');
        setEmployeePassword('');
        setStep('success');
        return;
      }

      const res = await apiPost('/api/waiter/order', payload);
      const data = unwrapData(res);

      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } catch (e) {}

      setFinalTxId(String(data.order_uuid || data.order_id));
      setEmployeePassword('');
      setStep('success');
    } catch (e: any) {
      setAuthError(e.message || 'Authorization failed. Please check employee password.');
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        oscillator.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } catch (err) {}
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'waiter') return null;

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 md:py-10 space-y-8 font-sans">
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-primary tracking-tight">Waiter Sales Portal</h1>
          <p className="text-[10px] text-subtle-text font-medium uppercase tracking-wider mt-1">Logged in: <strong>{user.fullName}</strong> &bull; Cashier Waiter Mode</p>
        </div>
        {step !== 'scan' && (
          <button
            id="waiter-reset-btn"
            onClick={() => {
              setScannedEmployee(null);
              setQrSessionId(null);
              setCart([]);
              setStep('scan');
            }}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all focus:outline-none"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Scan / Lookup</span>
          </button>
        )}
      </div>

      {step === 'scan' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
            <div className="text-center md:text-left">
              <h3 className="text-sm font-black text-primary tracking-tight">Scan Employee QR Token</h3>
              <p className="text-[10px] text-subtle-text font-medium mt-0.5">Place coupon in front of front-facing or mobile camera</p>
            </div>

            <div className="bg-slate-50 rounded-3xl border border-slate-200 p-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
              <div id="qr-scanner-viewport" className="w-full max-w-sm rounded-2xl overflow-hidden shadow-inner text-xs font-mono font-bold text-slate-500" />
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <QrCode className="w-4 h-4 text-slate-300" />
                <span>{loading ? 'Verifying…' : 'Camera scan state online'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-primary tracking-tight">Paste QR Token</h3>
              <p className="text-[10px] text-subtle-text font-medium">Use if camera permissions are absent — paste the scanned QR string</p>
            </div>

            {lookupError && (
              <div className="p-3.5 bg-red-50 rounded-2xl border border-red-100 text-danger text-xs font-bold flex gap-2 items-start">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{lookupError}</span>
              </div>
            )}

            <form onSubmit={handleManualScan} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">QR Token</label>
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4" />
                  <input
                    id="manual-id-input"
                    type="text"
                    required
                    placeholder="Paste QR token from employee card"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-accent text-xs font-bold tracking-wider"
                  />
                </div>
              </div>

              <button
                id="manual-search-submit"
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary hover:bg-secondary text-white font-bold rounded-xl shadow-md transition-all uppercase text-[10px] tracking-wider min-h-[44px] disabled:opacity-50"
              >
                Verify Token
              </button>
            </form>

            <div className="p-4 bg-blue-50/50 rounded-2xl text-xs text-slate-600 leading-relaxed border border-slate-100">
              <h4 className="font-bold text-primary mb-1">Authorization Instructions</h4>
              <p>Scan the employee QR to open a short-lived session. Select meals, then confirm with the employee password to debit their meal balance.</p>
            </div>
          </div>
        </div>
      )}

      {step === 'order' && scannedEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-primary font-black flex items-center justify-center uppercase shadow-sm">
                  {scannedEmployee.fullName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-primary">{scannedEmployee.fullName}</h4>
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">{scannedEmployee.employeeId} &bull; {scannedEmployee.department}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Available Balance</span>
                <span className="text-base font-black text-success">{formatETB(scannedEmployee.balance)}</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
              <h3 className="text-xs font-black text-primary uppercase tracking-wider">Quick Select Meals</h3>
              {menuItems.length === 0 ? (
                <p className="text-xs text-subtle-text py-8 text-center">No available menu items for your cafe.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  {menuItems.map((item) => (
                    <button
                      id={`waiter-add-${item.id}`}
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="p-3 border border-slate-200 hover:border-primary rounded-2xl text-left hover:bg-slate-50/30 transition-all space-y-2 flex flex-col justify-between h-28"
                    >
                      <span className="font-extrabold text-primary line-clamp-2 leading-tight">{item.name}</span>
                      <div className="flex justify-between items-end w-full">
                        <span className="text-[10px] font-bold text-secondary">{formatETB(item.price)}</span>
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          +
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-5 text-xs">
            <div>
              <h3 className="text-sm font-black text-primary tracking-tight">Active Tray Details</h3>
              <p className="text-[10px] text-subtle-text font-medium mt-0.5">Meal selections ready to be authorized</p>
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
                    <div key={c.item.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-primary truncate">{c.item.name}</h5>
                        <p className="text-[10px] text-slate-400">ETB {c.item.price} each</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          id={`waiter-cart-dec-${c.item.id}`}
                          onClick={() => adjustCartQuantity(c.item.id, -1)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 min-h-[32px] min-w-[32px] flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-primary w-4 text-center">{c.quantity}</span>
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
                    <span>ETB {scannedEmployee.balance}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-primary pt-2 border-t mt-1">
                    <span>Total Debit:</span>
                    <span className="text-secondary font-black">ETB {getBasketTotal()}</span>
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
                        <span>Employee Password *</span>
                      </label>
                      <input
                        id="waiter-auth-password"
                        type="password"
                        required
                        placeholder="Employee confirms with password..."
                        value={employeePassword}
                        onChange={(e) => setEmployeePassword(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-accent"
                      />
                    </div>

                    {authError && (
                      <p className="text-[10px] font-bold text-danger bg-red-50 p-2.5 rounded-xl border border-red-200">{authError}</p>
                    )}

                    <button
                      id="waiter-debit-submit-btn"
                      onClick={handleConfirmDebit}
                      disabled={!employeePassword || loading}
                      className="w-full py-3.5 bg-primary hover:bg-secondary text-white font-bold uppercase text-[10px] tracking-wider rounded-xl transition-all shadow-md disabled:opacity-45"
                    >
                      {loading ? 'Processing…' : 'Authorize & Debit Meal'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="bg-white rounded-3xl p-8 max-w-md mx-auto shadow-xl border border-slate-100 text-center space-y-6 animate-scaleIn text-xs">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-green-50 text-success flex items-center justify-center shadow">
              <CheckCircle className="w-9 h-9" />
            </div>
            <h2 className="text-lg font-black text-primary tracking-tight">Debit Transaction Approved!</h2>
            <p className="text-subtle-text">The corporate meal coupon has been successfully processed.</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2">
            <p className="text-[9px] font-bold text-subtle-text uppercase">Transaction Record</p>
            <div className="flex justify-between font-mono">
              <span>Receipt ID:</span>
              <span className="font-bold text-primary">{finalTxId}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span>Debited Cost:</span>
              <span className="font-bold text-danger">-ETB {getBasketTotal()}</span>
            </div>
            <div className="flex justify-between font-mono pt-1.5 border-t">
              <span>Approved For:</span>
              <span className="font-bold text-primary">{scannedEmployee?.fullName}</span>
            </div>
          </div>

          <button
            id="waiter-success-close-btn"
            onClick={() => {
              setScannedEmployee(null);
              setQrSessionId(null);
              setCart([]);
              setStep('scan');
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
