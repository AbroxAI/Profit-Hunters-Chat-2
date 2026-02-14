// app.js - updated pin banner, broadcast rendering, send ticket API
document.addEventListener("DOMContentLoaded", () => {
  const pinBanner = document.getElementById("tg-pin-banner");
  const container = document.getElementById("tg-comments-container");
  const input = document.getElementById("tg-comment-input");
  const contactAdminLink = window.CONTACT_ADMIN_LINK || "https://t.me/your_admin";

  // ensure conversation memory and tickets exist
  window.identity = window.identity || {};
  window.identity.ConversationMemory = window.identity.ConversationMemory || {};
  window.identity.ConversationMemory.tickets = window.identity.ConversationMemory.tickets || [];

  function getAdminPersona(){
    return (window.identity && window.identity.Admin) ? window.identity.Admin : { name:"Admin", avatar:"assets/admin.jpg", isAdmin:true };
  }

  // helper: add admin broadcast (image+caption+CTA)
  function postAdminBroadcast(){
    const admin = getAdminPersona();
    const caption = `📌 Group Rules

- New members are read-only until verified
- Admins do NOT DM directly
- No screenshots in chat
- Ignore unsolicited messages

✅ To verify or contact admin, use the “Contact Admin” button below.`;
    const image = "assets/broadcast.jpg";
    const timestamp = new Date();
    const id = window.TGRenderer.appendMessage(admin, caption.split("\n")[0], { timestamp, type:"incoming", image, caption });
    // attach glass CTA to the created bubble after a short delay to ensure bubble exists
    setTimeout(()=>{
      const bubbleEl = container.querySelector(`[data-id="${id}"]`);
      if(bubbleEl){
        const content = bubbleEl.querySelector('.tg-bubble-content');
        const glass = document.createElement('button');
        glass.className = 'tg-glass-cta';
        glass.textContent = 'Contact Admin';
        glass.addEventListener('click', ()=> window.open(contactAdminLink,'_blank'));
        content.appendChild(glass);
      }
    }, 120);
    return { id, caption, image };
  }

  // show pin banner with CTA (animated) - accepts pinnedMessageId to scroll to
  function showPinBanner(image, caption, pinnedMessageId=null){
    if(!pinBanner) return;
    pinBanner.innerHTML = "";
    const img = document.createElement("img");
    img.src = image || 'assets/broadcast.jpg';
    img.alt = "Pinned";
    const txt = document.createElement("div");
    txt.className = "pin-text";
    txt.textContent = (caption||"Pinned message").split("\n")[0] || "Pinned message";
    const btn = document.createElement("button");
    btn.className = "contact-admin-btn";
    btn.dataset.href = contactAdminLink;
    btn.innerHTML = `<i data-lucide="pin"></i><span style="margin-left:6px">Contact Admin</span>`;
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      if(typeof window.sendAdminTicket === 'function'){
        window.sendAdminTicket("Guest","Contact requested from pin banner", pinnedMessageId);
      } else {
        window.open(contactAdminLink, "_blank");
      }
    });

    pinBanner.appendChild(img);
    pinBanner.appendChild(txt);
    pinBanner.appendChild(btn);

    // animate in
    pinBanner.classList.remove('hide','hidden');
    void pinBanner.offsetWidth;
    pinBanner.classList.add('show');
    if(window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();

    // click scrolls to pinned message
    pinBanner.onclick = (e) => {
      e.stopPropagation();
      if(pinnedMessageId){
        const target = container.querySelector(`[data-id="${pinnedMessageId}"]`);
        if(target){
          target.scrollIntoView({behavior:'smooth', block:'center'});
          target.style.outline = '3px solid rgba(255,215,0,0.85)';
          setTimeout(()=> target.style.outline = '', 2800);
          return;
        }
      }
      // default scroll to bottom
      container.scrollTo({top: container.scrollHeight, behavior: 'smooth'});
    };

    // auto-hide after 18s if user didn't interact
    setTimeout(()=>{
      if(pinBanner.classList.contains('show')){
        pinBanner.classList.remove('show'); pinBanner.classList.add('hide');
        setTimeout(()=>{ pinBanner.classList.add('hidden'); }, 340);
      }
    }, 18000);
  }

  function postPinNotice(){
    const systemPersona = { name: "System", avatar: "assets/admin.jpg" };
    window.TGRenderer.appendMessage(systemPersona, "Admin pinned a message", { timestamp: new Date(), type:"incoming" });
  }

  // helper ticket API
  window.sendAdminTicket = function(authorName, question, messageId=null){
    const ticket = { id: "ticket_" + Date.now() + "_" + Math.floor(Math.random()*9999), author: authorName, question, messageId, createdAt: Date.now(), status: "open" };
    window.identity.ConversationMemory.tickets.push(ticket);
    const admin = getAdminPersona();
    window.TGRenderer.appendMessage(admin, `New ticket from ${authorName}: ${question.split("\n")[0].slice(0,120)}`, { timestamp: new Date(), type: "incoming" });
    return ticket;
  };

  // small admin responder simulation
  function startAdminTicketResponder(){
    setInterval(()=>{
      const tickets = window.identity.ConversationMemory.tickets.filter(t => t.status === "open");
      if(tickets.length === 0) return;
      const t = tickets[Math.floor(Math.random()*tickets.length)];
      t.status = "in_progress";
      const admin = getAdminPersona();
      if(window.TGRenderer && typeof window.TGRenderer.showHeaderTyping === 'function'){
        window.TGRenderer.showHeaderTyping([admin.name], 1400 + Math.random()*1200);
      } else if(window.TGRenderer && typeof window.TGRenderer.showTyping === 'function'){
        window.TGRenderer.showTyping(admin, 1400 + Math.random()*1200);
      }
      setTimeout(()=>{
        const replyText = "Thanks — please contact via the pinned Contact Admin button for verification.";
        const replyToId = t.messageId || null;
        window.TGRenderer.appendMessage(admin, replyText, { timestamp: new Date(), type: "incoming", replyToId, replyToPreview: t.question });
        t.status = "closed";
      }, 1800 + Math.random()*1400);
    }, 25_000 + Math.random()*60_000);
  }

  // initial broadcast + pin
  const broadcast = postAdminBroadcast();
  setTimeout(()=>{
    postPinNotice();
    showPinBanner(broadcast.image, broadcast.caption, broadcast.id);
  }, 2200);

  // sendMessage handling
  document.addEventListener("sendMessage", (ev) => {
    const text = ev.detail.text;
    const persona = window.identity ? window.identity.getRandomPersona() : { name:"You", avatar:"assets/default-avatar.jpg" };
    // persona cooldown guard
    if(persona.lastPostAt && Date.now() - persona.lastPostAt < 30_000){
      // throttle persona - still allowed to post but keep simple
    } else {
      persona.lastPostAt = Date.now();
    }
    if(window.TGRenderer && typeof window.TGRenderer.showHeaderTyping === 'function'){
      window.TGRenderer.showHeaderTyping([persona.name], 1000 + Math.random()*1500);
    } else if(window.TGRenderer && typeof window.TGRenderer.showTyping === 'function'){
      window.TGRenderer.showTyping(persona, 1000 + Math.random()*1500);
    }
    setTimeout(()=> {
      const msgId = window.TGRenderer.appendMessage(persona, text, { timestamp: new Date(), type:"outgoing" });
      if(text.toLowerCase().includes("admin") || text.toLowerCase().includes("contact")){
        const admin = getAdminPersona();
        if(window.TGRenderer && typeof window.TGRenderer.showHeaderTyping === 'function'){
          window.TGRenderer.showHeaderTyping([admin.name], 1600 + Math.random()*1200);
        } else if(window.TGRenderer && typeof window.TGRenderer.showTyping === 'function'){
          window.TGRenderer.showTyping(admin, 1600 + Math.random()*1200);
        }
        setTimeout(()=> {
          window.TGRenderer.appendMessage(admin, "Thanks — please contact via the button on the pinned message. We will respond there.", { timestamp: new Date(), type:"incoming", replyToId: msgId, replyToPreview: text });
        }, 1800 + Math.random()*1200);
      }
    }, 1200 + Math.random()*400);
  });

  document.addEventListener("autoReply", (ev) => {
    const { parentText, persona, text } = ev.detail;
    if(window.TGRenderer && typeof window.TGRenderer.showHeaderTyping === 'function'){
      window.TGRenderer.showHeaderTyping([persona.name], 1000 + Math.random()*1200);
    } else if(window.TGRenderer && typeof window.TGRenderer.showTyping === 'function'){
      window.TGRenderer.showTyping(persona, 1000 + Math.random()*1200);
    }
    setTimeout(()=> {
      window.TGRenderer.appendMessage(persona, text, { timestamp: new Date(), type:"incoming", replyToText: parentText });
    }, 1200 + Math.random()*800);
  });

  // start admin responder
  startAdminTicketResponder();
});
