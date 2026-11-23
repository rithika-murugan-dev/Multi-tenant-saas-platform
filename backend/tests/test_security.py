import pytest
from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


def test_password_hashing():
    raw_password = "SuperSecretPassword123!"
    hashed = get_password_hash(raw_password)
    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_flow():
    user_id = "12345678-1234-5678-1234-567812345678"
    tenant_id = "87654321-4321-8765-4321-876543210987"
    role = "tenant_admin"

    token = create_access_token(subject=user_id, tenant_id=tenant_id, role=role)
    assert isinstance(token, str)

    payload = decode_access_token(token)
    assert payload is not None
    assert payload.get("sub") == user_id
    assert payload.get("tenant_id") == tenant_id
    assert payload.get("role") == role
