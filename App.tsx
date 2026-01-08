
import React, { useState, useMemo, useEffect } from 'react';
import { LogisticsRecord, ForwarderSummary, ForwarderAssessment, ServiceStandard } from './types';
import { parseLogisticsCSV } from './utils/csvParser';
import { analyzeLogisticsData } from './services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';

// Translation Dictionary
const TRANSLATIONS = {
  EN: {
    auditTitle: "214 Audit",
    assessmentTitle: "Service Review",
    importData: "Import 214 Data",
    newAssessment: "New Assessment",
    totalSyncs: "Total Syncs",
    overdueHawbs: "Overdue HAWBs",
    completed: "Completed (BB)",
    partners: "Partners",
    distribution: "Overdue Distribution",
    systemInsight: "System Summary Analysis",
    trends: "Performance Insights",
    ranking: "Ranking View",
    evolution: "Evolution View",
    summaryMode: "Multi-Month Summary",
    singleMode: "Single Month",
    noDataThisMonth: "No data found for selection.",
    matrix: "Assessment Matrix",
    standards: "Service Standards",
    actions: "Critical Action Items (Score < 7)",
    monthPeriod: "Month Period",
    fwdName: "Forwarder Name",
    frequency: "214 Upload Frequency",
    completeness: "Data Completeness",
    format: "Format Standards",
    email: "Email Response",
    evaluation: "Overall Evaluation",
    scoreLabel: "Auto-Calculated Score",
    finalize: "Finalize Entry",
    deleteConfirm: "Delete this assessment entry?",
    selectFwd: "Select Forwarder...",
    switchLang: "中文",
    auditHub: "Audit Hub",
    goal: "Goal",
    actionNeeded: "Action Needed",
    complianceMet: "No critical items for this month.",
    noAnalysis: "Upload data for system summary...",
    filterByMonth: "Filter Table:",
    allMonths: "All Months",
    selectMonths: "Select Months for Ranking",
    expandStandards: "View Service Standards",
    collapseStandards: "Hide Service Standards",
    viewDetails: "View Details",
    hideDetails: "Hide Details"
  },
  CN: {
    auditTitle: "214 数据审计",
    assessmentTitle: "服务评分",
    importData: "导入 214 数据",
    newAssessment: "新增评分录入",
    totalSyncs: "总同步单量",
    overdueHawbs: "逾期单量",
    completed: "已归档 (BB)",
    partners: "合作伙伴",
    distribution: "逾期分布图",
    systemInsight: "系统汇总分析",
    trends: "服务表现分析",
    ranking: "排名榜单",
    evolution: "趋势演变",
    summaryMode: "多月汇总",
    singleMode: "单月查看",
    noDataThisMonth: "所选范围内暂无评分数据",
    matrix: "评估明细表",
    standards: "服务标准要求",
    actions: "重点改善事项 (得分 < 7)",
    monthPeriod: "评估月份",
    fwdName: "货代名称",
    frequency: "214 上传频率",
    completeness: "数据完整度",
    format: "格式标准化",
    email: "邮件回复时效",
    evaluation: "综合评价",
    scoreLabel: "系统自动评分",
    finalize: "完成评分保存",
    deleteConfirm: "确定要删除这条评分记录吗？",
    selectFwd: "选择货代...",
    switchLang: "English",
    auditHub: "审计中心",
    goal: "目标",
    actionNeeded: "需要关注",
    complianceMet: "本月暂无低于标准项。",
    noAnalysis: "请上传数据以获取系统汇总分析...",
    filterByMonth: "月份筛选：",
    allMonths: "全部月份",
    selectMonths: "选择汇总月份",
    expandStandards: "展开服务标准详情",
    collapseStandards: "收起服务标准详情",
    viewDetails: "查看详情",
    hideDetails: "收起详情"
  }
};

