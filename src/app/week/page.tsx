"use client";

import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { addDocument, getRecentDocuments, Round, Session } from "@/lib/firestore-utils";
import { createWeekCardFromHistory } from "@/lib/rule-engine";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function WeekPlanPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [generating, setGenerating] = useState(false);
    const [insights, setInsights] = useState<{
        analysis: string;
        drills: string[];
        recommendation: string;
    } | null>(null);

    const handleGenerate = async () => {
        if (!user) return;
        setGenerating(true);
        setInsights(null); // Clear previous

        try {
            // 1. Get 30-day history for context
            const historyRounds = await getRecentDocuments<Round>("rounds", user.uid, 30);

            if (historyRounds.length === 0) {
                alert("No rounds found in the last 30 days. Please log a round first.");
                setGenerating(false);
                return;
            }

            // 2. Prepare context for API
            // Simple summary for the prompt
            const stats = {
                roundsPlayed: historyRounds.length,
                latestMiss: historyRounds[0].teeMissStart + "/" + historyRounds[0].teeMissCurve,
                latestPenalties: historyRounds[0].penaltiesCount
            };

            // 3. Call API to get NotebookLM insights
            const response = await fetch('/api/generate-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stats,
                    context: "Golfer follows Single Plane Swing mechanics suitable for Todd Graves methodology."
                }),
            });

            if (!response.ok) throw new Error("Failed to generate insights");

            const data = await response.json();
            setInsights(data);

            // 4. (Optional) Save to Firestore as WeekCard if needed, 
            // but for now we just show it as requested.

        } catch (error) {
            console.error("Error generating plan:", error);
            alert("Failed to generate insights. Ensure Python backend is active.");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="text-indigo-600 hover:text-indigo-800 mb-8 inline-block">&larr; Back to Dashboard</Link>

                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="px-6 py-8 sm:p-10 text-center">
                        <h1 className="text-3xl font-bold text-gray-900">Weekly Plan Generator</h1>
                        <p className="mt-4 text-lg text-gray-500">
                            Get personalized Single Plane Swing insights directly from your Coach's notebook.
                        </p>

                        <div className="mt-8">
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className={`inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-md text-white transition-all
                                    ${generating
                                        ? "bg-indigo-400 cursor-not-allowed"
                                        : "bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg"
                                    }`}
                            >
                                {generating ? (
                                    <>
                                        <svg className="mr-3 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Analyzing with NotebookLM...
                                    </>
                                ) : (
                                    "Generate Weekly Insights and Recommendations"
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Insights Display Section */}
                    {insights && (
                        <div className="border-t border-gray-200 bg-gray-50 px-6 py-8 sm:px-10">
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold text-indigo-900 flex items-center">
                                        <span className="bg-indigo-100 p-2 rounded-full mr-3 text-xl">🧐</span>
                                        Swing Analysis
                                    </h3>
                                    <div className="mt-3 bg-white p-4 rounded-md border border-gray-200 text-gray-700 shadow-sm leading-relaxed">
                                        {insights.analysis}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-indigo-900 flex items-center">
                                        <span className="bg-indigo-100 p-2 rounded-full mr-3 text-xl">🛠️</span>
                                        Recommended Drills
                                    </h3>
                                    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                                        {insights.drills && insights.drills.map((drill, idx) => (
                                            <li key={idx} className="bg-white p-4 rounded-md border border-gray-200 text-gray-700 shadow-sm flex items-start">
                                                <span className="text-indigo-500 font-bold mr-2">{idx + 1}.</span>
                                                {drill}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-indigo-900 flex items-center">
                                        <span className="bg-indigo-100 p-2 rounded-full mr-3 text-xl">📅</span>
                                        Session Focus
                                    </h3>
                                    <div className="mt-3 bg-indigo-50 p-4 rounded-md border border-indigo-100 text-indigo-800 shadow-sm font-medium">
                                        {insights.recommendation}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 text-center">
                                <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 underline">
                                    Return to Dashboard
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
