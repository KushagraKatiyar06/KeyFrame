#This will run the full ai pipeline
import os
from celery import Task
import database
import redis as redis_py
import json
import script
import image_generation
import voice_over
import assemble
import storage
from app import app
from dotenv import load_dotenv
import subprocess 
import tempfile 
import shutil   

# load environment variables for utility functions
load_dotenv() 
    
@app.task(bind=True)
def process_video_job(self,job_data):
    """
    Main task that processes a video generation job
    Takes job_data dict with: { id, prompt, style }
    """
    job_id=job_data['id']
    prompt =job_data['prompt']
    style=job_data['style']
    

    audio_path = None
    video_path = None
    
    temp_dir = os.path.join(tempfile.gettempdir(), f'keyframe_job_{job_id}')
    os.makedirs(temp_dir, exist_ok=True)
    print(f"Created job temp directory: {temp_dir}")
    # -----------------------------------------------

    # setup redis client for publishing progress (non-blocking best-effort)
    redis_client = None
    try:
        REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
        redis_client = redis_py.from_url(REDIS_URL, decode_responses=True)
    except Exception as e:
        print(f"Warning: could not connect to redis for progress updates: {e}")

    def publish_progress(jid, status, progress, video_url=None, thumbnail_url=None):
        payload = {
            'job_id': jid,
            'status': status,
            'progress': str(progress)
        }
        if video_url:
            payload['video_url'] = video_url
        if thumbnail_url:
            payload['thumbnail_url'] = thumbnail_url
        try:
            if redis_client:
                key = f"job:{jid}"
                # write hash fields
                redis_client.hset(key, mapping=payload)
                # publish to channel
                redis_client.publish(f"job_events:{jid}", json.dumps(payload))
        except Exception as e:
            print(f"Failed to publish progress to redis: {e}")

    try:
        print(f"Starting job {job_id}-Style:{style}")
        # best-effort: update DB if available, and publish redis progress
        try:
            database.update_job_status(job_id,'processing')
        except Exception:
            print("DB not available or update failed; continuing without DB")
        publish_progress(job_id, 'processing', 5)

        # step 1: generate the script using openai
        print(f"Job {job_id}: Generating script...")
        script_data = script.generate_script(prompt,style)
        publish_progress(job_id, 'script_generated', 15)
        
        # step 2: generate images for each slide using dynamic models
        print(f"Job {job_id}: Generating images...")
        # MODIFIED: Pass temp_dir and style
        image_paths = image_generation.generate_images(script_data, job_id, style, temp_dir)
        publish_progress(job_id, 'images_generated', 40)
        
        # step 3: ENABLE AMAZON POLLY (per-slide synthesis)
        print(f"Job {job_id}: Generating voiceover with Polly (per-slide)...")

        audio_path, measured_timings = voice_over.generate_voice_over(script_data, job_id, temp_dir)
        publish_progress(job_id, 'voice_generated', 65)
        script_data['timings'] = measured_timings

        # step 4: stitch everything together with ffmpeg
        print(f"Job {job_id}: Assembling video...")
        video_path = assemble.stitch_video(image_paths, audio_path, script_data['timings'], job_id, temp_dir)
        publish_progress(job_id, 'assembled', 90)
        
        # step 5: KEEP MOCK UPLOAD (Skipping R2)
        print(f"Job {job_id}: Skipping upload (testing locally, Polly enabled)...")
        video_url = f"file://{video_path}"
        thumbnail_url = f"file://{video_path}"

        print(f"Video URL: {video_url}")

        # best-effort DB update
        try:
            database.update_job_completed(job_id, video_url, thumbnail_url)
        except Exception:
            print("DB update for completion failed; continuing")

        # publish final progress
        publish_progress(job_id, 'done', 100, video_url=video_url, thumbnail_url=thumbnail_url)

        print(f"Job {job_id} completed successfully!")
        return {
            'status': 'success',
            'job_id': job_id,
            'video_url': video_url,
            'thumbnail_url': thumbnail_url
        }
        

    except Exception as e:
        print(f"Job {job_id} failed with error: {str(e)}")
        try:
            database.update_job_status(job_id, 'failed')
        except Exception:
            print("DB update to failed skipped")
        publish_progress(job_id, 'failed', 0)
        raise e