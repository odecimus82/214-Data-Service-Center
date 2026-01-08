
import React, { useState, useMemo, useEffect } from 'react';
import { LogisticsRecord, ForwarderAssessment, ServiceStandard } from './types';
import { parseLogisticsCSV } from './utils/csvParser';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Legend, AreaChart, Area 
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
    standards: "Service Standards",
    actions: "Improvement Plan (Score < 7)",
    actionNeeded: "Action Needed",
    monthPeriod: "Target Month",
    fwdName: "Forwarder",
    frequency: "EDI Frequency",
    completeness: "Completeness",
    format: "Standardization",
    email: "Email SLA",
    evaluation: "Overall",
    scoreLabel: "Auto Score",
    finalize: "Save to Cloud",
    updateRecord: "Update Record",
    deleteConfirm: "Confirm deletion? This will sync to all devices.",
    selectFwd: "Select Forwarder...",
    switchLang: "中文",
    filterByMonth: "Timeline Filter:",
    allMonths: "Full History",
    viewDetails: "Expand Details",
    hideDetails: "Collapse",
    syncing: "Syncing to Cloud...",
    synced: "Data Secure & Synced"
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
    actions: "改善行动项 (评分 < 7)",
    actionNeeded: "项待改善",
    monthPeriod: "评估月份",
    fwdName: "货代名称",
    frequency: "214 上传频率",
    completeness: "数据完整度",
    format: "格式规范性",
    email: "邮件回复时效",
    evaluation: "综合评价",
    scoreLabel: "系统总分",
    finalize: "保存至云端",
    updateRecord: "更新云端记录",
    deleteConfirm: "确定要从云端删除此记录吗？所有设备将同步。 ",
    selectFwd: "请选择货代...",
    switchLang: "English",
    filterByMonth: "月份筛选：",
    allMonths: "全部月份 (折叠)",
    viewDetails: "展开月度详情",
    hideDetails: "收起",
    syncing: "云端同步中...",
    synced: "云端已同步"
  }
};

const SERVICE_STANDARDS: ServiceStandard[] = [
  { category: '214 Data', item: 'Frequency', detail: 'Daily EDI upload required', goal: 'Data Freshness' },
  { category: '214 Data', item: 'Completeness', detail: 'All mandatory nodes populated', goal: 'Full Visibility' },
  { category: 'Customer Service', item: 'Response', detail: '2h for urgent, 4h for standard', goal: 'SLA Compliance' }
];

// 更新后的货代名单
const FORWARDER_LIST = [
  "THI", "AGS", "Dimerco", "DP World", "JAS Forwarding", 
  "Kuehne+Nagel", "Pegasus Forwarding", "Scan Global Logistics", 
  "Schneider", "Speedmark"
];

// 根据提供的图片完整录入的 2025-11 数据
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
  // 保留部分 12 月样例
  { month: '2025-12', company: 'THI', frequency: 'High', completeness: 'Excellent', formatStandards: 'Compliant', emailResponse: '≤2 hours', evaluation: 'Excellent', score: 9.8 },
  { month: '2025-12', company: 'DP World', frequency: 'Low', completeness: 'Fair', formatStandards: 'Basically Compliant', emailResponse: '>4 hours', evaluation: 'Fair', score: 4.2 },
];

