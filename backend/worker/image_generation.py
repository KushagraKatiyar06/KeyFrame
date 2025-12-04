import os
import time
import base64
from openai import OpenAI
from concurrent.futures import ThreadPoolExecutor, as_completed

# main image generation method

def generate_images(script_json, job_id, style, temp_dir):
    slides = script_json.get('slides', [])

    print(f"Beginning image generation...\n\n")

    print(f"1. Choosing image generation model for {style}\n")
    if style == 'Educational':
        # using Dall-E for educational videos
        print("Using OpenAI (DALL-E 3)")
        openai_key = os.getenv('OPENAI_API_KEY')
        dalle_client = OpenAI(api_key = openai_key)
        client = dalle_client # Use 'client' consistently for the loop
        model = "dall-e-3"
        resolution = '1792x1024' # DALL-E supported resolution
    else:
        # Use Nebius client for other styles
        print("Using Nebius (Flux-Schnell)...")
        nebius_key = os.getenv('NEBIUS_API_KEY')
        flux_client = OpenAI(
            base_url="https://api.studio.nebius.com/v1",
            api_key=nebius_key,
        )
        client = flux_client # Use 'client' consistently for the loop
        model = "black-forest-labs/flux-schnell"
        resolution = "1920x1080" # Nebius target resolution

    print("2. Generating all images in parallel (api calls)...")
    os.makedirs(temp_dir, exist_ok=True)

    # Function to generate a single image
    def generate_single_image(i, slide):
        image_prompt = slide.get('image_prompt', '')

        try:
            if style == 'Educational':
                completion = client.images.generate(
                    model = model,
                    prompt = image_prompt,
                    size = resolution,
                    quality = 'standard',
                    response_format= "b64_json",
                    n=1
                )

                image_bytes = base64.b64decode(completion.data[0].b64_json)

            else:
                completion = client.images.generate(
                    model=model,
                    prompt=image_prompt,
                    response_format="b64_json",
                    extra_body={
                        "response_extension": "jpg",
                        "width": 1920,
                        "height": 1080,
                        "num_inference_steps": 16,
                        "seed": -1}
                )

                image_bytes = base64.b64decode(completion.data[0].b64_json)

            image_path = os.path.join(temp_dir, f'image_{i}.jpg')

            with open(image_path, 'wb') as f:
                f.write(image_bytes)

            print(f"Image {i+1}/{len(slides)} generated: {image_path}")
            return (i, image_path)

        except Exception as e:
            print(f"Error generating image {i+1} with {model}: {e}")
            raise

    # Execute image generation in parallel
    image_results = {}
    with ThreadPoolExecutor(max_workers=len(slides)) as executor:
        futures = {executor.submit(generate_single_image, i, slide): i for i, slide in enumerate(slides)}

        for future in as_completed(futures):
            i, image_path = future.result()
            image_results[i] = image_path

    # Sort by index to maintain order
    image_paths = [image_results[i] for i in sorted(image_results.keys())]

    print(f"All {len(image_paths)} images generated successfully")
    return image_paths