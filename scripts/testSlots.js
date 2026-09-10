const { generateSlots, timeToMinutes, minutesToTime, getDayOfWeek } = require('../utils/slotUtils');

console.log('--- RUNNING SLOT UTILS UNIT TESTS ---');

// Test 1: time conversions
const mins = timeToMinutes('09:30');
if (mins !== 570) throw new Error(`Expected 570, got ${mins}`);

const timeStr = minutesToTime(570);
if (timeStr !== '09:30') throw new Error(`Expected 09:30, got ${timeStr}`);
console.log('✓ Time conversion tests passed');

// Test 2: generateSlots 30 min increments
const slots30 = generateSlots('09:00', '11:00', 30);
const expected30 = ['09:00', '09:30', '10:00', '10:30'];
if (JSON.stringify(slots30) !== JSON.stringify(expected30)) {
  throw new Error(`generateSlots failed. Expected: ${expected30}, Got: ${slots30}`);
}
console.log('✓ 30-min slot generation passed:', slots30);

// Test 3: generateSlots 15 min increments
const slots15 = generateSlots('14:00', '15:00', 15);
const expected15 = ['14:00', '14:15', '14:30', '14:45'];
if (JSON.stringify(slots15) !== JSON.stringify(expected15)) {
  throw new Error(`generateSlots 15m failed. Expected: ${expected15}, Got: ${slots15}`);
}
console.log('✓ 15-min slot generation passed:', slots15);

// Test 4: Day of week calculation
const day = getDayOfWeek('2026-09-10'); // Thursday
if (day !== 'Thursday') throw new Error(`Expected Thursday, got ${day}`);
console.log('✓ Day of week calculation passed (2026-09-10 is Thursday)');

console.log('ALL UNIT TESTS PASSED SUCCESSFULLY! 🎉');
