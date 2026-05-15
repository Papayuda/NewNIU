"""NIU Controller Backend — FastAPI application."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app import niu_api

app = FastAPI(
    title="NIU Controller API",
    description="Backend proxy for NIU Cloud API — powers the NIU Controller dashboard",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    account: str
    password: str
    country_code: str = "1"


class SNRequest(BaseModel):
    sn: str


class TracksRequest(BaseModel):
    sn: str
    page: int = 1
    page_size: int = 10


class TrackDetailRequest(BaseModel):
    sn: str
    track_id: str
    date: str = ""


class BatteryChartRequest(BaseModel):
    sn: str
    bms_id: str = ""
    page: int = 1
    page_size: str = "A"
    page_length: int = 1


def _get_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    if authorization.startswith("Bearer "):
        return authorization[7:]
    return authorization


# ── Health ──

@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


# ── Auth ──

@app.post("/api/auth/login")
async def login(req: LoginRequest) -> dict[str, Any]:
    try:
        token_data = await niu_api.create_session_token(
            account=req.account,
            password=req.password,
            country_code=req.country_code,
        )
        return {"success": True, "data": token_data}
    except Exception as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


# ── Vehicles ──

@app.get("/api/vehicles")
async def get_vehicles(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = _get_token(authorization)
    try:
        vehicles = await niu_api.get_vehicles(token)
        return {"success": True, "data": vehicles}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/vehicle/detail")
async def get_vehicle_detail(
    req: SNRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    token = _get_token(authorization)
    try:
        detail = await niu_api.get_vehicle_detail(token, req.sn)
        return {"success": True, "data": detail}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/vehicle/position")
async def get_vehicle_position(
    req: SNRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    token = _get_token(authorization)
    try:
        pos = await niu_api.get_vehicle_pos(token, req.sn)
        return {"success": True, "data": pos}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/vehicle/tally")
async def get_overall_tally(
    req: SNRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    token = _get_token(authorization)
    try:
        tally = await niu_api.get_overall_tally(token, req.sn)
        return {"success": True, "data": tally}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# ── Battery ──

@app.post("/api/vehicle/battery/info")
async def get_battery_info(
    req: SNRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    token = _get_token(authorization)
    try:
        info = await niu_api.get_battery_info(token, req.sn)
        return {"success": True, "data": info}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/vehicle/battery/health")
async def get_battery_health(
    req: SNRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    token = _get_token(authorization)
    try:
        health = await niu_api.get_battery_health(token, req.sn)
        return {"success": True, "data": health}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/vehicle/battery/chart")
async def get_battery_chart(
    req: BatteryChartRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    token = _get_token(authorization)
    try:
        chart = await niu_api.get_battery_chart(
            token, req.sn, req.bms_id, req.page, req.page_size, req.page_length,
        )
        return {"success": True, "data": chart}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# ── Motor ──

@app.post("/api/vehicle/motor")
async def get_motor_info(
    req: SNRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    token = _get_token(authorization)
    try:
        motor = await niu_api.get_motor_info(token, req.sn)
        return {"success": True, "data": motor}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# ── Tracks ──

@app.post("/api/vehicle/tracks")
async def get_tracks(
    req: TracksRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    token = _get_token(authorization)
    try:
        tracks = await niu_api.get_tracks(token, req.sn, req.page, req.page_size)
        return {"success": True, "data": tracks}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/vehicle/track/detail")
async def get_track_detail(
    req: TrackDetailRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    token = _get_token(authorization)
    try:
        detail = await niu_api.get_track_detail(token, req.sn, req.track_id, req.date)
        return {"success": True, "data": detail}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# ── Firmware ──

@app.post("/api/vehicle/firmware")
async def get_firmware_version(
    req: SNRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    token = _get_token(authorization)
    try:
        firmware = await niu_api.get_firmware_version(token, req.sn)
        return {"success": True, "data": firmware}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/vehicle/update-info")
async def get_update_info(
    req: SNRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    token = _get_token(authorization)
    try:
        update = await niu_api.get_update_info(token, req.sn)
        return {"success": True, "data": update}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

