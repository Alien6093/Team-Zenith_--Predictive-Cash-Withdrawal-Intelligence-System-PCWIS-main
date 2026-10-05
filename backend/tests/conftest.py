import os

# Throwaway secrets so the suite runs without a local .env file.
os.environ.setdefault("HMAC_SECRET_KEY", "test-only-hmac-secret")
os.environ.setdefault("JWT_SECRET", "test-only-jwt-secret")
