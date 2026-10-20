import { useEffect, useState, useCallback } from "react";
import { useSQLiteContext } from 'expo-sqlite';
import { getFrameById, deleteFrame, updateFrame as dbUpdateFrame } from '@/services/database';
import { CreateFrameInput, Frame } from '@/types';


/** Pass `null` when there is no frame to load (e.g. the "new frame" form). */
export const useFrame = (id: number | null) => {
    const db = useSQLiteContext();
    const [frame, setFrame] = useState<Frame | null>(null);
    const [loading, setLoading] = useState(id !== null);
    const [error, setError] = useState<string | null>(null);

    // Fetch the frame by ID
    useEffect(() => {
        if (!db || id === null) return;
        (async () => {
            try {
                const data = await getFrameById(db, id);
                setFrame(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load frame');
            } finally {
                setLoading(false);
            }
        })();
    }, [db, id]);

    const refreshFrame = useCallback(async () => {
        if (!db || id === null) return;
        try {
            setLoading(true);
            const data = await getFrameById(db, id);
            setFrame(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load frame');
        } finally {
            setLoading(false);
        }
    }, [db, id]);

    // Delete frame logic
    const destroyFrame = useCallback(async () => {
        if (!db || id === null) throw new Error('Database not initialized');
        try {
            setLoading(true);
            setError(null);
            await deleteFrame(db, id);
            setFrame(null); // optionally clear local state after delete
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete frame');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [db, id]);

    const updateFrame = useCallback(async (formData: Partial<CreateFrameInput>) => {
        if (!db || !frame) throw new Error('Database or frame not available');

        try {
            const updatedFrame = await dbUpdateFrame(db, frame.id, formData);

            setFrame(updatedFrame);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update frame');
            throw err;
        }
    }, [db, frame]);

    return { frame, loading, error, refreshFrame, destroyFrame, updateFrame };
}
