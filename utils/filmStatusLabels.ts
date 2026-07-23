import { FilmStatus } from "@/types";

// Single source of truth for user-facing FilmStatus text. The enum values
// themselves ('in-camera', 'developing', 'archived') are persisted in SQLite
// and must stay in English/kebab-case forever — only this label is shown to
// users. If localization is added later, this is the only function to change.
export const getFilmStatusLabel = (status: FilmStatus): string => {
    switch (status) {
        case FilmStatus.InCamera:
            return 'In Camera';
        case FilmStatus.Developing:
            return 'Developing';
        case FilmStatus.Archived:
            return 'Archived';
        default:
            return status;
    }
};
