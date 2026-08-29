import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Brush, ReferenceLine } from 'recharts';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasAlert, setHasAlert] = useState(false);

  useEffect(() => {
    // 💡 【請更換為你 Day 3 部署在 Render.com 的真實後端網址】
    const BACKEND_API = 'https://ai-2026-i596.onrender.com/api/metrics?server_id=1';

    fetch(BACKEND_API)
      .then((res) => {
        if (!res.ok) throw new Error("後端 API 連線失敗");
        return res.json();
      })
      .then((resData) => {
        const chartRows = [];

        // 1. 解析並格式化 24 小時歷史數據 (供藍色實線使用)
        resData.history.forEach((h) => {
          chartRows.push({
            time: new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            cpu: parseFloat(h.avg_cpu).toFixed(1),
            prediction: null // 歷史時間點的預測值設為 null，防止折線重疊錯亂
          });
        });

        // 2. 建立「時間銜接點（Bridge）」：讓預測線與歷史線完美黏合
        const lastHistoryRow = chartRows[chartRows.length - 1];
        
        // 3. 解析並格式化未來 3 小時的 AI 自迴歸預測數據 (供橘色虛線使用)
        const lastTimeObj = new Date(resData.history[resData.history.length - 1].time);
        
        resData.predictions.forEach((p, index) => {
          const nextTime = new Date(lastTimeObj.getTime() + (index + 1) * 60 * 60 * 1000);
          
          chartRows.push({
            time: nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " (AI預測)",
            cpu: index === 0 ? lastHistoryRow.cpu : null, // 銜接點：第一筆預測線與歷史最後一筆數值相等
            prediction: p.toFixed(1)
          });

          // 💡 【UI/UX 亮點：主動異常警示】如果 AI 預測未來任何一小時的 CPU 負載超標 (> 85%)，觸發全局紅色警報
          if (p > 85) setHasAlert(true);
        });

        setData(chartRows);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
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
            
            {/* UI/UX 亮點 2: 歷史數據（藍色實線） */}
            <Line type="monotone" dataKey="cpu" name="歷史平均負載 (%)" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 1 }} activeDot={{ r: 6 }} connectNulls />
            
            {/* UI/UX 亮點 3: AI 預測數據（橘色虛線，直觀區分過去與未來） */}
            <Line type="monotone" dataKey="prediction" name="AI 未來預測 (%)" stroke="#ea580c" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 5, fill: '#ea580c' }} connectNulls />
            
            {/* UI/UX 亮點 4: 拖曳式時間軸滑塊 (Brush) */}
            {/* Recharts 內建對 Brush 的滑動做了高頻防抖優化，讓用戶可以流暢縮放百萬級歷史區間 */}
            <Brush dataKey="time" height={30} stroke="#cbd5e1" fillColor="#f8fafc" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default App;
