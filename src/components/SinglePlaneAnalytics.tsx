"use client";

import { useMemo } from "react";
import { ActivityObj } from "@/lib/firestore-utils";
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

interface AnalyticsProps {
    activities: ActivityObj[];
}

const METRIC_KEYS = [
    { key: "strikeQuality", label: "Strike Quality" },
    { key: "startLineControl", label: "Start Line Control" },
    { key: "missPatternConsistency", label: "Miss Consistency" },
    { key: "preShotCommitment", label: "Commitment" },
    { key: "setupDiscipline", label: "Setup Discipline" }
] as const;

export default function SinglePlaneAnalytics({ activities }: AnalyticsProps) {
    // 1. Filter to activities that actually have singlePlaneMetrics scored
    const validActivities = useMemo(() => {
        return activities.filter(a => a.singlePlaneMetrics && Object.values(a.singlePlaneMetrics).some(v => typeof v === 'number' && v > 0));
    }, [activities]);

    const { trendData, radarData, averages, lowestMetric } = useMemo(() => {
        if (validActivities.length === 0) {
            return { trendData: [], radarData: [], averages: null, lowestMetric: null };
        }

        // Sort ascending by date for Line chart trending over time
        const chronological = [...validActivities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const trendData = chronological.map(act => {
            const m = act.singlePlaneMetrics!;
            const total = METRIC_KEYS.reduce((sum, mk) => sum + (m[mk.key as keyof typeof m] as number || 0), 0);
            const count = METRIC_KEYS.filter(mk => m[mk.key as keyof typeof m]).length || 1;
            
            return {
                name: act.date.slice(5), // "MM-DD"
                composite: Number((total / count).toFixed(1)),
                date: act.date
            };
        });

        // For Averages and Radar, use the Last 5 (which means the latest 5 chronologically)
        const recent5 = chronological.slice(-5);
        
        let sums: Record<string, number> = {};
        let counts: Record<string, number> = {};
        METRIC_KEYS.forEach(mk => {
            sums[mk.key] = 0;
            counts[mk.key] = 0;
        });

        recent5.forEach(act => {
            const m = act.singlePlaneMetrics!;
            METRIC_KEYS.forEach(mk => {
                const val = m[mk.key as keyof typeof m] as number;
                if (val > 0) {
                    sums[mk.key] += val;
                    counts[mk.key] += 1;
                }
            });
        });

        const averages: Record<string, number> = {};
        let lowestVal = 5.1;
        let lowestLabel = "";

        const radarData = METRIC_KEYS.map(mk => {
            const avg = counts[mk.key] > 0 ? Number((sums[mk.key] / counts[mk.key]).toFixed(1)) : 0;
            averages[mk.label] = avg;

            if (avg > 0 && avg < lowestVal) {
                lowestVal = avg;
                lowestLabel = mk.label;
            }

            return {
                subject: mk.label,
                A: avg,
                fullMark: 5
            };
        });

        const compositeAvg = radarData.reduce((sum, d) => sum + d.A, 0) / (radarData.filter(d => d.A > 0).length || 1);
        averages["Composite Score"] = Number(compositeAvg.toFixed(1));

        return { 
            trendData, 
            radarData, 
            averages, 
            lowestMetric: lowestLabel ? { name: lowestLabel, val: lowestVal } : null 
        };
    }, [validActivities]);

    if (validActivities.length === 0) return null;

    return (
        <div className="mb-10 p-6 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5">
                <svg className="w-32 h-32 text-indigo-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 3.8l7.2 14.4H4.8L12 5.8z"/></svg>
            </div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002-2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            Training Progress Tracker
                        </h2>
                        <p className="text-sm text-zinc-400 mt-1">Analytics based on your {validActivities.length} most recent logged metrics.</p>
                    </div>
                    {lowestMetric && (
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Primary Focus</p>
                            <p className="text-sm font-bold text-red-400 mt-1 flex items-center gap-1 justify-end">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                {lowestMetric.name} ({lowestMetric.val})
                            </p>
                        </div>
                    )}
                </div>

                {/* Practice Frequency Banner */}
                {(() => {
                    const now = new Date();
                    const twoWeeksAgo = new Date();
                    twoWeeksAgo.setDate(now.getDate() - 14);
                    
                    const recentSessions = activities.filter(a => a.activityType === "session" && new Date(a.date) >= twoWeeksAgo);
                    const sessionsPerWeek = (recentSessions.length / 2).toFixed(1);

                    return (
                        <div className="mb-6 bg-zinc-950/50 rounded-lg p-4 border border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-zinc-300">Practice Frequency</p>
                                    <p className="text-xs text-zinc-500">Based on the last 14 days</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-emerald-400">{sessionsPerWeek}</span>
                                <span className="text-sm text-zinc-400 ml-1">sessions / wk</span>
                            </div>
                        </div>
                    );
                })()}

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                    
                    {/* Radar Profile */}
                    <div className="bg-zinc-950 rounded-lg p-5 border border-zinc-800 shadow-inner flex flex-col items-center justify-center">
                        <h3 className="text-sm font-bold text-zinc-300 w-full text-center uppercase tracking-widest mb-2">Radar Profile (Last 5)</h3>
                        <div className="w-full h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="#3f3f46" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#71717a', fontSize: 10 }} />
                                    <Radar name="Metrics" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '0.5rem', color: '#e4e4e7', fontSize: '12px' }}
                                        itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        {averages && (
                            <div className="mt-4 text-center">
                                <span className="text-xs text-zinc-500 font-semibold uppercase">Composite Average: </span>
                                <span className="text-lg font-bold text-indigo-400">{averages["Composite Score"]}</span>
                                <span className="text-xs text-zinc-600"> / 5.0</span>
                            </div>
                        )}
                    </div>

                    {/* Trend Over Time */}
                    <div className="bg-zinc-950 rounded-lg p-5 border border-zinc-800 shadow-inner flex flex-col">
                        <h3 className="text-sm font-bold text-zinc-300 w-full text-left uppercase tracking-widest mb-4">Trend Over Time (Composite)</h3>
                        <div className="w-full h-[250px] flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis dataKey="name" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickMargin={10} />
                                    <YAxis domain={[0, 5]} stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '0.5rem', color: '#e4e4e7', fontSize: '12px' }}
                                        itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                                    />
                                    <Line type="monotone" dataKey="composite" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#818cf8' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        {lowestMetric && (
                            <div className="mt-4 sm:hidden text-center bg-red-950/20 py-2 rounded border border-red-900/30">
                                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Primary Focus</p>
                                <p className="text-xs font-bold text-red-400 mt-0.5">{lowestMetric.name} ({lowestMetric.val})</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
