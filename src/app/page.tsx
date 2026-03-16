"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getLatestWeekCard, WeekCard, getRecentDocuments, Round, Session, deleteDocument } from "@/lib/firestore-utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import SinglePlaneAnalytics from "@/components/SinglePlaneAnalytics";
import MetricCard from "@/components/MetricCard";
import { Flag, Target, Crosshair, TrendingDown, Activity, PieChart } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [weekCard, setWeekCard] = useState<WeekCard | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      const card = await getLatestWeekCard(user.uid);
      setWeekCard(card);

      // Fetch 30 days of history for the Progress Module
      const recentRounds = await getRecentDocuments<Round>("rounds", user.uid, 30);
      const recentSessions = await getRecentDocuments<Session>("sessions", user.uid, 30);

      setRounds(recentRounds);
      setSessions(recentSessions);
    }
    fetchData();
  }, [user]);

  const handleDeleteActivity = async (id: string, isRound: boolean) => {
    if (!confirm("Are you sure you want to delete this activity?")) return;
    try {
      await deleteDocument(isRound ? "rounds" : "sessions", id);
      if (isRound) {
        setRounds(prev => prev.filter(r => r.id !== id));
      } else {
        setSessions(prev => prev.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error("Error deleting activity:", error);
      alert("Failed to delete activity.");
    }
  };

  // Combine for analytics
  const allRecentActivities = [...rounds, ...sessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Combine for timeline
  const timelineActivity = allRecentActivities.slice(0, 5);

  return (
    <div className="min-h-screen bg-zinc-950 pb-12 font-sans text-zinc-100">

      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-100">Overview</h1>
            <p className="mt-1 text-zinc-400">Track your progress and stick to the plan.</p>
          </div>

          {/* Full Game Metrics (Dashboard Part 2 Goal) */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Full Game Metrics
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {(() => {
                  // Compute arrays trailing oldest to newest (for charts)
                  const recentRoundsOldestFirst = [...rounds].reverse();
                  
                  // GIR Array
                  const girData = recentRoundsOldestFirst
                    .map(r => typeof r.gir === 'number' && typeof r.score === 'number' ? Math.round((r.gir / 18) * 100) : null)
                    .filter(v => v !== null) as number[];
                  
                  const currentGir = girData.length > 0 ? girData[girData.length - 1] : 0;
                  const prevGir = girData.length > 1 ? girData[girData.length - 2] : null;
                  const girTrend = prevGir !== null ? `${currentGir >= prevGir ? '+' : ''}${currentGir - prevGir}%` : "--";
                  const girDirection = prevGir === null ? 'neutral' : currentGir > prevGir ? 'up' : currentGir < prevGir ? 'down' : 'neutral';

                  // Putts per GIR
                  const puttsGirData = recentRoundsOldestFirst
                    .map(r => r.puttsPerGir || null)
                    .filter(v => v !== null) as number[];
                  
                  const currentPutts = puttsGirData.length > 0 ? puttsGirData[puttsGirData.length - 1] : 0;
                  const prevPutts = puttsGirData.length > 1 ? puttsGirData[puttsGirData.length - 2] : null;
                  const puttsTrend = prevPutts !== null ? `${currentPutts >= prevPutts ? '+' : ''}${(currentPutts - prevPutts).toFixed(1)}` : "--";
                  const puttsDirection = prevPutts === null ? 'neutral' : currentPutts > prevPutts ? 'up' : currentPutts < prevPutts ? 'down' : 'neutral';

                  // DB+
                  const dbData = recentRoundsOldestFirst
                    .map(r => typeof r.dbPlus === 'number' ? r.dbPlus : null)
                    .filter(v => v !== null) as number[];
                  
                  const currentDb = dbData.length > 0 ? dbData[dbData.length - 1] : 0;
                  const prevDb = dbData.length > 1 ? dbData[dbData.length - 2] : null;
                  const dbTrend = prevDb !== null ? `${currentDb >= prevDb ? '+' : ''}${(currentDb - prevDb).toFixed(1)}` : "--";
                  const dbDirection = prevDb === null ? 'neutral' : currentDb > prevDb ? 'up' : currentDb < prevDb ? 'down' : 'neutral';

                  // Primary Miss
                  const allMisses = [...rounds, ...sessions]
                      .map(a => ('primaryMissDirection' in a ? a.primaryMissDirection : null))
                      .filter(m => m && m !== "None");
                  
                  let missCounts: Record<string, number> = {};
                  allMisses.forEach(m => { missCounts[m as string] = (missCounts[m as string] || 0) + 1; });
                  
                  let topMiss = "None";
                  let topMissCount = 0;
                  Object.entries(missCounts).forEach(([miss, count]) => {
                      if (count > topMissCount) {
                          topMissCount = count;
                          topMiss = miss;
                      }
                  });

                  // Execution (Score / Quality mapping for chart)
                  const execData = [...sessions].reverse()
                      .map(s => {
                          if (!s.singlePlaneMetrics) return null;
                          const sq = s.singlePlaneMetrics.strikeQuality || 0;
                          const sl = s.singlePlaneMetrics.startLineControl || 0;
                          if (sq === 0 && sl === 0) return null;
                          // Average them out of 5, convert to %
                          return Math.round(((sq + sl) / 10) * 100);
                      })
                      .filter(v => v !== null) as number[];
                  
                  const currentExec = execData.length > 0 ? execData[execData.length - 1] : 0;
                  const prevExec = execData.length > 1 ? execData[execData.length - 2] : null;
                  const execTrend = prevExec !== null ? `${currentExec >= prevExec ? '+' : ''}${currentExec - prevExec}%` : "--";
                  const execDirection = prevExec === null ? 'neutral' : currentExec > prevExec ? 'up' : currentExec < prevExec ? 'down' : 'neutral';

                  return (
                      <>
                          <MetricCard 
                              title="Greens in Reg" 
                              metric={currentGir > 0 ? `${currentGir}%` : "--"} 
                              icon={<Flag className="w-5 h-5" />}
                              trend={girTrend}
                              trendDirection={girDirection}
                              data={girData.length > 0 ? girData : []}
                          />
                          <MetricCard 
                              title="Primary Miss" 
                              metric={topMiss} 
                              icon={<PieChart className="w-5 h-5" />}
                              trend={`${topMissCount} recent`}
                              trendDirection="neutral"
                              data={[]}
                          />
                          <MetricCard 
                              title="Putts per GIR" 
                              metric={currentPutts > 0 ? currentPutts.toFixed(1) : "--"} 
                              icon={<Crosshair className="w-5 h-5" />}
                              trend={puttsTrend}
                              trendDirection={puttsDirection}
                              isGolfScore={true}
                              data={puttsGirData.length > 0 ? puttsGirData : []}
                          />
                          <MetricCard 
                              title="Double Bogeys+" 
                              metric={currentDb > 0 ? currentDb : (dbData.length > 0 ? "0" : "--")} 
                              icon={<TrendingDown className="w-5 h-5" />}
                              trend={dbTrend}
                              trendDirection={dbDirection}
                              isGolfScore={true}
                              data={dbData.length > 0 ? dbData : []}
                          />
                          <MetricCard 
                              title="Target Execution" 
                              metric={currentExec > 0 ? `${currentExec}%` : "--"} 
                              icon={<Target className="w-5 h-5" />}
                              trend={execTrend}
                              trendDirection={execDirection}
                              data={execData.length > 0 ? execData : []}
                          />
                      </>
                  );
              })()}
            </div>
          </div>

          {/* Core Analytics Dashboard */}
          <div className="mb-10">
              <SinglePlaneAnalytics activities={allRecentActivities as any} />
          </div>

          {/* Active Plan Card */}
          <div className="mb-10">
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-xl font-bold text-zinc-100">This Week's Focus</h2>
              {(() => {
                const latestInsightSession = sessions.find(s => s.coachInsight?.isWeeklyFocus) || sessions.find(s => s.coachInsight !== undefined);
                if (latestInsightSession) {
                    return <span className="text-sm font-medium text-indigo-400 bg-indigo-950 px-3 py-1 rounded-full border border-indigo-900">Coach Insight: {latestInsightSession.date}</span>;
                }
                if (weekCard) {
                    return <span className="text-sm text-zinc-500">Week of {weekCard.weekStart}</span>;
                }
                return null;
              })()}
            </div>

            {(() => {
                const latestInsightSession = sessions.find(s => s.coachInsight?.isWeeklyFocus) || sessions.find(s => s.coachInsight !== undefined);

                if (latestInsightSession && latestInsightSession.coachInsight) {
                    const insight = latestInsightSession.coachInsight;
                    return (
                        <div className="overflow-hidden rounded-xl bg-zinc-900 shadow-lg border border-indigo-900 ring-1 ring-black ring-opacity-5 relative">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <svg className="w-24 h-24 text-indigo-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                            </div>
                            <div className="px-6 py-8 sm:p-10 relative z-10">
                                <div className="lg:flex lg:items-start lg:justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600/20 px-3 py-1 text-xs font-semibold text-indigo-400 shadow-sm border border-indigo-500/30">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                AI Coach Analysis
                                            </span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-zinc-100 tracking-tight mt-3">{insight.verdict}</h3>
                                        
                                        {/* THE WHY SECTION */}
                                        <div className="mt-6 mb-8 p-5 bg-zinc-950 rounded-xl border border-zinc-800 shadow-sm">
                                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                                The Root Cause (Why)
                                            </h4>
                                            <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                                                "{insight.why}"
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 border-t border-zinc-800 pt-8">
                                    <h4 className="text-sm font-bold text-zinc-100 uppercase tracking-wider mb-4">Execution Plan</h4>
                                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <li className="flex items-start p-4 bg-zinc-950 border border-zinc-800 shadow-sm rounded-xl hover:border-indigo-500/50 transition-colors">
                                            <div className="flex h-6 items-center">
                                                <input type="checkbox" aria-label="Mark primary drill complete" className="h-5 w-5 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-950" />
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <p className="text-sm font-bold text-zinc-100">Primary Drill</p>
                                                <p className="text-sm text-indigo-400 font-medium mt-0.5">{insight.drill}</p>
                                                <p className="text-xs text-zinc-500 mt-2 italic flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                                    {insight.source}
                                                </p>
                                            </div>
                                        </li>
                                        <li className="flex items-start p-4 bg-zinc-950 border border-zinc-800 shadow-sm rounded-xl hover:border-indigo-500/50 transition-colors">
                                            <div className="flex h-6 items-center">
                                                <input type="checkbox" aria-label="Mark next step complete" className="h-5 w-5 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-950" />
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <p className="text-sm font-bold text-zinc-100">Next Step</p>
                                                <p className="text-sm text-zinc-400 font-medium mt-0.5">Log Next Session to measure progress</p>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    );
                }

                if (weekCard) {
                    return (
                        <div className="overflow-hidden rounded-xl bg-zinc-900 shadow-lg border border-zinc-800 ring-1 ring-black ring-opacity-5">
                            <div className="px-6 py-8 sm:p-10">
                            <div className="lg:flex lg:items-start lg:justify-between">
                                <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                    <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
                                    Priority Pattern
                                    </span>
                                    <h3 className="text-2xl font-bold text-zinc-100 tracking-tight">{weekCard.priorityCue}</h3>
                                </div>
                                <p className="text-lg font-medium text-indigo-400 mb-6 max-w-2xl">{weekCard.priorityCommand}</p>

                                {/* THE WHY SECTION */}
                                {weekCard.generatedSummary && (
                                    <div className="mb-8 p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Analysis (The Why)</h4>
                                    <p className="text-sm text-zinc-300 leading-relaxed italic">
                                        "{weekCard.generatedSummary}"
                                    </p>
                                    </div>
                                )}

                                </div>
                            </div>

                            <div className="mt-8 border-t border-zinc-800 pt-8">
                                <h4 className="text-sm font-bold text-zinc-100 uppercase tracking-wider mb-4">Execution Plan</h4>
                                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {weekCard.planChecklist.map((item, idx) => (
                                    <li key={idx} className="flex items-start p-3 bg-zinc-950 rounded-lg border border-zinc-900">
                                    <div className="flex h-6 items-center">
                                        <input
                                        type="checkbox"
                                        className="h-5 w-5 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-950"
                                        />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-zinc-300">{item}</p>
                                    </div>
                                    </li>
                                ))}
                                </ul>
                            </div>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="rounded-xl bg-zinc-900/50 border border-dashed border-zinc-700 p-8 text-center">
                        <h3 className="text-sm font-bold text-zinc-200">No Active Data</h3>
                        <p className="mt-2 text-sm text-zinc-400">Log a session and sync with Coach Todd to generate your personalized action plan.</p>
                        <div className="mt-6">
                            <Link href="/log/session" className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
                                Log Session
                            </Link>
                        </div>
                    </div>
                );
            })()}
          </div>

          {/* Recent Activity Timeline */}
          <div>
            <h2 className="text-xl font-bold text-zinc-100 mb-4">Recent Activity</h2>
            <div className="flow-root">
              <ul role="list" className="-mb-8">
                {timelineActivity.map((item, itemIdx) => (
                  <li key={item.id}>
                    <div className="relative pb-8">
                      {itemIdx !== timelineActivity.length - 1 ? (
                        <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-zinc-800" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-zinc-950 ${'penaltiesCount' in item ? 'bg-emerald-500' : 'bg-indigo-500'}`}>
                            {/* Icon placeholder */}
                            <span className="text-white text-xs font-bold">{'penaltiesCount' in item ? 'R' : 'S'}</span>
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-zinc-500">
                              <span className="font-medium text-zinc-200">
                                {'penaltiesCount' in item ? `Round at ${item.course}` : `Practice: ${item.type}`}
                              </span>
                            </p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-zinc-500 flex flex-col items-end gap-2">
                            <time dateTime={item.date}>{item.date}</time>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => router.push(`/${'penaltiesCount' in item ? 'log/round' : 'log/session'}?edit=${item.id}`)}
                                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteActivity(item.id!, 'penaltiesCount' in item)}
                                className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {timelineActivity.length === 0 && <p className="text-zinc-500 italic">No recent activity found.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
