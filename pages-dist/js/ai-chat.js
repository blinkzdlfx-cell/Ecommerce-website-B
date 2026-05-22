// ai-chat.js
// Simple OpenAI ChatGPT integration for Beulah Foods
// Instructions: Put your OpenAI API key below and update the systemPrompt as needed.

const OPENAI_API_KEY = ""; // NOTE: Do not expose API keys in client-side code.

// System prompt: edit this to update the assistant's knowledge and behavior
const systemPrompt = `You are Beulah Foods’ virtual assistant. Only answer questions about Beulah Foods’ products, services, policies, and information found on the Beulah Foods website. If you don’t know the answer, politely ask the user to contact customer support. Never answer questions unrelated to Beulah Foods.`;

async function sendToOpenAI(messages) {
  if (!OPENAI_API_KEY) {
    throw new Error("Missing OpenAI API key");
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      max_tokens: 500,
      temperature: 0.2
    })
  });
  if (!response.ok) throw new Error("OpenAI API error");
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// UI logic for modal chat
function showChatModal() {
  let modal = document.getElementById('ai-chat-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ai-chat-modal';
    modal.innerHTML = `
      <div class="ai-modal-bg" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">
        <div class="ai-modal-content" style="background:white;border-radius:18px;max-width:400px;width:95vw;padding:0 0 16px 0;box-shadow:0 8px 32px rgba(0,0,0,0.18);position:relative;">
          <button id="ai-modal-close" style="position:absolute;top:10px;right:18px;background:none;border:none;font-size:1.8rem;cursor:pointer;">×</button>
          <div style="background:linear-gradient(120deg,#0f3d2e,#f4c430);padding:24px 0 12px 0;border-radius:18px 18px 0 0;text-align:center;color:white;">
            <b>Beulah Foods AI Assistant</b>
          </div>
          <div id="ai-chat-messages" style="max-height:320px;overflow-y:auto;padding:16px 18px 0 18px;font-size:1rem;"></div>
          <form id="ai-chat-form" style="display:flex;gap:8px;padding:12px 18px 0 18px;">
            <input id="ai-chat-input" type="text" placeholder="Ask me anything..." style="flex:1;padding:10px 12px;border-radius:8px;border:1px solid #ccc;" required />
            <button type="submit" style="background:#f4c430;color:#0f3d2e;border:none;border-radius:8px;padding:0 18px;font-weight:600;">Send</button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('ai-modal-close').onclick = () => modal.remove();
    document.getElementById('ai-chat-form').onsubmit = async function(e) {
      e.preventDefault();
      const input = document.getElementById('ai-chat-input');
      const messagesDiv = document.getElementById('ai-chat-messages');
      const userMsg = input.value.trim();
      if (!userMsg) return;
      messagesDiv.innerHTML += `<div style='margin-bottom:8px;text-align:right;'><span style='background:#f4c430;color:#0f3d2e;padding:7px 14px;border-radius:12px 12px 2px 12px;display:inline-block;'>${userMsg}</span></div>`;
      input.value = '';
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      try {
        const reply = await sendToOpenAI([{ role: "user", content: userMsg }]);
        messagesDiv.innerHTML += `<div style='margin-bottom:8px;text-align:left;'><span style='background:#f9faf8;color:#222;padding:7px 14px;border-radius:12px 12px 12px 2px;display:inline-block;'>${reply}</span></div>`;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      } catch (err) {
        messagesDiv.innerHTML += `<div style='color:#d32f2f;text-align:left;'>Sorry, there was an error contacting the AI.</div>`;
      }
    };
  }
}

window.startChatbot = showChatModal;
