from fastapi import FastAPI, UploadFile, File
import whisper
import shutil
import os
import subprocess
from pathlib import Path

app = FastAPI()
print("Loading Whisper model on CPU...")

# Force CPU usage to avoid CUDA memory issues
model = whisper.load_model("tiny", device="cpu")
print("CPU model loaded successfully")

def get_file_extension(filename: str) -> str:
    """Extract file extension from filename"""
    return Path(filename).suffix or ".webm"

def convert_to_mp3(input_file: str, output_file: str) -> bool:
    """Convert audio file to MP3 using ffmpeg"""
    try:
        command = [
            "ffmpeg",
            "-i", input_file,
            "-q:a", "9",
            "-n",
            output_file
        ]
        result = subprocess.run(command, capture_output=True, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"FFmpeg conversion failed: {e}")
        return False

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    temp_input = None
    temp_mp3 = None

    try:
        # Determine original file extension
        file_ext = get_file_extension(file.filename)
        temp_input = f"temp_audio{file_ext}"
        temp_mp3 = "temp_audio.mp3"

        # Save uploaded file
        with open(temp_input, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Convert to MP3 if needed
        if file_ext.lower() != ".mp3":
            if convert_to_mp3(temp_input, temp_mp3):
                audio_file = temp_mp3
                os.remove(temp_input)
            else:
                audio_file = temp_input
        else:
            audio_file = temp_input

        print(f"Transcribing on CPU: {audio_file}")
        result = model.transcribe(audio_file)
        text = result.get("text", "").strip()

        if not text:
            return {"error": "No speech detected in audio"}

        return {"text": text}

    except Exception as e:
        print(f"Transcription error: {str(e)}")
        return {"error": f"Transcription failed: {str(e)}"}

    finally:
        # Cleanup
        for temp_file in [temp_input, temp_mp3]:
            if temp_file and os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except:
                    pass

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": True,
        "device": "cpu",
        "model": "tiny"
    }

@app.get("/")
def read_root():
    return {"message": "FastAPI transcription service (CPU only)", "model": "tiny", "device": "cpu"}
