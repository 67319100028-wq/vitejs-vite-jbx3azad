import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, MapPin, Save, CheckCircle2, AlertCircle, User, FileText,
  Map, X, Activity, ClipboardList, MessageSquare, AlignLeft,
  Home as HomeIcon, History, ChevronLeft, ChevronRight, Clock,
  Briefcase, Tag, ZoomIn, ExternalLink, Navigation, UserCheck,
  Filter, Lock, UserCircle, LogIn, LogOut, Search, Mic, CheckSquare, Square, IdCard,
  Eye, EyeOff, CloudOff, CloudUpload, RefreshCw, Download
} from 'lucide-react';

// --- Firebase Configuration ---
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: 'AIzaSyAvusDVNPbek2aikLxPn-jQY_oijWphD-I',
  authDomain: 'fcrthe1.firebaseapp.com',
  databaseURL: 'https://fcrthe1-default-rtdb.firebaseio.com',
  projectId: 'fcrthe1',
  storageBucket: 'fcrthe1.firebasestorage.app',
  messagingSenderId: '658973162849',
  appId: '1:658973162849:web:98d31445e9d50cd70ad920',
};

let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (error) {
  console.error("Firebase Initialization Error:", error);
}

const initialTasks = [
  {
    id: 'TASK-001', name: 'นาย สมชาย ใจดี', contractNo: 'CTR-2023-00921',
    assetType: 'รถยนต์ (Honda Civic)', plateNumber: '1กข 9999 กรุงเทพมหานคร',
    dept: 'AY', address: '123/45 หมู่ 6 ถ.สุขุมวิท ต.บางเมือง อ.เมือง จ.สมุทรปราการ', outstanding: '15,400.00 THB'
  },
  {
    id: 'TASK-002', name: 'นาง สมศรี มีทรัพย์', contractNo: 'CTR-2023-01055',
    assetType: 'รถจักรยานยนต์ (Yamaha Grand Filano)', plateNumber: '2ขค 5555 เชียงใหม่',
    dept: 'TTB', address: '88/9 ซอยพหลโยธิน 48 แขวงอนุสาวรีย์ เขตบางเขน กรุงเทพมหานคร', outstanding: '8,200.00 THB'
  }
];

const deptOptions = ["ทั้งหมด", "IT", "AY", "TLT", "SKL", "TTB", "KK", "LEGAL", "NTL", "BAY"];

