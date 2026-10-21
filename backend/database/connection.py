import os
from datetime import datetime
from pathlib import Path

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

class DatabaseConfigurationError(RuntimeError):
    pass


class CameraSpotStateConflictError(RuntimeError):
    pass


def check_database_connection() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise DatabaseConfigurationError(
            "DATABASE_URL is not configured in the environment."
        )

    with psycopg.connect(database_url, connect_timeout=5) as connection:
        connection.execute("SELECT 1")


def fetch_parkings() -> list[dict[str, object]]:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise DatabaseConfigurationError(
            "DATABASE_URL is not configured in the environment."
        )

    query = """
        SELECT
            parkings.id,
            parkings.name,
            parkings.city_id,
            cities.name AS city,
            parkings.address,
            parkings.capacity,
            parkings.available_spots AS available,
            parkings.price_per_hour_mad AS price,
            parkings.ev_chargers_total AS ev_charging,
            parkings.ev_chargers_available AS ev_available,
            parkings.latitude AS lat,
            parkings.longitude AS lng,
            parkings.rating
        FROM parkings
        JOIN cities ON cities.id = parkings.city_id
        ORDER BY parkings.id
    """
    with psycopg.connect(
        database_url,
        connect_timeout=5,
        row_factory=dict_row,
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    return [
        {
            **row,
            "price": float(row["price"]),
            "ev_charging": row["ev_charging"],
            "ev_available": row["ev_available"],
            "lat": float(row["lat"]),
            "lng": float(row["lng"]),
            "rating": float(row["rating"]),
        }
        for row in rows
    ]


def fetch_parking_spots(parking_id: int) -> list[dict[str, object]]:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise DatabaseConfigurationError(
            "DATABASE_URL is not configured in the environment."
        )

    query = """
        SELECT id AS spot_id, parking_id, status, spot_type
        FROM parking_spots
        WHERE parking_id = %s
        ORDER BY id
    """
    with psycopg.connect(
        database_url,
        connect_timeout=5,
        row_factory=dict_row,
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, (parking_id,))
            rows = cursor.fetchall()

    return [
        {
            "parking_id": row["parking_id"],
            "spot_id": row["spot_id"],
            "status": "free" if row["status"] == "AVAILABLE" else row["status"].lower(),
            "spot_type": row["spot_type"],
        }
        for row in rows
    ]


def persist_camera_event(
    parking_id: int,
    spot_id: str,
    status: str,
    occurred_at: datetime,
) -> dict[str, object] | None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise DatabaseConfigurationError(
            "DATABASE_URL is not configured in the environment."
        )

    database_status = "AVAILABLE" if status == "free" else "OCCUPIED"
    with psycopg.connect(
        database_url,
        connect_timeout=5,
        row_factory=dict_row,
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT status, spot_type
                FROM parking_spots
                WHERE id = %s AND parking_id = %s
                FOR UPDATE
                """,
                (spot_id, parking_id),
            )
            spot = cursor.fetchone()
            if spot is None:
                return None

            if spot["status"] == database_status:
                return {
                    "changed": False,
                    "status": status,
                    "event_id": None,
                }

            if spot["status"] not in ("AVAILABLE", "OCCUPIED"):
                raise CameraSpotStateConflictError(
                    f"Camera cannot change a spot in {spot['status']} state."
                )

            cursor.execute(
                "UPDATE parking_spots SET status = %s WHERE id = %s",
                (database_status, spot_id),
            )
            availability_delta = 1 if database_status == "AVAILABLE" else -1
            cursor.execute(
                """
                UPDATE parkings
                SET available_spots = GREATEST(
                    0,
                    LEAST(capacity, available_spots + %s)
                ),
                ev_chargers_available = GREATEST(
                    0,
                    LEAST(
                        ev_chargers_total,
                        ev_chargers_available + %s
                    )
                )
                WHERE id = %s
                """,
                (
                    availability_delta,
                    availability_delta if spot["spot_type"] == "ev" else 0,
                    parking_id,
                ),
            )
            cursor.execute(
                """
                INSERT INTO camera_events (spot_id, status, occurred_at)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (spot_id, status, occurred_at),
            )
            event = cursor.fetchone()

    return {
        "changed": True,
        "status": status,
        "event_id": str(event["id"]),
    }
