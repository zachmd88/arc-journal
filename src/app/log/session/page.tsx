"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { addDocument, Session, uploadAttachment, getRecentDocuments, updateDocument, deleteDocument } from "@/lib/firestore-utils";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import SinglePlaneTrackerForm, { SinglePlaneMetrics } from "@/components/SinglePlaneTrackerForm";

export default function LogSessionPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    
    const initialFormState = {
        date: new Date().toISOString().split('T')[0],
        type: "range",
        rawNotes: "",
        singlePlaneMetrics: {
            strikeQuality: 0,
            startLineControl: 0,
            missPatternConsistency: 0,
            preShotCommitment: 0,
            setupDiscipline: 0,
            dominantMiss: ""
        } as SinglePlaneMetrics
    };
    
    const [formData, setFormData] = useState(initialFormState);
    const [files, setFiles] = useState<File[]>([]);
    const [history, setHistory] = useState<Session[]>([]);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [editModeId, setEditModeId] = useState<string | null>(null);

    // Fetch History
    useEffect(() => {
        async function fetchHistory() {
            if (!user) return;
            const recent = await getRecentDocuments<Session>("sessions", user.uid, 20);
            setHistory(recent);
        }
        fetchHistory();
    }, [user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            // Upload attachments first if any
            const attachmentUrls: string[] = [];
            for (const file of files) {
                const url = await uploadAttachment(file, user.uid);
                attachmentUrls.push(url);
            }

            const sessionData: Partial<Session> = {
                ownerUid: user.uid,
                date: formData.date,
                type: formData.type as "range" | "practice",
                rawNotes: formData.rawNotes,
            };

            const hasMetrics = Object.values(formData.singlePlaneMetrics).some(val => typeof val === 'number' && val > 0);
            if (!hasMetrics && !confirm("You haven't added any Single Plane Metrics ratings! Are you sure you want to save without them?")) {
                setLoading(false);
                return;
            }

            if (hasMetrics) {
                // filter out 0s if desired, or just pass as is. Passing as is is fine.
                sessionData.singlePlaneMetrics = { ...formData.singlePlaneMetrics };
            }

            if (attachmentUrls.length > 0) {
                // If editing, we might want to append to existing attachments, but 
                // for simplicity we just set the new ones or ignore if none uploaded.
                sessionData.attachments = attachmentUrls;
            }

            if (editModeId) {
                await updateDocument("sessions", editModeId, sessionData);
            } else {
                sessionData.tags = [];
                await addDocument<Omit<Session, "id" | "createdAt" | "attachments">>("sessions", sessionData as any);
            }
            
            router.push("/");
        } catch (error) {
            console.error("Error saving session:", error);
            alert("Failed to save session");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (session: Session) => {
        setFormData({
            date: session.date,
            type: session.type,
            rawNotes: session.rawNotes || "",
            singlePlaneMetrics: session.singlePlaneMetrics || initialFormState.singlePlaneMetrics
        });
        setEditModeId(session.id || null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this session? This cannot be undone.")) return;
        
        try {
            await deleteDocument("sessions", id);
            setHistory(prev => prev.filter(s => s.id !== id));
            if (editModeId === id) {
                cancelEdit();
            }
        } catch (error) {
            console.error("Error deleting session:", error);
            alert("Failed to delete session");
        }
    };

    const cancelEdit = () => {
        setEditModeId(null);
        setFormData(initialFormState);
    };

    const toggleExpand = (id: string) => {
        setExpandedItem(expandedItem === id ? null : id);
    };

    return (
        <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
            <div className="max-w-2xl mx-auto">
                <Link href="/" className="text-indigo-400 hover:text-indigo-300 mb-6 flex items-center gap-2 text-sm font-medium transition-colors" title="Back to Dashboard">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Dashboard
                </Link>

                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">{editModeId ? "Edit Practice Session" : "Log Practice Session"}</h1>
                    {editModeId && (
                        <button onClick={cancelEdit} className="text-sm px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-300 transition-colors">
                            Cancel Edit
                        </button>
                    )}
                </div>

                {/* LOG FORM */}
                <form onSubmit={handleSubmit} className={`p-6 sm:p-8 rounded-xl shadow-lg border space-y-6 mb-12 transition-colors ${editModeId ? 'bg-indigo-950/20 border-indigo-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-300 mb-2">Date</label>
                            <input
                                type="date"
                                required
                                title="Date"
                                className="block w-full rounded-md border-none bg-zinc-950 py-3 px-4 text-zinc-100 shadow-inner focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-shadow"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-zinc-300 mb-2">Type</label>
                            <select
                                title="Practice Type"
                                className="block w-full rounded-md border-none bg-zinc-950 py-3 px-4 text-zinc-100 shadow-inner focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-shadow"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="range">Range / Full Swing</option>
                                <option value="practice">Short Game / Putting</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-zinc-300 mb-2">Notes & Feels</label>
                        <textarea
                            rows={6}
                            required
                            title="Notes"
                            className="block w-full rounded-md border-none bg-zinc-950 py-3 px-4 text-zinc-100 shadow-inner placeholder:text-zinc-600 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-shadow"
                            placeholder="What did you work on? What were the key feels or breakthroughs?"
                            value={formData.rawNotes}
                            onChange={(e) => setFormData({ ...formData, rawNotes: e.target.value })}
                        />
                    </div>

                    {/* Single Plane Progress Tracker */}
                    <details className="group border border-zinc-800 rounded-lg bg-zinc-950/30 overflow-hidden">
                        <summary className="px-5 py-4 font-bold text-zinc-100 cursor-pointer flex justify-between items-center hover:bg-zinc-900/50 transition-colors">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                Single Plane Progress Tracker
                            </div>
                            <svg className="w-5 h-5 text-zinc-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </summary>
                        <div className="px-5 pb-5 pt-2 border-t border-zinc-800/50">
                            <SinglePlaneTrackerForm 
                                value={formData.singlePlaneMetrics} 
                                onChange={(metrics) => setFormData(prev => ({ ...prev, singlePlaneMetrics: metrics }))} 
                            />
                        </div>
                    </details>

                    {/* ATTACHMENTS */}
                    <div>
                        <label className="block text-sm font-semibold text-zinc-300 mb-2">Attachments (Optional)</label>
                        <div className="mt-2 flex justify-center rounded-lg border border-dashed border-zinc-700 px-6 py-8 hover:bg-zinc-950/50 transition-colors">
                            <div className="text-center">
                                <svg className="mx-auto h-12 w-12 text-zinc-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                                </svg>
                                <div className="mt-4 flex text-sm leading-6 text-zinc-400 justify-center">
                                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-transparent font-semibold text-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 hover:text-indigo-300">
                                        <span>Upload images</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handleFileChange} />
                                    </label>
                                </div>
                                <p className="text-xs leading-5 text-zinc-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                            </div>
                        </div>
                        {files.length > 0 && (
                            <ul className="mt-3 text-sm text-zinc-400 space-y-1 bg-zinc-950 p-3 rounded-md border border-zinc-800">
                                {files.map((file, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        {file.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full flex justify-center py-3 px-4 rounded-md shadow-sm text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-indigo-500 disabled:opacity-50 transition-colors ${editModeId ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                    >
                        {loading ? "Saving..." : editModeId ? "Update Session" : "Save Session"}
                    </button>
                </form>

                {/* RECENT HISTORY */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Past Sessions
                    </h2>
                    
                    {history.length === 0 ? (
                        <p className="text-zinc-500 italic text-sm bg-zinc-900 p-4 rounded-lg border border-zinc-800">No recent sessions found.</p>
                    ) : (
                        <div className="space-y-4">
                            {history.map((session) => {
                                const isExpanded = expandedItem === session.id;
                                return (
                                    <div key={session.id} className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden shadow-sm">
                                        <div 
                                            className="px-5 py-4 flex justify-between items-center cursor-pointer hover:bg-zinc-800/50 transition-colors"
                                            onClick={() => toggleExpand(session.id || '')}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-zinc-200">{session.date}</span>
                                                <span className="text-xs text-zinc-500 capitalize">{session.type} Practice</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 mr-4 border-r border-zinc-700 pr-4">
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(session); }}
                                                        className="text-xs font-medium px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => handleDelete(session.id!, e)}
                                                        className="text-xs font-medium px-2 py-1 rounded bg-red-950/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors border border-red-900/20"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>

                                                {session.attachments && session.attachments.length > 0 && (
                                                    <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded hidden sm:inline-flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        {session.attachments.length}
                                                    </span>
                                                )}
                                                <span className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                                    {isExpanded ? 'Hide' : 'Details'}
                                                    <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {isExpanded && (
                                            <div className="px-5 pb-5 pt-2 border-t border-zinc-800/50 bg-zinc-950/30">
                                                <div className="mb-4">
                                                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Notes</p>
                                                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{session.rawNotes}</p>
                                                </div>
                                                
                                                {session.attachments && session.attachments.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Attachments</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {session.attachments.map((url, idx) => (
                                                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block relative w-20 h-20 rounded-md overflow-hidden border border-zinc-700 hover:border-indigo-500 transition-colors">
                                                                    <Image src={url} alt={`Attachment ${idx + 1}`} fill className="object-cover" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {session.coachInsight && (
                                                    <div className="mt-4 p-3 bg-indigo-950/20 border border-indigo-900/50 rounded-md">
                                                        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                            Coach Insight
                                                        </p>
                                                        <p className="text-sm text-indigo-200">{session.coachInsight.verdict}</p>
                                                    </div>
                                                )}

                                                {/* Single Plane Tracker Mini Display for History */}
                                                {session.singlePlaneMetrics && Object.values(session.singlePlaneMetrics).some(v => typeof v === 'number' && v > 0) && (
                                                    <div className="mt-4">
                                                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Metrics Snapshot</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">Strike: <span className="text-zinc-200">{session.singlePlaneMetrics.strikeQuality || "-"}</span></span>
                                                            <span className="text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">Start Line: <span className="text-zinc-200">{session.singlePlaneMetrics.startLineControl || "-"}</span></span>
                                                            <span className="text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">Miss: <span className="text-zinc-200">{session.singlePlaneMetrics.missPatternConsistency || "-"}</span></span>
                                                            <span className="text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">Commitment: <span className="text-zinc-200">{session.singlePlaneMetrics.preShotCommitment || "-"}</span></span>
                                                            <span className="text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">Setup: <span className="text-zinc-200">{session.singlePlaneMetrics.setupDiscipline || "-"}</span></span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
