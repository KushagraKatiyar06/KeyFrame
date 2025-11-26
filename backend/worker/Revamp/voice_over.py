import os
import tempfile
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import subprocess
import random
from pathlib import Path

# main audio duration extraction
def get_audio_duration_mutagen(path):
    try:
        from mutagen.mp3 import MP3
        audio = MP3(path)
        return audio.info.length
    except Exception:
        return None

# fallback audio duration extraction
def get_audio_duration_ffprobe(path):
    try:
        cmd = [
            'ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries',
            'stream=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return float(result.stdout.strip())
    except Exception:
        return None
    
def get_audio_duration(path):
    result = get_audio_duration_mutagen(path)

    if result:
        return result
    else:
        result = get_audio_duration_ffprobe(path)
        if result:
            return result
    
    print("Error recieving audio duration.")
    return None

# main tts generation method
def generate_voice_over(script_json, job_id, temp_dir):
    print("Beginning voice over generation...\n\n")
    
    polly = boto3.client(
        'polly',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'us-east-1')
    )

    slides = script_json.get('slides', [])
    slide_paths = []
    slide_durations = []

    # randomize voices
    print("1. Setting voice...")

    VOICE_IDS = ['Joanna', 'Matthew', 'Kendra', 'Amy', 'Justin']
    random_voice = random.choice(VOICE_IDS)

    print("2. Iterating through narration scripts for each slide (polly api calls)... \n")
    os.makedirs(temp_dir, exist_ok=True) 

    try:

        # loop through json to get narration_prompt for each slide
        for i , slide in enumerate(slides):
            narration = slide.get('narration_prompt', '')
            print(f"{i}. Polly: narrating slide {i + 1}/{len(slides)}... ({len(narration)} chars)")

            # api call to amazon polly
            response = polly.synthesize_speech(
                Text = narration,
                TextType = 'text',
                OutputFormat = 'mp3',
                VoiceId = random_voice, 
                Engine='standard'
            )

            audio_stream = response.get('AudioStream')
            if not audio_stream:
                raise Exception(f'No audio stream returned for slide {i}')
        
            slide_mp3 = os.path.join(temp_dir, f'slide_{i}.mp3')
            with open(slide_mp3, 'wb') as f:
                f.write(audio_stream.read())

            slide_paths.append(slide_mp3)

            # measure duration
            duration = get_audio_duration(slide_mp3)
            if duration is None:
                raise Exception(f"Could not determine duration for {slide_mp3}")
        
            slide_durations.append(float(duration))
            print(f"Slide {i+1} duration: {duration:.2f}s")

        # concatenate slide mp3s into one file using ffmpeg concat demuxer
        print("\n3. Concatenating slide mp3s into one...")

        concat_list = os.path.join(temp_dir, 'audio_concat.txt')
        with open(concat_list, 'w', encoding='utf-8') as f:
            for p in slide_paths:
                f.write(f"file '{p}'\n")

        full_audio = os.path.join(temp_dir, 'voiceover_full.mp3')
        FFMPEG = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'bin', 'ffmpeg.exe'))

        cmd = [
            FFMPEG,
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', concat_list,
            '-c', 'copy',
            full_audio
        ]

        print("Concatenating slide audio into full voiceover...")
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        # final sanity check
        print("4. Final tts checks...")

        if not os.path.exists(full_audio):
            raise Exception("Failed to create concatenated voiceover file")

        total = sum(slide_durations)
        print(f"Voiceover created: {full_audio} (total {total:.2f}s)")

        return full_audio, slide_durations

    except (BotoCoreError, ClientError) as e:
        print(f"Polly error: {e}")
        raise
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error while concatenating audio: {e.stderr}")
        raise
    except Exception as e:
        print(f"Unexpected error in voice_over: {e}")
        raise


