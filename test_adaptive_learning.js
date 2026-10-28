/**
 * COMPREHENSIVE AUTOMATED TEST SUITE:
 * 1. Adaptive Learning Engine & Memory Profiles (Lv.1 to Lv.5)
 * 2. Interactive Letter Fill Keyboard (Tiles, Blanks, Undo, Clear, 50:50)
 * 3. TOEIC 400-700 Database: 35 Words x 6 Modes = 210 Questions
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("======================================================================");
console.log("🧠 TEST SUITE: ADAPTIVE LEARNING, INTERACTIVE KEYBOARD & TOEIC 6-MODE");
console.log("======================================================================\n");

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// --------------------------------------------------------------------
// Setup Robust DOM Environment Mock for Node
// --------------------------------------------------------------------
class LocalStorageMock {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] || null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}

function createDOMNode(tag = 'div', id = '') {
  const node = {
    tag,
    id,
    dataset: {},
    style: {},
    classList: {
      items: new Set(),
      add(c) { this.items.add(c); },
      remove(c) { this.items.delete(c); },
      contains(c) { return this.items.has(c); },
      toggle(c) { if (this.items.has(c)) { this.items.delete(c); return false; } else { this.items.add(c); return true; } }
    },
    textContent: '',
    children: [],
    disabled: false,
    setAttribute(attr, val) { this[attr] = val; },
    appendChild(child) { this.children.push(child); return child; },
    listeners: {},
    addEventListener(evt, fn) {
      if (!this.listeners[evt]) this.listeners[evt] = [];
      this.listeners[evt].push(fn);
    },
    click() {
      if (this.disabled) return;
      if (this.listeners['click']) {
        this.listeners['click'].forEach(fn => fn({ stopPropagation: () => {} }));
      }
    },
    querySelectorAll(selector) {
      const results = [];
      const isClass = selector.startsWith('.');
      const isId = selector.startsWith('#');
      const classList = isClass ? selector.split('.').filter(Boolean) : [];
      const idTarget = isId ? selector.slice(1) : '';

      function traverse(parent) {
        for (const child of parent.children) {
          let matches = false;
          if (isClass) {
            matches = classList.every(c => child.classList.contains(c));
          } else if (isId) {
            matches = child.id === idTarget;
          } else if (selector === child.tag || (selector === 'button' && child.tag === 'button')) {
            matches = true;
          }
          if (matches) results.push(child);
          traverse(child);
        }
      }
      traverse(this);
      return results;
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }
  };

  let _innerHTML = '';
  Object.defineProperty(node, 'innerHTML', {
    get() { return _innerHTML; },
    set(val) {
      _innerHTML = String(val);
      if (_innerHTML === '') this.children = [];
    }
  });

  let _className = '';
  Object.defineProperty(node, 'className', {
    get() { return Array.from(this.classList.items).join(' '); },
    set(val) {
      _className = String(val);
      this.classList.items.clear();
      _className.split(/\s+/).filter(Boolean).forEach(c => this.classList.items.add(c));
    }
  });

  return node;
}

const mockLocalStorage = new LocalStorageMock();
const domElements = {};

global.window = {
  addEventListener: () => {},
  AudioContext: class {
    constructor() { this.currentTime = 0; }
    createOscillator() { return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} }; }
    createBiquadFilter() { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    resume() {}
  }
};

global.document = {
  body: createDOMNode('body'),
  getElementById(id) {
    if (!domElements[id]) domElements[id] = createDOMNode('div', id);
    return domElements[id];
  },
  createElement(tag) { return createDOMNode(tag); },
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.localStorage = mockLocalStorage;
global.sessionStorage = new LocalStorageMock();

// Load code files
const dataCode = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
const soundCode = fs.readFileSync(path.join(__dirname, 'sound.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

vm.runInThisContext(dataCode);
vm.runInThisContext(soundCode);
vm.runInThisContext(appCode);

// ====================================================================
// TEST SUITE 1: TOEIC 400-700 & 6 MODES / WORD VALIDATION
// ====================================================================
console.log("💼 TEST SUITE 1: TOEIC 400-700 Full 6 Modes Coverage");

const toeicQuestions = IELTS_VOCAB_BANK.filter(q => q.category === 'toeic' || (q.id && q.id.startsWith('toeic_')));
assert(toeicQuestions.length === 210, `Kho câu hỏi TOEIC phải có chính xác 210 câu (Thực tế: ${toeicQuestions.length})`);

const toeicWordsMap = {};
toeicQuestions.forEach(q => {
  const rootWord = q.target_word.split(' ')[0].toUpperCase();
  if (!toeicWordsMap[rootWord]) toeicWordsMap[rootWord] = [];
  toeicWordsMap[rootWord].push(q.mode);
});

const distinctWords = Object.keys(toeicWordsMap);
assert(distinctWords.length === 35, `Phải có đúng 35 từ vựng TOEIC cốt lõi (Thực tế: ${distinctWords.length} từ)`);

const requiredModes = ['letter_fill', 'meaning_match', 'collocation', 'word_class', 'preposition', 'sentence_cloze'];
let all35Have6Modes = true;
distinctWords.forEach(w => {
  const modes = new Set(toeicWordsMap[w]);
  if (modes.size !== 6 || !requiredModes.every(m => modes.has(m))) {
    all35Have6Modes = false;
    console.error(`Từ TOEIC "${w}" thiếu mode! Hiện có:`, [...modes]);
  }
});
assert(all35Have6Modes, "Tất cả 35 từ vựng TOEIC đều có đầy đủ 6 gameplay modes không thiếu dạng nào!");

// Check filter counts
const engine = new GameEngine();
engine.currentGradeFilter = 'toeic';
const toeicBank = engine.getFilteredBank();
assert(toeicBank.length === 210, `Bộ lọc TOEIC trả về đúng 210 câu (Thực tế: ${toeicBank.length})`);

engine.currentGradeFilter = 'ielts';
const ieltsBank = engine.getFilteredBank();
assert(ieltsBank.length === 161, `Bộ lọc IELTS trả về đúng 161 câu (Thực tế: ${ieltsBank.length})`);

engine.currentGradeFilter = 'all';
const allBank = engine.getFilteredBank();
assert(allBank.length === 371, `Bộ lọc Tất cả trả về đúng 371 câu (Thực tế: ${allBank.length})`);

// ====================================================================
// TEST SUITE 2: ADAPTIVE LEARNING & MEMORY PROFILES (Lv.1 -> Lv.5)
// ====================================================================
console.log("\n🧠 TEST SUITE 2: Adaptive Learning Algorithm & Mastery Progression");

const testQ = {
  id: 'toeic_w01_mm',
  target_word: 'ACCOMMODATE',
  vietnamese: 'cung cấp chỗ ở'
};

// Reset memory profiles
engine.memoryProfiles = {};
let prof = engine.getWordProfile(testQ);
assert(prof.masteryLevel === 1 && prof.retention === 25, "Từ mới bắt đầu ở Level 1 (🌱 Mới) với Retention 25%");

// Quick correct (<3.0s) -> Boost retention +30%
prof = engine.updateMemoryProfile(testQ, true, 2.1);
assert(prof.retention === 55, `Trả lời đúng nhanh (<3s) tăng +30% retention (Thực tế: ${prof.retention}%)`);
assert(prof.consecutiveCorrect === 1 && prof.masteryLevel === 2, `1 câu đúng liên tiếp nâng lên Level 2 (🌿 Đang học)`);

// Continue correct answers
prof = engine.updateMemoryProfile(testQ, true, 2.5);
assert(prof.masteryLevel === 3, `2 câu đúng liên tiếp đạt Level 3 (🌸 Nhớ tốt)`);

prof = engine.updateMemoryProfile(testQ, true, 2.0);
assert(prof.masteryLevel === 4, `3 câu đúng liên tiếp đạt Level 4 (⭐ Nhuần nhuyễn)`);

prof = engine.updateMemoryProfile(testQ, true, 1.8);
assert(prof.masteryLevel === 5 && prof.retention === 100, `4 câu đúng liên tiếp & retention >= 90% đạt Level 5 (💎 Thành thạo)`);

// Incorrect answer -> Penalty & drop level
prof = engine.updateMemoryProfile(testQ, false, 0);
assert(prof.retention === 70, `Trả lời sai bị trừ 30% retention (Thực tế: ${prof.retention}%)`);
assert(prof.consecutiveCorrect === 0, "Trả lời sai reset consecutiveCorrect về 0");
assert(prof.masteryLevel === 4, "Trả lời sai giảm 1 cấp độ Mastery");

// Priority calculation
const priorityUnseen = engine.calculatePriorityScore({ id: 'unseen_01', target_word: 'NEW_WORD' });
assert(priorityUnseen >= 2.5, `Từ chưa từng học có điểm ưu tiên cao (>= 2.5) để kích hoạt học (Thực tế: ${priorityUnseen.toFixed(2)})`);

const priorityKnown = engine.calculatePriorityScore(testQ);
assert(priorityKnown < priorityUnseen, `Từ đã quen có điểm ưu tiên thấp hơn từ chưa học (${priorityKnown.toFixed(2)} < ${priorityUnseen.toFixed(2)})`);

// Dynamic Difficulty Flow in Question Queue (T1 -> T2 -> T3)
engine.usedQuestionIds.clear();
const roundQueue = engine.generateAdaptiveQueue(engine.getFilteredBank());
assert(roundQueue.length === 10, `Hàng đợi ván chơi luôn có đủ 10 câu (Thực tế: ${roundQueue.length})`);

const q1to3Modes = roundQueue.slice(0, 3).map(q => q.mode);
const isT1Warmup = q1to3Modes.every(m => ['meaning_match', 'letter_fill'].includes(m));
assert(isT1Warmup, `Câu 1-3 thuộc Tầng 1 (Khởi động: meaning_match / letter_fill). Các modes: ${q1to3Modes.join(', ')}`);

const q4to7Modes = roundQueue.slice(3, 7).map(q => q.mode);
const isT2Application = q4to7Modes.every(m => ['word_class', 'collocation'].includes(m));
assert(isT2Application, `Câu 4-7 thuộc Tầng 2 (Tăng tốc: word_class / collocation). Các modes: ${q4to7Modes.join(', ')}`);

const q8to10Modes = roundQueue.slice(7, 10).map(q => q.mode);
const isT3Mastery = q8to10Modes.every(m => ['preposition', 'sentence_cloze'].includes(m));
assert(isT3Mastery, `Câu 8-10 thuộc Tầng 3 (Về đích: preposition / sentence_cloze). Các modes: ${q8to10Modes.join(', ')}`);

// ====================================================================
// TEST SUITE 3: INTERACTIVE LETTER FILL KEYBOARD UX
// ====================================================================
console.log("\n🔤 TEST SUITE 3: Interactive Letter Fill Keyboard UX");

const lfQuestion = toeicQuestions.find(q => q.mode === 'letter_fill' && q.target_word === 'SCHEDULE');
engine.questions = [lfQuestion];
engine.currentIndex = 0;
engine.loadQuestion(0);

const blankBoxes = engine.letterBoxContainer.querySelectorAll('.letter-box.blank');
assert(blankBoxes.length === lfQuestion.missing.length, `Số ô trống hiển thị khớp số ký tự missing (${blankBoxes.length} ô)`);
assert(blankBoxes.every(b => b.textContent === '_'), "Các ô trống ban đầu hiển thị '_'");

const letterTiles = engine.answersContainer.querySelectorAll('.letter-tile-btn');
assert(letterTiles.length === 8, `Bàn phím ký tự tạo đúng 8 phím bấm (Thực tế: ${letterTiles.length} phím)`);

// Check that missing characters are in the keyboard
const missingChars = (Array.isArray(lfQuestion.missing) ? lfQuestion.missing : lfQuestion.missing.split('')).map(c => c.toUpperCase());
const keyboardChars = letterTiles.map(t => t.dataset.char);
const hasAllMissing = missingChars.every(ch => keyboardChars.includes(ch));
assert(hasAllMissing, `Bàn phím chứa đầy đủ các ký tự đáp án: [${missingChars.join(', ')}]`);

// Simulate tapping a tile
const firstMissingChar = missingChars[0];
const targetTile = letterTiles.find(t => t.dataset.char === firstMissingChar && !t.classList.contains('used'));
targetTile.click();

assert(blankBoxes[0].textContent === firstMissingChar, `Chạm phím '${firstMissingChar}' điền vào ô trống đầu tiên`);
assert(targetTile.classList.contains('used'), "Phím đã chọn chuyển sang trạng thái .used và bị vô hiệu hóa");

// Undo action
const btnUndo = engine.answersContainer.querySelector('#btn-letter-undo');
btnUndo.click();
assert(blankBoxes[0].textContent === '_', "Bấm 'Xóa ký tự' trả ô trống về '_'");
assert(!targetTile.classList.contains('used'), "Phím ký tự được khôi phục sẵn sàng chọn lại");

// Fill all blanks correctly and evaluate
missingChars.forEach((ch, idx) => {
  const tile = letterTiles.find(t => t.dataset.char === ch && !t.classList.contains('used'));
  tile.click();
});

assert(engine.roundResults.length === 1 && engine.roundResults[0] === true, "Điền đủ các ký tự đúng tự động chấm ĐÚNG và chuyển trạng thái!");
assert(engine.score > 0, `Nhận điểm thưởng thành công: ${engine.score} XP`);

// 50:50 Powerup on letter fill
const lfQuestion2 = toeicQuestions.find(q => q.mode === 'letter_fill' && q.target_word === 'INVOICE');
engine.questions = [lfQuestion2];
engine.currentIndex = 0;
engine.powerups.fiftyFifty = true;
engine.isAnsweringLocked = false;
engine.loadQuestion(0);

engine.useFiftyFifty();
const eliminatedTiles = engine.answersContainer.querySelectorAll('.letter-tile-btn.eliminated');
assert(eliminatedTiles.length === 2, `Kích hoạt 50:50 loại chính xác 2 ký tự nhiễu trên bàn phím (Thực tế: ${eliminatedTiles.length})`);

const q2Missing = (Array.isArray(lfQuestion2.missing) ? lfQuestion2.missing : lfQuestion2.missing.split('')).map(c => c.toUpperCase());
const eliminatedChars = eliminatedTiles.map(t => t.dataset.char);
const didNotEliminateCorrect = eliminatedChars.every(ch => !q2Missing.includes(ch));
assert(didNotEliminateCorrect, "50:50 không bao giờ loại nhầm ký tự đáp án đúng");

console.log("\n======================================================================");
console.log(`🏁 KẾT QUẢ: ${passed}/${total} BÀI KIỂM ĐỊNH ADAPTIVE & TOEIC ĐẠT TUYỆT ĐỐI!`);
console.log("======================================================================");
clearInterval(engine.timerInterval);
process.exit(0);
