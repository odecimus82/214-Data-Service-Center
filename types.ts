
export interface LogisticsRecord {
  id: string;
  ediDoc: string;
  forwarderName: string;
  mode: string;
  incoterms: string;
  freightTerm: string;
  deliveryId: string;
  poRef: string;
  shipperName: string;
  consigneeName: string;
  finalDeliveryName: string;
  carrierName: string;
  origin: string;
  destination: string;
  mawb: string;
  hawb: string;
  onBoardDate: string;
  etaDestination: string;
  estimatedDeliveryDate: string;
  actualDeliveryDate: string;
  delayReason: string;
  comment: string;
  isOverdue: boolean;
}

export interface ForwarderSummary {
  name: string;
  totalShipments: number;
  overdueCount: number;
  completedCount: number;
}

// 新增：货代评估结果接口
export interface ForwarderAssessment {
  month: string;           // 格式如 "2025-11"
  company: string;
  frequency: string;       // High, Medium, Low
  completeness: string;    // Excellent, Good, Fair
  formatStandards: string; // Compliant, Basically Compliant, Fair
  emailResponse: string;   // <=2h, <=4h, >4h
  evaluation: string;      // Excellent, Good, Fair
  score: number;           // 1-10
}

// 新增：服务标准接口
export interface ServiceStandard {
  category: string;
  item: string;
  detail: string;
  goal: string;
}
