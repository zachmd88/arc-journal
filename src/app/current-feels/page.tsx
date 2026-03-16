"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getDocumentsByOwner, Feel, deleteDocument, updateDocument } from "@/lib/firestore-utils";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function CurrentFeelsPage() {
    const { user } = useAuth();
    const [feels, setFeels] = useState<Feel[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editModeText, setEditModeText] = useState("");

    // Fetch Feels
    useEffect(() => {
        async function fetchFeels() {
            if (!user) return;
            try {
                // Fetch all feels for the user without ordering to avoid requiring a composite index
                const q = query(collection(db, "feels"), where("ownerUid", "==", user.uid));
                const snapshot = await getDocs(q);
                const recent = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feel));
                
                // Sort them client-side by date descending
                recent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                
                setFeels(recent);
            } catch (error) {
                console.error("Error fetching feels:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchFeels();
    }, [user]);

    const handleDelete = async (feel: Feel) => {
        if (!confirm("Are you sure you want to delete this recorded feel?")) return;
        try {
            await deleteDocument("feels", feel.id!);
            if (feel.sourceId) {
                if (feel.source === "round") {
                    await updateDocument("rounds", feel.sourceId, { currentFeels: "", feelId: "" });
                } else if (feel.source === "session") {
                    await updateDocument("sessions", feel.sourceId, { feels: "", feelId: "" });
                }
            }
            setFeels(prev => prev.filter(f => f.id !== feel.id));
            if (editingId === feel.id) cancelEdit();
        } catch (error) {
            console.error("Error deleting feel:", error);
            alert("Failed to delete feel");
        }
    };

    const startEdit = (feel: Feel) => {
        setEditingId(feel.id!);
        setEditModeText(feel.text);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditModeText("");
    };

    const saveEdit = async (feel: Feel) => {
        if (!editModeText.trim()) return;
        try {
            await updateDocument("feels", feel.id!, { text: editModeText });
            if (feel.sourceId) {
                if (feel.source === "round") {
                    await updateDocument("rounds", feel.sourceId, { currentFeels: editModeText });
                } else if (feel.source === "session") {
                    await updateDocument("sessions", feel.sourceId, { feels: editModeText });
                }
            }
            setFeels(prev => prev.map(f => f.id === feel.id ? { ...f, text: editModeText } : f));
            cancelEdit();
        } catch (error) {
            console.error("Error updating feel:", error);
            alert("Failed to update feel");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 pb-12 font-sans text-zinc-100">
            <main className="py-10">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    
                    {/* Header */}
                    <div className="mb-10 text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Current Feels</h1>
                        <p className="mt-3 text-lg leading-8 text-zinc-400">
                            A timeline of the swing thoughts and feelings that are currently working for you.
                        </p>
                    </div>

                    {/* Timeline */}
                    <div className="relative">
                        {/* Timeline vertical line */}
                        <div className="absolute left-4 sm:left-1/2 top-4 bottom-4 w-px bg-zinc-800 transform sm:-translate-x-1/2"></div>
                        
                        {feels.length === 0 ? (
                            <div className="text-center py-12 relative z-10 bg-zinc-900 rounded-lg border border-zinc-800 shadow-md">
                                <p className="text-zinc-500 italic">No feels recorded yet.</p>
                                <p className="text-sm text-zinc-600 mt-2">Log a round or session to add your first thought.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {feels.map((feel, idx) => {
                                    const isRound = feel.source === "round";
                                    const isEditing = editingId === feel.id;
                                    const isEvenRow = idx % 2 === 0;

                                    return (
                                        <div key={feel.id} className={`relative flex items-center justify-between sm:w-full ${isEvenRow ? 'sm:flex-row-reverse' : ''}`}>
                                            {/* Center marker */}
                                            <div className="absolute left-4 sm:left-1/2 transform -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full shadow z-10 bg-zinc-950 ring-4 ring-zinc-950">
                                                <div className={`w-3 h-3 rounded-full ${isRound ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]'}`}></div>
                                            </div>

                                            {/* Left/Right spacer for desktop */}
                                            <div className="hidden sm:block sm:w-1/2"></div>

                                            {/* Content Card */}
                                            <div className="w-full pl-12 sm:pl-0 sm:w-1/2 sm:px-8 relative z-10">
                                                <div className={`bg-zinc-900 rounded-xl p-5 shadow-lg border border-zinc-800 transition-all hover:bg-zinc-900/80 ${isRound ? 'hover:border-emerald-500/50' : 'hover:border-indigo-500/50'}`}>
                                                    
                                                    {/* Card Header: Date & Tag */}
                                                    <div className="flex items-center justify-between mb-3 border-b border-zinc-800/50 pb-3">
                                                        <span className="text-sm font-semibold text-zinc-300">{feel.date}</span>
                                                        <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border ${
                                                            isRound 
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                        }`}>
                                                            {isRound ? 'Full Round' : 'Range Session'}
                                                        </span>
                                                    </div>

                                                    {/* Card Body: Text or Edit Form */}
                                                    {isEditing ? (
                                                        <div className="space-y-3">
                                                            <textarea
                                                                rows={3}
                                                                title="Edit Recorded Feel"
                                                                placeholder="Edit your recorded feel..."
                                                                className="block w-full rounded-md border-none bg-zinc-950 py-2 px-3 text-zinc-100 shadow-inner focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                                                                value={editModeText}
                                                                onChange={(e) => setEditModeText(e.target.value)}
                                                                autoFocus
                                                            />
                                                            <div className="flex items-center gap-2 justify-end">
                                                                <button onClick={cancelEdit} className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 transition-colors font-medium">Cancel</button>
                                                                <button onClick={() => saveEdit(feel)} className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-white transition-colors font-semibold shadow">Save</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <p className="text-base text-zinc-200 leading-relaxed italic border-l-2 border-zinc-700 pl-3 py-1 my-2">"{feel.text}"</p>
                                                            
                                                            {/* Card Footer: Actions */}
                                                            <div className="mt-4 pt-3 flex items-center justify-end gap-3">
                                                                <button 
                                                                    onClick={() => startEdit(feel)}
                                                                    className="text-xs font-semibold text-zinc-500 hover:text-indigo-400 transition-colors uppercase tracking-wider"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                                                                <button 
                                                                    onClick={() => handleDelete(feel)}
                                                                    className="text-xs font-semibold text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-wider"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}
