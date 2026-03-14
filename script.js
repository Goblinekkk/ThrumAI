/**
 * Thrum AI - script.js
 * Zabezpečená verze pro GitHub Pages (využívá localStorage pro API klíč)
 */

// Načtení klíče z paměti prohlížeče
let ZENTRIX_AI_API = localStorage.getItem('groq_key') || "";

let currentModel = "llama-3.3-70b-versatile";
let currentLang = "cs";
let isFirstMessage = true;

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const chatContainer = document.querySelector('.chat-container');

// Sidebar Logic
const toggleMenu = (open) => {
    sidebar.classList.toggle('open', open);
    overlay.style.display = open ? 'block' : 'none';
};

if(document.getElementById('menuBtn')) document.getElementById('menuBtn').onclick = () => toggleMenu(true);
if(document.getElementById('closeBtn')) document.getElementById('closeBtn').onclick = () => toggleMenu(false);
overlay.onclick = () => toggleMenu(false);

// Jazyková logika
function switchLang(l) {
    currentLang = l;
    document.querySelectorAll('.lang-switch span').forEach(s => s.classList.remove('active'));
    document.getElementById('lang' + l.toUpperCase()).classList.add('active');
    
    const translations = {
        cs: { title: "Co dnes vytvoříme?", input: "Napiš zprávu...", hist: "Knihovna", new: "+ Nový chat", clear: "Smazat historii", thinking: "Thrum přemýšlí..." },
        en: { title: "What shall we create?", input: "Type a message...", hist: "Library", new: "+ New chat", clear: "Clear history", thinking: "Thrum is thinking..." }
    };

    const t = translations[l];
    document.getElementById('mainTitle').innerText = t.title;
    document.getElementById('userInput').placeholder = t.input;
    document.getElementById('histTitle').innerText = t.hist;
    document.getElementById('newChatBtn').innerText = t.new;
    document.getElementById('clearAllBtn').innerText = t.clear;
}

document.getElementById('langCS').onclick = () => switchLang('cs');
document.getElementById('langEN').onclick = () => switchLang('en');

// Chat Logic
function scrollToBottom() {
    setTimeout(() => {
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
    }, 100);
}

async function sendMessage() {
    const inputField = document.getElementById('userInput');
    const text = inputField.value.trim();
    
    // Kontrola klíče - pokud není, zeptáme se uživatele
    if (!ZENTRIX_AI_API || ZENTRIX_AI_API.length < 10) {
        const userKey = prompt(currentLang === 'cs' 
            ? "Vlož svůj Groq API klíč (zůstane bezpečně jen ve tvém mobilu):" 
            : "Enter your Groq API key (stored locally only):");
        
        if (userKey && userKey.startsWith("gsk_")) {
            ZENTRIX_AI_API = userKey;
            localStorage.setItem('groq_key', userKey);
        } else {
            alert(currentLang === 'cs' ? "Neplatný klíč!" : "Invalid key!");
            return;
        }
    }

    if (!text) return;

    if (isFirstMessage) {
        document.getElementById('welcomeScreen').style.display = 'none';
        updateHistory(text);
        isFirstMessage = false;
    }

    addBubble(text, 'user');
    inputField.value = "";
    inputField.style.height = 'auto';
    
    const aiBubble = addBubble(currentLang === 'cs' ? "Thrum přemýšlí..." : "Thrum is thinking...", 'ai');
    scrollToBottom();

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${ZENTRIX_AI_API}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                messages: [
                    {role: "system", content: currentLang === 'cs' ? "Jsi Thrum AI. Odpovídej česky, stručně a inteligentně." : "You are Thrum AI. Be concise and smart."},
                    {role: "user", content: text}
                ],
                model: currentModel
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error?.message || "API Error");
        }

        const data = await res.json();
        aiBubble.innerText = data.choices[0].message.content;
        scrollToBottom();
    } catch (e) { 
        aiBubble.innerText = currentLang === 'cs' ? "Chyba: " + e.message : "Error: " + e.message;
        // Pokud je klíč špatný, smažeme ho pro příště
        if(e.message.includes("API key")) {
            localStorage.removeItem('groq_key');
            ZENTRIX_AI_API = "";
        }
    }
}

function addBubble(t, type) {
    const win = document.getElementById('chatWindow');
    const div = document.createElement('div');
    div.className = `msg ${type}-msg`;
    div.innerText = t;
    win.appendChild(div);
    return div;
}

// Model Picker
document.querySelectorAll('.model-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.model-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentModel = btn.dataset.model;
    };
});

// Historie Logic
function updateHistory(text) {
    let history = JSON.parse(localStorage.getItem('thrum_hist') || '[]');
    const title = text.substring(0, 20) + (text.length > 20 ? "..." : "");
    if(!history.includes(title)) {
        history.unshift(title);
        localStorage.setItem('thrum_hist', JSON.stringify(history.slice(0, 12)));
        renderHistory();
    }
}

function renderHistory() {
    const list = document.getElementById('chatHistoryList');
    if(!list) return;
    const history = JSON.parse(localStorage.getItem('thrum_hist') || '[]');
    list.innerHTML = history.map(h => `<div class="hist-item" style="padding:15px 12px; border-bottom:1px solid #f4f4f5; font-size:0.85rem; color:#666; cursor:pointer;">${h}</div>`).join('');
}

document.getElementById('clearAllBtn').onclick = () => {
    if(confirm(currentLang === 'cs' ? "Opravdu smazat historii?" : "Clear all history?")) {
        localStorage.removeItem('thrum_hist');
        renderHistory();
    }
};

// Start & Keyboard
document.getElementById('sendBtn').onclick = sendMessage;
document.getElementById('newChatBtn').onclick = () => {
    // Tlačítko pro nový chat vymaže klíč i historii (volitelné)
    if(confirm(currentLang === 'cs' ? "Začít nový chat?" : "Start new chat?")) {
        location.reload();
    }
};

document.getElementById('userInput').oninput = function() { 
    this.style.height = 'auto'; 
    this.style.height = (this.scrollHeight) + 'px'; 
};

document.getElementById('userInput').onkeydown = (e) => { 
    if(e.key === "Enter" && !e.shiftKey) { 
        e.preventDefault(); 
        sendMessage(); 
    } 
};

renderHistory();
                    
