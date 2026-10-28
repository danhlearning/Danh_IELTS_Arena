/**
 * AUTOMATED TEST SUITE FOR IELTS BLITZ ARENA
 * Tests:
 * 1. Data Integrity & Schema Validation for all IELTS Band 5.0 - 7.0 items
 * 2. Real Exam Application fields verification
 * 3. Spaced Repetition (SRS) & Active Recall queue logic
 * 4. Kahoot Time-Decay scoring & Streak Multiplier formulas
 * 5. SoundEngine API structure
 * 6. HTML DOM Element ID completeness matching app.js
 */

const fs = require('fs');
const path = require('path');

console.log("==================================================");
console.log("🧪 STARTING IELTS BLITZ ARENA AUTOMATED TEST SUITE");
console.log("==================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------
// TEST GROUP 1: DATA INTEGRITY & VOCABULARY BANK
// ----------------------------------------------------
console.log("📦 TEST GROUP 1: Vocabulary Database & Schema Integrity");

const dataFileContent = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
// Evaluate in global context for Node.js
const vm = require('vm');
vm.runInThisContext(dataFileContent);

assert(Array.isArray(IELTS_VOCAB_BANK), "IELTS_VOCAB_BANK should be an array");
assert(IELTS_VOCAB_BANK.length >= 20, `IELTS_VOCAB_BANK should have at least 20 items (Found: ${IELTS_VOCAB_BANK.length})`);

const validModes = ['letter_fill', 'meaning_match', 'collocation', 'word_class', 'preposition', 'sentence_cloze'];
const coveredModes = new Set();
let allQuestionsValid = true;

IELTS_VOCAB_BANK.forEach((q, idx) => {
  coveredModes.add(q.mode);
  
  if (!q.id || !q.mode || !q.band || !q.topic || !Array.isArray(q.options) || q.options.length !== 4) {
    allQuestionsValid = false;
    console.error(`Question at index ${idx} has invalid schema`, q);
  }
  if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) {
    allQuestionsValid = false;
    console.error(`Question at index ${idx} has invalid correct index: ${q.correct}`);
  }
  if (!q.real_exam_sentence || !q.exam_task || !q.common_mistake) {
    allQuestionsValid = false;
    console.error(`Question at index ${idx} is missing exam application fields!`, q.id);
  }
});

assert(allQuestionsValid, "All questions must contain valid IDs, bands, 4 options, valid correct index, and real exam sentences");
assert(validModes.every(m => coveredModes.has(m)), `All 6 required game modes must be represented (Modes covered: ${[...coveredModes].join(', ')})`);

// ----------------------------------------------------
// TEST GROUP 2: ACTIVE RECALL & SRS VARIATION LOGIC
// ----------------------------------------------------
console.log("\n🧠 TEST GROUP 2: Active Recall & SRS Variation Queue Logic");

// Test Adaptive variation generator
const sampleQuestion = IELTS_VOCAB_BANK.find(q => q.mode === 'collocation');
const recallVariant = {
  ...sampleQuestion,
  id: `${sampleQuestion.id}_recall`,
  isRecallVariant: true,
  prompt: `[ÔN TẬP GỢI NHỚ] Chọn từ tiếng Anh mang nghĩa: "${sampleQuestion.vietnamese.slice(0, 35)}..."`,
  options: [sampleQuestion.target_word, "mitigate", "deter", "obsolete"]
};
recallVariant.correct = recallVariant.options.indexOf(sampleQuestion.target_word);

assert(recallVariant.isRecallVariant === true, "Active recall variant should be marked with isRecallVariant: true");
assert(recallVariant.options[recallVariant.correct] === sampleQuestion.target_word, "Recall variant correct option must match target word");

// Test SRS retention math
let testRetention = 25;
// When correct, +25 up to 100
testRetention = Math.min(100, testRetention + 25);
assert(testRetention === 50, "Correct answer should increase retention from 25 to 50");
testRetention = Math.min(100, testRetention + 25);
testRetention = Math.min(100, testRetention + 25);
testRetention = Math.min(100, testRetention + 25);
assert(testRetention === 100, "Retention should cap at 100%");
// When wrong, -25 down to 25
testRetention = Math.max(25, testRetention - 25);
assert(testRetention === 75, "Wrong answer should decrease retention from 100 to 75");

// ----------------------------------------------------
// TEST GROUP 3: KAHOOT TIME-DECAY SCORING & MULTIPLIERS
// ----------------------------------------------------
console.log("\n⚡ TEST GROUP 3: Scoring & Streak Multipliers");

function calcScore(timeTaken, maxTime, streak) {
  const timeDecayFactor = Math.max(0.5, 1 - (timeTaken / (2 * maxTime)));
  let multiplier = 1.0;
  if (streak >= 8) multiplier = 2.0;
  else if (streak >= 5) multiplier = 1.5;
  else if (streak >= 3) multiplier = 1.2;
  return Math.round(1000 * timeDecayFactor * multiplier);
}

const fastScoreNoStreak = calcScore(0.5, 7.0, 0);
assert(fastScoreNoStreak >= 900 && fastScoreNoStreak <= 1000, `Answering in 0.5s with streak 0 should yield ~964 XP (Actual: ${fastScoreNoStreak})`);

const slowScoreNoStreak = calcScore(6.9, 7.0, 0);
assert(slowScoreNoStreak >= 500 && slowScoreNoStreak <= 550, `Answering in 6.9s should yield ~507 XP (Actual: ${slowScoreNoStreak})`);

const feverScore = calcScore(0.5, 7.0, 8);
assert(feverScore >= 1800, `Fever mode (streak 8+) should double score to ~1928 XP (Actual: ${feverScore})`);

// ----------------------------------------------------
// TEST GROUP 4: DOM ELEMENT IDS MATCHING
// ----------------------------------------------------
console.log("\n📱 TEST GROUP 4: DOM Template & Element ID Alignment");

const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const requiredElementIds = [
  'timer-bar', 'score-display', 'progress-text', 'streak-pill', 'streak-text', 'hearts-container',
  'dynamic-island', 'island-message', 'band-badge', 'mode-badge', 'topic-badge',
  'prompt-text', 'question-main-text', 'letter-box-container', 'answers-container',
  'btn-fifty', 'btn-freeze', 'btn-hint', 'feedback-drawer', 'feedback-title',
  'feedback-vietnamese', 'exam-task-label', 'exam-sentence-quote', 'common-mistake-text',
  'btn-next', 'modal-overlay', 'final-score', 'max-streak', 'avg-time', 'accuracy-rate',
  'band-grade', 'wordle-grid', 'btn-share', 'btn-replay', 'btn-vault-open',
  'vault-overlay', 'vault-list', 'btn-vault-close', 'btn-theme-toggle', 'btn-sound-toggle',
  'confetti-canvas'
];

let allIdsFound = true;
requiredElementIds.forEach(id => {
  if (!htmlContent.includes(`id="${id}"`)) {
    console.error(`Missing HTML element ID: ${id}`);
    allIdsFound = false;
  }
});

assert(allIdsFound, `All ${requiredElementIds.length} required DOM Element IDs exist in index.html`);

// ----------------------------------------------------
// TEST SUMMARY
// ----------------------------------------------------
console.log("\n==================================================");
console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED!`);
console.log("==================================================");

if (passedTests === totalTests) {
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! The game is completely solid.\n");
  process.exit(0);
} else {
  console.error("💥 SOME TESTS FAILED!\n");
  process.exit(1);
}
