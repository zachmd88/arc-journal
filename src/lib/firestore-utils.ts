import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    Timestamp,
    serverTimestamp,
    DocumentData,
    doc,
    updateDoc,
    deleteDoc,
    writeBatch
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";

// -- Type Definitions --

export interface Session {
    id?: string;
    ownerUid: string;
    date: string;
    type: "range" | "practice";
    rawNotes: string;
    structured?: {
        clubs?: string[];
        misses?: string[];
        bestFeels?: string[];
        metrics?: Record<string, number>;
    };
    tags?: string[];
    attachments?: string[];
    coachInsight?: {
        verdict: string;
        why: string;
        drill: string;
        source: string;
        isWeeklyFocus?: boolean;
    };
    singlePlaneMetrics?: {
        strikeQuality: number;
        startLineControl: number;
        missPatternConsistency: number;
        preShotCommitment: number;
        setupDiscipline: number;
        dominantMiss?: string;
    };
    createdAt: Timestamp;
}

export interface Round {
    id?: string;
    ownerUid: string;
    date: string; // YYYY-MM-DD
    course: string;
    tees?: string;
    score?: number;
    penaltiesCount: number;
    penaltiesNotes?: string;
    rawNotes?: string;
    attachments?: string[];
    coachInsight?: {
        verdict: string;
        why: string;
        drill: string;
        source: string;
        isWeeklyFocus?: boolean;
    };
    teeMissStart?: "L" | "C" | "R";
    teeMissCurve?: "L" | "N" | "R";
    approach60_150?: {
        attempts?: number;
        greensHit?: number;
        missSide?: "L" | "R" | "S" | "Lg" | null; // S=Short, Lg=Long
        contact?: "thin" | "fat" | "flush" | null;
    };
    roundDiagnosis?: {
        teeMiss?: string;
        dominantMiss: string;
        clubThatFeltBest: string;
        likelyCause: string;
    };
    singlePlaneMetrics?: {
        strikeQuality: number;
        startLineControl: number;
        missPatternConsistency: number;
        preShotCommitment: number;
        setupDiscipline: number;
        dominantMiss?: string;
    };
    createdAt: Timestamp;
}

export interface WeekCard {
    id?: string;
    ownerUid: string;
    weekStart: string; // YYYY-MM-DD
    weekEnd: string;   // YYYY-MM-DD
    priorityCue: string;
    priorityCommand?: string; // e.g. "Trigger Grip / No Roll"
    planChecklist: string[];
    metricsSnapshot?: {
        lastRoundPenalties?: number;
        gir60_150?: number;
    };
    generatedSummary?: string;
    createdAt: Timestamp;
}

export interface Resource {
    id?: string;
    ownerUid: string;
    title: string;
    url?: string;
    pastedText?: string;
    summary?: string;
    tags?: string[];
    status: "idea" | "experiment" | "approved";
    resourceType?: "youtube video" | "article" | "blog post" | "email" | "tweet" | "photo/screenshot" | "website" | "other";
    date?: string; // YYYY-MM-DD
    addedToNotebookLm?: boolean;
    attachmentUrl?: string;
    createdAt: Timestamp;
}

// -- Generic Helpers --

// Add a document to a collection
export async function addDocument<T extends DocumentData>(collectionName: string, data: T) {
    const colRef = collection(db, collectionName);
    const docRef = await addDoc(colRef, {
        ...data,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

// Update a document in a collection
export async function updateDocument<T>(collectionName: string, id: string, data: Partial<T>) {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data as { [x: string]: any });
}

// Delete a document from a collection
export async function deleteDocument(collectionName: string, id: string) {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
}

// Get documents by ownerUid with optional sorting
export async function getDocumentsByOwner<T>(
    collectionName: string,
    ownerUid: string,
    maxResults: number = 20
): Promise<T[]> {
    const colRef = collection(db, collectionName);
    const q = query(
        colRef,
        where("ownerUid", "==", ownerUid),
        orderBy("createdAt", "desc"),
        limit(maxResults)
    ); // Requires composite index if filtering by field and sorting by another? 
    // ownerUid equality + createdAt sort usually works without complex index if ownerUid is equality.

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

// Get documents from the last N days
export async function getRecentDocuments<T>(
    collectionName: string,
    ownerUid: string,
    days: number = 30
): Promise<T[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const colRef = collection(db, collectionName);
    const q = query(
        colRef,
        where("ownerUid", "==", ownerUid),
        where("date", ">=", cutoffDateStr),
        orderBy("date", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

// Get the latest WeekCard
export async function getLatestWeekCard(ownerUid: string): Promise<WeekCard | null> {
    const docs = await getDocumentsByOwner<WeekCard>("weekCards", ownerUid, 1);
    return docs.length > 0 ? docs[0] : null;
}

// Update a session with coach insights
export async function saveCoachInsight(sessionId: string, insightData: { verdict: string; why: string; drill: string; source: string }, collectionName: "sessions" | "rounds" = "sessions") {
    const sessionRef = doc(db, collectionName, sessionId);
    await updateDoc(sessionRef, {
        coachInsight: insightData
    });
}

// Upload an attachment
export async function uploadAttachment(file: File, uid: string): Promise<string> {
    const uniqueName = `${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `users/${uid}/attachments/${uniqueName}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

// Set a specific insight as the weekly focus
export async function setWeeklyFocus(documentId: string, collectionName: "sessions" | "rounds", ownerUid: string) {
    const batch = writeBatch(db);

    // 1. Unset any existing active focuses in both collections
    const sessionsRef = collection(db, "sessions");
    const roundsRef = collection(db, "rounds");

    // Fetch all for user to find active focus. A single document lookup might be better, 
    // but without full complex querying, we can fetch recent and filter client-side for ease of batching
    const recentSessions = await getRecentDocuments<Session>("sessions", ownerUid, 30);
    recentSessions.forEach(s => {
        if (s.coachInsight?.isWeeklyFocus) {
             batch.update(doc(db, "sessions", s.id!), { "coachInsight.isWeeklyFocus": false });
        }
    });

    const recentRounds = await getRecentDocuments<Round>("rounds", ownerUid, 30);
    recentRounds.forEach(r => {
         if (r.coachInsight?.isWeeklyFocus) {
             batch.update(doc(db, "rounds", r.id!), { "coachInsight.isWeeklyFocus": false });
         }
    });

    // 2. Set the new focus
    const targetRef = doc(db, collectionName, documentId);
    batch.update(targetRef, { "coachInsight.isWeeklyFocus": true });

    await batch.commit();
}

// Get unified activities (Rounds + Sessions) for Dashboard Metrics
export type ActivityObj = (Session & { activityType: "session" }) | (Round & { activityType: "round" });

export async function getMergedActivities(ownerUid: string, days: number = 30): Promise<ActivityObj[]> {
    const sessions = await getRecentDocuments<Session>("sessions", ownerUid, days);
    const rounds = await getRecentDocuments<Round>("rounds", ownerUid, days);
    
    const unified: ActivityObj[] = [
        ...sessions.map(s => ({ ...s, activityType: "session" as const })),
        ...rounds.map(r => ({ ...r, activityType: "round" as const }))
    ];

    // Sort descending by date
    unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return unified;
}

