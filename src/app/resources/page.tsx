"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { addDocument, getDocumentsByOwner, Resource } from "@/lib/firestore-utils";
import Link from "next/link";

export default function ResourcesPage() {
    const { user } = useAuth();
    const [resources, setResources] = useState<Resource[]>([]);
    const [newResource, setNewResource] = useState({ title: "", url: "", type: "idea" });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            getDocumentsByOwner<Resource>("resources", user.uid).then(setResources);
        }
    }, [user]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        try {
            const doc: Omit<Resource, "id" | "createdAt"> = {
                ownerUid: user.uid,
                title: newResource.title,
                url: newResource.url,
                status: newResource.type as "idea" | "experiment" | "approved",
                tags: []
            };
            await addDocument("resources", doc);
            setNewResource({ title: "", url: "", type: "idea" });
            // Refresh
            const updated = await getDocumentsByOwner<Resource>("resources", user.uid);
            setResources(updated);
        } catch (error) {
            console.error("Error adding resource", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="text-indigo-600 hover:text-indigo-800 mb-4 inline-block">&larr; Back to Dashboard</Link>
                <h1 className="text-2xl font-bold mb-6">Resources & Ideas</h1>

                {/* Add New */}
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <h2 className="text-lg font-medium mb-4">Add New Resource</h2>
                    <form onSubmit={handleAdd} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">Title / Note</label>
                            <input type="text" required className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500"
                                value={newResource.title} onChange={(e) => setNewResource({ ...newResource, title: e.target.value })} />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">URL (Optional)</label>
                            <input type="url" className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500"
                                value={newResource.url} onChange={(e) => setNewResource({ ...newResource, url: e.target.value })} />
                        </div>
                        <div className="w-32">
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 bg-white"
                                value={newResource.type} onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}>
                                <option value="idea">Idea</option>
                                <option value="experiment">Experiment</option>
                                <option value="approved">Approved</option>
                            </select>
                        </div>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                            {loading ? "Adding..." : "Add"}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {resources.map((res) => (
                            <li key={res.id} className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="truncate">
                                        <p className="text-sm font-medium text-indigo-600 truncate">{res.title}</p>
                                        {res.url && <a href={res.url} target="_blank" className="text-xs text-gray-500 hover:underline">{res.url}</a>}
                                    </div>
                                    <div className="ml-2 flex-shrink-0 flex">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${res.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                res.status === 'experiment' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {res.status}
                                        </span>
                                    </div>
                                </div>
                            </li>
                        ))}
                        {resources.length === 0 && <li className="px-4 py-4 text-center text-gray-500">No resources yet.</li>}
                    </ul>
                </div>
            </div>
        </div>
    );
}
