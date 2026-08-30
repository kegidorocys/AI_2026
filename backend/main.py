import os
import numpy as np
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import onnxruntime as ort
import psycopg2
from psycopg2.extras import RealDictCursor

app = FastAPI(title="2026 AI Time-Series API")

origins = [
    "https://ai-2026-214i.vercel.app",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ort_session = ort.InferenceSession("model.onnx")
DATABASE_URL = os.environ.get("DATABASE_URL")

@app.get("/api/metrics")
async def get_metrics(server_id: int):
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
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
    history_data.reverse()
    
    # 1. 取得最後 10 筆原始 CPU 數據
    recent_inputs = [float(row['avg_cpu']) for row in history_data[-10:]]
    
    # 💡 【修復點 A】：假設模型訓練時使用 0~1 特徵，將輸入歸一化（除以 100.0）
    # 如果你的模型當初訓練就是直接吃 0~100 的數字，可拿掉 / 100.0
    normalized_inputs = [val / 100.0 for val in recent_inputs]
    
    input_data = np.array(normalized_inputs, dtype=np.float32).reshape(1, 10, 1)
    
    input_name = ort_session.get_inputs()[0].name
    predictions = []
    current_input = input_data
    
    for _ in range(3):
        pred = ort_session.run(None, {input_name: current_input})[0]
        raw_pred_value = float(pred[0][0]) 
        
        # 💡 【修復點 B】：還原為百分比 (x 100) 並加上 min(..., 100.0) 物理邊界防禦
        restored_pred_value = min(max(raw_pred_value * 100.0, 0.0), 100.0)
        
        predictions.append(restored_pred_value)
        
        # 自迴歸：倒回 normalized 的小數值給下一輪模型推算
        current_input = np.append(current_input[:, 1:, :], [[[raw_pred_value]]], axis=1).astype(np.float32)

    cursor.close()
    conn.close()

    return {
        "status": "success",
        "history": history_data,
        "predictions": predictions
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
