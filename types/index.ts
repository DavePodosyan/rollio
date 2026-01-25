export enum FilmStatus {
    InCamera = 'in-camera',
    Developing = 'developing',
    Archived = 'archived',
}

export interface Film {
    id: number;
    title: string;
    iso: number;
    camera: string | null;
    status: FilmStatus;
    expected_shots: number;
    push_pull: number;
    frame_count: number;
    created_at: string;
    completed_at?: string | null;
}

export interface CreateFilmInput {
    title: string;
    iso: number;
    camera: string | null;
    status: FilmStatus;
    expected_shots: number;
    push_pull: number;
    created_at: string;
}

export interface Frame {
    id: number;
    film_id: number;
    aperture: string;
    shutter_speed: string;
    frame_no: number;
    note: string | null;
    created_at: string;
    lens: string | null;
    image: string | null;
}

export interface CreateFrameInput {
    film_id: number;
    aperture: string;
    shutter_speed: string;
    frame_no: number;
    note?: string | null;
    created_at: string;
    lens?: string | null;
    image: string | null;
}