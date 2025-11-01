import { useState, useEffect } from 'react';
// FIX: Updated import to remove file extension
import { db } from '../firebase';
import { 
    collection, 
    onSnapshot, 
    doc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    addDoc, // Import addDoc
    DocumentData,
    QuerySnapshot,
    DocumentSnapshot,
    FirestoreError,
    QueryDocumentSnapshot,
    DocumentReference
} from 'firebase/firestore';

// Interface for documents that must have an ID
interface FirestoreDocument extends DocumentData {
    id: string;
}

/**
 * A custom hook to fetch and listen to a Firestore collection in real-time.
 * @param collectionName The name of the collection.
 * @returns An object with the collection data, loading state, error, and CRUD functions.
 */
export const useCollection = <T extends FirestoreDocument>(collectionName: string) => {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setLoading(true);
        const colRef = collection(db, collectionName);

        const unsubscribe = onSnapshot(colRef, (snapshot: QuerySnapshot<DocumentData>) => {
            const results: T[] = [];
            snapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
                results.push({ ...doc.data(), id: doc.id } as T);
            });
            setData(results);
            setLoading(false);
        }, (err: FirestoreError) => {
            console.error(`Error fetching collection ${collectionName}:`, err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [collectionName]);

    const addItem = async (item: Omit<T, 'id'>): Promise<DocumentReference> => {
        try {
            // Use addDoc for auto-generated IDs and return the reference
            const docRef = await addDoc(collection(db, collectionName), item);
            return docRef;
        } catch (e) {
            console.error("Error adding document: ", e);
            throw e; // Re-throw to be caught in the component
        }
    };

    const updateItem = async (id: string, updates: Partial<T>) => {
        try {
            // FIX: The previous cast `as DocumentReference<T>` caused a type mismatch with the `updateDoc` function.
            // Removing the cast allows TypeScript to correctly use the overload that accepts a
            // generic `DocumentReference<DocumentData>`, which is compatible with `updates` of type `Partial<T>`.
            const docRef = doc(db, collectionName, id);
            await updateDoc(docRef, updates);
        } catch (e) {
            console.error("Error updating document: ", e);
            throw e;
        }
    };

    const removeItem = async (id: string) => {
        try {
            await deleteDoc(doc(db, collectionName, id));
        } catch (e) {
            console.error("Error removing document: ", e);
            throw e;
        }
    };
    
    const addBatch = async (items: T[]) => {
      for (const item of items) {
        try {
            const { id, ...data } = item;
            await setDoc(doc(db, collectionName, id), data);
        } catch (e) {
          console.error(`Failed to add item ${item.id} to ${collectionName}`, e);
        }
      }
    };

    return { data, loading, error, addItem, updateItem, removeItem, addBatch };
};

/**
 * A custom hook to fetch and listen to a single Firestore document in real-time.
 * @param collectionName The name of the collection.
 * @param docId The ID of the document.
 * @param initialData The default data to use if the document doesn't exist.
 * @returns An object with the document data, loading state, and an update function.
 */
export const useDocument = <T extends DocumentData>(collectionName: string, docId: string, initialData: T) => {
    const [data, setData] = useState<T>(initialData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setLoading(true);
        const docRef = doc(db, collectionName, docId);

        const unsubscribe = onSnapshot(docRef, (docSnap: DocumentSnapshot<DocumentData>) => {
            if (docSnap.exists()) {
                setData(docSnap.data() as T);
            } else {
                console.warn(`Document ${docId} in ${collectionName} does not exist. Using initial data.`);
                setData(initialData);
                 // Optionally create the document with initial data if it doesn't exist
                setDoc(docRef, initialData).catch(err => console.error("Could not create initial document", err));
            }
            setLoading(false);
        }, (err: FirestoreError) => {
            console.error(`Error fetching document ${docId}:`, err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [collectionName, docId]); // initialData removed from deps to avoid re-writing on every render

    const updateData = async (newData: Partial<T>) => {
        try {
            const docRef = doc(db, collectionName, docId);
            await setDoc(docRef, newData, { merge: true }); // Use merge to not overwrite entire doc
        } catch (e) {
            console.error("Error updating document: ", e);
            throw e;
        }
    };

    return { data, loading, error, updateData };
};