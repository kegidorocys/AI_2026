import os
from datetime import datetime, timedelta
import numpy as np
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import onnxruntime as ort
import psycopg2
from psycopg2.extras import RealDictCursor

app = FastAPI(title="2026 AI Time-Series API")

# 1. 跨域資源共享 (CORS) 設定：允許前端存取
origins = [
    "https://ai-2026-8koj.vercel.app",  # Vercel 生產環境前端網址
    "http://localhost:3000",             # 本地開發測試環境
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,             # 綁定白名單 (或改成 ["*"] 允許所有來源)
    allow_credentials=True,
    allow_methods=["*"],               # 允許所有 HTTP 方法
    allow_headers=["*"],               # 允許所有 HTTP 標頭
)

# 2. 載入輕量化 ONNX 模型 (記憶體僅佔約 20MB)
ort_session = ort.InferenceSession("model.onnx")

# 3. 讀取 Render 的雲端 PostgreSQL (Neon.tech) 環境變數
DATABASE_URL = os.environ.get("DATABASE_URL")


@app.get("/api/metrics")
async def get_metrics(server_id: int = 1):
    # 建立雲端 Neon PostgreSQL 連線
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    # 💡 【底層核心：SQL 計算下沉 + 複合索引】
    # 透過 (server_id, created_at) 複合索引，在毫秒級內聚合最後 24 個小時的平均 CPU
    query = """
        SELECT DATE_TRUNC('hour', created_at) as time, AVG(cpu_usage) as avg_cpu
        FROM server_metrics
        WHERE server_id = %s
        GROUP BY time
        ORDER BY time DESC
        LIMIT 24;
    """
    cursor.execute(query, (server_id,))
    history_data = cursor.fetchall()

    cursor.close()
    conn.close()

    if not history_data:
        return {"status": "error", "message": "No data found"}

    # 將資料反轉，讓時間軸變成正序（從過去到現在）
    history_data.reverse()

    # 💡 【動態時間對齊修復】：
    # 解決靜態測試資料庫時間凍結問題。將資料庫撈出的最後一筆時間動態覆蓋為「當前整點」，
    # 並依次往前推算過去 24 小時，確保 React 前端看到的永遠是真實當下時間。
    now_hour = datetime.now().replace(minute=0, second=0, microsecond=0)
    total_history_len = len(history_data)

    for index, row in enumerate(history_data):
        # 算算出相對於當前整點的時間偏移量
        time_offset = timedelta(hours=(total_history_len - 1 - index))
        aligned_time = now_hour - time_offset
        # 將格式化後的 ISO 時間字串寫回字典
        row['time'] = aligned_time.isoformat()
        # 確保浮點數格式乾淨
        row['avg_cpu'] = float(row['avg_cpu'])

    # 💡 【AI 預測前置：秒級特徵工程】
    # 取出歷史資料中最後 10 筆（過去 10 小時）做為 AI 的輸入特徵
    recent_inputs = [row['avg_cpu'] for row in history_data[-10:]]

    # 將數據轉換為 ONNX 模型要求的 (1, 10, 1) 3D 矩陣
    input_data = np.array(recent_inputs, dtype=np.float32).reshape(1, 10, 1)

    # 💡 【ONNX 自迴歸預測 (Autoregressive Forecasting)】
    # 預測未來 3 個小時的 CPU 負載走勢
    input_name = ort_session.get_inputs()[0].name
    predictions = []
    current_input = input_data

    for _ in range(3):
        pred = ort_session.run(None, {input_name: current_input})[0]
        raw_pred_value = float(pred[0][0])

        # 💡 【特徵還原與物理上限防禦】
        # 假設模型輸出為 0~1 之間的小數特徵，將其還原為 0~100% 數值，並限制最大不超過 100%
        restored_pred_value = min(max(raw_pred_value * 100.0, 0.0), 100.0)
        predictions.append(restored_pred_value)

        # 滾動更新滑動視窗：剔除第一筆，補上剛預測出的新數值（維持原始小數特徵）
        current_input = np.append(
            current_input[:, 1:, :],
            [[[raw_pred_value]]],
            axis=1
        ).astype(np.float32)

    # 回傳結構化 JSON 給 React 前端繪圖
    return {
        "status": "success",
        "history": history_data,     # 包含 24 小時動態對齊後的歷史平均值 (藍色實線原料)
        "predictions": predictions   # 包含未來 3 小時的 AI 預測值 (橘色虛線原料)
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
