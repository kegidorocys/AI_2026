Time-Series Metric Forecasting Service
An end-to-end telemetry monitoring system featuring low-latency SQL aggregation, lightweight ONNX model inference, and real-time frontend visualization.

Overview
This repository demonstrates a complete system pipeline for monitoring server infrastructure metrics:

Storage & Querying: Handles time-series metrics using PostgreSQL with optimized index strategies to maintain low-latency aggregation over 1M+ records.

Predictive Analytics: Runs autoregressive multi-step forecasting using an ONNX-runtime model based on trailing window statistics.

Visualization: Presents historical metrics and model predictions via a React dashboard with configurable threshold alerts.

System Architecture
[ Neon PostgreSQL ] (1 Million + Records)
       │
       ▼ (Compound Index Query < 20ms)
[ FastAPI Backend ] ───► [ ONNX Model Inference ] ───► (Autoregressive Predictions)
       │
       ▼ (REST API / CORS Allowed)
[ React + Recharts ] ───► (Live Dashboard with Brush & Dynamic Alert)

Technical Stack & Dependencies
Backend: FastAPI, PyTorch / ONNX Runtime, NumPy, Psycopg2

Database: PostgreSQL (Cloud Hosted via Neon)

Frontend: React, Recharts

Deployment: Render (API), Vercel (Frontend)
