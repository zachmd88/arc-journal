"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { getDocumentsByOwner, Resource } from "@/lib/firestore-utils";
import Link from "next/link";

export default function NotebookLMPage() {
    const { user } = useAuth();
    const [notebookResources, setNotebookResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchResources = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch all resources and filter client-side for simplicity without complex indexing
            const docs = await getDocumentsByOwner<Resource>("resources", user.uid, 500);
            const synced = docs.filter(doc => doc.addedToNotebookLm);
            
            // Sort by the user's manual date tag
            synced.sort((a, b) => {
                const dateA = a.date || "1970-01-01";
                const dateB = b.date || "1970-01-01";
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });

            setNotebookResources(synced);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResources();
    }, [user]);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link href="/resources" className="text-zinc-400 hover:text-white mb-2 inline-block transition-colors">&larr; Back to Resources</Link>
                    <h1 className="text-3xl font-bold tracking-tight text-emerald-400 flex items-center gap-2">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        NotebookLM Syncs
                    </h1>
                    <p className="mt-2 text-zinc-400">All resources synced to your Google NotebookLM knowledge base.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notebookResources.map((res) => (
                            <div key={res.id} className="bg-zinc-900 border border-emerald-500/30 rounded-xl p-5 shadow-sm hover:border-emerald-500/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-lg font-bold text-zinc-100 truncate">{res.title}</h3>
                                        {res.resourceType && (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 capitalize">
                                                {res.resourceType}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
                                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            {res.date ? `Tagged Date: ${res.date}` : "No Date Provided"}
                                        </span>
                                        
                                        {res.url && <a href={res.url} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors flex items-center gap-1 truncate max-w-xs"><svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>Link</a>}
                                    </div>
                                </div>
                                {res.attachmentUrl && (
                                    <div className="flex-shrink-0">
                                        <a href={res.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 rounded border border-zinc-700 overflow-hidden hover:opacity-80 transition-opacity bg-zinc-950">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={res.attachmentUrl} alt="Attachment thumbnail" className="object-cover w-full h-full" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        ))}

                        {notebookResources.length === 0 && (
                            <div className="text-center py-12 rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/5">
                                <p className="text-emerald-400/60 font-medium">No resources have been synced to NotebookLM yet.</p>
                                <p className="text-zinc-500 text-sm mt-2">Go back to Resources and toggle the sync status on a note.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
