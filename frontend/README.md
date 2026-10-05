# PCWIS dashboard

React + TypeScript + Vite front end for the PCWIS investigator console. It talks to the
FastAPI backend in `../backend` (default `http://127.0.0.1:8000`).

```bash
cp .env.example .env     # set VITE_API_URL and VITE_RECAPTCHA_SITE_KEY
npm install
npm run dev              # http://localhost:5173
npm run build            # production bundle in dist/
```
