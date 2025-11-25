#This will run the full ai pipeline
import os
from celery import Task
import database
import script
import images_generated
import voice_over
import assemble
import storage
from app import app
from dotenv import load_dotenv
import subprocess # Keep subprocess for the mock failure handling

# load environment variables for utility functions
load_dotenv() 

# --- REMOVED: The create_silent_audio function is deleted ---
    
@app.task(bind=True)
def process_video_job(self,job_data):
    """
    Main task that processes a video generation job
    Takes job_data dict with: { id, prompt, style }
    """
    job_id=job_data['id']
    prompt =job_data['prompt']
    style=job_data['style']
    
    # Define audio_path outside try/except for cleanup
    audio_path = None
    video_path = None
    
    try:
        print(f"Starting job {job_id}-Style:{style}")
        #updates status to processing
        database.update_job_status(job_id,'processing')

        # step 1:generate the script using openai
        print(f"Job {job_id}: Generating script...")
        script_data = script.generate_script(prompt,style)
        
        # step 2:generate images for each slide using nebius
        print(f"Job {job_id}: Generating images...")
        image_paths = images_generated.generate_images(script_data, job_id)
        
        # step 3: ENABLE AMAZON POLLY (per-slide synthesis)
        print(f"Job {job_id}: Generating voiceover with Polly (per-slide)...")
        audio_path, measured_timings = voice_over.generate_voice_over(script_data, job_id)

        # override script timings with measured durations so images match speech
        script_data['timings'] = measured_timings

        # step 4: stitch everything together with ffmpeg
        print(f"Job {job_id}: Assembling video...")
        video_path = assemble.stitch_video(image_paths, audio_path, script_data['timings'], job_id)
        
        # step 5: KEEP MOCK UPLOAD (Skipping R2)
        print(f"Job {job_id}: Skipping upload (testing locally, Polly enabled)...")
        video_url = f"LOCAL: {video_path}"
        thumbnail_url = f"LOCAL: {video_path}"
        
        print(f"Video created at: {video_path}")
        
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
        # if anything fails, mark the job as failed
        print(f"Job {job_id} failed with error: {str(e)}")
        database.update_job_status(job_id, 'failed')
        
        # raise the exception so celery knows it failed
        raise e
        
   