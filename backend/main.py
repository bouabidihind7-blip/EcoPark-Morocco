import logging
import os
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

import psycopg
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from .database.connection import (
    CameraSpotStateConflictError,
    DatabaseConfigurationError,
    check_database_connection,
    fetch_parkings,
    fetch_parking_spots,
    persist_camera_event,
)
from .database.reservations import (
    AccessEventConflictError,
    InvalidAccessEventError,
    ParkingNotFoundError,
    ReservationNotFoundError,
    ReservationStateError,
    SpotUnavailableError,
    UserAlreadyExistsError,
    authenticate_user,
    cancel_reservation,
    create_reservation,
    create_session,
    create_user,
    delete_session,
    extend_reservation,
    get_session_user,
    list_reservations,
    persist_access_event,
    update_user_name,
)

logger = logging.getLogger(__name__)
app = FastAPI()
ALLOWED_ORIGINS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    *(
        origin.strip().rstrip("/")
        for origin in os.getenv("APP_ORIGINS", "").split(",")
        if origin.strip()
    ),
}
SESSION_COOKIE = "ecopark_session"
SESSION_MAX_AGE = 24 * 60 * 60
secure_setting = os.getenv("AUTH_COOKIE_SECURE")
COOKIE_SECURE = (
    secure_setting.lower() == "true"
    if secure_setting is not None
    else os.getenv("APP_ENV", "development").lower() == "production"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(ALLOWED_ORIGINS),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type"],
)


def _require_browser_origin(request: Request) -> None:
    if request.headers.get("origin") not in ALLOWED_ORIGINS:
        raise HTTPException(status_code=403, detail="Request origin is not allowed.")


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def _database_unavailable(exc: psycopg.Error, message: str) -> HTTPException:
    logger.exception(message)
    return HTTPException(
        status_code=503,
        detail="Could not complete the request using PostgreSQL.",
    )


def get_current_user(request: Request) -> dict[str, object]:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")
    try:
        user = get_session_user(token)
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except psycopg.Error as exc:
        raise _database_unavailable(exc, "Could not validate user session") from exc
    if user is None:
        raise HTTPException(status_code=401, detail="Session expired or invalid.")
    return user


