// Runtime-only mirror of types/index.ts (Node strips types but cannot transform enums).
export const FilmStatus = { InCamera: 'in-camera', Developing: 'developing', Archived: 'archived' };
// Interface names imported without `type` survive Node's type stripping; export placeholders.
export const CreateFilmInput = undefined, Film = undefined, Frame = undefined, CreateFrameInput = undefined;
