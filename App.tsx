
import React, { useState, useMemo, useEffect } from 'react';
import { LogisticsRecord, ForwarderAssessment, ServiceStandard } from './types';
import { analyzeLogisticsData, generateCollectiveFeedbackEmail } from './services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell
} from 'recharts';

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
    actionNeeded: "Action Needed",
    monthPeriod: "Target Month",
    fwdName: "Forwarder",
    scoreLabel: "Auto Score",
    finalize: "Save to Cloud",
    updateRecord: "Update Record",
    deleteConfirm: "Confirm deletion?",
    selectFwd: "Select Forwarder...",
    switchLang: "中文",
    filterByMonth: "Timeline:",
    allMonths: "All History",
    viewDetails: "Expand",
    hideDetails: "Collapse",
    syncing: "Syncing...",
    synced: "Local DB Ready",
    pushCloud: "Push to Vercel",
    exportData: "Export Backup",
    importBackup: "Import Backup",
    genCollectiveEmail: "Group Feedback Email",
    copySuccess: "Copied to clipboard!",
    collectiveEmailTitle: "Monthly Partner Performance Review"
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
    actionNeeded: "项待改善",
    monthPeriod: "评估月份",
    fwdName: "货代名称",
    scoreLabel: "系统总分",
    finalize: "保存至云端",
    updateRecord: "更新云端记录",
    deleteConfirm: "确定要从云端删除此记录吗？",
    selectFwd: "请选择货代...",
    switchLang: "English",
    filterByMonth: "月份：",
    allMonths: "全部月份",
    viewDetails: "展开",
    hideDetails: "收起",
    syncing: "同步中...",
    synced: "本地已就绪",
    pushCloud: "同步到 Vercel",
    exportData: "导出备份",
    importBackup: "恢复备份",
    genCollectiveEmail: "生成全员反馈邮件",
    copySuccess: "内容已复制到剪贴板",
    collectiveEmailTitle: "月度合作伙伴绩效回顾"
  }
};

const SERVICE_STANDARDS: ServiceStandard[] = [
  { category: '214 Data', item: 'Frequency', detail: 'Daily EDI upload required (High frequency)', goal: 'Data Freshness' },
  { category: '214 Data', item: 'Completeness', detail: 'All mandatory nodes populated in 214', goal: 'Full Visibility' },
  { category: 'Data Quality', item: 'Standardization', detail: 'Address and timestamp formats must be compliant', goal: 'Data Mapping' },
  { category: 'Customer Service', item: 'Response', detail: 'Email reply: 2h for urgent, 4h for standard', goal: 'SLA Compliance' }
];

const FORWARDER_LIST = ["THI", "AGS", "Dimerco", "DP World", "JAS Forwarding", "Kuehne+Nagel", "Pegasus Forwarding", "Scan Global Logistics", "Schneider", "Speedmark"];

const INITIAL_ASSESSMENTS: ForwarderAssessment[] = [
  { month: '2025-11', company: 'THI', frequency: 'High', completeness: 'Excellent', formatStandards: 'Compliant', emailResponse: '≤2 hours', evaluation: 'Excellent', score: 10 },
  { month: '2025-11', company: 'AGS', frequency: 'High', completeness: 'Good', formatStandards: 'Basically Compliant', emailResponse: '≤4 hours', evaluation: 'Good', score: 8.5 },
  { month: '2025-11', company: 'Dimerco', frequency: 'High', completeness: 'Excellent', formatStandards: 'Compliant', emailResponse: '≤2 hours', evaluation: 'Excellent', score: 10 },
  { month: '2025-11', company: 'DP World', frequency: 'Medium', completeness: 'Fair', formatStandards: 'Basically Compliant', emailResponse: '>4 hours', evaluation: 'Fair', score: 5 },
  { month: '2025-11', company: 'JAS Forwarding', frequency: 'High', completeness: 'Excellent', formatStandards: 'Compliant', emailResponse: '≤2 hours', evaluation: 'Excellent', score: 10 },
  { month: '2025-11', company: 'Kuehne+Nagel', frequency: 'High', completeness: 'Excellent', formatStandards: 'Fair', emailResponse: '≤2 hours', evaluation: 'Excellent', score: 9 },
  { month: '2025-11', company: 'Pegasus Forwarding', frequency: 'Low', completeness: 'Fair', formatStandards: 'Basically Compliant', emailResponse: '≤4 hours', evaluation: 'Fair', score: 6 },
  { month: '2025-11', company: 'Scan Global Logistics', frequency: 'High', completeness: 'Excellent', formatStandards: 'Compliant', emailResponse: '≤2 hours', evaluation: 'Excellent', score: 10 },
  { month: '2025-11', company: 'Schneider', frequency: 'Medium', completeness: 'Good', formatStandards: 'Fair', emailResponse: '≤4 hours', evaluation: 'Fair', score: 7 },
  { month: '2025-11', company: 'Speedmark', frequency: 'Medium', completeness: 'Good', formatStandards: 'Basically Compliant', emailResponse: '≤4 hours', evaluation: 'Fair', score: 7.5 },
];

