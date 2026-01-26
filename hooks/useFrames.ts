import { useEffect, useState, useCallback } from "react";
import {
    getFramesByFilmId,
    getUniqueLensNames,
    createFrame as dbCreateFrame,
    updateFrame as dbUpdateFrame,
    deleteFrame as dbDeleteFrame,
    updateFilm // You'll likely need this to update frame_count later
} from "@/services/database";
import { useSQLiteContext } from 'expo-sqlite';
import { CreateFrameInput, Frame } from "@/types";

export const useFrames = (filmId: number) => {
    const db = useSQLiteContext();
    const [frames, setFrames] = useState<Frame[]>([]);
    const [lensNames, setLensNames] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1. READ (Wrapped in useCallback so we can reuse it)
    const loadFrames = useCallback(async () => {
        if (!db) return;
        // setLoading(true);
        try {
            const data = await getFramesByFilmId(db, filmId);
            setFrames(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load frames');
        } finally {
            // setLoading(false);
        }
    }, [db, filmId]);

    // Initial Load
    useEffect(() => {
        loadFrames();
    }, [loadFrames]);

    // 2. CREATE
    const addFrame = async (input: CreateFrameInput) => {
        if (!db) return;
        try {
            // Prepare the full object required by your service
            // const newFrameData = {
            //     ...input,
            //     film_id: filmId,
            //     created_at: new Date().toISOString()
            // };

            await dbCreateFrame(db, input);

            // Reload the list to show the new frame immediately
            await loadFrames();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add frame');
            throw err; // Re-throw so the UI (Modal) knows it failed
        }
    };

    // 3. UPDATE
    const editFrame = async (id: number, input: Partial<Omit<Frame, 'id'>>) => {
        if (!db) return;
        try {
            await dbUpdateFrame(db, id, input);
            await loadFrames();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update frame');
            throw err;
        }
    };

    // 4. DELETE
    const removeFrame = async (id: number) => {
        if (!db) return;
        try {
            await dbDeleteFrame(db, id);
            await loadFrames();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete frame');
        }
    };

    const fetchUniqueLensNames = useCallback(async () => {
        if (!db) throw new Error('Database not initialized');
        try {
            setLoading(true);
            setError(null);
            const names = await getUniqueLensNames(db);
            setLensNames(names);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load lens names');
        } finally {
            setLoading(false);
        }
    }, [db]);

    const prefillFromPreviousFrame = useCallback((): Partial<CreateFrameInput> => {
        if (frames.length === 0) return {};
        const lastFrame = frames[frames.length - 1];
        return {
            aperture: lastFrame.aperture,
            shutter_speed: lastFrame.shutter_speed,
            lens: lastFrame.lens,
        };
    }, [frames]);

    return {
        frames,
        lensNames,
        loading,
        error,
        addFrame,
        editFrame,
        removeFrame,
        refresh: loadFrames,
        fetchUniqueLensNames,
        prefillFromPreviousFrame,
    };
};