import { db } from './firebase';
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';

const NOTES_COLLECTION = 'notes';

// Save or Update a note
export const saveNote = async (dateStr: string, originalContent: string, summary: string) => {
    try {
        const noteRef = doc(db, NOTES_COLLECTION, dateStr);
        await setDoc(noteRef, {
            date: dateStr,
            originalContent,
            summary,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Error saving note:", error);
        throw error;
    }
};

// Get a single note by date (YYYY-MM-DD)
export const getNoteByDate = async (dateStr: string) => {
    try {
        const noteRef = doc(db, NOTES_COLLECTION, dateStr);
        const docSnap = await getDoc(noteRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error getting note:", error);
        throw error;
    }
};

// Get all notes
export const getAllNotes = async () => {
    try {
        const notesRef = collection(db, NOTES_COLLECTION);
        const q = query(notesRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);

        const notes: { date: string; originalContent?: string; summary?: string; updatedAt?: string }[] = [];
        querySnapshot.forEach((docSnap) => {
            notes.push(docSnap.data() as { date: string; originalContent?: string; summary?: string; updatedAt?: string });
        });
        return notes;
    } catch (error) {
        console.error("Error getting all notes:", error);
        throw error;
    }
};

// Delete a note
export const deleteNote = async (dateStr: string) => {
    try {
        await deleteDoc(doc(db, NOTES_COLLECTION, dateStr));
        return true;
    } catch (error) {
        console.error("Error deleting note:", error);
        throw error;
    }
};
