# NIU Controller

A DarknessBot-style web application for controlling and monitoring NIU electric vehicles (NQi, MQi, UQi, KQi series).

![NIU Controller](https://img.shields.io/badge/NIU-Controller-e63946?style=for-the-badge)

## Features

- **Dashboard** — Customizable metric tiles showing battery, speed, mileage, temperature, power
- **Battery Diagnostics** — Real-time SOC, voltage, temperature, health grade, charging charts
- **Motor Data** — Controller voltage, speed data, shake value, protocol info
- **GPS Location** — Interactive dark-themed map with vehicle position tracking
- **Trip History** — Paginated ride history with distance, duration, and average speed
- **Firmware Info** — Current firmware versions and update status
- **Dark Theme** — Sleek dark UI with red/cyan accent colors inspired by DarknessBot

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   React SPA     │ ───▶ │   FastAPI        │ ───▶ │  NIU Cloud API  │
│   (Vite + TS)   │      │   Backend        │      │  (niu.com)      │
│   Tailwind CSS  │      │   Proxy          │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: FastAPI (Python) — proxies all requests to NIU Cloud API
- **Maps**: Leaflet with CartoDB dark tiles
- **Charts**: Recharts for battery usage visualization

## Quick Start

### Backend

```bash
cd backend
pip install fastapi uvicorn httpx pydantic "python-jose[cryptography]" passlib
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend proxies `/api` requests to the backend at `localhost:8000`.

Open [http://localhost:5173](http://localhost:5173) and log in with your NIU cloud credentials.

## Supported NIU Products

- **NQi Series** — NQi GTS, NQi Sport
- **MQi Series** — MQi GT Evo, MQi GT, MQi+ Sport, MQi
- **UQi Series** — UQi GT, UQi
- **KQi Series** — KQi 1, KQi 2, KQi 3, KQi Youth+

Any NIU vehicle registered in the NIU cloud app is supported.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Authenticate with NIU cloud |
| `/api/vehicles` | GET | List all vehicles |
| `/api/vehicle/detail` | POST | Vehicle details |
| `/api/vehicle/position` | POST | GPS position |
| `/api/vehicle/tally` | POST | Overall statistics |
| `/api/vehicle/battery/info` | POST | Battery status |
| `/api/vehicle/battery/health` | POST | Battery health |
| `/api/vehicle/battery/chart` | POST | Battery usage chart |
| `/api/vehicle/motor` | POST | Motor diagnostics |
| `/api/vehicle/tracks` | POST | Trip history |
| `/api/vehicle/track/detail` | POST | Trip detail |
| `/api/vehicle/firmware` | POST | Firmware version |

## NIU Cloud API

This app uses the reverse-engineered NIU Cloud API. Credits to:
- [niu-cloud-connector](https://github.com/BlueAndi/niu-cloud-connector)
- [niu-app-api](https://github.com/bonnee/niu-app-api)

## License

MIT
