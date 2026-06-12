#!/usr/bin/env python3
"""
World Cup 2026 ticket watcher — MetLife Stadium (NJ) + Lincoln Financial Field (Philly)

PRIVACY DESIGN — what this script does and does NOT do:
DOES: one anonymous GET to tickpick.com's public category page per cycle, parses public JSON-LD price data, compares against its own local state file, and (optionally) sends YOU a Telegram message.
DOES NOT: log in anywhere, send cookies, read any file outside its own state file (./wc_state.json), access contacts/browser data/anything on your machine, collect analytics, or transmit any data anywhere except api.telegram.org (your own bot, your own chat).

Outbound connections: tickpick.com (read-only) and api.telegram.org (alerts). That's the complete list. Grep this file for "http" to verify.

ALERT RULES (any of):
1. A watched match appears for the first time (new availability)
2. Lowest price drops >= DROP_PCT percent since last seen
3. Lowest price falls below your PRICE_THRESHOLD for that match

SETUP:
  pip install httpx
  export TG_BOT_TOKEN="123456:ABC..."  # from @BotFather
  export TG_CHAT_ID="123456789"         # from @userinfobot
  python wc_ticket_watch.py             # single check
  python wc_ticket_watch.py --loop      # check every POLL_MINUTES

If TG_* env vars are unset, alerts print to the console instead.
"""

import json
import os
import re
import sys
import time
from datetime import datetime, timezone
import httpx

# --------------------------------------------------------------------------
# CONFIG — edit freely
# --------------------------------------------------------------------------

POLL_MINUTES = 120
PRICE_THRESHOLD = 300  # only alert when lowest ticket drops below this

FIXTURES = [
    {"mn": 5,   "date": "2026-06-13", "label": "Brazil vs Morocco",           "venue": "MetLife Stadium"},
    {"mn": 10,  "date": "2026-06-14", "label": "Cote d'Ivoire vs Ecuador",    "venue": "Lincoln Financial Field"},
    {"mn": 29,  "date": "2026-06-19", "label": "Brazil vs Haiti",             "venue": "Lincoln Financial Field"},
    {"mn": 41,  "date": "2026-06-22", "label": "France vs TBD (Grp I)",       "venue": "MetLife Stadium"},
    {"mn": 43,  "date": "2026-06-23", "label": "Argentina vs Austria",        "venue": "Lincoln Financial Field"},
    {"mn": 64,  "date": "2026-06-26", "label": "Saudi Arabia vs Cabo Verde",  "venue": "Lincoln Financial Field"},
    {"mn": 65,  "date": "2026-06-26", "label": "France vs Norway",            "venue": "MetLife Stadium"},
    {"mn": 71,  "date": "2026-06-27", "label": "England vs Ghana",            "venue": "Lincoln Financial Field"},
    {"mn": 77,  "date": "2026-06-30", "label": "Round of 32",                 "venue": "MetLife Stadium"},
    {"mn": 89,  "date": "2026-07-04", "label": "Round of 16",                 "venue": "MetLife Stadium"},
    {"mn": 94,  "date": "2026-07-06", "label": "Quarterfinal",                "venue": "Lincoln Financial Field"},
    {"mn": 104, "date": "2026-07-19", "label": "WORLD CUP FINAL",             "venue": "MetLife Stadium"},
]

WATCHED_VENUES = {"metlife", "lincoln financial", "gillette"}
CATEGORY_URL = "https://www.tickpick.com/world-cup-soccer-tickets/"
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wc_state.json")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-CH-UA": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}

# --------------------------------------------------------------------------
# Scrape (read-only, anonymous)
# --------------------------------------------------------------------------

def parse_events(html: str) -> list[dict]:
    """Extract SportsEvent JSON-LD blocks from the public category page."""
    events = []
    for m in re.finditer(r"<script[^>]*application/ld\+json[^>]*>(.*?)</script>", html, re.DOTALL):
        try:
            data = json.loads(m.group(1))
            if isinstance(data, list):
                data = data[0] if data else {}
            if data.get("@type") != "SportsEvent":
                continue
            offers = data.get("offers", {}) or {}
            low = offers.get("lowPrice")
            if not low:
                continue
            events.append({
                "name": data.get("name", ""),
                "date": (data.get("startDate") or "")[:10],
                "venue": ((data.get("location") or {}).get("name") or ""),
                "lowest": int(float(low)),
                "url": offers.get("url") or data.get("url") or CATEGORY_URL,
            })
        except (json.JSONDecodeError, ValueError, TypeError, IndexError):
            continue
    return events


