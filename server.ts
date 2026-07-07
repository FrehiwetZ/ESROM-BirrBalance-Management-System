import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import CryptoJS from 'crypto-js';
import { User, MenuItem, Order, Feedback, AuditLog, Message, Conversation, WaiterPerformance } from './src/types';

// In-Memory Database State
let employees: User[] = [
  {
    id: 'emp-1',
    employeeId: 'EMP001',
    fullName: 'Samuel Alene',
    role: 'employee',
    email: 'samuel.alene@esrom.com',
    phone: '+251911123456',
    department: 'Engineering',
    balance: 4500,
    monthlyAllocation: 5000,
    balanceTier: 'Tier 1',
    validityStart: '2026-06-01',
    validityEnd: '2026-06-30',
    isActive: true,
  },
  {
    id: 'emp-2',
    employeeId: 'EMP002',
    fullName: 'Hirut Kebede',
    role: 'employee',
    email: 'hirut.kebede@esrom.com',
    phone: '+251911223344',
    department: 'Finance',
    balance: 2300,
    monthlyAllocation: 3000,
    balanceTier: 'Tier 2',
    validityStart: '2026-06-01',
    validityEnd: '2026-06-30',
    isActive: true,
  },
  {
    id: 'emp-3',
    employeeId: 'EMP003',
    fullName: 'Michael Bekele',
    role: 'employee',
    email: 'michael.bekele@esrom.com',
    phone: '+251911556677',
    department: 'Marketing',
    balance: 0,
    monthlyAllocation: 3000,
    balanceTier: 'Tier 2',
    isActive: true,
    isAwaitingSetup: true,
  },
  {
    id: 'emp-4',
    employeeId: 'EMP004',
    fullName: 'Bethelhem Tesfaye',
    role: 'employee',
    email: 'bethelhem.tesfaye@esrom.com',
    phone: '+251911998877',
    department: 'Operations',
    balance: 1500,
    monthlyAllocation: 4000,
    balanceTier: 'Tier 1',
    validityStart: '2026-06-01',
    validityEnd: '2026-06-30',
    isActive: false,
  },
];

let managers: User[] = [
  {
    id: 'mgr-1',
    employeeId: 'MGR001',
    fullName: 'Eshru Solomon (Manager)',
    role: 'manager',
    email: 'solomon.manager@esrom.com',
    phone: '+251911777777',
    department: 'Administration',
    balance: 0,
    monthlyAllocation: 0,
    balanceTier: 'None',
    isActive: true,
  },
  {
    id: 'cafe-1',
    employeeId: 'CAF001',
    fullName: 'Tewodros Kassahun (Cafe)',
    role: 'cafe',
    email: 'tewodros.cafe@esrom.com',
    phone: '+251911888888',
    department: 'Food Services',
    balance: 0,
    monthlyAllocation: 0,
    balanceTier: 'None',
    isActive: true,
  },
  {
    id: 'wat-1',
    employeeId: 'WAT001',
    fullName: 'Abebe Yosef (Waiter)',
    role: 'waiter',
    email: 'abebe.waiter@esrom.com',
    phone: '+251911999999',
    department: 'Food Services',
    balance: 0,
    monthlyAllocation: 0,
    balanceTier: 'None',
    isActive: true,
  },
];

let departments: { id: string; name: string; employeeCount: number; totalAllocated: number; totalRedeemed: number }[] = [
  { id: 'dept-1', name: 'Engineering', employeeCount: 12, totalAllocated: 60000, totalRedeemed: 42000 },
  { id: 'dept-2', name: 'Finance', employeeCount: 5, totalAllocated: 15000, totalRedeemed: 11200 },
  { id: 'dept-3', name: 'Marketing', employeeCount: 4, totalAllocated: 12000, totalRedeemed: 6500 },
  { id: 'dept-4', name: 'Operations', employeeCount: 8, totalAllocated: 32000, totalRedeemed: 21500 },
];

