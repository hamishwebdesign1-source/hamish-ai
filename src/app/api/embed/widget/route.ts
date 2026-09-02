import { NextResponse } from "next/server";

// Served as plain JS with a long cache lifetime (it's static, identical
// for every client — all per-client behaviour comes from the `data-client`
// attribute read at runtime, not from anything baked into this response).
// Vanilla DOM APIs only, no framework — this has to run correctly on any
// third-party site regardless of what that site itself is built with
// (WordPress, Squarespace, a hand-rolled static page, anything).
const WIDGET_JS = `
(function () {
  var script = document.currentScript;
  var clientId = script && script.getAttribute("data-client");
  if (!clientId) return;

  var origin = script.src ? new URL(script.src).origin : "";
  var endpoint = origin + "/api/embed/chat?client=" + encodeURIComponent(clientId);
  // Studio big-ticket #6 ("embedded chatbot has no lead-capture path").
  var leadEndpoint = origin + "/api/embed/lead?client=" + encodeURIComponent(clientId);

  var messages = [];
  var open = false;

  var bubble = document.createElement("button");
  bubble.setAttribute("aria-label", "Open chat");
  bubble.style.cssText =
    "position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;" +
    "background:#1f6f5c;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);" +
    "font-size:24px;z-index:2147483000;display:flex;align-items:center;justify-content:center;";
  bubble.textContent = "\\uD83D\\uDCAC";

  var panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;bottom:86px;right:20px;width:320px;max-width:calc(100vw - 40px);height:420px;" +
    "background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);display:none;" +
    "flex-direction:column;overflow:hidden;z-index:2147483000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;";

  // Studio improvement — the panel had no label at all, so a visitor
  // dropped straight into a bare log with no context for what this is
  // before typing anything. Same "AI Assistant" wording the marketing
  // site's own chat-widget.tsx header already uses.
  var header = document.createElement("div");
  header.style.cssText =
    "padding:10px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;font-weight:600;color:#141413;";
  header.textContent = "AI Assistant";

  var log = document.createElement("div");
  log.style.cssText = "flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;";

  // Same generic-across-every-vertical starter prompts as chat-widget.tsx's
  // own SUGGESTED_PROMPTS, chosen to make sense for any business type
  // this widget could be embedded on (restaurant, salon, trades,
  // anything) rather than assuming one — this script is identical for
  // every tenant's every client, with no per-business context baked in.
  var STARTER_PROMPTS = ["What are your opening hours?", "What services do you offer?", "How do I get in touch?"];
  var starters = document.createElement("div");
  starters.style.cssText = "padding:0 12px 12px;display:flex;flex-direction:column;gap:6px;";
  STARTER_PROMPTS.forEach(function (prompt) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = prompt;
    btn.style.cssText =
      "text-align:left;padding:7px 10px;background:#f0f0f0;color:#141413;border:none;border-radius:8px;" +
      "font-size:13px;cursor:pointer;";
    btn.addEventListener("click", function () {
      sendMessage(prompt);
    });
    starters.appendChild(btn);
  });

  var form = document.createElement("form");
  form.style.cssText = "display:flex;gap:6px;padding:10px;border-top:1px solid #e5e5e5;";

  var input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ask a question…";
  input.style.cssText = "flex:1;padding:8px 10px;border:1px solid #ccc;border-radius:6px;font-size:14px;";

  var sendBtn = document.createElement("button");
  sendBtn.type = "submit";
  sendBtn.textContent = "Send";
  sendBtn.style.cssText = "padding:8px 12px;background:#1f6f5c;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;";

  form.appendChild(input);
  form.appendChild(sendBtn);

  // Studio big-ticket #6 ("embedded chatbot has no lead-capture path") —
  // a visitor decides for themselves whether the bot's answered them
  // well enough, not a model guessing at it (same reasoning
  // answer-embed-chat.ts's own comment gives for staying FAQ-only) — so
  // this is a plain, always-available link, not something the AI
  // decides to surface.
  var leadLink = document.createElement("button");
  leadLink.type = "button";
  leadLink.textContent = "Can't find what you need? Leave your details →";
  leadLink.style.cssText =
    "padding:6px 12px;background:none;border:none;color:#1f6f5c;font-size:12px;text-align:left;cursor:pointer;text-decoration:underline;";

  var leadForm = document.createElement("form");
  leadForm.style.cssText = "display:none;flex-direction:column;gap:6px;padding:10px;border-top:1px solid #e5e5e5;";

  var leadEmail = document.createElement("input");
  leadEmail.type = "email";
  leadEmail.required = true;
  leadEmail.placeholder = "Your email";
  leadEmail.style.cssText = "padding:8px 10px;border:1px solid #ccc;border-radius:6px;font-size:14px;";

  var leadMessage = document.createElement("textarea");
  leadMessage.placeholder = "What can we help with? (optional)";
  leadMessage.rows = 2;
  leadMessage.style.cssText = "padding:8px 10px;border:1px solid #ccc;border-radius:6px;font-size:14px;resize:none;font-family:inherit;";

  var leadRow = document.createElement("div");
  leadRow.style.cssText = "display:flex;gap:6px;";
  var leadSubmit = document.createElement("button");
  leadSubmit.type = "submit";
  leadSubmit.textContent = "Send";
  leadSubmit.style.cssText = "flex:1;padding:8px 12px;background:#1f6f5c;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;";
  var leadCancel = document.createElement("button");
  leadCancel.type = "button";
  leadCancel.textContent = "Back to chat";
  leadCancel.style.cssText = "padding:8px 10px;background:#f0f0f0;color:#141413;border:none;border-radius:6px;cursor:pointer;font-size:13px;";
  leadRow.appendChild(leadSubmit);
  leadRow.appendChild(leadCancel);

  var leadStatus = document.createElement("div");
  leadStatus.style.cssText = "font-size:12px;color:#141413;";

  leadForm.appendChild(leadEmail);
  leadForm.appendChild(leadMessage);
  leadForm.appendChild(leadRow);
  leadForm.appendChild(leadStatus);

  function showLeadForm(show) {
    leadForm.style.display = show ? "flex" : "none";
    form.style.display = show ? "none" : "flex";
    leadLink.style.display = show ? "none" : "block";
    starters.style.display = show ? "none" : starters.style.display;
  }

  leadLink.addEventListener("click", function () {
    showLeadForm(true);
  });
  leadCancel.addEventListener("click", function () {
    showLeadForm(false);
  });

  leadForm.addEventListener("submit", function (e) {
    e.preventDefault();
    leadStatus.textContent = "Sending…";
    leadSubmit.disabled = true;
    fetch(leadEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: leadEmail.value, message: leadMessage.value }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          leadStatus.textContent = result.data.error || "Something went wrong — please try again.";
          leadSubmit.disabled = false;
          return;
        }
        leadForm.innerHTML = "";
        var thanks = document.createElement("div");
        thanks.style.cssText = "font-size:13px;color:#141413;";
        thanks.textContent = "Thanks — we'll be in touch soon.";
        leadForm.appendChild(thanks);
      })
      .catch(function () {
        leadStatus.textContent = "Couldn't send — check your connection and try again.";
        leadSubmit.disabled = false;
      });
  });

  panel.appendChild(header);
  panel.appendChild(log);
  panel.appendChild(starters);
  panel.appendChild(leadLink);
  panel.appendChild(leadForm);
  panel.appendChild(form);

  function addBubbleMsg(role, text) {
    var el = document.createElement("div");
    el.style.cssText =
      "max-width:85%;padding:8px 12px;border-radius:14px;font-size:14px;line-height:1.4;white-space:pre-line;" +
      (role === "user"
        ? "align-self:flex-end;background:#1f6f5c;color:#fff;border-bottom-right-radius:4px;"
        : "align-self:flex-start;background:#f0f0f0;color:#141413;border-bottom-left-radius:4px;");
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  addBubbleMsg("assistant", "Hi! Ask me anything.");

  function setLoading(loading) {
    input.disabled = loading;
    sendBtn.disabled = loading;
    sendBtn.textContent = loading ? "…" : "Send";
  }

  // Extracted so both the real form submit and a starter-prompt click
  // (which isn't a form submission at all) share one real send path,
  // rather than the starter buttons duplicating this fetch logic.
  function sendMessage(text) {
    if (!text) return;
    starters.style.display = "none";
    messages.push({ role: "user", content: text });
    addBubbleMsg("user", text);
    setLoading(true);

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          addBubbleMsg("assistant", result.data.error || "Something went wrong — please try again.");
          return;
        }
        messages.push({ role: "assistant", content: result.data.reply });
        addBubbleMsg("assistant", result.data.reply);
      })
      .catch(function () {
        addBubbleMsg("assistant", "Couldn't reach chat — check your connection and try again.");
      })
      .finally(function () {
        setLoading(false);
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    sendMessage(text);
  });

  bubble.addEventListener("click", function () {
    open = !open;
    panel.style.display = open ? "flex" : "none";
  });

  document.body.appendChild(bubble);
  document.body.appendChild(panel);
})();
`;

export async function GET() {
  return new NextResponse(WIDGET_JS, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
