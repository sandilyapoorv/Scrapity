import os
from litellm import completion

# Default model, can be overridden by environment variable
MODEL_NAME = os.getenv("MODEL_NAME", "gemini/gemini-1.5-pro-latest")

def process_lead_and_draft_email(lead_data: dict) -> dict:
    """
    Simulates in-depth research and drafts a personalized email using an LLM.
    """
    print(f"Starting AI research for {lead_data['name']} at {lead_data['company']}")
    
    # In a real scenario, this step might involve another scraping call to the lead's website
    # to extract context about what their company does.
    # For this MVP, we simulate the context based on the provided data.
    
    prompt = f"""
    You are an expert sales development representative. 
    Your goal is to write a highly professional, direct, and concise cold email to secure a meeting.
    
    Here is the information about the lead:
    Name: {lead_data['name']}
    Company: {lead_data['company']}
    Website: {lead_data['website']}
    
    Task:
    1. Infer what their company likely does based on the name/website.
    2. Write an email with the following constraints:
       - Subject line must be catchy but not clickbaity.
       - The tone must be professional and direct.
       - Acknowledge their company and infer a pain point we can solve (we offer AI Automation services).
       - Include a clear call to action to book a 15-minute meeting.
       - Format the output strictly as a JSON object with 'subject' and 'body' keys.
    """
    
    try:
        response = completion(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        # Parse the JSON response (litellm handles returning standard json if requested)
        import json
        content = response.choices[0].message.content
        result = json.loads(content)
        
        print(f"Drafted email for {lead_data['name']}")
        return result
    except Exception as e:
        print(f"Error during AI research/drafting: {e}")
        return {
            "subject": "Quick question regarding AI automation",
            "body": f"Hi {lead_data['name']},\n\nI was looking into {lead_data['company']} and I think our AI automation services could help streamline your operations.\n\nAre you open to a brief 15-minute call next week to discuss this?\n\nBest,\n[Your Name]"
        }
