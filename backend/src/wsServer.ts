import { WebSocketServer, WebSocket } from "ws";
import { Client } from "pg";
import { GoogleGenAI } from "@google/genai";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";
import { getJstNow, utc2jst } from "./utils/jst";
import { usuchanName, usuchanPersona, sayakaName, sayakaPersona } from "./config/aiPersona";
import type { JoinInfo, NewVisitorReturnData, 
              NewChat, NewChatReturn, OnlineCount, 
              GetId, GetIdCreatedAt, ChatLogFromSQL, 
              ChatLogForTS, OnlineUser } from "./types/types";

dotenv.config();

let onlineUsers: OnlineUser[] = [];

//----------------------------------------------------------- 
// AIのAPIの基本設定
//----------------------------------------------------------- 
const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
const groqAI = new Groq({apiKey: process.env.GROQ_API_KEY});
let geminiModelName:string = "gemini-3.5-flash-lite";
let groqModelName:string  = "openai/gpt-oss-120b";

let usuchanRate:number = 0.5;
let usuchanId:string = "";
let sayakaId:string = "";


let chatHistoryGemini = [];
let chatHistoryGroq =   [];
let visitorCount:number = 0;

// DB接続
const postgreSQL = new Client({
  connectionString: process.env.DB_URL
});
postgreSQL.connect();

