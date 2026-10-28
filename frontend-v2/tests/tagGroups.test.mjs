import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeTagGroups, tagFormatLabel } from '../src/lib/tagGroups.ts';

test('retains backend format names and raw keys for all audio containers', () => {
  for (const [path, format, raw] of [
    ['track.MP3', 'id3v24', 'TIT2'],
    ['track.flac', 'xiph', 'TITLE'],
    ['track.ogg', 'xiph', 'TITLE'],
    ['track.opus', 'xiph', 'TITLE'],
    ['track.m4a', 'mp4', '©nam'],
  ]) {
    const response = { [format]: { [raw]: ['Title', 'Title 2'] } };
    assert.deepEqual(normalizeTagGroups(response, path), response);
  }
});

test('keeps WAV blocks separate without splitting commas, newlines, or paired values', () => {
  const response = {
    id3v2: { TIT2: ['ID3 title'], TIPL: ['producer', 'a', 'producer', 'b'] },
    riff: { INAM: ['RIFF title'], ICMT: ['one\ntwo'], IENG: ['a, b'] },
  };
  assert.deepEqual(normalizeTagGroups(response, '/track.WaVe'), response);
  assert.deepEqual(normalizeTagGroups({ riff: response.riff }, '/track.WAV'), { id3v2: {}, riff: response.riff });
});

test('converts MP4 numeric and boolean fields to editable strings', () => {
  assert.deepEqual(normalizeTagGroups({ mp4: { tmpo: 123, cpil: true, trkn: '3/10' } }, 'track.m4a'), {
    mp4: { tmpo: '123', cpil: 'true', trkn: '3/10' },
  });
});

test('supplies empty sections and accepts legacy flat responses', () => {
  assert.deepEqual(normalizeTagGroups({}, 'track.WAVE'), { id3v2: {}, riff: {} });
  assert.deepEqual(normalizeTagGroups({}, 'track.FLAC'), { xiph: {} });
  assert.deepEqual(normalizeTagGroups({ TITLE: ['legacy'] }, 'track.flac'), { xiph: { TITLE: ['legacy'] } });
});

test('supports new format blocks without requiring a frontend change', () => {
  assert.deepEqual(normalizeTagGroups({ future: { CUSTOM: ['value'] } }, 'track.new'), { future: { CUSTOM: ['value'] } });
  assert.equal(tagFormatLabel('future'), 'future');
});

test('rejects malformed nested data instead of showing object strings', () => {
  for (const data of [null, [], { xiph: { TITLE: { unexpected: 'object' } } }, { xiph: { TITLE: [{}] } }]) {
    assert.throws(() => normalizeTagGroups(data, 'track.flac'), /Invalid tag/);
  }
});
