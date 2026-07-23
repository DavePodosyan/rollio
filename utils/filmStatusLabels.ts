import { FilmStatus } from "@/types";
import i18n from "@/i18n";

// Single source of truth for user-facing FilmStatus text. The enum values
// themselves ('in-camera', 'developing', 'archived') are persisted in SQLite
// and must stay in English/kebab-case forever — only this label is shown to
// users. If localization is added later, this is the only function to change.
export const getFilmStatusLabel = (status: FilmStatus): string => {
    switch (status) {
        case FilmStatus.InCamera:
            return i18n.t('filmStatus.inCamera');
        case FilmStatus.Developing:
            return i18n.t('filmStatus.developing');
        case FilmStatus.Archived:
            return i18n.t('filmStatus.archived');
        default:
            return status;
    }
};