export function startWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws: WebSocket) => {

    ws.on("message", async (data: string) => {

      // -----------------------------------
      // ---START AIの文章生成関数---
      // -----------------------------------
      async function generateBroadcastAiText() {

        if (Math.random() < usuchanRate) {
          usuchanRate = Math.max(0.01, usuchanRate * 0.9);
          const result = await genAI.models.generateContent({
            model: geminiModelName, 
            contents: chatHistoryGemini,
            config: {
                systemInstruction: usuchanPersona
            }
          });

          await sleepRandom();
          const chatTime:string = getJstNow();

          const prefix:string = `【from:${usuchanName}, datetime:${chatTime}】`;
          const messageText:string = result.text;
          chatHistoryGemini.push({role:"model", parts:[{text: messageText}]});
          chatHistoryGroq.push({role:"user", content: `${prefix}${messageText}`});
          
          const savedData = await postgreSQL.query<GetIdCreatedAt>(
                              "INSERT INTO chat_logs (visitor_id, name, message) " + 
                              "VALUES ($1, $2, $3) " +
                              "RETURNING id, created_at", 
                              [usuchanId, usuchanName, messageText] );

          const newChatReturn:NewChatReturn = {
                                                type: "chat",
                                                visitorId: usuchanId,
                                                visitorName: usuchanName,
                                                messageId: savedData.rows[0].id,
                                                message: messageText,
                                                createdAt: utc2jst(savedData.rows[0].created_at)
                                            }
          broadcast(newChatReturn);

        } else {

          usuchanRate = Math.min(1, usuchanRate * 1.1);
          // openai/gpt-oss-120b,llama-3.1-8b-instant
          const result = await groqAI.chat.completions.create({
            model: groqModelName,
            messages: chatHistoryGroq,
          });

          await sleepRandom();
          const chatTime:string = getJstNow();
          const resultText:string = result.choices[0]?.message?.content || "";
          const prefix:string = `【from:${sayakaName}, datetime:${chatTime}】`;
          chatHistoryGemini.push({role:"user", parts:[{text: `${prefix}${resultText}`}]});
          chatHistoryGroq.push({role:"assistant", content: resultText});
          
          const savedData = await postgreSQL.query<GetIdCreatedAt>(
                              "INSERT INTO chat_logs (visitor_id, name, message) " + 
                              "VALUES ($1, $2, $3) " +
                              "RETURNING id, created_at",
                              [sayakaId, sayakaName, resultText] );
          const newChatReturn:NewChatReturn = {
                                                type: "chat",
                                                visitorId: sayakaId,
                                                visitorName: sayakaName,
                                                messageId: savedData.rows[0].id,
                                                message: resultText,
                                                createdAt: utc2jst(savedData.rows[0].created_at)
                                              }
          broadcast(newChatReturn);
        }
      }
      // -----------------------------------
      // ---END AIの文章生成関数---
      // -----------------------------------


      // 一旦データを受け取る
      const msg = JSON.parse(data);
      
      // 1回だけAIのUUIDを取得
      if (usuchanId === "") {
        const usuchanData = await postgreSQL.query<GetId>("SELECT id FROM visitors WHERE name=$1", [usuchanName]);
        usuchanId = usuchanData.rows[0].id;
        const sayakaData = await postgreSQL.query<GetId>("SELECT id FROM visitors WHERE name=$1", [sayakaName]);
        sayakaId = sayakaData.rows[0].id;
      }
      
      // -----------------------------------------
      // 【1】ユーザー参加
      // -----------------------------------------
      if (msg.type === "join") {

        const JoinInfo:JoinInfo = msg;
        const result = await postgreSQL.query<GetId>("SELECT id FROM visitors");
        visitorCount = result.rows.length + 1;                // 過去の訪問者数+新規を取得
        const visitorName:string = `GuestUser-${visitorCount - 2}`;  // AIの人数を除外してGuestUserに採番
        const visitorNew = await postgreSQL.query<GetId>(
                                "INSERT INTO visitors (name, os, device, browser, lang, timezone) " +
                                "VALUES ($1, $2, $3, $4, $5, $6) " +
                                "RETURNING id",
                                [visitorName, JoinInfo.os, JoinInfo.device, JoinInfo.browser, JoinInfo.lang, JoinInfo.timezone]);
        const visitorId:string = visitorNew.rows[0].id;

        
        const chat_logs = await postgreSQL.query<ChatLogFromSQL>(
                                            "SELECT * " +
                                            "FROM ( " + 
                                              "SELECT id, visitor_id, name, message, created_at " +
                                              "FROM chat_logs " +
                                              "ORDER BY created_at DESC LIMIT 50 ) AS recent " +
                                            "ORDER BY created_at ASC");
        const chatLogs:ChatLogForTS[] = chat_logs.rows.map((row:ChatLogFromSQL) => ({
                                                        id: String(row.id),
                                                        visitorId: String(row.visitor_id),
                                                        visitorName: String(row.name),
                                                        message: String(row.message),
                                                        createdAt: utc2jst(row.created_at)
                                                      }));
        
        const newVisitorReturnData:NewVisitorReturnData = 
            {type: "visitorId", visitorId: visitorId, visitorName: visitorName, chatLogs: chatLogs};
        ws.send(JSON.stringify(newVisitorReturnData));

        const onlineUser:OnlineUser = { ws: ws, visitorId: visitorId, visitorName: visitorName }
        onlineUsers.push(onlineUser);
        
        const onlineCount:OnlineCount = { type: "online", visitorCount: visitorCount, onlineCount: onlineUsers.length + 2 }
        broadcast(onlineCount);
        
        // backendで管理する会話履歴をDB情報で初期化
        cleanupChatHistory(chatLogs);
        
        try {

        // チャット履歴＋新規入室メンバーへの声掛け依頼
          const chatTime:string = getJstNow();
          const newMemberMessage:string = `【非表示メッセージ, datetime:${chatTime}】秘密の依頼。誰かが新規入室したので、自然に会話を続けて雰囲気を盛り上げて下さ。`;
          chatHistoryGemini.push({role: "user", parts: [{text: newMemberMessage}]});
          chatHistoryGroq.push({  role: "user", content:       newMemberMessage  });
          await generateBroadcastAiText();
        } catch (err) {
          console.log(err)
          if (groqModelName === "openai/gpt-oss-120b") {
            groqModelName = "openai/gpt-oss-20b";
          } else {
            groqModelName = "openai/gpt-oss-120b";
          }
        }
      }

      // ② チャットメッセージ
      if (msg.type === "chat") {

        const newChat:NewChat = msg;
        const newMessage = await postgreSQL.query<GetIdCreatedAt>(
                            "INSERT INTO chat_logs (visitor_id, name, message) " + 
                            "VALUES ($1, $2, $3) " +
                            "RETURNING id, created_at", 
                            [newChat.visitorId, newChat.visitorName, newChat.message] );
        const newChatReturn:NewChatReturn = {
          type: "chat",
          visitorId: newChat.visitorId,
          visitorName: newChat.visitorName,
          messageId: newMessage.rows[0].id,
          message: newChat.message,
          createdAt: utc2jst(newMessage.rows[0].created_at)
        };

        broadcast(newChatReturn);

        // チャット履歴を追加
        const userMessage:string = newChat.message;
        const chatTime:string = getJstNow();
        const messageText = `【from:${newChat.visitorName}, datetime:${chatTime}】${userMessage}`;
        chatHistoryGemini.push({role:"user", parts:[{text: messageText}]});
        chatHistoryGroq.push({  role:"user",      content: messageText});
        chatHistoryGemini = chatHistoryGemini.slice(-20);
        chatHistoryGroq = chatHistoryGroq.slice(-20);
        if (chatHistoryGroq[0].role !== "system") {
          chatHistoryGroq.unshift({role:"system", content: sayakaPersona});
        }
        
        try {

          await generateBroadcastAiText();
            
        } catch (err) {
            console.error(err);
            if (groqModelName === "openai/gpt-oss-120b") {
              groqModelName = "openai/gpt-oss-20b";
            } else {
              groqModelName = "openai/gpt-oss-120b";
            }
        }
      }

    });

    ws.on("close", async () => {
      const index = onlineUsers.findIndex((c) => c.ws === ws);
      if (index !== -1) {
          const visitorId:string = onlineUsers[index].visitorId;
          await postgreSQL.query("UPDATE visitors SET exit_at = NOW() WHERE id = $1", [visitorId]);
          onlineUsers.splice(index, 1);
      }
      
      const onlineCount:OnlineCount = {
        type: "online",
        visitorCount: visitorCount,
        onlineCount: onlineUsers.length + 2
      };
      broadcast(onlineCount);
    });
    // クライアントから pong が返ってきたらフラグを true にする
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // pingを送信しAWSが切断しないようにする
    setInterval(async () => {     
      onlineUsers.forEach((user) => {
        user.ws.ping();
      });
    }, 60000);

  });

  // すべてのWebSocketに情報を送信
  function broadcast(obj: OnlineCount | NewChatReturn) {
    const json:string = JSON.stringify(obj);
    onlineUsers.forEach((user:OnlineUser) => {
      user.ws.send(json);
    });
  }

}


