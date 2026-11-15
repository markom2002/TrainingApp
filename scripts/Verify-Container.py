"""Smoke-test the disposable Compose stack; never run against personal data."""
import json
import ssl
import urllib.request
from http.cookiejar import CookieJar

base = "https://localhost:8443"
cookies = CookieJar()
# Caddy's temporary local CA is intentionally not installed on CI runners.
opener = urllib.request.build_opener(
    urllib.request.HTTPSHandler(context=ssl._create_unverified_context()),
    urllib.request.HTTPCookieProcessor(cookies),
)


def request(path, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(base + path, data=data,
                                 headers={"Content-Type": "application/json"})
    with opener.open(req, timeout=20) as response:
        return response.read().decode(), response.headers


html, _ = request("/login")
assert "<app-root>" in html, "Production Angular shell was not packaged"
manifest, _ = request("/manifest.webmanifest")
assert json.loads(manifest)["name"] == "\U0001f3cb\ufe0f"
credentials = {"email": "container-smoke@example.test", "password": "ContainerTest123!"}
request("/api/auth/register", {**credentials, "gender": "Other"})
body, headers = request("/api/auth/login", credentials)
assert json.loads(body)["token"]
assert any(cookie.secure for cookie in cookies), "Refresh cookie must stay Secure"
refreshed, _ = request("/api/auth/refresh", {})
assert json.loads(refreshed)["token"], "HTTPS proxy must preserve refresh cookies"
print("PASS: production shell, mobile manifest, registration, login and Secure refresh cookie")
