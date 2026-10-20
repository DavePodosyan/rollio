// Exercises the pure contact-sheet HTML builder under Node.
import '../db/harness.mjs';
import assert from 'node:assert/strict';

const { buildContactSheetHtml, formatShotDates, escapeHtml, FRAMES_PER_STRIP } = await import('@/services/exportHtml');

const frame = (no, extra = {}) => ({
    id: 100 + no, film_id: 1, frame_no: no, aperture: '2', shutter_speed: '1/250', lens: '50mm',
    note: null, image: null, thumbnail: null, created_at: '2026-10-12T08:00:00.000Z', ...extra,
});

const makeInput = (frames, overrides = {}) => ({
    film: {
        id: 1, title: 'Kodak <Portra> & Co', iso: 400, camera: 'Leica M6', status: 'archived',
        expected_shots: 36, push_pull: 1, frame_count: frames.length, created_at: '2026-10-12T08:00:00.000Z',
        ...(overrides.film ?? {}),
    },
    frames,
    labels: {
        iso: 'ISO 400', exposures: '36 exp', pushPull: 'Push +1', status: 'Archived',
        aperture: (v) => (v === 'Auto' ? 'Auto' : 'f/' + v),
        shutter: (v) => (v === 'Auto' ? 'Auto' : v + 's'),
        noPhoto: '—', noFrames: 'No frames logged yet',
        framesCount: frames.length + ' frames', exportedOn: 'Exported 20 Oct 2026',
        ...(overrides.labels ?? {}),
    },
    shotDates: '12–19 Oct 2026',
    fonts: { regular: 'AAAA', medium: 'BBBB' },
    platform: overrides.platform ?? 'ios',
});

const count = (html, re) => (html.match(re) ?? []).length;
const range = (n) => Array.from({ length: n }, (_, i) => frame(i + 1));

assert.equal(FRAMES_PER_STRIP, 4);

// one strip per four frames
assert.equal(count(buildContactSheetHtml(makeInput(range(9))), /class="strip"/g), 3);
assert.equal(count(buildContactSheetHtml(makeInput(range(8))), /class="strip"/g), 2);
assert.equal(count(buildContactSheetHtml(makeInput([])), /class="strip"/g), 0);

// sprocket holes are plain elements (print engines mishandle CSS gradients)
{
    const html = buildContactSheetHtml(makeInput(range(4)));
    assert.equal(count(html, /class="sprockets"/g), 2);
    assert.equal(count(html, /<i><\/i>/g), 2 * 28);
    assert.ok(!html.includes('repeating-linear-gradient'));
}

// sorts frames and pads numbers
{
    const html = buildContactSheetHtml(makeInput([frame(3), frame(100), frame(1)]));
    const numbers = [...html.matchAll(/class="edge">(\d+)</g)].map((m) => m[1]);
    assert.deepEqual(numbers, ['01', '03', '100']);
}

