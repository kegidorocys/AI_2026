import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Brush, ReferenceLine } from 'recharts';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasAlert, setHasAlert] = useState(false);

  useEffect(() => {
    const fetchData = () => {
      fetch('https://ai-2026-i596.onrender.com/api/metrics?server_id=1')
        .then(res => res.json())
        .then(resData => {
          // 安全檢查：確保後端有回傳歷史數據，防止空資料導致 Crash
          if (!resData || !resData.history || resData.history.length === 0) {
            setLoading(false);
            return;
          }

          const chartRows = [];

          // 1. 解析並格式化 24 小時歷史數據
          resData.history.forEach((h) => {
            chartRows.push({
              time: new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              cpu: parseFloat(parseFloat(h.avg_cpu).toFixed(1)), // 保持為數字類型
              prediction: null
            });
          });

          // 2. 建立「時間銜接點（Bridge）」安全參考
          const lastHistoryRow = chartRows[chartRows.length - 1];
          const lastTimeObj = new Date(resData.history[resData.history.length - 1].time);
          
          let alertTriggered = false; // 用局部變數記錄，避免在迴圈中頻繁 setHasAlert

          // 3. 解析並格式化未來預測數據
          if (resData.predictions && resData.predictions.length > 0) {
            resData.predictions.forEach((p, index) => {
              const nextTime = new Date(lastTimeObj.getTime() + (index + 1) * 60 * 60 * 1000);
              const pValue = parseFloat(p.toFixed(1)); // 保持為數字類型

              chartRows.push({
                time: nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " (AI預測)",
                // 銜接點：預測線的第一筆與歷史最後一筆相等；同時預測線(prediction)本身也要有值才能連起來
                cpu: index === 0 ? lastHistoryRow.cpu : null, 
                prediction: index === 0 ? lastHistoryRow.cpu : pValue 
              });

              if (pValue > 85) {
                alertTriggered = true;
              }
            });
          }

          // 僅在狀態真正改變時才更新 Alert，防止死循環與不必要的渲染
          setHasAlert(alertTriggered);
          setData(chartRows);
          setLoading(false);    
        })
        .catch((err) => {
          console.error("獲取數據失敗:", err);
          setLoading(false);
        });
    };

    fetchData(); // 網頁載入立刻執行第一次

    // 💡 補全定時器：每隔 5 秒鐘自動去後端撈取最新數據
    const interval = setInterval(fetchData, 5000);

    // 清除定時器，防止組件卸載後內存洩漏
    return () => clearInterval(interval); 
  }, []); // 空依賴陣列確保定時器只被建立一次

  if (loading) return <div>數據加載中...</div>;

  return (
    <div style={{ width: '100%', height: 500, padding: '20px' }}>
      {/* 警報 UI */}
      {hasAlert && (
        <div style={{ color: 'white', backgroundColor: 'red', padding: '10px', marginBottom: '20px', borderRadius: '5px', fontWeight: 'bold' }}>
          ⚠️ 警告：AI 預測未來 CPU 負載將超過 85%！
        </div>
      )}

      {/* Recharts 圖表渲染 */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          
          {/* 歷史實線 */}
          <Line type="monotone" dataKey="cpu" stroke="#1890ff" strokeWidth={2} dot={false} activeDot={{ r: 8 }} connectNulls />
          
          {/* 預測虛線 */}
          <Line type="monotone" dataKey="prediction" stroke="#fa8c16" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
          
          {/* 85% 警戒線 */}
          <ReferenceLine y={85} label="警戒線 (85%)" stroke="red" strokeDasharray="3 3" />
          <Brush dataKey="time" height={30} stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default App;
