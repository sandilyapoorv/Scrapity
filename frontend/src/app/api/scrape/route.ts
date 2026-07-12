import { NextResponse } from "next/server";
import { CheerioCrawler, log } from "crawlee";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from "zod";
import * as cheerio_lib from 'cheerio';
import google from 'googlethis';

const scrapeSchema = z.object({
  leads: z.array(z.object({
    name: z.string().describe("The name of the person or business."),
    company: z.string().describe("The name of the company they belong to. Default to name if unknown."),
    website: z.string().describe("Their website URL. Leave empty if none found."),
    email: z.string().describe("Their email address. Leave empty if none found.")
  }))
});

export async function POST(req: Request) {
  try {
    let { urls, prompt, geminiKey } = await req.json();
    
    // Resolve Gemini Key from request or env
    const finalGeminiKey = geminiKey || process.env.GEMINI_API_KEY;
    if (!finalGeminiKey) {
      return NextResponse.json({ error: "Gemini API Key is required for scraping/orchestration" }, { status: 400 });
    }

    // INTERNET SEARCH FALLBACK
    if (!urls || urls.length === 0) {
        if (!prompt) return NextResponse.json({ error: "Target Prompt is required for internet search" }, { status: 400 });
        
        console.log(`No URLs provided. Searching the internet for: ${prompt}`);
        
        const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(prompt)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const html = await response.text();
        const $ = cheerio_lib.load(html);
        const searchUrls: string[] = [];
        
        $('.result__url').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                // DuckDuckGo redirects often look like //duckduckgo.com/l/?uddg=https://...
                if (href.includes('uddg=')) {
                    const actualUrl = decodeURIComponent(href.split('uddg=')[1].split('&')[0]);
                    searchUrls.push(actualUrl);
                } else if (href.startsWith('http')) {
                    searchUrls.push(href);
                }
            }
        });
        
        if (searchUrls.length > 0) {
            urls = searchUrls.slice(0, 5); // Limit to top 5 results for speed
            console.log(`Found ${urls.length} URLs from DuckDuckGo Search.`);
        } else {
            return NextResponse.json({ error: "No results found on the internet for this prompt. Try a different prompt or provide directories." }, { status: 404 });
        }
    }

    const ai = createGoogleGenerativeAI({ apiKey: finalGeminiKey });
    const model = ai('gemini-1.5-pro-latest');

    log.setLevel(log.LEVELS.ERROR); 

    let allLeads: any[] = [];
    let siteTexts: string[] = [];

    // Step 1: Extract raw text from URLs
    const crawler = new CheerioCrawler({
      maxRequestsPerCrawl: 5, // Limit for MVP performance
      async requestHandler({ $, request }) {
        console.log(`Extracting raw text from ${request.url}...`);
        
        $('script, style, noscript, iframe, img, video').remove();
        const textDump = $('body').text().replace(/\s+/g, ' ').trim();
        
        const links: string[] = [];
        $('a').each((_, el) => {
           const href = $(el).attr('href');
           if (href && (href.startsWith('http') || href.startsWith('mailto:'))) {
               links.push(href);
           }
        });

        siteTexts.push(`URL: ${request.url}\nCONTENT:\n${textDump}\nLINKS:\n${links.join(', ')}`);
      }
    });

    await crawler.run(urls);

    if (siteTexts.length === 0) {
        return NextResponse.json({ leads: [] });
    }

    // Step 2: Gemini Data Extraction
    for (const text of siteTexts) {
        try {
            console.log("Sending text dump to Gemini for extraction...");
            const { object } = await generateObject({
                model,
                schema: scrapeSchema,
                prompt: `
                You are an expert data extractor. I am going to give you the raw, messy text dump of a directory website along with a list of links found on the page.
                
                Your job is to parse this mess and extract every business or person listed. 
                For each lead, find their Name, Company, Website, and Email. 
                If a field is missing, leave it blank. Return a structured JSON array.
                
                RAW DATA:
                ${text.substring(0, 1000000)}
                `,
            });
            allLeads = allLeads.concat(object.leads);
        } catch (aiError) {
            console.error("Gemini Extraction Error:", aiError);
        }
    }

    // Filter and deduplicate
    const validLeads = allLeads.filter(l => l.name || l.email || l.website);
    const uniqueLeads = Array.from(new Map(validLeads.map(item => [item.name + item.company, item])).values());

    return NextResponse.json({ leads: uniqueLeads });
  } catch (error: any) {
    console.error("Scrape error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
