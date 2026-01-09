
import React, { useState, useMemo, useEffect } from 'react';
import { LogisticsRecord, ForwarderAssessment, ServiceStandard } from './types';
import { analyzeLogisticsData, generateCollectiveFeedbackEmail, generateExplanationEmail } from './services/geminiService';
import { parseLogisticsCSV } from './utils/csvParser';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell
} from 'recharts';

// Firebase Imports
// @ts-ignore
import { initializeApp, getApp, getApps } from 'firebase/app';
// @ts-ignore
import { getFirestore, collection, setDoc, doc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

/**
 * 重要操作：
 * 请将下方的配置替换为你从 Firebase 控制台获取的实际配置。
 */
const firebaseConfig = {
  apiKey: "请替换为你的API_KEY",
  authDomain: "请替换为你的AUTH_DOMAIN",
  projectId: "请替换为你的PROJECT_ID",
  storageBucket: "请替换为你的STORAGE_BUCKET",
  messagingSenderId: "请替换为你的SENDER_ID",
  appId: "请替换为你的APP_ID"
};

const TRANSLATIONS = {
  EN: {
    auditTitle: "214 Audit Hub",
    assessmentTitle: "Service Scorecard",
    importData: "Upload 214 CSV",
    newAssessment: "Add Score",
    editAssessment: "Edit Score",
    partners: "Forwarders",
    ranking: "Ranking",
    standards: "SOP Standards",
    aiReport: "AI Insight Report",
    genReport: "Generate Analysis",
    monthPeriod: "Target Month",
    fwdName: "Forwarder",
    scoreLabel: "Auto Score",
    finalize: "Save to Cloud",
    updateRecord: "Update Record",
    deleteConfirm: "Confirm deletion from Cloud?",
    selectFwd: "Select Forwarder...",
    switchLang: "中文",
    filterByMonth: "Timeline:",
    allMonths: "All History",
    syncing: "Syncing...",
    synced: "Cloud Linked",
    pushCloud: "Push to Database",
    exportData: "Export Backup",
    importBackup: "Import Backup",
    genCollectiveEmail: "Group Feedback Email",
    copySuccess: "Copied!",
    collectiveEmailTitle: "Partner Performance Review",
    auditSummary: "Past Due Shipment Report",
    totalShipments: "Total Past Due",
    clearData: "Clear Local Data",
    genAggregatedEmail: "Draft FWD Follow-up Email",
    filterFwd: "Filter by FWD:",
    allFwd: "All Forwarders",
    addNewFwd: "+ Add New FWD",
    remarksLabel: "Supplementary Explanation",
    remarksPlaceholder: "Enter any additional observations...",
    adminLogin: "Admin Access",
    username: "Username",
    password: "Password",
    loginBtn: "Authorize",
    loginError: "Invalid Credentials",
    logout: "Sign Out",
    followUpRequired: "Follow-up Required",
    shipmentsToExplain: "shipments to explain",
    editAuditDate: "Correct Delivery Date",
    saveChanges: "Save Changes",
    activateAI: "Activate AI",
    aiReady: "AI Engine Ready",
    aiConfig: "AI Config Needed",
    exportAssessment: "Export Scores (CSV)",
    dbError: "Database Sync Error",
    dbWait: "Config Firebase First"
  },
  CN: {
    auditTitle: "214 审计中心",
    assessmentTitle: "服务评估看板",
    importData: "上传 214 数据",
    newAssessment: "录入新评分",
    editAssessment: "修改评分内容",
    partners: "货代总数",
    ranking: "绩效排名",
    standards: "服务标准手册",
    aiReport: "AI 智能绩效报告",
    genReport: "生成深度分析",
    monthPeriod: "评估月份",
    fwdName: "货代名称",
    scoreLabel: "系统总分",
    finalize: "保存至云端",
    updateRecord: "更新云端记录",
    deleteConfirm: "确定要从云端彻底删除此记录吗？",
    selectFwd: "请选择货代...",
    switchLang: "English",
    filterByMonth: "月份：",
    allMonths: "全部月份",
    syncing: "同步中...",
    synced: "云端已就绪",
    pushCloud: "同步到数据库",
    exportData: "导出备份",
    importBackup: "恢复备份",
    genCollectiveEmail: "生成全员反馈邮件",
    copySuccess: "已复制",
    collectiveEmailTitle: "合作伙伴绩效回顾",
    auditSummary: "Past Due 运单审计报表",
    totalShipments: "待解释 Shipment 总量",
    clearData: "清空本地数据",
    genAggregatedEmail: "汇总生成该货代催办邮件",
    filterFwd: "筛选货代:",
    allFwd: "全部货代",
    addNewFwd: "+ 新增货代",
    remarksLabel: "补充说明",
    remarksPlaceholder: "在此输入任何特别说明或观察结果...",
    adminLogin: "管理员登录",
    username: "用户名",
    password: "密码",
    loginBtn: "授权进入",
    loginError: "用户名或密码错误",
    logout: "退出登录",
    followUpRequired: "待跟进汇总",
    shipmentsToExplain: "条运单待解释",
    editAuditDate: "修正日期错误",
    saveChanges: "保存修改",
    activateAI: "激活 AI 引擎",
    aiReady: "AI 引擎已就绪",
    aiConfig: "需要配置 AI",
    exportAssessment: "导出评分数据",
    dbError: "云端同步失败",
    dbWait: "请先配置 Firebase"
  }
};

const SERVICE_STANDARDS: ServiceStandard[] = [
  { category: '214 Data', item: 'Frequency', detail: 'Daily EDI upload required (High frequency)', goal: 'Data Freshness' },
  { category: '214 Data', item: 'Completeness', detail: 'All mandatory nodes populated in 214', goal: 'Full Visibility' },
  { category: 'Data Quality', item: 'Standardization', detail: 'Address and timestamp formats must be compliant', goal: 'Data Mapping' },
  { category: 'Customer Service', item: 'Response', detail: 'Email reply: 2h for urgent, 4h for standard', goal: 'SLA Compliance' }
];

const BASE_FORWARDER_LIST = ["THI", "AGS", "Dimerco", "DP World", "JAS Forwarding", "Kuehne+Nagel", "Pegasus Forwarding", "Scan Global Logistics", "Schneider", "Speedmark"];

const ADMIN_CREDENTIALS = {
  username: 'rhodes',
  password: '102410'
};

const App: React.FC = () => {
  const [lang, setLang] = useState<'EN' | 'CN'>('CN');
  const t = TRANSLATIONS[lang];
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'ASSESSMENT'>('ASSESSMENT');
  const [dbStatus, setDbStatus] = useState<'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE'>('OFFLINE');
  
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isStandardsOpen, setIsStandardsOpen] = useState(false);
  
  const [isApiKeyActive, setIsApiKeyActive] = useState(() => {
    // @ts-ignore
    return !!(typeof process !== 'undefined' && process.env && process.env.API_KEY);
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('corsair_admin_auth') === 'true');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState(false);

  const [logisticsRecords, setLogisticsRecords] = useState<LogisticsRecord[]>([]);
  const [auditFilterFwd, setAuditFilterFwd] = useState<string>('ALL');
  const [editingAuditId, setEditingAuditId] = useState<string | null>(null);
  const [tempEdd, setTempEdd] = useState("");

  const [collectiveEmail, setCollectiveEmail] = useState<string>('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const [assessments, setAssessments] = useState<ForwarderAssessment[]>([]);

  // Initialize Firestore
  const db = useMemo(() => {
    try {
      if (firebaseConfig.apiKey.includes("请替换")) {
          setDbStatus('OFFLINE');
          return null;
      }
      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      return getFirestore(app);
    } catch (e) {
      console.warn("Firebase config invalid", e);
      setDbStatus('ERROR');
      return null;
    }
  }, []);

  // Fetch from Cloud on Mount
  useEffect(() => {
    if (!db) {
      const saved = localStorage.getItem('fwd_assessments_local_cache');
      if (saved) setAssessments(JSON.parse(saved));
      return;
    }

    setDbStatus('SYNCING');
    const q = query(collection(db, "fwd_assessments"), orderBy("month", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => doc.data() as ForwarderAssessment);
      setAssessments(data);
      setDbStatus('IDLE');
      localStorage.setItem('fwd_assessments_local_cache', JSON.stringify(data));
    }, (error: any) => {
      console.error("Firestore Error:", error);
      setDbStatus('ERROR');
    });

    return () => unsubscribe();
  }, [db]);

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<{ month: string, company: string } | null>(null);
  const [newEntry, setNewEntry] = useState<ForwarderAssessment>({
    month: new Date().toISOString().substring(0, 7),
    company: '', frequency: 'High', completeness: 'Excellent', formatStandards: 'Compliant', emailResponse: '≤2 hours', evaluation: 'Excellent', score: 10, remarks: ''
  });
  const [isAddingNewFwd, setIsAddingNewFwd] = useState(false);
  const [customFwdName, setCustomFwdName] = useState('');

  const saveToCloud = async (entry: ForwarderAssessment) => {
    if (!db) {
        // Fallback to local
        const updated = [...assessments.filter(a => !(a.month === entry.month && a.company === entry.company)), entry];
        setAssessments(updated);
        localStorage.setItem('fwd_assessments_local_cache', JSON.stringify(updated));
        return;
    };
    setDbStatus('SYNCING');
    try {
      const docId = `${entry.month}_${entry.company.replace(/\s+/g, '_')}`;
      await setDoc(doc(db, "fwd_assessments", docId), entry);
      setDbStatus('IDLE');
    } catch (e) {
      console.error(e);
      setDbStatus('ERROR');
      alert(t.dbError);
    }
  };

  const removeFromCloud = async (month: string, company: string) => {
    if (!db) {
        const updated = assessments.filter(a => !(a.month === month && a.company === company));
        setAssessments(updated);
        localStorage.setItem('fwd_assessments_local_cache', JSON.stringify(updated));
        return;
    }
    setDbStatus('SYNCING');
    try {
      const docId = `${month}_${company.replace(/\s+/g, '_')}`;
      await deleteDoc(doc(db, "fwd_assessments", docId));
      setDbStatus('IDLE');
    } catch (e) {
      console.error(e);
      setDbStatus('ERROR');
    }
  };

  const handleActivateAI = async () => {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setIsApiKeyActive(true);
    } else {
      alert("System key selector not available. Please ensure you have set API_KEY in Vercel/Cloud Run Environment.");
    }
  };

  const dynamicFwdList = useMemo(() => {
    const fromAssessments = assessments.map(a => a.company);
    const combined = Array.from(new Set([...BASE_FORWARDER_LIST, ...fromAssessments]));
    return combined.sort();
  }, [assessments]);

  const availableMonths = useMemo(() => {
    return Array.from(new Set(assessments.map(a => a.month))).sort((a: string, b: string) => b.localeCompare(a));
  }, [assessments]);

  const [matrixFilterMonth, setMatrixFilterMonth] = useState<string>('');

  useEffect(() => {
    if (!matrixFilterMonth && availableMonths.length > 0) {
      setMatrixFilterMonth(availableMonths[0]);
    }
  }, [availableMonths, matrixFilterMonth]);

  const dashboardData = useMemo(() => {
    const relevant = assessments.filter(a => matrixFilterMonth === 'ALL' ? true : a.month === matrixFilterMonth);
    const scores: { [key: string]: { sum: number, count: number } } = {};
    relevant.forEach(a => {
      if (!scores[a.company]) scores[a.company] = { sum: 0, count: 0 };
      scores[a.company].sum += a.score;
      scores[a.company].count++;
    });
    return Object.entries(scores).map(([name, d]) => ({ name, score: parseFloat((d.sum / d.count).toFixed(2)) })).sort((a, b) => b.score - a.score);
  }, [assessments, matrixFilterMonth]);

  const filteredGrouped = useMemo(() => {
    const filtered = assessments.filter(a => matrixFilterMonth === 'ALL' ? true : a.month === matrixFilterMonth);
    const groups: { [key: string]: ForwarderAssessment[] } = {};
    filtered.forEach(a => {
      if (!groups[a.month]) groups[a.month] = [];
      groups[a.month].push(a);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [assessments, matrixFilterMonth]);

  const pastDueRecords = useMemo(() => {
    return logisticsRecords.filter(r => r.isOverdue && !r.actualDeliveryDate);
  }, [logisticsRecords]);

  const pastDueSummary = useMemo(() => {
    const summary: { [key: string]: LogisticsRecord[] } = {};
    pastDueRecords.forEach(r => {
      if (!summary[r.forwarderName]) summary[r.forwarderName] = [];
      summary[r.forwarderName].push(r);
    });
    return Object.entries(summary).sort((a, b) => b[1].length - a[1].length);
  }, [pastDueRecords]);

  const handleError = (e: any) => {
    console.error(e);
    const msg = e.message || "Unknown error";
    alert(`AI Service Error: ${msg}\n\nPlease check your API_KEY.`);
  };

  const handleExportAssessments = () => {
    const dataToExport = assessments.filter(a => matrixFilterMonth === 'ALL' ? true : a.month === matrixFilterMonth);
    if (dataToExport.length === 0) return;
    const headers = ["Month", "Company", "Frequency", "Completeness", "Standards", "EmailResponse", "Evaluation", "Score", "Remarks"];
    const csvContent = [headers.join(","), ...dataToExport.map(a => [a.month, `"${a.company}"`, a.frequency, a.completeness, a.formatStandards, a.emailResponse, a.evaluation, a.score, `"${(a.remarks || "").replace(/"/g, '""')}"`].join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Assessments_${matrixFilterMonth}.csv`;
    link.click();
  };

  const handleGenerateAggregatedEmail = async (fwdName: string, records: LogisticsRecord[]) => {
    setIsEmailLoading(true);
    try {
      const content = await generateExplanationEmail(fwdName, records);
      setCollectiveEmail(content);
      setShowEmailModal(true);
    } catch (e: any) {
      handleError(e);
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGenerateCollectiveEmail = async () => {
    setIsEmailLoading(true);
    try {
      const currentMonth = matrixFilterMonth === 'ALL' ? (availableMonths[0] || '') : matrixFilterMonth;
      const currentData = assessments.filter(a => a.month === currentMonth);
      const emailContent = await generateCollectiveFeedbackEmail(currentMonth, currentData);
      setCollectiveEmail(emailContent);
      setShowEmailModal(true);
    } catch (e: any) {
      handleError(e);
    } finally {
      setIsEmailLoading(false);
    }
  };

  const generateAIInsight = async () => {
    setIsAiLoading(true);
    try {
      const report = await analyzeLogisticsData(logisticsRecords);
      setAiAnalysis(report);
    } catch (e: any) {
      handleError(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseLogisticsCSV(text);
        setLogisticsRecords(parsed);
      };
      reader.readAsText(file);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === ADMIN_CREDENTIALS.username && loginForm.password === ADMIN_CREDENTIALS.password) {
      setIsLoggedIn(true);
      setLoginError(false);
      localStorage.setItem('corsair_admin_auth', 'true');
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('corsair_admin_auth');
    setActiveTab('ASSESSMENT');
  };

  const handleAuditDelete = (id: string) => {
    if (confirm(t.deleteConfirm)) {
      setLogisticsRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleAuditUpdateDate = (id: string, newDate: string) => {
    setLogisticsRecords(prev => prev.map(r => {
      if (r.id === id) {
        const d = new Date(newDate);
        const isOverdue = !isNaN(d.getTime()) && d < new Date();
        return { ...r, estimatedDeliveryDate: newDate, isOverdue };
      }
      return r;
    }));
    setEditingAuditId(null);
  };

  const getTagStyle = (text: string) => {
    const val = text.toLowerCase();
    if (val.includes('high') || val === 'excellent' || val === 'compliant') return 'text-emerald-600 bg-emerald-50';
    if (val === 'good' || val.includes('basically')) return 'text-indigo-600 bg-indigo-50';
    if (val === 'fair' || val.includes('medium')) return 'text-amber-600 bg-amber-50';
    if (val === 'low' || val.includes('>4') || val === 'fail') return 'text-rose-600 bg-rose-50';
    return 'text-slate-500 bg-slate-50';
  };

  const auditFwdOptions = useMemo(() => {
    const fwds = new Set(pastDueRecords.map(r => r.forwarderName));
    return Array.from(fwds).sort();
  }, [pastDueRecords]);

  const displayAuditRecords = useMemo(() => {
    if (auditFilterFwd === 'ALL') return pastDueRecords;
    return pastDueRecords.filter(r => r.forwarderName === auditFilterFwd);
  }, [pastDueRecords, auditFilterFwd]);

  useEffect(() => {
    let base = 4.0;
    if (newEntry.frequency === 'High') base += 1.5;
    else if (newEntry.frequency === 'Medium') base += 0.5;
    if (newEntry.completeness === 'Excellent') base += 1.5;
    else if (newEntry.completeness === 'Good') base += 0.5;
    if (newEntry.formatStandards === 'Compliant') base += 1.5;
    else if (newEntry.formatStandards === 'Basically Compliant') base += 0.5;
    if (newEntry.emailResponse === '≤2 hours') base += 1.5;
    else if (newEntry.emailResponse === '≤4 hours') base += 0.5;
    const finalScore = Math.min(10, base);
    let evalStr = "Fair";
    if (finalScore >= 9) evalStr = "Excellent";
    else if (finalScore >= 8) evalStr = "Good";
    setNewEntry(prev => ({ ...prev, score: finalScore, evaluation: evalStr }));
  }, [newEntry.frequency, newEntry.completeness, newEntry.formatStandards, newEntry.emailResponse]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-database"></i>
            </div>
            <div>
              <h1 className="font-black text-xl uppercase italic leading-none tracking-tight">{t.auditTitle}</h1>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${dbStatus === 'SYNCING' ? 'bg-amber-400 animate-pulse' : dbStatus === 'ERROR' ? 'bg-rose-500' : dbStatus === 'OFFLINE' ? 'bg-slate-300' : 'bg-emerald-500'}`}></span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {dbStatus === 'SYNCING' ? t.syncing : dbStatus === 'ERROR' ? t.dbError : dbStatus === 'OFFLINE' ? t.dbWait : t.synced}
                  </span>
                </div>
                <div className="w-px h-2 bg-slate-200"></div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isApiKeyActive ? 'bg-indigo-500' : 'bg-slate-300'}`}></span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{isApiKeyActive ? t.aiReady : t.aiConfig}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button onClick={() => setActiveTab('ASSESSMENT')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'ASSESSMENT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}>
               <i className="fas fa-star mr-2"></i> {t.assessmentTitle}
             </button>
             <button onClick={() => setActiveTab('AUDIT')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'AUDIT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}>
               <i className="fas fa-shield-halved mr-2"></i> {t.auditTitle}
             </button>
          </div>

          <div className="flex gap-4 items-center">
             <button onClick={handleActivateAI} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${isApiKeyActive ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-600 text-white shadow-md'}`}>
                <i className={`fas fa-${isApiKeyActive ? 'check' : 'plug'} mr-2`}></i> {t.activateAI}
             </button>
             <button onClick={() => setLang(lang === 'EN' ? 'CN' : 'EN')} className="px-4 py-2 border border-slate-200 rounded-lg text-[10px] font-black uppercase hover:bg-white transition-all">
                {t.switchLang}
             </button>
             {isLoggedIn && (
               <button onClick={handleLogout} className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-400 rounded-lg text-[10px] font-black uppercase hover:text-rose-600 transition-all">
                  <i className="fas fa-sign-out-alt mr-2"></i> {t.logout}
               </button>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {activeTab === 'ASSESSMENT' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {dbStatus === 'OFFLINE' && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-4 text-amber-700 text-[11px] font-bold">
                    <i className="fas fa-info-circle text-lg text-amber-500"></i>
                    <div>请在 <code>App.tsx</code> 中填入你的 Firebase 配置信息以开启云端同步功能。目前数据仅保存在本地。</div>
                </div>
            )}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between overflow-x-auto">
              <div className="flex items-center gap-6">
                <span className="text-[11px] font-black uppercase text-indigo-600 whitespace-nowrap">{t.filterByMonth}</span>
                <div className="flex gap-2">
                  <button onClick={() => setMatrixFilterMonth('ALL')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${matrixFilterMonth === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{t.allMonths}</button>
                  {availableMonths.map(m => (
                    <button key={m} onClick={() => setMatrixFilterMonth(m)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${matrixFilterMonth === m ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleExportAssessments}
                  className="px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[9px] font-black uppercase hover:bg-slate-100 transition-all shadow-sm"
                >
                  <i className="fas fa-file-export mr-2"></i> {t.exportAssessment}
                </button>
                <button 
                  onClick={() => {
                    setEditingIndex(null);
                    setNewEntry({
                      month: availableMonths[0] || new Date().toISOString().substring(0, 7),
                      company: '', frequency: 'High', completeness: 'Excellent', formatStandards: 'Compliant', emailResponse: '≤2 hours', evaluation: 'Excellent', score: 10, remarks: ''
                    });
                    setShowEntryModal(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-emerald-700 transition-all shadow-md"
                >
                  <i className="fas fa-plus mr-2"></i> {t.newAssessment}
                </button>
                <button 
                  onClick={handleGenerateCollectiveEmail}
                  disabled={isEmailLoading}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase border border-indigo-100 hover:bg-indigo-100 transition-all"
                >
                  {isEmailLoading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-mail-bulk mr-2"></i>}
                  {t.genCollectiveEmail}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[500px] flex flex-col">
                <h3 className="text-sm font-black uppercase italic tracking-tighter mb-10 flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                  {t.ranking} ({matrixFilterMonth === 'ALL' ? t.allMonths : matrixFilterMonth})
                </h3>
                <div className="flex-1 w-full min-h-[350px]">
                  <ResponsiveContainer width="99%" height="100%" minHeight={350}>
                    <BarChart data={dashboardData} layout="vertical" margin={{ left: 40, right: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide domain={[0, 10]} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} width={120} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}} cursor={{fill: '#f8fafc'}} />
                      <Bar dataKey="score" radius={[0, 12, 12, 0]} barSize={24}>
                        {dashboardData.map((e, idx) => <Cell key={idx} fill={e.score >= 8 ? '#10b981' : e.score < 7 ? '#f43f5e' : '#6366f1'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100 flex flex-col min-h-[300px]">
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center justify-between">
                    <span>{t.aiReport}</span>
                    <i className="fas fa-wand-magic-sparkles"></i>
                  </h3>
                  {aiAnalysis ? (
                    <div className="text-xs leading-relaxed text-indigo-100 whitespace-pre-wrap flex-1 overflow-y-auto max-h-[300px] bg-white/5 p-4 rounded-2xl border border-white/10 scrollbar-hide">
                      {aiAnalysis}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                       <p className="text-[10px] font-bold text-indigo-300 uppercase italic opacity-60">Ready to analyze performance</p>
                       <button 
                        onClick={generateAIInsight}
                        disabled={isAiLoading}
                        className="mt-6 px-8 py-3 bg-white text-indigo-900 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-50 transition-all disabled:opacity-50"
                       >
                         {isAiLoading ? <i className="fas fa-spinner animate-spin"></i> : t.genReport}
                       </button>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                   <button onClick={() => setIsStandardsOpen(!isStandardsOpen)} className="w-full p-8 flex items-center justify-between text-left hover:bg-slate-50 transition-colors">
                     <h3 className="text-xs font-black uppercase text-slate-500 tracking-[0.2em]">{t.standards}</h3>
                     <i className={`fas fa-chevron-${isStandardsOpen ? 'up' : 'down'} text-slate-300`}></i>
                   </button>
                   {isStandardsOpen && (
                     <div className="px-8 pb-8 space-y-6 animate-in slide-in-from-top-4 duration-300">
                        {SERVICE_STANDARDS.map((s, i) => (
                          <div key={i} className="group border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                            <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">{s.item}</div>
                            <p className="text-[11px] font-medium text-slate-600 mb-1 leading-relaxed">{s.detail}</p>
                            <div className="text-[8px] font-black text-emerald-600 italic">Target: {s.goal}</div>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {filteredGrouped.map(([month, data]) => (
                <div key={month} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase italic tracking-tight">{month}</h2>
                    <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 uppercase">{data.length} {t.partners}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/30 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                        <tr>
                          <th className="px-8 py-6">{t.fwdName}</th>
                          <th className="px-6 py-6 text-center">Metrics</th>
                          <th className="px-6 py-6 text-center">{t.remarksLabel}</th>
                          <th className="px-8 py-6 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.map((a, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/10 transition-colors group">
                            <td className="px-8 py-6">
                                <div className="font-bold text-slate-700">{a.company}</div>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">{a.evaluation}</div>
                            </td>
                            <td className="px-6 py-6">
                                <div className="flex flex-wrap gap-1 justify-center max-w-[400px]">
                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${getTagStyle(a.frequency)}`}>FRQ: {a.frequency}</span>
                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${getTagStyle(a.completeness)}`}>CMP: {a.completeness}</span>
                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${getTagStyle(a.formatStandards)}`}>STD: {a.formatStandards}</span>
                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${getTagStyle(a.emailResponse)}`}>SLA: {a.emailResponse}</span>
                                </div>
                            </td>
                            <td className="px-6 py-6 text-xs text-slate-500 italic max-w-md truncate">
                                {a.remarks || "-"}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-4">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { 
                                    setIsAddingNewFwd(false);
                                    setEditingIndex({ month: a.month, company: a.company }); 
                                    setNewEntry({...a}); 
                                    setShowEntryModal(true); 
                                  }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><i className="fas fa-pen-to-square text-xs"></i></button>
                                  <button onClick={() => { if(confirm(t.deleteConfirm)) removeFromCloud(a.month, a.company); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><i className="fas fa-trash-can text-xs"></i></button>
                                </div>
                                <span className={`font-black text-lg w-8 text-right ${a.score >= 9 ? 'text-emerald-600' : a.score < 7 ? 'text-rose-600' : 'text-indigo-600'}`}>{a.score}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'AUDIT' && (
          <div className="animate-in fade-in duration-500">
            {!isLoggedIn ? (
              <div className="max-w-md mx-auto py-20 animate-in zoom-in duration-500">
                <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200">
                  <div className="bg-indigo-600 px-10 py-12 text-center text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl">
                      <i className="fas fa-lock"></i>
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tight italic">{t.adminLogin}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-2 italic">Access 214 Data Processing Hub</p>
                  </div>
                  <form onSubmit={handleLogin} className="p-10 space-y-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.username}</label>
                      <input 
                        type="text" 
                        required
                        value={loginForm.username}
                        onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.password}</label>
                      <input 
                        type="password" 
                        required
                        value={loginForm.password}
                        onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500" 
                      />
                    </div>
                    {loginError && (
                      <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-center animate-bounce">
                        <i className="fas fa-exclamation-circle mr-1"></i> {t.loginError}
                      </div>
                    )}
                    <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
                      {t.loginBtn}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {logisticsRecords.length === 0 ? (
                  <div className="bg-white p-20 rounded-[4rem] text-center border-2 border-dashed border-slate-200">
                      <i className="fas fa-file-csv text-4xl text-slate-200 mb-8"></i>
                      <h2 className="text-2xl font-black text-slate-400 uppercase italic">Audit Workspace</h2>
                      <p className="text-slate-400 mt-4 max-w-md mx-auto">Logged in as Administrator. Upload the 214 master file (EDI/CSV) for processing.</p>
                      <label className="mt-10 inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] cursor-pointer hover:bg-indigo-700 transition-all shadow-lg">
                        <i className="fas fa-cloud-upload-alt"></i> {t.importData}
                        <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
                      </label>
                  </div>
                ) : (
                  <div className="space-y-12">
                      <section className="space-y-6">
                        <div className="flex items-center gap-4 px-2">
                           <span className="w-2 h-8 bg-rose-500 rounded-full"></span>
                           <h2 className="text-xl font-black uppercase italic tracking-tight">{t.followUpRequired}</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                           {pastDueSummary.map(([fwdName, records]) => (
                             <div key={fwdName} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                                <div>
                                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{fwdName}</div>
                                   <div className="flex items-baseline gap-2">
                                      <span className="text-3xl font-black text-rose-600 tracking-tighter">{records.length}</span>
                                      <span className="text-[9px] font-black text-rose-300 uppercase italic leading-none">{t.shipmentsToExplain}</span>
                                   </div>
                                </div>
                                <button 
                                  onClick={() => handleGenerateAggregatedEmail(fwdName, records)}
                                  disabled={isEmailLoading}
                                  className="mt-8 w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all disabled:opacity-50"
                                >
                                  {isEmailLoading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-wand-magic-sparkles mr-2"></i>}
                                  {t.genAggregatedEmail}
                                </button>
                             </div>
                           ))}
                        </div>
                      </section>

                      <section className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="bg-rose-50 p-8 rounded-3xl border border-rose-100 shadow-sm col-span-1">
                            <div className="text-[10px] font-black uppercase text-rose-400 tracking-widest">{t.totalShipments}</div>
                            <div className="text-4xl font-black text-rose-600 mt-2 tracking-tighter">{pastDueRecords.length}</div>
                          </div>
                          
                          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm col-span-2 flex items-center px-8">
                            <div className="flex flex-col flex-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.filterFwd}</label>
                                <select 
                                  value={auditFilterFwd} 
                                  onChange={e => setAuditFilterFwd(e.target.value)}
                                  className="bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
                                >
                                  <option value="ALL">{t.allFwd}</option>
                                  {auditFwdOptions.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            {auditFilterFwd !== 'ALL' && (
                              <button 
                                  onClick={() => handleGenerateAggregatedEmail(auditFilterFwd, displayAuditRecords)}
                                  disabled={isEmailLoading}
                                  className="ml-6 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                              >
                                {isEmailLoading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-magic mr-2"></i>}
                                {t.genAggregatedEmail}
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-end">
                            <button onClick={() => { setLogisticsRecords([]); setAuditFilterFwd('ALL'); }} className="px-6 py-3 bg-white border border-slate-200 text-slate-400 rounded-xl font-black uppercase text-[10px] hover:text-rose-500 transition-all">
                              <i className="fas fa-trash-alt mr-2"></i> {t.clearData}
                            </button>
                          </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-black uppercase italic tracking-tight">
                              {auditFilterFwd === 'ALL' ? t.allFwd : auditFilterFwd} - {t.auditSummary}
                            </h2>
                            <span className="text-[10px] font-black text-slate-400 uppercase">Showing {displayAuditRecords.length} Shipments</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead className="bg-slate-50/30 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                <tr>
                                  <th className="px-8 py-6">FWD</th>
                                  <th className="px-6 py-6">HAWB</th>
                                  <th className="px-6 py-6">Origin</th>
                                  <th className="px-6 py-6">Dest</th>
                                  <th className="px-6 py-6 text-center">EDD (AY)</th>
                                  <th className="px-6 py-6 text-center">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {displayAuditRecords.slice(0, 200).map((r, idx) => (
                                  <tr key={idx} className="hover:bg-rose-50/10 transition-colors bg-rose-50/5 group">
                                    <td className="px-8 py-6 font-bold text-slate-700 text-xs">{r.forwarderName}</td>
                                    <td className="px-6 py-6 font-mono text-xs">{r.hawb}</td>
                                    <td className="px-6 py-6 text-xs text-slate-500">{r.origin}</td>
                                    <td className="px-6 py-6 text-xs text-slate-500">{r.destination}</td>
                                    <td className="px-6 py-6 text-center text-xs font-bold text-rose-500">
                                      {editingAuditId === r.id ? (
                                        <div className="flex items-center gap-2">
                                          <input 
                                            type="date" 
                                            value={tempEdd} 
                                            onChange={e => setTempEdd(e.target.value)}
                                            className="bg-white border border-rose-300 rounded px-2 py-1 text-[10px]" 
                                          />
                                          <button onClick={() => handleAuditUpdateDate(r.id, tempEdd)} className="text-emerald-600 hover:text-emerald-700"><i className="fas fa-check"></i></button>
                                          <button onClick={() => setEditingAuditId(null)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
                                        </div>
                                      ) : (
                                        r.estimatedDeliveryDate
                                      )}
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                      <div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={() => { setEditingAuditId(r.id); setTempEdd(r.estimatedDeliveryDate); }}
                                          className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-lg hover:text-indigo-600 hover:border-indigo-100 transition-all"
                                        >
                                          <i className="fas fa-pen text-[10px]"></i>
                                        </button>
                                        <button 
                                          onClick={() => handleAuditDelete(r.id)}
                                          className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-lg hover:text-rose-600 hover:border-rose-100 transition-all"
                                        >
                                          <i className="fas fa-trash-can text-[10px]"></i>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </section>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden p-10 relative">
              <button onClick={() => { setShowEntryModal(false); setEditingIndex(null); }} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500 transition-all"><i className="fas fa-times text-2xl"></i></button>
              <h2 className="text-2xl font-black uppercase italic mb-8">{editingIndex ? t.editAssessment : t.newAssessment}</h2>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.monthPeriod}</label>
                    <input type="month" disabled={!!editingIndex} value={newEntry.month} onChange={e => setNewEntry({...newEntry, month: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold" />
                 </div>
                 
                 <div className="space-y-1 relative">
                    <div className="flex items-center justify-between mb-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.fwdName}</label>
                       {!editingIndex && (
                         <button 
                          onClick={() => setIsAddingNewFwd(!isAddingNewFwd)}
                          className="text-[9px] font-black text-indigo-600 uppercase hover:text-indigo-800"
                         >
                           {isAddingNewFwd ? "Select existing" : t.addNewFwd}
                         </button>
                       )}
                    </div>
                    {isAddingNewFwd ? (
                      <input 
                        type="text" 
                        placeholder="Type FWD Name..."
                        value={customFwdName} 
                        onChange={e => {
                          setCustomFwdName(e.target.value);
                          setNewEntry({...newEntry, company: e.target.value});
                        }} 
                        className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500" 
                      />
                    ) : (
                      <select 
                        disabled={!!editingIndex} 
                        value={newEntry.company} 
                        onChange={e => setNewEntry({...newEntry, company: e.target.value})} 
                        className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                      >
                         <option value="">{t.selectFwd}</option>
                         {dynamicFwdList.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    )}
                 </div>

                 {[
                    { key: 'frequency', opts: ['High', 'Medium', 'Low'] },
                    { key: 'completeness', opts: ['Excellent', 'Good', 'Fair'] },
                    { key: 'formatStandards', opts: ['Compliant', 'Basically Compliant', 'Fair'] },
                    { key: 'emailResponse', opts: ['≤2 hours', '≤4 hours', '>4 hours'] }
                 ].map(field => (
                    <div key={field.key} className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.key.toUpperCase()}</label>
                       <select value={(newEntry as any)[field.key]} onChange={e => setNewEntry({...newEntry, [field.key]: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold">
                          {field.opts.map(o => <option key={o} value={o}>{o}</option>)}
                       </select>
                    </div>
                 ))}

                 <div className="col-span-2 space-y-1 mt-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.remarksLabel}</label>
                    <textarea 
                        rows={3}
                        value={newEntry.remarks}
                        placeholder={t.remarksPlaceholder}
                        onChange={e => setNewEntry({...newEntry, remarks: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                 </div>
              </div>

              <div className="mt-8 p-6 bg-indigo-50 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t.scoreLabel}</div>
                  <div className="text-3xl font-black text-indigo-600 mt-1">{newEntry.score.toFixed(1)} / 10</div>
                </div>
                <div className="text-right">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated Rank</div>
                   <div className={`text-xs font-black mt-1 uppercase tracking-widest ${newEntry.score >= 8 ? 'text-emerald-500' : 'text-rose-500'}`}>{newEntry.evaluation}</div>
                </div>
              </div>

              <button onClick={() => {
                if (!newEntry.company) {
                  alert("Please specify a Forwarder Name.");
                  return;
                }
                saveToCloud(newEntry);
                setShowEntryModal(false);
                setEditingIndex(null);
                setCustomFwdName('');
              }} className="w-full mt-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                {editingIndex ? t.updateRecord : t.finalize}
              </button>
           </div>
        </div>
      )}

      {showEmailModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                 <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tight">Draft Preview</h2>
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Cloud Synchronized Data</p>
                 </div>
                 <button onClick={() => setShowEmailModal(false)} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all"><i className="fas fa-times text-xl"></i></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
                 <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-serif">
                    {collectiveEmail}
                 </div>
              </div>
              <div className="px-10 py-8 border-t border-slate-100 flex justify-end gap-4 bg-white">
                 <button 
                  onClick={() => {
                    navigator.clipboard.writeText(collectiveEmail);
                    alert(t.copySuccess);
                  }}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                 >
                   <i className="fas fa-copy mr-2"></i> Copy Content
                 </button>
              </div>
           </div>
        </div>
      )}

      <footer className="py-20 text-center text-[10px] font-black uppercase text-slate-300 tracking-[1em] italic">
        Corsair Data Intelligence v16.0 // Firestore Cloud Ready
      </footer>
    </div>
  );
};

export default App;
