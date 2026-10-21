import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

import psycopg
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from psycopg.errors import UniqueViolation
from psycopg.rows import dict_row

from .connection import DatabaseConfigurationError

_PASSWORD_HASHER = PasswordHasher()
_DUMMY_PASSWORD_HASH = (
    "$argon2id$v=19$m=65536,t=3,p=4$vxx8qyXbGUNjgdk3T+TqOQ$"
    "HAhGzlI8SbcSvr7ddF/Z4RKdmT0ZCmVqWNCEUaUNAD4"
)
_PRICE_MULTIPLIERS = {
    "standard": Decimal("1.0"),
    "ev": Decimal("1.4"),
    "handicapped": Decimal("0.8"),
    "vip": Decimal("1.8"),
}


class UserAlreadyExistsError(RuntimeError):
    pass


class ParkingNotFoundError(RuntimeError):
    pass


class SpotUnavailableError(RuntimeError):
    pass


class ReservationNotFoundError(RuntimeError):
    pass


class ReservationStateError(RuntimeError):
    pass


class InvalidAccessEventError(RuntimeError):
    pass


class AccessEventConflictError(RuntimeError):
    pass


def _database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise DatabaseConfigurationError(
            "DATABASE_URL is not configured in the environment."
        )
    return database_url


def _session_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _release_expired_reservations() -> None:
    with psycopg.connect(_database_url(), connect_timeout=5) as connection:
        with connection.cursor() as cursor:
            _expire_unentered_reservations(cursor)


def hash_password(password: str) -> str:
    return _PASSWORD_HASHER.hash(password)


def create_user(email: str, password: str, full_name: str) -> dict[str, object]:
    try:
        with psycopg.connect(
            _database_url(), connect_timeout=5, row_factory=dict_row
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO users (email, hashed_password, full_name)
                    VALUES (%s, %s, %s)
                    RETURNING id, email, full_name, created_at
                    """,
                    (email, hash_password(password), full_name),
                )
                user = cursor.fetchone()
    except UniqueViolation as exc:
        raise UserAlreadyExistsError("An account with this email already exists.") from exc

    return _public_user(user)


def authenticate_user(email: str, password: str) -> dict[str, object] | None:
    with psycopg.connect(
        _database_url(), connect_timeout=5, row_factory=dict_row
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, email, full_name, created_at, hashed_password
                FROM users
                WHERE email = %s
                """,
                (email,),
            )
            user = cursor.fetchone()

    hashed_password = user["hashed_password"] if user else _DUMMY_PASSWORD_HASH
    try:
        password_matches = _PASSWORD_HASHER.verify(hashed_password, password)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        password_matches = False

    if not user or not password_matches:
        return None
    return _public_user(user)


def create_session(user_id: UUID) -> str:
    token = secrets.token_urlsafe(32)
    with psycopg.connect(_database_url(), connect_timeout=5) as connection:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM auth_sessions WHERE expires_at <= NOW()")
            cursor.execute(
                """
                INSERT INTO auth_sessions (token_hash, user_id, expires_at)
                VALUES (%s, %s, NOW() + INTERVAL '24 hours')
                """,
                (_session_hash(token), user_id),
            )
    return token


def get_session_user(token: str) -> dict[str, object] | None:
    with psycopg.connect(
        _database_url(), connect_timeout=5, row_factory=dict_row
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT users.id, users.email, users.full_name, users.created_at
                FROM auth_sessions
                JOIN users ON users.id = auth_sessions.user_id
                WHERE auth_sessions.token_hash = %s
                  AND auth_sessions.expires_at > NOW()
                """,
                (_session_hash(token),),
            )
            user = cursor.fetchone()
    return _public_user(user) if user else None


def delete_session(token: str) -> None:
    with psycopg.connect(_database_url(), connect_timeout=5) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM auth_sessions WHERE token_hash = %s",
                (_session_hash(token),),
            )


def update_user_name(user_id: UUID, full_name: str) -> dict[str, object] | None:
    with psycopg.connect(
        _database_url(), connect_timeout=5, row_factory=dict_row
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET full_name = %s
                WHERE id = %s
                RETURNING id, email, full_name, created_at
                """,
                (full_name, user_id),
            )
            user = cursor.fetchone()
    return _public_user(user) if user else None


