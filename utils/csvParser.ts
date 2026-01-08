
import { LogisticsRecord, ForwarderAssessment } from '../types';

/**
 * 智能日期解析器
 */
const smartParseDate = (dateStr: string): Date | null => {
  if (!dateStr || !dateStr.trim()) return null;
  let cleanStr = dateStr.split(' ')[0].trim().replace(/\//g, '-').replace(/\./g, '-');
  let d = new Date(cleanStr);
  if (!isNaN(d.getTime())) return d;

  const monthMap: { [key: string]: number } = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const monthName = parts[1].toLowerCase().substring(0, 3);
    const year = parseInt(parts[2]);
    if (!isNaN(day) && monthMap[monthName] !== undefined && !isNaN(year)) {
      const fullYear = year < 100 ? 2000 + year : year;
      return new Date(fullYear, monthMap[monthName], day);
    }
  }
  return null;
};

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

export const parseLogisticsCSV = (csvText: string): LogisticsRecord[] => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];
  const records: LogisticsRecord[] = [];
  const now = new Date();
  const validLines = lines.filter(l => l.trim().length > 0);
  for (let i = 1; i < validLines.length; i++) {
    const parts = parseCSVLine(validLines[i]);
    if (parts.length < 54) continue; 
    const hawb = parts[30] || 'N/A';
    const eddStr = parts[50] || '';
    const addStr = parts[53] || '';
    let isOverdue = false;
    if (eddStr.trim().length > 0 && addStr.trim().length === 0) {
      const eddDate = smartParseDate(eddStr);
      if (eddDate && !isNaN(eddDate.getTime()) && eddDate < now) {
        isOverdue = true;
      }
    }
    records.push({
      id: `${hawb}-${i}`,
      ediDoc: parts[0] || '',
      forwarderName: parts[1] || 'Unknown',
      mode: parts[2] || '',
      incoterms: parts[3] || '',
      freightTerm: parts[4] || '',
      deliveryId: parts[5] || '',
      poRef: parts[6] || '',
      shipperName: parts[7] || '',
      consigneeName: parts[12] || '',
      finalDeliveryName: parts[18] || '',
      carrierName: parts[26] || '',
      origin: parts[27] || '',
      destination: parts[28] || '',
      mawb: parts[29] || '',
      hawb: hawb,
      onBoardDate: parts[44] || '',
      etaDestination: parts[45] || '',
      estimatedDeliveryDate: eddStr,
      actualDeliveryDate: addStr,
      delayReason: parts[54] || '',
      comment: parts[55] || '',
      isOverdue
    });
  }
  return records;
};

// 新增：解析服务评估 CSV
// 预期格式: Month, Company, Frequency, Completeness, Standards, Email, Evaluation, Score
export const parseAssessmentCSV = (csvText: string): ForwarderAssessment[] => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];
  const results: ForwarderAssessment[] = [];
  const validLines = lines.filter(l => l.trim().length > 0);
  for (let i = 1; i < validLines.length; i++) {
    const parts = parseCSVLine(validLines[i]);
    if (parts.length < 8) continue;
    results.push({
      month: parts[0],
      company: parts[1],
      frequency: parts[2],
      completeness: parts[3],
      formatStandards: parts[4],
      emailResponse: parts[5],
      evaluation: parts[6],
      score: parseFloat(parts[7]) || 0
    });
  }
  return results;
};
