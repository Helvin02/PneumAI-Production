# PneumAI Backend Migration - Remaining Tasks

## ✅ COMPLETED (This Session)

### Backend Refactoring
1. **`app/database.py`** - Refactored to support normalized schema
   - Added `get_patient_by_email()` for authentication
   - Updated `create_patient()` to insert into `users` table first, then `patients` table
   - Updated `get_patient()` to JOIN `users` and `patients` tables
   - Updated `create_doctor()` to insert into `users` table first, then `doctors` table
   - Updated `get_doctor()` and `get_doctor_by_email()` to JOIN tables
   - All functions now use transactional inserts with proper error handling

2. **`app/routers/patients.py`** - Updated patient registration
   - Added password hashing using `hash_password()` from `app.utils.security`
   - Password hash is now included in `patient_data` before calling `create_patient()`

3. **`app/routers/auth.py`** - Implemented patient login
   - Patient login now works (previously returned 501)
   - Uses `get_patient_by_email()` to fetch patient data
   - Verifies password hash from `users` table
   - Creates session and returns `LoginResponse` with `session_token`

### Frontend Integration
4. **`src/services/api.js`** - NEW FILE
   - Centralized API service for authentication and user management
   - Functions: `login()`, `logout()`, `getCurrentUser()`, `registerPatient()`, `registerDoctor()`, `getPatient()`, `getDoctor()`
   - Uses relative API paths (empty `API_BASE_URL`) for same-origin deployment

5. **`src/PatientRegistration.jsx`** - Updated to use real backend
   - Imports `api` from `./services/api`
   - `handleSubmit` is now `async` and calls `api.registerPatient()`
   - Combines `firstName` + `lastName` into `name` field
   - Handles API errors and displays them to user

6. **`src/Login.jsx`** - Updated to use real backend
   - `handleLoginSubmit` is now `async` and calls `api.login()`
   - Maps API response to `unifiedDataManager` format for backward compatibility
   - Stores `sessionToken` in user object
   - Still calls `createSession()` to maintain localStorage compatibility with Dashboard

### Build & Environment
7. **Frontend Build** - Successfully builds
   - Moved `.env.production` to `.env.production.bak` to avoid dotenv-expand circular reference errors
   - Build completes with warnings (non-blocking)
   - Output: `build/` directory ready for deployment

---

## 🔧 REMAINING TASKS

### 1. Fix `.env.production` Circular References
**File:** `/Users/monskiemonmon427/PneumAI-Production/.env.production.bak`

**Problem:** Lines 18, 29, 36 have circular references:
```bash
DATABASE_URL=${DATABASE_URL}  # Line 18
REDIS_URL=${REDIS_URL}        # Line 29
SECRET_KEY=${SECRET_KEY}      # Line 36
```

**Solution:** Remove these lines entirely. Railway will inject these variables automatically. The file should NOT try to reference itself.

**Action:**
```bash
# Edit .env.production.bak and remove lines 18, 29, 36
# Then rename back:
mv .env.production.bak .env.production
```

---

### 2. Verify Upload Functionality
**Status:** Unknown (user reported "upload failed" earlier)

**Possible Causes:**
- ✅ API URL issue (FIXED - `yoloApi.js` now uses relative paths)
- ❓ Backend processing timeout
- ❓ File permissions on `/tmp/uploads`
- ❓ YOLO model loading issue

**Test Steps:**
1. Start backend: `cd /Users/monskiemonmon427/PneumAI-Production && uvicorn app.main:app --reload`
2. Open frontend: `http://localhost:3000` (or serve the build)
3. Register a new patient account
4. Login as patient
5. Try uploading a CT scan image
6. Check backend logs for errors

**Files to Check:**
- `app/routers/scans.py` - `/api/v1/scans/analyze` endpoint
- `app/services/yolo_service.py` - Model loading and inference
- `app/services/file_manager.py` - File saving logic

---

### 3. Migrate Dashboard to Use Real API
**Status:** Not started

**Current State:** Dashboard components still use `unifiedDataManager.js` (localStorage)

**Files to Update:**
- `src/components/PatientDashboard.jsx`
- `src/components/DoctorDashboard.jsx`
- `src/components/AdminDashboard.jsx`

**Required API Endpoints (Backend):**
- `GET /api/v1/patients/{id}/scans` - Get patient's scans
- `GET /api/v1/patients/{id}/appointments` - Get patient's appointments
- `GET /api/v1/doctors/{id}/patients` - Get doctor's patients
- `GET /api/v1/scans/{id}` - Get scan details

**Action:**
1. Add these endpoints to `app/routers/` (scans.py, appointments.py, etc.)
2. Update `src/services/api.js` to include these functions
3. Update Dashboard components to call API instead of `unifiedDataManager`

