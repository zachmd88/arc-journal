"use client";

import { useState } from "react";

export interface SinglePlaneMetrics {
    strikeQuality: number;
    startLineControl: number;
    missPatternConsistency: number;
    preShotCommitment: number;
    setupDiscipline: number;
    dominantMiss?: string;
}

interface MetricDefinition {
    id: keyof Omit<SinglePlaneMetrics, "dominantMiss">;
    label: string;
    description: string;
    legend: Record<number, string>;
}

const METRICS: MetricDefinition[] = [
    {
        id: "strikeQuality",
        label: "Strike Quality",
        description: "Quality of ball contact / compression / low-point control.",
        legend: {
            1: "Very poor (many fat/thin, inconsistent strike)",
            2: "Mostly poor with occasional solid",
            3: "Mixed contact (about half solid)",
            4: "Mostly solid with occasional mishits",
            5: "Excellent compression and clean contact most shots"
        }
    },
    {
        id: "startLineControl",
        label: "Start Line Control",
        description: "How consistently the ball STARTS on intended line.",
        legend: {
            1: "Starts far offline frequently (big pulls/pushes)",
            2: "Large directional misses common",
            3: "Some inconsistency, mixed starts",
            4: "Usually starts close to target line",
            5: "Excellent start line control (minimal deviation)"
        }
    },
    {
        id: "missPatternConsistency",
        label: "Miss Pattern Consistency",
        description: "Predictability of misses (great golf is one miss).",
        legend: {
            1: "Random misses (thin/fat/hook/block)",
            2: "Multiple miss types, no clear pattern",
            3: "Somewhat predictable",
            4: "Mostly one consistent miss",
            5: "Very predictable single miss (elite consistency)"
        }
    },
    {
        id: "preShotCommitment",
        label: "Pre-Shot Commitment",
        description: "Mental clarity/commitment to target before swing.",
        legend: {
            1: "Constant swing thoughts / steering",
            2: "Frequent hesitation/doubt",
            3: "Mixed commitment",
            4: "Mostly committed",
            5: "Fully committed every shot; target-focused"
        }
    },
    {
        id: "setupDiscipline",
        label: "Setup Discipline",
        description: "Consistency of Single Plane setup geometry/routine.",
        legend: {
            1: "Rushed/inconsistent setup most shots",
            2: "Frequent setup drift",
            3: "Moderate consistency",
            4: "Mostly consistent routine",
            5: "Identical routine every shot"
        }
    }
];

const DOMINANT_MISS_OPTIONS = ["pull", "push", "hook", "block", "thin", "fat", "draw", "fade"];

export default function SinglePlaneTrackerForm({
    value,
    onChange
}: {
    value: SinglePlaneMetrics;
    onChange: (metrics: SinglePlaneMetrics) => void;
}) {
    const [openLegends, setOpenLegends] = useState<Record<string, boolean>>({});

    const toggleLegend = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        setOpenLegends(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleRatingChange = (id: keyof SinglePlaneMetrics, rating: number) => {
        onChange({ ...value, [id]: rating });
    };

    return (
        <div className="space-y-6 bg-zinc-950/50 p-4 sm:p-6 rounded-lg border border-zinc-800">
            {METRICS.map((metric) => (
                <div key={metric.id} className="border-b border-zinc-800/50 pb-5 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-zinc-200">{metric.label}</h4>
                                <button 
                                    type="button" 
                                    onClick={(e) => toggleLegend(metric.id, e)}
                                    className="text-zinc-500 hover:text-indigo-400 focus:outline-none transition-colors"
                                    title="Show Legend"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">{metric.description}</p>
                        </div>
                    </div>

                    {/* Legend Drawer */}
                    {openLegends[metric.id] && (
                        <div className="mb-3 p-3 bg-indigo-950/20 rounded-md border border-indigo-900/30 text-xs text-zinc-300 space-y-1">
                            {[1, 2, 3, 4, 5].map(rating => (
                                <div key={rating} className="flex gap-2">
                                    <span className="font-bold text-indigo-400">{rating}</span>
                                    <span>{metric.legend[rating]}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Rating Bubbles */}
                    <div className="flex gap-2 mt-3">
                        {[1, 2, 3, 4, 5].map((rating) => {
                            const isSelected = value[metric.id] === rating;
                            return (
                                <button
                                    key={rating}
                                    type="button"
                                    onClick={() => handleRatingChange(metric.id, rating)}
                                    className={`flex-1 h-10 rounded-md text-sm font-semibold transition-all ${isSelected 
                                            ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950' 
                                            : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'}`}
                                >
                                    {rating}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            <div className="pt-2">
                <label className="block text-sm font-medium text-zinc-400 mb-2">Dominant Miss (Optional)</label>
                <select
                    title="Dominant Miss"
                    className="block w-full max-w-xs rounded-md border-none bg-zinc-900 py-3 px-4 text-zinc-200 shadow-inner focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                    value={value.dominantMiss || ""}
                    onChange={(e) => onChange({ ...value, dominantMiss: e.target.value })}
                >
                    <option value="">None / Not Sure</option>
                    {DOMINANT_MISS_OPTIONS.map(opt => (
                        <option key={opt} value={opt} className="capitalize">{opt}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