const App: React.FC = () => {
  const [lang, setLang] = useState<'EN' | 'CN'>('CN');
  const t = TRANSLATIONS[lang];
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'ASSESSMENT'>('ASSESSMENT');
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isStandardsOpen, setIsStandardsOpen] = useState(false);
  
  // 邮件预览状态
  const [collectiveEmail, setCollectiveEmail] = useState<string>('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const [assessments, setAssessments] = useState<ForwarderAssessment[]>(() => {
    const saved = localStorage.getItem('fwd_assessments_cloud_v6');
    return saved ? (JSON.parse(saved) as ForwarderAssessment[]) : INITIAL_ASSESSMENTS;
  });

  const availableMonths = useMemo(() => {
    return Array.from(new Set(assessments.map(a => a.month))).sort((a: string, b: string) => b.localeCompare(a));
  }, [assessments]);

  const [matrixFilterMonth, setMatrixFilterMonth] = useState<string>('');
  useEffect(() => {
    if (!matrixFilterMonth && availableMonths.length > 0) {
      setMatrixFilterMonth(availableMonths[0]);
    }
  }, [availableMonths]);

  useEffect(() => {
    localStorage.setItem('fwd_assessments_cloud_v6', JSON.stringify(assessments));
    setIsSyncing(true);
    const timer = setTimeout(() => setIsSyncing(false), 800);
    return () => clearTimeout(timer);
  }, [assessments]);

  const [editingIndex, setEditingIndex] = useState<{ month: string, company: string } | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [newEntry, setNewEntry] = useState<ForwarderAssessment>({
    month: new Date().toISOString().substring(0, 7),
    company: '', frequency: 'High', completeness: 'Excellent', formatStandards: 'Compliant', emailResponse: '≤2 hours', evaluation: 'Excellent', score: 10
  });

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

  const generateAIInsight = async () => {
    setIsAiLoading(true);
    try {
      const currentMonth = matrixFilterMonth === 'ALL' ? (availableMonths[0] || '') : matrixFilterMonth;
      const currentData = assessments.filter(a => a.month === currentMonth);
      const mockRecords: any[] = currentData.map(a => ({
         forwarderName: a.company,
         isOverdue: a.score < 7,
         hawb: 'N/A'
      }));
      const report = await analyzeLogisticsData(mockRecords);
      setAiAnalysis(report);
    } catch (e) {
      setAiAnalysis("AI Analysis failed. Check API Key.");
    } finally {
      setIsAiLoading(false);
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
    } catch (e) {
      alert("AI Generation failed.");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const exportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(assessments));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `214_Data_Backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

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

  const getTagStyle = (text: string) => {
    const val = text.toLowerCase();
    if (val.includes('high') || val === 'excellent' || val === 'compliant') return 'text-emerald-600 bg-emerald-50';
    if (val === 'good' || val.includes('basically')) return 'text-indigo-600 bg-indigo-50';
    if (val === 'fair' || val.includes('medium')) return 'text-amber-600 bg-amber-50';
    if (val === 'low' || val.includes('>4') || val === 'fail') return 'text-rose-600 bg-rose-50';
    return 'text-slate-500 bg-slate-50';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
              <i className="fas fa-database"></i>
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight uppercase italic leading-none">{t.auditTitle}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {isSyncing ? t.syncing : t.synced}
                </span>
              </div>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button onClick={() => setActiveTab('ASSESSMENT')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'ASSESSMENT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}>
               <i className="fas fa-star mr-2"></i> {t.assessmentTitle}
             </button>
             <button onClick={() => setActiveTab('AUDIT')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'AUDIT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}>
               <i className="fas fa-file-csv mr-2"></i> {t.auditTitle}
             </button>
          </div>

          <div className="flex gap-4">
             <button onClick={exportBackup} className="px-4 py-2 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black uppercase border border-slate-200 hover:bg-white transition-all">
                <i className="fas fa-download mr-2"></i> {t.exportData}
             </button>
             <button onClick={() => setLang(lang === 'EN' ? 'CN' : 'EN')} className="px-4 py-2 border border-slate-200 rounded-lg text-[10px] font-black uppercase hover:bg-white transition-all">
                {t.switchLang}
             </button>
             <button onClick={() => { setEditingIndex(null); setNewEntry({ month: availableMonths[0] || '2025-11', company: '', frequency: 'High', completeness: 'Excellent', formatStandards: 'Compliant', emailResponse: '≤2 hours', evaluation: 'Excellent', score: 10 }); setShowEntryModal(true); }} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                <i className="fas fa-plus mr-2"></i> {t.newAssessment}
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {activeTab === 'ASSESSMENT' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
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
                  onClick={handleGenerateCollectiveEmail}
                  disabled={isEmailLoading}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase border border-indigo-100 hover:bg-indigo-100 transition-all"
                >
                  {isEmailLoading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-mail-bulk mr-2"></i>}
                  {t.genCollectiveEmail}
                </button>
                <label className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-[9px] font-black uppercase border border-slate-200 hover:bg-white transition-all cursor-pointer">
                  <i className="fas fa-upload mr-2"></i> {t.importBackup}
                  <input type="file" className="hidden" accept=".json" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const data = JSON.parse(event.target?.result as string);
                          setAssessments(data);
                          alert("恢复成功！");
                        } catch (err) { alert("文件格式错误"); }
                      };
                      reader.readAsText(file);
                    }
                  }} />
                </label>
                <button onClick={() => { setIsSyncing(true); setTimeout(() => { setIsSyncing(false); alert("这是模拟同步过程。"); }, 1500); }} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase border border-emerald-100 hover:bg-emerald-100 transition-all">
                  <i className="fas fa-cloud-arrow-up mr-2"></i> {t.pushCloud}
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
                          <th className="px-6 py-6 text-center">Frequency</th>
                          <th className="px-6 py-6 text-center">Completeness</th>
                          <th className="px-6 py-6 text-center">Standards</th>
                          <th className="px-6 py-6 text-center">Email SLA</th>
                          <th className="px-8 py-6 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.map((a, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/10 transition-colors group">
                            <td className="px-8 py-6 font-bold text-slate-700">{a.company}</td>
                            <td className="px-6 py-6 text-center"><span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${getTagStyle(a.frequency)}`}>{a.frequency}</span></td>
                            <td className="px-6 py-6 text-center"><span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${getTagStyle(a.completeness)}`}>{a.completeness}</span></td>
                            <td className="px-6 py-6 text-center"><span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${getTagStyle(a.formatStandards)}`}>{a.formatStandards}</span></td>
                            <td className="px-6 py-6 text-center"><span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${getTagStyle(a.emailResponse)}`}>{a.emailResponse}</span></td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-4">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditingIndex({ month: a.month, company: a.company }); setNewEntry({...a}); setShowEntryModal(true); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><i className="fas fa-pen-to-square text-xs"></i></button>
                                  <button onClick={() => { if(confirm(t.deleteConfirm)) setAssessments(prev => prev.filter(x => !(x.month === a.month && x.company === a.company))); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><i className="fas fa-trash-can text-xs"></i></button>
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
           <div className="bg-white p-20 rounded-[4rem] text-center border-2 border-dashed border-slate-200">
              <i className="fas fa-file-csv text-4xl text-slate-200 mb-8"></i>
              <h2 className="text-2xl font-black text-slate-400 uppercase italic">Audit Workspace</h2>
              <p className="text-slate-400 mt-4 max-w-md mx-auto">Upload the 214 master file to generate automatic data quality reports.</p>
              <label className="mt-10 inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] cursor-pointer hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                 <i className="fas fa-cloud-upload-alt"></i> {t.importData}
                 <input type="file" className="hidden" accept=".csv" />
              </label>
           </div>
        )}
      </main>

      {/* 全员邮件预览模态框 */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                 <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tight">{t.collectiveEmailTitle}</h2>
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">AI Generated • Corsair Logistics SOP Compliance</p>
                 </div>
                 <button onClick={() => setShowEmailModal(false)} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all"><i className="fas fa-times text-xl"></i></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
                 <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-sm leading-relaxed text-slate-600 whitespace-pre-wrap font-serif">
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
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.fwdName}</label>
                    <select disabled={!!editingIndex} value={newEntry.company} onChange={e => setNewEntry({...newEntry, company: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold">
                       <option value="">{t.selectFwd}</option>
                       {FORWARDER_LIST.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
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
                if (editingIndex) {
                  setAssessments(prev => prev.map(a => (a.month === editingIndex.month && a.company === editingIndex.company) ? newEntry : a));
                } else {
                  setAssessments(prev => [newEntry, ...prev]);
                }
                setShowEntryModal(false);
                setEditingIndex(null);
              }} className="w-full mt-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                {editingIndex ? t.updateRecord : t.finalize}
              </button>
           </div>
        </div>
      )}

      <footer className="py-20 text-center text-[10px] font-black uppercase text-slate-300 tracking-[1em] italic">
        Data Hub v6.0 // Backup Mechanism: JSON-Manual
      </footer>
    </div>
  );
};

export default App;
