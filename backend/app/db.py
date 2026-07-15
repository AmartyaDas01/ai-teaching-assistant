"""SQLAlchemy engine, session factory, and Base.

SQLite for dev; swap DATABASE_URL to Postgres for prod with no model changes.
"""
import logging
from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)

# check_same_thread is a SQLite-only flag needed for FastAPI's threaded requests.
connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)

# pool_pre_ping tests a pooled connection before handing it out. Serverless Postgres
# (Neon) suspends when idle and drops open connections, so without this the first
# request after a quiet period gets a dead connection and fails with a 500. Pre-ping
# detects that and transparently reconnects. pool_recycle retires connections before
# they get old enough to be dropped in the first place.
engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema() -> None:
    """Add columns that were introduced after a table already existed.

    `create_all` only creates *missing tables* - it will not add a new column to a
    table that already exists. Without this, `users.is_verified` would silently never
    appear on a database created before email verification was added, and every query
    touching it would fail.

    Existing accounts predate verification, so they are backfilled to verified rather
    than being locked out of their own app.
    """
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    is_sqlite = settings.database_url.startswith("sqlite")

    # users.is_verified - accounts that predate email verification are backfilled as
    # verified rather than being locked out of their own app.
    if "users" in tables:
        columns = {c["name"] for c in inspector.get_columns("users")}
        if "is_verified" not in columns:
            default_true = "1" if is_sqlite else "TRUE"
            with engine.begin() as conn:
                conn.execute(
                    text(
                        f"ALTER TABLE users ADD COLUMN is_verified BOOLEAN "
                        f"NOT NULL DEFAULT {default_true}"
                    )
                )
            logger.info(
                "Added users.is_verified; existing accounts backfilled as verified."
            )

    # quizzes.share_token - the public student link. Existing quizzes need a token
    # each; the column is added nullable, backfilled per-row, then made unique.
    if "quizzes" in tables:
        columns = {c["name"] for c in inspector.get_columns("quizzes")}
        if "share_token" not in columns:
            from app.models.quiz import new_share_token

            with engine.begin() as conn:
                conn.execute(
                    text("ALTER TABLE quizzes ADD COLUMN share_token VARCHAR(64)")
                )
                ids = [r[0] for r in conn.execute(text("SELECT id FROM quizzes"))]
                for quiz_id in ids:
                    conn.execute(
                        text("UPDATE quizzes SET share_token = :t WHERE id = :i"),
                        {"t": new_share_token(), "i": quiz_id},
                    )
                conn.execute(
                    text(
                        "CREATE UNIQUE INDEX IF NOT EXISTS ix_quizzes_share_token "
                        "ON quizzes (share_token)"
                    )
                )
            logger.info(
                "Added quizzes.share_token; backfilled %d existing quizzes.", len(ids)
            )


def init_db() -> None:
    """Create all tables. Import models first so they register on Base.metadata."""
    from app.models import course, document, quiz, user  # noqa: F401

    Base.metadata.create_all(bind=engine)
    ensure_schema()