def create_reservation(
    user_id: UUID,
    parking_id: int,
    duration_hours: float,
    spot_type: str,
) -> dict[str, object]:
    started_at = datetime.now(timezone.utc)
    ends_at = started_at + timedelta(hours=duration_hours)
    qr_code_token = secrets.token_urlsafe(32)
    _release_expired_reservations()

    with psycopg.connect(
        _database_url(), connect_timeout=5, row_factory=dict_row
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT price_per_hour_mad
                FROM parkings
                WHERE id = %s
                """,
                (parking_id,),
            )
            parking = cursor.fetchone()
            if parking is None:
                raise ParkingNotFoundError("Parking not found.")

            cursor.execute(
                """
                SELECT id
                FROM parking_spots
                WHERE parking_id = %s
                  AND spot_type = %s
                  AND status = 'AVAILABLE'
                ORDER BY id
                LIMIT 1
                FOR UPDATE SKIP LOCKED
                """,
                (parking_id, spot_type),
            )
            spot = cursor.fetchone()
            if spot is None:
                raise SpotUnavailableError("No available spot of this type.")

            cursor.execute(
                """
                UPDATE parking_spots
                SET status = 'RESERVED'
                WHERE id = %s AND status = 'AVAILABLE'
                RETURNING id, spot_type
                """,
                (spot["id"],),
            )
            reserved_spot = cursor.fetchone()
            if reserved_spot is None:
                raise SpotUnavailableError("The selected spot is no longer available.")

            cursor.execute(
                """
                UPDATE parkings
                SET available_spots = available_spots - 1,
                    ev_chargers_available = ev_chargers_available
                        - CASE WHEN %s = 'ev' THEN 1 ELSE 0 END
                WHERE id = %s
                  AND available_spots > 0
                  AND (%s <> 'ev' OR ev_chargers_available > 0)
                """,
                (spot_type, parking_id, spot_type),
            )
            if cursor.rowcount != 1:
                raise SpotUnavailableError("The parking has no available spots.")

            amount = (
                Decimal(str(duration_hours))
                * Decimal(str(parking["price_per_hour_mad"]))
                * _PRICE_MULTIPLIERS[spot_type]
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            cursor.execute(
                """
                INSERT INTO reservations (
                    user_id, spot_id, start_time, end_time, status,
                    total_amount_mad, qr_code_token
                )
                VALUES (%s, %s, %s, %s, 'CONFIRMED', %s, %s)
                RETURNING id
                """,
                (
                    user_id,
                    reserved_spot["id"],
                    started_at,
                    ends_at,
                    amount,
                    qr_code_token,
                ),
            )
            reservation = cursor.fetchone()

            cursor.execute(
                """
                SELECT
                    reservations.id,
                    reservations.user_id,
                    reservations.start_time,
                    reservations.end_time,
                    reservations.status,
                    reservations.total_amount_mad,
                    parking_spots.id AS spot_id,
                    parking_spots.spot_type,
                    parkings.id AS parking_id,
                    parkings.name AS parking_name,
                    parkings.city_id,
                    cities.name AS city_name
                FROM reservations
                JOIN parking_spots ON parking_spots.id = reservations.spot_id
                JOIN parkings ON parkings.id = parking_spots.parking_id
                JOIN cities ON cities.id = parkings.city_id
                WHERE reservations.id = %s
                """,
                (reservation["id"],),
            )
            result = cursor.fetchone()

    return _booking_record(result, qr_code_token=qr_code_token)


def list_reservations(user_id: UUID) -> list[dict[str, object]]:
    _release_expired_reservations()
    with psycopg.connect(
        _database_url(), connect_timeout=5, row_factory=dict_row
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    reservations.id,
                    reservations.user_id,
                    reservations.start_time,
                    reservations.end_time,
                    reservations.status,
                    reservations.total_amount_mad,
                    reservations.qr_code_token,
                    parking_spots.id AS spot_id,
                    parking_spots.spot_type,
                    parkings.id AS parking_id,
                    parkings.name AS parking_name,
                    parkings.city_id,
                    cities.name AS city_name
                FROM reservations
                JOIN parking_spots ON parking_spots.id = reservations.spot_id
                JOIN parkings ON parkings.id = parking_spots.parking_id
                JOIN cities ON cities.id = parkings.city_id
                WHERE reservations.user_id = %s
                ORDER BY reservations.start_time DESC
                """,
                (user_id,),
            )
            rows = cursor.fetchall()
    return [_booking_record(row, include_token=True) for row in rows]