const SERVICE_STANDARDS: ServiceStandard[] = [
  { category: '214 Report Management', item: 'Upload Frequency', detail: 'Daily upload recommended', goal: 'Ensure information timeliness & accuracy' },
  { category: '214 Report Management', item: 'Content Completeness', detail: 'Include origin, destination, time info, cargo status', goal: 'Ensure data completeness & accuracy' },
  { category: '214 Report Management', item: 'Format Standardization', detail: 'Comply with X12 EDI 214 standard format', goal: 'Ensure data normalization' },
  { category: 'Customer Service', item: 'Email Response Timeliness', detail: 'Respond within 2 hours; Urgent issues within 4 hours', goal: 'Prompt response to customer needs' },
  { category: 'Customer Service', item: 'Problem Resolution', detail: 'Establish effective problem response mechanisms', goal: 'Timely handling of customer needs' },
  { category: 'Customer Service', item: 'Communication', detail: 'Maintain professional attitude & provide accurate info', goal: 'Professional consistency' }
];

const FORWARDER_LIST = ["THI", "AGS", "Dimerco", "DP World", "JAS Forwarding", "Kuehne+Nagel", "Pegasus Forwarding", "Scan Global Logistics", "Schneider", "Speedmark", "OMNI", "Bison"];

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

const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#a855f7', '#0ea5e9'];

