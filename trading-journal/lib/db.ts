import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import type { Trade, TradeFormData, Settings, TradeStats, Asset } from './types';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'trading_journal.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      entry_date TEXT,
      entry_price REAL,
      shares REAL,
      account_pct REAL,
      stop_loss REAL,
      target_price REAL,
      risk_reward REAL,
      max_loss_dollars REAL,
      exit_date TEXT,
      exit_price REAL,
      pnl REAL,
      pnl_pct REAL,
      setup_type TEXT,
      market_conditions TEXT,
      entry_thesis TEXT,
      technical_setup TEXT,
      fundamental_catalyst TEXT,
      exit_reason TEXT,
      exit_notes TEXT,
      emotional_state INTEGER,
      confidence_level INTEGER,
      followed_plan INTEGER,
      lessons_learned TEXT,
      what_worked TEXT,
      what_failed TEXT,
      grade TEXT,
      tags TEXT,
      notification_sent INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      name TEXT NOT NULL,
      ticker TEXT,
      category TEXT NOT NULL,
      sub_category TEXT,
      current_value REAL NOT NULL DEFAULT 0,
      cost_basis REAL,
      quantity REAL,
      unit TEXT,
      location TEXT,
      currency TEXT DEFAULT 'USD',
      fx_rate REAL DEFAULT 1,
      notes TEXT,
      date_acquired TEXT,
      status TEXT DEFAULT 'ACTIVE'
    );
  `);

  return db;
}

export function getTrades(filters?: { status?: string; symbol?: string }): Trade[] {
  const database = getDb();
  let query = 'SELECT * FROM trades WHERE 1=1';
  const params: string[] = [];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters?.symbol) {
    query += ' AND symbol LIKE ?';
    params.push(`%${filters.symbol}%`);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = database.prepare(query);
  return stmt.all(...params) as Trade[];
}

export function getTradeById(id: string): Trade | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM trades WHERE id = ?');
  const result = stmt.get(id) as Trade | undefined;
  return result || null;
}

export function createTrade(data: TradeFormData): Trade {
  const database = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  let risk_reward: number | null = null;
  let max_loss_dollars: number | null = null;

  if (
    data.entry_price != null &&
    data.stop_loss != null &&
    data.target_price != null
  ) {
    const entryPrice = data.entry_price;
    const stopLoss = data.stop_loss;
    const targetPrice = data.target_price;

    if (data.direction === 'LONG') {
      const reward = targetPrice - entryPrice;
      const risk = entryPrice - stopLoss;
      risk_reward = risk !== 0 ? reward / risk : null;
    } else {
      const reward = entryPrice - targetPrice;
      const risk = stopLoss - entryPrice;
      risk_reward = risk !== 0 ? reward / risk : null;
    }
  }

  if (data.shares != null && data.entry_price != null && data.stop_loss != null) {
    max_loss_dollars = Math.abs(data.shares * (data.entry_price - data.stop_loss));
  }

  const trade: Trade = {
    id,
    created_at: now,
    updated_at: now,
    symbol: data.symbol.toUpperCase(),
    direction: data.direction,
    status: data.status || 'OPEN',
    entry_date: data.entry_date || now.split('T')[0],
    entry_price: data.entry_price ?? 0,
    shares: data.shares ?? 0,
    account_pct: data.account_pct ?? null,
    stop_loss: data.stop_loss ?? null,
    target_price: data.target_price ?? null,
    risk_reward: data.risk_reward ?? risk_reward,
    max_loss_dollars: data.max_loss_dollars ?? max_loss_dollars,
    exit_date: data.exit_date ?? null,
    exit_price: data.exit_price ?? null,
    pnl: data.pnl ?? null,
    pnl_pct: data.pnl_pct ?? null,
    setup_type: data.setup_type ?? null,
    market_conditions: data.market_conditions ?? null,
    entry_thesis: data.entry_thesis ?? null,
    technical_setup: data.technical_setup ?? null,
    fundamental_catalyst: data.fundamental_catalyst ?? null,
    exit_reason: data.exit_reason ?? null,
    exit_notes: data.exit_notes ?? null,
    emotional_state: data.emotional_state ?? null,
    confidence_level: data.confidence_level ?? null,
    followed_plan: data.followed_plan ?? null,
    lessons_learned: data.lessons_learned ?? null,
    what_worked: data.what_worked ?? null,
    what_failed: data.what_failed ?? null,
    grade: data.grade ?? null,
    tags: data.tags ?? null,
    notification_sent: data.notification_sent ?? 0,
  };

  const stmt = database.prepare(`
    INSERT INTO trades (
      id, created_at, updated_at, symbol, direction, status,
      entry_date, entry_price, shares, account_pct, stop_loss, target_price,
      risk_reward, max_loss_dollars, exit_date, exit_price, pnl, pnl_pct,
      setup_type, market_conditions, entry_thesis, technical_setup, fundamental_catalyst,
      exit_reason, exit_notes, emotional_state, confidence_level, followed_plan,
      lessons_learned, what_worked, what_failed, grade, tags, notification_sent
    ) VALUES (
      @id, @created_at, @updated_at, @symbol, @direction, @status,
      @entry_date, @entry_price, @shares, @account_pct, @stop_loss, @target_price,
      @risk_reward, @max_loss_dollars, @exit_date, @exit_price, @pnl, @pnl_pct,
      @setup_type, @market_conditions, @entry_thesis, @technical_setup, @fundamental_catalyst,
      @exit_reason, @exit_notes, @emotional_state, @confidence_level, @followed_plan,
      @lessons_learned, @what_worked, @what_failed, @grade, @tags, @notification_sent
    )
  `);

  stmt.run(trade);
  return trade;
}

export function updateTrade(id: string, data: Partial<TradeFormData>): Trade {
  const database = getDb();
  const existing = getTradeById(id);
  if (!existing) throw new Error(`Trade ${id} not found`);

  const now = new Date().toISOString();

  let risk_reward = existing.risk_reward;
  let max_loss_dollars = existing.max_loss_dollars;
  let pnl = existing.pnl;
  let pnl_pct = existing.pnl_pct;

  const entryPrice = data.entry_price ?? existing.entry_price;
  const stopLoss = data.stop_loss ?? existing.stop_loss;
  const targetPrice = data.target_price ?? existing.target_price;
  const shares = data.shares ?? existing.shares;
  const direction = data.direction ?? existing.direction;
  const exitPrice = data.exit_price ?? existing.exit_price;
  const status = data.status ?? existing.status;

  if (entryPrice != null && stopLoss != null && targetPrice != null) {
    if (direction === 'LONG') {
      const reward = targetPrice - entryPrice;
      const risk = entryPrice - stopLoss;
      risk_reward = risk !== 0 ? reward / risk : null;
    } else {
      const reward = entryPrice - targetPrice;
      const risk = stopLoss - entryPrice;
      risk_reward = risk !== 0 ? reward / risk : null;
    }
  }

  if (shares != null && entryPrice != null && stopLoss != null) {
    max_loss_dollars = Math.abs(shares * (entryPrice - stopLoss));
  }

  if (status === 'CLOSED' && exitPrice != null && entryPrice != null && shares != null) {
    if (direction === 'LONG') {
      pnl = (exitPrice - entryPrice) * shares;
      pnl_pct = ((exitPrice - entryPrice) / entryPrice) * 100;
    } else {
      pnl = (entryPrice - exitPrice) * shares;
      pnl_pct = ((entryPrice - exitPrice) / entryPrice) * 100;
    }
  }

  const updated: Trade = {
    ...existing,
    ...data,
    symbol: (data.symbol ?? existing.symbol).toUpperCase(),
    id,
    created_at: existing.created_at,
    updated_at: now,
    risk_reward,
    max_loss_dollars,
    pnl,
    pnl_pct,
  };

  const stmt = database.prepare(`
    UPDATE trades SET
      updated_at = @updated_at,
      symbol = @symbol,
      direction = @direction,
      status = @status,
      entry_date = @entry_date,
      entry_price = @entry_price,
      shares = @shares,
      account_pct = @account_pct,
      stop_loss = @stop_loss,
      target_price = @target_price,
      risk_reward = @risk_reward,
      max_loss_dollars = @max_loss_dollars,
      exit_date = @exit_date,
      exit_price = @exit_price,
      pnl = @pnl,
      pnl_pct = @pnl_pct,
      setup_type = @setup_type,
      market_conditions = @market_conditions,
      entry_thesis = @entry_thesis,
      technical_setup = @technical_setup,
      fundamental_catalyst = @fundamental_catalyst,
      exit_reason = @exit_reason,
      exit_notes = @exit_notes,
      emotional_state = @emotional_state,
      confidence_level = @confidence_level,
      followed_plan = @followed_plan,
      lessons_learned = @lessons_learned,
      what_worked = @what_worked,
      what_failed = @what_failed,
      grade = @grade,
      tags = @tags,
      notification_sent = @notification_sent
    WHERE id = @id
  `);

  stmt.run(updated);
  return updated;
}

export function deleteTrade(id: string): void {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM trades WHERE id = ?');
  stmt.run(id);
}

export function getSettings(): Settings {
  const database = getDb();
  const stmt = database.prepare('SELECT key, value FROM settings');
  const rows = stmt.all() as { key: string; value: string }[];

  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }

  return {
    discordWebhookUrl: map['discordWebhookUrl'] || '',
    twilioAccountSid: map['twilioAccountSid'] || '',
    twilioAuthToken: map['twilioAuthToken'] || '',
    twilioFromNumber: map['twilioFromNumber'] || '',
    twilioToNumber: map['twilioToNumber'] || '',
    smsEnabled: map['smsEnabled'] === 'true',
    discordEnabled: map['discordEnabled'] === 'true',
  };
}

export function saveSettings(settings: Partial<Settings>): void {
  const database = getDb();
  const stmt = database.prepare(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
  );

  const upsert = database.transaction((entries: [string, string][]) => {
    for (const [key, value] of entries) {
      stmt.run(key, value);
    }
  });

  const entries: [string, string][] = Object.entries(settings).map(([key, value]) => [
    key,
    String(value),
  ]);

  upsert(entries);
}

export function getAssets(): Asset[] {
  const database = getDb();
  const stmt = database.prepare(
    "SELECT * FROM assets WHERE status = 'ACTIVE' ORDER BY current_value DESC"
  );
  return stmt.all() as Asset[];
}

export function getAssetById(id: string): Asset | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM assets WHERE id = ?');
  const result = stmt.get(id) as Asset | undefined;
  return result || null;
}

export function createAsset(data: Omit<Asset, 'id' | 'created_at' | 'updated_at'>): Asset {
  const database = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  const asset: Asset = {
    id,
    created_at: now,
    updated_at: now,
    name: data.name,
    ticker: data.ticker,
    category: data.category,
    sub_category: data.sub_category,
    current_value: data.current_value,
    cost_basis: data.cost_basis,
    quantity: data.quantity,
    unit: data.unit,
    location: data.location,
    currency: data.currency || 'USD',
    fx_rate: data.fx_rate ?? 1,
    notes: data.notes,
    date_acquired: data.date_acquired,
    status: data.status || 'ACTIVE',
  };

  const stmt = database.prepare(`
    INSERT INTO assets (
      id, created_at, updated_at, name, ticker, category, sub_category,
      current_value, cost_basis, quantity, unit, location, currency, fx_rate,
      notes, date_acquired, status
    ) VALUES (
      @id, @created_at, @updated_at, @name, @ticker, @category, @sub_category,
      @current_value, @cost_basis, @quantity, @unit, @location, @currency, @fx_rate,
      @notes, @date_acquired, @status
    )
  `);

  stmt.run(asset);
  return asset;
}

export function updateAsset(id: string, data: Partial<Asset>): Asset {
  const database = getDb();
  const existing = getAssetById(id);
  if (!existing) throw new Error(`Asset ${id} not found`);

  const now = new Date().toISOString();
  const updated: Asset = {
    ...existing,
    ...data,
    id,
    created_at: existing.created_at,
    updated_at: now,
  };

  const stmt = database.prepare(`
    UPDATE assets SET
      updated_at = @updated_at,
      name = @name,
      ticker = @ticker,
      category = @category,
      sub_category = @sub_category,
      current_value = @current_value,
      cost_basis = @cost_basis,
      quantity = @quantity,
      unit = @unit,
      location = @location,
      currency = @currency,
      fx_rate = @fx_rate,
      notes = @notes,
      date_acquired = @date_acquired,
      status = @status
    WHERE id = @id
  `);

  stmt.run(updated);
  return updated;
}

export function deleteAsset(id: string): void {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM assets WHERE id = ?');
  stmt.run(id);
}

export function getStats(): TradeStats {
  const database = getDb();

  const totalTrades = (
    database.prepare('SELECT COUNT(*) as count FROM trades').get() as { count: number }
  ).count;

  const openTrades = (
    database
      .prepare("SELECT COUNT(*) as count FROM trades WHERE status = 'OPEN'")
      .get() as { count: number }
  ).count;

  const closedTrades = database
    .prepare("SELECT * FROM trades WHERE status = 'CLOSED'")
    .all() as Trade[];

  const winningTrades = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  const tradesWithRR = closedTrades.filter((t) => t.risk_reward != null);
  const avgRR =
    tradesWithRR.length > 0
      ? tradesWithRR.reduce((sum, t) => sum + (t.risk_reward ?? 0), 0) / tradesWithRR.length
      : 0;

  const pnlValues = closedTrades.map((t) => t.pnl ?? 0);
  const bestTrade = pnlValues.length > 0 ? Math.max(...pnlValues) : 0;
  const worstTrade = pnlValues.length > 0 ? Math.min(...pnlValues) : 0;

  const gradeOrder: Record<string, number> = {
    'A+': 6,
    A: 5,
    B: 4,
    C: 3,
    D: 2,
    F: 1,
  };

  const gradedTrades = closedTrades.filter((t) => t.grade != null);
  let avgGrade = 'N/A';
  if (gradedTrades.length > 0) {
    const avgScore =
      gradedTrades.reduce((sum, t) => sum + (gradeOrder[t.grade!] ?? 0), 0) /
      gradedTrades.length;
    if (avgScore >= 5.5) avgGrade = 'A+';
    else if (avgScore >= 4.5) avgGrade = 'A';
    else if (avgScore >= 3.5) avgGrade = 'B';
    else if (avgScore >= 2.5) avgGrade = 'C';
    else if (avgScore >= 1.5) avgGrade = 'D';
    else avgGrade = 'F';
  }

  return {
    totalTrades,
    openTrades,
    winRate,
    totalPnl,
    avgRR,
    bestTrade,
    worstTrade,
    avgGrade,
  };
}
