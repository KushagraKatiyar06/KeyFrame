#Nebuis with the Flux schenell model will be used to generate the 10 images
import os
import time
import base64
from openai import OpenAI
from dotenv import load_dotenv

#load environment variables
load_dotenv()

def generate_images(script_data, job_id):
    #Generates images for each slide using Nebius AI (Flux-Schnell) Returns a list of image file paths
    slides = script_data.get('slides', [])
    image_paths = []
    
    #creates a temp directory for this job if it doesn't exist
    temp_dir = f'/tmp/keyframe_job_{job_id}'
    os.makedirs(temp_dir, exist_ok=True)
    
    print(f"Generating {len(slides)} images...")
    
    #initializes the nebius client
    nebius_key = os.getenv('NEBIUS_API_KEY')
    client = OpenAI(
        base_url="https://api.studio.nebius.com/v1",
        api_key=nebius_key,
    )
    
    for i, slide in enumerate(slides):
        image_prompt = slide.get('image_prompt', '')
        
        try:
            #calls the nebius api to generate image
            completion = client.images.generate(
                model="black-forest-labs/flux-schnell",
                prompt=image_prompt,
                response_format="b64_json",
                extra_body={
                    "response_extension": "jpg",
                    "width": 1920,  #video resolution
                    "height": 1080,
                    "num_inference_steps": 16,
                    "seed": -1}
            )
            #decodes the base64 image and save it
            image_bytes = base64.b64decode(completion.data[0].b64_json)
            image_path = os.path.join(temp_dir, f'image_{i}.jpg')
            
            with open(image_path, 'wb') as f:
                f.write(image_bytes)
    
            image_paths.append(image_path)
            print(f"Image {i+1}/10 generated: {image_path}")
            
        except Exception as e:
            print(f"Error generating image {i+1}: {e}")
            raise
    
    print(f"All {len(image_paths)} images generated successfully")
    return image_paths