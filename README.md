Time-Series Metric Forecasting Service
An end-to-end telemetry monitoring system featuring low-latency SQL aggregation, lightweight ONNX model inference, and real-time frontend visualization.

Overview
This repository demonstrates a complete system pipeline for monitoring server infrastructure metrics:

Storage & Querying: Handles time-series metrics using PostgreSQL with optimized index strategies to maintain low-latency aggregation over 1M+ records.

Predictive Analytics: Runs autoregressive multi-step forecasting using an ONNX-runtime model based on trailing window statistics.

Visualization: Presents historical metrics and model predictions via a React dashboard with configurable threshold alerts.

System Architecture
[ PostgreSQL (Neon) ] ──(Indexed Aggregation)──► [ FastAPI ]
                                                     │
                                             (ONNX Runtime)
                                                     │
[ React Dashboard ]   ◄───────(JSON API)─────────────┘
Technical Stack & Dependencies
Backend: FastAPI, PyTorch / ONNX Runtime, NumPy, Psycopg2

Database: PostgreSQL (Cloud Hosted via Neon)

Frontend: React, Recharts

Deployment: Render (API), Vercel (Frontend)
