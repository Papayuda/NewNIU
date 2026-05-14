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


def _api_headers(token: str) -> dict[str, str]:
    return {
        "token": token,
        "User-Agent": USER_AGENT,
        "Accept-Language": ACCEPT_LANGUAGE,
        "Content-Type": "application/json",
    }


async def get_vehicles(token: str) -> list[dict[str, Any]]:
    url = f"{APP_API_BASE_URL}/v5/scooter/list"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_api_headers(token), json={}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    return data.get("data", {}).get("items", [])


async def get_vehicle_detail(token: str, sn: str) -> dict[str, Any]:
    url = f"{APP_API_BASE_URL}/v5/scooter/detail"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_api_headers(token), json={"sn": sn}, timeout=30)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def get_vehicle_pos(token: str, sn: str) -> dict[str, Any]:
    url = f"{APP_API_BASE_URL}/v5/scooter/position/{sn}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_api_headers(token), timeout=30)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def get_overall_tally(token: str, sn: str) -> dict[str, Any]:
    url = f"{APP_API_BASE_URL}/v5/scooter/overall_tally"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_api_headers(token), json={"sn": sn}, timeout=30)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def get_battery_info(token: str, sn: str) -> dict[str, Any]:
    url = f"{APP_API_BASE_URL}/v5/scooter/battery/info"
    payload = {"sn": sn}
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_api_headers(token), json=payload, timeout=30)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def get_battery_health(token: str, sn: str) -> dict[str, Any]:
    url = f"{APP_API_BASE_URL}/v5/scooter/battery/health"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_api_headers(token), json={"sn": sn}, timeout=30)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def get_battery_chart(
    token: str, sn: str, page: int = 1, page_size: int = 7,
) -> dict[str, Any]:
    url = f"{APP_API_BASE_URL}/v5/scooter/battery/chart"
    payload = {"sn": sn, "page": page, "pageSize": page_size, "pageLength": page_size}
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_api_headers(token), json=payload, timeout=30)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def get_motor_info(token: str, sn: str) -> dict[str, Any]:
    url = f"{APP_API_BASE_URL}/v5/scooter/motor_data/index_info"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_api_headers(token), json={"sn": sn}, timeout=30)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def get_tracks(
    token: str, sn: str, page: int = 1, page_size: int = 10
) -> dict[str, Any]:
    url = f"{APP_API_BASE_URL}/v5/track/list/v2"
    payload = {"sn": sn, "index": str(page), "pageSize": page_size, "pageLength": page_size}
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_api_headers(token), json=payload, timeout=30)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def get_track_detail(token: str, sn: str, track_id: str) -> dict[str, Any]:
    url = f"{APP_API_BASE_URL}/v5/track/detail"
    payload = {"sn": sn, "trackId": track_id}
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_api_headers(token), json=payload, timeout=30)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def get_firmware_version(token: str, sn: str) -> dict[str, Any]:
    url = f"{APP_API_BASE_URL}/v5/scooter/firmware/version"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_api_headers(token), json={"sn": sn}, timeout=30)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def get_update_info(token: str, sn: str) -> dict[str, Any]:
    url = f"{APP_API_BASE_URL}/v5/scooter/firmware/update"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_api_headers(token), json={"sn": sn}, timeout=30)
        resp.raise_for_status()
        return resp.json().get("data", {})
