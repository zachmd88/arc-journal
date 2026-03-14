"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useRef, useEffect } from "react";
import { addDocument, getDocumentsByOwner, Resource, uploadAttachment, deleteDocument, updateDocument } from "@/lib/firestore-utils";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";

const RESOURCE_TYPES = ["youtube video", "article", "blog post", "email", "tweet", "photo/screenshot", "website", "other"] as const;

export default function ResourcesPage() {
    const { user } = useAuth();
    const [resources, setResources] = useState<Resource[]>([]);
    
    // New Resource State
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [status, setStatus] = useState<Resource["status"]>("idea");
    const [resourceType, setResourceType] = useState<Resource["resourceType"]>("article");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // List State
    const [expandedResId, setExpandedResId] = useState<string | null>(null);
    const [editingResId, setEditingResId] = useState<string | null>(null);
    
    // Edit State
    const [editTitle, setEditTitle] = useState("");
    const [editUrl, setEditUrl] = useState("");
    const [editStatus, setEditStatus] = useState<Resource["status"]>("idea");
    const [editResourceType, setEditResourceType] = useState<Resource["resourceType"]>("article");
    const [editDate, setEditDate] = useState("");

    const fetchResources = async () => {
        if (!user) return;
        const docs = await getDocumentsByOwner<Resource>("resources", user.uid, 100);
        setResources(docs);
    };

    useEffect(() => {
        fetchResources();
    }, [user]);

    const handleUrlBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (val && !/^https?:\/\//i.test(val)) {
            val = 'https://' + val;
            setUrl(val);
        }
    };

    const handleEditUrlBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (val && !/^https?:\/\//i.test(val)) {
            val = 'https://' + val;
            setEditUrl(val);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        try {
            let attachmentUrl = "";
            if (file) {
                attachmentUrl = await uploadAttachment(file, user.uid);
            }

            const doc: Omit<Resource, "id" | "createdAt"> = {
                ownerUid: user.uid,
                title,
                url,
                status,
                resourceType,
                date,
                addedToNotebookLm: false,
                attachmentUrl,
                tags: []
            };

            await addDocument("resources", doc);
            
            // Reset form
            setTitle("");
            setUrl("");
            setStatus("idea");
            setResourceType("article");
            setDate(new Date().toISOString().split("T")[0]);
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            
            await fetchResources();
        } catch (error) {
            console.error("Error adding resource", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this resource?")) return;
        await deleteDocument("resources", id);
        await fetchResources();
    };

    const handleToggleNotebookLm = async (id: string, currentVal: boolean | undefined) => {
        await updateDocument("resources", id, { addedToNotebookLm: !currentVal });
        await fetchResources();
    };

    const startEdit = (res: Resource) => {
        setEditingResId(res.id!);
        setEditTitle(res.title);
        setEditUrl(res.url || "");
        setEditStatus(res.status);
        setEditResourceType(res.resourceType || "other");
        setEditDate(res.date || "");
    };

    const cancelEdit = () => {
        setEditingResId(null);
    };

    const saveEdit = async (id: string) => {
        await updateDocument("resources", id, {
            title: editTitle,
            url: editUrl,
            status: editStatus,
            resourceType: editResourceType,
            date: editDate
        });
        setEditingResId(null);
        await fetchResources();
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/" className="text-zinc-400 hover:text-white mb-2 inline-block transition-colors">&larr; Back to Dashboard</Link>
                        <h1 className="text-3xl font-bold tracking-tight">Resources & Ideas</h1>
                        <p className="mt-2 text-zinc-400">Save notes, drills, and research for your game.</p>
                    </div>
                    <Link href="/resources/notebooklm" className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors">
                        View NotebookLM Syncs
                    </Link>
                </div>

                {/* Add New */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-lg mb-10">
                    <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add New Resource
                    </h2>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Title / Note</label>
                                <input type="text" required className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 px-3 text-white shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                                    value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Master the takeaway" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">URL (Optional)</label>
                                <input type="url" className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 px-3 text-white shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                                    value={url} onChange={(e) => setUrl(e.target.value)} onBlur={handleUrlBlur} placeholder="www.example.com" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Date</label>
                                <input type="date" className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 px-3 text-white shadow-sm focus:border-indigo-500 outline-none"
                                    value={date} onChange={(e) => setDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Status</label>
                                <select className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 px-3 text-white shadow-sm focus:border-indigo-500 outline-none custom-select"
                                    value={status} onChange={(e) => setStatus(e.target.value as any)}>
                                    <option value="idea">Idea</option>
                                    <option value="experiment">Experiment</option>
                                    <option value="approved">Approved</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Resource Type</label>
                                <select className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 px-3 text-white shadow-sm focus:border-indigo-500 outline-none"
                                    value={resourceType} onChange={(e) => setResourceType(e.target.value as any)}>
                                    {RESOURCE_TYPES.map(type => (
                                        <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Photo / Screenshot (Optional)</label>
                            <input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 transition-colors" />
                        </div>

                        <div className="pt-2">
                            <button type="submit" disabled={loading} className="w-full md:w-auto px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                                {loading ? "Saving..." : "Save Resource"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* List */}
                <div className="space-y-4">
                    {resources.map((res) => {
                        const isExpanded = expandedResId === res.id;
                        const isEditing = editingResId === res.id;

                        return (
                            <div key={res.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm hover:border-zinc-700 transition-colors">
                                {isEditing ? (
                                    <div className="p-6 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input type="text" className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 px-3 text-white" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
                                            <input type="url" className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 px-3 text-white" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} onBlur={handleEditUrlBlur} placeholder="URL" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <input type="date" className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 px-3 text-white" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                                            <select className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 px-3 text-white" value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)}>
                                                <option value="idea">Idea</option>
                                                <option value="experiment">Experiment</option>
                                                <option value="approved">Approved</option>
                                            </select>
                                            <select className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 px-3 text-white" value={editResourceType} onChange={(e) => setEditResourceType(e.target.value as any)}>
                                                {RESOURCE_TYPES.map(type => (
                                                    <option key={type} value={type}>{type}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex justify-end gap-3 pt-2">
                                            <button onClick={cancelEdit} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
                                            <button onClick={() => saveEdit(res.id!)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors">Save</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                                                    {res.date && (
                                                        <span className="flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                            {res.date}
                                                        </span>
                                                    )}
                                                    {res.url && <a href={res.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors flex items-center gap-1 truncate max-w-xs"><svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>Link</a>}
                                                    {res.addedToNotebookLm && (
                                                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                            In NotebookLM
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-4 flex-shrink-0">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded capitalize
                                                    ${res.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                    res.status === 'experiment' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                                                    'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                                                    {res.status}
                                                </span>
                                                <button onClick={() => setExpandedResId(isExpanded ? null : res.id!)} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
                                                    {isExpanded ? 'Hide Details' : 'More Details'}
                                                </button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="px-5 pb-5 pt-2 border-t border-zinc-800/50 bg-zinc-900/50">
                                                <div className="flex flex-col md:flex-row gap-6">
                                                    <div className="flex-1 space-y-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Manage NotebookLM Sync</label>
                                                            <label className="flex items-center cursor-pointer">
                                                                <div className="relative">
                                                                    <input type="checkbox" className="sr-only" checked={!!res.addedToNotebookLm} onChange={() => handleToggleNotebookLm(res.id!, res.addedToNotebookLm)} />
                                                                    <div className={`block w-10 h-6 rounded-full transition-colors ${res.addedToNotebookLm ? 'bg-indigo-600' : 'bg-zinc-700'}`}></div>
                                                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${res.addedToNotebookLm ? 'transform translate-x-4' : ''}`}></div>
                                                                </div>
                                                                <div className="ml-3 text-sm font-medium text-zinc-300">
                                                                    {res.addedToNotebookLm ? 'Synced to NotebookLM' : 'Sync to NotebookLM'}
                                                                </div>
                                                            </label>
                                                        </div>
                                                        
                                                        {res.attachmentUrl && (
                                                            <div>
                                                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Attachment</label>
                                                                <a href={res.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block w-32 h-32 rounded-lg border border-zinc-700 overflow-hidden hover:opacity-80 transition-opacity bg-zinc-950 flex items-center justify-center">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img src={res.attachmentUrl} alt="Attachment thumbnail" className="object-cover w-full h-full" />
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="md:w-48 flex flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-zinc-800/50 pt-4 md:pt-0 md:pl-6">
                                                        <button onClick={() => startEdit(res)} className="w-full text-left px-3 py-2 text-sm font-medium rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                                                            Edit Resource
                                                        </button>
                                                        <button onClick={() => handleDelete(res.id!)} className="w-full text-left px-3 py-2 text-sm font-medium rounded-md text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
                                                            Delete Resource
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {resources.length === 0 && (
                        <div className="text-center py-12 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40">
                            <p className="text-zinc-500">No resources yet. Add your first note above!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