// AIの回答が早すぎるのでちょっと遅らせる
function sleepRandom():Promise<void> {
  const ms = Math.floor(Math.random() * 2000);
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 新規ユーザが入室したタイミングで会話配列を初期化
function cleanupChatHistory(chatLogs:ChatLogForTS[]):void {

  // 配列を初期化
  chatHistoryGemini = [];
  chatHistoryGroq = [];

  // チャット履歴が一切ない場合
  if (chatLogs.length === 0) {
    const firstTimeMessage:string = "匿名グループチャットが開設されました！だれでも参加しやすい雰囲気の短いメッセージを生成してください。";
    chatHistoryGemini.push({role: "user", parts: [{text: firstTimeMessage}]});
    chatHistoryGroq.push({role: "user",   content:       firstTimeMessage  });
  
  // DBより取得した直近のチャットで初期化
  } else {

    chatLogs.forEach((row:ChatLogForTS) => {

      // AIにはプレフィックスを付けない！
      const prefix:string = `【from:${row.visitorName}, datetime:${row.createdAt}】`;
      const messageText:string = row.message;
      if (row.visitorName === usuchanName) {
          chatHistoryGemini.push({role:"model", parts:[{text: messageText}]});
          chatHistoryGroq.push(  {role:"user",       content: `${prefix}${messageText}`});
      } else if (row.visitorName === sayakaName) {
          chatHistoryGemini.push({role:"user",  parts:[{text: `${prefix}${messageText}`}]});
          chatHistoryGroq.push(  {role:"assistant",  content: messageText});
      } else {
          chatHistoryGemini.push({role:"user",  parts:[{text: `${prefix}${messageText}`}]});
          chatHistoryGroq.push(  {role:"user",       content: `${prefix}${messageText}`});
      }

    });
  }

  // groqの会話の先頭に「個性」を格納
  chatHistoryGemini = chatHistoryGemini.slice(-20);
  chatHistoryGroq = chatHistoryGroq.slice(-20);
  chatHistoryGroq.unshift({role:"system", content: sayakaPersona});

}