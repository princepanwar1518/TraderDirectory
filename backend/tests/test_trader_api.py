"""Backend tests for TraderDirectory API"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://localhost:8000").rstrip("/")

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

# Shared state
state = {}

# --- Health ---
def test_root(session):
    r = session.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert "message" in r.json()

# --- Search validation ---
def test_search_requires_product(session):
    r = session.post(f"{BASE_URL}/api/search", json={"product": "", "location": "Mumbai"})
    assert r.status_code == 400

def test_search_requires_location(session):
    r = session.post(f"{BASE_URL}/api/search", json={"product": "steel traders", "location": ""})
    assert r.status_code == 400

# --- Search success ---
def test_search_success(session):
    r = session.post(f"{BASE_URL}/api/search",
                     json={"product": "steel traders", "location": "Mumbai"},
                     timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "id" in data and "traders" in data and "count" in data
    assert isinstance(data["traders"], list)
    assert data["count"] == len(data["traders"])
    assert data["product"] == "steel traders"
    assert data["location"] == "Mumbai"
    state["search_id"] = data["id"]
    state["traders"] = data["traders"]
    # Validate trader shape
    if data["traders"]:
        t = data["traders"][0]
        assert "id" in t and "name" in t

# --- History ---
def test_history_list_contains_search(session):
    r = session.get(f"{BASE_URL}/api/history")
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert any(i["id"] == state.get("search_id") for i in items)

def test_history_get_by_id(session):
    sid = state.get("search_id")
    if not sid:
        pytest.skip("No search id")
    r = session.get(f"{BASE_URL}/api/history/{sid}")
    assert r.status_code == 200
    d = r.json()
    assert d["id"] == sid
    assert "traders" in d

def test_history_get_not_found(session):
    r = session.get(f"{BASE_URL}/api/history/nonexistent-id-xyz")
    assert r.status_code == 404

# --- Export ---
def test_export_excel(session):
    traders = state.get("traders") or [{"id":"x","name":"Test Trader","category":"steel","phone":"123","address":"addr"}]
    r = session.post(f"{BASE_URL}/api/export-excel",
                     json={"product":"steel traders","location":"Mumbai","traders":traders})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["filename"].endswith(".xlsx")
    assert "spreadsheetml" in d["mime_type"]
    assert len(d["base64"]) > 100
    # base64 xlsx starts with PK (zip)
    import base64
    raw = base64.b64decode(d["base64"])
    assert raw[:2] == b"PK"

def test_export_excel_empty(session):
    r = session.post(f"{BASE_URL}/api/export-excel",
                     json={"product":"x","location":"y","traders":[]})
    assert r.status_code == 400

# --- Delete (last) ---
def test_history_delete(session):
    sid = state.get("search_id")
    if not sid:
        pytest.skip("No search id")
    r = session.delete(f"{BASE_URL}/api/history/{sid}")
    assert r.status_code == 200
    assert r.json().get("deleted") == 1
    # Verify gone
    r2 = session.get(f"{BASE_URL}/api/history/{sid}")
    assert r2.status_code == 404
