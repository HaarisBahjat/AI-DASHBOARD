from fastapi import FastAPI, UploadFile, File
import whisper
import shutil
import os
import subprocess
from pathlib import Path
import gc
import torch

app = FastAPI()
print("Script started")

os.environ["PATH"] += os.pathsep + r"C:\Users\Dell\Downloads\ffmpeg-master-latest-win64-gpl-shared\ffmpeg-master-latest-win64-gpl-shared\bin"

# Try to load model with fallback options
model = None
try:
    # First try with CUDA
    print("Attempting to load Whisper model with CUDA...")
    model = whisper.load_model("small", device="cuda")
    print("CUDA model loaded successfully")
except Exception as cuda_error:
    print(f"CUDA loading failed: {cuda_error}")
    try:
        # Fallback to CPU
        print("Falling back to CPU...")
        model = whisper.load_model("tiny", device="cpu")  # Use smaller model for CPU
        print("CPU model (tiny) loaded successfully")
    except Exception as cpu_error:
        print(f"CPU loading also failed: {cpu_error}")
        model = None

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
            "-n",  # Don't overwrite
            output_file
        ]
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"Converted {input_file} to {output_file}")
            return True
        else:
            print(f"Conversion error: {result.stderr}")
            return False
    except Exception as e:
        print(f"FFmpeg conversion failed: {e}")
        return False

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    if not model:
        return {"error": "Transcription model not loaded. Check CUDA/CPU availability."}

    temp_input = None
    temp_mp3 = None

    try:
        # Determine original file extension
        file_ext = get_file_extension(file.filename)
        temp_input = f"temp_audio{file_ext}"
        temp_mp3 = "temp_audio.mp3"

        # Save uploaded file with correct extension
        print(f"Saving file: {file.filename} as {temp_input}")
        with open(temp_input, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Convert to MP3 if not already MP3
        if file_ext.lower() != ".mp3":
            print(f"Converting {file_ext} to MP3...")
            if convert_to_mp3(temp_input, temp_mp3):
                # Use converted MP3 for transcription
                audio_file = temp_mp3
                os.remove(temp_input)  # Clean up original
            else:
                # If conversion fails, try transcribing original file
                print("Conversion failed, attempting to transcribe original format...")
                audio_file = temp_input
        else:
            audio_file = temp_input

        print(f"Transcribing: {audio_file}")

        # Clear any existing GPU memory before transcription
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()

        # Transcribe with error handling
        result = model.transcribe(audio_file)

        # Clear GPU memory after transcription
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()

        text = result.get("text", "").strip()

        if not text:
            return {"error": "No speech detected in audio"}

        print(f"Transcription successful: {text[:100]}...")
        return {"text": text}

    except RuntimeError as e:
        if "out of memory" in str(e).lower():
            print("CUDA OOM detected, clearing memory and retrying with CPU...")
            # Clear GPU memory
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                gc.collect()

            # Try with CPU if we have a CUDA model
            try:
                cpu_model = whisper.load_model("tiny", device="cpu")
                result = cpu_model.transcribe(audio_file)
                text = result.get("text", "").strip()
                if text:
                    print("CPU fallback successful")
                    return {"text": text}
            except Exception as cpu_error:
                print(f"CPU fallback also failed: {cpu_error}")

            return {"error": "GPU out of memory. Try shorter audio clips or reduce model size."}
        else:
            return {"error": f"CUDA runtime error: {str(e)}"}

    except Exception as e:
        print(f"Transcription error: {str(e)}")
        return {"error": f"Transcription failed: {str(e)}"}

    finally:
        # Cleanup temp files
        for temp_file in [temp_input, temp_mp3]:
            if temp_file and os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                    print(f"Cleaned up: {temp_file}")
                except Exception as e:
                    print(f"Cleanup error: {e}")

@app.get("/health")
def health():
    gpu_available = torch.cuda.is_available()
    gpu_memory = None
    if gpu_available:
        try:
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3  # GB
        except:
            gpu_memory = "Unknown"

    return {
        "status": "healthy" if model else "unhealthy",
        "model_loaded": model is not None,
        "device": "cuda" if (model and hasattr(model, 'device') and 'cuda' in str(model.device)) else "cpu",
        "gpu_available": gpu_available,
        "gpu_memory_gb": gpu_memory
    }

@app.get("/")
def read_root():
    return {"message": "FastAPI transcription service running!", "model": "small/tiny", "device": "cuda/cpu"}
