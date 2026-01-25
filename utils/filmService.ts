
import * as FileSystem from 'expo-file-system/legacy';
import { SQLiteDatabase } from 'expo-sqlite';

export const deleteFilmWithFrameImages = async (database: SQLiteDatabase, film_id: number) => {

    // Get all frames for the film
    const frames = await database.getAllAsync<{ image: string }>(`SELECT image FROM frames WHERE film_id = ? AND image IS NOT NULL`, [film_id]);

    for (const frame of frames) {
        if (frame.image) {
            deleteFrameImage(frame.image);
        }
    }

    await database.runAsync(`DELETE FROM films WHERE id = ?`, [film_id]);
}

export const deleteFrame = async (database: SQLiteDatabase, frame_id: number) => {
    const { image, film_id } = await database.getFirstAsync<{ image: string | null, film_id: number }>(
        `SELECT image,film_id FROM frames WHERE id = ?`,
        [frame_id]
    ) || {};

    if (image) {
        await deleteFrameImage(image);
    }

    await database.runAsync(`DELETE FROM frames WHERE id = ?`, [frame_id]);

    if (film_id) {
        await database.runAsync(`UPDATE films SET frame_count = frame_count - 1 WHERE id = ?`, [film_id]);
    }

}

export const deleteFrameImage = async (uri: string) => {


    try {
        const fullPath = FileSystem.documentDirectory + uri
        const info = await FileSystem.getInfoAsync(fullPath);
        if (info.exists) {
            await FileSystem.deleteAsync(fullPath, { idempotent: true });
        }
    } catch (err) {
        console.log('Error deleting image:', err);
    }

}

export const saveFrameImage = async (uri: string) => {

    const filename = uri.split('/').pop() || `image_${Date.now()}.jpg`;
    const folderPath = `${FileSystem.documentDirectory}frames`;

    const folderInfo = await FileSystem.getInfoAsync(folderPath);

    if (!folderInfo.exists) {
        await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });
    }

    const newPath = `${folderPath}/rollio_${filename}`;

    try {
        await FileSystem.copyAsync({ from: uri, to: newPath });

        return `frames/rollio_${filename}`;

    } catch (error) {
        console.log('Error saving image locally:', error);
        return null;
    }
}