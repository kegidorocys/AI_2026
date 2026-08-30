import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Brush, ReferenceLine } from 'recharts';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasAlert, setHasAlert] = useState(false);

  useEffect(() => {
    const BACKEND_API = 'https://ai-2026-i596.onrender.com/api/metrics?server_id=1';

    // 封裝數據獲取邏輯
    const fetchData = () => {
      fetch(BACKEND_API)
        .then((res) => {
          if (!res.ok) throw new Error("後端 API 連線失敗");
          return res.json();
        })
        .then((resData) => {
          if (!resData || !resData.history || resData.history.length === 0) {
            setLoading(false);
            return;
          }

          const chartRows = [];

          // 1. 解析歷史資料的時間
          resData.history.forEach((h) => {
            chartRows.push({
              time: new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              cpu: Number(parseFloat(h.avg_cpu).toFixed(1)), // 💡 轉回 Number 保持資料型態一致
              prediction: null
            });
          });
          
          // 2. 以歷史最後一筆時間為起點往後推算預測時間
          const lastTimeObj = new Date(resData.history[resData.history.length - 1].time);
          const lastHistoryRow = chartRows[chartRows.length - 1];
          
          let alertTriggered = false; // 💡 1. 宣告警報觸發變數

          resData.predictions.forEach((p, index) => {
            const nextTime = new Date(lastTimeObj.getTime() + (index + 1) * 60 * 60 * 1000);
            const pValue = Number(parseFloat(p).toFixed(1)); // 💡 轉回 Number

            // 💡 2. 檢查預測值是否超過警戒線 (85%)
            if (pValue > 85) {
              alertTriggered = true;
            }
          
            chartRows.push({
              time: nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " (AI預測)",
              cpu: index === 0 ? lastHistoryRow.cpu : null, // 銜接點：第一筆預測點帶入歷史最後一筆值
              prediction: index === 0 ? lastHistoryRow.cpu : pValue
            });
          });

          setHasAlert(alertTriggered); // 💡 3. 更新 Alert 狀態
          setData(chartRows);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    };

    fetchData();
    const timer = setInterval(fetchData, 5000); // 每 5 秒自動跟伺服器同步數據

    return () => clearInterval(timer); // 清理定時器，防止內存洩漏
  }, []);

  if (loading) {
    return <div style={{ padding: 30, fontFamily: 'sans-serif', color: '#64748b' }}>⏳ 正在向雲端撈取經 SQL 複合索引加速之大數據與 ONNX 推理結果...</div>;
  }

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 1200, margin: '0 auto', color: '#1e293b' }}>
      <h2 style={{ marginBottom: 10 }}>🤖 2026 年智慧型伺服器負載預測儀表板</h2>
      <p style={{ color: '#64748b', marginBottom: 30 }}>技術棧：React + Recharts + FastAPI + Neon PostgreSQL Indexing + ONNX Runtime</p>
      
      {/* UI/UX 亮點 1: 主動異常警示橫幅 */}
      {hasAlert && (
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', padding: '16px 20px', borderRadius: 8, marginBottom: 20, fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          ⚠️ 系統主動預警：AI 預測未來 3 小時內有 CPU 負載超標風險（突破 85%），請管理員儘速檢查基礎設施擴容配置！
        </div>
      )}

      {/* 圖表容器 */}
      <div style={{ width: '100%', height: 450, backgroundColor: '#ffffff', padding: '24px 24px 10px 24px', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
            <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: 8, border: 'none' }} />
            
            {/* 靜態安全臨界參考線 */}
            <ReferenceLine y={85} label={{ value: '85% 警戒線', fill: '#dc2626', position: 'top', fontSize: 11 }} stroke="#dc2626" strokeDasharray="3 3" />
            
            {/* 歷史數據（藍色實線） */}
            <Line type="monotone" dataKey="cpu" name="歷史平均負載 (%)" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 1 }} activeDot={{ r: 6 }} connectNulls />
            
            {/* AI 預測數據（橘色虛線） */}
            <Line type="monotone" dataKey="prediction" name="AI 未來預測 (%)" stroke="#ea580c" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 5, fill: '#ea580c' }} connectNulls />
            
            {/* 拖曳式時間軸滑塊 (Brush) */}
            <Brush dataKey="time" height={30} stroke="#cbd5e1" fillColor="#f8fafc" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default App;
