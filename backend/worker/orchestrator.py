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
    
    # Use a stable output directory for each job so assets and final video are colocated.
    output_base = os.environ.get('KEYFRAME_OUTPUT_DIR') or (r'C:\tmp' if os.name == 'nt' else '/tmp')
    os.makedirs(output_base, exist_ok=True)

    job_dir = os.path.join(output_base, f'keyframe_job_{job_id}')
    os.makedirs(job_dir, exist_ok=True)
    temp_dir = job_dir
    print(f"Created job directory: {job_dir}")
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
        # Pass the job_dir so images are written into the job folder
        image_paths = image_generation.generate_images(script_data, job_id, style, temp_dir)

        # Determine a thumbnail from the 5th image (index 4) if available, else fallback to first
        thumbnail_src = None
        if image_paths:
            if len(image_paths) >= 5:
                thumbnail_src = image_paths[4]
            else:
                thumbnail_src = image_paths[0]

        # copy thumbnail into backend public folder so frontend can show it while generation continues
        BACKEND_URL = os.getenv('BACKEND_URL', f"http://localhost:{os.getenv('PORT','3001')}")
        try:
            # public videos dir inside backend/api/public/videos/{job_id}
            public_videos_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'api', 'public', 'videos', job_id))
            os.makedirs(public_videos_dir, exist_ok=True)
            thumbnail_url = None
            if thumbnail_src and os.path.exists(thumbnail_src):
                # name the thumbnail as requested: thumbnail{jobId}.jpg
                thumb_name = f'thumbnail{job_id}.jpg'
                thumb_dest = os.path.join(public_videos_dir, thumb_name)
                shutil.copy2(thumbnail_src, thumb_dest)
                thumbnail_url = f"{BACKEND_URL}/public/videos/{job_id}/{thumb_name}"
        except Exception as e:
            print(f"Could not copy thumbnail to public folder: {e}")

        publish_progress(job_id, 'images_generated', 40, thumbnail_url=thumbnail_url)
        
        # step 3: ENABLE AMAZON POLLY (per-slide synthesis)
        print(f"Job {job_id}: Generating voiceover with Polly (per-slide)...")

        audio_path, measured_timings = voice_over.generate_voice_over(script_data, job_id, temp_dir)
        publish_progress(job_id, 'voice_generated', 65)
        script_data['timings'] = measured_timings

        # step 4: stitch everything together with ffmpeg
        print(f"Job {job_id}: Assembling video...")
        video_path = assemble.stitch_video(image_paths, audio_path, script_data['timings'], job_id, temp_dir)
        publish_progress(job_id, 'assembled', 90)

        # step 5: copy final video into public videos folder so frontend can stream it via HTTP
        try:
            public_videos_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'api', 'public', 'videos', job_id))
            os.makedirs(public_videos_dir, exist_ok=True)
            # name the final video exactly as requested: final_video{jobId}.mp4
            final_name = f'final_video{job_id}.mp4'
            final_dest = os.path.join(public_videos_dir, final_name)
            shutil.copy2(video_path, final_dest)
            video_url = f"{BACKEND_URL}/public/videos/{job_id}/{final_name}"
            # ensure thumbnail_url is set if we didn't set it earlier
            if 'thumbnail_url' not in locals() or not thumbnail_url:
                # if images exist, try to copy a fallback thumbnail
                if image_paths:
                    fallback_thumb = image_paths[0]
                    try:
                        thumb_name = f'thumbnail{job_id}.jpg'
                        thumb_dest = os.path.join(public_videos_dir, thumb_name)
                        shutil.copy2(fallback_thumb, thumb_dest)
                        thumbnail_url = f"{BACKEND_URL}/public/videos/{job_id}/{thumb_name}"
                    except Exception:
                        thumbnail_url = None
            print(f"Copied final video to public folder: {final_dest}")
            # publish that the assembled video is now available over HTTP
            try:
                publish_progress(job_id, 'assembled', 90, video_url=video_url, thumbnail_url=thumbnail_url)
            except Exception:
                pass
        except Exception as e:
            print(f"Could not copy final video to public folder: {e}")
            video_url = f"file://{video_path}"
            if not thumbnail_url:
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