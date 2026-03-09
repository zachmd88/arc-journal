"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { addDocument, WeekCard } from "@/lib/firestore-utils";
import { createWeekCardFromHistory } from "@/lib/rule-engine";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DemoPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleSeed = async () => {
        if (!user) {
            setMessage("Please login first.");
            return;
        }
        setLoading(true);
        setMessage("Seeding 30-day history...");

        try {
            // Helper to create dates
            const today = new Date();
            const dateStr = (d: Date) => d.toISOString().split('T')[0];

            const day0 = dateStr(today);
            const day5 = new Date(today); day5.setDate(today.getDate() - 5);
            const day12 = new Date(today); day12.setDate(today.getDate() - 12);

            // 1. Create 3 Rounds (Simulating a Slice pattern)
            const round1 = {
                date: dateStr(day12),
                course: "Torrey Pines South",
                score: 88,
                penaltiesCount: 3,
                teeMissStart: "R",
                teeMissCurve: "R", // Slice
                approach60_150: { attempts: 12, greensHit: 3, missSide: "S", contact: "fat" },
                rawNotes: "Struggled with slice."
            };

            const round2 = {
                date: dateStr(day5),
                course: "Spyglass Hill",
                score: 85,
                penaltiesCount: 2,
                teeMissStart: "R", // Push
                teeMissCurve: "R", // Slice
                approach60_150: { attempts: 10, greensHit: 4, missSide: "R", contact: "thiin" },
                rawNotes: "Better, but still losing balls right."
            };

            const round3 = {
                date: day0,
                course: "Pebble Beach (Demo)",
                score: 82,
                penaltiesCount: 1,
                teeMissStart: "C",
                teeMissCurve: "R", // Fade/Slice
                approach60_150: { attempts: 10, greensHit: 5, missSide: "L", contact: "flush" },
                rawNotes: "Demo round. Contact improving."
            };

            // Wrap Firestore calls in a timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: Firestore is not responding. Please check your Firebase Console and ensure Firestore Database is created and permissions are open.")), 8000)
            );

            // Race the writes
            await Promise.race([
                Promise.all([
                    addDocument("rounds", { ...round1, ownerUid: user.uid }),
                    addDocument("rounds", { ...round2, ownerUid: user.uid }),
                    addDocument("rounds", { ...round3, ownerUid: user.uid }),
                    addDocument("sessions", {
                        date: day0,
                        type: "range",
                        rawNotes: "Demo range session. Focus on grip pressure."
                    })
                ]),
                timeoutPromise
            ]);

            // 3. Generate Week Card from history
            const nextWeekStart = new Date(today);
            nextWeekStart.setDate(today.getDate() + 1);
            const nextWeekEnd = new Date(nextWeekStart);
            nextWeekEnd.setDate(nextWeekStart.getDate() + 6);

            // Mock objects with IDs for the engine
            const historyRounds: any[] = [
                { ...round3, id: "r3", ownerUid: user.uid },
                { ...round2, id: "r2", ownerUid: user.uid },
                { ...round1, id: "r1", ownerUid: user.uid }
            ];

            // Cast to correct types
            const weekCard = createWeekCardFromHistory(
                historyRounds,
                [], // No sessions for now
                user.uid,
                dateStr(nextWeekStart),
                dateStr(nextWeekEnd)
            );

            await addDocument("weekCards", weekCard);

            setMessage("Success! Redirecting to Dashboard...");
            setTimeout(() => router.push("/"), 1500);

        } catch (error: any) {
            console.error(error);
            setMessage(`Error: ${error.message || "Unknown error"}.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Demo Mode</h1>
                <p className="text-gray-600 mb-8">
                    Click below to automatically populate your account with sample data (Round, Session, and Weekly Plan).
                </p>

                {user ? (
                    <button
                        onClick={handleSeed}
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {loading ? "Seeding..." : "Seed Demo Data"}
                    </button>
                ) : (
                    <div className="text-red-600">
                        Please <Link href="/login" className="underline">login</Link> to use demo mode.
                    </div>
                )}

                {message && (
                    <p className={`mt-4 text-sm ${message.includes("Success") ? "text-green-600" : "text-gray-600"} ${message.includes("Error") ? "text-red-600 font-medium" : ""}`}>
                        {message}
                    </p>
                )}

                <div className="mt-6 border-t pt-4">
                    <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
                        &larr; Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