---

### 4. Deploy to Railway
**Status:** Ready to deploy (after fixing .env.production)

**Pre-Deployment Checklist:**
- [x] Dockerfile is multi-stage (builds React + runs FastAPI)
- [x] `railway.toml` exists
- [ ] Fix `.env.production` circular references
- [x] Frontend build works
- [ ] Test locally with Docker build

**Railway Setup:**
1. Create new project on Railway
2. Add PostgreSQL service
3. Connect GitHub repo
4. Set environment variables:
   - `DATABASE_URL` (auto-injected by Railway PostgreSQL)
   - `SECRET_KEY` (generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
   - `PORT` (auto-injected by Railway)
5. Deploy
6. Run database initialization:
   - Connect to Railway PostgreSQL
   - Execute `database/init/01_schema.sql`

**Test After Deployment:**
1. Visit Railway URL
2. Check static assets load (`/assets/logo-medic.jpg`)
3. Register new patient
4. Login
5. Upload CT scan
6. Verify results display

---

### 5. Database Schema Alignment Issues
**Status:** Partially resolved

**Remaining Concerns:**
- **Patient/Doctor IDs:** Backend now returns integer IDs (from SERIAL), but frontend might expect string IDs like "PAT-123"
- **Name Splitting:** Backend splits `name` into `first_name`/`last_name`, but this is basic (only splits on first space)
- **Missing Fields:** Some Pydantic schemas might not match DB schema (e.g., `PatientResponse` expects `id: str` but DB returns `int`)

**Action:**
1. Update Pydantic schemas in `app/models/schemas.py`:
   - Change `PatientResponse.id` from `str` to `int` (or use `Union[str, int]` for compatibility)
   - Same for `DoctorResponse.id`
2. Test registration/login flow to ensure ID types work

---

### 6. Session Management
**Status:** Hybrid (in-memory + localStorage)

**Current State:**
- Backend: `app/routers/auth.py` uses in-memory `active_sessions` dict
- Frontend: `unifiedDataManager.js` stores session in `localStorage`

**Problem:** 
- Backend sessions are lost on restart
- No session validation between frontend and backend

**Recommended Solution:**
1. Store sessions in Redis (Railway provides Redis)
2. Or use JWT tokens instead of session tokens
3. Update `api.js` to send `Authorization: Bearer {token}` header on all requests
4. Update backend endpoints to validate session token

---

## 📝 QUICK START FOR NEXT SESSION

```bash
# 1. Fix .env.production
cd /Users/monskiemonmon427/PneumAI-Production
# Remove lines 18, 29, 36 from .env.production.bak
mv .env.production.bak .env.production

# 2. Test locally
# Terminal 1: Start backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Serve frontend build
npx serve -s build -l 3000

# 3. Test user flow
# - Open http://localhost:3000
# - Register patient
# - Login
# - Upload scan
# - Check for errors

# 4. Deploy to Railway
# - Push to GitHub
# - Railway auto-deploys
# - Initialize database with 01_schema.sql
# - Test on Railway URL
```

---

## 🐛 KNOWN ISSUES

1. **`.env.production` circular references** - Causes build failures
2. **Upload functionality** - Needs verification (user reported "upload failed")
3. **ID type mismatch** - Backend returns `int`, some frontend code expects `str`
4. **Session persistence** - Backend uses in-memory sessions (lost on restart)
5. **Dashboard data** - Still uses localStorage, not real API

---

## 📚 KEY FILES MODIFIED

### Backend
- `app/database.py` - Core database functions refactored
- `app/routers/auth.py` - Patient login implemented
- `app/routers/patients.py` - Password hashing added

### Frontend
- `src/services/api.js` - NEW centralized API service
- `src/Login.jsx` - Uses `api.login()`
- `src/PatientRegistration.jsx` - Uses `api.registerPatient()`

### Config
- `.env.production` - Needs circular reference fix

---

## 🎯 PRIORITY ORDER

1. **HIGH:** Fix `.env.production` and test build
2. **HIGH:** Verify upload functionality works
3. **MEDIUM:** Deploy to Railway and test end-to-end
4. **MEDIUM:** Migrate Dashboard to use real API
5. **LOW:** Implement proper session management (Redis/JWT)
6. **LOW:** Fix ID type consistency

---

## 💡 NOTES

- The backend now correctly uses the normalized schema (`users` + `patients`/`doctors`)
- Frontend authentication is connected to the real backend
- `unifiedDataManager.js` is still used for Dashboard data (needs migration)
- Build succeeds but `.env.production` must be fixed for production deployment
- All password hashing uses bcrypt via `app.utils.security`
