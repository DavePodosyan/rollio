// "Auto" is a sentinel value persisted in frames.aperture / frames.shutter_speed
// and compared throughout light-meter/business logic (services/database.ts,
// formsheet.tsx, RulerPicker.tsx, FrameListItem.tsx, FilmSettingsFromPhoto.tsx).
// It must stay the literal string 'Auto' forever and is never touched here.
// This function only controls what's shown to the user in its place — the one
// function a future localization pass needs to change.
export const getAutoValueLabel = (): string => 'Auto';