class AccountCredentials(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
            raise ValueError("A valid email address is required.")
        return normalized


class RegisterRequest(AccountCredentials):
    full_name: str = Field(min_length=2, max_length=100)

    @field_validator("full_name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("Name must contain at least two characters.")
        return normalized


class ReservationRequest(BaseModel):
    parking_id: int = Field(gt=0)
    duration_hours: float = Field(gt=0, le=24)
    spot_type: Literal["standard", "ev", "handicapped", "vip"]


class ExtendReservationRequest(BaseModel):
    extra_hours: float = Field(gt=0, le=24)


class UpdateProfileRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)

    @field_validator("full_name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("Name must contain at least two characters.")
        return normalized


class AccessEvent(BaseModel):
    event_id: UUID
    parking_id: int = Field(gt=0)
    reservation_token: str = Field(min_length=32, max_length=64)
    direction: Literal["entry", "exit"]
    occurred_at: datetime

    @field_validator("occurred_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("occurred_at must include a timezone.")
        return value


class CameraEvent(BaseModel):
    parking_id: int = Field(gt=0)
    spot_id: str = Field(min_length=1, max_length=10)
    status: Literal["free", "occupied"]
    occurred_at: datetime

    @field_validator("occurred_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("occurred_at must include a timezone.")
        return value


@app.get("/health/database")
def database_health():
    try:
        check_database_connection()
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except psycopg.Error as exc:
        raise _database_unavailable(exc, "PostgreSQL health check failed") from exc

    return {"status": "connected"}


@app.post("/auth/register", status_code=201)
def register_account(
    account: RegisterRequest,
    request: Request,
    response: Response,
):
    _require_browser_origin(request)
    try:
        user = create_user(account.email, account.password, account.full_name)
        session = create_session(user["id"])
    except UserAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except psycopg.Error as exc:
        raise _database_unavailable(exc, "Could not register user") from exc

    _set_session_cookie(response, session)
    return {"user": user}


@app.post("/auth/login")
def login_account(
    account: AccountCredentials,
    request: Request,
    response: Response,
):
    _require_browser_origin(request)
    try:
        user = authenticate_user(account.email, account.password)
        if user is None:
            raise HTTPException(
                status_code=401,
                detail="Email or password is incorrect.",
            )
        session = create_session(user["id"])
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except psycopg.Error as exc:
        raise _database_unavailable(exc, "Could not log in user") from exc

    _set_session_cookie(response, session)
    return {"user": user}


@app.get("/auth/me")
def current_account(user: dict[str, object] = Depends(get_current_user)):
    return {"user": user}


@app.post("/auth/logout")
def logout_account(request: Request, response: Response):
    _require_browser_origin(request)
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        try:
            delete_session(token)
        except DatabaseConfigurationError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except psycopg.Error as exc:
            raise _database_unavailable(exc, "Could not end user session") from exc

    response.delete_cookie(
        SESSION_COOKIE,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {"message": "Logged out."}


@app.get("/parkings")
@app.get("/Parkings")
def demander_liste_parkings():
    try:
        return fetch_parkings()
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except psycopg.Error as exc:
        raise _database_unavailable(exc, "Could not fetch parking list") from exc


@app.get("/parkings/{parking_id}/spots")
def get_places_parking(parking_id: int):
    try:
        return fetch_parking_spots(parking_id)
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except psycopg.Error as exc:
        raise _database_unavailable(exc, "Could not fetch parking spots") from exc


@app.post("/camera-events")
def receive_camera_event(camera: CameraEvent):
    try:
        result = persist_camera_event(
            parking_id=camera.parking_id,
            spot_id=camera.spot_id,
            status=camera.status,
            occurred_at=camera.occurred_at.astimezone(timezone.utc),
        )
    except CameraSpotStateConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except psycopg.Error as exc:
        raise _database_unavailable(exc, "Could not persist camera event") from exc

    if result is None:
        raise HTTPException(status_code=404, detail="Parking spot not found.")

    return {
        "message": "Camera event processed",
        **result,
        "spot_id": camera.spot_id,
    }


@app.post("/reservations", status_code=201)
def reserve_spot(
    reservation: ReservationRequest,
    request: Request,
    user: dict[str, object] = Depends(get_current_user),
):
    _require_browser_origin(request)
    try:
        return create_reservation(
            user_id=user["id"],
            parking_id=reservation.parking_id,
            duration_hours=reservation.duration_hours,
            spot_type=reservation.spot_type,
        )
    except ParkingNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except SpotUnavailableError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except psycopg.Error as exc:
        raise _database_unavailable(exc, "Could not create reservation") from exc


@app.get("/users/me/reservations")
def current_user_reservations(user: dict[str, object] = Depends(get_current_user)):
    try:
        return list_reservations(user["id"])
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except psycopg.Error as exc:
        raise _database_unavailable(exc, "Could not list user reservations") from exc


@app.patch("/users/me")
def update_current_user(
    profile: UpdateProfileRequest,
    request: Request,
    user: dict[str, object] = Depends(get_current_user),
):
    _require_browser_origin(request)
    try:
        updated_user = update_user_name(user["id"], profile.full_name)
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except psycopg.Error as exc:
        raise _database_unavailable(exc, "Could not update user profile") from exc
    if updated_user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"user": updated_user}


@app.patch("/reservations/{reservation_id}")
def cancel_user_reservation(
    reservation_id: UUID,
    request: Request,
    user: dict[str, object] = Depends(get_current_user),
):
    _require_browser_origin(request)
    try:
        cancel_reservation(user["id"], reservation_id)
    except ReservationNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ReservationStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except psycopg.Error as exc:
        raise _database_unavailable(exc, "Could not cancel reservation") from exc
    return {"message": "Reservation cancelled."}


@app.post("/reservations/{reservation_id}/extend")
def extend_user_reservation(
    reservation_id: UUID,
    extension: ExtendReservationRequest,
    request: Request,
    user: dict[str, object] = Depends(get_current_user),
):
    _require_browser_origin(request)
    try:
        extend_reservation(
            user["id"],
            reservation_id,
            extension.extra_hours,
        )
    except ReservationNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ReservationStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except psycopg.Error as exc:
        raise _database_unavailable(exc, "Could not extend reservation") from exc
    return {"message": "Reservation extended."}


@app.post("/access-events")
def receive_access_event(event: AccessEvent):
    try:
        result = persist_access_event(
            event_id=event.event_id,
            parking_id=event.parking_id,
            reservation_token=event.reservation_token,
            direction=event.direction,
            occurred_at=event.occurred_at.astimezone(timezone.utc),
        )
    except InvalidAccessEventError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except AccessEventConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except psycopg.Error as exc:
        raise _database_unavailable(exc, "Could not process QR access event") from exc
    return result


@app.get("/parkings/{parking_id}/")
def get_parking_details(parking_id: int):
    try:
        parking_list = fetch_parkings()
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except psycopg.Error as exc:
        raise _database_unavailable(exc, "Could not fetch parking details") from exc

    for parking in parking_list:
        if parking["id"] == parking_id:
            return {
                "name": parking["name"],
                "city": parking["city"],
                "capacite": parking["capacity"],
                "prix": parking["price"],
            }
    raise HTTPException(status_code=404, detail="Parking not found.")
