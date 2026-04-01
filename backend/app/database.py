import hashlib
import hmac
import json
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "budgetvest.db"


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS user_state (
                user_id INTEGER PRIMARY KEY,
                state_json TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str, salt: str | None = None) -> str:
    password_salt = salt or secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        password_salt.encode("utf-8"),
        120_000,
    ).hex()
    return f"{password_salt}${password_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    salt, expected_hash = stored_hash.split("$", maxsplit=1)
    candidate_hash = hash_password(password, salt).split("$", maxsplit=1)[1]
    return hmac.compare_digest(candidate_hash, expected_hash)


def create_user(name: str, email: str, password: str) -> dict[str, Any]:
    normalized_email = email.strip().lower()
    password_hash = hash_password(password)

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (name, email, password_hash, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (name.strip(), normalized_email, password_hash, utc_now_iso()),
            )
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError as exc:
        raise ValueError("An account with that email already exists.") from exc

    return {"id": user_id, "name": name.strip(), "email": normalized_email}


def authenticate_user(email: str, password: str) -> dict[str, Any]:
    normalized_email = email.strip().lower()

    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, name, email, password_hash
            FROM users
            WHERE email = ?
            """,
            (normalized_email,),
        ).fetchone()

    if not row or not verify_password(password, row["password_hash"]):
        raise ValueError("Email or password is incorrect.")

    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO sessions (token, user_id, created_at)
            VALUES (?, ?, ?)
            """,
            (token, user_id, utc_now_iso()),
        )

    return token


def delete_session(token: str) -> None:
    with get_connection() as connection:
        connection.execute("DELETE FROM sessions WHERE token = ?", (token,))


def get_user_by_token(token: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT users.id, users.name, users.email
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?
            """,
            (token,),
        ).fetchone()

    if not row:
        return None

    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def load_user_state(user_id: int) -> dict[str, Any]:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT state_json FROM user_state WHERE user_id = ?",
            (user_id,),
        ).fetchone()

    if not row:
        return {}

    try:
        return json.loads(row["state_json"])
    except json.JSONDecodeError:
        return {}


def save_user_state(user_id: int, state: dict[str, Any]) -> dict[str, Any]:
    state_json = json.dumps(state)

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO user_state (user_id, state_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                state_json = excluded.state_json,
                updated_at = excluded.updated_at
            """,
            (user_id, state_json, utc_now_iso()),
        )

    return state
