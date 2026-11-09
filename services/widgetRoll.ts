// What the home screen and Lock Screen widgets show and open. Pure (plus one
// read-only query) so it runs under Node for tests; pushing the result to the
// widgets lives in services/widgetSync.ts.
import type { SQLiteDatabase } from 'expo-sqlite';

/** The roll the widgets are about. */
export type CurrentRoll = {
    id: number;
    title: string;
    camera: string | null;
    iso: number;
    /** Frames on the roll so far, skipped ones included. */
    frameCount: number;
    expectedShots: number;
};

/** An in-camera film with the time of its newest frame, as the query returns it. */
export type RollCandidate = {
    id: number;
    title: string;
    camera: string | null;
    iso: number;
    frame_count: number;
    expected_shots: number;
    created_at: string;
    last_frame_at: string | null;
};

const time = (iso: string | null) => {
    const parsed = iso ? Date.parse(iso) : NaN;
    return Number.isNaN(parsed) ? -Infinity : parsed;
};

/** Loading the roll counts as activity too, so a roll loaded today beats one last shot yesterday. */
const lastActivity = (row: RollCandidate) => Math.max(time(row.created_at), time(row.last_frame_at));

const toRoll = (row: RollCandidate): CurrentRoll => ({
    id: row.id,
    title: row.title,
    camera: row.camera,
    iso: row.iso,
    frameCount: row.frame_count,
    expectedShots: row.expected_shots,
});

/** In-camera rolls, most recently used first; at the same moment, the one added later first. */
export const rankRolls = (rows: RollCandidate[]): CurrentRoll[] => (
    [...rows].sort((a, b) => {
        const byActivity = lastActivity(b) - lastActivity(a);
        return Number.isNaN(byActivity) || byActivity === 0 ? b.id - a.id : byActivity;
    }).map(toRoll)
);

/** The in-camera roll used most recently: what a widget set to "Latest roll" shows. */
export const pickCurrentRoll = (rows: RollCandidate[]): CurrentRoll | null => rankRolls(rows)[0] ?? null;

export const getInCameraRolls = async (db: SQLiteDatabase): Promise<CurrentRoll[]> => {
    const rows = await db.getAllAsync<RollCandidate>(`
        SELECT f.id, f.title, f.camera, f.iso, f.frame_count, f.expected_shots, f.created_at,
               (SELECT MAX(created_at) FROM frames WHERE film_id = f.id) AS last_frame_at
        FROM films f
        WHERE f.status = 'in-camera'
    `);
    return rankRolls(rows);
};

export const getCurrentRoll = async (db: SQLiteDatabase): Promise<CurrentRoll | null> => (await getInCameraRolls(db))[0] ?? null;

/** A widget's setting that follows the most recently used roll, rather than naming one. */
export const WIDGET_ROLL_LATEST = 'latest';

/**
 * The roll a Log Frame link is for. A widget set to one roll names it in the
 * link; that holds for as long as the roll is in the camera, otherwise (and
 * for "Latest roll") it is the roll used most recently.
 */
export const resolveLogRoll = (rolls: CurrentRoll[], filmId?: string | null): CurrentRoll | null => (
    rolls.find((roll) => String(roll.id) === filmId) ?? rolls[0] ?? null
);

/**
 * Links the widgets open. Log Frame carries no roll: the app works out the
 * current roll when the link opens (app/(modal)/log-frame.tsx), so a widget
 * that has not redrawn yet can never log to the wrong roll or frame number.
 */
export const WIDGET_LINKS = {
    logFrame: 'rollio:///log-frame',
    lightMeter: 'rollio:///light_meter',
    newFilm: 'rollio:///new-film',
    films: 'rollio:///films',
} as const;

/** A roll's own page inside the app. */
export const rollHref = (filmId: number | string) => `/films/${filmId}` as const;

/**
 * Where Log Frame lands: the form the roll's own + button opens, or a new roll
 * when none is loaded. `showRoll` asks the form to open the roll after saving,
 * so it is plain which roll the frame went to.
 */
export const logFrameHref = (roll: CurrentRoll | null) => (
    roll
        ? { pathname: '/new-frame' as const, params: { mode: 'new', filmId: String(roll.id), iso: String(roll.iso), frameCount: String(roll.frameCount), showRoll: '1' } }
        : '/new-film' as const
);

/** Text the widgets show, in the app's language (the widgets cannot translate for themselves). */
export type WidgetStrings = {
    noRollTitle: string;
    noRollBody: string;
    startRoll: string;
    logFrame: string;
    lightMeter: string;
    framesOf: (count: number, total: number) => string;
    /** The setting that follows the most recently used roll, and a line explaining it. */
    latestRoll: string;
    latestRollHint: string;
};

/** One in-camera roll as a widget draws it. */
export type WidgetRoll = {
    /** The film id as text: it is also the value a widget's setting stores. */
    id: string;
    title: string;
    camera: string;
    count: number;
    total: number;
    progressLabel: string;
    rollUrl: string;
    /** Log Frame for a widget set to this roll. */
    logUrl: string;
};

/**
 * Everything the widgets draw, JSON-safe: it is handed to the widget runtimes
 * and stored. It holds every in-camera roll, most recently used first, because
 * each widget picks its own roll from its setting.
 */
export type WidgetSnapshot = {
    rolls: WidgetRoll[];
    /** Log Frame for a widget on "Latest roll": the roll is looked up when the link opens. */
    logUrl: string;
    meterUrl: string;
    newRollUrl: string;
    filmsUrl: string;
    noRollTitle: string;
    noRollBody: string;
    startRollLabel: string;
    logFrameLabel: string;
    lightMeterLabel: string;
};

