import React, { useState, useEffect, useRef } from 'react';
import {
  Map,
  MapPin,
  Camera,
  Mic,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  History,
  LogOut,
  AlertCircle,
  UserCircle,
  Lock,
  LogIn,
  Search,
  CheckSquare,
  Square,
  X,
  Eye,
  EyeOff,
  IdCard,
} from 'lucide-react';

// --- Firebase Configuration (ใช้ตัวเดิมที่คุณ King มี) ---
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyAvusDVNPbek2aikLxPn-jQY_oijWphD-I',
  authDomain: 'fcrthe1.firebaseapp.com',
  databaseURL: 'https://fcrthe1-default-rtdb.firebaseio.com',
  projectId: 'fcrthe1',
  storageBucket: 'fcrthe1.firebasestorage.app',
  messagingSenderId: '658973162849',
  appId: '1:658973162849:web:98d31445e9d50cd70ad920',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const App = () => {
  // --- States ---
  const [view, setView] = useState('login'); // login, home, detail
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmpId, setLoginEmpId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [pendingTasks, setPendingTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [photos, setPhotos] = useState([]);
  const [taskNote, setTaskNote] = useState('');
  const [resultCode, setResultCode] = useState('');
  const [location, setLocation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fileInputRef = useRef(null);

  const resultOptions = [
    { code: 'DONE', desc: 'ดำเนินการเรียบร้อย' },
    { code: 'NOT_FOUND', desc: 'ไม่พบเป้าหมาย' },
    { code: 'REJECTED', desc: 'ปฏิเสธ/ไม่ยินยอม' },
    { code: 'CLOSED', desc: 'สถานที่ปิด/ร้าง' },
  ];

  // --- Auto Login ---
  useEffect(() => {
    const saved = localStorage.getItem('fieldCollectorUser');
    if (saved) {
      setCurrentUser(JSON.parse(saved));
      setView('home');
    }
  }, []);

  // --- ดึงงานเมื่อเข้าหน้า Home ---
  useEffect(() => {
    if (currentUser) {
      onValue(ref(db, 'pending_tasks'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setPendingTasks(
            Object.keys(data).map((k) => ({ id: k, ...data[k] }))
          );
        } else {
          setPendingTasks([]);
        }
      });
    }
  }, [currentUser]);

  // --- Handlers ---
  const handleLogin = (e) => {
    e.preventDefault();
    onValue(
      ref(db, 'user'),
      (snapshot) => {
        const users = snapshot.val();
        const found = Object.values(users || {}).find(
          (u) => u.emp_id === loginEmpId && u.password === loginPassword
        );
        if (found) {
          const userObj = { emp_id: found.emp_id, username: found.username };
          setCurrentUser(userObj);
          localStorage.setItem('fieldCollectorUser', JSON.stringify(userObj));
          setView('home');
        } else {
          setLoginError('รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง');
        }
      },
      { onlyOnce: true }
    );
  };

  const handleTaskSelect = (task) => {
    setActiveTask(task);
    setView('detail');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((p) =>
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude })
      );
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!resultCode || photos.length === 0)
      return alert('กรุณากรอกข้อมูลให้ครบ');
    setIsSubmitting(true);
    const data = {
      ...activeTask,
      result_code: resultCode,
      photos,
      task_note: taskNote,
      location,
      recorded_by: currentUser.emp_id,
      timestamp: new Date().toISOString(),
    };
    push(ref(db, 'history_tasks'), data).then(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setView('home');
        setPhotos([]);
        setTaskNote('');
      }, 2000);
    });
  };

  // --- View 1: Login ---
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-blue-900 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
              <MapPin size={40} />
            </div>
            <h1 className="text-2xl font-black text-blue-900">เข้าสู่ระบบ</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
              Field Collector App
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="text-red-500 text-xs font-bold text-center bg-red-50 p-2 rounded-lg border border-red-100">
                {loginError}
              </div>
            )}
            <div>
              <label className="text-xs font-black text-gray-500 uppercase ml-1">
                รหัสพนักงาน
              </label>
              <input
                type="text"
                value={loginEmpId}
                onChange={(e) => setLoginEmpId(e.target.value)}
                className="w-full mt-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none"
                placeholder="A01234501"
              />
            </div>
            <div className="relative">
              <label className="text-xs font-black text-gray-500 uppercase ml-1">
                รหัสผ่าน
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full mt-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 bottom-4 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-base shadow-lg active:scale-95 transition-all mt-4"
            >
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- View 2: Home ---
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-800 text-white p-6 rounded-b-[32px] shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest">
                Employee ID: {currentUser?.emp_id}
              </p>
              <h2 className="text-xl font-black">
                คุณ {currentUser?.username}
              </h2>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('fieldCollectorUser');
                setView('login');
              }}
              className="bg-white/10 p-2 rounded-xl"
            >
              <LogOut size={20} />
            </button>
          </div>
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="ค้นหาชื่อลูกค้า..."
              className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl text-sm font-bold text-gray-800 outline-none shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="p-6">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            รายการงานวันนี้
          </h3>
          <div className="space-y-3">
            {pendingTasks
              .filter((t) => t.customerName.includes(searchQuery))
              .map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <p className="font-black text-sm text-gray-800">
                        {task.customerName}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                        {task.dept} | {task.id}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300" />
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  // --- View 3: Detail/Form ---
  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white p-4 flex items-center gap-4 border-b">
        <button onClick={() => setView('home')}>
          <ChevronLeft size={24} />
        </button>
        <h3 className="font-black text-lg">บันทึกผลงาน</h3>
      </div>
      <div className="p-6 space-y-6">
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <span className="text-blue-600 text-[10px] font-black uppercase bg-blue-50 px-2 py-1 rounded">
            {activeTask?.dept}
          </span>
          <h2 className="text-xl font-black mt-2">
            {activeTask?.customerName}
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-1">
            {activeTask?.address}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-black text-gray-400 uppercase">
              ผลการดำเนินงาน
            </label>
            <div className="grid grid-cols-2 gap-2">
              {resultOptions.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setResultCode(opt.code)}
                  className={`p-4 rounded-2xl text-[10px] font-black border-2 transition-all ${
                    resultCode === opt.code
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'bg-white text-gray-400 border-gray-100'
                  }`}
                >
                  {opt.desc}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-black text-gray-400 uppercase">
              รูปถ่ายหน้างาน
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-w-[100px] h-[100px] bg-gray-100 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200 text-gray-400 active:scale-90 transition-all"
              >
                <Camera size={24} />
                <span className="text-[10px] mt-1 font-bold">ถ่ายภาพ</span>
              </button>
              <input
                type="file"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => {
                  const r = new FileReader();
                  r.onload = () => setPhotos([...photos, r.result]);
                  r.readAsDataURL(e.target.files[0]);
                }}
              />
              {photos.map((p, i) => (
                <img
                  key={i}
                  src={p}
                  className="w-[100px] h-[100px] object-cover rounded-2xl border"
                />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-black text-gray-400 uppercase">
              รายละเอียดเพิ่มเติม
            </label>
            <textarea
              value={taskNote}
              onChange={(e) => setTaskNote(e.target.value)}
              className="w-full h-32 p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500"
              placeholder="พิมพ์ข้อมูลที่นี่..."
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'กำลังส่ง...' : 'บันทึกและส่งงาน'}
          </button>
        </form>
      </div>
      {showSuccess && (
        <div className="fixed inset-0 bg-blue-900/90 flex items-center justify-center z-50 p-6">
          <div className="bg-white p-10 rounded-3xl text-center">
            <CheckCircle2 size={60} className="text-green-500 mx-auto mb-4" />
            <h4 className="text-2xl font-black">สำเร็จ!</h4>
            <p className="text-gray-500 font-bold">บันทึกข้อมูลเรียบร้อย</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
