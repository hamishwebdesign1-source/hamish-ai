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

  var log = document.createElement("div");
  log.style.cssText = "flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;";

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
  panel.appendChild(log);
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

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
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