let menuItems: MenuItem[] = [
  {
    id: 'menu-1',
    name: 'Special Beyaynetu',
    description: 'Assorted vegan lentils, peas, collard greens, and cabbage served on injera.',
    price: 180,
    category: 'Food',
    photo: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?q=80&w=500&auto=format&fit=crop',
    available: true,
  },
  {
    id: 'menu-2',
    name: 'Doro Wot',
    description: 'Rich, spicy chicken stew cooked with hard-boiled eggs and seasoned butter, served on injera.',
    price: 320,
    category: 'Food',
    photo: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?q=80&w=500&auto=format&fit=crop',
    available: true,
  },
  {
    id: 'menu-3',
    name: 'Tibs (Beef/Goat)',
    description: 'Sautéed beef strips with onions, garlic, jalapeños, and rosemary.',
    price: 240,
    category: 'Food',
    photo: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?q=80&w=500&auto=format&fit=crop',
    available: true,
  },
  {
    id: 'menu-4',
    name: 'Fresh Avocado Juice',
    description: 'Creamy, thick pureed fresh avocado with a splash of lime and mango layer.',
    price: 95,
    category: 'Beverage',
    photo: 'https://images.unsplash.com/photo-1553530979-7ee52a2670c4?q=80&w=500&auto=format&fit=crop',
    available: true,
  },
  {
    id: 'menu-5',
    name: 'Traditional Coffee (Buna)',
    description: 'Elegantly roasted organic Ethiopian coffee brewed in a traditional clay pot (Jebena).',
    price: 40,
    category: 'Beverage',
    photo: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=500&auto=format&fit=crop',
    available: true,
  },
  {
    id: 'menu-6',
    name: 'Sambusa (Lentil/Beef)',
    description: 'Crispy pastry shell filled with spiced brown lentils or beef, lightly fried.',
    price: 50,
    category: 'Snack',
    photo: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?q=80&w=500&auto=format&fit=crop',
    available: true,
  },
];

let orders: Order[] = [
  {
    id: 'ORD-2026-06-24-0001',
    employeeId: 'EMP001',
    employeeName: 'Samuel Alene',
    department: 'Engineering',
    items: [{ itemId: 'menu-1', name: 'Special Beyaynetu', price: 180, quantity: 2 }],
    amount: 360,
    waiterName: 'Abebe Yosef',
    status: 'confirmed',
    date: '2026-06-24T12:30:00.000Z',
    location: 'Table 4',
  },
  {
    id: 'ORD-2026-06-24-0002',
    employeeId: 'EMP002',
    employeeName: 'Hirut Kebede',
    department: 'Finance',
    items: [
      { itemId: 'menu-2', name: 'Doro Wot', price: 320, quantity: 1 },
      { itemId: 'menu-4', name: 'Fresh Avocado Juice', price: 95, quantity: 1 },
    ],
    amount: 415,
    waiterName: 'Marta Hailu',
    status: 'ready',
    date: '2026-06-24T13:15:00.000Z',
    location: 'Table 12',
  },
  {
    id: 'ORD-2026-06-24-0003',
    employeeId: 'EMP001',
    employeeName: 'Samuel Alene',
    department: 'Engineering',
    items: [
      { itemId: 'menu-3', name: 'Tibs', price: 240, quantity: 1 },
      { itemId: 'menu-5', name: 'Traditional Coffee', price: 40, quantity: 1 },
    ],
    amount: 280,
    waiterName: 'Yonas Kassa',
    status: 'ready',
    date: '2026-06-24T13:45:00.000Z',
    location: 'Seat B3',
  },
];

