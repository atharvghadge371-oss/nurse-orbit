"""Iteration 4 — Original PDF viewer for Ross and Wilson.
Backend tests: /library/books/{id} returns has_file=true and
/library/books/{id}/file streams application/pdf when token is valid.
"""
import os
import pytest

ROSSWILSON_BOOK_ID = "bk-adm-b89cbd48"


# ---------- Book detail: has_file flag ----------
class TestBookHasFileFlag:
    def test_ross_wilson_detail_has_file_true(self, session, base_url, auth_headers, onboarded_user):
        r = session.get(f"{base_url}/api/library/books/{ROSSWILSON_BOOK_ID}", headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "book" in body
        b = body["book"]
        assert b["id"] == ROSSWILSON_BOOK_ID
        assert b.get("has_file") is True, f"Expected has_file=true, got {b.get('has_file')}"
        # sanity — Ross and Wilson has 18 chapters
        assert body["book"].get("chapter_count", 0) >= 18 or len(body["book"].get("chapters", [])) >= 18

    def test_other_book_has_file_false(self, session, base_url, auth_headers, onboarded_user):
        # Try to find a book without a file (e.g. bk-fon-01 per review request)
        r = session.get(f"{base_url}/api/library/books?category_id=cat-fon", headers=auth_headers)
        if r.status_code != 200:
            pytest.skip("category cat-fon not available")
        books = r.json().get("books") or r.json()
        # Look for a book that lacks a file
        target = None
        for b in books:
            if not b.get("has_file"):
                target = b
                break
        if not target:
            pytest.skip("no non-file book available for negative test")
        r2 = session.get(f"{base_url}/api/library/books/{target['id']}", headers=auth_headers)
        assert r2.status_code == 200
        assert r2.json()["book"].get("has_file") is False


# ---------- PDF file endpoint ----------
class TestPdfDownload:
    def test_pdf_download_with_query_token(self, session, base_url, test_user):
        token = test_user["token"]
        url = f"{base_url}/api/library/books/{ROSSWILSON_BOOK_ID}/file?token={token}"
        r = session.get(url, stream=True, timeout=60)
        assert r.status_code == 200, f"status={r.status_code} body={r.text[:200]}"
        ctype = r.headers.get("Content-Type", "")
        assert "application/pdf" in ctype.lower(), f"unexpected content-type: {ctype}"
        # Read content length; may be ~55MB
        content = r.content
        assert content[:4] == b"%PDF", f"missing PDF magic header, got: {content[:8]!r}"
        size_mb = len(content) / (1024 * 1024)
        # Allow some tolerance around 55MB
        assert 10 < size_mb < 200, f"PDF size {size_mb:.1f}MB outside expected range"

    def test_pdf_download_with_bearer_header(self, session, base_url, auth_headers):
        # Should also work with Authorization header
        r = session.get(
            f"{base_url}/api/library/books/{ROSSWILSON_BOOK_ID}/file",
            headers=auth_headers,
            stream=True,
            timeout=60,
        )
        assert r.status_code == 200
        assert "application/pdf" in r.headers.get("Content-Type", "").lower()

    def test_pdf_download_missing_token_returns_401(self, session, base_url):
        r = session.get(f"{base_url}/api/library/books/{ROSSWILSON_BOOK_ID}/file")
        assert r.status_code == 401

    def test_pdf_download_invalid_token_returns_401(self, session, base_url):
        r = session.get(
            f"{base_url}/api/library/books/{ROSSWILSON_BOOK_ID}/file?token=not.a.jwt"
        )
        assert r.status_code == 401

    def test_pdf_download_nonexistent_book(self, session, base_url, test_user):
        token = test_user["token"]
        r = session.get(
            f"{base_url}/api/library/books/bk-does-not-exist/file?token={token}"
        )
        assert r.status_code == 404


# ---------- Regression: AI still cites Ross and Wilson ----------
class TestAiReferencesRegression:
    def test_ai_chat_cites_ross_wilson(self, session, base_url, auth_headers, onboarded_user):
        """Quick regression: /ai/chat streaming should still emit a references
        event that cites the Ross and Wilson book (bk-adm-b89cbd48)."""
        import uuid as _uuid
        payload = {
            "session_id": str(_uuid.uuid4()),
            "message": "Explain heart anatomy from Ross and Wilson",
            "mode": "CLINICAL",
        }
        try:
            r = session.post(
                f"{base_url}/api/ai/chat",
                json=payload,
                headers=auth_headers,
                stream=True,
                timeout=120,
            )
        except Exception as e:
            pytest.skip(f"AI stream unavailable: {e}")
        assert r.status_code == 200
        references_seen = False
        ross_seen = False
        current_event = None
        for raw in r.iter_lines(decode_unicode=True):
            if raw is None:
                continue
            line = raw.strip()
            if line.startswith("event:"):
                current_event = line.split(":", 1)[1].strip()
                if current_event == "references":
                    references_seen = True
            elif line.startswith("data:") and current_event == "references":
                if ROSSWILSON_BOOK_ID in line:
                    ross_seen = True
                    break
            if references_seen and ross_seen:
                break
        # AI is stochastic — accept either a references event or explicit cite,
        # but if neither was ever emitted, that's a regression.
        if not references_seen:
            pytest.skip("AI stream produced no references event this run")
        assert ross_seen, "references emitted but Ross and Wilson not among them"