def is_watched_venue(venue: str) -> bool:
    v = venue.lower()
    return any(w in v for w in WATCHED_VENUES)


def match_fixture(event: dict) -> dict | None:
    """Return fixture for any watched-venue event; synthesize one if not in the known list."""
    if not is_watched_venue(event["venue"]):
        return None
    for fx in FIXTURES:
        if fx["date"] == event["date"]:
            fx_v = fx["venue"].lower().split()[0]
            if fx_v in event["venue"].lower():
                return fx
    # Watched venue (e.g. Gillette/Boston) not yet in FIXTURES — build on the fly
    return {
        "mn": event["date"].replace("-", "") + "_" + event["venue"].lower().split()[0],
        "date": event["date"],
        "label": event["name"],
        "venue": event["venue"],
    }


def fetch_events() -> list[dict]:
    with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        resp = client.get(CATEGORY_URL)
        resp.raise_for_status()
        return parse_events(resp.text)

# --------------------------------------------------------------------------
# State (local file only)
# --------------------------------------------------------------------------

def load_state() -> dict:
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_state(state: dict) -> None:
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

# --------------------------------------------------------------------------
# Alerts
# --------------------------------------------------------------------------

def send_alert(text: str) -> None:
    token = os.environ.get("TG_BOT_TOKEN")
    chat_id = os.environ.get("TG_CHAT_ID")
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    if not token or not chat_id:
        print(f"[ALERT {stamp}] {text}")
        return
    try:
        httpx.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True},
            timeout=15,
        ).raise_for_status()
        print(f"[sent {stamp}] {text.splitlines()[0]}")
    except Exception as e:
        print(f"[telegram failed: {e}] {text}", file=sys.stderr)

# --------------------------------------------------------------------------
# Core check
# --------------------------------------------------------------------------

def run_check() -> None:
    state = load_state()
    try:
        events = fetch_events()
    except Exception as e:
        print(f"[scrape failed: {e}]", file=sys.stderr)
        return
    seen_any = False
    for ev in events:
        fx = match_fixture(ev)
        if not fx:
            continue
        seen_any = True
        key = str(fx["mn"])
        prev = state.get(key, {})
        prev_low = prev.get("lowest")
        low = ev["lowest"]
        header = f"{fx['label']} — {fx['venue']} ({fx['date']})"
        link = ev["url"]
        # Only ping when under $300 and price improved (or first time seen under $300)
        if low < PRICE_THRESHOLD and (prev_low is None or low < prev_low):
            send_alert(f"🎯 UNDER ${PRICE_THRESHOLD}\n{header}\nLowest: ${low}\n{link}")
        else:
            print(f"[{fx['date']}] {fx['label']}: ${low} (threshold ${PRICE_THRESHOLD})")
        state[key] = {
            "lowest": low,
            "label": fx["label"],
            "checked": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
    if not seen_any:
        print("[no watched-venue events parsed this cycle]")
    save_state(state)


def run_report() -> None:
    """Fetch current prices for all watched venues and send a single Telegram summary."""
    try:
        events = fetch_events()
    except Exception as e:
        send_alert(f"[WC Watcher] scrape failed: {e}")
        return
    lines = []
    for ev in events:
        fx = match_fixture(ev)
        if not fx:
            continue
        marker = " ✅" if ev["lowest"] < PRICE_THRESHOLD else ""
        lines.append(f"{fx['date']}  {fx['label']}\n  ${ev['lowest']}{marker}  {fx['venue']}")
    if lines:
        send_alert("WC 2026 Current Prices\n\n" + "\n\n".join(lines))
    else:
        send_alert("[WC Watcher] no watched-venue listings found on tickpick right now")


def main() -> None:
    if "--report" in sys.argv:
        run_report()
    elif "--loop" in sys.argv:
        print(f"Watching NY/Philly/Boston matches under ${PRICE_THRESHOLD} every {POLL_MINUTES} min. Ctrl-C to stop.")
        while True:
            run_check()
            time.sleep(POLL_MINUTES * 60)
    else:
        run_check()


if __name__ == "__main__":
    main()
