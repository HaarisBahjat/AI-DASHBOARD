# Environment Template

Use the development block for local work and the production block when deploying.
Keep real secrets in `.env` files, not in `.env.example`.

## Backend

```env
# Development
NODE_ENV=development
PORT=3004
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
MONGO_URI=
JWT_SECRET=<generate-a-32-byte-random-hex-string>
JWT_REFRESH_SECRET=<generate-a-different-32-byte-random-hex-string>
CORS_ORIGIN=http://localhost:5173
FRONTEND_ORIGIN=http://localhost:5173
BASE_URL=http://localhost:3004
STT_SERVICE_URL=http://localhost:8000
TTS_SERVICE_URL=http://localhost:5000
GEMINI_API_KEY=<your-gemini-api-key>
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
TWILIO_FROM_NUMBER=+10000000000
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
RAZORPAY_KEY_ID=<your-razorpay-key-id>
RAZORPAY_KEY_SECRET=<your-razorpay-key-secret>
RAZORPAY_WEBHOOK_SECRET=<your-razorpay-webhook-secret>
CRON_TIMEZONE=UTC
OVERDUE_CRON_EXPRESSION=0 0 * * *
REMINDER_CRON_EXPRESSION=0 * * * *
CRON_BATCH_LIMIT=50
MAX_SNOOZE_DAYS=30
MAX_CONCURRENT_CALLS=20
CALL_HISTORY_TURNS=6
GEMINI_RPM_LIMIT=12
GEMINI_MAX_RETRIES=3
DEBUG_PAYMENTS=false

# Production
NODE_ENV=production
PORT=3004
MONGODB_URI=mongodb+srv://<production-username>:<production-password>@<production-cluster>/<production-database>
MONGO_URI=
JWT_SECRET=<production-32-byte-random-hex-string>
JWT_REFRESH_SECRET=<different-production-32-byte-random-hex-string>
CORS_ORIGIN=https://your-frontend-domain
FRONTEND_ORIGIN=https://your-frontend-domain
BASE_URL=https://your-backend-domain
STT_SERVICE_URL=https://your-stt-service
TTS_SERVICE_URL=https://your-tts-service
GEMINI_API_KEY=<production-gemini-api-key>
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
TWILIO_ACCOUNT_SID=<production-twilio-account-sid>
TWILIO_AUTH_TOKEN=<production-twilio-auth-token>
TWILIO_FROM_NUMBER=<production-twilio-number>
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
RAZORPAY_KEY_ID=<production-razorpay-key-id>
RAZORPAY_KEY_SECRET=<production-razorpay-key-secret>
RAZORPAY_WEBHOOK_SECRET=<production-razorpay-webhook-secret>
CRON_TIMEZONE=UTC
OVERDUE_CRON_EXPRESSION=0 0 * * *
REMINDER_CRON_EXPRESSION=0 * * * *
CRON_BATCH_LIMIT=50
MAX_SNOOZE_DAYS=30
MAX_CONCURRENT_CALLS=20
CALL_HISTORY_TURNS=6
GEMINI_RPM_LIMIT=12
GEMINI_MAX_RETRIES=3
DEBUG_PAYMENTS=false
```

## Frontend

```env
# Development
VITE_API_BASE_URL=http://localhost:3004

# Production
VITE_API_BASE_URL=https://your-backend-domain
```

## Final Production Copy/Paste

Use this exact shape for your deployment `.env` files, replacing only the placeholder secrets and hostnames.

### Backend `.env`

```env
NODE_ENV=production
PORT=3004
MONGODB_URI=mongodb+srv://<production-username>:<production-password>@<production-cluster>/<production-database>
MONGO_URI=
JWT_SECRET=<production-32-byte-random-hex-string>
JWT_REFRESH_SECRET=<different-production-32-byte-random-hex-string>
CORS_ORIGIN=https://your-frontend-domain
FRONTEND_ORIGIN=https://your-frontend-domain
BASE_URL=https://your-backend-domain
STT_SERVICE_URL=https://your-stt-service
TTS_SERVICE_URL=https://your-tts-service
GEMINI_API_KEY=<production-gemini-api-key>
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
TWILIO_ACCOUNT_SID=<production-twilio-account-sid>
TWILIO_AUTH_TOKEN=<production-twilio-auth-token>
TWILIO_FROM_NUMBER=<production-twilio-number>
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
RAZORPAY_KEY_ID=<production-razorpay-key-id>
RAZORPAY_KEY_SECRET=<production-razorpay-key-secret>
RAZORPAY_WEBHOOK_SECRET=<production-razorpay-webhook-secret>
CRON_TIMEZONE=UTC
OVERDUE_CRON_EXPRESSION=0 0 * * *
REMINDER_CRON_EXPRESSION=0 * * * *
CRON_BATCH_LIMIT=50
MAX_SNOOZE_DAYS=30
MAX_CONCURRENT_CALLS=20
CALL_HISTORY_TURNS=6
GEMINI_RPM_LIMIT=12
GEMINI_MAX_RETRIES=3
DEBUG_PAYMENTS=false
```

### Frontend `.env`

```env
VITE_API_BASE_URL=https://your-backend-domain
```