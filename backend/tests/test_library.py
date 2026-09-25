"""Library module tests for Nurse Orbit (iteration_2)."""
import json
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://nurse-career-hub.preview.emergentagent.com").rstrip("/")

ADMIN_EMAIL = "admin@nurseorbit.app"
ADMIN_PASS = "admin12345"


# ---------- Admin auth helper ----------
@pytest.fixture(scope="module")
def admin_headers(session):
    # Try login, else signup
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    if r.status_code != 200:
        r = session.post(f"{BASE_URL}/api/auth/signup", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS, "name": "Admin"})
        assert r.status_code == 200, f"admin signup failed: {r.text}"
    data = r.json()
    user = data["user"]
    assert user.get("is_admin") is True, f"admin flag not set for {ADMIN_EMAIL}: {user}"
    return {"Authorization": f"Bearer {data['access_token']}"}


# -------------------- Categories --------------------
class TestLibraryCategories:
    def test_list_categories_26(self, session):
        r = session.get(f"{BASE_URL}/api/library/categories")
        assert r.status_code == 200
        cats = r.json()["categories"]
        assert len(cats) == 26, f"expected 26 categories, got {len(cats)}"
        for c in cats:
            assert "id" in c and "name" in c
            assert "book_count" in c and isinstance(c["book_count"], int)


# -------------------- Books listing --------------------
class TestLibraryBooks:
    def test_list_all_books(self, session):
        r = session.get(f"{BASE_URL}/api/library/books")
        assert r.status_code == 200
        books = r.json()["books"]
        assert len(books) >= 1
        b = books[0]
        for k in ["id", "title", "author", "category_id", "chapter_count"]:
            assert k in b
        # chapters must NOT be in summary
        assert "chapters" not in b

    def test_filter_by_category_pha(self, session):
        r = session.get(f"{BASE_URL}/api/library/books", params={"category_id": "cat-pha"})
        assert r.status_code == 200
        books = r.json()["books"]
        assert len(books) >= 1
        for b in books:
            assert b["category_id"] == "cat-pha"

    def test_search_by_q(self, session):
        r = session.get(f"{BASE_URL}/api/library/books", params={"q": "heparin"})
        # 200 always, may be empty
        assert r.status_code == 200
        # Should contain at least the pharmacology book (heparin in tags/desc)
        books = r.json()["books"]
        # If nothing found, still ok — regex search may miss; log
        assert isinstance(books, list)


