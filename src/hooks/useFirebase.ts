import { useState, useEffect } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, push, set, update, remove, DatabaseReference } from 'firebase/database';

// Hook for reading data from Firebase RTDB
export const useFirebaseData = <T>(path: string) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dataRef = ref(database, path);
    
    const unsubscribe = onValue(dataRef, 
      (snapshot) => {
        setLoading(false);
        setError(null);
        const data = snapshot.val();
        setData(data);
      },
      (error) => {
        setLoading(false);
        setError(error.message);
        console.error('Firebase error:', error);
      }
    );

    return () => unsubscribe();
  }, [path]);

  return { data, loading, error };
};

// Hook for writing data to Firebase RTDB
export const useFirebaseWrite = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const writeData = async (path: string, data: any) => {
    setLoading(true);
    setError(null);
    try {
      await set(ref(database, path), data);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return false;
    }
  };

  const updateData = async (path: string, updates: any) => {
    setLoading(true);
    setError(null);
    try {
      await update(ref(database, path), updates);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return false;
    }
  };

  const pushData = async (path: string, data: any) => {
    setLoading(true);
    setError(null);
    try {
      const newRef = await push(ref(database, path), data);
      setLoading(false);
      return newRef.key;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  };

  const deleteData = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      await remove(ref(database, path));
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return false;
    }
  };

  return { writeData, updateData, pushData, deleteData, loading, error };
};