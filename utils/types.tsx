export type FilmRoll = {
    id: number;
    title: string;
    iso: number;
    camera: string | null;
    status: string;
    frame_count: number;
    created_at: string;
    completed_at?: string | null;
};

export type Frame = {
    id: number;
    film_id: number;
    aperture: string;
    shutter_speed: string;
    frame_no: number;
    note: string | null;
    created_at: string;
};