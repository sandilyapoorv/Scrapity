# Scrapity: AI Fleet Automation 🚀

A highly advanced, serverless AI automation tool built to scrape the web and research potential leads simultaneously using an orchestrated fleet of Large Language Models.

## Features

- 🌐 **Internet-Wide Web Scraping**: Don't have a directory? No problem. Provide a Target Audience Prompt, and the system will automatically search the web (bypassing basic anti-bot measures), find the most relevant URLs, and feed them into the scraper.
- 🧠 **AI-Driven Data Extraction**: Traditional scrapers break when websites change their CSS classes. Scrapity uses **Gemini 1.5 Pro**'s massive context window to digest raw, messy HTML text dumps and perfectly extract structured lead data (Names, Companies, Emails, Websites).
- ⚙️ **Master-Worker Orchestration**: Enter API keys for Groq, Cerebras, OpenRouter, Mistral, xAI, and Gemini all at once. The backend uses Gemini as a Fleet Commander to dynamically assign leads to different models and then executes the research **in parallel** to maximize speed and utilize the full power of your API limits.
- 💾 **Persistent Local Storage**: Built as an internal tool, all your prompts and API keys are stored in your browser's `localStorage`. Type them once, and they'll instantly rehydrate every time you open the dashboard. No messy `.env` file management required.

## Tech Stack
- **Frontend/Backend**: Next.js (App Router), Tailwind CSS, React
- **Web Scraping**: Crawlee (CheerioCrawler), DuckDuckGo HTML 
- **AI Integration**: Vercel AI SDK (@ai-sdk/google, @ai-sdk/openai, @ai-sdk/mistral)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- At least one API key (Gemini is required for the orchestration/scraping engine).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sandilyapoorv/Scrapity.git
   cd Scrapity/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`.

---

## 🛠️ How to Use

1. **Configure API Keys**: 
   - Open the dashboard and paste your **Gemini API Key** into the designated box (this is required for scraping and orchestration).
   - Enter any other API keys you have (Groq, Cerebras, xAI, etc.) into the grid. The tool will automatically use whatever keys you provide.
2. **Set the Target Prompt**: 
   - Describe exactly who you are looking for (e.g., *"Graphic design agencies in New York"* or *"SaaS founders in California"*).
3. **Target Directories (Optional)**:
   - If you have specific URLs you want to scrape (like a specific directory page), paste them in the text box.
   - **If you leave this blank**, Scrapity will automatically search the internet based on your prompt and scrape the top results.
4. **Deploy Fleet**: 
   - Click the big button. The system will search, extract, orchestrate, and research your leads in parallel. Results will populate in the dashboard table!

---

## 🔒 Security Note
Since this is designed as a local, internal automation tool, API keys entered into the UI are saved in your browser's local storage. Do not expose this dashboard to the public internet without implementing proper authentication.
