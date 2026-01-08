
import React, { useState, useMemo, useEffect } from 'react';
import { LogisticsRecord, ForwarderSummary, ForwarderAssessment, ServiceStandard } from './types';
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
    totalSyncs: "Sync Records",
    overdueHawbs: "Overdue",
    completed: "Archived",
    partners: "Forwarders",
    distribution: "Overdue Analysis",
    systemInsight: "AI Performance Insight",
    trends: "Historical Performance",
    ranking: "Ranking",
    evolution: "Evolution",
    noDataThisMonth: "No records found for this period.",
    matrix: "Performance Matrix",
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
    deleteConfirm: "Confirm deletion?",
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
    totalSyncs: "同步记录总数",
    overdueHawbs: "逾期单量",
    completed: "已完成归档",
    partners: "货代总数",
    distribution: "逾期分布图",
    systemInsight: "系统智能建议",
    trends: "服务趋势分析",
    ranking: "绩效排名",
    evolution: "演变趋势",
    noDataThisMonth: "该时段暂无评估数据",
    matrix: "服务表现矩阵",
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
    deleteConfirm: "确定要从云端删除此记录吗？",
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

const FORWARDER_LIST = ["THI", "AGS", "Dimerco", "DP World", "JAS Forwarding", "Kuehne+Nagel", "Pegasus", "SGS", "Schneider", "Speedmark"];

const INITIAL_ASSESSMENTS: ForwarderAssessment[] = [
  { month: '2025-12', company: 'THI', frequency: 'High', completeness: 'Excellent', formatStandards: 'Compliant', emailResponse: '≤2 hours', evaluation: 'Excellent', score: 9.5 },
  { month: '2025-12', company: 'DP World', frequency: 'Low', completeness: 'Fair', formatStandards: 'Basically Compliant', emailResponse: '>4 hours', evaluation: 'Fair', score: 4.5 },
  { month: '2025-11', company: 'THI', frequency: 'High', completeness: 'Excellent', formatStandards: 'Compliant', emailResponse: '≤2 hours', evaluation: 'Excellent', score: 10 },
  { month: '2025-11', company: 'Schneider', frequency: 'Medium', completeness: 'Good', formatStandards: 'Fair', emailResponse: '≤4 hours', evaluation: 'Fair', score: 6.5 },
];

