"""Auth: registration, login, and the boundaries around them."""
import uuid

from app.security import create_access_token, create_verification_token


def _email() -> str:
    return f"u-{uuid.uuid4().hex[:8]}@example.com"


def test_register_returns_a_session_when_email_is_disabled(client):
    r = client.post(
        "/auth/register",
        json={"name": "A", "email": _email(), "password": "pw123456"},
    )
    assert r.status_code == 201
    body = r.json()
    # No mail transport configured, so nothing could ever verify the account —
    # it must activate immediately rather than dead-ending the user.
    assert body["verification_required"] is False
    assert body["token"]["access_token"]


def test_duplicate_email_is_rejected(client):
    email = _email()
    payload = {"name": "A", "email": email, "password": "pw123456"}
    assert client.post("/auth/register", json=payload).status_code == 201
    assert client.post("/auth/register", json=payload).status_code == 409


def test_login_with_wrong_password_is_401(client):
    email = _email()
    client.post(
        "/auth/register", json={"name": "A", "email": email, "password": "pw123456"}
    )
    r = client.post("/auth/login", json={"email": email, "password": "wrong"})
    assert r.status_code == 401


def test_password_below_minimum_length_is_rejected(client):
    r = client.post(
        "/auth/register", json={"name": "A", "email": _email(), "password": "short"}
    )
    assert r.status_code == 422


def test_protected_route_requires_a_token(client):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/courses").status_code == 401


def test_me_returns_the_current_user(client, auth):
    r = client.get("/auth/me", headers=auth)
    assert r.status_code == 200
    assert r.json()["role"] == "professor"


def test_a_verification_token_is_not_usable_as_an_api_credential(client, auth):
    """The two token kinds are separated by a `typ` claim.

    Without it, the token inside an emailed confirmation link would be a working
    bearer token — anyone who saw the link (mail logs, a forwarded email) would hold
    a session.
    """
    verification = create_verification_token(1)
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {verification}"})
    assert r.status_code == 401

    # ...and the reverse: an access token must not verify an account.
    from app.security import decode_verification_token

    assert decode_verification_token(create_access_token(1)) is None
