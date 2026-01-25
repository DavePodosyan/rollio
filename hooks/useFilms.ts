import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { createFilm, getFilms, getUniqueFilmNames, getUniqueCameraNames, deleteFilm } from '@/services/database';
import { CreateFilmInput, type Film } from '@/types';

export const useFilms = (autoFetch = true) => {
    const db = useSQLiteContext();
    const [films, setFilms] = useState<Film[]>([]);
    const [filmNames, setFilmNames] = useState<string[]>([]);
    const [cameraNames, setCameraNames] = useState<string[]>([]);
    const [loading, setLoading] = useState(autoFetch);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (autoFetch && db) fetchFilms();
    }, [autoFetch, db]);

    const fetchFilms = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getFilms(db);
            //wait a few seconds
            // await new Promise(resolve => setTimeout(resolve, 2000));
            setFilms(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load films');
        } finally {
            setLoading(false);
        }
    };

    const addNewFilm = useCallback(async (input: CreateFilmInput) => {
        if (!db) throw new Error('Database not initialized');
        try {
            setLoading(true);
            setError(null);
            await createFilm(db, input);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add film');
        } finally {
            setLoading(false);
        }
    }, [db]);

    const fetchUniqueFilmNames = useCallback(async () => {
        if (!db) throw new Error('Database not initialized');
        try {
            setLoading(true);
            setError(null);
            const names = await getUniqueFilmNames(db);
            setFilmNames(names);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load film names');
        } finally {
            setLoading(false);
        }
    }, [db]);

    const fetchUniqueCameraNames = useCallback(async () => {
        if (!db) throw new Error('Database not initialized');
        try {
            setLoading(true);
            setError(null);
            const names = await getUniqueCameraNames(db);
            setCameraNames(names);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load camera names');
        } finally {
            setLoading(false);
        }
    }, [db]);

    return { films, filmNames, cameraNames, loading, error, fetchFilms, addNewFilm, fetchUniqueFilmNames, fetchUniqueCameraNames };
};