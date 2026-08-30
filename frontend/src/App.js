import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Brush, ReferenceLine } from 'recharts';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasAlert, setHasAlert] = useState(false);

  // 💡 【2026 全棧即時更新優化版】
  useEffect(() => {
    const fetchData = () => {
      fetch('https://onrender.com')
        .then(res => res.json())
        .then(resData => { /* 格式化並 setData */
          // [安全性防禦] 確保後端有歷史數據，防止空陣列導致 lastHistoryRow 報錯 Crash
          if (!resData || !resData.history || resData.history.length === 0) {
            setLoading(false);
            return;
          }

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
          
          let alertTriggered = false; // 💡 修正：用局部變數收集警報，避免在迴圈中頻繁 setHasAlert 導致無窮死循環

          resData.predictions.forEach((p, index) => {
            const nextTime = new Date(lastTimeObj.getTime() + (index + 1) * 60 * 60 * 1000);
            
            chartRows.push({
              time: nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " (AI預測)",
              cpu: index === 0 ? lastHistoryRow.cpu : null, // 銜接點：第一筆預測線與歷史最後一筆數值相等
              // 💡 修正設計優化：預測線的第一筆也要等於歷史最後一筆，這樣 Recharts 才能將兩條線真正連起來
              prediction: index === 0 ? lastHistoryRow.cpu : parseFloat(p).toFixed(1)
            });

            // 💡 【UI/UX 亮點：主動異常警示】如果 AI 預測未來任何一小時的 CPU 負載超標 (> 85%)，觸發全局紅色警報
            if (p > 85) alertTriggered = true;
          });

          // 💡 修正：在循環結束後一次性更新狀態，完美避開 React 無限渲染錯誤
          setHasAlert(alertTriggered);
          setData(chartRows);
          setLoading(false);    
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    };

    fetchData(); // 網頁點開立刻執行第一次

    // 核心亮點：每隔 5 秒鐘，自動去後端撈取經由排程寫入的最新數據
    const interval = setInterval(fetchData, 5000);

    // 💡 補全：清除定時器，防止組件銷毀時內存洩漏
    return () => clearInterval(interval); 
  }, []); // 💡 補全：空依賴陣列確保定時器只初始化一次

  // --- 以下為您補全原網頁應有的完整 UI 渲染與 Recharts 繪圖設計 ---
  if (loading) return <div>載入中...</div>;

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      {/* 全局紅色警報 UI */}
      {hasAlert && (
        <div style={{ color: '#fff', backgroundColor: '#ff4d4f', padding: '12px 24px', marginBottom: '20px', borderRadius: '4px', fontWeight: 'bold' }}>
          ⚠️ 系統警報：AI 預測未來 3 小時內 CPU 負載將超過 85%！
        </div>
      )}

      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            
            {/* 歷史藍色實線 (對應您的 cpu 欄位) */}
            <Line type="monotone" dataKey="cpu" stroke="#1890ff" strokeWidth={2} dot={false} connectNulls />
            
            {/* 預測橘色虛線 (對應您的 prediction 欄位) */}
            <Line type="monotone" dataKey="prediction" stroke="#fa8c16" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
            
            {/* 85% 警示參考線 */}
            <ReferenceLine y={85} stroke="#ff4d4f" strokeDasharray="3 3" label={{ value: '85% 警戒', fill: '#ff4d4f', position: 'top' }} />
            <Brush dataKey="time" height={30} stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default App;
