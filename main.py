from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
import os
from scraper import scrape_leads
from ai_research import process_lead_and_draft_email
from email_service import send_cold_email

app = FastAPI(title="AI Automation Backend")

class ScrapingRequest(BaseModel):
    url: str
    target_count: int = 10

class LeadResearchRequest(BaseModel):
    name: str
    company: str
    website: str
    email: str | None = None

@app.get("/")
def read_root():
    return {"status": "AI Automation backend is running"}

@app.post("/api/scrape")
async def start_scraping(req: ScrapingRequest):
    """
    Endpoint to trigger scraping a directory or website.
    """
    try:
        leads = scrape_leads(req.url, req.target_count)
        return {"status": "success", "leads_found": len(leads), "leads": leads}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process_lead")
async def process_lead(lead: LeadResearchRequest, background_tasks: BackgroundTasks):
    """
    Endpoint to trigger AI research and email drafting for a specific lead.
    """
    def background_processing(lead_data: LeadResearchRequest):
        # 1. AI Research & Draft Email
        email_draft = process_lead_and_draft_email(lead_data.dict())
        
        # 2. Send Email if an email address exists
        if lead_data.email:
            send_cold_email(lead_data.email, email_draft['subject'], email_draft['body'])
            print(f"Email sent to {lead_data.email}")
        else:
            print(f"No email found for {lead_data.name} at {lead_data.company}. Skipping email step.")

    background_tasks.add_task(background_processing, lead)
    return {"status": "processing_started", "message": f"Started processing lead {lead.name}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
