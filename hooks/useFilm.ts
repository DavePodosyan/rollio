import { useEffect, useState, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getFilmById, deleteFilm, updateFilm as dbUpdateFilm } from '@/services/database';
import { CreateFilmInput, Film } from '@/types';

export const useFilm = (id: number) => {
    const db = useSQLiteContext();
    const [film, setFilm] = useState<Film | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch the film by ID
    useEffect(() => {
        if (!db) return;
        (async () => {
            try {
                const data = await getFilmById(db, id);
                setFilm(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load film');
            } finally {
                setLoading(false);
            }
        })();
    }, [db, id]);

    const refreshFilm = useCallback(async () => {
        if (!db) return;
        try {
            setLoading(true);
            const data = await getFilmById(db, id);
            setFilm(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load film');
        } finally {
            setLoading(false);
        }
    }, [db, id]);

    // Delete film logic
    const destroyFilm = useCallback(async () => {
        if (!db) throw new Error('Database not initialized');
        try {
            setLoading(true);
            setError(null);
            await deleteFilm(db, id);
            setFilm(null); // optionally clear local state after delete
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete film');
        } finally {
            setLoading(false);
        }
    }, [db, id]);

    const updateFilm = useCallback(async (formData: Partial<CreateFilmInput>) => {
        if (!db || !film) throw new Error('Database or film not available');

        try {
            const updatedFilm = await dbUpdateFilm(db, film.id, formData);

            setFilm(updatedFilm);
        } catch (err) {
            console.log(err);

        }
        // try {
        //     setLoading(true);
        //     setError(null);
        //     const updatedFilm = { ...film, ...formData } as Film;
        //     // Assuming there's an updateFilm function in the database service
        //     // await updateFilm(db, updatedFilm);
        //     console.log(updatedFilm);

        //     setFilm(updatedFilm);
        // } catch (err) {
        //     setError(err instanceof Error ? err.message : 'Failed to update film');
        // } finally {
        //     setLoading(false);
        // }
    }, [db, film]);

    return { film, loading, error, destroyFilm, updateFilm, refreshFilm };
};