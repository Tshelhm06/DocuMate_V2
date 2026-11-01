// Plain Node tests for the pure logic (no phone needed):  npm test
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./loader.mjs', import.meta.url);

const load = (p) => import(new URL(p, import.meta.url));
const dates = await load('../src/utils/dates.js');
const files = await load('../src/utils/files.js');
const validation = await load('../src/utils/validation.js');
const format = await load('../src/utils/format.js');

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (e) {
    console.error(`  FAIL ${name}\n       ${e.message}`);
    process.exitCode = 1;
  }
};

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

console.log('dates');
test('daysUntil counts calendar days, ignoring time of day', () => {
  assert.equal(dates.daysUntil(at(2026, 10, 27, 23, 59), at(2026, 10, 25, 0, 1)), 2);
  assert.equal(dates.daysUntil(at(2026, 10, 25, 8), at(2026, 10, 25, 22)), 0);
  assert.equal(dates.daysUntil(at(2026, 10, 24), at(2026, 10, 25)), -1);
});
test('daysUntil works across month and year ends', () => {
  assert.equal(dates.daysUntil(at(2027, 1, 2), at(2026, 12, 30)), 3);
});
test('formatCountdown wording', () => {
  const now = at(2026, 10, 25, 10);
  assert.equal(dates.formatCountdown(at(2026, 10, 25), now), 'Today');
  assert.equal(dates.formatCountdown(at(2026, 10, 26), now), 'Tomorrow');
  assert.equal(dates.formatCountdown(at(2026, 12, 2), now), '38 days');
  assert.equal(dates.formatCountdown(at(2026, 10, 22), now), 'Overdue by 3 days');
  assert.equal(dates.formatCountdown(at(2026, 10, 24), now), 'Overdue by 1 day');
});
test('formatDate / formatLongDate', () => {
  assert.equal(dates.formatDate(at(2026, 9, 27)), '27 Sep 2026');
  assert.equal(dates.formatLongDate(at(2026, 9, 18)), 'September 18, 2026');
  assert.equal(dates.formatDateWithMonthName(at(2026, 9, 27)), '27 September, 2026');
});
test('formatUpdated', () => {
  const now = at(2026, 10, 25, 12);
  assert.equal(dates.formatUpdated(at(2026, 10, 25, 9), now), 'Updated today');
  assert.equal(dates.formatUpdated(at(2026, 10, 24, 9), now), 'Updated yesterday');
  assert.equal(dates.formatUpdated(at(2026, 10, 23, 9), now), 'Updated 2 days ago');
  assert.equal(dates.formatUpdated(at(2026, 8, 12, 9), now), 'Updated Aug 12');
  assert.equal(dates.formatUpdated(at(2025, 8, 12, 9), now), 'Updated Aug 12, 2025');
});
test('greeting', () => {
  assert.equal(dates.greetingForHour(8), 'Good morning,');
  assert.equal(dates.greetingForHour(14), 'Good afternoon,');
  assert.equal(dates.greetingForHour(20), 'Good evening,');
});

console.log('files');
test('detectFileType', () => {
  assert.equal(files.detectFileType('a.PDF', ''), 'pdf');
  assert.equal(files.detectFileType('scan', 'application/pdf'), 'pdf');
  assert.equal(files.detectFileType('photo.jpeg', ''), 'image');
  assert.equal(files.detectFileType('x', 'image/png'), 'image');
  assert.equal(files.detectFileType('notes.docx', ''), 'other');
});
test('sanitizeFileName', () => {
  assert.equal(files.sanitizeFileName('Academic Transcript (2026).pdf'), 'Academic_Transcript_2026_.pdf');
  assert.ok(!/[\s/\\()]/.test(files.sanitizeFileName('a b/c\\d (1).pdf')));
  assert.equal(files.sanitizeFileName(''), 'document');
  assert.ok(files.sanitizeFileName('x'.repeat(300) + '.pdf').length <= 80);
  assert.ok(files.sanitizeFileName('x'.repeat(300) + '.pdf').endsWith('.pdf'));
});
test('mimeFromName', () => {
  assert.equal(files.mimeFromName('a.pdf'), 'application/pdf');
  assert.equal(files.mimeFromName('a.JPG'), 'image/jpeg');
  assert.equal(files.mimeFromName('a.zzz'), 'application/octet-stream');
});

console.log('validation + format');
test('email / password', () => {
  assert.equal(validation.validateEmail('student@example.com'), null);
  assert.ok(validation.validateEmail('student@'));
  assert.ok(validation.validateEmail(''));
  assert.ok(validation.validatePassword('12345'));
  assert.equal(validation.validatePassword('123456'), null);
});
test('formatBytes / initials', () => {
  assert.equal(format.formatBytes(0), '0 B');
  assert.equal(format.formatBytes(793 * 1024), '793 KB');
  assert.equal(format.formatBytes(1.2 * 1024 * 1024), '1.2 MB');
  assert.equal(format.initials('Tshering Lham'), 'TL');
  assert.equal(format.initials('Tshering'), 'TS');
  assert.equal(format.initials(''), 'DM');
  assert.equal(format.firstName('Tshering Lham'), 'Tshering');
  assert.equal(format.pluralize(1, 'document'), '1 document');
  assert.equal(format.pluralize(5, 'document'), '5 documents');
});

console.log(`\n${passed} checks passed${process.exitCode ? ' (some FAILED)' : ''}`);