let feedbackList: Feedback[] = [
  {
    id: 'f-1',
    employeeName: 'Samuel Alene',
    cafe: 'Main Corporate Cafe',
    orderId: 'ORD-2026-06-24-0001',
    rating: 5,
    comment: 'The Special Beyaynetu was delicious! Spiced perfectly.',
    date: '2026-06-24',
  },
  {
    id: 'f-2',
    employeeName: 'Hirut Kebede',
    cafe: 'Main Corporate Cafe',
    orderId: 'ORD-2026-06-24-0002',
    rating: 4,
    comment: 'Great Doro Wot, but took a little longer to be delivered.',
    date: '2026-06-24',
  },
];

let auditLogs: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-06-24T10:00:00.000Z',
    employeeId: 'MGR001',
    userName: 'Eshru Solomon',
    role: 'manager',
    action: 'Balance Allocated',
    details: 'Allocated ETB 50,000 across Engineering department.',
  },
  {
    id: 'log-2',
    timestamp: '2026-06-24T11:30:00.000Z',
    employeeId: 'MGR001',
    userName: 'Eshru Solomon',
    role: 'manager',
    action: 'Employee Added',
    details: 'Added employee Michael Bekele (ID: EMP003) to Marketing.',
  },
];

let messages: Message[] = [
  {
    id: 'msg-1',
    senderId: 'EMP001',
    senderName: 'Samuel Alene',
    senderRole: 'employee',
    text: 'Hello, is the corporate cafeteria serving Tibs today?',
    timestamp: '10:30 AM',
  },
  {
    id: 'msg-2',
    senderId: 'CAF001',
    senderName: 'Tewodros Kassahun',
    senderRole: 'cafe',
    text: 'Yes Samuel! We have fresh beef Tibs on the lunch menu starting 11:30.',
    timestamp: '10:32 AM',
  },
];

let notifications: any[] = [
  {
    id: 'n-1',
    userId: 'EMP001',
    title: 'Order Confirmed',
    message: 'Your order #ORD-2026-06-24-0001 of Special Beyaynetu has been confirmed.',
    type: 'success',
    read: false,
    timestamp: '10 mins ago',
  },
  {
    id: 'n-2',
    userId: 'EMP001',
    title: 'Monthly Balance Credited',
    message: 'Your account was credited with ETB 5,000 for the month of June.',
    type: 'info',
    read: true,
    timestamp: '2 days ago',
  },
  {
    id: 'n-3',
    userId: 'EMP002',
    title: 'Low Balance Alert',
    message: 'Your meal balance has fallen below 20% of your monthly allocation.',
    type: 'warning',
    read: false,
    timestamp: '1 hour ago',
  },
];

let waitersPerformance: WaiterPerformance[] = [
  {
    id: 'wat-1',
    name: 'Abebe Yosef',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop',
    totalOrders: 145,
    avgDeliveryTime: '9 mins',
    flaggedIssues: 0,
    rating: 4.8,
  },
  {
    id: 'wat-2',
    name: 'Marta Hailu',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop',
    totalOrders: 98,
    avgDeliveryTime: '11 mins',
    flaggedIssues: 1,
    rating: 4.5,
  },
  {
    id: 'wat-3',
    name: 'Yonas Kassa',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop',
    totalOrders: 112,
    avgDeliveryTime: '14 mins',
    flaggedIssues: 3,
    rating: 4.1,
  },
];

// --- Permanent Encrypted QR Code Helper ---
const SECRET_KEY = process.env.QR_SECRET_KEY || 'esrom_birrbalance_super_secret_key_12345';

function generateEncryptedQrToken(employee: User): { encrypted: string; uuid: string } {
  const empId = employee.employeeId;
  const uuid = employee.uuid || `uuid-${employee.id || Math.random().toString(36).substring(2, 11)}-${Date.now()}`;
  const org = "ESROM_BIRRBALANCE";
  const issued = employee.validityStart ? `${employee.validityStart}T00:00:00Z` : "2026-06-01T00:00:00Z";
  
  const signaturePayload = `${empId}:${uuid}:${org}:${issued}`;
  const hmacSignature = CryptoJS.HmacSHA256(signaturePayload, SECRET_KEY).toString();
  
  const payload = {
    empId,
    uid: uuid,
    org,
    issued,
    sig: hmacSignature
  };
  
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), SECRET_KEY).toString();
  return { encrypted, uuid };
}

