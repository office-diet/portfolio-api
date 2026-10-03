// 日本時間の「yyyy/m/d h/nn/ss」を取得
export function getJstNow():string {
  const jst:string = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  return jst.toLocaleString();
}

// PostgreSQLのTIMESTAMPのUTCをJSTに変換
export function utc2jst(utc:Date):string {
  return new Date(utc.toISOString()).toLocaleString("ja-JP", {timeZone: "Asia/Tokyo"});
}
