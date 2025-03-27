export type FilmRoll = {
    id: number;
    title: string;
    iso: number;
    camera: string;
    status: string;
    frame_count: number;
    created_at: string; // Passed as string via query params
    completed_at?: string | null; // Optional, can be null or string
};