// Populate existing employees with permanent QR code tokens on start
employees.forEach(emp => {
  const result = generateEncryptedQrToken(emp);
  emp.uuid = result.uuid;
  emp.encryptedQrToken = result.encrypted;
});

function decryptAndVerifyQrToken(encryptedStr: string): { success: boolean; empId?: string; message?: string } {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedStr, SECRET_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) {
      return { success: false, message: 'Decryption failed. Invalid QR code data.' };
    }
    
    const payload = JSON.parse(decryptedText);
    const { empId, uid, org, issued, sig } = payload;
    
    if (org !== "ESROM_BIRRBALANCE") {
      return { success: false, message: 'Invalid organization identifier.' };
    }
    
    // Verify HMAC
    const signaturePayload = `${empId}:${uid}:${org}:${issued}`;
    const expectedSig = CryptoJS.HmacSHA256(signaturePayload, SECRET_KEY).toString();
    
    if (sig !== expectedSig) {
      return { success: false, message: 'Security signature mismatch. Untrusted token.' };
    }
    
    // Find employee
    const emp = employees.find(e => e.employeeId === empId);
    if (!emp) {
      return { success: false, message: 'Employee associated with this token not found.' };
    }
    
    if (emp.uuid !== uid) {
      return { success: false, message: 'This QR code has been reset or is no longer valid.' };
    }
    
    return { success: true, empId };
  } catch (err: any) {
    return { success: false, message: 'Invalid or malformed QR code.' };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper auth check
  const getUserFromToken = (authHeader: string | undefined): User | null => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    
    // Simple mock verification based on user ID
    if (token === 'mock-jwt-token-manager') {
      return managers.find(m => m.role === 'manager') || null;
    }
    if (token === 'mock-jwt-token-cafe') {
      return managers.find(m => m.role === 'cafe') || null;
    }
    if (token === 'mock-jwt-token-waiter') {
      return managers.find(m => m.role === 'waiter') || null;
    }
    if (token.startsWith('mock-jwt-token-emp-')) {
      const empId = token.replace('mock-jwt-token-emp-', '');
      return employees.find(e => e.id === empId) || null;
    }
    return null;
  };

  // --- API ROUTES ---

  // Auth
  app.post('/api/auth/login', (req, res) => {
    const { employeeId, password } = req.body;
    if (!employeeId || !password) {
      return res.status(400).json({ message: 'Employee ID and password are required' });
    }

    // Try finding in managers first
    let foundUser = managers.find(m => m.employeeId === employeeId);
    let mockToken = '';
    
    if (foundUser) {
      mockToken = `mock-jwt-token-${foundUser.role}`;
    } else {
      foundUser = employees.find(e => e.employeeId === employeeId);
      if (foundUser) {
        mockToken = `mock-jwt-token-emp-${foundUser.id}`;
      }
    }

    if (foundUser && password === 'password') {
      // Record login audit log
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        employeeId: foundUser.employeeId,
        userName: foundUser.fullName,
        role: foundUser.role,
        action: 'User Login',
        details: 'User logged in successfully.',
      });

      let mappedRole: string = foundUser.role;
      if (foundUser.role === 'manager') mappedRole = 'company_manager';
      else if (foundUser.role === 'cafe') mappedRole = 'cafe_manager';

      return res.json({ token: mockToken, user: foundUser, role: mappedRole });
    }

    return res.status(401).json({ message: 'Incorrect Employee ID or password. Please try again.' });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ message: 'Your session has expired' });
    }
    return res.json({ user });
  });

  app.get('/api/employees/me/profile', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ message: 'Your session has expired' });
    }
    const emp = employees.find(e => e.id === user.id);
    const activeUser = emp || user;
    const amount = activeUser.monthlyAllocation || (activeUser.balanceTier === 'Tier 1' ? 5000 : 3000);
    const allocations = [
      {
        id: 'alloc-jun',
        amount,
        cycleMonth: 'June 2026',
        date: '2026-06-01T08:00:00.000Z',
      },
      {
        id: 'alloc-may',
        amount,
        cycleMonth: 'May 2026',
        date: '2026-05-01T08:00:00.000Z',
      },
      {
        id: 'alloc-apr',
        amount,
        cycleMonth: 'April 2026',
        date: '2026-04-01T08:00:00.000Z',
      },
    ];
    return res.json({ user: activeUser, allocations });
  });

  // Employees Management
  app.get('/api/employees', (req, res) => {
    res.json({ employees });
  });

  app.post('/api/employees', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { employeeId, fullName, department, phone, email, balanceTier } = req.body;
    if (!employeeId || !fullName || !department || !email) {
      return res.status(400).json({ message: 'Missing required employee fields' });
    }

    const allocation = balanceTier === 'Tier 1' ? 5000 : 3000;
    const newEmp: User = {
      id: `emp-${Date.now()}`,
      employeeId,
      fullName,
      role: 'employee',
      email,
      phone: phone || '',
      department,
      balance: allocation,
      monthlyAllocation: allocation,
      balanceTier,
      validityStart: new Date().toISOString().split('T')[0],
      validityEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
    };

    const qrResult = generateEncryptedQrToken(newEmp);
    newEmp.uuid = qrResult.uuid;
    newEmp.encryptedQrToken = qrResult.encrypted;

    employees.push(newEmp);

    // Update department counts
    const dept = departments.find(d => d.name === department);
    if (dept) {
      dept.employeeCount += 1;
      dept.totalAllocated += allocation;
    }

    // Audit log
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      employeeId: user.employeeId,
      userName: user.fullName,
      role: 'manager',
      action: 'Employee Added',
      details: `Added ${fullName} (ID: ${employeeId}) to ${department}.`,
    });

    res.json({ success: true, employee: newEmp });
  });

  app.put('/api/employees/:id', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const index = employees.findIndex(e => e.id === id);
    if (index === -1) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    employees[index] = { ...employees[index], ...req.body };

    // Audit log
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      employeeId: user.employeeId,
      userName: user.fullName,
      role: 'manager',
      action: 'Employee Updated',
      details: `Updated employee profile for ${employees[index].fullName} (ID: ${employees[index].employeeId}).`,
    });

    res.json({ success: true, employee: employees[index] });
  });

  app.delete('/api/employees/:id', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const emp = employees.find(e => e.id === id);
    if (!emp) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    employees = employees.filter(e => e.id !== id);

    // Audit log
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      employeeId: user.employeeId,
      userName: user.fullName,
      role: 'manager',
      action: 'Employee Deleted',
      details: `Permanently deleted ${emp.fullName} (ID: ${emp.employeeId}).`,
    });

    res.json({ success: true });
  });

  app.post('/api/employees/:id/reset-qr', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const emp = employees.find(e => e.id === id);
    if (!emp) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Invalidate old QR code by changing the UUID
    emp.uuid = `uuid-${emp.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const qrResult = generateEncryptedQrToken(emp);
    emp.uuid = qrResult.uuid;
    emp.encryptedQrToken = qrResult.encrypted;

    // Audit log
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      employeeId: user.employeeId,
      userName: user.fullName,
      role: 'manager',
      action: 'QR Code Reset',
      details: `Reset QR code for ${emp.fullName} (ID: ${emp.employeeId}). Old QR code invalidated.`,
    });

    res.json({ success: true, employee: emp });
  });

  // Departments Management
  app.get('/api/departments', (req, res) => {
    res.json({ departments });
  });

  app.post('/api/departments', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const newDept = {
      id: `dept-${Date.now()}`,
      name,
      employeeCount: 0,
      totalAllocated: 0,
      totalRedeemed: 0,
    };

    departments.push(newDept);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      employeeId: user.employeeId,
      userName: user.fullName,
      role: 'manager',
      action: 'Department Created',
      details: `Created new department: ${name}.`,
    });

    res.json({ success: true, department: newDept });
  });

  // Balance Allocation
  app.post('/api/balance/allocate', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { option, targetId, amount } = req.body; // option: 'department' | 'employee'
    const numAmount = Number(amount);

    if (!option || !numAmount) {
      return res.status(400).json({ message: 'Option and amount are required' });
    }

    let affectedCount = 0;

    if (option === 'department') {
      employees.forEach(emp => {
        if (emp.department === targetId && emp.isActive) {
          emp.balance += numAmount;
          affectedCount++;
          // Register alert
          notifications.unshift({
            id: `n-${Date.now()}-${emp.id}`,
            userId: emp.id,
            title: 'Balance Allocated',
            message: `Your account was credited with ETB ${numAmount} by management.`,
            type: 'info',
            read: false,
            timestamp: 'Just now',
          });
        }
      });

      const dept = departments.find(d => d.name === targetId);
      if (dept) {
        dept.totalAllocated += numAmount * affectedCount;
      }
    } else {
      const emp = employees.find(e => e.id === targetId || e.employeeId === targetId);
      if (emp) {
        emp.balance += numAmount;
        affectedCount = 1;
        notifications.unshift({
          id: `n-${Date.now()}`,
          userId: emp.id,
          title: 'Balance Allocated',
          message: `Your account was credited with ETB ${numAmount} individually.`,
          type: 'info',
          read: false,
          timestamp: 'Just now',
        });

        const dept = departments.find(d => d.name === emp.department);
        if (dept) {
          dept.totalAllocated += numAmount;
        }
      }
    }

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      employeeId: user.employeeId,
      userName: user.fullName,
      role: 'manager',
      action: 'Balance Allocated',
      details: `Allocated ETB ${numAmount} via ${option} (${targetId}). Affected ${affectedCount} employees.`,
    });

    res.json({ success: true, affectedCount });
  });

  // Menu Management
  app.get('/api/menu', (req, res) => {
    res.json({ menuItems });
  });

  app.post('/api/menu', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'cafe') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, description, price, category, photo } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ message: 'Missing required menu item details' });
    }

    const newItem: MenuItem = {
      id: `menu-${Date.now()}`,
      name,
      description: description || '',
      price: Number(price),
      category,
      photo: photo || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=300&auto=format&fit=crop',
      available: true,
    };

    menuItems.push(newItem);
    res.json({ success: true, menuItem: newItem });
  });

  app.put('/api/menu/:id', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'cafe') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const index = menuItems.findIndex(m => m.id === id);
    if (index === -1) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    menuItems[index] = { ...menuItems[index], ...req.body };
    res.json({ success: true, menuItem: menuItems[index] });
  });

  app.delete('/api/menu/:id', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'cafe') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    menuItems = menuItems.filter(m => m.id !== id);
    res.json({ success: true });
  });

  // Orders Flow
  app.get('/api/orders', (req, res) => {
    res.json({ orders });
  });

  app.post('/api/orders', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ message: 'Session expired' });
    }

    const { items, amount, location } = req.body;
    if (!items || !amount) {
      return res.status(400).json({ message: 'Items and amount required' });
    }

    // Verify balance if placing as employee
    if (user.role === 'employee') {
      const emp = employees.find(e => e.id === user.id);
      if (!emp) return res.status(404).json({ message: 'Employee not found' });
      if (emp.balance < amount) {
        return res.status(400).json({ message: 'Insufficient meal balance.' });
      }

      emp.balance -= amount;
    }

    const newOrder: Order = {
      id: `ORD-${new Date().toISOString().split('T')[0]}-${Math.floor(1000 + Math.random() * 9000)}`,
      employeeId: user.employeeId,
      employeeName: user.fullName,
      department: user.department || 'Staff',
      items,
      amount,
      waiterName: 'Assigned Waiter',
      status: 'pending',
      date: new Date().toISOString(),
      location: location || 'Self Pick-up',
    };

    orders.unshift(newOrder);

    // Register success notification
    notifications.unshift({
      id: `n-${Date.now()}`,
      userId: user.id,
      title: 'Order Generated',
      message: `Your order ${newOrder.id} of ETB ${amount} is ready to be scanned.`,
      type: 'success',
      read: false,
      timestamp: 'Just now',
    });

    res.json({ success: true, order: newOrder });
  });

  // Verify encrypted QR code (Waiter Panel)
  app.post('/api/orders/verify-qr', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'waiter') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { qrString } = req.body;
    if (!qrString) {
      return res.status(400).json({ message: 'QR token string is required' });
    }

    const verification = decryptAndVerifyQrToken(qrString);
    if (!verification.success) {
      return res.status(400).json({ message: verification.message });
    }

    const emp = employees.find(e => e.employeeId === verification.empId);
    if (!emp) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    if (!emp.isActive) {
      return res.status(400).json({ message: 'Employee card is inactive.' });
    }

    res.json({
      success: true,
      employee: {
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        department: emp.department,
        balance: emp.balance,
        isActive: emp.isActive
      }
    });
  });

  // Scan QR/Confirm Order (Waiter Panel)
  app.post('/api/orders/scan', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'waiter') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { employeeId, items, amount, password } = req.body;

    // Load employee identity from local records
    const emp = employees.find(e => e.employeeId === employeeId);
    if (!emp) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    if (!emp.isActive) {
      return res.status(400).json({ message: 'Employee card is inactive.' });
    }

    // Check balance
    if (emp.balance < amount) {
      return res.status(400).json({ message: `Insufficient balance! Needed: ETB ${amount}, Available: ETB ${emp.balance}` });
    }

    // Verify password (simulated)
    if (password !== 'password') {
      return res.status(401).json({ message: 'Invalid employee verification password.' });
    }

    // Deduct balance and create order
    emp.balance -= amount;

    // Track department stats
    const dept = departments.find(d => d.name === emp.department);
    if (dept) {
      dept.totalRedeemed += amount;
    }

    const newOrder: Order = {
      id: `ORD-${new Date().toISOString().split('T')[0]}-${Math.floor(1000 + Math.random() * 9000)}`,
      employeeId: emp.employeeId,
      employeeName: emp.fullName,
      department: emp.department,
      items,
      amount,
      waiterName: user.fullName,
      status: 'confirmed',
      date: new Date().toISOString(),
      location: 'Main Cafeteria',
    };

    orders.unshift(newOrder);

    // Notify employee
    notifications.unshift({
      id: `n-${Date.now()}`,
      userId: emp.id,
      title: 'Order Confirmed',
      message: `Your order of ETB ${amount} has been validated and served.`,
      type: 'success',
      read: false,
      timestamp: 'Just now',
    });

    // Audit Log
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      employeeId: emp.employeeId,
      userName: emp.fullName,
      role: 'employee',
      action: 'QR Order Redeemed',
      details: `Redeemed ETB ${amount} for order items. Waiter: ${user.fullName}.`,
    });

    res.json({ success: true, order: newOrder, currentBalance: emp.balance });
  });

  app.put('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const order = orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;

    // Audit log
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      employeeId: 'CAFE',
      userName: 'Cafeteria Kitchen',
      role: 'cafe',
      action: 'Order Status Change',
      details: `Order ${id} marked as ${status}.`,
    });

    res.json({ success: true, order });
  });

  app.post('/api/orders/:id/rate', (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const order = orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.rating = rating;
    order.comment = comment;

    feedbackList.unshift({
      id: `f-${Date.now()}`,
      employeeName: order.employeeName,
      cafe: 'Main Corporate Cafe',
      orderId: id,
      rating,
      comment,
      date: new Date().toISOString().split('T')[0],
    });

    res.json({ success: true });
  });

  // Offline Sync Orders
  app.post('/api/waiter/sync-orders', (req, res) => {
    const { orders: syncedOrders } = req.body;
    if (!Array.isArray(syncedOrders)) {
      return res.status(400).json({ message: 'Orders must be an array' });
    }

    syncedOrders.forEach((o: any) => {
      const emp = employees.find(e => e.employeeId === o.employeeId);
      if (emp) {
        // Double check balance & status
        if (emp.balance >= o.amount && emp.isActive) {
          emp.balance -= o.amount;
          orders.unshift({
            ...o,
            id: o.id || `ORD-SYNC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            status: 'confirmed',
            date: o.date || new Date().toISOString(),
          });
          const dept = departments.find(d => d.name === emp.department);
          if (dept) {
            dept.totalRedeemed += o.amount;
          }
        } else {
          // Flagged balance conflict order in audit log
          auditLogs.unshift({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            employeeId: emp.employeeId,
            userName: emp.fullName,
            role: 'employee',
            action: 'Sync Conflict',
            details: `Conflict syncing offline order: Balance Expired or Inactive. Required ETB ${o.amount}, balance is ETB ${emp.balance}. Flagged for review.`,
          });
        }
      }
    });

    res.json({ success: true });
  });

  // Waiters performance list
  app.get('/api/waiters', (req, res) => {
    res.json({ waiters: waitersPerformance });
  });

  // Feedback Review List
  app.get('/api/feedback', (req, res) => {
    res.json({ feedback: feedbackList });
  });

  // Audit Logs
  app.get('/api/audit-logs', (req, res) => {
    res.json({ auditLogs });
  });

  // Message board
  app.get('/api/messages', (req, res) => {
    const chatList: Conversation[] = [
      {
        id: 'c-1',
        name: 'Samuel Alene',
        avatar: '',
        role: 'Employee (Engineering)',
        lastMessage: messages.length > 0 ? messages[messages.length - 1].text : 'No messages',
        timestamp: '10:32 AM',
        unreadCount: 0,
      }
    ];
    res.json({ conversations: chatList, messages });
  });

  app.post('/api/messages', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    const { text, conversationId } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      senderId: user ? user.employeeId : 'SYSTEM',
      senderName: user ? user.fullName : 'System',
      senderRole: user ? user.role : 'system',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    messages.push(newMsg);
    res.json({ success: true, message: newMsg });
  });

  // Notifications
  app.get('/api/notifications', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.json({ notifications });
    }
    // Return notifications for this user or global ones
    const userNotifs = notifications.filter(n => n.userId === user.id || n.userId === user.employeeId);
    res.json({ notifications: userNotifs });
  });

  app.post('/api/notifications/read-all', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (user) {
      notifications.forEach(n => {
        if (n.userId === user.id || n.userId === user.employeeId) {
          n.read = true;
        }
      });
    } else {
      notifications.forEach(n => n.read = true);
    }
    res.json({ success: true });
  });

  app.post('/api/notifications/:id/read', (req, res) => {
    const notif = notifications.find(n => n.id === req.params.id);
    if (notif) {
      notif.read = true;
    }
    res.json({ success: true });
  });

  app.post('/api/notifications/clear-all', (req, res) => {
    const user = getUserFromToken(req.headers.authorization);
    if (user) {
      notifications = notifications.filter(n => n.userId !== user.id && n.userId !== user.employeeId);
    } else {
      notifications = [];
    }
    res.json({ success: true });
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