def cancel_reservation(user_id: UUID, reservation_id: UUID) -> None:
    _release_expired_reservations()
    with psycopg.connect(
        _database_url(), connect_timeout=5, row_factory=dict_row
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT reservations.status, reservations.spot_id,
                       parking_spots.parking_id, parking_spots.spot_type
                FROM reservations
                JOIN parking_spots ON parking_spots.id = reservations.spot_id
                WHERE reservations.id = %s AND reservations.user_id = %s
                FOR UPDATE OF reservations, parking_spots
                """,
                (reservation_id, user_id),
            )
            reservation = cursor.fetchone()
            if reservation is None:
                raise ReservationNotFoundError("Reservation not found.")
            if reservation["status"] != "CONFIRMED":
                raise ReservationStateError(
                    "Only a reservation that has not started can be cancelled."
                )

            cursor.execute(
                """
                UPDATE reservations
                SET status = 'CANCELLED'
                WHERE id = %s
                """,
                (reservation_id,),
            )
            cursor.execute(
                """
                UPDATE parking_spots
                SET status = 'AVAILABLE'
                WHERE id = %s AND status = 'RESERVED'
                RETURNING parking_id, spot_type
                """,
                (reservation["spot_id"],),
            )
            released = cursor.fetchone()
            if released:
                cursor.execute(
                    """
                    UPDATE parkings
                    SET available_spots = LEAST(capacity, available_spots + 1),
                        ev_chargers_available = LEAST(
                            ev_chargers_total,
                            ev_chargers_available
                                + CASE WHEN %s = 'ev' THEN 1 ELSE 0 END
                        )
                    WHERE id = %s
                    """,
                    (released["spot_type"], released["parking_id"]),
                )


def extend_reservation(
    user_id: UUID, reservation_id: UUID, extra_hours: float
) -> None:
    _release_expired_reservations()
    with psycopg.connect(
        _database_url(), connect_timeout=5, row_factory=dict_row
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    reservations.status,
                    parking_spots.hourly_rate_mad
                FROM reservations
                JOIN parking_spots ON parking_spots.id = reservations.spot_id
                WHERE reservations.id = %s AND reservations.user_id = %s
                FOR UPDATE OF reservations, parking_spots
                """,
                (reservation_id, user_id),
            )
            reservation = cursor.fetchone()
            if reservation is None:
                raise ReservationNotFoundError("Reservation not found.")
            if reservation["status"] not in ("CONFIRMED", "ACTIVE"):
                raise ReservationStateError("This reservation cannot be extended.")

            extra_cost = (
                Decimal(str(extra_hours))
                * Decimal(str(reservation["hourly_rate_mad"]))
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            cursor.execute(
                """
                UPDATE reservations
                SET end_time = end_time + (%s * INTERVAL '1 hour'),
                    total_amount_mad = total_amount_mad + %s
                WHERE id = %s
                """,
                (extra_hours, extra_cost, reservation_id),
            )


def persist_access_event(
    event_id: UUID,
    parking_id: int,
    reservation_token: str,
    direction: str,
    occurred_at: datetime,
) -> dict[str, object]:
    _release_expired_reservations()
    with psycopg.connect(
        _database_url(), connect_timeout=5, row_factory=dict_row
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT pg_advisory_xact_lock(hashtext(%s))",
                (str(event_id),),
            )
            cursor.execute(
                """
                SELECT access_events.reservation_id, access_events.direction,
                       access_events.occurred_at, reservations.status
                FROM access_events
                JOIN reservations ON reservations.id = access_events.reservation_id
                WHERE access_events.event_id = %s
                """,
                (event_id,),
            )
            existing_event = cursor.fetchone()
            if existing_event:
                cursor.execute(
                    """
                    SELECT id
                    FROM reservations
                    WHERE qr_code_token = %s AND id = %s
                    """,
                    (reservation_token, existing_event["reservation_id"]),
                )
                same_reservation = cursor.fetchone()
                if (
                    same_reservation
                    and existing_event["direction"] == direction
                    and existing_event["occurred_at"] == occurred_at
                ):
                    return {
                        "event_id": str(event_id),
                        "reservation_id": str(existing_event["reservation_id"]),
                        "status": _reservation_status(existing_event["status"]),
                        "already_processed": True,
                    }
                raise AccessEventConflictError(
                    "This event ID has already been used for different event data."
                )

            cursor.execute(
                """
                SELECT
                    reservations.id,
                    reservations.status,
                    reservations.start_time,
                    reservations.end_time,
                    reservations.spot_id,
                    parking_spots.status AS spot_status,
                    parking_spots.parking_id,
                    parking_spots.spot_type
                FROM reservations
                JOIN parking_spots ON parking_spots.id = reservations.spot_id
                WHERE reservations.qr_code_token = %s
                  AND parking_spots.parking_id = %s
                FOR UPDATE OF reservations, parking_spots
                """,
                (reservation_token, parking_id),
            )
            reservation = cursor.fetchone()
            if reservation is None:
                raise InvalidAccessEventError(
                    "The QR token is invalid for this parking."
                )

            now = datetime.now(timezone.utc)
            if occurred_at > now + timedelta(minutes=5):
                raise InvalidAccessEventError(
                    "Access event time cannot be more than five minutes in the future."
                )

            if direction == "entry":
                if occurred_at < reservation["start_time"] - timedelta(minutes=5):
                    raise InvalidAccessEventError(
                        "The reservation is not valid at this event time."
                    )
                if occurred_at > reservation["end_time"]:
                    raise InvalidAccessEventError("The reservation has expired.")
                if (
                    reservation["status"] != "CONFIRMED"
                    or reservation["spot_status"] != "RESERVED"
                ):
                    raise InvalidAccessEventError(
                        "This reservation cannot be used for entry."
                    )
                next_status = "ACTIVE"
                next_spot_status = "OCCUPIED"
            else:
                if (
                    reservation["status"] != "ACTIVE"
                    or reservation["spot_status"] != "OCCUPIED"
                ):
                    raise InvalidAccessEventError(
                        "A valid entry is required before exiting."
                    )
                cursor.execute(
                    """
                    SELECT occurred_at
                    FROM access_events
                    WHERE reservation_id = %s AND direction = 'entry'
                    ORDER BY occurred_at DESC
                    LIMIT 1
                    """,
                    (reservation["id"],),
                )
                entry = cursor.fetchone()
                if entry is None or occurred_at <= entry["occurred_at"]:
                    raise InvalidAccessEventError(
                        "Exit time must be later than the recorded entry."
                    )
                next_status = "COMPLETED"
                next_spot_status = "AVAILABLE"

            cursor.execute(
                "UPDATE reservations SET status = %s WHERE id = %s",
                (next_status, reservation["id"]),
            )
            cursor.execute(
                "UPDATE parking_spots SET status = %s WHERE id = %s",
                (next_spot_status, reservation["spot_id"]),
            )
            if direction == "exit":
                cursor.execute(
                    """
                    UPDATE parkings
                    SET available_spots = LEAST(capacity, available_spots + 1),
                        ev_chargers_available = LEAST(
                            ev_chargers_total,
                            ev_chargers_available
                                + CASE WHEN %s = 'ev' THEN 1 ELSE 0 END
                        )
                    WHERE id = %s
                    """,
                    (reservation["spot_type"], parking_id),
                )
            cursor.execute(
                """
                INSERT INTO access_events (event_id, reservation_id, direction, occurred_at)
                VALUES (%s, %s, %s, %s)
                """,
                (event_id, reservation["id"], direction, occurred_at),
            )

    return {
        "event_id": str(event_id),
        "reservation_id": str(reservation["id"]),
        "status": _reservation_status(next_status),
        "already_processed": False,
    }


def _expire_unentered_reservations(cursor: psycopg.Cursor) -> None:
    cursor.execute(
        """
        WITH expired AS (
            UPDATE reservations
            SET status = 'EXPIRED'
            WHERE status = 'CONFIRMED' AND end_time <= NOW()
            RETURNING spot_id
        ),
        released AS (
            UPDATE parking_spots
            SET status = 'AVAILABLE'
            WHERE id IN (SELECT spot_id FROM expired)
              AND status = 'RESERVED'
            RETURNING parking_id, spot_type
        ),
        released_counts AS (
            SELECT
                parking_id,
                COUNT(*)::INTEGER AS count,
                COUNT(*) FILTER (WHERE spot_type = 'ev')::INTEGER AS ev_count
            FROM released
            GROUP BY parking_id
        )
        UPDATE parkings
        SET available_spots = LEAST(
            parkings.capacity,
            parkings.available_spots + released_counts.count
        ),
        ev_chargers_available = LEAST(
            parkings.ev_chargers_total,
            parkings.ev_chargers_available + released_counts.ev_count
        )
        FROM released_counts
        WHERE parkings.id = released_counts.parking_id
        """
    )


def _public_user(user: dict[str, object]) -> dict[str, object]:
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "created_at": user["created_at"].isoformat(),
    }


