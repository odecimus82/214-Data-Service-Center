
import { GoogleGenAI, Type } from "@google/genai";
import { LogisticsRecord } from "../types";

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
  // 只传递核心数据以节省 token 并提高准确性
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
