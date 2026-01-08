
import { GoogleGenAI, Type } from "@google/genai";
import { LogisticsRecord, ForwarderAssessment } from "../types";

const getAIInstance = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateExplanationEmail = async (fwdName: string, records: LogisticsRecord[]) => {
  const ai = getAIInstance();
  const shipmentsInfo = records.map(r => 
    `HAWB: ${r.hawb}, EDD (AY): ${r.estimatedDeliveryDate}, On Board (AS): ${r.onBoardDate}, ETA (AT): ${r.etaDestination}`
  ).join('\n');

  const prompt = `
    Forwarder Name: ${fwdName}
    Overdue Shipments Data:
    ${shipmentsInfo}

    Task: Write a professional dual-language (English and Chinese) email.
    
    CRITICAL RULES:
    1. STRICTLY use the dates provided above. DO NOT guess, change, or format the dates differently. 
    2. Explicitly mention that the Estimated Delivery Date (AY column) has passed.
    3. The Actual Delivery Date (BB column) is currently empty in our system for these HAWBs.
    4. Request an explanation for the delay and a revised arrival schedule.
    5. Maintain a professional, data-driven tone.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text;
};

/**
 * 优化：生成全员绩效反馈邮件 (不包含具体名称和数量)
 */
export const generateCollectiveFeedbackEmail = async (month: string, assessments: ForwarderAssessment[]) => {
  const ai = getAIInstance();
  
  // 提供汇总数据供 AI 分析共性，但告知其不要在正文中列出
  const summaryMetrics = {
    avgScore: assessments.reduce((acc, curr) => acc + curr.score, 0) / assessments.length,
    lowFreqCount: assessments.filter(a => a.frequency !== 'High').length,
    formatIssues: assessments.filter(a => a.formatStandards !== 'Compliant').length,
    completenessIssues: assessments.filter(a => a.completeness !== 'Excellent').length,
    emailLatencyCount: assessments.filter(a => a.emailResponse.includes('>')).length
  };

  const prompt = `
    Sender: Corsair Logistics Management Team
    Target Audience: All Logistics Partners (BCC Group Email)
    Current Review Month: ${month}
    General Performance Trends (FOR AI ANALYSIS ONLY, DO NOT LIST IN EMAIL):
    ${JSON.stringify(summaryMetrics, null, 2)}

    Task: Write a highly professional collective performance feedback email for Corsair's global forwarder pool.
    
    STRICT CONSTRAINTS (MANDATORY):
    1. DO NOT mention any specific company names (e.g., THI, AGS, Schneider etc.).
    2. DO NOT mention the total count of forwarders or specific quantity statistics.
    3. Use a "Pool Performance" perspective.
    4. Focus on general technical gaps and compliance.

    Content Structure:
    1. Opening: Corsair's commitment to supply chain visibility and data-driven logistics management.
    2. Data Integrity Observation: 
       - Discuss EDI 214 status frequency and why daily updates (High Frequency) are critical for Corsair's end-to-end planning.
       - Highlight common gaps in milestone completeness (especially missing actual delivery timestamps).
       - Standardization: Mention the need for strict adherence to ISO timestamp formats and milestone naming conventions (Corsair SOP).
    3. Communication SLA: Reiterate the requirement for email response times (Urgent vs Standard).
    4. Closing: Instruct each partner to check their INDIVIDUAL scorecard (sent separately) for specific improvement items.

    Language: Professional Dual-Language (English followed by Chinese).
    Terminology: Status 214, EDI Latency, Milestone Consistency, Field Integrity, SLA Compliance, Visibility, Corsair Logistics SOP.
    Tone: Sophisticated, authoritative, but partnership-oriented.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });

  return response.text;
};

export const analyzeLogisticsData = async (records: LogisticsRecord[]) => {
  const ai = getAIInstance();
  const summary = records.reduce((acc: any, curr) => {
    acc[curr.forwarderName] = acc[curr.forwarderName] || { total: 0, overdue: 0 };
    acc[curr.forwarderName].total++;
    if (curr.isOverdue) acc[curr.forwarderName].overdue++;
    return acc;
  }, {});

  const prompt = `
    Analyze this logistics summary for Forwarders:
    ${JSON.stringify(summary, null, 2)}

    Please identify performance trends. Which forwarders have the highest overdue rate? 
    Suggest 3 specific action items for the management team.
    Answer in a concise, business-expert style.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text;
};

export const chatWithLogisticsData = async (query: string, records: LogisticsRecord[]) => {
  const ai = getAIInstance();
  const compactData = records.slice(0, 50).map(r => ({
    fwd: r.forwarderName,
    hawb: r.hawb,
    edd: r.estimatedDeliveryDate,
    add: r.actualDeliveryDate,
    status: r.isOverdue ? 'Overdue' : 'Normal'
  }));
  
  const prompt = `
    User Query: "${query}"
    
    Current 214 Data Snapshot (Top 50):
    ${JSON.stringify(compactData, null, 2)}
    
    Rules:
    - If the user asks about specific dates, refer exactly to the "edd" or "add" fields.
    - Be precise. If the data is not in the snapshot, say you only have access to the current 214 file.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });

  return response.text;
};
