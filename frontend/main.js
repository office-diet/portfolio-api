const ws = new WebSocket("ws://localhost:3000");

const messages = document.getElementById("messages");
const online = document.getElementById("online");
const editor = document.getElementById("editor");
const sendBtn = document.getElementById("sendBtn");

let userName = "GuestUser"; 
const usuchanName = "臼ちゃん";
const sayakaName = "さやか";

ws.onopen = () => {
  const info = getVisitorInfo();
  const joinInfo = {
                      type: "join", 
                      userName: userName,
                      browser: info.browser,
                      os: info.os,
                      device: info.device,
                      lang: info.lang,
                      timezone: info.timezone
                    };
  ws.send(JSON.stringify(joinInfo));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  // オンライン人数
  if (msg.type === "online") {
    online.textContent = `オンライン：${msg.onlineCount}人（訪問者数：${msg.visitorCount}人）`;
  }

  // チャットメッセージ
  if (msg.type === "chat") {

    let html = "";
    if (msg.visitorId === localStorage.getItem("visitorId")) {
      html = `<div class="me name" visitorid="${msg.visitorId}">${msg.userName}（あなた）：${utc2jst(msg.createdAt)}</div>` +
              `<div class="me message-text">${msg.message.replaceAll("\n\n", "<br>").replaceAll("\n", "<br>")}</div>`;
    } else if (msg.userName === usuchanName) {
      html = `<div class="usuchan name" visitorid="${msg.visitorId}">${msg.userName}：${utc2jst(msg.createdAt)}</div>` +
              `<div class="usuchan message-text">${msg.message.replaceAll("\n\n", "<br>").replaceAll("\n", "<br>")}</div>`;
    } else if (msg.userName === sayakaName) {
      html = `<div class="sayaka name" visitorid="${msg.visitorId}">${msg.userName}：${utc2jst(msg.createdAt)}</div>` +
              `<div class="sayaka message-text">${msg.message.replaceAll("\n\n", "<br>").replaceAll("\n", "<br>")}</div>`;
    } else {
      html = `<div class="other name" visitorid="${msg.visitorId}">${msg.userName}：${utc2jst(msg.createdAt)}</div>` +
              `<div class="other message-text">${msg.message.replaceAll("\n\n", "<br>").replaceAll("\n", "<br>")}</div>`;
    }

    const div = document.createElement("div");
    div.className = "msg";
    div.innerHTML = html;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  // 訪問の度にIDが採番される
  // DBから直接データを取得するため「visitorId ⇒ visitor_id」など一部変化あり！
  if (msg.type === "visitorId") {
    const visitorId = msg.visitorId;
    localStorage.setItem("visitorId", visitorId);
    userName = msg.visitorName;
    
    msg.chatLogs.forEach(row => {

      let html = "";
      if (row.name === usuchanName) {
        html = `<div class="usuchan name" visitorid="${row.visitor_id}">${row.name}：${utc2jst(row.created_at)}</div>` +
                `<div class="usuchan message-text">${row.message.replaceAll("\n\n", "<br>").replaceAll("\n", "<br>")}</div>`;
      } else if (row.name === sayakaName) {
        html = `<div class="sayaka name" visitorid="${row.visitor_id}">${row.name}：${utc2jst(row.created_at)}</div>` +
                `<div class="sayaka message-text">${row.message.replaceAll("\n\n", "<br>").replaceAll("\n", "<br>")}</div>`;
      } else {
        html = `<div class="other name" visitorid="${row.visitor_id}">${row.name}：${utc2jst(row.created_at)}</div>` +
                `<div class="other message-text">${row.message.replaceAll("\n\n", "<br>").replaceAll("\n", "<br>")}</div>`;
      }

      const div = document.createElement("div");
      div.className = "msg";
      div.innerHTML = html;
      messages.appendChild(div);
    });
    messages.scrollTop = messages.scrollHeight;

  }

};

sendBtn.onclick = () => {
  if (editor.innerText.trim() !== "") {
    ws.send(JSON.stringify({
      type: "chat",
      visitorId: localStorage.getItem("visitorId"),
      userName: userName,
      message: editor.innerText.trim()
    }));
  } 
  editor.innerText = "";
};

editor.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (!e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  }
});


function utc2jst(utc) {
  return new Date(utc).toLocaleString("ja-JP", {timeZone: "Asia/Tokyo"});
}

function getVisitorInfo() {
  const uaData = navigator.userAgentData;
  const ua = navigator.userAgent;
  const platform = (uaData && uaData.platform) || navigator.platform;

  // browser
  let browser = "Unknown";
  if (uaData && uaData.brands && uaData.brands.length > 0) {
    browser = uaData.brands[0].brand; // 例: "Google Chrome"
  } else if (/Chrome/i.test(ua)) {
    browser = "Chrome";
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = "Safari";
  } else if (/Edg/i.test(ua)) {
    browser = "Edge";
  }

  // os
  let os = "Unknown";
  if (/Windows/i.test(platform)) os = "Windows";
  else if (/Mac/i.test(platform)) os = "macOS";
  else if (/iPhone|iPad|iPod/i.test(platform)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Linux/i.test(platform)) os = "Linux";

  // device
  const device = /Mobi|Android/i.test(ua) ? "mobile" : "desktop";

  // lang
  const lang = navigator.language || "ja-JP";

  // timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    // user_name は別途入力フォームなどから取得して埋める
    browser,
    os,
    device,
    lang,
    timezone
  };
}