import json
import os
import random
import time
import uuid
from datetime import datetime, timezone
from http.cookiejar import CookieJar
from urllib.error import HTTPError, URLError
from urllib.request import HTTPCookieProcessor, Request, build_opener


API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
PARKING_ID = 16
DEMO_EMAIL = os.getenv("DEMO_EMAIL", "demo@ecopark.ma")
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "EcoParkDemo2026!")
BROWSER_ORIGIN = os.getenv("APP_ORIGIN", "http://127.0.0.1:5173")


def request_json(opener, path: str, payload: dict[str, object]) -> dict[str, object]:
    request = Request(
        f"{API_BASE_URL}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Origin": BROWSER_ORIGIN,
        },
        method="POST",
    )
    try:
        with opener.open(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8")
        raise RuntimeError(
            f"API returned HTTP {error.code} for {path}: {detail}"
        ) from error
    except URLError as error:
        raise RuntimeError(
            f"Could not reach the API at {API_BASE_URL}."
        ) from error


def login(opener) -> None:
    if not DEMO_PASSWORD:
        raise RuntimeError(
            "Set DEMO_PASSWORD to the demo account password before starting the simulator."
        )
    request_json(
        opener,
        "/auth/login",
        {"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
    )
    print(f"Authenticated as {DEMO_EMAIL}.", flush=True)


def create_test_reservation(opener) -> dict[str, object]:
    reservation = request_json(
        opener,
        "/reservations",
        {
            "parking_id": PARKING_ID,
            "duration_hours": 1 / 60,
            "spot_type": "standard",
        },
    )
    print(
        "Created test reservation "
        f"{reservation['id']} for spot {reservation['spot_number']}.",
        flush=True,
    )
    return reservation


def send_access_event(
    opener,
    reservation_token: str,
    direction: str,
) -> None:
    event = {
        "event_id": str(uuid.uuid4()),
        "parking_id": PARKING_ID,
        "reservation_token": reservation_token,
        "direction": direction,
        "occurred_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    print(json.dumps({**event, "reservation_token": "[redacted in event log]"}), flush=True)
    result = request_json(opener, "/access-events", event)
    print(json.dumps(result), flush=True)


def simulate_vehicle_events() -> None:
    opener = build_opener(HTTPCookieProcessor(CookieJar()))
    try:
        login(opener)
        while True:
            reservation = create_test_reservation(opener)
            reservation_token = str(reservation["qr_code_token"])
            send_access_event(opener, reservation_token, "entry")

            parking_duration = random.randint(10, 30)
            print(
                f"Vehicle is simulating a stay of {parking_duration} seconds.",
                flush=True,
            )
            try:
                time.sleep(parking_duration)
            finally:
                send_access_event(opener, reservation_token, "exit")

            time.sleep(2)
    except KeyboardInterrupt:
        print("\nVehicle simulation stopped by user.", flush=True)


if __name__ == "__main__":
    simulate_vehicle_events()
