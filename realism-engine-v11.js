// realism-engine-v11.js - updated to call header typing and stagger posts (dedupe + backoff)
// Testimonial pool expanded heavily for Abrox

(function(){
  // utils
  function random(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function maybe(p){ return Math.random() < p; }
  function rand(min, max){ if(max===undefined){ max = min; min = 0; } return Math.floor(Math.random()*(max-min+1))+min; }
  function djb2HashLocal(str){ let h=5381; for(let i=0;i<str.length;i++) h = ((h<<5)+h)+str.charCodeAt(i); return (h>>>0).toString(36); }
  const djb2 = (typeof djb2Hash === 'function') ? djb2Hash : djb2HashLocal;

  // templates and pools (uses identity for variety)
  const ASSETS = ["BTC/USD","ETH/USD","EUR/USD","GBP/USD","AUD/USD","USD/JPY"];
  const RESULT_WORDS = ["green","red","profit","loss","recovered","scalped","small win","big win","partial win","missed entry","stopped loss"];

  // ==== Abrox testimonial pool (expanded) ====
  const TESTIMONIALS = [
    "Made $450 in 2 hours using Abrox — unbelievable!",
    "Closed 3 trades, all green today ✅",
    "Recovered a losing trade thanks to Abrox signals",
    "7 days straight of consistent profit 💹",
    "Abrox saved me from a $200 loss",
    "50% ROI in a single trading session 🚀",
    "Signal timing was perfect today, took profit!",
    "Never had such accurate entries before",
    "My manual losses turned into profits using Abrox",
    "Day trading BTC with this bot has been a game-changer",
    "Small scalps stacking up — +3.5% overall today",
    "Hedged correctly and recovered yesterday's dip",
    "Partial exit at resistance — solid win",
    "Took a 2% scalp on ETH using Abrox alert",
    "Recovered 60% of my earlier loss in one trade",
    "Set stop loss automatically — saved my position",
    "Abrox saved me from FOMO re-entry, disciplined exits",
    "Consistent signals, loving the daily profit streak",
    "Swung BTC and closed half at ATH — thanks Abrox",
    "Quick scalp on M5 — banked profit, no stress",
    "Entered late but still ended green — nice entries",
    "Signals gave me confidence to hold during pump",
    "My crypto portfolio up 12% this week thanks to Abrox",
    "Took partial profit and locked gains. Solid system.",
    "Signal accuracy is way higher than I expected",
    "Recovered from a bad call — bot suggested re-entry",
    "Abrox alerts: saved my account from a large drawdown",
    "Small wins every day — compounding nicely",
    "Locked 20% gains over several days using signals",
    "Demo to live: converted after consistent green days",
    "Down 2% then recovered 6% — Abrox helped pivot",
    "Alerts are on time and easy to follow — great UX",
    "I doubled my daily target this week — wow",
    "Partial wins + trailing stop = fewer headaches",
    "Signal reminded me to take profit — grateful",
    "Recovered a red trade by re-entering correctly",
    "Stopped out but re-entered and finished positive",
    "Abrox suggested hedge and avoided a loss",
    "Small A/B tests show Abrox outperforms my manual entries",
    "Set-and-forget strategy with occasional manual check",
    "The community signals are often spot-on",
    "Saved from liquidation — thanks to quick alert",
    "Consistent microprofits, compounding over time",
    "Found great swing entries — held for 3 days",
    "Entry + takeprofit levels are really helpful",
    "I use Abrox for scalps and swings — both work",
    "From demo to funded account — thanks to consistent signals",
    "Daily signal digest is my morning routine now",
    "Recovered morning loss in the afternoon session",
    "Took a 5% swing trade and booked profit",
    "Abrox helped me remove emotion from trading",
    "Signals are clear: entry, stop, targets — simple",
    "Automated entries saved me time and improved returns",
    "Signals worked in volatile market — resilient",
    "Abrox turned a loss into a break-even within hours",
    "Watching equity grow steadily — feels reliable",
    "Great for both beginners and experienced traders",
    "Highly recommend the strategy filters — reduced noise",
    "Best risk/reward trades I've had in months",
    "Compound gains are looking healthy after 30 days"
  ];

  // pool and dedupe
  const POOL = [];
  const POOL_MIN = 200;
  const POOL_MAX = 1400;
  const RECENT_HASHES = new Set();
  const RECENT_QUEUE = [];

  function recordRecent(h){
    if(RECENT_HASHES.has(h)) return false;
    RECENT_HASHES.add(h);
    RECENT_QUEUE.push(h);
    if(RECENT_QUEUE.length > 5000){ const r = RECENT_QUEUE.shift(); RECENT_HASHES.delete(r); }
    return true;
  }

  function ensurePool(n){
    while(POOL.length < Math.min(n, POOL_MAX)){
      POOL.push(generateOne());
    }
  }

  function generateOne(){
    const persona = window.identity ? window.identity.getRandomPersona() : { name:"User", avatar:"assets/default-avatar.jpg" };
    const template = random([
      ()=> `Just scalped ${random(ASSETS)} — ${random(RESULT_WORDS)} ${maybe(0.4) ? '🔥' : ''}`,
      ()=> `${random(TESTIMONIALS)} ${maybe(0.5)?'💰':''}`,
      ()=> `Anyone trading ${random(ASSETS)}? Signal looks ${random(RESULT_WORDS)}`,
      ()=> `Missed entry but recovered — ${random(RESULT_WORDS)}`,
      ()=> `Holding ${random(ASSETS)} through volatility — trust the plan.`,
      ()=> `Quick scalp ${random(ASSETS)} on M5, ${random(RESULT_WORDS)}.`,
      ()=> `Update: ${random(TESTIMONIALS)}`,
      ()=> `Followed a signal: ${random(TESTIMONIALS)}`
    ]);
    let text = template();
    if(maybe(0.5)) text += " " + random((window.identity && window.identity.EMOJIS) ? window.identity.EMOJIS : ["🔥","💯"]);
    let key = text.slice(0,400);
    let attempts = 0;
    while(RECENT_HASHES.has(djb2(persona.name + '|' + key)) && attempts < 8){
      key += " " + rand(1000);
      attempts++;
    }
    return { persona, text: key, timestamp: new Date() };
  }

  // post flow: show header typing, then append
  function postItem(item, idx = 0){
    const typingMs = rand(900, 2200);
    try {
      if(window.TGRenderer && typeof window.TGRenderer.showHeaderTyping === 'function'){
        window.TGRenderer.showHeaderTyping([item.persona.name], typingMs);
      } else if(window.TGRenderer && typeof window.TGRenderer.showTyping === 'function'){
        window.TGRenderer.showTyping(item.persona, typingMs);
      }
    } catch(e){}
    setTimeout(()=>{
      const raw = `${item.persona.name}||${item.text}||${item.timestamp.getTime()}`;
      const h = djb2(raw);
      if(!recordRecent(h)){
        // duplicate recently, ignore
        return;
      }
      if(window.TGRenderer && typeof window.TGRenderer.appendMessage === 'function'){
        // occasionally reply to existing message
        const existing = Array.from(document.querySelectorAll('.tg-bubble[data-id]'));
        let replyToId = null, replyToText = null;
        if(existing.length > 4 && Math.random() < 0.18){
          const t = existing[Math.floor(Math.random()*existing.length)];
          replyToId = t.dataset.id;
          replyToText = (t.querySelector('.tg-bubble-text')||{textContent:''}).textContent || '';
        }
        window.TGRenderer.appendMessage(item.persona, item.text, { timestamp: item.timestamp, type: 'incoming', replyToId, replyToText });
      } else {
        // schedule later if renderer missing
        setTimeout(()=>postItem(item, idx), 400 + rand(1200));
      }
    }, typingMs + (idx*70) );
  }

  // continuous chatter
  let runningTimer = null;
  function scheduleNext(baseInterval=6000){
    if(runningTimer) clearTimeout(runningTimer);
    const interval = baseInterval + rand(9000);
    runningTimer = setTimeout(()=>{
      ensurePool(POOL_MIN);
      const item = POOL.shift();
      if(item) postItem(item, 0);
      if(document.hidden){
        scheduleNext(Math.max(20000, baseInterval*3));
      } else {
        scheduleNext(baseInterval);
      }
    }, interval);
  }

  // public API
  window.realism = {
    ensurePool,
    scheduleNext,
    postNow: (n=1)=>{ ensurePool(n); for(let i=0;i<n;i++){ const it = POOL.shift(); if(it) postItem(it, i); } },
    LONG_POOL: POOL
  };

  // start automatically (safe start)
  function tryStart(){
    ensurePool(POOL_MIN);
    // seed small burst
    for(let i=0;i<6;i++){
      const it = POOL.shift();
      if(it) postItem(it, i);
    }
    scheduleNext(7000);
  }
  if(document.readyState==="complete" || document.readyState==="interactive") setTimeout(tryStart, 80);
  else document.addEventListener('DOMContentLoaded', ()=>setTimeout(tryStart, 80));
})();
