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
    /** WGS84 degrees, 6 decimals; both set or both null. */
    latitude: number | null;
    longitude: number | null;
    /** Horizontal accuracy in metres, 1 decimal; null when unknown. */
    location_accuracy: number | null;
    /** Short reverse-geocoded label; null when none. */
    place: string | null;
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
    latitude?: number | null;
    longitude?: number | null;
    location_accuracy?: number | null;
    place?: string | null;
}