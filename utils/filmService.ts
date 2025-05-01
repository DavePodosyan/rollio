
import * as FileSystem from 'expo-file-system';
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

export const deleteFrameImage = async (uri: string) => {

    try {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) {
            await FileSystem.deleteAsync(uri, { idempotent: true });
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

        return newPath;

    } catch (error) {
        console.log('Error saving image locally:', error);
        return null;
    }
}