function MainApp() {
  const [view, setView] = useState('login'); 
  const [currentUser, setCurrentUser] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loginEmpId, setLoginEmpId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [selectedDept, setSelectedDept] = useState('ทั้งหมด');
  const [activeTask, setActiveTask] = useState(null);
  const [selectedHistoryTask, setSelectedHistoryTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingTasks, setPendingTasks] = useState(initialTasks);
  const [historyTasks, setHistoryTasks] = useState([]);
  
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const [resultCode, setResultCode] = useState('');
  const [location, setLocation] = useState(null);
  
  // 🗺️ State สำหรับเก็บชื่อที่อยู่ภาษาไทย
  const [currentAddress, setCurrentAddress] = useState('กำลังค้นหาที่อยู่...');
  
  const [locationError, setLocationError] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [photos, setPhotos] = useState([]); 
  const [taskNote, setTaskNote] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [viewingPhoto, setViewingPhoto] = useState(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const [listeningField, setListeningField] = useState(null);

  const resultOptions = [
    { code: 'R01', desc: 'จบหน้างาน / ยึดรถ' },
    { code: 'R02', desc: 'จบหน้างาน / ชำระแล้ว 1งวด' },
    { code: 'R03', desc: 'จบหน้างาน / ชำระแล้ว 2 งวด' },
    { code: 'R04', desc: 'จบหน้างาน / ชำระแล้ว 3 งวด' },
    { code: 'R05', desc: 'จบหน้างาน / ทันงวด ปิดบัญชี' },
    { code: 'R06', desc: 'นัดชำระ' },
    { code: 'R07', desc: 'นัดคืนรถ' },
    { code: 'R08', desc: 'พบที่ตั้ง / พบรถ' },
    { code: 'R09', desc: 'พบที่ตั้ง / ไม่พบรถ' },
    { code: 'R10', desc: 'ย้ายออก / ลาออก' },
    { code: 'R11', desc: 'บ้านร้าง' },
    { code: 'R12', desc: 'เสียชีวิต' },
    { code: 'R13', desc: 'ไม่พบที่ตั้ง' },
  ];

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const savedQueue = localStorage.getItem('offlineTaskQueue');
    if (savedQueue) {
      try { setOfflineQueue(JSON.parse(savedQueue)); } catch(e) { console.error("Load queue error:", e); }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0 && db && !isSyncing) {
      syncOfflineData();
    }
  }, [isOnline, offlineQueue, isSyncing]);

  const syncOfflineData = async () => {
    setIsSyncing(true);
    let currentQueue = [...offlineQueue];
    let failedQueue = [];

    for (const task of currentQueue) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000));
        const pushPromise = push(ref(db, 'history_tasks'), task);
        await Promise.race([pushPromise, timeoutPromise]);
      } catch (error) {
        failedQueue.push(task); 
      }
    }

    setOfflineQueue(failedQueue);
    localStorage.setItem('offlineTaskQueue', JSON.stringify(failedQueue));
    setIsSyncing(false);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('fieldCollectorUser');
    if (savedUser) {
      try {
        const userObj = JSON.parse(savedUser);
        if (userObj && userObj.emp_id) { setCurrentUser(userObj); setView('home'); }
      } catch(e) { setCurrentUser({ emp_id: savedUser, username: savedUser }); setView('home'); }
    }
  }, []);

  useEffect(() => {
    if (currentUser && db && isOnline) {
      try {
        onValue(ref(db, 'pending_tasks'), (snapshot) => {
          const data = snapshot.val();
          if (data) setPendingTasks(Object.keys(data).map(key => ({ id: key, ...data[key] })));
          else setPendingTasks(initialTasks);
        });

        onValue(ref(db, 'history_tasks'), (snapshot) => {
          const data = snapshot.val();
          if (data) setHistoryTasks(Object.keys(data).map(key => ({ dbId: key, ...data[key] })).reverse());
          else setHistoryTasks([]);
        });
      } catch (err) { console.error("Fetch Data Error:", err); }
    }
  }, [currentUser, isOnline]);

  const toggleVoiceInput = (field, setter, append = false) => {
    if (listeningField === field) { recognitionRef.current?.stop(); setListeningField(null); return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('เบราว์เซอร์ของคุณไม่รองรับระบบสั่งงานด้วยเสียง');
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'th-TH';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => setListeningField(field);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (append) setter(prev => prev ? prev + ' ' + transcript : transcript);
        else setter(transcript);
      };
      recognition.onerror = () => setListeningField(null);
      recognition.onend = () => setListeningField(null);
      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) { setListeningField(null); }
  };

  useEffect(() => { return () => recognitionRef.current?.stop(); }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!isOnline && !currentUser) return setLoginError('ไม่มีสัญญาณอินเทอร์เน็ตสำหรับการล็อกอินครั้งแรก');
    if (!loginEmpId.trim() || !loginPassword.trim()) return setLoginError('กรุณากรอกรหัสพนักงานและรหัสผ่าน');
    if (!db) return setLoginError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่');

    onValue(ref(db, 'user'), (snapshot) => {
      const allUsers = snapshot.val();
      if (allUsers) {
        const foundKey = Object.keys(allUsers).find(key => (allUsers[key].emp_id === loginEmpId || key === loginEmpId) && allUsers[key].password === loginPassword);
        if (foundKey) {
          const userObj = { emp_id: allUsers[foundKey].emp_id || foundKey, username: allUsers[foundKey].username || foundKey };
          setLoginError(''); setCurrentUser(userObj);
          if (rememberMe) localStorage.setItem('fieldCollectorUser', JSON.stringify(userObj));
          setView('home');
        } else { setLoginError('รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง'); }
      } else { setLoginError('ไม่พบข้อมูลพนักงานในระบบ Database'); }
    }, { onlyOnce: true });
  };

  const handleLogout = () => {
    setCurrentUser(null); setLoginEmpId(''); setLoginPassword(''); setSearchQuery('');
    localStorage.removeItem('fieldCollectorUser'); 
    recognitionRef.current?.stop(); setView('login');
  };

  // 🗺️ ฟังก์ชันแปลงพิกัดแบบฉลาด (ไม่ใส่คำนำหน้าซ้ำซ้อน)
  const getThaiAddress = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      if(data && data.address) {
        const addr = data.address;
        const parts = [];
        if (addr.house_number) parts.push(`เลขที่ ${addr.house_number}`);
        
        if (addr.road) {
            parts.push(`${addr.road.startsWith('ถนน') || addr.road.startsWith('ซอย') ? '' : 'ถ.'}${addr.road}`);
        }
        if (addr.suburb || addr.village) {
            let sub = addr.suburb || addr.village;
            // 🛠️ ตัดคำว่าตำบลทิ้ง แล้วบังคับใช้คำว่า "แขวง" แทน
            sub = sub.replace(/^ตำบล\s*/, '');
            parts.push(`${sub.startsWith('แขวง') ? '' : 'แขวง '}${sub}`);
        }
        if (addr.city_district || addr.county || addr.town || addr.district) {
            let dist = addr.city_district || addr.county || addr.town || addr.district;
            // 🛠️ ตัดคำว่าอำเภอทิ้ง แล้วบังคับใช้คำว่า "เขต" แทนให้เข้าคู่กัน
            dist = dist.replace(/^อำเภอ\s*/, '');
            parts.push(`${dist.startsWith('เขต') ? '' : 'เขต '}${dist}`);
        }
        if (addr.city || addr.state || addr.province) {
            let prov = addr.city || addr.state || addr.province;
            parts.push(`${prov.startsWith('กรุงเทพ') || prov.startsWith('จังหวัด') ? '' : 'จ.'}${prov}`);
        }
        return parts.length > 0 ? parts.join(' ') : 'ไม่สามารถระบุที่อยู่ได้ชัดเจน';
      }
      return 'ไม่พบข้อมูลที่อยู่แบบละเอียด';
    } catch (err) {
      return 'ไม่สามารถดึงข้อมูลสถานที่ได้ (อาจไม่มีสัญญาณเน็ต)';
    }
  };

  const handleGetLocation = () => {
    setIsGettingLocation(true); setLocationError(''); setCurrentAddress('กำลังวิเคราะห์สถานที่จากดาวเทียม...');
    if (!navigator.geolocation) {
      setLocationError('เบราว์เซอร์ไม่รองรับ GPS'); setIsGettingLocation(false); return;
    }
    navigator.geolocation.getCurrentPosition(
      async (p) => { 
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); 
        setIsGettingLocation(false); 
        
        // ดึงที่อยู่หลังจากได้พิกัด
        const addrText = await getThaiAddress(p.coords.latitude, p.coords.longitude);
        setCurrentAddress(addrText);
      },
      () => { setLocationError('กรุณาเปิด GPS'); setIsGettingLocation(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (view === 'form' && activeTask && !location && !isGettingLocation) handleGetLocation();
  }, [view, activeTask]);

  // 📸 ปรับปรุง: ระบบตัดคำ (Word Wrap) ถ้ายาวเกินกรอบรูป
  const stampImage = (file, currentLocation, addressText) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          
          let width = img.width;
          let height = img.height;
          const maxDim = 1024; // ย่อขนาดเพื่อความไว
          if (width > height) { if (width > maxDim) { height *= maxDim / width; width = maxDim; } } 
          else { if (height > maxDim) { width *= maxDim / height; height = maxDim; } }
          
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const timestamp = new Date().toLocaleString('th-TH');
          const gpsText = currentLocation ? `GPS: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}` : 'GPS: ไม่พบพิกัด';
          
          const fontSize = Math.max(16, Math.floor(width * 0.035)); // ปรับตัวหนังสือให้ใหญ่กำลังดี
          ctx.font = `bold ${fontSize}px sans-serif`;
          
          // ✂️ ปัญญาประดิษฐ์ตัดคำ (Word Wrapper)
          const wrapTextForThai = (context, text, maxWidth) => {
            let words = text.split(' '); // แยกด้วยเว้นวรรคที่เราทำไว้ใน getThaiAddress
            let lines = [];
            let currentLine = '';
            for (let i = 0; i < words.length; i++) {
              let word = words[i];
              let testLine = currentLine === '' ? word : currentLine + ' ' + word;
              let testWidth = context.measureText(testLine).width;
              if (testWidth > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = word; // ปัดคำที่ยาวเกินลงบรรทัดใหม่
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine) lines.push(currentLine);
            return lines;
          };

          const maxTextWidth = width - 40; // เว้นขอบซ้าย 20 ขวา 20
          const addressLines = wrapTextForThai(ctx, `📍 ${addressText}`, maxTextWidth);
          
          // คำนวณความสูงของกรอบดำอัตโนมัติ ตามจำนวนบรรทัด
          const lineHeight = fontSize * 1.5;
          const totalLines = 2 + addressLines.length; // 2 คือบรรทัดเวลาและพิกัด + บรรทัดที่อยู่ที่ตัดมา
          const paddingY = fontSize * 1.2;
          const barHeight = (totalLines * lineHeight) + fontSize;
          
          // 🖤 วาดกรอบสีดำทึบด้านล่าง
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(0, height - barHeight, width, barHeight);
          
          // 📝 พิมพ์ตัวหนังสือสีขาว
          ctx.fillStyle = 'white';
          let startY = height - barHeight + paddingY;
          
          ctx.fillText(`🕒 ${timestamp}`, 20, startY);
          startY += lineHeight;
          
          ctx.fillText(`📡 ${gpsText}`, 20, startY);
          startY += lineHeight;
          
          // พิมพ์ที่อยู่ (ถ้ามีหลายบรรทัดมันจะวนลูปพิมพ์ไล่ลงมาเรื่อยๆ)
          addressLines.forEach(line => {
              ctx.fillText(line, 20, startY);
              startY += lineHeight;
          });
          
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (file && photos.length < 6 && location) {
      const stamped = await stampImage(file, location, currentAddress);
      setPhotos([...photos, stamped]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenTask = (task) => {
    setResultCode(''); setTaskNote(''); setLocation(null); setPhotos([]); setCurrentAddress('กำลังวิเคราะห์สถานที่...');
    recognitionRef.current?.stop(); setActiveTask(task); setView('form');
  };

  const handleBackToHome = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setActiveTask(null); setView('home');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!location) return alert('กรุณารอระบบระบุตำแหน่ง GPS');
    if (photos.length === 0) return alert('กรุณาแนบรูปภาพอย่างน้อย 1 รูป');
    if (!resultCode) return alert('กรุณาเลือกผลการลงพื้นที่');
    
    setIsSubmitting(true);
    
    const completed = {
      ...activeTask, 
      offlineId: `offline-${Date.now()}`,
      completedAt: new Date().toLocaleString('th-TH'), 
      recorded_by: currentUser?.emp_id || 'N/A',
      recorded_by_name: currentUser?.username || 'N/A',
      resultDesc: resultOptions.find(r => r.code === resultCode)?.desc,
      location, 
      addressDetails: currentAddress, // บันทึกชื่อสถานที่ด้วย
      photos, 
      taskNote, 
      resultCode
    };

    if (!isOnline) {
      const newQueue = [completed, ...offlineQueue];
      setOfflineQueue(newQueue);
      localStorage.setItem('offlineTaskQueue', JSON.stringify(newQueue));
      setIsSubmitting(false); setShowSuccess('offline'); 
      setTimeout(() => { setShowSuccess(false); handleBackToHome(); }, 2500);
      return;
    }

    const timeout = setTimeout(() => {
      if (isSubmitting) {
        setIsSubmitting(false);
        const newQueue = [completed, ...offlineQueue];
        setOfflineQueue(newQueue);
        localStorage.setItem('offlineTaskQueue', JSON.stringify(newQueue));
        alert("⏱️ ส่งช้าเกินไป: ระบบบันทึกงานลงในเครื่องไว้ชั่วคราวแล้วครับ (ตะกร้าออฟไลน์)");
        handleBackToHome();
      }
    }, 15000);

    if (db) {
      push(ref(db, 'history_tasks'), completed).then(() => {
        clearTimeout(timeout);
        setIsSubmitting(false); setShowSuccess('online'); 
        setTimeout(() => { setShowSuccess(false); handleBackToHome(); }, 2000);
      }).catch(err => {
        clearTimeout(timeout);
        const newQueue = [completed, ...offlineQueue];
        setOfflineQueue(newQueue);
        localStorage.setItem('offlineTaskQueue', JSON.stringify(newQueue));
        setIsSubmitting(false);
        alert("⚠️ ส่งไม่สำเร็จ: บันทึกในเครื่องแทนแล้ว");
        handleBackToHome();
      });
    }
  };

  const filteredTasks = pendingTasks.filter(t => selectedDept === 'ทั้งหมด' || t?.dept === selectedDept);
  const searchResults = pendingTasks.filter(t => {
    if (!searchQuery.trim()) return false;
    const query = searchQuery.toLowerCase();
    const pPlate = (t?.plateNumber || '').toLowerCase();
    const pName = (t?.name || t?.customerName || '').toLowerCase();
    const pContract = (t?.contractNo || t?.id || '').toLowerCase();
    return pPlate.includes(query) || pName.includes(query) || pContract.includes(query);
  });

  const MapPreview = ({ lat, lng }) => (
    <div className="w-full h-36 rounded-xl overflow-hidden border border-gray-200 mt-2 shadow-inner bg-gray-50">
      <iframe title="map" width="100%" height="100%" frameBorder="0" src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}></iframe>
    </div>
  );

  const openAddressInMaps = (address) => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  const openInGoogleMaps = (lat, lng) => window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        {!isOnline && (
          <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-[10px] py-1 text-center font-black z-[100] animate-pulse uppercase tracking-widest flex items-center justify-center gap-1">
            <CloudOff size={12}/> Offline Mode - ไม่มีการเชื่อมต่อเน็ต
          </div>
        )}
        <div className="absolute top-[-50px] right-[-50px] opacity-10"><Map size={300} /></div>
        <div className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-8 relative z-10">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="bg-blue-100 p-4 rounded-full mb-4 border border-blue-200"><MapPin size={40} className="text-blue-600" /></div>
            <h1 className="text-2xl font-black text-blue-900 tracking-tight">เข้าสู่ระบบ</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Field Collector App</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-200 flex items-center gap-2"><AlertCircle size={14} /> {loginError}</div>}
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2 tracking-wider">รหัสพนักงาน</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><IdCard size={18} className="text-gray-400" /></div>
                <input type="text" value={loginEmpId} onChange={(e) => setLoginEmpId(e.target.value)} placeholder="รหัสพนักงาน" className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2 tracking-wider">รหัสผ่าน</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock size={18} className="text-gray-400" /></div>
                <input type={showPassword ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-600"><Eye size={18} /></button>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={() => setRememberMe(!rememberMe)} className="flex items-center gap-2 text-sm text-gray-600 font-bold active:scale-95 transition-transform">
                {rememberMe ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-gray-400" />} จดจำการเข้าสู่ระบบ
              </button>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-base shadow-lg shadow-blue-200 mt-2 flex items-center justify-center gap-2 active:scale-95 transition-all"><LogIn size={20} /> เข้าสู่ระบบ</button>
          </form>
          <div className="mt-8 pt-6 border-t border-gray-100 text-center"><p className="text-[10px] text-gray-400 font-medium">© 2026 Collection System Version 32.1</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
      {!isOnline ? (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-[10px] py-1 text-center font-black z-[200] animate-pulse uppercase tracking-widest flex items-center justify-center gap-1">
          <CloudOff size={12}/> Offline Mode - โหมดออฟไลน์
        </div>
      ) : isSyncing ? (
        <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-[10px] py-1 text-center font-black z-[200] uppercase tracking-widest flex items-center justify-center gap-2">
          <RefreshCw size={12} className="animate-spin"/> กำลังส่งงานออฟไลน์ ({offlineQueue.length})
        </div>
      ) : null}

      {/* 🖼️ ภาพเต็มจอ + ปุ่มดาวน์โหลด */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-[600] bg-black/95 flex flex-col items-center justify-center p-4">
          <button onClick={() => setViewingPhoto(null)} className="absolute top-6 right-6 text-white p-2 active:scale-90 transition-transform"><X size={32} /></button>
          
          <img src={viewingPhoto} className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl border border-white/10" alt="Preview" />
          
          <a 
            href={viewingPhoto} 
            download={`evidence-${Date.now()}.jpg`} 
            className="mt-8 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-full font-black text-sm shadow-[0_10px_20px_rgba(37,99,235,0.4)] active:scale-95 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={20} /> ดาวน์โหลดและเซฟลงเครื่อง
          </a>
        </div>
      )}

      {view !== 'form' && view !== 'history-detail' && (
        <div className="bg-blue-800 text-white rounded-b-3xl pt-10 pb-8 px-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4"><Map size={150} /></div>
          <div className="relative z-10 flex justify-between items-center mb-6">
            <div>
              <p className="text-blue-200 text-xs font-medium mb-1 uppercase tracking-widest">รหัสพนักงาน: {currentUser?.emp_id || 'ไม่ระบุ'}</p>
              <h1 className="text-2xl font-bold flex items-center gap-2">{currentUser?.username || 'ไม่ระบุชื่อ'}</h1>
            </div>
            <button onClick={handleLogout} className="bg-white/20 p-3 rounded-full border border-white/30 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all shadow-sm"><LogOut size={24} className="text-white" /></button>
          </div>
          <div className="flex gap-4 relative z-10">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex-1 border border-white/10 text-center"><p className="text-blue-100 text-[10px] mb-1 uppercase font-bold tracking-wider">รายการงานวันนี้</p><p className="text-3xl font-bold">{pendingTasks.length}</p></div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex-1 border border-white/10 text-center relative">
              <p className="text-green-200 text-[10px] mb-1 uppercase font-bold tracking-wider">สำเร็จแล้ว</p>
              <p className="text-3xl font-bold text-green-400">{historyTasks.length + offlineQueue.length}</p>
              {offlineQueue.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border-2 border-blue-800 animate-bounce">
                  รอส่ง {offlineQueue.length}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto p-4 mt-2 space-y-5">
        {view === 'home' && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg"><Briefcase size={20} className="text-blue-600" /> งานที่ได้รับมอบหมาย</h2>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
                <Filter size={14} className="text-gray-400" />
                <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="text-xs font-bold text-gray-700 bg-transparent border-none outline-none focus:ring-0 cursor-pointer">
                  {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            {filteredTasks.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-300 opacity-60"><p className="font-medium text-gray-400">ไม่พบรายการงาน</p></div>
            ) : filteredTasks.map(t => (
                <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2"><span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">{t?.dept}</span><h3 className="font-bold text-gray-900">{t?.name || t?.customerName}</h3></div>
                      <p className="text-[11px] text-blue-600 font-bold flex items-center gap-1"><Tag size={12}/> {t?.assetType || 'ไม่มีข้อมูลประเภท'}</p>
                      <p className="text-xs bg-gray-100 text-gray-700 inline-block px-2 py-1 rounded-md font-bold mt-1 border border-gray-200">ทะเบียน: {t?.plateNumber || 'ไม่ระบุ'}</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded border uppercase">{t?.contractNo || t?.id}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{t?.address}</p>
                  <div className="flex justify-between items-center border-t pt-3">
                    <p className="font-bold text-red-600 tracking-tight">{t?.outstanding || 'N/A'}</p>
                    <button onClick={() => handleOpenTask(t)} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm">บันทึกงาน</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {view === 'search' && (
          <div className="space-y-4 animate-slide-up">
            <div className="px-1 mb-2">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg"><Search size={20} className="text-blue-600" /> ค้นหาข้อมูล</h2>
              <p className="text-xs text-gray-500 mt-1">ค้นหาจากทะเบียนรถ, ชื่อลูกค้า หรือเลขที่สัญญา</p>
            </div>
            <div className="relative sticky top-4 z-20">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search size={18} className={listeningField === 'search' ? "text-blue-500" : "text-gray-400"} /></div>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={listeningField === 'search' ? "กำลังฟังเสียงของคุณ..." : "พิมพ์ หรือ พูดเพื่อค้นหา..."} className={`w-full pl-11 pr-24 py-4 bg-white border rounded-2xl text-sm font-bold outline-none transition-all shadow-sm focus:shadow-md ${listeningField === 'search' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 focus:border-blue-500'}`} />
              <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                {searchQuery && (<button onClick={() => setSearchQuery('')} className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full transition-colors"><X size={14} /></button>)}
                <button onClick={() => toggleVoiceInput('search', setSearchQuery, false)} className={`p-2 rounded-full transition-all ${listeningField === 'search' ? 'bg-red-100 text-red-600 animate-pulse shadow-inner' : 'text-blue-600 hover:bg-blue-50 bg-blue-50/50 border border-blue-100'}`}><Mic size={18} /></button>
              </div>
            </div>
            <div className="pt-2">
              {!searchQuery.trim() && listeningField !== 'search' ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-300 opacity-60 mt-4"><Search size={32} className="mx-auto text-gray-300 mb-2" /><p className="font-medium text-gray-400 text-sm">พิมพ์ข้อมูล หรือ กดไมค์เพื่อพูด</p></div>
              ) : listeningField === 'search' ? (
                <div className="bg-blue-50 rounded-2xl p-10 text-center border border-blue-200 mt-4 animate-pulse"><Mic size={32} className="mx-auto text-blue-500 mb-2" /><p className="font-bold text-blue-700 text-sm">กำลังรับฟังเสียง...</p></div>
              ) : searchResults.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-300 opacity-60 mt-4"><AlertCircle size={32} className="mx-auto text-red-300 mb-2" /><p className="font-medium text-gray-400 text-sm">ไม่พบข้อมูลที่ตรงกับ <br/> "{searchQuery}"</p></div>
              ) : (
                <div className="space-y-4 mt-4">
                  <p className="text-xs font-bold text-gray-500 px-1">พบ {searchResults.length} รายการ</p>
                  {searchResults.map(t => (
                    <div key={t.id} onClick={() => handleOpenTask(t)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 active:bg-blue-50 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2"><span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">{t?.dept}</span><h3 className="font-bold text-gray-900">{t?.name || t?.customerName}</h3></div>
                          <p className="text-xs font-bold text-blue-700 bg-blue-50 inline-block px-2 py-1 rounded-md mt-1 border border-blue-100">ทะเบียน: {t?.plateNumber || 'N/A'}</p>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded border uppercase">{t?.contractNo || t?.id}</span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-3"><p className="text-[11px] text-gray-500 flex items-center gap-1"><Tag size={12}/> {t?.assetType || 'N/A'}</p><ChevronRight size={16} className="text-gray-300 group-active:text-blue-500" /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'form' && activeTask && (
          <div className="space-y-5 pb-10 animate-slide-up">
            <header className="flex items-center gap-3 mb-3 pl-1">
              <button onClick={() => setView(searchQuery ? 'search' : 'home')} className="p-2.5 bg-white rounded-full border border-gray-200 shadow-sm active:scale-90 transition-all text-gray-700">
                <ChevronLeft size={20} />
              </button>
              <h2 className="font-bold text-gray-800 text-base">ย้อนกลับ</h2>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="bg-[#f4f7fb] px-4 py-3 border-b border-[#e5ecf6] flex items-center gap-2">
                 <FileText size={18} className="text-[#1e40af]" />
                 <h2 className="font-bold text-[#1e40af] text-sm">ข้อมูลลูกค้า</h2>
               </div>
               <div className="p-4 space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs">ชื่อ-สกุล:</span>
                    <span className="font-bold text-gray-900">{activeTask?.name || activeTask?.customerName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs">แผนก / สัญญา:</span>
                    <span className="font-bold text-blue-600">{activeTask?.dept} | {activeTask?.contractNo || activeTask?.id}</span>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 flex items-center gap-1 text-xs"><Tag size={12}/> ประเภท:</span>
                      <span className="font-bold text-blue-800 text-xs">{activeTask?.assetType || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                      <span className="text-gray-500 text-xs">ทะเบียนรถ:</span>
                      <span className="font-bold text-gray-900 text-xs bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">{activeTask?.plateNumber || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2 space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-gray-700 text-xs leading-relaxed">{activeTask?.address}</p>
                    </div>
                    <button onClick={() => openAddressInMaps(activeTask?.address)} className="w-full bg-white border border-blue-200 text-blue-600 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:bg-blue-50 transition-all">
                      <Navigation size={14} /> นำทางด้วย Google Maps
                    </button>
                  </div>
                  
                  <div className="border-t border-gray-100 pt-3 text-right">
                    <span className="font-black text-red-600 text-[1.35rem] tracking-tight">{activeTask?.outstanding || 'N/A'}</span>
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 border-l-4 border-l-blue-500 space-y-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><ClipboardList size={18} className="text-blue-500" /> ข้อมูลปฏิบัติงาน</h3>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">พิกัด GPS อัตโนมัติ <span className="text-red-500">*</span></label>
                {!location ? (
                  <div className="bg-blue-50 border-2 border-dashed border-blue-100 py-8 rounded-xl flex flex-col items-center justify-center gap-2 font-bold text-blue-700">
                    <Navigation size={28} className="text-blue-400" /><p className="text-xs">กำลังระบุพิกัด...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <p className="text-[10px] font-mono font-bold text-green-600 tracking-tighter bg-green-50 px-2 py-1 rounded border border-green-100">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
                      <button onClick={handleGetLocation} className="text-[10px] text-blue-600 font-bold underline">อัปเดตพิกัด</button>
                    </div>
                    <p className="text-[10px] font-bold text-gray-500 px-1 line-clamp-2">📍 {currentAddress}</p>
                    <MapPreview lat={location.lat} lng={location.lng} />
                  </div>
                )}
              </div>
              
              <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center mb-3">
                  <label className={`text-xs font-bold ${!location ? 'text-gray-300' : 'text-gray-700'}`}>ภาพถ่ายหน้างาน <span className="text-red-500">*</span> {!location && <span className="text-[9px] text-red-400 ml-1 font-black">(รอ GPS)</span>}</label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${!location ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>{photos.length}/6</span>
                </div>
                
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handlePhotoCapture} disabled={!location} />
                
                <div className="grid grid-cols-2 gap-3">
                  {photos.map((p, i) => (
                    <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-gray-200" onClick={() => setViewingPhoto(p)}>
                      <img src={p} className="w-full h-full object-cover" />
                      <button onClick={(e) => { e.stopPropagation(); setPhotos(photos.filter((_, idx) => idx !== i)); }} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-lg"><X size={10} /></button>
                    </div>
                  ))}
                  {photos.length < 6 && (
                    <button onClick={() => location && fileInputRef.current.click()} disabled={!location} className={`aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all ${!location ? 'border-gray-100 bg-gray-50/50 text-gray-200 cursor-not-allowed' : 'border-gray-200 text-gray-400 active:bg-gray-50'}`}>
                      {location ? <Camera size={24} /> : <Lock size={20} />}<span className="text-[10px] font-bold mt-1 uppercase">{location ? 'เพิ่มรูป' : 'รอ GPS...'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">หมายเหตุ / รายละเอียด <span className="text-red-500">*</span></label>
                  <button onClick={(e) => { e.preventDefault(); toggleVoiceInput('note', setTaskNote, true); }} className={`text-[10px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 transition-all border ${listeningField === 'note' ? 'bg-red-100 text-red-600 border-red-200 animate-pulse' : 'bg-white text-blue-600 border-blue-200 shadow-sm active:scale-95'}`}><Mic size={12} /> {listeningField === 'note' ? 'กำลังฟัง...' : 'พูดเพื่อพิมพ์'}</button>
                </div>
                <textarea value={taskNote} onChange={(e) => setTaskNote(e.target.value)} placeholder={listeningField === 'note' ? "กำลังรอรับเสียง..." : "กรุณาระบุรายละเอียดการลงพื้นที่..."} className={`w-full p-3 border rounded-xl text-sm outline-none min-h-[100px] transition-all ${listeningField === 'note' ? 'bg-red-50/30 border-red-300 ring-2 ring-red-500/20' : 'bg-gray-50 focus:bg-white border-gray-200'}`} />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 border-l-4 border-l-green-500">
               <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><CheckCircle2 size={18} className="text-green-500" /> ผลการลงพื้นที่ <span className="text-red-500">*</span></h3>
               <select value={resultCode} onChange={(e) => setResultCode(e.target.value)} className="w-full p-3 border rounded-xl bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20" required>
                <option value="" disabled>-- กรุณาเลือกผลลัพธ์ --</option>
                {resultOptions.map(o => <option key={o.code} value={o.code}>{o.desc}</option>)}
               </select>
            </div>

            <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-blue-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:bg-gray-300">
              {isSubmitting ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <Save size={22} />} 
              {isOnline ? "บันทึกข้อมูลเข้าระบบ" : "บันทึกงานเก็บไว้ในเครื่อง"}
            </button>
            {!isOnline && <p className="text-center text-[10px] text-gray-400 font-bold mt-2">📍 ไม่ใช้เน็ต: ระบบจะอัปโหลดอัตโนมัติเมื่อพบสัญญาณ</p>}
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg px-1"><History size={20} className="text-blue-600" /> ประวัติและงานรอส่ง</h2>
            {offlineQueue.length > 0 && (
              <div className="mb-6 space-y-3">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest px-1 flex items-center gap-1"><CloudOff size={12}/> รอซิงค์เมื่อมีเน็ต ({offlineQueue.length})</p>
                {offlineQueue.map((t, i) => (
                  <div key={`off-${i}`} className="bg-orange-50 p-4 rounded-2xl border border-orange-200 shadow-sm flex items-center justify-between opacity-80">
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-gray-800">{t?.name || t?.customerName || 'ไม่ระบุชื่อ'}</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-white bg-orange-400 px-2 py-0.5 rounded tracking-tighter shadow-sm flex items-center gap-1"><Clock size={10}/> รอซิงค์</span>
                        <span className="text-[10px] font-bold text-gray-500">{t?.completedAt}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {historyTasks.length === 0 && offlineQueue.length === 0 ? (
              <div className="text-center py-20 opacity-40"><p className="font-medium text-gray-500">ยังไม่มีประวัติการส่งงาน</p></div>
            ) : historyTasks.map((t, i) => (
                <div key={i} onClick={() => { setSelectedHistoryTask(t); setView('history-detail'); }} className="bg-white p-4 rounded-2xl border-l-4 border-l-green-500 shadow-sm flex items-center justify-between active:bg-gray-50 transition-all cursor-pointer">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-gray-800">{t?.name || t?.customerName || 'ไม่ระบุชื่อ'}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded tracking-tighter flex items-center gap-1"><CheckCircle2 size={10}/> ส่งแล้ว</span>
                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">{t?.dept}</span>
                      <span className="text-[10px] font-bold text-gray-400">{t?.completedAt}</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300" />
                </div>
              ))
            }
          </div>
        )}

        {view === 'history-detail' && selectedHistoryTask && (
          <div className="space-y-5 pb-10 animate-slide-up">
            <header className="flex items-center gap-2 mb-2">
              <button onClick={() => setView('history')} className="p-2 bg-white rounded-full border shadow-sm active:scale-90 transition-all"><ChevronLeft size={20}/></button>
              <h2 className="font-bold text-gray-800">ย้อนกลับ</h2>
            </header>
            <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-4">
              <div className="flex justify-between items-center border-b pb-2"><h3 className="font-bold text-blue-900 flex items-center gap-2"><FileText size={18} /> รายละเอียดงาน</h3><span className="text-[10px] font-bold text-gray-400">{selectedHistoryTask.completedAt}</span></div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between font-medium"><span>ลูกค้า:</span><span className="font-bold text-gray-800">{selectedHistoryTask?.name || selectedHistoryTask?.customerName}</span></div>
                <div className="flex justify-between font-medium"><span>แผนก / สัญญา:</span><span className="font-bold text-indigo-600">{selectedHistoryTask?.dept} | {selectedHistoryTask?.contractNo || selectedHistoryTask?.id}</span></div>
                <div className="flex justify-between font-medium items-center border-t border-gray-50 pt-2 mt-2"><span>ผู้บันทึก:</span><span className="font-bold text-blue-600 flex items-center gap-1"><UserCheck size={14}/> {selectedHistoryTask?.recorded_by_name || selectedHistoryTask?.recordedBy || 'N/A'}</span></div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-l-4 border-l-blue-500 p-4 space-y-4">
              <h3 className="font-bold text-gray-800">ข้อมูลสถานที่</h3>
              {selectedHistoryTask.location && (
                <>
                  <MapPreview lat={selectedHistoryTask.location.lat} lng={selectedHistoryTask.location.lng} />
                  <button onClick={() => openInGoogleMaps(selectedHistoryTask.location.lat, selectedHistoryTask.location.lng)} className="w-full bg-blue-50 text-blue-600 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-blue-100 active:bg-blue-100"><Map size={14}/> เปิดใน Google Maps <ExternalLink size={12}/></button>
                </>
              )}
              {selectedHistoryTask.addressDetails && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">สถานที่อ้างอิง</p>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium">{selectedHistoryTask.addressDetails}</p>
                </div>
              )}
              
              {selectedHistoryTask.photos?.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">แตะที่รูปภาพเพื่อขยายและดาวน์โหลด</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedHistoryTask.photos.map((p, i) => (
                      <div key={i} className="rounded-xl overflow-hidden border aspect-video relative group cursor-pointer" onClick={() => setViewingPhoto(p)}>
                        <img src={p} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <ZoomIn className="text-white" size={24} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedHistoryTask.taskNote && <p className="bg-gray-50 p-3 rounded-xl text-sm italic text-gray-600 border border-dashed leading-relaxed">"{selectedHistoryTask.taskNote}"</p>}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-l-4 border-l-green-500 p-4">
              <h3 className="font-bold text-gray-800 mb-2">ผลการลงพื้นที่</h3>
              <div className="bg-green-50 p-3 rounded-xl border border-green-100 font-bold text-green-800 shadow-inner text-center">{selectedHistoryTask.resultDesc}</div>
            </div>
          </div>
        )}
      </main>

      {view !== 'login' && view !== 'form' && view !== 'history-detail' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-gray-100 p-3 pb-6 flex justify-around shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40">
          <button onClick={() => { handleBackToHome(); setView('home'); }} className={`flex flex-col items-center gap-1 p-2 transition-all flex-1 ${view === 'home' || (view === 'form' && !searchQuery) ? 'text-blue-700 font-bold' : 'text-gray-400 opacity-60'}`}><HomeIcon size={24} strokeWidth={2.5} /><span className="text-[10px] uppercase tracking-widest font-black">หน้าหลัก</span></button>
          <button onClick={() => { setView('search'); }} className={`flex flex-col items-center gap-1 p-2 transition-all flex-1 ${view === 'search' || (view === 'form' && searchQuery) ? 'text-blue-700 font-bold' : 'text-gray-400 opacity-60'}`}><Search size={24} strokeWidth={2.5} /><span className="text-[10px] uppercase tracking-widest font-black">ค้นหา</span></button>
          <button onClick={() => setView('history')} className={`relative flex flex-col items-center gap-1 p-2 transition-all flex-1 ${view === 'history' || view === 'history-detail' ? 'text-blue-700 font-bold' : 'text-gray-400 opacity-60'}`}>
            <History size={24} strokeWidth={2.5} />
            {offlineQueue.length > 0 && <span className="absolute top-1 right-8 w-2.5 h-2.5 bg-orange-500 rounded-full border border-white animate-pulse"></span>}
            <span className="text-[10px] uppercase tracking-widest font-black">ประวัติ</span>
          </button>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-[110] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
           <div className="bg-white p-10 rounded-3xl shadow-2xl border-2 border-gray-50 flex flex-col items-center animate-bounce-in">
              <div className={`p-4 rounded-full mb-6 ${showSuccess === 'offline' ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-600'}`}>
                {showSuccess === 'offline' ? <CloudUpload size={80} /> : <CheckCircle2 size={80} />}
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
                {showSuccess === 'offline' ? 'เก็บลงเครื่องแล้ว!' : 'ส่งงานสำเร็จ!'}
              </h2>
              <p className="text-gray-500 font-bold text-sm px-4">
                {showSuccess === 'offline' 
                  ? 'ข้อมูลจะถูกอัปโหลดขึ้นเซิร์ฟเวอร์อัตโนมัติเมื่อพบสัญญาณอินเทอร์เน็ตครับ' 
                  : 'ข้อมูลถูกส่งเข้าสู่ระบบส่วนกลางเรียบร้อยแล้ว'}
              </p>
           </div>
        </div>
      )}
      
      <style>{`
        @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce-in { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 font-sans text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border-t-8 border-red-500">
            <AlertCircle size={60} className="text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-black text-gray-900 mb-2">อัปเดตข้อมูลระบบขัดข้อง</h1>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">ล้างข้อมูลเครื่องและรีสตาร์ทแอป</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}