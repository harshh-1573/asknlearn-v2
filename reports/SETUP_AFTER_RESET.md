# AskNLearn Setup After PC Reset

This project has three runnable parts:

- React/Vite frontend in `frontend`
- Node.js/Express backend in `backend-node`
- Python/FastAPI AI backend in `backend-python`

## 1. Detected Tech Stack

- Node.js + Express for application APIs, auth, quiz, profile, library, and dashboard routes
- React 19 + Vite + Tailwind CSS for frontend
- Python FastAPI for AI processing, document reading, OCR, Gemini/OpenAI integration, and audio/video transcription
- MySQL for persistent data
- Google Gemini API and optional OpenAI API for AI generation
- Tesseract OCR for image/screenshot text extraction
- faster-whisper + PyTorch for local audio/video transcription

## 2. System Requirements

- Windows 10/11
- Node.js 22.x LTS recommended. The project was verified here with Node.js 22.18.0
- npm 10.x recommended. The project was verified here with npm 10.9.3
- Python 3.10 or 3.11 recommended
- MySQL Server 8.0+
- Tesseract OCR installed and available on PATH for image OCR
- FFmpeg installed and available on PATH for robust audio/video decoding
- Optional NVIDIA GPU with CUDA if you want faster Whisper transcription

## 3. Environment Files

Create `backend-node/.env` from `backend-node/.env.example`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=quiz_system
JWT_SECRET=replace_with_a_long_random_secret
PYTHON_API_URL=http://127.0.0.1:8000
```

Create `backend-python/.env` from `backend-python/.env.example`:

```env
GEMINI_API_KEY=your_rotated_gemini_api_key_here
GOOGLE_API_KEY=
OPENAI_API_KEY=
WHISPER_MODEL_SIZE=small
WHISPER_DEVICE=cpu
```

If you have an NVIDIA GPU and a working CUDA/PyTorch setup, set:

```env
WHISPER_DEVICE=cuda
```

## 4. Install Dependencies

Install Node backend dependencies:

```powershell
cd C:\Users\harsh\OneDrive\Desktop\project\asknlearn-v2\backend-node
npm ci
```

Install frontend dependencies:

```powershell
cd C:\Users\harsh\OneDrive\Desktop\project\asknlearn-v2\frontend
npm ci
```

Install Python backend dependencies:

```powershell
cd C:\Users\harsh\OneDrive\Desktop\project\asknlearn-v2\backend-python
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If Python 3.11 is not installed, use Python 3.10:

```powershell
py -3.10 -m venv .venv
```

## 5. Database Setup

1. Install and start MySQL Server 8.0.
2. Create a database named `quiz_system`.
3. Update `backend-node/.env` with your local MySQL username and password.
4. Start the Node backend once. It runs startup migrations that add required profile, XP, difficulty, and topic-performance fields if they do not already exist.

Minimum database command:

```sql
CREATE DATABASE quiz_system;
```

If you already have an exported database backup, import it into `quiz_system` before starting the app.

## 6. Run The Project

Terminal 1, Python AI backend:

```powershell
cd C:\Users\harsh\OneDrive\Desktop\project\asknlearn-v2\backend-python
.\.venv\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 8000
```

Terminal 2, Node backend:

```powershell
cd C:\Users\harsh\OneDrive\Desktop\project\asknlearn-v2\backend-node
npm start
```

If `npm start` is not configured, run:

```powershell
node index.js
```

Terminal 3, frontend:

```powershell
cd C:\Users\harsh\OneDrive\Desktop\project\asknlearn-v2\frontend
npm run dev
```

Then open:

```text
http://localhost:5173
```

## 7. Quick Verification

Check Node backend:

```powershell
curl http://localhost:5000/api/diagnostics
```

Check Python backend:

```powershell
curl http://localhost:8000/docs
```

Check frontend:

```powershell
cd C:\Users\harsh\OneDrive\Desktop\project\asknlearn-v2\frontend
npm run lint
```

## 8. Important Notes

- Do not commit `.env` files. They contain secrets and are already ignored by `.gitignore`.
- The leaked Gemini API key should be rotated in Google Cloud Console before using this setup again.
- For Tesseract on Windows, install it and add its install folder to PATH. If OCR fails, verify `tesseract --version`.
- For video/audio support, verify FFmpeg with `ffmpeg -version`.
- PyTorch GPU installation may require a special command from the PyTorch website depending on your CUDA version. The pinned `torch==2.5.1` line is suitable as a reproducible baseline, but CUDA users may need the CUDA-specific wheel.
- If Vite or npm behaves strangely after reinstall, delete `node_modules` and rerun `npm ci` in that specific folder.
