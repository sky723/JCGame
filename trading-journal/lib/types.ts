export interface Trade {
  id: string;
  created_at: string;
  updated_at: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  status: 'OPEN' | 'CLOSED' | 'PARTIAL';
  entry_date: string;
  entry_price: number;
  shares: number;
  account_pct: number | null;
  stop_loss: number | null;
  target_price: number | null;
  risk_reward: number | null;
  max_loss_dollars: number | null;
  exit_date: string | null;
  exit_price: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  setup_type: 'Momentum' | 'Breakout' | 'Reversal' | 'Swing' | 'Event-Driven' | 'Mean-Reversion' | null;
  market_conditions: 'Bullish' | 'Bearish' | 'Choppy' | 'News-Driven' | 'Volatile' | null;
  entry_thesis: string | null;
  technical_setup: string | null;
  fundamental_catalyst: string | null;
  exit_reason: 'Thesis Complete' | 'Stop Hit' | 'Time Stop' | 'Opportunity Cost' | 'Risk Management' | 'Partial Profit' | null;
  exit_notes: string | null;
  emotional_state: number | null;
  confidence_level: number | null;
  followed_plan: number | null;
  lessons_learned: string | null;
  what_worked: string | null;
  what_failed: string | null;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' | null;
  tags: string | null;
  notification_sent: number | null;
}

export interface TradeFormData {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  status?: 'OPEN' | 'CLOSED' | 'PARTIAL';
  entry_date?: string;
  entry_price?: number;
  shares?: number;
  account_pct?: number;
  stop_loss?: number;
  target_price?: number;
  risk_reward?: number;
  max_loss_dollars?: number;
  exit_date?: string;
  exit_price?: number;
  pnl?: number;
  pnl_pct?: number;
  setup_type?: 'Momentum' | 'Breakout' | 'Reversal' | 'Swing' | 'Event-Driven' | 'Mean-Reversion';
  market_conditions?: 'Bullish' | 'Bearish' | 'Choppy' | 'News-Driven' | 'Volatile';
  entry_thesis?: string;
  technical_setup?: string;
  fundamental_catalyst?: string;
  exit_reason?: 'Thesis Complete' | 'Stop Hit' | 'Time Stop' | 'Opportunity Cost' | 'Risk Management' | 'Partial Profit';
  exit_notes?: string;
  emotional_state?: number;
  confidence_level?: number;
  followed_plan?: number;
  lessons_learned?: string;
  what_worked?: string;
  what_failed?: string;
  grade?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  tags?: string;
  notification_sent?: number;
}

export interface Settings {
  discordWebhookUrl: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromNumber: string;
  twilioToNumber: string;
  smsEnabled: boolean;
  discordEnabled: boolean;
}

export interface TradeStats {
  totalTrades: number;
  openTrades: number;
  winRate: number;
  totalPnl: number;
  avgRR: number;
  bestTrade: number;
  worstTrade: number;
  avgGrade: string;
}

export interface Asset {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  ticker?: string;
  category: 'STOCKS' | 'REAL_ESTATE_US' | 'INDIA_LAND' | 'CRYPTO' | 'ALTERNATIVE' | 'CASH';
  sub_category?: string;
  current_value: number;
  cost_basis?: number;
  quantity?: number;
  unit?: string;
  location?: string;
  currency?: string;
  fx_rate?: number;
  notes?: string;
  date_acquired?: string;
  status: 'ACTIVE' | 'SOLD';
}

export interface PortfolioStats {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  byCategory: Record<string, { value: number; count: number; pct: number }>;
}
