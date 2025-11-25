import os
import json
from openai import OpenAI

#initialize openai client with api key from environment
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def generate_script(prompt, style):
    """Generate a 60-second video script with 10 slides using OpenAI
    Returns a dict with title and slides array
    """
    
    # create a detailed system prompt based on the style
    style_instructions = {
        'Educational': """Create an educational video that teaches the topic clearly and thoroughly. 
        - Use facts, explanations, and examples
        - Break down complex ideas into simple parts
        - Each slide should build on the previous one logically
        - Use clear, instructive language
        - Image prompts should show diagrams, illustrations, or visual representations of concepts""",
        
        'Storytelling': """Create a narrative story with a clear beginning, middle, and end. 
        - Build tension and emotional engagement
        - Use vivid descriptions and sensory details
        - Create characters or scenarios the viewer can connect with
        - Each slide should advance the plot
        - Image prompts should capture key story moments and emotions visually""",
        
        'Meme': """Create a funny, internet-culture style video that's highly relatable and shareable.
        - Try to use existing trends and memes that you see online on tikok or instagram
        - Use modern internet humor and trending formats
        - Be playful, ironic, or absurdist where appropriate
        - Reference common experiences everyone understands
        - Each slide should build to a punchline or funny moment
        - Image prompts should be visually comedic, exaggerated, or use meme-style compositions"""
    }
    
    system_prompt = f"""You are an expert video script writer specializing in short-form content. 
Generate a compelling, engaging script for a 60-second video.

STYLE: {style}
{style_instructions.get(style, 'Create an engaging video.')}

CRITICAL STRUCTURAL REQUIREMENTS:
- Generate EXACTLY 10 slides, no more, no less
- Each slide should be approximately 6 seconds long (adjust slightly if needed, but total must be close to 60 seconds)
- Total duration across all 10 slides must sum to 58-62 seconds
- Each slide must have these three components:
  1. narration: The exact spoken text for this slide (conversational, natural, flows well when spoken aloud)
  2. image_prompt: A highly detailed, visual description for AI image generation (be specific about composition, style, mood, colors, subjects)
  3. duration: Time in seconds (typically 5.5-6.5 seconds per slide)

IMAGE PROMPT GUIDELINES:
- Be extremely specific and descriptive (include: subject, setting, lighting, mood, composition, art style)
- Good example: "A cozy coffee shop interior at sunrise, warm golden light streaming through large windows, a steaming latte on a wooden table in the foreground, soft bokeh background with blurred customers, cinematic photography style, warm color palette"
- Bad example: "A coffee shop"
- Avoid text in images - describe visual scenes only
- Each image should be distinct and visually interesting
- Images should match and enhance the narration

NARRATION GUIDELINES:
- Write as if speaking directly to the viewer
- Use short, punchy sentences that are easy to understand when heard
- Make it conversational and engaging, not robotic
- Each narration should naturally flow into the next
- Total word count across all narrations should be around 150-180 words (comfortable speaking pace)

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{{
  "title": "Engaging Video Title That Captures the Topic",
  "slides": [
    {{
      "narration": "Natural spoken text for this slide",
      "image_prompt": "Extremely detailed visual description for AI image generation including composition, lighting, mood, style, colors, and specific subjects",
      "duration": 6.0
    }},
    ...repeat for exactly 10 slides...
  ]
}}"""

    try:
        #call openai api with detailed instructions
        response = client.chat.completions.create(
            model="gpt-4o-mini", 
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Create a {style} style video about: {prompt}"}
            ],
            temperature=0.8,  
            max_tokens=2500 
        )
        
        #get the response text
        script_text = response.choices[0].message.content.strip()
        
        #remove the json in markdown code blocks
        if script_text.startswith('```json'):
            script_text = script_text[7:]
        if script_text.startswith('```'):
            script_text = script_text[3:]
        if script_text.endswith('```'):
            script_text = script_text[:-3]
        script_text = script_text.strip()
        
        #parse the json
        script_data = json.loads(script_text)
        
        #validate that there are exactly 10 slides
        if len(script_data.get('slides', [])) != 10:
            raise ValueError(f"Expected 10 slides, got {len(script_data.get('slides', []))}")
        
        #validate each slide has required fields
        for i, slide in enumerate(script_data['slides']):
            if not slide.get('narration'):
                raise ValueError(f"Slide {i+1} missing narration")
            if not slide.get('image_prompt'):
                raise ValueError(f"Slide {i+1} missing image_prompt")
            if not slide.get('duration'):
                raise ValueError(f"Slide {i+1} missing duration")
        
        #calculate timings for later use
        timings = [slide['duration'] for slide in script_data['slides']]
        script_data['timings'] = timings
        
        total_duration = sum(timings)
        
        print(f"Script generated: {script_data['title']}")
        print(f"Total slides: {len(script_data['slides'])}")
        print(f"Total duration: {total_duration} seconds")
        
        #warn if duration is too far off
        if total_duration < 55 or total_duration > 65:
            print(f"Warning: Total duration {total_duration}s is outside ideal range (58-62s)")
        
        return script_data
        
    except json.JSONDecodeError as e:
        print(f"Error parsing OpenAI response as JSON: {e}")
        print(f"Response was: {script_text}")
        raise Exception("Failed to generate valid script JSON")
        
    except Exception as e:
        print(f"Error generating script: {e}")
        raise