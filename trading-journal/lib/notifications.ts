import type { Trade } from './types';
import { getSettings } from './db';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export async function sendDiscordNotification(
  trade: Trade,
  action: 'ENTRY' | 'EXIT',
  webhookUrl: string
): Promise<boolean> {
  try {
    let color: number;
    let title: string;
    const fields: { name: string; value: string; inline: boolean }[] = [];

    if (action === 'ENTRY') {
      color = trade.direction === 'LONG' ? 0x22c55e : 0xef4444;
      const dirEmoji = trade.direction === 'LONG' ? '📈' : '📉';
      title = `${dirEmoji} ENTRY: $${trade.symbol} ${trade.direction}`;

      fields.push({ name: 'Symbol', value: `$${trade.symbol}`, inline: true });
      fields.push({ name: 'Direction', value: trade.direction, inline: true });
      fields.push({
        name: 'Entry Price',
        value: formatCurrency(trade.entry_price),
        inline: true,
      });
      fields.push({
        name: 'Shares',
        value: trade.shares.toString(),
        inline: true,
      });

      if (trade.stop_loss != null) {
        fields.push({
          name: 'Stop Loss',
          value: formatCurrency(trade.stop_loss),
          inline: true,
        });
      }

      if (trade.target_price != null) {
        fields.push({
          name: 'Target',
          value: formatCurrency(trade.target_price),
          inline: true,
        });
      }

      if (trade.risk_reward != null) {
        fields.push({
          name: 'R/R Ratio',
          value: `${trade.risk_reward.toFixed(2)}:1`,
          inline: true,
        });
      }

      if (trade.setup_type) {
        fields.push({ name: 'Setup Type', value: trade.setup_type, inline: true });
      }

      if (trade.market_conditions) {
        fields.push({
          name: 'Market Conditions',
          value: trade.market_conditions,
          inline: true,
        });
      }
    } else {
      const isProfitable = (trade.pnl ?? 0) >= 0;
      color = isProfitable ? 0x22c55e : 0xef4444;

      const pnlStr =
        trade.pnl != null
          ? `${isProfitable ? '+' : ''}${formatCurrency(trade.pnl)} (${formatPercent(trade.pnl_pct ?? 0)})`
          : 'N/A';

      const dirEmoji = trade.direction === 'LONG' ? '📈' : '📉';
      title = `${dirEmoji} EXIT: $${trade.symbol} ${trade.direction} — ${pnlStr}`;

      fields.push({ name: 'Symbol', value: `$${trade.symbol}`, inline: true });
      fields.push({ name: 'Direction', value: trade.direction, inline: true });
      fields.push({
        name: 'Entry Price',
        value: formatCurrency(trade.entry_price),
        inline: true,
      });

      if (trade.exit_price != null) {
        fields.push({
          name: 'Exit Price',
          value: formatCurrency(trade.exit_price),
          inline: true,
        });
      }

      if (trade.pnl != null) {
        fields.push({
          name: 'P&L',
          value: `${isProfitable ? '+' : ''}${formatCurrency(trade.pnl)}`,
          inline: true,
        });
      }

      if (trade.pnl_pct != null) {
        fields.push({
          name: 'P&L %',
          value: formatPercent(trade.pnl_pct),
          inline: true,
        });
      }

      if (trade.exit_reason) {
        fields.push({ name: 'Exit Reason', value: trade.exit_reason, inline: true });
      }

      if (trade.grade) {
        fields.push({ name: 'Grade', value: trade.grade, inline: true });
      }

      if (trade.risk_reward != null) {
        fields.push({
          name: 'R/R Ratio',
          value: `${trade.risk_reward.toFixed(2)}:1`,
          inline: true,
        });
      }
    }

    const footerText = trade.entry_thesis
      ? trade.entry_thesis.substring(0, 200)
      : 'No thesis recorded';

    const payload = {
      embeds: [
        {
          title,
          color,
          fields,
          footer: {
            text: `Thesis: ${footerText}`,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error('Discord notification error:', error);
    return false;
  }
}

export async function sendSmsNotification(
  trade: Trade,
  action: 'ENTRY' | 'EXIT',
  twilioConfig: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
    toNumber: string;
  }
): Promise<boolean> {
  try {
    const twilio = await import('twilio');
    const client = twilio.default(twilioConfig.accountSid, twilioConfig.authToken);

    let messageBody: string;

    if (action === 'ENTRY') {
      const thesisPart = trade.entry_thesis
        ? trade.entry_thesis.substring(0, 100)
        : 'No thesis';
      const rrPart =
        trade.risk_reward != null ? ` R/R: ${trade.risk_reward.toFixed(1)}.` : '';
      const slPart = trade.stop_loss != null ? ` SL: ${formatCurrency(trade.stop_loss)}.` : '';
      const targetPart =
        trade.target_price != null ? ` Target: ${formatCurrency(trade.target_price)}.` : '';

      messageBody = `SKY JOURNAL: Entered ${trade.symbol} ${trade.direction} @ ${formatCurrency(trade.entry_price)}.${slPart}${targetPart}${rrPart} Thesis: ${thesisPart}`;
    } else {
      const isProfitable = (trade.pnl ?? 0) >= 0;
      const sign = isProfitable ? '+' : '';
      const pnlPart =
        trade.pnl != null
          ? ` PnL: ${sign}${formatCurrency(trade.pnl)} (${formatPercent(trade.pnl_pct ?? 0)}).`
          : '';
      const gradePart = trade.grade ? ` Grade: ${trade.grade}.` : '';
      const reasonPart = trade.exit_reason ? ` Reason: ${trade.exit_reason}` : '';
      const exitPricePart =
        trade.exit_price != null ? ` @ ${formatCurrency(trade.exit_price)}` : '';

      messageBody = `SKY JOURNAL: Exited ${trade.symbol} ${trade.direction}${exitPricePart}.${pnlPart}${gradePart}${reasonPart}`;
    }

    await client.messages.create({
      body: messageBody,
      from: twilioConfig.fromNumber,
      to: twilioConfig.toNumber,
    });

    return true;
  } catch (error) {
    console.error('SMS notification error:', error);
    return false;
  }
}

export async function sendTradeNotification(
  trade: Trade,
  action: 'ENTRY' | 'EXIT'
): Promise<void> {
  try {
    const settings = getSettings();

    if (settings.discordEnabled && settings.discordWebhookUrl) {
      await sendDiscordNotification(trade, action, settings.discordWebhookUrl);
    }

    if (
      settings.smsEnabled &&
      settings.twilioAccountSid &&
      settings.twilioAuthToken &&
      settings.twilioFromNumber &&
      settings.twilioToNumber
    ) {
      await sendSmsNotification(trade, action, {
        accountSid: settings.twilioAccountSid,
        authToken: settings.twilioAuthToken,
        fromNumber: settings.twilioFromNumber,
        toNumber: settings.twilioToNumber,
      });
    }
  } catch (error) {
    console.error('Trade notification error:', error);
  }
}
