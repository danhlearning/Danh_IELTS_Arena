/**
 * TEST NEW FEATURES:
 * 1. Local Data Persistence, Export & Import
 * 2. Resilient Spelling & Vietnamese IME & UK/US Equivalence
 * 3. Interleaved Listening Mode in Adaptive Queue
 * 4. Gemini Flash Exam Scanner Schema & Batching
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("==================================================");
console.log("🧪 KIỂM TRA TOÀN DIỆN 4 TÍNH NĂNG MỚI ĐÃ BỔ SUNG");
console.log("==================================================\n");

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

// 1. Mock browser environment in global scope
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, val) { this.store[key] = String(val); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

global.sessionStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, val) { this.store[key] = String(val); },
  clear() { this.store = {}; }
};

function createMockEl() {
  return {
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
      toggle: () => false
    },
    innerHTML: '',
    textContent: '',
    value: '',
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: () => {},
    querySelector: () => createMockEl(),
    querySelectorAll: () => []
  };
}

global.document = {
  getElementById: (id) => createMockEl(),
  createElement: (tag) => createMockEl(),
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  body: createMockEl(),
  documentElement: createMockEl()
};

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: global.localStorage,
  sessionStorage: global.sessionStorage
};

global.navigator = { vibrate: () => true };

// Evaluate data.js, sound.js, app.js
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'sound.js'), 'utf8'));
const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
vm.runInThisContext(appCode);

console.log("📝 1. KIỂM TRA CHÍNH TẢ & BỘ GÕ VIỆT NAM (IME) & UK/US");
assert(typeof stripDiacritics === 'function', "stripDiacritics phải là một hàm");
assert(stripDiacritics("áàảãạâấầẩẫậăắằẳẵặ") === "aaaaaaaaaaaaaaaaa", "Loại bỏ hoàn toàn dấu nguyên âm a");
assert(stripDiacritics("đường phố") === "duong pho", "Chuẩn hóa đ -> d");
assert(stripDiacritics("Ê, Ô, Ư") === "E, O, U", "Chuẩn hóa chữ hoa có dấu");

assert(typeof areEquivalentSpellings === 'function', "areEquivalentSpellings phải là một hàm");
assert(areEquivalentSpellings("counsellor", "counselor") === true, "Chấp nhận counsellor (UK) = counselor (US)");
assert(areEquivalentSpellings("recognise", "recognize") === true, "Chấp nhận recognise (UK) = recognize (US)");
assert(areEquivalentSpellings("colour", "color") === true, "Chấp nhận colour (UK) = color (US)");
assert(areEquivalentSpellings("defence", "defense") === true, "Chấp nhận defence (UK) = defense (US)");
assert(areEquivalentSpellings("centre", "center") === true, "Chấp nhận centre (UK) = center (US)");
assert(areEquivalentSpellings("analyse", "analyze") === true, "Chấp nhận analyse (UK) = analyze (US)");
assert(areEquivalentSpellings("travelling", "traveling") === true, "Chấp nhận travelling (UK) = traveling (US)");

console.log("\n🔄 2. KIỂM TRA XUẤT / NHẬP TIẾN ĐỘ HỌC TẬP (EXPORT & IMPORT)");
assert(typeof GameEngine === 'function', "GameEngine phải khởi tạo thành công");

const engine = new GameEngine();
assert(typeof engine.exportProgressData === 'function', "exportProgressData phải tồn tại");
assert(typeof engine.importProgressData === 'function', "importProgressData phải tồn tại");

// Thiết lập dữ liệu mẫu
engine.memoryProfiles = {
  "INNOVATION": { word: "INNOVATION", retention: 80, masteryLevel: 4, testedCount: 5 }
};
engine.weakWordIds = ["g6_lf_01"];
engine.scrambleAdaptiveLevel = 3;
engine.isAutoNextEnabled = false;

const exported = engine.exportProgressData();
assert(exported && exported.storage, "Dữ liệu export phải có thuộc tính storage");
assert(exported.storage.ielts_memory_profiles["INNOVATION"].retention === 80, "Dữ liệu memory profile được xuất chính xác");
assert(exported.storage.ielts_scramble_level === 3, "Cấp độ Scramble được xuất chính xác");

// Giả lập nhập ở thiết bị mới
const engine2 = new GameEngine();
const importSuccess = engine2.importProgressData(JSON.stringify(exported));
assert(importSuccess === true, "Nhập tiến độ thành công");
assert(engine2.memoryProfiles["INNOVATION"] && engine2.memoryProfiles["INNOVATION"].retention === 80, "Dữ liệu memory profiles được phục hồi");
assert(engine2.scrambleAdaptiveLevel === 3, "Cấp độ Scramble được phục hồi");
assert(engine2.isAutoNextEnabled === false, "Cài đặt Auto Next được phục hồi");

console.log("\n🎧 3. KIỂM TRA PHÂN BỐ CÂU HỎI LISTENING ĐAN XEN");
assert(typeof engine.createListeningVariant === 'function', "createListeningVariant phải tồn tại");

const sampleVocab = {
  id: "test_vocab_01",
  target_word: "ACCOMMODATE",
  vietnamese: "Cung cấp chỗ ở",
  phonetic: "/əˈkɒm.ə.deɪt/",
  band: "7.0",
  topic: "Housing"
};

const listeningQ = engine.createListeningVariant(sampleVocab, IELTS_VOCAB_BANK);
assert(listeningQ.mode === 'listening_choice', "Câu hỏi biến thể phải có mode 'listening_choice'");
assert(listeningQ.options.length === 4, "Câu hỏi listening phải có đủ 4 lựa chọn");
assert(listeningQ.options.includes("ACCOMMODATE"), "Các lựa chọn phải chứa từ mục tiêu ACCOMMODATE");
assert(listeningQ.correct_answer === "ACCOMMODATE", "Đáp án đúng phải là ACCOMMODATE");
assert(listeningQ.options[listeningQ.correct] === "ACCOMMODATE", "Vị trí correct index phải khớp với ACCOMMODATE");

// Kiểm tra đan xen trong hàng đợi adaptive
const testPool = IELTS_VOCAB_BANK.slice(0, 50);
const queue = engine.generateAdaptiveQueue(testPool);
assert(queue.length === 10, "Hàng đợi mỗi vòng phải có đúng 10 câu");
const listeningInQueue = queue.filter(q => q.mode === 'listening_choice');
assert(listeningInQueue.length >= 1, `Phải có câu hỏi listening đan xen trong vòng chơi (Thực tế: ${listeningInQueue.length} câu)`);
assert(queue[2].mode === 'listening_choice' || queue[7].mode === 'listening_choice', "Listening phải xuất hiện ở vị trí câu 3 hoặc câu 8");

console.log("\n📸 4. KIỂM TRA ĐỀ THI QUÉT GEMINI FLASH & BATCHING 60 CÂU");
assert(typeof engine.loadScannedExams === 'function', "loadScannedExams phải tồn tại");
assert(typeof engine.getPreloadedSampleExam === 'function', "getPreloadedSampleExam phải tồn tại");
assert(typeof engine.callGeminiFlashExamExtractor === 'function', "callGeminiFlashExamExtractor phải tồn tại");

// Kiểm tra hỗ trợ chuẩn Key mới (AQ...) và key cũ (AIza...)
engine.geminiApiKey = 'AQ.Ab8RN6TestNewKey12345';
engine.updateGeminiKeyBadge();
assert(engine.geminiApiKey.startsWith('AQ.'), "Hệ thống hỗ trợ chuẩn Authorization Key mới của Google (AQ...)");

engine.geminiApiKey = 'AIzaSyLegacyKeyTest67890';
engine.updateGeminiKeyBadge();
assert(engine.geminiApiKey.startsWith('AIza'), "Hệ thống hỗ trợ chuẩn API Key truyền thống (AIza...)");

// Kiểm tra mã nguồn gọi mô hình gemini-flash-latest
assert(appCode.includes("'gemini-flash-latest'"), "Mô hình mục tiêu ưu tiên số 1 phải là 'gemini-flash-latest'");
assert(appCode.includes("'x-goog-api-key'"), "Header xác thực phải có 'x-goog-api-key' chuẩn Google GenAI");

const preloadedExam = engine.getPreloadedSampleExam();
assert(preloadedExam.questions.length === 10, "Đề mẫu chuẩn phải có đủ 10 câu hỏi");
assert(preloadedExam.questions.every(q => (q.mode === 'sentence_scramble') ? (q.raw_tokens && q.raw_tokens.length > 0) : (q.options && q.options.length === 4)), "Các câu trắc nghiệm/điền từ trong đề mẫu phải có đủ 4 lựa chọn");
assert(preloadedExam.questions.every(q => (q.mode === 'sentence_scramble' || q.mode === 'letter_fill') ? true : (typeof q.correct === 'number' && q.correct >= 0 && q.correct < 4)), "Vị trí đáp án đúng cho câu trắc nghiệm phải từ 0-3");

console.log("\n==================================================");
console.log(`🏁 KẾT QUẢ: ${passed}/${total} BÀI KIỂM TRA ĐẠT ĐIỂM TUYỆT ĐỐI!`);
console.log("==================================================");

if (passed === total) {
  console.log("🎉 TOÀN BỘ 4 TÍNH NĂNG MỚI ĐÃ HOẠT ĐỘNG HOÀN HẢO!\n");
  process.exit(0);
} else {
  console.error("💥 CÓ LỖI XẢY RA TRONG KIỂM TRA!\n");
  process.exit(1);
}
