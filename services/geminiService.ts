
import { GoogleGenAI, Type } from "@google/genai";
import { LogisticsRecord, ForwarderAssessment } from "../types";

/**
 * 汇总生成指定货代的 Past Due 催办邮件
 */
export const generateExplanationEmail = async (fwdName: string, records: LogisticsRecord[]) => {
  // 每次调用时初始化，确保获取最新的 API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const shipmentsTable = records.map(r => 
    `| ${r.hawb} | EDD (AY): ${r.estimatedDeliveryDate} | Origin: ${r.origin} | Dest: ${r.destination} |`
  ).join('\n');

  const prompt = `
    Forwarder: ${fwdName}
    Total Past Due Shipments: ${records.length}
    
    Shipment List Data:
    ${shipmentsTable}

    Task: Write a professional dual-language (English and Chinese) email following the exact structure below.

    CHINESE TEMPLATE:
    尊敬的 ${fwdName} 团队：
    根据贵司通过 FTP 上传的 214 EDI/CSV 状态文件的最新系统审查，我们发现共有 ${records.length} 笔货运（Shipments）已处于 Past Due（过期未交付）状态，请贵司立即处理。
    根据贵司提供的数据，这些货运的预计送达日期（EDD）均已截止，但在上传的数据中并未记录实际送达日期（ADD）。这种数据缺失已影响到我们的供应链运作。
    请贵司针对以下事项提供专业回复：
    1. 根本原因分析 (Root Cause Analysis)：请说明这些货运延迟的原因。
    2. 修订计划：请针对下表中所列的每一笔 HAWB 提供更新后的到货计划或是否已到货。

    ENGLISH TEMPLATE:
    Translate the above into professional business English. Use terms: "214 EDI/CSV status files", "FTP upload", "Past Due", "EDD", "ADD", "Root Cause Analysis".

    STRICT FORMATTING:
    - Provide English first, then Chinese.
    - Include the shipment table clearly.
    - Tone: Firm and data-driven.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text;
};

/**
 * 生成全员月度绩效反馈邮件
 */
export const generateCollectiveFeedbackEmail = async (month: string, assessments: ForwarderAssessment[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const summaryMetrics = {
    avgScore: assessments.length > 0 ? assessments.reduce((acc, curr) => acc + curr.score, 0) / assessments.length : 0,
    lowFreqCount: assessments.filter(a => a.frequency !== 'High').length,
    formatIssues: assessments.filter(a => a.formatStandards !== 'Compliant').length,
    completenessIssues: assessments.filter(a => a.completeness !== 'Excellent').length,
    emailLatencyCount: assessments.filter(a => a.emailResponse.includes('>')).length
  };

  const prompt = `
    Sender: Corsair Logistics Management Team
    Target Audience: All Logistics Partners (BCC Group Email)
    Current Review Month: ${month}
    Summary: ${JSON.stringify(summaryMetrics)}

    Task: Write a dual-language (English/Chinese) performance review email to all forwarders.
    Focus on:
    - Overall data quality improvements needed.
    - Importance of daily 214 FTP uploads.
    - Managing "Past Due" shipments as a core KPI.
    - No specific company names should be mentioned.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text;
};

/**
 * 分析物流数据并生成洞察报告
 */
export const analyzeLogisticsData = async (records: LogisticsRecord[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const summary = records.reduce((acc: any, curr) => {
    acc[curr.forwarderName] = acc[curr.forwarderName] || { total: 0, pastDue: 0 };
    acc[curr.forwarderName].total++;
    if (curr.isOverdue) acc[curr.forwarderName].pastDue++;
    return acc;
  }, {});

  const prompt = `
    Analyze this shipment summary based on FTP uploaded 214 data:
    ${JSON.stringify(summary, null, 2)}
    Identify performance trends regarding Past Due shipments.
    Answer in a concise, business-expert style.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text;
};