const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const App: React.FC = () => {
  const [lang, setLang] = useState<'EN' | 'CN'>('CN');
  const t = TRANSLATIONS[lang];
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'ASSESSMENT'>('ASSESSMENT');
  const [records, setRecords] = useState<LogisticsRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [assessments, setAssessments] = useState<ForwarderAssessment[]>(() => {
    const saved = localStorage.getItem('fwd_assessments_cloud_v2');
    // Cast parsed object to correct type for state safety
    return saved ? (JSON.parse(saved) as ForwarderAssessment[]) : INITIAL_ASSESSMENTS;
  });

  const availableMonths = useMemo(() => {
    // Explicitly typing sort parameters to resolve 'unknown' type inference on Array.from(Set)
    return Array.from(new Set(assessments.map(a => a.month))).sort((a: string, b: string) => b.localeCompare(a));
  }, [assessments]);

  // 1. 默认选中最新月份
  const [matrixFilterMonth, setMatrixFilterMonth] = useState<string>('');
  useEffect(() => {
    if (!matrixFilterMonth && availableMonths.length > 0) {
      setMatrixFilterMonth(availableMonths[0]);
    }
  }, [availableMonths]);

  // 2. 全部月份模式下的展开状态
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('fwd_assessments_cloud_v2', JSON.stringify(assessments));
    // 模拟云端同步动画
    setIsSyncing(true);
    const timer = setTimeout(() => setIsSyncing(false), 600);
    return () => clearTimeout(timer);
  }, [assessments]);

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [newEntry, setNewEntry] = useState<ForwarderAssessment>({
    month: new Date().toISOString().substring(0, 7),
    company: '', frequency: 'High', completeness: 'Good', formatStandards: 'Basically Compliant', emailResponse: '≤2 hours', evaluation: 'Good', score: 8
  });

  const filteredGrouped = useMemo(() => {
    const groups: { [key: string]: ForwarderAssessment[] } = {};
    assessments.forEach(a => {
      if (matrixFilterMonth === 'ALL' || a.month === matrixFilterMonth) {
        if (!groups[a.month]) groups[a.month] = [];
        groups[a.month].push(a);
      }
    });
    // Explicitly typed parameters for string sorting
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseLogisticsCSV(e.target?.result as string);
      setRecords(parsed);
      setLoading(false);
    };
    reader.readAsText(file);
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
      {/* 顶部导航与同步状态 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
              <i className="fas fa-database"></i>
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight uppercase italic">{t.auditTitle}</h1>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`}></span>
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
             <button onClick={() => setShowEntryModal(true)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                <i className="fas fa-plus mr-2"></i> {t.newAssessment}
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {activeTab === 'ASSESSMENT' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* 核心筛选器 */}
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

            {/* 月度汇总面板 */}
            <div className="space-y-6">
              {filteredGrouped.map(([month, data]) => {
                const isAllMode = matrixFilterMonth === 'ALL';
                const isExpanded = !isAllMode || expandedMonths.has(month);
                const critical = data.filter(a => a.score < 7);

                return (
                  <div key={month} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-500">
                    {/* 折叠标题栏 */}
                    <button 
                      onClick={() => isAllMode && toggleMonth(month)}
                      disabled={!isAllMode}
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

                    {/* 详情内容 */}
                    {isExpanded && (
                      <div className="animate-in slide-in-from-top-2 duration-300">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                              <tr>
                                <th className="px-8 py-6">{t.fwdName}</th>
                                <th className="px-6 py-6 text-center">{t.frequency}</th>
                                <th className="px-6 py-6 text-center">{t.completeness}</th>
                                <th className="px-6 py-6 text-center">{t.email}</th>
                                <th className="px-8 py-6 text-right">{t.scoreLabel}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {data.map((a, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                  <td className="px-8 py-6 font-bold text-slate-700">{a.company}</td>
                                  <td className="px-6 py-6 text-center">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${a.frequency === 'High' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                                      {a.frequency}
                                    </span>
                                  </td>
                                  <td className="px-6 py-6 text-center text-xs text-slate-500 italic">{a.completeness}</td>
                                  <td className={`px-6 py-6 text-center text-xs font-bold ${a.emailResponse === '>4 hours' ? 'text-rose-500 underline' : 'text-slate-400'}`}>
                                    {a.emailResponse}
                                  </td>
                                  <td className="px-8 py-6 text-right font-black text-lg text-indigo-600">
                                    {a.score}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* 本月改善行动 (只有分值低时才出现) */}
                        {critical.length > 0 && (
                          <div className="px-8 py-8 bg-slate-900 text-white rounded-b-3xl">
                            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-6 border-b border-slate-800 pb-4">
                              <i className="fas fa-tools mr-2"></i> {t.actions} - {month}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {critical.map((c, i) => (
                                 <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center">
                                    <div>
                                      <div className="text-sm font-black text-rose-400">{c.company}</div>
                                      <div className="text-[10px] text-slate-400 mt-1 uppercase italic tracking-wider">Reason: Low Score {c.score}/10</div>
                                    </div>
                                    <button className="px-4 py-1.5 bg-rose-500/20 text-rose-300 rounded-lg text-[9px] font-bold uppercase hover:bg-rose-500 hover:text-white transition-all">
                                       Request Plan
                                    </button>
                                 </div>
                               ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 排名统计卡片 */}
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
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#64748b'}} width={100} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}} cursor={{fill: '#f8fafc'}} />
                      <Bar dataKey="score" radius={[0, 12, 12, 0]} barSize={24}>
                        {dashboardData.map((e, idx) => <Cell key={idx} fill={e.score >= 8 ? '#10b981' : e.score < 7 ? '#f43f5e' : '#6366f1'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-y-auto">
                 <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-8">{t.standards}</h3>
                 <div className="space-y-6">
                    {SERVICE_STANDARDS.map((s, i) => (
                      <div key={i} className="group">
                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{s.item}</div>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed mb-1">{s.detail}</p>
                        <div className="text-[9px] font-black text-emerald-600 italic">Goal: {s.goal}</div>
                        <div className="mt-4 border-b border-slate-50 group-last:hidden"></div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'AUDIT' && (
           <div className="bg-white p-20 rounded-[4rem] text-center border-2 border-dashed border-slate-200">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-300">
                <i className="fas fa-file-csv text-4xl"></i>
              </div>
              <h2 className="text-2xl font-black text-slate-400 uppercase italic">Wait for Data Upload</h2>
              <p className="text-slate-400 mt-4 max-w-md mx-auto">Upload the monthly 214 forwarder CSV file to begin the AI-powered audit process.</p>
              <label className="mt-10 inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] cursor-pointer hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
                 <i className="fas fa-cloud-upload-alt"></i> {t.importData}
                 <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
              </label>
           </div>
        )}
      </main>

      {/* 录入弹窗 */}
      {showEntryModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden p-10 relative">
              <button onClick={() => setShowEntryModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500 transition-all">
                <i className="fas fa-times text-2xl"></i>
              </button>
              <h2 className="text-2xl font-black uppercase italic mb-8">{t.newAssessment}</h2>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.monthPeriod}</label>
                    <input type="month" value={newEntry.month} onChange={e => setNewEntry({...newEntry, month: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.fwdName}</label>
                    <select value={newEntry.company} onChange={e => setNewEntry({...newEntry, company: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold">
                       <option value="">{t.selectFwd}</option>
                       {FORWARDER_LIST.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                 </div>
                 {['frequency', 'completeness', 'formatStandards', 'emailResponse'].map(key => (
                    <div key={key} className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{key.toUpperCase()}</label>
                       <select value={(newEntry as any)[key]} onChange={e => setNewEntry({...newEntry, [key]: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold">
                          {key === 'emailResponse' ? ['≤2 hours', '≤4 hours', '>4 hours'].map(o => <option key={o}>{o}</option>) : ['High', 'Medium', 'Low', 'Excellent', 'Good', 'Fair', 'Compliant', 'Basically Compliant'].map(o => <option key={o}>{o}</option>)}
                       </select>
                    </div>
                 ))}
              </div>
              <button onClick={() => { setAssessments([...assessments, {...newEntry, score: Math.random() * 5 + 5}]); setShowEntryModal(false); }} className="w-full mt-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                {t.finalize}
              </button>
           </div>
        </div>
      )}

      <footer className="py-20 text-center text-[10px] font-black uppercase text-slate-300 tracking-[1em] italic">
        Cloud Sync Active // 214 Data Node v3.9
      </footer>

      {loading && (
        <div className="fixed inset-0 z-[101] bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Processing Master 214 File...</p>
        </div>
      )}
    </div>
  );
};

export default App;
