import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateRoomCode,
  normalizeRoomCode,
  isValidRoomCode,
  calculateClockSync,
  computeSyncTargetTime,
  calculateSyncDrift,
  addToQueue,
  removeFromQueue,
  reorderQueue,
  voteTrack,
  canGuestControl,
  formatTime,
} from './syncEngine.ts';

test('generateRoomCode creates valid format VSC-XXXX', () => {
  const code = generateRoomCode();
  assert.equal(code.startsWith('VSC-'), true);
  assert.equal(code.length, 8);
  assert.equal(isValidRoomCode(code), true);
});

test('normalizeRoomCode normalizes various user inputs', () => {
  assert.equal(normalizeRoomCode('8492'), 'VSC-8492');
  assert.equal(normalizeRoomCode('vsc8492'), 'VSC-8492');
  assert.equal(normalizeRoomCode('VSC-9999'), 'VSC-9999');
  assert.equal(normalizeRoomCode('  vsc-ab12  '), 'VSC-AB12');
});

test('calculateClockSync determines roundTripDelay and clockOffset accurately', () => {
  // t0=1000, t1=1020, t2=1025, t3=1055
  // roundTrip = (1055 - 1000) - (1025 - 1020) = 55 - 5 = 50ms
  // offset = ((1020 - 1000) + (1025 - 1055)) / 2 = (20 - 30) / 2 = -5ms
  const result = calculateClockSync(1000, 1020, 1025, 1055);
  assert.equal(result.roundTripDelay, 50);
  assert.equal(result.clockOffset, -5);
});

test('computeSyncTargetTime accounts for host elapsed time and offset', () => {
  // Host broadcast at hostTime=5000 with position=10.0s
  // Client is at localTime=5200, offset=0
  // Elapsed = (5200 - 5000) = 200ms = 0.2s
  // Expected position = 10.2s
  const target = computeSyncTargetTime(10.0, 5000, 5200, 0, true, 1.0);
  assert.ok(Math.abs(target - 10.2) < 0.001);

  // If paused, target is unchanged
  const pausedTarget = computeSyncTargetTime(10.0, 5000, 5200, 0, false, 1.0);
  assert.equal(pausedTarget, 10.0);
});

test('calculateSyncDrift triggers appropriate correction actions', () => {
  // Within 25ms: action 'none'
  const inSync = calculateSyncDrift(10.015, 10.0);
  assert.equal(inSync.action, 'none');
  assert.equal(inSync.playbackRateModifier, 1.0);

  // Soft drift (e.g. 100ms behind): action 'soft-correct', rate > 1.0
  const behind = calculateSyncDrift(9.9, 10.0);
  assert.equal(behind.action, 'soft-correct');
  assert.ok(behind.playbackRateModifier > 1.0);

  // Hard drift (>250ms): action 'hard-seek'
  const farOff = calculateSyncDrift(10.5, 10.0);
  assert.equal(farOff.action, 'hard-seek');
});

test('queue operations work predictably', () => {
  const sampleTrack: Track = {
    id: 'tr-1',
    title: 'Neon Nights',
    artist: 'Synthwave Duo',
    album: 'Retro Future',
    duration: 180,
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
    source: 'spotify',
  };

  let queue: Track[] = [];
  queue = addToQueue(queue, sampleTrack, 'Alex');
  assert.equal(queue.length, 1);
  assert.equal(queue[0].title, 'Neon Nights');
  assert.equal(queue[0].requestedBy, 'Alex');

  const secondTrack: Track = {
    id: 'tr-2',
    title: 'Cyber Pulse',
    artist: 'Vapor Wave',
    album: 'Grid',
    duration: 210,
    coverUrl: '',
    source: 'youtube',
  };
  queue = addToQueue(queue, secondTrack, 'Sam');
  assert.equal(queue.length, 2);

  // Reorder
  queue = reorderQueue(queue, 1, 0);
  assert.equal(queue[0].title, 'Cyber Pulse');
  assert.equal(queue[1].title, 'Neon Nights');

  // Voting
  queue = voteTrack(queue, queue[1].id, 1);
  assert.equal(queue[0].title, 'Neon Nights'); // Moved to top due to vote!

  // Remove
  const idToRemove = queue[0].id;
  queue = removeFromQueue(queue, idToRemove);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].title, 'Cyber Pulse');
});

test('canGuestControl enforces guest permission states', () => {
  const settings: HostSettings = {
    allowGuestSongRequests: true,
    allowGuestPlaybackControl: false,
    autoAcceptGuests: false,
    targetSyncPrecisionMs: 20,
    broadcastQuality: 'hi-res',
  };

  assert.equal(canGuestControl('pending', settings, 'request_song'), false);
  assert.equal(canGuestControl('declined', settings, 'request_song'), false);
  assert.equal(canGuestControl('accepted', settings, 'request_song'), true);
  assert.equal(canGuestControl('accepted', settings, 'skip'), false);
});

test('formatTime formats seconds properly', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(125), '2:05');
});
