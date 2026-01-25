import { File, Directory, Paths } from 'expo-file-system';

const ensureFramesDirectoryExists = async () => {
    const directory = new Directory(Paths.document, 'frames');

    if (!directory.exists) {
        directory.create();
    }
}

export const saveFrameImage = async (uri: string): Promise<string | null> => {
    await ensureFramesDirectoryExists();

    const image = new File(uri);

    if (!image.exists) {
        return null;
    }

    const fileName = `frames/rollio_${Date.now()}_${Math.floor(Math.random() * 1000)}${image.extension || 'jpg'}`;
    const newImage = new File(Paths.document, fileName);

    image.copy(newImage);

    return newImage.exists ? fileName : null;
}