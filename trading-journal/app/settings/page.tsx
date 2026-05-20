'use client';

import { useEffect, useState } from 'react';
import type { Settings } from '@/lib/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    discordWebhookUrl: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioFromNumber: '',
    twilioToNumber: '',
    smsEnabled: false,
    discordEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [discordTestResult, setDiscordTestResult] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch {
        console.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setDiscordTestResult(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      console.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function testDiscord() {
    if (!settings.discordWebhookUrl) {
      setDiscordTestResult('Please enter a Discord webhook URL first');
      return;
    }
    setTestingDiscord(true);
    setDiscordTestResult(null);
    try {
      const res = await fetch(settings.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: 'Sky Folio Journal — Test Notification',
              description: 'Your Discord webhook is working correctly! You will receive trade notifications here.',
              color: 0x38bdf8,
              footer: { text: 'Sky Folio Trading Journal' },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
      setDiscordTestResult(res.ok ? 'Success! Check your Discord channel.' : 'Failed. Check your webhook URL.');
    } catch {
      setDiscordTestResult('Failed to send test. Check the URL and your network.');
    } finally {
      setTestingDiscord(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-xs text-slate-500">Notifications & preferences</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-lg mx-auto px-4 py-4 space-y-6">

        {/* Discord */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">Discord Notifications</p>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Enable Discord</p>
                <p className="text-xs text-slate-500">Send trade alerts to Discord</p>
              </div>
              <button
                type="button"
                onClick={() => update('discordEnabled', !settings.discordEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                  settings.discordEnabled ? 'bg-sky-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    settings.discordEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Webhook URL */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Webhook URL</label>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={settings.discordWebhookUrl}
                onChange={(e) => update('discordWebhookUrl', e.target.value)}
              />
            </div>

            {/* Test button */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={testDiscord}
                disabled={testingDiscord || !settings.discordWebhookUrl}
                className="flex-1 h-10 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm rounded-xl border border-slate-700 transition-colors"
              >
                {testingDiscord ? 'Testing...' : 'Send Test Message'}
              </button>
            </div>
            {discordTestResult && (
              <p className={`text-xs ${discordTestResult.includes('Success') ? 'text-green-400' : 'text-red-400'}`}>
                {discordTestResult}
              </p>
            )}

            {/* Instructions */}
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-medium mb-1">How to get a Discord webhook URL:</p>
              <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
                <li>Open your Discord server</li>
                <li>Go to Channel Settings → Integrations → Webhooks</li>
                <li>Click &quot;New Webhook&quot; and copy the URL</li>
                <li>Paste it above</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Twilio SMS */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">SMS Notifications (Twilio)</p>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Enable SMS</p>
                <p className="text-xs text-slate-500">Send trade alerts via SMS</p>
              </div>
              <button
                type="button"
                onClick={() => update('smsEnabled', !settings.smsEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                  settings.smsEnabled ? 'bg-green-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    settings.smsEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Account SID</label>
              <input
                type="text"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={settings.twilioAccountSid}
                onChange={(e) => update('twilioAccountSid', e.target.value)}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Auth Token</label>
              <input
                type="password"
                placeholder="Your Twilio auth token"
                value={settings.twilioAuthToken}
                onChange={(e) => update('twilioAuthToken', e.target.value)}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">From Number</label>
              <input
                type="tel"
                placeholder="+15551234567"
                value={settings.twilioFromNumber}
                onChange={(e) => update('twilioFromNumber', e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Your Phone Number (To)</label>
              <input
                type="tel"
                placeholder="+15559876543"
                value={settings.twilioToNumber}
                onChange={(e) => update('twilioToNumber', e.target.value)}
              />
            </div>

            {/* Twilio instructions */}
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-medium mb-1">How to set up Twilio:</p>
              <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
                <li>Sign up at twilio.com (free trial available)</li>
                <li>Get a Twilio phone number</li>
                <li>Find Account SID and Auth Token in your console</li>
                <li>Enter your own phone as the &quot;To&quot; number</li>
              </ol>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">About</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">App Name</span>
              <span className="text-xs text-white">Sky Folio Journal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Version</span>
              <span className="text-xs text-white">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Storage</span>
              <span className="text-xs text-white">Local SQLite</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Inspired by</span>
              <span className="text-xs text-slate-400 text-right">Dalio, Tudor Jones, Druckenmiller</span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="pb-4">
          <button
            type="submit"
            disabled={saving}
            className={`w-full h-14 font-bold text-base rounded-xl transition-all ${
              saved
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                : 'bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500 text-white shadow-lg shadow-sky-500/20'
            }`}
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
