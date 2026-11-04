#!/usr/bin/env python3
"""Scrape dad5attic eBay store listings via running Chrome CDP :9222."""
import json, re, sys, time, urllib.parse, urllib.request
import websocket

CDP = "http://127.0.0.1:9222"

EXTRACT_JS = r"""
(() => {
  const out = {};
  document.querySelectorAll('a[href*="/itm/"]').forEach(a => {
    const m = a.href.match(/\/itm\/(\d+)/);
    if (!m) return;
    const id = m[1];
    if (out[id]) return;
    // walk up to a card-ish container that has an image
    let card = a;
    for (let i = 0; i < 8 && card.parentElement; i++) {
      card = card.parentElement;
      if (card.querySelector('img[src*="ebayimg"]') && /\$\s?[\d,.]+/.test(card.innerText||"")) break;
    }
    const img = card.querySelector('img[src*="ebayimg"]');
    const txt = (card.innerText || "").replace(/\s+/g, " ").trim();
    const priceM = txt.match(/\$\s?[\d,]+(?:\.\d{2})?/);
    let title = (img && img.alt) || a.innerText || "";
    title = title.replace(/\s+/g, " ").trim();
    if (title && priceM) out[id] = {id, title, price: priceM[0], img: img.src, url: "https://www.ebay.com/itm/" + id, snippet: txt.slice(0, 300)};
  });
  return JSON.stringify(Object.values(out));
})()
"""

def new_tab(url):
    q = urllib.parse.quote(url, safe="")
    req = urllib.request.Request(f"{CDP}/json/new?{q}", method="PUT")
    return urllib.request.urlopen(req, timeout=15).read()

def main():
    pages = [1, 2, 3]
    all_items = {}
    for p in pages:
        url = f"https://www.ebay.com/sch/i.html?_ssn=dad5attic&_sop=10&_ipg=120&_pgn={p}"
        tab = json.loads(new_tab(url))
        ws_url, tab_id = tab["webSocketDebuggerUrl"], tab["id"]
        ws = websocket.create_connection(ws_url, timeout=30, suppress_origin=True)
        mid = 0
        def cmd(method, params=None):
            nonlocal mid
            mid += 1
            ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
            while True:
                msg = json.loads(ws.recv())
                if msg.get("id") == mid:
                    return msg
        count, stable = 0, 0
        items = []
        for attempt in range(20):
            time.sleep(2)
            r = cmd("Runtime.evaluate", {"expression": EXTRACT_JS, "returnByValue": True})
            raw = r.get("result", {}).get("result", {}).get("value") or "[]"
            items = json.loads(raw)
            if len(items) == count and len(items) > 0:
                stable += 1
                if stable >= 2:
                    break
            else:
                stable = 0
            count = len(items)
        print(f"page {p}: {len(items)} items", file=sys.stderr)
        for it in items:
            all_items.setdefault(it["id"], it)
        cmd("Page.enable")
        ws.send(json.dumps({"id": 999, "method": "Target.closeTarget", "params": {"targetId": tab_id}}))
        ws.close()
    with open("/srv/jarvis-data/apps/dad5attic/items_raw.json", "w") as f:
        json.dump(list(all_items.values()), f, indent=1)
    # clean -> items.json
    clean, seen = [], set()
    for it in all_items.values():
        if it["id"] == "123456" or it["id"] in seen: continue
        seen.add(it["id"])
        snip = it.get("snippet", "")
        title = re.sub(r"\s*Image \d+ of \d+\s*$", "", it["title"]).strip()
        cond = "Brand New" if re.search(r"\bBrand New\b", snip) else ("Pre-Owned" if "Pre-Owned" in snip else "")
        clean.append({"id": it["id"], "title": title, "price": it["price"], "cond": cond,
                      "freeShip": bool(re.search(r"Free (delivery|shipping)", snip)),
                      "img": it["img"].replace("s-l500", "s-l960").replace("s-l300", "s-l960"),
                      "url": it["url"]})
    with open("/srv/jarvis-data/apps/dad5attic/items.json", "w") as f:
        json.dump(clean, f, indent=1)
    print(f"TOTAL unique: {len(clean)}")

if __name__ == "__main__":
    main()