def _reservation_status(status: str) -> str:
    return {
        "CONFIRMED": "active",
        "ACTIVE": "active",
        "COMPLETED": "completed",
        "CANCELLED": "cancelled",
        "EXPIRED": "expired",
    }[status]


def _booking_record(
    row: dict[str, object],
    *,
    include_token: bool = False,
    qr_code_token: str | None = None,
) -> dict[str, object]:
    started_at = row["start_time"]
    ended_at = row["end_time"]
    duration = (ended_at - started_at).total_seconds() / 3600
    booking = {
        "id": str(row["id"]),
        "user_id": str(row["user_id"]),
        "parking_id": row["parking_id"],
        "parking_name": row["parking_name"],
        "city_id": row["city_id"],
        "city_name": row["city_name"],
        "spot_type": row["spot_type"],
        "spot_number": row["spot_id"],
        "duration": duration,
        "start_time": started_at.isoformat(),
        "end_time": ended_at.isoformat(),
        "price": float(row["total_amount_mad"]),
        "status": _reservation_status(row["status"]),
        "payment_method": "wallet",
        "co2_saved": round(duration * 0.12, 1),
        "can_cancel": row["status"] == "CONFIRMED",
    }
    token = qr_code_token or (row.get("qr_code_token") if include_token else None)
    if token:
        booking["qr_code_token"] = token
    return booking
