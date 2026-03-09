"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getRecentDocuments, Round, Session } from "@/lib/firestore-utils";
import VirtualCoachSync from "@/components/VirtualCoachSync";
import Link from "next/link";

type SyncItem = Session | Round;

export default function CoachPage() {
    const { user } = useAuth();
    const [rounds, setRounds] = useState<Round[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!user) return;
            const recentRounds = await getRecentDocuments<Round>("rounds", user.uid, 50);
            const recentSessions = await getRecentDocuments<Session>("sessions", user.uid, 50);

            setRounds(recentRounds);
            setSessions(recentSessions);
            setLoading(false);
        }
        fetchData();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
                Loading Coach Data...
            </div>
        );
    }

    const allItems: SyncItem[] = [...rounds, ...sessions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const historyItems = allItems.filter(item => item.coachInsight !== undefined);
    const weeklyFocusItem = historyItems.find(item => item.coachInsight?.isWeeklyFocus) || historyItems[0]; // Fallback to newest if none explicitly set

    return (
        <div className="min-h-screen bg-zinc-950 pb-12 font-sans text-zinc-100">
            <main className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-zinc-100">AI Coach</h1>
                        <p className="mt-1 text-zinc-400">Sync with Todd Graves via NotebookLM to analyze your latest data.</p>
                    </div>

                    {/* 1. Current Week Focus */}
                    <div className="mb-12">
                        <h2 className="text-xl font-bold text-zinc-100 mb-4 border-b border-zinc-900 pb-2">Current Weekly Focus</h2>
                        {weeklyFocusItem && weeklyFocusItem.coachInsight ? (
                            <div className="bg-zinc-900 rounded-xl shadow-lg border border-indigo-900/50 overflow-hidden relative group">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <svg className="w-32 h-32 text-indigo-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                                </div>
                                <div className="px-6 py-6 sm:p-8 relative z-10">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600/20 px-3 py-1 text-xs font-semibold text-indigo-400 shadow-sm border border-indigo-500/30">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            Active Focus
                                        </span>
                                        <span className="text-sm font-medium text-zinc-400">Generated {weeklyFocusItem.date}</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-zinc-100 tracking-tight">{weeklyFocusItem.coachInsight.verdict}</h3>
                                    
                                    <div className="mt-6 mb-6 p-5 bg-zinc-950 rounded-xl border border-zinc-800 shadow-sm">
                                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">The Root Cause (Why)</h4>
                                        <p className="text-sm text-zinc-300 leading-relaxed font-medium">"{weeklyFocusItem.coachInsight.why}"</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="p-4 bg-zinc-950 border border-zinc-800 shadow-sm rounded-xl">
                                            <p className="text-sm font-bold text-zinc-100 mb-1">Primary Drill</p>
                                            <p className="text-sm text-indigo-400 font-medium">{weeklyFocusItem.coachInsight.drill}</p>
                                            <p className="text-xs text-zinc-500 mt-2 italic">{weeklyFocusItem.coachInsight.source}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl bg-zinc-900/50 border border-dashed border-zinc-700 p-8 text-center">
                                <p className="text-sm text-zinc-400">No active focus. Use the sync tool below to generate an insight.</p>
                            </div>
                        )}
                    </div>

                    {/* 2. Virtual Coach Sync Tool */}
                    <div className="mb-12">
                        <h2 className="text-xl font-bold text-zinc-100 mb-4 border-b border-zinc-900 pb-2">Generate New Insight</h2>
                        <VirtualCoachSync sessions={sessions} rounds={rounds} />
                    </div>

                    {/* 3. Sync History */}
                    <div>
                        <h2 className="text-xl font-bold text-zinc-100 mb-4 border-b border-zinc-900 pb-2">Sync History</h2>
                        {historyItems.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {historyItems.map((item) => (
                                    <div key={item.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 flex flex-col items-start hover:border-zinc-700 transition-colors">
                                        <div className="flex w-full justify-between items-start mb-3">
                                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{item.date}</span>
                                            {'course' in item ? (
                                                <span className="text-xs font-bold px-2 py-1 rounded bg-zinc-800 text-zinc-300">Round</span>
                                            ) : (
                                                <span className="text-xs font-bold px-2 py-1 rounded bg-zinc-800 text-zinc-300">Practice</span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-zinc-100 mb-2">{item.coachInsight?.verdict}</h3>
                                        <p className="text-sm text-zinc-400 line-clamp-3 mb-4">{item.coachInsight?.drill}</p>
                                        <div className="mt-auto pt-4 border-t border-zinc-800 w-full">
                                            <Link href={'course' in item ? `/log/round` : `/log/session`} className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                                                View Source Data &rarr;
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-zinc-500 italic">No past insights found. Sync a session to build your history.</p>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}
