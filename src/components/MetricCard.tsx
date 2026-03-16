"use client";

import { Card } from "@tremor/react";
import { SparkAreaChart } from "@tremor/react";

export interface MetricCardProps {
    title: string;
    metric: string | number;
    icon: React.ReactNode;
    trend: string;
    trendDirection: 'up' | 'down' | 'neutral';
    data: number[];
    isGolfScore?: boolean; // If true, smaller values are better (e.g. Putts, DB+)
}

export default function MetricCard({ title, metric, icon, trend, trendDirection, data, isGolfScore = false }: MetricCardProps) {
    // Determine text colors based on trend and whether lower is better (isGolfScore)
    let trendColorClass = "text-zinc-500";
    
    if (trendDirection === 'up') {
        trendColorClass = isGolfScore ? "text-red-500" : "text-emerald-500";
    } else if (trendDirection === 'down') {
        trendColorClass = isGolfScore ? "text-emerald-500" : "text-red-500";
    }

    // Determine sparkline color based on trailing data
    // If the latest is better than the oldest, green. Otherwise red.
    let sparklineColor: "emerald" | "red" | "zinc" = "zinc";
    if (data.length > 1) {
        const oldest = data[0];
        const newest = data[data.length - 1];
        if (newest > oldest) {
            sparklineColor = isGolfScore ? "red" : "emerald";
        } else if (newest < oldest) {
             sparklineColor = isGolfScore ? "emerald" : "red";
        }
    }

    // Tremor SparkAreaChart requires array of objects, e.g. [{ value: 10 }, { value: 20 }]
    const chartData = data.map((val, idx) => ({
        index: idx.toString(),
        value: val
    }));

    return (
        <Card className="bg-zinc-900 border-zinc-800 ring-0 p-5 rounded-xl flex flex-col justify-between shadow-lg">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-zinc-400">{title}</p>
                    <div className="text-zinc-500 p-1.5 bg-zinc-950 rounded-md ring-1 ring-zinc-800">
                        {icon}
                    </div>
                </div>
                
                <div className="flex items-end gap-3 mb-1">
                    <p className="text-3xl font-bold text-zinc-100">{metric}</p>
                    <span className={`text-sm font-semibold mb-1 ${trendColorClass}`}>
                        {trend}
                    </span>
                </div>
            </div>

            <div className="mt-4 h-12 w-full">
                {chartData.length > 0 ? (
                    <SparkAreaChart
                        data={chartData}
                        categories={["value"]}
                        index="index"
                        colors={[sparklineColor]}
                        className="h-full w-full"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center border-t border-dashed border-zinc-800 pt-2 text-xs text-zinc-600">
                        Not enough data
                    </div>
                )}
            </div>
        </Card>
    );
}
