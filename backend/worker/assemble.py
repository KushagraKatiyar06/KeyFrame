# FFmpeg will be used to process the audio and images to connect it tg
import os
import subprocess
import tempfile
import shutil

# use images and audio files to stitch into one video
def stitch_video(image_paths, audio_path, timings, job_id, temp_dir):
    
    # Allow overriding output dir via env var; default to C:\tmp on Windows or /tmp on other OSes
    output_dir = os.environ.get('KEYFRAME_OUTPUT_DIR') or (r'C:\tmp' if os.name == 'nt' else '/tmp')
    os.makedirs(output_dir, exist_ok=True)

    # Create a per-job folder to store all assets for this job (INSIDE C:\tmp)
    job_dir = os.path.join(output_dir, f'keyframe_job_{job_id}')
    os.makedirs(job_dir, exist_ok=True)

    # Path for final video - place it inside the job folder and name it final_video{jobId}.mp4
    output_path = os.path.join(job_dir, f'final_video{job_id}.mp4')
    
    print(f"Stitching video with {len(image_paths)} images and audio...\n\n")
    
    try:

        segment_paths = []
        FFMPEG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'bin', 'ffmpeg.exe'))

        print("1. Iterating through clips and audios and stitching into video")

        for i, (image_path, duration) in enumerate(zip(image_paths, timings)):
            # write segment into the job folder so all assets for this job are colocated
            segment_path = os.path.join(job_dir, f'segment_{i}.mp4')
            # -loop 1 keeps the image for the specified duration
            segment_cmd = [
                FFMPEG_PATH,
                '-y',
                '-loop', '1',
                '-i', image_path,
                '-c:v', 'libx264',
                '-t', str(duration),
                '-pix_fmt', 'yuv420p',
                '-vf', 'scale=1920:1080',
                '-r', '30',
                '-preset', 'medium',
                '-crf', '23',
                segment_path
            ]

            print(f"Encoding segment {i+1}/{len(image_paths)}: {segment_path} ({duration}s)")
            subprocess.run(segment_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            if not os.path.exists(segment_path):
                raise Exception(f"Failed to create segment: {segment_path}")
            segment_paths.append(segment_path)

        concat_file_path = os.path.join(job_dir, 'concat_list.txt')
        with open(concat_file_path, 'w', encoding='utf-8') as f:
            for p in segment_paths:
                f.write(f"file '{p}'\n")

        # copy the audio into the job folder for easier debugging/inspection
        try:
            if audio_path and os.path.exists(audio_path):
                audio_basename = os.path.basename(audio_path)
                audio_copy_path = os.path.join(job_dir, audio_basename)
                if os.path.abspath(audio_path) != os.path.abspath(audio_copy_path):
                    shutil.copy2(audio_path, audio_copy_path)
                # use the copy as input so the job folder is self-contained
                audio_input = audio_copy_path
            else:
                audio_input = audio_path
        except Exception:
            audio_input = audio_path

        ffmpeg_command = [
            FFMPEG_PATH,
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', concat_file_path,
            '-i', audio_input,
            '-map', '0:v',
            '-map', '1:a',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-movflags', '+faststart',
            '-shortest',
            output_path
        ]

        print(f"2. Running FFmpeg concat + mux command...")
        result = subprocess.run(
            ffmpeg_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )

        print(f"3. FFmpeg completed successfully")
        
        # verify the output file exists
        if not os.path.exists(output_path):
            raise Exception("FFmpeg completed but output file was not created")
        
        # get file size for logging
        file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"Video created: {output_path} ({file_size_mb:.2f} MB)")
        
        return output_path
        
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr}")
        raise Exception(f"FFmpeg failed: {e.stderr}")
    except Exception as e:
        print(f"Error stitching video: {e}")
        raise

def get_video_info(video_path):
    try:
        command = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            video_path
        ]
        
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        
        import json
        info = json.loads(result.stdout)
        
        duration = float(info['format'].get('duration', 0))
        size_mb = int(info['format'].get('size', 0)) / (1024 * 1024)
        
        print(f"Video info: {duration:.2f}s duration, {size_mb:.2f} MB")
        return info
        
    except Exception as e:
        print(f"Could not get video info: {e}")
        return None