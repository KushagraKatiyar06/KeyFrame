#This will run the full ai pipeline
import os
from celery import Task
import database
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
from concurrent.futures import ThreadPoolExecutor   

#load environment variables for utility functions
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

    try:
        print(f"Starting job {job_id}-Style:{style}")
        database.update_job_status(job_id,'processing')

        # step 1: generate the script using openai
        print(f"Job {job_id}: Generating script...")
        script_data = script.generate_script(prompt,style)

        # step 2 & 3: generate images and voiceover IN PARALLEL
        print(f"Job {job_id}: Generating images and voiceover in parallel...")

        image_paths = None
        audio_path = None
        measured_timings = None

        def generate_images_task():
            return image_generation.generate_images(script_data, job_id, style, temp_dir)

        def generate_voiceover_task():
            return voice_over.generate_voice_over(script_data, job_id, temp_dir)

        # Run both tasks in parallel
        with ThreadPoolExecutor(max_workers=2) as executor:
            future_images = executor.submit(generate_images_task)
            future_voice = executor.submit(generate_voiceover_task)

            # Wait for both to complete
            image_paths = future_images.result()
            audio_path, measured_timings = future_voice.result()

        script_data['timings'] = measured_timings
        print(f"Job {job_id}: Parallel generation complete!")

        # step 4: stitch everything together with ffmpeg
        print(f"Job {job_id}: Assembling video...")
        video_path = assemble.stitch_video(image_paths, audio_path, script_data['timings'], job_id, temp_dir)
        
        # step 5: Upload to Cloudflare R2
        print(f"Job {job_id}: Uploading to Cloudflare R2...")
        video_url, thumbnail_url = storage.upload_files(job_id, video_path, temp_dir)
        
        print(f"Video URL: {video_url}")
        
        # step 6: mark job as complete in database
        database.update_job_completed(job_id, video_url, thumbnail_url)
        
        print(f"Job {job_id} completed successfully!")
        return {
            'status': 'success',
            'job_id': job_id,
            'video_url': video_url,
            'thumbnail_url': thumbnail_url
        }
        

    except Exception as e:
        print(f"Job {job_id} failed with error: {str(e)}")
        database.update_job_status(job_id, 'failed')
        raise e