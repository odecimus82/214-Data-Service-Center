
import { GoogleGenAI, Type } from "@google/genai";
import { LogisticsRecord, ForwarderAssessment } from "../types";

const getAIInstance = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * 汇总生成指定货代的 Past Due 催办邮件
 */
export const generateExplanationEmail = async (fwdName: string, records: LogisticsRecord[]) => {
  const ai = getAIInstance();
  
  // 提取所有 Past Due 运单的信息
  const shipmentsTable = records.map(r => 
    `| ${r.hawb} | EDD (AY): ${r.estimatedDeliveryDate} | Origin: ${r.origin} | Dest: ${r.destination} |`
  ).join('\n');

  const prompt = `
    Forwarder: ${fwdName}
    Total Past Due Shipments: ${records.length}
    
    Shipment List:
    ${shipmentsTable}

    Task: Write a professional dual-language (English and Chinese) email requesting an immediate status update.
    
    STRICT REQUIREMENTS:
    1. Context: You must state clearly that these discrepancies were identified from the "214 EDI/CSV status files" uploaded by their team to our system via FTP.
    2. Terminology: Use "Past Due" instead of overdue, and "Shipment" instead of record/order.
    3. Tone: Firm, data-driven, and professional.
    4. Key Point: The Estimated Delivery Date (EDD) has passed, and no Actual Delivery Date (ADD) has been recorded in the FTP-uploaded data.
    5. Call to Action: Request a root cause analysis for the delays and a revised arrival schedule for each HAWB.
    6. Formatting: Present the HAWB list clearly in a table or structured list.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text;
};

export const generateCollectiveFeedbackEmail = async (month: string, assessments: ForwarderAssessment[]) => {
  const ai = getAIInstance();
  
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
    General Performance Trends:
    ${JSON.stringify(summaryMetrics, null, 2)}

    Task: Write a highly professional collective performance feedback email for Corsair's global forwarder pool.
    
    STRICT CONSTRAINTS:
    1. DO NOT mention any specific company names.
    2. Focus on "Shipment visibility" and "Status 214 compliance via FTP uploads".
    3. Mention "Past Due" management as a critical KPI.

    Language: Professional Dual-Language (English/Chinese).
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
