"""NIU Cloud API client — proxies requests to NIU's cloud services."""

from __future__ import annotations

import hashlib
from typing import Any

import httpx

ACCOUNT_BASE_URL = "https://account-fk.niu.com"
APP_API_BASE_URL = "https://app-api-fk.niu.com"

USER_AGENT = (
    "manager/4.6.48 (android; IN2025 11);"
    "lang=en-US;clientIdentifier=Domestic;sessionTopic="
)
ACCEPT_LANGUAGE = "en-US"


def _md5(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


async def create_session_token(
    account: str,
    password: str,
    country_code: str = "1",
) -> dict[str, Any]:
    """Authenticate with the NIU cloud and return token data."""
    url = f"{ACCOUNT_BASE_URL}/v3/api/oauth2/token"
    form_data = {
        "account": account,
        "password": _md5(password),
        "grant_type": "password",
        "scope": "base",
        "app_id": "niu_ktdrr960",
        "countryCode": country_code,
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
        "Accept-Language": ACCEPT_LANGUAGE,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, data=form_data, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    if "data" not in data or "token" not in data["data"]:
        raise ValueError(data.get("desc", "Authentication failed"))
    return data["data"]


def _api_headers(token: str, form: bool = False) -> dict[str, str]:
    ct = "application/x-www-form-urlencoded" if form else "application/json"
    return {
        "token": token,
        "User-Agent": USER_AGENT,
        "Accept-Language": ACCEPT_LANGUAGE,
        "Content-Type": ct,
    }


async def _get(token: str, path: str) -> dict[str, Any]:
    """GET request to app API (JSON, token header)."""
    url = f"{APP_API_BASE_URL}{path}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_api_headers(token), timeout=30)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def _post_form(token: str, path: str, data: dict[str, str]) -> dict[str, Any]:
    """POST form-encoded request to app API."""
    url = f"{APP_API_BASE_URL}{path}"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url, headers=_api_headers(token, form=True), data=data, timeout=30,
        )
        resp.raise_for_status()
        return resp.json().get("data", {})


async def _post_json(token: str, path: str, payload: dict[str, Any]) -> dict[str, Any]:
    """POST JSON request to app API."""
    url = f"{APP_API_BASE_URL}{path}"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url, headers=_api_headers(token), json=payload, timeout=30,
        )
        resp.raise_for_status()
        return resp.json().get("data", {})


# ── Vehicle list ──

async def get_vehicles(token: str) -> list[dict[str, Any]]:
    url = f"{APP_API_BASE_URL}/motoinfo/list"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url, headers=_api_headers(token, form=True), data={}, timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
    return data.get("data", [])


# ── Overall tally (mileage, days) ──

async def get_overall_tally(token: str, sn: str) -> dict[str, Any]:
    return await _post_form(token, "/motoinfo/overallTally", {"sn": sn})


# ── Motor / vehicle status (real-time: connected, speed, position, lock) ──

async def get_motor_info(token: str, sn: str) -> dict[str, Any]:
    return await _get(token, f"/v3/motor_data/index_info?sn={sn}")


# ── Vehicle position (extracted from motor info) ──

async def get_vehicle_pos(token: str, sn: str) -> dict[str, Any]:
    return await _get(token, f"/v3/motor_data/index_info?sn={sn}")


# ── Battery info (SOC, voltage, temp, cells) ──

async def get_battery_info(token: str, sn: str) -> dict[str, Any]:
    return await _get(token, f"/v3/motor_data/battery_info?sn={sn}")


# ── Battery health (grade, charge count, faults) ──

async def get_battery_health(token: str, sn: str) -> dict[str, Any]:
    return await _get(token, f"/v3/motor_data/battery_info/health?sn={sn}")


# ── Battery chart (charge/discharge history) ──

async def get_battery_chart(
    token: str, sn: str, bms_id: str = "", page: int = 1,
    page_size: str = "A", page_length: int = 1,
) -> dict[str, Any]:
    params = f"sn={sn}&page={page}&page_size={page_size}&pageLength={page_length}"
    if bms_id:
        params += f"&bmsId={bms_id}"
    return await _get(token, f"/v3/motor_data/battery_chart/?{params}")


# ── Vehicle detail (overall tally) ──

async def get_vehicle_detail(token: str, sn: str) -> dict[str, Any]:
    return await _post_form(token, "/motoinfo/overallTally", {"sn": sn})


# ── Tracks ──

async def get_tracks(
    token: str, sn: str, page: int = 1, page_size: int = 10,
) -> dict[str, Any]:
    return await _post_form(
        token, "/v3/motor_data/track",
        {"sn": sn, "index": str(page - 1), "pagesize": str(page_size)},
    )


async def get_track_detail(
    token: str, sn: str, track_id: str, date: str = "",
) -> dict[str, Any]:
    return await _post_form(
        token, "/motoinfo/track/detail",
        {"sn": sn, "trackId": track_id, "date": date},
    )


# ── Firmware ──

async def get_firmware_version(token: str, sn: str) -> dict[str, Any]:
    return await _post_form(token, "/motorota/getfirmwareversion", {"sn": sn})


async def get_update_info(token: str, sn: str) -> dict[str, Any]:
    return await _post_form(token, "/motorota/getupdateinfo", {"sn": sn})
