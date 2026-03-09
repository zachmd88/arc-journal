"use client";

import { useState } from "react";
import { Session, Round, saveCoachInsight, setWeeklyFocus } from "@/lib/firestore-utils";
import { useAuth } from "@/context/AuthContext";

type SyncItem = Session | Round;

export default function VirtualCoachSync({ sessions, rounds }: { sessions: Session[], rounds: Round[] }) {
    const { user } = useAuth();
    
    // Combine and sort all possible sync targets
    const allOptions: SyncItem[] = [...sessions, ...rounds]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const [selectedItemId, setSelectedItemId] = useState<string | undefined>(allOptions.length > 0 ? allOptions[0].id : undefined);
    const [status, setStatus] = useState<"idle" | "copied" | "saving" | "success" | "error">("idle");
    const [pastedResponse, setPastedResponse] = useState("");

    const selectedItem = allOptions.find(item => item.id === selectedItemId);

    const handleCopyPrompt = async () => {
        if (!selectedItem) return;

        const isRound = 'course' in selectedItem;

        try {
            let promptData = `Date: ${selectedItem.date}\n`;
            if (isRound) {
                const r = selectedItem as Round;
                promptData += `Type: Round at ${r.course}\nScore: ${r.score || 'N/A'}\nPenalties: ${r.penaltiesCount}\n`;
                promptData += `Tee Pattern: Start ${r.teeMissStart}, Curve ${r.teeMissCurve}\n`;
                promptData += `Notes: ${r.rawNotes || 'None'}\n`;
            } else {
                const s = selectedItem as Session;
                promptData += `Type: Practice (${s.type})\nNotes: ${s.rawNotes}\n`;
                if (s.structured?.clubs) promptData += `Clubs Used: ${s.structured.clubs.join(", ")}\n`;
            }

            const prompt = `Role: You are Todd Graves. Analyze my latest golf data using only the Single Plane Swing sources in this notebook.

My Latest Arc Journal Data:
${promptData}

Task: Provide feedback formatted EXACTLY like this with the brackets included:
[VERDICT] (1 sentence summary of the flaw)
[WHY] (Brief explanation of the Single Plane fundamental I'm missing)
[DRILL] (Name of 1 specific drill from the sources)
[SOURCE] (Citation of the book or video)`;

            await navigator.clipboard.writeText(prompt);
            setStatus("copied");
            setTimeout(() => setStatus("idle"), 3000);
        } catch (err) {
            console.error("Failed to copy prompt:", err);
            alert("Failed to copy to clipboard.");
        }
    };

    const handleSaveInsight = async () => {
        if (!selectedItem || !selectedItem.id) {
            alert("No valid session or round selected.");
            return;
        }

        setStatus("saving");

        try {
            // Parse the response
            const verdictMatch = pastedResponse.match(/\[VERDICT\]\s*([\s\S]*?)(?=\[WHY\]|\[DRILL\]|\[SOURCE\]|$)/i);
            const whyMatch = pastedResponse.match(/\[WHY\]\s*([\s\S]*?)(?=\[VERDICT\]|\[DRILL\]|\[SOURCE\]|$)/i);
            const drillMatch = pastedResponse.match(/\[DRILL\]\s*([\s\S]*?)(?=\[VERDICT\]|\[WHY\]|\[SOURCE\]|$)/i);
            const sourceMatch = pastedResponse.match(/\[SOURCE\]\s*([\s\S]*?)(?=\[VERDICT\]|\[WHY\]|\[DRILL\]|$)/i);

            const parsedData = {
                verdict: verdictMatch ? verdictMatch[1].trim() : "No verdict found",
                why: whyMatch ? whyMatch[1].trim() : "No explanation found",
                drill: drillMatch ? drillMatch[1].trim() : "No drill found",
                source: sourceMatch ? sourceMatch[1].trim() : "No source found"
            };

            const type = 'course' in selectedItem ? 'rounds' : 'sessions';
            await saveCoachInsight(selectedItem.id, parsedData, type);
            
            setStatus("success");
            setPastedResponse("");
            setTimeout(() => {
                setStatus("idle");
                window.location.reload();
            }, 1000);
        } catch (err) {
            console.error("Error saving insight:", err);
            setStatus("error");
            alert("Failed to save insight.");
        }
    };

    const handleSetWeeklyFocus = async () => {
        if (!selectedItem || !selectedItem.id || !user) return;
        
        try {
            const collectionName = 'course' in selectedItem ? 'rounds' : 'sessions';
            await setWeeklyFocus(selectedItem.id, collectionName, user.uid);
            window.location.reload();
        } catch (err) {
            console.error("Failed to set weekly focus:", err);
            alert("Failed to make this the active focus.");
        }
    };

    if (allOptions.length === 0) return null;

    return (
        <div className="space-y-6 mb-8 mt-2">
            {/* Sync Tool Controls */}
            <div className="bg-zinc-900 rounded-xl shadow-lg border border-zinc-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                            Virtual Coach Sync
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1">Select a recent round or session to analyze via NotebookLM.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedItemId || ''}
                            onChange={(e) => setSelectedItemId(e.target.value)}
                            className="rounded-lg border-none bg-zinc-950 px-3 py-2 text-sm text-zinc-200 shadow-inner focus:ring-1 focus:ring-indigo-500 max-w-[200px]"
                        >
                            {allOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.date} - {'course' in opt ? `Round: ${opt.course}` : `Practice: ${opt.type}`}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={handleCopyPrompt}
                            disabled={!selectedItem}
                            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                                status === "copied" 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20"
                            }`}
                        >
                            {status === "copied" ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Copied! Paste in NotebookLM
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                    Consult Coach
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="p-6 bg-zinc-950/50">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        Paste Coach's Response Here:
                    </label>
                    <textarea
                        rows={4}
                        className="w-full rounded-md border border-zinc-800 bg-zinc-900 text-zinc-100 py-3 px-4 shadow-sm placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="[VERDICT] ...&#10;[WHY] ...&#10;[DRILL] ...&#10;[SOURCE] ..."
                        value={pastedResponse}
                        onChange={(e) => setPastedResponse(e.target.value)}
                        disabled={status === "saving" || status === "success"}
                    />
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleSaveInsight}
                            disabled={!pastedResponse.trim() || status === "saving" || status === "success"}
                            className="flex justify-center items-center gap-2 py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === "saving" && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            {status === "success" ? "Insight Saved!" : "Save Coach Insight"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Display Active Insight if selected document has one */}
            {selectedItem && selectedItem.coachInsight && (
                <div className="bg-zinc-900 rounded-xl shadow-lg border border-zinc-800 overflow-hidden">
                    <div className="bg-indigo-950/50 px-6 py-4 flex justify-between items-center border-b border-indigo-900/30">
                        <h3 className="text-indigo-100 font-semibold flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Analysis for {selectedItem.date}
                        </h3>
                        
                        {!selectedItem.coachInsight.isWeeklyFocus ? (
                            <button 
                                onClick={handleSetWeeklyFocus}
                                className="text-xs shrink-0 font-medium px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm"
                            >
                                Add to Weekly Focus
                            </button>
                        ) : (
                            <span className="text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Active Focus
                            </span>
                        )}
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Verdict</h4>
                                    <p className="text-zinc-100 font-medium">{selectedItem.coachInsight.verdict}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">The Why</h4>
                                    <p className="text-zinc-400 text-sm leading-relaxed">{selectedItem.coachInsight.why}</p>
                                </div>
                            </div>
                            <div className="space-y-4 md:border-l md:border-zinc-800 md:pl-6">
                                <div>
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Actionable Drill</h4>
                                    <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-md">
                                        <p className="text-indigo-300 font-medium">{selectedItem.coachInsight.drill}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1">Source Material</h4>
                                    <p className="text-zinc-500 text-xs italic">{selectedItem.coachInsight.source}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
