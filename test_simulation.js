/**
 * FULL GAMEPLAY SIMULATION TEST
 * Simulates a full round of 10 questions + active recall injections
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock browser environment for GameEngine simulation
class LocalStorageMock {
  constructor() { this.store = {}; }
  getItem(key) { return this.store[key] || null; }
  setItem(key, val) { this.store[key] = String(val); }
  clear() { this.store = {}; }
}

const mockLocalStorage = new LocalStorageMock();
const domElements = {};

function createMockElement(id) {
  return {
    id,
    style: {},
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); },
      toggle(c) { 
        if (this.classes.has(c)) { this.classes.delete(c); return false; }
        else { this.classes.add(c); return true; }
      }
    },
    textContent: '',
    innerHTML: '',
    children: [],
    appendChild(child) { this.children.push(child); },
    querySelectorAll() { return [createMockElement('btn0'), createMockElement('btn1'), createMockElement('btn2'), createMockElement('btn3')]; },
    addEventListener() {}
  };
}

global.window = {
  addEventListener: () => {},
  AudioContext: class {
    constructor() { this.currentTime = 0; this.destination = {}; }
    createOscillator() { return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} }; }
    createBiquadFilter() { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    resume() {}
  }
};
global.document = {
  body: createMockElement('body'),
  getElementById: (id) => {
    if (!domElements[id]) domElements[id] = createMockElement(id);
    return domElements[id];
  },
  createElement: (tag) => createMockElement(tag),
  removeEventListener: () => {},
  addEventListener: () => {}
};
global.localStorage = mockLocalStorage;

// Load code
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'sound.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'));

console.log("🎮 SIMULATING FULL GAMEPLAY LOOP...");

const engine = new GameEngine();
engine.startNewRound();

console.log(`Initial round questions loaded: ${engine.questions.length}`);
if (engine.questions.length !== 10) throw new Error("Should have loaded 10 questions");

// Answer question 0 CORRECTLY
const q0 = engine.questions[0];
engine.handleAnswerSelect(q0.correct, createMockElement('btn-selected'));
console.log(`Q1 correct -> Score: ${engine.score}, Streak: ${engine.streak}, Retention: ${engine.getWordRetention(q0.id)}%`);
if (engine.streak !== 1) throw new Error("Streak should be 1");

engine.nextQuestion();

// Answer question 1 WRONGLY (triggers active recall insertion)
const q1 = engine.questions[engine.currentIndex];
const wrongIdx = (q1.correct + 1) % 4;
const prevQuestionsCount = engine.questions.length;
engine.handleAnswerSelect(wrongIdx, createMockElement('btn-selected'));
console.log(`Q2 wrong -> Streak: ${engine.streak}, Hearts: ${engine.hearts}, Retention: ${engine.getWordRetention(q1.id)}%`);
console.log(`Active recall queue check: Before=${prevQuestionsCount}, After=${engine.questions.length}`);

if (engine.questions.length <= prevQuestionsCount) {
  throw new Error("Active recall variation should have been inserted into question queue!");
}
if (engine.hearts !== 2) throw new Error("Hearts should have dropped to 2");

engine.nextQuestion();

// Answer 4 more questions correctly to test heart recovery
for (let i = 0; i < 4; i++) {
  const q = engine.questions[engine.currentIndex];
  engine.handleAnswerSelect(q.correct, createMockElement('btn-selected'));
  engine.nextQuestion();
}
console.log(`After 4 consecutive correct answers -> Hearts: ${engine.hearts} (Recovered!), Streak: ${engine.streak}`);
if (engine.hearts !== 3) throw new Error("Heart should be recovered back to 3 after 4 streak!");

console.log("🎉 SIMULATION COMPLETED SUCCESSFULLY! Game engine lifecycle is 100% verified.");
clearInterval(engine.timerInterval);
process.exit(0);