const App: React.FC = () => {
  const [lang, setLang] = useState<'EN' | 'CN'>('CN');
  const t = TRANSLATIONS[lang];
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'ASSESSMENT'>('ASSESSMENT');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [assessments, setAssessments] = useState<ForwarderAssessment[]>(() => {
    // 版本升级到 v3 以确保新录入的 11月数据被用户看到
    const saved = localStorage.getItem('fwd_assessments_cloud_v3');
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

  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('fwd_assessments_cloud_v3', JSON.stringify(assessments));
    setIsSyncing(true);
    const timer = setTimeout(() => setIsSyncing(false), 800);
    return () => clearTimeout(timer);
  }, [assessments]);

  const [editingIndex, setEditingIndex] = useState<{ month: string, company: string } | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [newEntry, setNewEntry] = useState<ForwarderAssessment>({
    month: new Date().toISOString().substring(0, 7),
    company: '', frequency: 'High', completeness: 'Good', formatStandards: 'Basically Compliant', emailResponse: '≤2 hours', evaluation: 'Good', score: 8
  });

  // 根据选择动态建议评价和分值
  useEffect(() => {
    if (editingIndex) return; // 编辑模式下不自动改分
    let score = 5;
    if (newEntry.frequency === 'High') score += 1.5;
    if (newEntry.completeness === 'Excellent') score += 1.5;
    if (newEntry.emailResponse === '≤2 hours') score += 2;
    
    let evalStr = "Fair";
    if (score >= 9) evalStr = "Excellent";
    else if (score >= 8) evalStr = "Good";

    setNewEntry(prev => ({ ...prev, score: Math.min(10, score), evaluation: evalStr }));
  }, [newEntry.frequency, newEntry.completeness, newEntry.emailResponse]);

  const filteredGrouped = useMemo(() => {
    const groups: { [key: string]: ForwarderAssessment[] } = {};
    assessments.forEach(a => {
      if (matrixFilterMonth === 'ALL' || a.month === matrixFilterMonth) {
        if (!groups[a.month]) groups[a.month] = [];
        groups[a.month].push(a);
      }
    });
    return Object.entries(groups).sort((a: [string, any], b: [string, any]) => b[0].localeCompare(a[0]));
  }, [assessments, matrixFilterMonth]);

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  const handleEdit = (record: ForwarderAssessment) => {
    setEditingIndex({ month: record.month, company: record.company });
    setNewEntry({ ...record });
    setShowEntryModal(true);
  };

  const handleDelete = (month: string, company: string) => {
    if (confirm(t.deleteConfirm)) {
      setAssessments(prev => prev.filter(a => !(a.month === month && a.company === company)));
    }
  };

  const saveAssessment = () => {
    if (!newEntry.company) {
      alert(t.selectFwd);
      return;
    }
    if (editingIndex) {
      setAssessments(prev => prev.map(a => 
        (a.month === editingIndex.month && a.company === editingIndex.company) ? newEntry : a
      ));
    } else {
      const exists = assessments.some(a => a.month === newEntry.month && a.company === newEntry.company);
      if (exists) {
        if (confirm("已存在该记录，是否覆盖？")) {
           setAssessments(prev => prev.map(a => 
            (a.month === newEntry.month && a.company === newEntry.company) ? newEntry : a
          ));
        } else return;
      } else {
        setAssessments(prev => [newEntry, ...prev]);
      }
    }
    setShowEntryModal(false);
    setEditingIndex(null);
  };

  // 辅助函数：根据文字内容返回颜色样式 (匹配图片)
  const getTagStyle = (text: string) => {
    const val = text.toLowerCase();
    if (val.includes('high') || val === 'excellent' || val === 'compliant') return 'text-emerald-600 bg-emerald-50';
    if (val === 'good' || val.includes('basically')) return 'text-indigo-600 bg-indigo-50';
    if (val === 'fair' || val.includes('medium')) return 'text-amber-600 bg-amber-50';
    if (val === 'low' || val.includes('>4') || val === 'fail') return 'text-rose-600 bg-rose-50';
    return 'text-slate-500 bg-slate-50';
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
              <i className="fas fa-database"></i>
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight uppercase italic">{t.auditTitle}</h1>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {isSyncing ? t.syncing : t.synced}
                </span>
              </div>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button onClick={() => setActiveTab('AUDIT')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'AUDIT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}>
               <i className="fas fa-file-csv mr-2"></i> {t.auditTitle}
             </button>
             <button onClick={() => setActiveTab('ASSESSMENT')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'ASSESSMENT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}>
               <i className="fas fa-star mr-2"></i> {t.assessmentTitle}
             </button>
          </div>

          <div className="flex gap-4">
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
            
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6 overflow-x-auto">
              <span className="text-[11px] font-black uppercase text-indigo-600 whitespace-nowrap">{t.filterByMonth}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setMatrixFilterMonth('ALL')} 
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${matrixFilterMonth === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                  {t.allMonths}
                </button>
                {availableMonths.map(m => (
                  <button 
                    key={m} 
                    onClick={() => setMatrixFilterMonth(m)} 
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${matrixFilterMonth === m ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {filteredGrouped.map(([month, data]) => {
                const isAllMode = matrixFilterMonth === 'ALL';
                const isExpanded = !isAllMode || expandedMonths.has(month);
                const critical = data.filter(a => a.score < 7);

                return (
                  <div key={month} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-500">
                    <button 
                      onClick={() => isAllMode && toggleMonth(month)}
                      className={`w-full px-8 py-6 flex items-center justify-between border-b border-slate-100 text-left transition-colors ${isAllMode ? 'hover:bg-slate-50' : 'cursor-default'}`}
                    >
                      <div className="flex items-center gap-6">
                        <h2 className="text-xl font-black uppercase italic tracking-tight">{month}</h2>
                        <div className="flex gap-3">
                           <span className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 uppercase">{data.length} {t.partners}</span>
                           {critical.length > 0 && (
                             <span className="bg-rose-50 px-3 py-1 rounded-lg text-[10px] font-black text-rose-500 uppercase">
                               <i className="fas fa-exclamation-triangle mr-1"></i> {critical.length} {t.actionNeeded}
                             </span>
                           )}
                        </div>
                      </div>
                      {isAllMode && (
                        <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase">
                          {isExpanded ? t.hideDetails : t.viewDetails}
                          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                        </div>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="animate-in slide-in-from-top-2 duration-300">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                              <tr>
                                <th className="px-8 py-6">{t.fwdName}</th>
                                <th className="px-6 py-6 text-center">{t.frequency}</th>
                                <th className="px-6 py-6 text-center">{t.completeness}</th>
                                <th className="px-6 py-6 text-center">{t.format}</th>
                                <th className="px-6 py-6 text-center">{t.email}</th>
                                <th className="px-8 py-6 text-right">{t.scoreLabel}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {data.map((a, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/10 transition-colors group">
                                  <td className="px-8 py-6 font-bold text-slate-700">{a.company}</td>
                                  <td className="px-6 py-6 text-center">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${getTagStyle(a.frequency)}`}>
                                      {a.frequency}
                                    </span>
                                  </td>
                                  <td className="px-6 py-6 text-center">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${getTagStyle(a.completeness)}`}>
                                      {a.completeness}
                                    </span>
                                  </td>
                                  <td className="px-6 py-6 text-center">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${getTagStyle(a.formatStandards)}`}>
                                      {a.formatStandards}
                                    </span>
                                  </td>
                                  <td className="px-6 py-6 text-center">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${getTagStyle(a.emailResponse)}`}>
                                      {a.emailResponse}
                                    </span>
                                  </td>
                                  <td className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-4">
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(a)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                                          <i className="fas fa-pen-to-square text-xs"></i>
                                        </button>
                                        <button onClick={() => handleDelete(a.month, a.company)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                                          <i className="fas fa-trash-can text-xs"></i>
                                        </button>
                                      </div>
                                      <span className={`font-black text-lg w-8 text-right ${a.score >= 9 ? 'text-emerald-600' : a.score < 7 ? 'text-rose-600' : 'text-indigo-600'}`}>
                                        {a.score}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black uppercase italic tracking-tighter mb-10 flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                  {t.ranking} (Selected: {matrixFilterMonth})
                </h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData} layout="vertical" margin={{ left: 40, right: 40 }}>
                      <CartesianGrid strokeDasharray="6 6" horizontal={true} vertical={false} stroke="#f1f5f9" />
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
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                 <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-8">{t.standards}</h3>
                 <div className="space-y-6">
                    {SERVICE_STANDARDS.map((s, i) => (
                      <div key={i} className="group border-b border-slate-50 pb-6 last:border-0">
                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{s.item}</div>
                        <p className="text-xs font-bold text-slate-700 mb-1">{s.detail}</p>
                        <div className="text-[9px] font-black text-emerald-600 italic">Target: {s.goal}</div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'AUDIT' && (
           <div className="bg-white p-20 rounded-[4rem] text-center border-2 border-dashed border-slate-200">
              <i className="fas fa-file-csv text-4xl text-slate-200 mb-8"></i>
              <h2 className="text-2xl font-black text-slate-400 uppercase italic">Waiting for Audit Data</h2>
              <p className="text-slate-400 mt-4 max-w-md mx-auto">Upload the monthly 214 forwarder CSV file to begin the AI-powered audit process.</p>
              <label className="mt-10 inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] cursor-pointer hover:bg-indigo-700 transition-all">
                 <i className="fas fa-cloud-upload-alt"></i> {t.importData}
                 <input type="file" className="hidden" accept=".csv" />
              </label>
           </div>
        )}
      </main>

      {showEntryModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden p-10 relative">
              <button onClick={() => { setShowEntryModal(false); setEditingIndex(null); }} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500 transition-all">
                <i className="fas fa-times text-2xl"></i>
              </button>
              <h2 className="text-2xl font-black uppercase italic mb-8">
                {editingIndex ? t.editAssessment : t.newAssessment}
              </h2>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.monthPeriod}</label>
                    <input type="month" disabled={!!editingIndex} value={newEntry.month} onChange={e => setNewEntry({...newEntry, month: e.target.value})} className={`w-full border-none rounded-xl px-5 py-3 text-sm font-bold ${editingIndex ? 'bg-slate-100' : 'bg-slate-50'}`} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.fwdName}</label>
                    <select disabled={!!editingIndex} value={newEntry.company} onChange={e => setNewEntry({...newEntry, company: e.target.value})} className={`w-full border-none rounded-xl px-5 py-3 text-sm font-bold ${editingIndex ? 'bg-slate-100' : 'bg-slate-50'}`}>
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
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessment Result</div>
                   <div className={`text-xs font-black mt-1 uppercase tracking-widest ${newEntry.score >= 8 ? 'text-emerald-500' : 'text-rose-500'}`}>
                     {newEntry.evaluation}
                   </div>
                </div>
              </div>

              <button onClick={saveAssessment} className={`w-full mt-10 py-5 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] transition-all shadow-xl ${editingIndex ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}>
                {editingIndex ? t.updateRecord : t.finalize}
              </button>
           </div>
        </div>
      )}

      <footer className="py-20 text-center text-[10px] font-black uppercase text-slate-300 tracking-[1em] italic">
        Cloud Sync Active // 214 Data Node v3.9
      </footer>
    </div>
  );
};

export default App;
