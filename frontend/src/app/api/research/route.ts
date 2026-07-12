import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from "zod";

const orchestrationSchema = z.object({
  assignments: z.array(z.object({
    leadIndex: z.number().describe("The array index of the lead."),
    assignedModel: z.string().describe("The ID of the model assigned to research this lead (e.g. 'groq', 'cerebras', 'mistral', 'openrouter', 'xai', 'gemini').")
  }))
});

const researchSchema = z.object({
  qualified: z.boolean().describe("Whether this lead matches the target audience prompt."),
  summary: z.string().describe("A 2-3 sentence summary explaining why they are or are not qualified.")
});

export async function POST(req: Request) {
  try {
    const { leads, prompt, keys } = await req.json();

    if (!leads || !prompt || !keys) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Resolve API keys (fallback to env)
    const getApiKey = (providerKey: string, envKey: string) => keys[providerKey] || process.env[envKey];
    
    const availableModels = [];
    if (getApiKey('gemini', 'GEMINI_API_KEY')) availableModels.push('gemini');
    if (getApiKey('groq', 'GROQ_API_KEY')) availableModels.push('groq');
    if (getApiKey('openrouter', 'OPENROUTER_API_KEY')) availableModels.push('openrouter');
    if (getApiKey('cerebras', 'CEREBRAS_API_KEY')) availableModels.push('cerebras');
    if (getApiKey('mistral', 'MISTRAL_API_KEY')) availableModels.push('mistral');
    if (getApiKey('xai', 'XAI_API_KEY') || getApiKey('zai', 'ZAI_API_KEY')) availableModels.push('xai');

    if (availableModels.length === 0) {
        return NextResponse.json({ error: "No API keys available for research" }, { status: 400 });
    }

    // Step 1: Orchestration Phase using Gemini
    const geminiKey = getApiKey('gemini', 'GEMINI_API_KEY');
    if (!geminiKey) return NextResponse.json({ error: "Gemini API Key is required for orchestration" }, { status: 400 });
    
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    const orchestratorModel = google('gemini-1.5-flash-latest');

    console.log(`Orchestrating ${leads.length} leads across ${availableModels.length} models...`);

    const { object: orchestrationPlan } = await generateObject({
        model: orchestratorModel,
        schema: orchestrationSchema,
        prompt: `
        You are a Fleet Commander assigning tasks to AI models.
        I have a list of ${leads.length} leads to be researched.
        I have the following AI models available: ${availableModels.join(', ')}
        
        Your job is to distribute the workload evenly across all available models to maximize parallel processing speed.
        Return a JSON array mapping each Lead Index (0 to ${leads.length - 1}) to one of the available models.
        `
    });

    console.log("Orchestration Plan received:", orchestrationPlan.assignments);

    // Helper to get the correct model instance
    const getModelInstance = (provider: string) => {
        switch (provider) {
            case "gemini": return google('gemini-1.5-flash-latest');
            case "mistral": return createMistral({ apiKey: getApiKey('mistral', 'MISTRAL_API_KEY') })('mistral-large-latest');
            case "groq": return createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: getApiKey('groq', 'GROQ_API_KEY') })('llama3-70b-8192');
            case "openrouter": return createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: getApiKey('openrouter', 'OPENROUTER_API_KEY') })('anthropic/claude-3.5-sonnet');
            case "cerebras": return createOpenAI({ baseURL: 'https://api.cerebras.ai/v1', apiKey: getApiKey('cerebras', 'CEREBRAS_API_KEY') })('llama3.1-8b');
            case "xai": return createOpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: getApiKey('xai', 'XAI_API_KEY') || getApiKey('zai', 'ZAI_API_KEY') })('grok-beta');
            default: return null;
        }
    };

    // Step 2: Parallel Execution Phase
    const researchPromises = orchestrationPlan.assignments.map(async (assignment) => {
        const leadIndex = assignment.leadIndex;
        const provider = assignment.assignedModel;
        const lead = leads[leadIndex];
        
        if (!lead) return null; // Safe check

        const model = getModelInstance(provider);
        if (!model) {
            console.error(`Invalid model assigned: ${provider}`);
            return { ...lead, qualified: false, researchSummary: "Error: Invalid model assigned.", assignedModel: provider };
        }

        const systemPrompt = `
        Target Audience Prompt: "${prompt}"
        
        Lead Info:
        Name: ${lead.name}
        Company: ${lead.company}
        Website: ${lead.website}
        Email: ${lead.email}
        
        Determine if this lead fits the target audience. Provide a brief summary of your reasoning.
        `;

        try {
            const { object } = await generateObject({
                model,
                schema: researchSchema,
                prompt: systemPrompt,
            });
            return { ...lead, qualified: object.qualified, researchSummary: object.summary, assignedModel: provider };
        } catch (err: any) {
            console.error(`Error researching lead ${leadIndex} with ${provider}:`, err.message);
            return { ...lead, qualified: false, researchSummary: `Error: ${err.message}`, assignedModel: provider };
        }
    });

    // Wait for all models to finish researching in parallel!
    const researchedLeads = (await Promise.all(researchPromises)).filter(Boolean);

    return NextResponse.json({ researchedLeads });
    
  } catch (error: any) {
    console.error(`Orchestration error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
