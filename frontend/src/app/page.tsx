"use client";

import { useState, useEffect } from "react";
import { Play, Loader2, CheckCircle2, XCircle } from "lucide-react";

type Lead = {
  name: string;
  company: string;
  website: string;
  email: string;
  qualified?: boolean;
  researchSummary?: string;
  assignedModel?: string; // Track which model researched this lead
};

export default function Dashboard() {
  // API Keys State
  const [keys, setKeys] = useState({
    gemini: "",
    groq: "",
    openrouter: "",
    cerebras: "",
    mistral: "",
    xai: "",
    zai: "",
  });

  // Prompt & URLs
  const [prompt, setPrompt] = useState("");
  const [urls, setUrls] = useState("");
  
  // App State
  const [status, setStatus] = useState<"idle" | "scraping" | "orchestrating" | "researching" | "done">("idle");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setIsClient(true);
    const savedKeys = localStorage.getItem("ai_automation_keys");
    const savedPrompt = localStorage.getItem("ai_automation_prompt");
    const savedUrls = localStorage.getItem("ai_automation_urls");
    
    if (savedKeys) {
        try { setKeys(JSON.parse(savedKeys)); } catch(e) {}
    }
    if (savedPrompt) setPrompt(savedPrompt);
    if (savedUrls) setUrls(savedUrls);
    
    // Mark as loaded so the save effect can safely run
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  // Save to localStorage when things change, ONLY after initial load is complete
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("ai_automation_keys", JSON.stringify(keys));
    localStorage.setItem("ai_automation_prompt", prompt);
    localStorage.setItem("ai_automation_urls", urls);
  }, [keys, prompt, urls, isLoaded]);

  const handleKeyChange = (provider: keyof typeof keys, value: string) => {
    setKeys(prev => ({ ...prev, [provider]: value }));
  };

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

  const startAutomation = async () => {
    if (!keys.gemini || !prompt) {
      alert("Please provide at least a Gemini API Key (for orchestration/scraping) and a Target Prompt.");
      return;
    }

    setStatus("scraping");
    setLeads([]);
    setLogs([]);

    const targetUrls = urls.split("\n").map(u => u.trim()).filter(Boolean);
    if (targetUrls.length === 0) {
        addLog("No URLs provided. Initiating Internet-Wide Search Scraping...");
    } else {
        addLog(`Starting AI scrape for ${targetUrls.length} provided URLs...`);
    }

    try {
      // Step 1: Scrape (or Search + Scrape)
      const scrapeRes = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: targetUrls, prompt, geminiKey: keys.gemini }),
      });
      
      const scrapeData = await scrapeRes.json();
      if (!scrapeRes.ok) throw new Error(scrapeData.error || "Scraping failed");

      const scrapedLeads: Lead[] = scrapeData.leads || [];
      setLeads(scrapedLeads);
      addLog(`Gemini found ${scrapedLeads.length} potential leads.`);
      
      if (scrapedLeads.length === 0) {
        setStatus("done");
        return;
      }

      setStatus("orchestrating");
      addLog("Sending leads to Gemini Orchestrator for multi-model workload distribution...");

      // Step 2: Orchestrate and Research (Parallel)
      const researchRes = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: scrapedLeads,
          prompt,
          keys // Pass all keys so the backend knows which models are available
        }),
      });

      // The backend will handle the stream or return the final array
      // Since it's doing Promise.all, we wait for all to finish for this MVP
      const researchData = await researchRes.json();
      if (!researchRes.ok) throw new Error(researchData.error || "Research orchestration failed");

      addLog("Parallel research completed across all assigned models!");
      setLeads(researchData.researchedLeads);
      setStatus("done");
      addLog("Automation complete!");

    } catch (error: any) {
      setStatus("idle");
      addLog(`Automation aborted due to error: ${error.message}`);
    }
  };

  if (!isClient) return null; // Avoid hydration mismatch

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            AI Fleet Automation
          </h1>
          <p className="text-gray-400 mt-2">Internet-Wide Search & Multi-Model Orchestration</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Controls Sidebar */}
          <div className="lg:col-span-1 space-y-6 bg-gray-900 p-6 rounded-2xl border border-gray-800">
            
            {/* API Keys Configuration */}
            <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
              <h3 className="text-sm font-semibold text-emerald-400 mb-2">API Keys (Auto-Saved locally)</h3>
              
              <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Gemini (Required)</label>
                    <input type="password" value={keys.gemini} onChange={e => handleKeyChange('gemini', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-xs outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Groq</label>
                    <input type="password" value={keys.groq} onChange={e => handleKeyChange('groq', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-xs outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">OpenRouter</label>
                    <input type="password" value={keys.openrouter} onChange={e => handleKeyChange('openrouter', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-xs outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Cerebras</label>
                    <input type="password" value={keys.cerebras} onChange={e => handleKeyChange('cerebras', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-xs outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Mistral</label>
                    <input type="password" value={keys.mistral} onChange={e => handleKeyChange('mistral', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-xs outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">xAI / z.ai</label>
                    <input type="password" value={keys.xai} onChange={e => handleKeyChange('xai', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-xs outline-none" />
                  </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Target Audience Prompt</label>
              <textarea 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. Graphic design agencies in New York"
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Target Directories (Optional)</label>
              <p className="text-xs text-gray-500 mb-2">Leave blank to automatically search the internet based on the prompt above.</p>
              <textarea 
                value={urls}
                onChange={e => setUrls(e.target.value)}
                rows={3}
                placeholder="https://example.com/directory (Optional)"
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-mono text-xs"
              />
            </div>

            <button
              onClick={startAutomation}
              disabled={status !== "idle" && status !== "done"}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {status === "scraping" ? <><Loader2 className="animate-spin" size={20} /> Searching & Scraping...</> :
               status === "orchestrating" ? <><Loader2 className="animate-spin" size={20} /> Orchestrating Multi-Model...</> :
               <><Play size={20} /> Deploy Fleet</>}
            </button>

            {/* Logs Window */}
            <div className="mt-8 bg-black rounded-lg border border-gray-800 p-4 h-48 overflow-y-auto font-mono text-xs text-emerald-400">
              {logs.length === 0 ? <span className="text-gray-600">No logs yet...</span> : 
                logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
            </div>
          </div>

          {/* Results Table */}
          <div className="lg:col-span-2 bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Processed Leads ({leads.length})</h2>
              <div className="text-sm text-gray-400">
                Qualified: {leads.filter(l => l.qualified).length} / {leads.filter(l => l.qualified !== undefined).length}
              </div>
            </div>
            
            <div className="overflow-x-auto flex-1 p-6">
              {leads.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 flex-col gap-4 min-h-[300px]">
                  <div className="w-16 h-16 border-4 border-gray-800 border-t-gray-600 rounded-full animate-spin [animation-play-state:paused] opacity-50"></div>
                  <p>Awaiting deployment...</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-gray-400 text-sm border-b border-gray-800">
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Name / Company</th>
                      <th className="pb-3 font-medium">Contact</th>
                      <th className="pb-3 font-medium min-w-[250px]">Research Summary</th>
                      <th className="pb-3 font-medium text-right">Model Used</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {leads.map((lead, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                        <td className="py-4 pr-4">
                          {lead.qualified === undefined ? (
                            <Loader2 className="animate-spin text-blue-500" size={20} />
                          ) : lead.qualified ? (
                            <CheckCircle2 className="text-emerald-500" size={20} />
                          ) : (
                            <XCircle className="text-red-500" size={20} />
                          )}
                        </td>
                        <td className="py-4 pr-4">
                          <div className="font-medium text-gray-200">{lead.name}</div>
                          <div className="text-gray-500">{lead.company}</div>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="text-gray-300">{lead.email || "No email"}</div>
                          <a href={lead.website} target="_blank" className="text-blue-400 hover:underline text-xs block mt-1 truncate max-w-[150px]">
                            {lead.website || "No website"}
                          </a>
                        </td>
                        <td className="py-4 pr-4">
                          {lead.researchSummary ? (
                            <p className="text-gray-400 leading-relaxed text-xs">
                              {lead.researchSummary}
                            </p>
                          ) : (
                            <span className="text-gray-600 italic text-xs">Pending research...</span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                            {lead.assignedModel ? (
                                <span className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs border border-gray-700">
                                    {lead.assignedModel}
                                </span>
                            ) : (
                                "-"
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
