import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://nurse-career-hub.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def test_user(session):
    """Create a fresh test user (signup) and return dict with tokens etc."""
    email = f"test_{uuid.uuid4().hex[:10]}@example.com"
    password = "password123"
    name = "TEST User"
    r = session.post(f"{BASE_URL}/api/auth/signup", json={"email": email, "password": password, "name": name})
    assert r.status_code == 200, f"signup failed: {r.status_code} {r.text}"
    data = r.json()
    return {
        "email": email,
        "password": password,
        "name": name,
        "token": data["access_token"],
        "user": data["user"],
    }


@pytest.fixture(scope="session")
def auth_headers(test_user):
    return {"Authorization": f"Bearer {test_user['token']}"}


@pytest.fixture(scope="session")
def onboarded_user(session, test_user, auth_headers):
    """Ensure user has completed onboarding."""
    r = session.post(
        f"{BASE_URL}/api/auth/onboarding",
        json={"role": "RN", "qualification": "BSN", "country": "India", "goal": "Germany"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    return test_user