// partial strip keeps four cells
{
    const html = buildContactSheetHtml(makeInput(range(5)));
    assert.equal(count(html, /class="cell/g), 8);
    assert.equal(count(html, /class="cell empty-cell"/g), 3);
}

// thumbnail or empty tile
{
    const html = buildContactSheetHtml(makeInput([
        frame(1, { thumbnail: 'data:image/jpeg;base64,xyz' }),
        frame(2),
        frame(3, { image: 'frames/x.jpg', thumbnail: null }),
    ]));
    assert.ok(html.includes('<img class="photo" src="data:image/jpeg;base64,xyz"'));
    assert.equal(count(html, /<div class="tile">—<\/div>/g), 2);
}

// caption uses labels
{
    const html = buildContactSheetHtml(makeInput([
        frame(1, { aperture: 'Auto', shutter_speed: '1/60', lens: null }),
        frame(2, { aperture: '2.8', shutter_speed: '1/500', lens: '35mm' }),
    ]));
    const caps = [...html.matchAll(/class="cap">([^<]*)</g)].map((m) => m[1]);
    assert.deepEqual(caps, ['Auto · 1/60s', 'f/2.8 · 1/500s · 35mm']);
}

// notes sit under their strip
{
    const html = buildContactSheetHtml(makeInput([
        frame(1, { note: 'Haze' }), frame(2), frame(3), frame(4), frame(5, { note: 'Tripod' }),
    ]));
    const units = html.split('class="unit"').slice(1);
    assert.equal(units.length, 2);
    assert.equal(count(html, /class="notes"/g), 2);
    assert.ok(units[0].includes('Haze') && !units[0].includes('Tripod'));
    assert.ok(units[1].includes('Tripod'));
    assert.equal(count(buildContactSheetHtml(makeInput(range(4))), /class="notes"/g), 0);
}

// keeps long multi-line notes in full
{
    const note = 'word '.repeat(100).trim() + '\nsecond line\nthird line';
    const html = buildContactSheetHtml(makeInput([frame(1, { note })]));
    assert.ok(html.includes(escapeHtml(note)));
    assert.ok(html.includes(note)); // nothing in it needs escaping
    assert.ok(html.includes('white-space: pre-wrap'));
}

// escapes html in title and notes
{
    const html = buildContactSheetHtml(makeInput([frame(1, { note: '<b>"x"</b>' })]));
    assert.ok(html.includes('Kodak &lt;Portra&gt; &amp; Co'));
    assert.ok(html.includes('&lt;b&gt;&quot;x&quot;&lt;/b&gt;'));
    assert.ok(!html.includes('<b>'));
}

// header parts omit absent values
{
    const html = buildContactSheetHtml(makeInput(range(1), { film: { camera: null }, labels: { pushPull: null } }));
    assert.equal(html.match(/class="sub">([^<]+)</)[1], 'ISO 400 · 36 exp · 12–19 Oct 2026');
    const full = buildContactSheetHtml(makeInput(range(1)));
    assert.equal(full.match(/class="sub">([^<]+)</)[1], 'Leica M6 · ISO 400 · Push +1 · 36 exp · 12–19 Oct 2026');
}

// status chip
assert.ok(buildContactSheetHtml(makeInput(range(1))).includes('class="chip">ARCHIVED<'));

// fonts embedded
{
    const html = buildContactSheetHtml(makeInput(range(1)));
    assert.ok(html.includes('url(data:font/truetype;base64,AAAA)'));
    assert.ok(html.includes('url(data:font/truetype;base64,BBBB)'));
}

// page rule only on android
assert.ok(!buildContactSheetHtml(makeInput(range(1))).includes('@page'));
assert.ok(buildContactSheetHtml(makeInput(range(1), { platform: 'android' })).includes('@page { margin: 36pt }'));

// empty film
{
    const html = buildContactSheetHtml(makeInput([]));
    assert.ok(html.includes('class="no-frames">No frames logged yet<'));
    assert.equal(count(html, /class="strip"/g), 0);
}

// footer
{
    const html = buildContactSheetHtml(makeInput(range(9)));
    const foot = html.match(/class="foot">([\s\S]*?)<\/div>/)[1];
    assert.ok(foot.includes('9 frames') && foot.includes('Exported 20 Oct 2026'));
}

// formatShotDates
{
    const fmt = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const film = { created_at: '2026-09-01T08:00:00.000Z' };
    const ranged = formatShotDates([{ created_at: '2026-10-19T08:00:00.000Z' }, { created_at: '2026-10-12T08:00:00.000Z' }], film, 'en-US');
    assert.ok(ranged.includes('12') && ranged.includes('19') && ranged.includes('2026'));
    assert.notEqual(ranged, `${fmt.format(new Date('2026-10-12T08:00:00Z'))} – ${fmt.format(new Date('2026-10-12T08:00:00Z'))}`);
    const same = formatShotDates([{ created_at: '2026-10-12T08:00:00.000Z' }, { created_at: '2026-10-12T15:00:00.000Z' }], film, 'en-US');
    assert.equal(same, fmt.format(new Date('2026-10-12T08:00:00Z')));
    assert.equal(formatShotDates([], film, 'en-US'), fmt.format(new Date('2026-09-01T08:00:00Z')));
}

console.log('ok');