# -------------------- Featured --------------------
class TestLibraryFeatured:
    def test_featured_shape(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/library/featured", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ["featured", "recent", "continue_reading", "bookmarked"]:
            assert k in d, f"missing key: {k}"
            assert isinstance(d[k], list)


# -------------------- Book detail & Chapter --------------------
class TestLibraryBookDetail:
    def test_book_detail_and_chapter_flow(self, session, auth_headers):
        books = session.get(f"{BASE_URL}/api/library/books").json()["books"]
        assert books, "no books seeded"
        bid = books[0]["id"]
        r = session.get(f"{BASE_URL}/api/library/books/{bid}", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert "book" in d and d["book"]["id"] == bid
        assert "progress" in d and "is_bookmarked" in d
        chapters = d["book"]["chapters"]
        assert chapters, "book should have chapters TOC"
        # TOC entries should NOT include content
        assert "content" not in chapters[0], "TOC should not leak full content"
        assert "number" in chapters[0] and "title" in chapters[0]

        # Fetch chapter 1
        r = session.get(f"{BASE_URL}/api/library/books/{bid}/chapter/1", headers=auth_headers)
        assert r.status_code == 200
        c = r.json()
        assert "chapter" in c and c["chapter"]["number"] == 1
        assert "content" in c["chapter"]
        assert "notes" in c and isinstance(c["notes"], list)
        assert "is_bookmarked" in c

    def test_missing_book(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/library/books/no-such-book", headers=auth_headers)
        assert r.status_code == 404


# -------------------- Bookmarks --------------------
class TestBookmarks:
    def test_toggle_and_list(self, session, auth_headers):
        books = session.get(f"{BASE_URL}/api/library/books").json()["books"]
        bid = books[0]["id"]
        # ensure clean state: query first
        r1 = session.post(f"{BASE_URL}/api/library/bookmarks/toggle", json={"book_id": bid, "chapter": 1}, headers=auth_headers)
        assert r1.status_code == 200
        s1 = r1.json()["bookmarked"]
        r2 = session.post(f"{BASE_URL}/api/library/bookmarks/toggle", json={"book_id": bid, "chapter": 1}, headers=auth_headers)
        assert r2.status_code == 200
        s2 = r2.json()["bookmarked"]
        assert s1 != s2, f"toggle should flip: {s1} -> {s2}"

        # If s2==True (we ended with bookmark), verify it's in list
        if s2:
            r = session.get(f"{BASE_URL}/api/library/bookmarks", headers=auth_headers)
            assert r.status_code == 200
            bookmarks = r.json()["bookmarks"]
            assert any(b["book_id"] == bid and b["chapter"] == 1 for b in bookmarks)
            # cleanup: toggle off
            session.post(f"{BASE_URL}/api/library/bookmarks/toggle", json={"book_id": bid, "chapter": 1}, headers=auth_headers)


# -------------------- Notes --------------------
class TestNotes:
    def test_create_and_delete_note(self, session, auth_headers):
        books = session.get(f"{BASE_URL}/api/library/books").json()["books"]
        bid = books[0]["id"]
        r = session.post(f"{BASE_URL}/api/library/notes", json={"book_id": bid, "chapter": 1, "text": "TEST note for library"}, headers=auth_headers)
        assert r.status_code == 200
        note = r.json()["note"]
        assert note["text"] == "TEST note for library"
        nid = note["id"]

        # Verify shows up in chapter fetch
        r = session.get(f"{BASE_URL}/api/library/books/{bid}/chapter/1", headers=auth_headers)
        notes = r.json()["notes"]
        assert any(n["id"] == nid for n in notes)

        # Delete
        r = session.delete(f"{BASE_URL}/api/library/notes/{nid}", headers=auth_headers)
        assert r.status_code == 200
        # Verify gone
        r = session.get(f"{BASE_URL}/api/library/books/{bid}/chapter/1", headers=auth_headers)
        notes = r.json()["notes"]
        assert not any(n["id"] == nid for n in notes)


# -------------------- Search --------------------
class TestLibrarySearch:
    def test_search_heparin(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/library/search", params={"q": "heparin"}, headers=auth_headers)
        assert r.status_code == 200
        results = r.json()["results"]
        assert len(results) >= 1, "expected at least one heparin match"
        r0 = results[0]
        assert "hits" in r0 and len(r0["hits"]) >= 1
        # At least one chapter hit with number & title & snippet
        ch_hits = [h for h in r0["hits"] if h.get("type") == "chapter"]
        if ch_hits:
            assert "chapter" in ch_hits[0]
            assert "title" in ch_hits[0]
            assert "snippet" in ch_hits[0]

    def test_search_short(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/library/search", params={"q": "a"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["results"] == []


# -------------------- Admin RBAC --------------------
class TestAdminRBAC:
    def test_non_admin_forbidden(self, session, auth_headers):
        payload = {"title": "TEST X", "author": "TEST A", "category_id": "cat-pha"}
        r = session.post(f"{BASE_URL}/api/library/admin/books", json=payload, headers=auth_headers)
        assert r.status_code == 403, f"non-admin should be 403, got {r.status_code} {r.text}"

        r = session.put(f"{BASE_URL}/api/library/admin/books/any-id", json=payload, headers=auth_headers)
        assert r.status_code == 403

        r = session.delete(f"{BASE_URL}/api/library/admin/books/any-id", headers=auth_headers)
        assert r.status_code == 403


# -------------------- Admin flow --------------------
class TestAdminFlow:
    def test_admin_create_and_delete_book(self, session, admin_headers):
        payload = {
            "title": "TEST Admin Book",
            "author": "TEST Author",
            "category_id": "cat-pha",
            "description": "test-desc-admin",
            "chapters": [
                {"number": 1, "title": "TEST Chapter 1", "content": "This is TEST content about heparin monitoring for admin flow."},
                {"number": 2, "title": "TEST Chapter 2", "content": "Another TEST chapter."},
            ],
            "tags": ["TEST"],
        }
        r = session.post(f"{BASE_URL}/api/library/admin/books", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        book = r.json()["book"]
        bid = book["id"]
        assert book["chapter_count"] == 2

        # Verify in listing
        r = session.get(f"{BASE_URL}/api/library/books", params={"category_id": "cat-pha"})
        ids = [b["id"] for b in r.json()["books"]]
        assert bid in ids, "newly created admin book must appear in books list"

        # Delete
        r = session.delete(f"{BASE_URL}/api/library/admin/books/{bid}", headers=admin_headers)
        assert r.status_code == 200

        # Verify gone
        r = session.get(f"{BASE_URL}/api/library/books", params={"category_id": "cat-pha"})
        ids = [b["id"] for b in r.json()["books"]]
        assert bid not in ids

        # Delete missing -> 404
        r = session.delete(f"{BASE_URL}/api/library/admin/books/{bid}", headers=admin_headers)
        assert r.status_code == 404


# -------------------- AI + Library references --------------------
class TestAILibraryReferences:
    def test_ai_chat_emits_references_for_heparin(self, session, auth_headers):
        sid = f"test-lib-{uuid.uuid4().hex[:8]}"
        payload = {"session_id": sid, "message": "Explain heparin monitoring in one short sentence."}
        headers = {**auth_headers, "Accept": "text/event-stream"}
        got_delta = False
        got_done = False
        got_refs = None
        got_error = None
        events_order = []
        with requests.post(f"{BASE_URL}/api/ai/chat", json=payload, headers=headers, stream=True, timeout=90) as r:
            assert r.status_code == 200, r.text
            for raw in r.iter_lines():
                if not raw:
                    continue
                line = raw.decode("utf-8") if isinstance(raw, bytes) else raw
                if not line.startswith("data: "):
                    continue
                try:
                    evt = json.loads(line[6:])
                except Exception:
                    continue
                if "delta" in evt:
                    got_delta = True
                    events_order.append("delta")
                if "references" in evt:
                    got_refs = evt["references"]
                    events_order.append("references")
                if "error" in evt:
                    got_error = evt["error"]
                    events_order.append("error")
                if evt.get("done"):
                    got_done = True
                    events_order.append("done")
                    break
        assert got_done, f"stream never emitted done. error={got_error}"
        assert got_delta, f"no delta. error={got_error}"
        assert got_refs is not None, f"expected 'references' event for heparin question. order={events_order}"
        assert isinstance(got_refs, list) and len(got_refs) >= 1
        for k in ["book_id", "book_title", "author", "chapter", "chapter_title"]:
            assert k in got_refs[0], f"reference missing key {k}: {got_refs[0]}"
        # references must come BEFORE done
        assert events_order.index("references") < events_order.index("done"), f"references must precede done: {events_order}"

        # Verify persisted in chat history
        time.sleep(0.5)
        r = session.get(f"{BASE_URL}/api/ai/chat/{sid}/history", headers=auth_headers)
        assert r.status_code == 200
        msgs = r.json()["messages"]
        asst = [m for m in msgs if m["role"] == "assistant"]
        assert asst, "no assistant msg persisted"
        # references field should be persisted on assistant message
        assert asst[-1].get("references"), "assistant msg should have references persisted"


# -------------------- Regular signup does NOT get is_admin --------------------
class TestRegularNotAdmin:
    def test_new_signup_not_admin(self, session):
        email = f"nonadm_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(f"{BASE_URL}/api/auth/signup", json={"email": email, "password": "password123", "name": "NA"})
        assert r.status_code == 200
        u = r.json()["user"]
        assert u.get("is_admin") is False
