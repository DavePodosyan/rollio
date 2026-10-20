import { useEffect, useState, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getFilmById, deleteFilm, updateFilm as dbUpdateFilm } from '@/services/database';
import { CreateFilmInput, Film } from '@/types';

/** Pass `null` when there is no film to load (e.g. the "new film" form). */
export const useFilm = (id: number | null) => {
    const db = useSQLiteContext();
    const [film, setFilm] = useState<Film | null>(null);
    const [loading, setLoading] = useState(id !== null);
    const [error, setError] = useState<string | null>(null);

    // Fetch the film by ID
    useEffect(() => {
        if (!db || id === null) return;
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
        if (!db || id === null) return;
        try {
            // setLoading(true);
            const data = await getFilmById(db, id);
            setFilm(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load film');
        } finally {
            // setLoading(false);
        }
    }, [db, id]);

    // Delete film logic
    const destroyFilm = useCallback(async () => {
        if (!db || id === null) throw new Error('Database not initialized');
        try {
            setLoading(true);
            setError(null);
            await deleteFilm(db, id);
            setFilm(null); // optionally clear local state after delete
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete film');
            throw err; // Re-throw so the UI knows it failed
        } finally {
            setLoading(false);
        }
    }, [db, id]);

    const updateFilm = useCallback(async (formData: Partial<CreateFilmInput>) => {
        if (!db || !film) throw new Error('Database or film not available');

        try {
            setError(null);
            const updatedFilm = await dbUpdateFilm(db, film.id, formData);

            setFilm(updatedFilm);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update film');
            throw err; // Re-throw so the UI (Modal) knows it failed
        }
    }, [db, film]);

    return { film, loading, error, destroyFilm, updateFilm, refreshFilm };
};