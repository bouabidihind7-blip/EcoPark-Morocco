import json
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def simulate_camera_events():
    statuses = ("free", "occupied")
    index = 0

    try:
        while True:
            event = {
                "parking_id": 16,
                "spot_id": "A-01",
                "status": statuses[index % len(statuses)],
                "occurred_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            }
            index += 1
            print(json.dumps(event), flush=True)
            request = Request(
                "http://127.0.0.1:8000/camera-events",
                data=json.dumps(event).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urlopen(request, timeout=5) as response:
                print(response.read().decode("utf-8"), flush=True)
            time.sleep(2)
    except HTTPError as error:
        detail = error.read().decode("utf-8")
        raise RuntimeError(
            f"Camera API returned HTTP {error.code}: {detail}"
        ) from error
    except URLError as error:
        raise RuntimeError(
            "Could not reach the camera API at http://127.0.0.1:8000."
        ) from error
    except KeyboardInterrupt:
        print("\nCamera simulation stopped by user.", flush=True)


if __name__ == "__main__":
    simulate_camera_events()