export const buildWidgetSnapshot = (rolls: CurrentRoll[], strings: WidgetStrings): WidgetSnapshot => ({
    rolls: rolls.map((roll) => ({
        id: String(roll.id),
        title: roll.title,
        camera: roll.camera ?? '',
        count: roll.frameCount,
        total: roll.expectedShots,
        progressLabel: strings.framesOf(roll.frameCount, roll.expectedShots),
        rollUrl: `${WIDGET_LINKS.films}/${roll.id}`,
        logUrl: `${WIDGET_LINKS.logFrame}?filmId=${roll.id}`,
    })),
    logUrl: WIDGET_LINKS.logFrame,
    meterUrl: WIDGET_LINKS.lightMeter,
    newRollUrl: WIDGET_LINKS.newFilm,
    filmsUrl: WIDGET_LINKS.films,
    noRollTitle: strings.noRollTitle,
    noRollBody: strings.noRollBody,
    startRollLabel: strings.startRoll,
    logFrameLabel: strings.logFrame,
    lightMeterLabel: strings.lightMeter,
});

/** What one widget draws once its own setting has picked the roll. */
export type WidgetView = {
    /** False when no roll is in camera: the widget offers to start one. */
    hasRoll: boolean;
    title: string;
    camera: string;
    count: number;
    total: number;
    progressLabel: string;
    rollUrl: string;
    logUrl: string;
    meterUrl: string;
    newRollUrl: string;
    noRollTitle: string;
    noRollBody: string;
    startRollLabel: string;
    logFrameLabel: string;
    lightMeterLabel: string;
};

/**
 * The view for a widget whose setting is `choice`: a film id shows that roll
 * while it is in the camera; "latest", nothing, or a roll that has left the
 * camera shows the most recently used roll. (widgets/RollWidget.tsx repeats
 * this rule, because an iOS widget cannot import app code.)
 */
export const widgetView = (snapshot: WidgetSnapshot, choice: string | null | undefined): WidgetView => {
    const pinned = snapshot.rolls.find((roll) => roll.id === choice);
    const roll = pinned ?? snapshot.rolls[0];
    return {
        hasRoll: !!roll,
        title: roll?.title ?? '',
        camera: roll?.camera ?? '',
        count: roll?.count ?? 0,
        total: roll?.total ?? 0,
        progressLabel: roll?.progressLabel ?? '',
        rollUrl: roll?.rollUrl ?? snapshot.filmsUrl,
        logUrl: pinned ? pinned.logUrl : snapshot.logUrl,
        meterUrl: snapshot.meterUrl,
        newRollUrl: snapshot.newRollUrl,
        noRollTitle: snapshot.noRollTitle,
        noRollBody: snapshot.noRollBody,
        startRollLabel: snapshot.startRollLabel,
        logFrameLabel: snapshot.logFrameLabel,
        lightMeterLabel: snapshot.lightMeterLabel,
    };
};

/** A choice in a widget's settings. */
export type WidgetRollOption = { name: string; value: string; subtitle?: string };

/** "Latest roll" first, then every in-camera roll; the camera and count tell same-named rolls apart. */
export const widgetRollOptions = (snapshot: WidgetSnapshot, strings: Pick<WidgetStrings, 'latestRoll' | 'latestRollHint'>): WidgetRollOption[] => [
    { name: strings.latestRoll, value: WIDGET_ROLL_LATEST, subtitle: strings.latestRollHint },
    ...snapshot.rolls.map((roll) => ({
        name: roll.title,
        value: roll.id,
        subtitle: [roll.camera, `${roll.count}/${roll.total}`].filter(Boolean).join(' · '),
    })),
];

/** Key-value store key holding the last snapshot, for Android to redraw from without the app running. */
export const WIDGET_SNAPSHOT_KEY = 'widget_snapshot';

/** Key-value store key holding one Android widget's setting (a film id or "latest"). */
export const widgetChoiceKey = (widgetId: number) => `widget_roll_choice_${widgetId}`;

type Shape<T> = Record<keyof T, 'boolean' | 'string' | 'number'>;
const ROLL_SHAPE: Shape<WidgetRoll> = {
    id: 'string', title: 'string', camera: 'string', count: 'number', total: 'number', progressLabel: 'string', rollUrl: 'string', logUrl: 'string',
};
const SNAPSHOT_SHAPE: Shape<Omit<WidgetSnapshot, 'rolls'>> = {
    logUrl: 'string', meterUrl: 'string', newRollUrl: 'string', filmsUrl: 'string',
    noRollTitle: 'string', noRollBody: 'string', startRollLabel: 'string', logFrameLabel: 'string', lightMeterLabel: 'string',
};
const matches = (value: any, shape: Record<string, string>) => (
    !!value && typeof value === 'object' && Object.keys(shape).every((key) => typeof value[key] === shape[key])
);

/** A stored snapshot back to an object; null when nothing usable is stored. */
export const parseWidgetSnapshot = (stored: string | null): WidgetSnapshot | null => {
    if (!stored) return null;
    try {
        const value = JSON.parse(stored);
        if (!matches(value, SNAPSHOT_SHAPE) || !Array.isArray(value.rolls)) return null;
        if (!value.rolls.every((roll: unknown) => matches(roll, ROLL_SHAPE))) return null;
        return value as WidgetSnapshot;
    } catch {
        return null;
    }
};