const App: React.FC = () => {
  const [lang, setLang] = useState<'EN' | 'CN'>('CN');
  const t = TRANSLATIONS[lang];

  const [activeTab, setActiveTab] = useState<'AUDIT' | 'ASSESSMENT'>('ASSESSMENT');
  const [chartMode, setChartMode] = useState<'RANK' | 'EVOLUTION'>('RANK');
  const [records, setRecords] = useState<LogisticsRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [systemAnalysis, setSystemAnalysis] = useState<string>('');
  const [isStandardsExpanded, setIsStandardsExpanded] = useState(false);
  
  const [assessments, setAssessments] = useState<ForwarderAssessment[]>(() => {
    const saved = localStorage.getItem('fwd_assessments');
    return saved ? JSON.parse(saved) : INITIAL_ASSESSMENTS;
  });

  const availableMonths = useMemo(() => {
    return (Array.from(new Set(assessments.map(a => a.month))) as string[]).sort((a, b) => b.localeCompare(a));
  }, [assessments]);

  // Default to the latest month
  const [matrixFilterMonth, setMatrixFilterMonth] = useState<string>(availableMonths[0] || 'ALL');
  // State to track which months are manually expanded in 'ALL' mode
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (availableMonths[0] && matrixFilterMonth === 'ALL' && expandedMonths.size === 0) {
       // If reset or initialized, we might want some default behavior
    }
  }, [availableMonths]);

  const [selectedDashboardMonths, setSelectedDashboardMonths] = useState<string[]>([]);
  useEffect(() => {
    if (availableMonths.length > 0 && selectedDashboardMonths.length === 0) {
      setSelectedDashboardMonths([availableMonths[0]]);
    }
  }, [availableMonths]);

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [newEntry, setNewEntry] = useState<ForwarderAssessment>({
    month: new Date().toISOString().substring(0, 7),
    company: '',
    frequency: 'High',
    completeness: 'Good',
    formatStandards: 'Basically Compliant',
    emailResponse: '≤2 hours',
    evaluation: 'Good',
    score: 8
  });

  useEffect(() => {
    const calcScore = () => {
      let score = 0;
      if (newEntry.frequency === 'High') score += 2.5; else if (newEntry.frequency === 'Medium') score += 1.5; else score += 0.5;
      if (newEntry.completeness === 'Excellent') score += 2.5; else if (newEntry.completeness === 'Good') score += 2.0; else score += 1.0;
      if (newEntry.formatStandards === 'Compliant') score += 2.5; else if (newEntry.formatStandards === 'Basically Compliant') score += 2.0; else score += 1.5;
      if (newEntry.emailResponse === '≤2 hours') score += 2.5; else if (newEntry.emailResponse === '≤4 hours') score += 2.0; else score += 1.0;
      return score;
    };
    setNewEntry(prev => ({ ...prev, score: calcScore() }));
  }, [newEntry.frequency, newEntry.completeness, newEntry.formatStandards, newEntry.emailResponse]);

  useEffect(() => {
    localStorage.setItem('fwd_assessments', JSON.stringify(assessments));
  }, [assessments]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseLogisticsCSV(text);
      setRecords(parsed);
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const overdueRecords = useMemo(() => records.filter(r => r.isOverdue && !r.actualDeliveryDate.trim()), [records]);
  const forwarderSummaries = useMemo(() => {
    const map = new Map<string, ForwarderSummary>();
    records.forEach(r => {
      const fwd = r.forwarderName || 'Unknown';
      const existing = map.get(fwd) || { name: fwd, totalShipments: 0, overdueCount: 0, completedCount: 0 };
      existing.totalShipments++;
      if (r.isOverdue && !r.actualDeliveryDate.trim()) existing.overdueCount++;
      if (r.actualDeliveryDate.trim()) existing.completedCount++;
      map.set(fwd, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.overdueCount - a.overdueCount);
  }, [records]);

  const filteredGroupedAssessments = useMemo(() => {
    const groups: { [key: string]: ForwarderAssessment[] } = {};
    assessments.forEach(a => {
      if (matrixFilterMonth === 'ALL' || a.month === matrixFilterMonth) {
        if (!groups[a.month]) groups[a.month] = [];
        groups[a.month].push(a);
      }
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [assessments, matrixFilterMonth]);

  const dashboardRankingData = useMemo(() => {
    const filtered = assessments.filter(a => selectedDashboardMonths.includes(a.month));
    const companyAverages: { [key: string]: { sum: number, count: number } } = {};
    filtered.forEach(a => {
      if (!companyAverages[a.company]) companyAverages[a.company] = { sum: 0, count: 0 };
      companyAverages[a.company].sum += a.score;
      companyAverages[a.company].count += 1;
    });
    return Object.entries(companyAverages)
      .map(([company, data]) => ({
        company,
        score: parseFloat((data.sum / data.count).toFixed(2)),
        monthsIncluded: data.count
      }))
      .sort((a, b) => b.score - a.score);
  }, [assessments, selectedDashboardMonths]);

  const allMonthsTrend = useMemo(() => {
    const months = (Array.from(new Set(assessments.map(a => a.month))) as string[]).sort();
    const companies = (Array.from(new Set(assessments.map(a => a.company))) as string[]);
    return months.map(m => {
      const entry: any = { month: m };
      companies.forEach(c => {
        const found = assessments.find(a => a.month === m && a.company === c);
        if (found) entry[c] = found.score;
      });
      return entry;
    });
  }, [assessments]);

  const addAssessment = () => {
    if (!newEntry.company.trim()) { alert(t.selectFwd); return; }
    setAssessments([...assessments, newEntry]);
    setShowEntryModal(false);
  };

  const deleteAssessment = (month: string, company: string) => {
    if (confirm(t.deleteConfirm)) {
      setAssessments(assessments.filter(a => !(a.month === month && a.company === company)));
    }
  };

  const toggleMonthSelection = (month: string) => {
    setSelectedDashboardMonths(prev => 
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const toggleMonthExpansion = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 px-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <i className="fas fa-microchip text-white"></i>
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight italic">214 <span className="text-indigo-400">{t.auditHub}</span></h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em]">Operational Node v3.9</p>
            </div>
          </div>
          
          <div className="flex bg-slate-800 p-1.5 rounded-2xl shadow-inner">
             <button onClick={() => setActiveTab('AUDIT')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'AUDIT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
               <i className="fas fa-file-invoice mr-2"></i> {t.auditTitle}
             </button>
             <button onClick={() => setActiveTab('ASSESSMENT')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ASSESSMENT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
               <i className="fas fa-star mr-2"></i> {t.assessmentTitle}
             </button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setLang(lang === 'EN' ? 'CN' : 'EN')} className="h-11 bg-slate-800 border border-slate-700 px-4 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-700 transition-all flex items-center gap-2">
               <i className="fas fa-language text-indigo-400"></i>
               {t.switchLang}
            </button>
            {activeTab === 'AUDIT' ? (
              <label className="h-11 cursor-pointer bg-white text-slate-900 px-6 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-indigo-50 transition-all shadow-xl border border-slate-200 flex items-center gap-3">
                <i className="fas fa-cloud-upload-alt text-indigo-600"></i>
                {t.importData}
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            ) : (
              <button onClick={() => setShowEntryModal(true)} className="h-11 bg-white text-slate-900 px-6 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-indigo-50 transition-all shadow-xl border border-slate-200 flex items-center gap-3">
                <i className="fas fa-plus text-indigo-600"></i>
                {t.newAssessment}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full p-4 md:p-10 space-y-12">
        {activeTab === 'AUDIT' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { label: t.totalSyncs, val: records.length, icon: 'fa-database', color: 'text-slate-600' },
                { label: t.overdueHawbs, val: overdueRecords.length, icon: 'fa-fire', color: 'text-rose-600' },
                { label: t.completed, val: records.filter(r => r.actualDeliveryDate.trim()).length, icon: 'fa-check-circle', color: 'text-emerald-600' },
                { label: t.partners, val: forwarderSummaries.length, icon: 'fa-handshake', color: 'text-indigo-600' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm transition hover:shadow-xl">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-xl bg-slate-50 ${stat.color} shadow-inner`}>
                    <i className={`fas ${stat.icon}`}></i>
                  </div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{stat.label}</p>
                  <p className={`text-4xl font-black mt-2 ${stat.color} tracking-tighter`}>{stat.val}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                <h2 className="text-sm font-black text-slate-800 uppercase italic tracking-tighter mb-10 flex items-center gap-4">
                   <span className="w-1.5 h-8 bg-indigo-500 rounded-full"></span> {t.distribution}
                </h2>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forwarderSummaries.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#cbd5e1'}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="overdueCount" radius={[12, 12, 0, 0]} fill="#6366f1" barSize={40}>
                         {forwarderSummaries.map((_, i) => <Cell key={i} fill={i === 0 ? '#f43f5e' : '#6366f1'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                <h2 className="text-xs font-black mb-8 uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-3">
                  <i className="fas fa-layer-group"></i> {t.systemInsight}
                </h2>
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 text-slate-300 text-sm leading-relaxed italic font-medium">
                  {systemAnalysis || t.noAnalysis}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-12 animate-in slide-in-from-bottom duration-700">
            {/* Table Filter Navigation */}
            <div className="flex items-center gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 sticky top-24 z-40 backdrop-blur-md bg-white/90">
              <div className="flex-shrink-0 text-xs font-black uppercase text-indigo-600 tracking-widest">{t.filterByMonth}</div>
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => { setMatrixFilterMonth('ALL'); setExpandedMonths(new Set()); }} 
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${matrixFilterMonth === 'ALL' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                  {t.allMonths}
                </button>
                {availableMonths.map(m => (
                  <button 
                    key={m} 
                    onClick={() => { setMatrixFilterMonth(m); setExpandedMonths(new Set()); }} 
                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${matrixFilterMonth === m ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Assessment Matrix Cards */}
            {filteredGroupedAssessments.map(([month, monthData]) => {
              const isCollapsed = matrixFilterMonth === 'ALL' && !expandedMonths.has(month);
              const criticalItems = monthData.filter(a => a.score < 7);
              
              return (
                <div key={month} className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
                  <button 
                    onClick={() => matrixFilterMonth === 'ALL' && toggleMonthExpansion(month)}
                    disabled={matrixFilterMonth !== 'ALL'}
                    className={`w-full px-12 py-10 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center text-left transition-colors ${matrixFilterMonth === 'ALL' ? 'hover:bg-slate-100/80 cursor-pointer' : 'cursor-default'}`}
                  >
                     <div>
                       <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{month} {t.matrix}</h2>
                       <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                         {monthData.length} {t.partners} • {criticalItems.length} {t.actionNeeded}
                       </p>
                     </div>
                     {matrixFilterMonth === 'ALL' && (
                       <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{isCollapsed ? t.viewDetails : t.hideDetails}</span>
                          <i className={`fas fa-chevron-${isCollapsed ? 'down' : 'up'} text-indigo-400`}></i>
                       </div>
                     )}
                  </button>
                  
                  {!isCollapsed && (
                    <div className="animate-in slide-in-from-top duration-300">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-white text-slate-400 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                            <tr>
                              <th className="px-12 py-8">{t.fwdName}</th>
                              <th className="px-6 py-8 text-center">{t.frequency}</th>
                              <th className="px-6 py-8 text-center">{t.completeness}</th>
                              <th className="px-6 py-8 text-center">{t.format}</th>
                              <th className="px-6 py-8 text-center">{t.email}</th>
                              <th className="px-6 py-8 text-center">{t.evaluation}</th>
                              <th className="px-12 py-8 text-right">{t.scoreLabel}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {monthData.map((a, i) => (
                              <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-12 py-8 font-black text-slate-900 text-base">{a.company}</td>
                                <td className="px-6 py-8 text-center">
                                   <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${a.frequency === 'High' ? 'bg-emerald-50 text-emerald-600' : a.frequency === 'Low' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                     {a.frequency}
                                   </span>
                                </td>
                                <td className="px-6 py-8 text-center">
                                   <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${a.completeness === 'Excellent' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-600'}`}>
                                     {a.completeness}
                                   </span>
                                </td>
                                <td className="px-6 py-8 text-center text-xs font-bold text-slate-600 italic">{a.formatStandards}</td>
                                <td className={`px-6 py-8 text-center text-xs font-black ${a.emailResponse === '>4 hours' ? 'text-rose-600 underline' : 'text-slate-900'}`}>{a.emailResponse}</td>
                                <td className="px-6 py-8 text-center font-black uppercase text-[10px] tracking-widest text-slate-400">{a.evaluation}</td>
                                <td className="px-12 py-8 text-right relative">
                                   <span className={`text-2xl font-black ${a.score >= 9 ? 'text-emerald-500' : a.score < 7 ? 'text-rose-500' : 'text-indigo-600'}`}>
                                     {a.score}
                                   </span>
                                   <button onClick={() => deleteAssessment(month, a.company)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-rose-300 hover:text-rose-600">
                                     <i className="fas fa-trash-alt text-xs"></i>
                                   </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Integrated Critical Actions for this Month */}
                      <div className="px-12 py-10 bg-slate-900 text-white border-t border-slate-800">
                        <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-4">
                          <i className="fas fa-microscope text-indigo-400"></i> {t.actions}
                        </h3>
                        {criticalItems.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {criticalItems.map((a, i) => (
                              <div key={i} className="bg-white/5 p-6 rounded-[2rem] border border-white/10 hover:border-rose-500/50 transition-colors">
                                <div className="flex justify-between items-center mb-3">
                                   <span className="text-sm font-black uppercase tracking-wider text-rose-400 italic">{a.company}</span>
                                   <span className="text-[9px] bg-rose-500/20 px-3 py-1 rounded-full text-rose-300 font-bold uppercase tracking-widest">{t.actionNeeded}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed font-bold italic">
                                   Compliance alert. Score {a.score}/10 below standard. Manual review recommended.
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="opacity-30 italic text-[10px] font-black uppercase tracking-widest py-4">{t.complianceMet}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="bg-white p-12 rounded-[4rem] border border-slate-200 shadow-sm mt-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 gap-8">
                  <div className="space-y-6">
                    <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-6">
                      <span className="w-3 h-12 bg-indigo-600 rounded-full"></span>
                      {t.trends}
                    </h2>
                    <div className="flex flex-col gap-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">{t.selectMonths}</label>
                       <div className="flex gap-2 flex-wrap">
                          {availableMonths.map(m => (
                            <button 
                              key={m} 
                              onClick={() => toggleMonthSelection(m)}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${selectedDashboardMonths.includes(m) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-400'}`}
                            >
                              {m}
                            </button>
                          ))}
                       </div>
                    </div>
                  </div>
                  
                  <div className="flex bg-slate-100 p-1.5 rounded-3xl shadow-inner">
                    <button onClick={() => setChartMode('RANK')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${chartMode === 'RANK' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}>
                      {t.ranking}
                    </button>
                    <button onClick={() => setChartMode('EVOLUTION')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${chartMode === 'EVOLUTION' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}>
                      {t.evolution}
                    </button>
                  </div>
                </div>

                <div className="h-[650px] w-full">
                  {chartMode === 'RANK' ? (
                    dashboardRankingData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardRankingData} layout="vertical" margin={{ left: 60, right: 60, top: 20 }}>
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#4f46e5" />
                              <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="6 6" horizontal={true} vertical={false} stroke="#f1f5f9" />
                          <XAxis type="number" domain={[0, 10]} hide />
                          <YAxis 
                            type="category" 
                            dataKey="company" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fontWeight: 900, fill: '#1e293b', textAnchor: 'end'}} 
                            width={140}
                          />
                          <Tooltip 
                            cursor={{fill: '#f8fafc'}} 
                            contentStyle={{ borderRadius: '25px', border: 'none', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.15)', padding: '20px' }}
                            formatter={(value: any, name: string, props: any) => [
                               `${value} / 10`, 
                               selectedDashboardMonths.length > 1 ? `${t.summaryMode} (${props.payload.monthsIncluded} Months)` : 'Score'
                            ]}
                          />
                          <Bar dataKey="score" radius={[0, 20, 20, 0]} barSize={32}>
                            {dashboardRankingData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.score >= 9 ? '#10b981' : entry.score < 7 ? '#f43f5e' : 'url(#barGradient)'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                        <i className="fas fa-folder-open text-6xl mb-4"></i>
                        <p className="font-black uppercase tracking-widest">{t.noDataThisMonth}</p>
                      </div>
                    )
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={allMonthsTrend}>
                        <defs>
                          {Object.keys(allMonthsTrend[0] || {}).filter(k => k !== 'month').map((company, idx) => (
                            <linearGradient key={`grad-${company}`} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 800, fill: '#64748b'}} />
                        <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                        <Tooltip contentStyle={{ borderRadius: '25px', border: 'none', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.15)' }} />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '50px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                        {Object.keys(allMonthsTrend[0] || {}).filter(k => k !== 'month').map((company, idx) => (
                          <Area 
                            key={company} 
                            type="monotone" 
                            dataKey={company} 
                            stroke={COLORS[idx % COLORS.length]} 
                            strokeWidth={4} 
                            fillOpacity={1} 
                            fill={`url(#grad-${idx})`} 
                            dot={{ r: 6, fill: '#fff', strokeWidth: 3 }}
                            activeDot={{ r: 9, strokeWidth: 0 }}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
            </div>

            {/* Collapsible Service Standards at the Bottom */}
            <div className="mt-20">
              <button 
                onClick={() => setIsStandardsExpanded(!isStandardsExpanded)}
                className="w-full bg-white border border-slate-200 py-8 px-12 rounded-[2.5rem] shadow-sm flex items-center justify-between hover:bg-slate-50 transition-all group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <i className="fas fa-shield-check"></i>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">{t.standards}</h3>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{isStandardsExpanded ? t.collapseStandards : t.expandStandards}</span>
                  <i className={`fas fa-chevron-${isStandardsExpanded ? 'up' : 'down'} text-slate-300 group-hover:text-indigo-600 transition-colors`}></i>
                </div>
              </button>
              
              {isStandardsExpanded && (
                <div className="mt-4 bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-xl animate-in slide-in-from-top duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {SERVICE_STANDARDS.map((s, i) => (
                      <div key={i} className="flex gap-6 p-6 hover:bg-slate-50 transition-all rounded-[2rem] border border-transparent group hover:border-slate-100">
                        <div className="flex-shrink-0 w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-sm font-black">
                          {i+1}
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em]">{s.category}</div>
                          <div className="text-sm font-black text-slate-900 my-1">{s.item}</div>
                          <p className="text-[11px] text-slate-400 font-bold leading-relaxed">{s.detail}</p>
                          <div className="mt-3 text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg inline-block uppercase tracking-widest">{t.goal}: {s.goal}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-xl animate-in zoom-in duration-300">
           <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden flex h-[85vh]">
              <div className="hidden lg:flex w-1/3 bg-slate-50 p-12 border-r border-slate-100 flex-col overflow-y-auto custom-scrollbar">
                 <h3 className="text-lg font-black uppercase italic tracking-tighter mb-10">Guidelines</h3>
                 <div className="space-y-6">
                    {SERVICE_STANDARDS.map((s, idx) => (
                      <div key={idx} className="text-[10px]">
                        <div className="font-black text-indigo-600 uppercase mb-1">{s.item}</div>
                        <p className="text-slate-500 font-bold leading-normal">{s.detail}</p>
                      </div>
                    ))}
                 </div>
              </div>
              <div className="flex-grow p-12 overflow-y-auto custom-scrollbar bg-white">
                 <div className="flex justify-between items-center mb-10">
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter">{t.newAssessment}</h3>
                    <button onClick={() => setShowEntryModal(false)} className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">
                      <i className="fas fa-times"></i>
                    </button>
                 </div>
                 <div className="grid grid-cols-2 gap-8">
                    <div className="col-span-1 space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 ml-4">{t.monthPeriod}</label>
                       <input type="month" value={newEntry.month} onChange={e => setNewEntry({...newEntry, month: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-sm" />
                    </div>
                    <div className="col-span-1 space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 ml-4">{t.fwdName}</label>
                       <select value={newEntry.company} onChange={e => setNewEntry({...newEntry, company: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-sm">
                          <option value="">{t.selectFwd}</option>
                          {FORWARDER_LIST.map(f => <option key={f} value={f}>{f}</option>)}
                       </select>
                    </div>
                    {[
                      { label: t.frequency, key: 'frequency', opts: ['High', 'Medium', 'Low'] },
                      { label: t.completeness, key: 'completeness', opts: ['Excellent', 'Good', 'Fair'] },
                      { label: t.format, key: 'formatStandards', opts: ['Compliant', 'Basically Compliant', 'Fair'] },
                      { label: t.email, key: 'emailResponse', opts: ['≤2 hours', '≤4 hours', '>4 hours'] },
                      { label: t.evaluation, key: 'evaluation', opts: ['Excellent', 'Good', 'Fair'] },
                    ].map(field => (
                      <div key={field.key} className="col-span-1 space-y-2">
                         <label className="text-[10px] font-black uppercase text-slate-400 ml-4">{field.label}</label>
                         <select value={(newEntry as any)[field.key]} onChange={e => setNewEntry({...newEntry, [field.key]: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-sm">
                            {field.opts.map(o => <option key={o} value={o}>{o}</option>)}
                         </select>
                      </div>
                    ))}
                    <div className="col-span-1 space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 ml-4">{t.scoreLabel}</label>
                       <div className="w-full bg-indigo-50 border-none rounded-2xl px-6 py-4 font-black text-lg text-indigo-600">
                          {newEntry.score} / 10
                       </div>
                    </div>
                 </div>
                 <button onClick={addAssessment} className="w-full mt-12 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.4em] text-[11px] shadow-2xl hover:bg-indigo-600 transition-all">
                   {t.finalize}
                 </button>
              </div>
           </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-[101] bg-white/95 backdrop-blur-3xl flex flex-col items-center justify-center">
          <div className="relative w-32 h-32 mb-8">
            <div className="absolute inset-0 border-8 border-slate-100 rounded-full"></div>
            <div className="absolute inset-0 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-900 font-black tracking-[0.5em] text-[10px] uppercase animate-pulse italic">Compliance Engine Running...</p>
        </div>
      )}

      <footer className="p-14 text-center bg-white border-t border-slate-100">
        <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.8em] italic">214 Auditor v3.9 // Intelligent Node</p>
      </footer>
    </div>
  );
};

export default App;
