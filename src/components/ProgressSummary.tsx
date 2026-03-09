import { Round, Session } from "@/lib/firestore-utils";

interface ProgressSummaryProps {
    rounds: Round[];
    sessions: Session[];
}

export default function ProgressSummary({ rounds, sessions }: ProgressSummaryProps) {
    // Sort descending by date
    const sortedRounds = [...rounds].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const last5Rounds = sortedRounds.slice(0, 5);

    // Calculate Scoring Average
    const scoringAverage = last5Rounds.length > 0
        ? (last5Rounds.reduce((acc, r) => acc + (r.score || 0), 0) / last5Rounds.length).toFixed(1)
        : "-";

    // Calculate Penalty Trend
    const penaltyAverage = last5Rounds.length > 0
        ? (last5Rounds.reduce((acc, r) => acc + r.penaltiesCount, 0) / last5Rounds.length).toFixed(1)
        : "-";

    // Session Frequency (Last 14 days)
    const now = new Date();
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(now.getDate() - 14);

    const recentSessions = sessions.filter(s => new Date(s.date) >= twoWeeksAgo);
    const sessionsPerWeek = (recentSessions.length / 2).toFixed(1);

    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
            {/* Scoring Trend */}
            <div className="bg-zinc-900 overflow-hidden shadow-lg shadow-black/20 rounded-xl border border-zinc-800">
                <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-zinc-400 truncate">Scoring Avg (Last 5)</dt>
                    <dd className="mt-1 text-3xl font-semibold text-zinc-100">{scoringAverage}</dd>
                    <div className="mt-2 flex items-baseline text-sm">
                        {last5Rounds.length > 1 && (
                            <span className={`${(last5Rounds[0].score || 100) < (last5Rounds[1].score || 100) ? 'text-emerald-400' : 'text-red-400'} font-semibold`}>
                                {last5Rounds[0].score}
                            </span>
                        )}
                        <span className="ml-2 text-zinc-500">latest</span>
                    </div>
                </div>
            </div>

            {/* Penalty Trend */}
            <div className="bg-zinc-900 overflow-hidden shadow-lg shadow-black/20 rounded-xl border border-zinc-800">
                <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-zinc-400 truncate">Avg Penalties</dt>
                    <dd className="mt-1 text-3xl font-semibold text-zinc-100">{penaltyAverage}</dd>
                    <div className="mt-2 text-sm text-zinc-500">
                        {penaltyAverage !== "-" && Number(penaltyAverage) <= 1 ? "Target Met (<1.0)" : "Focus: Keep ball in play"}
                    </div>
                </div>
            </div>

            {/* Practice Consistency */}
            <div className="bg-zinc-900 overflow-hidden shadow-lg shadow-black/20 rounded-xl border border-zinc-800">
                <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-zinc-400 truncate">Practice Frequency</dt>
                    <dd className="mt-1 text-3xl font-semibold text-zinc-100">{sessionsPerWeek}</dd>
                    <dd className="text-sm text-zinc-500">sessions / week</dd>
                </div>
            </div>
        </div>
    );
}
