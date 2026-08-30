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
          
          let alertTriggered = false; // 修正死循環：先用變數記錄警報狀態

          resData.predictions.forEach((p, index) => {
            const nextTime = new Date(lastTimeObj.getTime() + (index + 1) * 60 * 60 * 1000);
            
            chartRows.push({
              time: nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " (AI預測)",
              cpu: index === 0 ? lastHistoryRow.cpu : null, // 銜接點：第一筆預測線與歷史最後一筆數值相等
              prediction: p.toFixed(1)
            });

            // 💡 【UI/UX 亮點：主動異常警示】如果 AI 預測未來任何一小時的 CPU 負載超標 (> 85%)，觸發全局紅色警報
            if (p > 85) alertTriggered = true;
          });

          if (alertTriggered) setHasAlert(true); // 迴圈結束後一次性觸發
          setData(chartRows);
          setLoading(false);    
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
    };

    fetchData(); // 網頁點開立刻執行第一次

    // 核心亮點：每隔 5 秒鐘，自動去後端撈取經由排程寫入
    // 正在向雲端撈取經 SQL 複合索引加速之大數據與 ONNX 推理結果
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval); // 清除定時器
  }, []); // 空依賴確保 5 秒定時器只建立一次

  // 以下為原網頁應有的 Return 渲染
  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ width: '100%', height: 500 }}>
      {hasAlert && <div style={{ color: 'red' }}>⚠️ 警告：CPU 負載超標!</div>}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="cpu" stroke="#1890ff" connectNulls />
          <Line type="monotone" dataKey="prediction" stroke="#fa8c16" strokeDasharray="5 5" connectNulls />
          <ReferenceLine y={85} stroke="red" strokeDasharray="3 3" />
          <Brush dataKey="time" height={30} stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default App;
