/**
 * IELTS BLITZ ARENA - GAME ENGINE (iOS 27 LIQUID GLASS EDITION)
 * 10-Second Countdown, Spaced Repetition, Active Recall & Long-Term Memory Retention
 */

// Utility: Loại bỏ dấu tiếng Việt (Telex / VNI gõ nhầm)
function stripDiacritics(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd');
}

// Utility: Kiểm tra tương đương chính tả Anh-Anh & Anh-Mỹ (IELTS chấp nhận cả hai)
function areEquivalentSpellings(w1, w2) {
  if (!w1 || !w2) return false;
  const s1 = stripDiacritics(w1).trim().toUpperCase();
  const s2 = stripDiacritics(w2).trim().toUpperCase();
  if (s1 === s2) return true;

  const normUKUS = (s) => {
    return s
      .replace(/OUR/g, 'OR')
      .replace(/ISE\b/g, 'IZE')
      .replace(/ISING\b/g, 'IZING')
      .replace(/ISED\b/g, 'IZED')
      .replace(/ISATION\b/g, 'IZATION')
      .replace(/RE\b/g, 'ER')
      .replace(/LL/g, 'L')
      .replace(/ENCE\b/g, 'ENSE')
      .replace(/OGUE\b/g, 'OG')
      .replace(/YSE\b/g, 'YZE');
  };

  return normUKUS(s1) === normUKUS(s2);
}

// Utility: Xáo trộn mảng ngẫu nhiên an toàn (Fisher-Yates)
if (typeof shuffleArray !== 'function') {
  function shuffleArray(array) {
    if (!Array.isArray(array)) return [];
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

class GameEngine {
  constructor() {
    this.totalQuestionsPerRound = 10;
    this.maxTimeSeconds = 15.0; // Cơ chế đếm ngược 15 GIÂY
    this.timeStepMs = 50;

    this.questions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.hearts = 3;
    this.maxHearts = 3;
    this.consecutiveForHeartRecovery = 0;
    
    this.remainingTime = this.maxTimeSeconds;
    this.timerInterval = null;
    this.isAnsweringLocked = false;
    this.isFrozen = false;

    this.roundResults = []; // true / false
    this.responseTimes = [];
    this.sessionVocabs = []; // Danh sách từ trong vòng chơi
    this.questionStartTime = 0;

    this.powerups = {
      fiftyFifty: true,
      freeze: true,
      hint: true
    };

    // Hệ thống Spaced Repetition (SRS)
    this.srsMatrix = this.loadSRSMatrix();
    this.usedQuestionIds = this.loadUsedQuestionIds();
    this.weakWordIds = this.loadWeakWords();
    this.memoryProfiles = this.loadMemoryProfiles();
    this.currentGradeFilter = 'all'; // Mặc định luôn luôn là adaptive toàn diện theo yêu cầu người dùng

    // Game Đặt Câu Thích Ứng (Adaptive Sentence Scramble Engine)
    this.scrambleAdaptiveLevel = parseInt(localStorage.getItem('ielts_scramble_level') || '1', 10);
    if (isNaN(this.scrambleAdaptiveLevel) || this.scrambleAdaptiveLevel < 1 || this.scrambleAdaptiveLevel > 4) {
      this.scrambleAdaptiveLevel = 1;
    }
    this.scrambleStreak = 0;
    this.scrambleFails = 0;

    // Tự động chuyển câu (Auto Next) - Mặc định BẬT (true), đồng bộ theo tùy chọn người dùng
    this.isAutoNextEnabled = (localStorage.getItem('ielts_auto_next') !== 'false');

    // Lưu trữ tiến độ và lịch sử làm bài (Local Persistence)
    this.userHistory = this.loadUserHistory();
    this.totalXp = parseInt(localStorage.getItem('ielts_total_xp') || '0', 10);
    this.totalAnswered = parseInt(localStorage.getItem('ielts_total_answered') || '0', 10);
    this.totalCorrect = parseInt(localStorage.getItem('ielts_total_correct') || '0', 10);

    // AI Scanner Đề thi giấy (Gemini Flash)
    this.geminiApiKey = localStorage.getItem('ielts_gemini_api_key') || '';
    this.scannedExams = this.loadScannedExams();
    this.currentArenaView = 'vocab'; // 'vocab' | 'scanner'
    this.currentPlayingExam = null;
    this.isBackgroundGenerating = false;

    this.initDOMElements();
    this.bindEvents();
    this.applyPersistedSettings();
    this.updateGradeFilterUI();
    this.initScannerSystem();
  }

  loadUsedQuestionIds() {
    try {
      const saved = sessionStorage.getItem('ielts_used_questions');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  }

  saveUsedQuestionIds() {
    try {
      sessionStorage.setItem('ielts_used_questions', JSON.stringify([...this.usedQuestionIds]));
    } catch (e) {}
  }

  loadWeakWords() {
    try {
      const saved = localStorage.getItem('ielts_weak_words');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  saveWeakWords() {
    try {
      localStorage.setItem('ielts_weak_words', JSON.stringify(this.weakWordIds));
    } catch (e) {}
  }

  loadMemoryProfiles() {
    try {
      const saved = localStorage.getItem('ielts_memory_profiles');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  saveMemoryProfiles() {
    try {
      localStorage.setItem('ielts_memory_profiles', JSON.stringify(this.memoryProfiles));
    } catch (e) {}
  }

  getWordProfile(q) {
    if (!q) return { word: '', testedCount: 0, failCount: 0, consecutiveCorrect: 0, lastSeen: 0, avgResponseTime: 6.0, masteryLevel: 1, retention: 25 };
    const key = (q.target_word || q.id || 'WORD').toUpperCase();
    if (!this.memoryProfiles[key]) {
      this.memoryProfiles[key] = {
        word: key,
        testedCount: 0,
        failCount: 0,
        consecutiveCorrect: 0,
        lastSeen: 0,
        avgResponseTime: 6.0,
        masteryLevel: 1,
        retention: 25,
        spellingStep: 1
      };
    }
    if (typeof this.memoryProfiles[key].spellingStep === 'undefined') {
      this.memoryProfiles[key].spellingStep = 1;
    }
    return this.memoryProfiles[key];
  }

  updateMemoryProfile(q, isCorrect, timeTaken = 5.0) {
    if (!q) return null;
    const prof = this.getWordProfile(q);
    prof.testedCount++;
    prof.lastSeen = Date.now();

    if (timeTaken > 0) {
      prof.avgResponseTime = prof.testedCount === 1
        ? Number(timeTaken.toFixed(2))
        : Number(((prof.avgResponseTime * 0.7) + (timeTaken * 0.3)).toFixed(2));
    }

    if (isCorrect) {
      prof.consecutiveCorrect++;
      if (timeTaken < 3.0) {
        prof.retention = Math.min(100, prof.retention + 30);
      } else if (timeTaken <= 8.0) {
        prof.retention = Math.min(100, prof.retention + 20);
      } else {
        prof.retention = Math.min(100, prof.retention + 10);
      }

      // Nâng cấp độ Mastery (Lv.1 🌱 đến Lv.5 💎)
      if (prof.consecutiveCorrect >= 4 && prof.retention >= 90) {
        prof.masteryLevel = 5;
      } else if (prof.consecutiveCorrect >= 3 && prof.retention >= 75) {
        prof.masteryLevel = 4;
      } else if (prof.consecutiveCorrect >= 2 && prof.retention >= 50) {
        prof.masteryLevel = 3;
      } else if (prof.consecutiveCorrect >= 1) {
        prof.masteryLevel = 2;
      }
    } else {
      prof.failCount++;
      prof.consecutiveCorrect = 0;
      prof.retention = Math.max(25, prof.retention - 30);
      prof.masteryLevel = Math.max(1, prof.masteryLevel - 1);
    }

    const key = (q.target_word || q.id || 'WORD').toUpperCase();
    this.memoryProfiles[key] = prof;
    this.saveMemoryProfiles();
    return prof;
  }

  calculatePriorityScore(q) {
    const prof = this.getWordProfile(q);
    if (prof.testedCount === 0) {
      return 2.5; // Ưu tiên cao cho từ vựng mới tiếp xúc
    }
    const failRate = prof.failCount / Math.max(1, prof.testedCount);
    const hoursSinceSeen = (Date.now() - prof.lastSeen) / (1000 * 60 * 60);
    const timeDecay = Math.min(1.0, hoursSinceSeen / 24);
    const speedFactor = Math.min(1.0, prof.avgResponseTime / 15.0);

    let score = (failRate * 0.40) + (timeDecay * 0.35) + (speedFactor * 0.25);
    score += (100 - prof.retention) / 100 * 0.3;

    if (this.weakWordIds && this.weakWordIds.includes(q.id)) {
      score += 0.5;
    }
    return score;
  }

  loadSRSMatrix() {
    try {
      const saved = localStorage.getItem('ielts_srs_matrix');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  saveSRSMatrix() {
    try {
      localStorage.setItem('ielts_srs_matrix', JSON.stringify(this.srsMatrix));
    } catch (e) {
      console.error("Không thể lưu SRS matrix", e);
    }
  }

  updateWordRetention(wordId, isCorrect) {
    if (!this.srsMatrix[wordId]) {
      this.srsMatrix[wordId] = { retention: 25, failCount: 0, testedCount: 0 };
    }
    const record = this.srsMatrix[wordId];
    record.testedCount++;

    if (isCorrect) {
      record.retention = Math.min(100, record.retention + 25);
    } else {
      record.retention = Math.max(25, record.retention - 25);
      record.failCount++;
    }
    this.saveSRSMatrix();
    return record.retention;
  }

  getWordRetention(wordId) {
    return this.srsMatrix[wordId] ? this.srsMatrix[wordId].retention : 25;
  }

  initDOMElements() {
    // Top status
    this.timerBar = document.getElementById('timer-bar');
    this.timerSecondsEl = document.getElementById('timer-seconds');
    this.countdownDigitalBox = document.getElementById('countdown-digital-box');
    this.scoreEl = document.getElementById('score-display');
    this.progressText = document.getElementById('progress-text');
    this.streakPill = document.getElementById('streak-pill');
    this.streakText = document.getElementById('streak-text');
    this.heartsContainer = document.getElementById('hearts-container');

    // Dynamic Island Liquid Droplet Spring
    this.islandEl = document.getElementById('dynamic-island');
    this.islandMsg = document.getElementById('island-message');
    this.islandIcon = document.getElementById('island-drop-icon');
    this.islandTitle = document.getElementById('island-drop-title');

    // Question card
    this.questionCard = document.getElementById('question-card');
    this.gradeBadge = document.getElementById('grade-badge');
    this.bandBadge = document.getElementById('band-badge');
    this.masteryBadge = document.getElementById('mastery-badge');
    this.modeBadge = document.getElementById('mode-badge');
    this.topicBadge = document.getElementById('topic-badge');
    this.promptText = document.getElementById('prompt-text');
    this.questionMainText = document.getElementById('question-main-text');
    this.letterBoxContainer = document.getElementById('letter-box-container');
    this.vocabImageContainer = document.getElementById('vocab-image');
    this.vocabImg = document.getElementById('vocab-img');
    this.phoneticGuide = document.getElementById('phonetic-guide');
    this.academicHintPill = document.getElementById('academic-hint-pill');

    // Answers & Powerups
    this.answersContainer = document.getElementById('answers-container');
    this.btnFiftyFifty = document.getElementById('btn-fifty');
    this.btnFreeze = document.getElementById('btn-freeze');
    this.btnHint = document.getElementById('btn-hint');

    // Feedback Drawer (Tinh gọn, không nhồi nhét)
    this.feedbackDrawer = document.getElementById('feedback-drawer');
    this.feedbackTitle = document.getElementById('feedback-title');
    this.feedbackVietnamese = document.getElementById('feedback-vietnamese');
    this.feedbackExplanation = document.getElementById('feedback-explanation');
    this.examTaskLabel = document.getElementById('exam-task-label');
    this.examSentenceQuote = document.getElementById('exam-sentence-quote');
    this.commonMistakeText = document.getElementById('common-mistake-text');
    this.btnNext = document.getElementById('btn-next');
    this.btnAutoNext = document.getElementById('btn-auto-next');
    this.autoNextBadge = document.getElementById('auto-next-badge');

    // Victory Modal
    this.modalOverlay = document.getElementById('modal-overlay');
    this.finalScoreEl = document.getElementById('final-score');
    this.maxStreakEl = document.getElementById('max-streak');
    this.avgTimeEl = document.getElementById('avg-time');
    this.accuracyEl = document.getElementById('accuracy-rate');
    this.bandGradeEl = document.getElementById('band-grade');
    this.victoryTrophyEl = document.getElementById('victory-trophy-icon');
    this.victoryPraiseEl = document.getElementById('victory-praise');
    this.wordleGridEl = document.getElementById('wordle-grid');
    this.btnShare = document.getElementById('btn-share');
    this.btnReplay = document.getElementById('btn-replay');
    this.btnResultChangeMode = document.getElementById('btn-result-change-mode');
    this.btnVaultOpen = document.getElementById('btn-vault-open');

    // Exam Vault Modal
    this.vaultOverlay = document.getElementById('vault-overlay');
    this.vaultList = document.getElementById('vault-list');
    this.btnVaultClose = document.getElementById('btn-vault-close');

    // Grade & Band Filter
    this.btnGradeFilter = document.getElementById('btn-grade-filter');
    this.currentFilterPillLabel = document.getElementById('current-filter-pill-label');
    this.gradeModalOverlay = document.getElementById('grade-modal-overlay');
    this.btnGradeModalClose = document.getElementById('btn-grade-modal-close');

    // Header actions
    this.btnThemeToggle = document.getElementById('btn-theme-toggle');
    this.themeIconSvg = document.getElementById('theme-icon-svg');
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.soundIconSvg = document.getElementById('sound-icon-svg');
    this.btnViewToggle = document.getElementById('btn-view-toggle');

    // Arena views & Scanner elements
    this.vocabArenaView = document.getElementById('vocab-arena-view');
    this.scannerArenaView = document.getElementById('scanner-arena-view');
    this.btnOpenScanner = document.getElementById('btn-open-scanner');
    this.btnScannerBack = document.getElementById('btn-scanner-back');
    this.btnScannerKeyConfig = document.getElementById('btn-scanner-key-config');
    this.scannerKeyStatusBadge = document.getElementById('scanner-key-status-badge');

    // Camera & Scanner triggers
    this.btnCameraTrigger = document.getElementById('btn-camera-trigger');
    this.btnGalleryTrigger = document.getElementById('btn-gallery-trigger');
    this.cameraFileInput = document.getElementById('camera-file-input');
    this.galleryFileInput = document.getElementById('gallery-file-input');
    this.scanningRadarStatus = document.getElementById('scanning-radar-status');
    this.scannedExamsShelf = document.getElementById('scanned-exams-shelf');
    this.scannerLogStatus = document.getElementById('scanner-log-status');

    // Listening Player Container & Play Button
    this.listeningPlayerContainer = document.getElementById('listening-player-container');
    this.btnListeningPlay = document.getElementById('btn-listening-play');

    // Gemini API Key Modal
    this.geminiKeyModal = document.getElementById('gemini-key-modal');
    this.geminiKeyInput = document.getElementById('gemini-key-input');
    this.btnToggleKeyEye = document.getElementById('btn-toggle-key-eye');
    this.btnCloseKeyModal = document.getElementById('btn-close-key-modal');
    this.btnCancelKey = document.getElementById('btn-cancel-key');
    this.btnSaveKey = document.getElementById('btn-save-key');
    this.keyInputFeedback = document.getElementById('key-input-feedback');

    // Sync Modal (Export / Import)
    this.btnSyncOpen = document.getElementById('btn-sync-open');
    this.syncModalOverlay = document.getElementById('sync-modal-overlay');
    this.btnCloseSyncModal = document.getElementById('btn-close-sync-modal');
    this.btnExportFile = document.getElementById('btn-export-file');
    this.btnExportCopy = document.getElementById('btn-export-copy');
    this.btnImportFileTrigger = document.getElementById('btn-import-file-trigger');
    this.importFileInput = document.getElementById('import-file-input');
    this.importPasteArea = document.getElementById('import-paste-area');
    this.btnImportPasteSubmit = document.getElementById('btn-import-paste-submit');
    this.syncStatusMsg = document.getElementById('sync-status-msg');
  }

  bindEvents() {
    this.btnThemeToggle.addEventListener('click', () => this.toggleTheme());
    this.btnSoundToggle.addEventListener('click', () => this.toggleSound());
    if (this.btnViewToggle) {
      this.btnViewToggle.addEventListener('click', () => this.toggleViewMode());
    }

    // Arena view toggle & Scanner navigation
    if (this.btnOpenScanner) {
      this.btnOpenScanner.addEventListener('click', () => this.switchArenaView('scanner'));
    }
    if (this.btnScannerBack) {
      this.btnScannerBack.addEventListener('click', () => this.switchArenaView('vocab'));
    }

    // Camera & Gallery inputs
    if (this.btnCameraTrigger && this.cameraFileInput) {
      this.btnCameraTrigger.addEventListener('click', () => this.cameraFileInput.click());
    }
    if (this.btnGalleryTrigger && this.galleryFileInput) {
      this.btnGalleryTrigger.addEventListener('click', () => this.galleryFileInput.click());
    }
    if (this.cameraFileInput) {
      this.cameraFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleImageFileSelect(e.target.files[0]);
          e.target.value = '';
        }
      });
    }
    if (this.galleryFileInput) {
      this.galleryFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleImageFileSelect(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    // Gemini API Key Modal
    if (this.btnScannerKeyConfig) {
      this.btnScannerKeyConfig.addEventListener('click', () => this.openGeminiKeyModal());
    }
    if (this.btnCloseKeyModal) {
      this.btnCloseKeyModal.addEventListener('click', () => this.closeGeminiKeyModal());
    }
    if (this.btnCancelKey) {
      this.btnCancelKey.addEventListener('click', () => this.closeGeminiKeyModal());
    }
    if (this.btnSaveKey) {
      this.btnSaveKey.addEventListener('click', () => this.saveGeminiKeyFromInput());
    }
    if (this.btnToggleKeyEye) {
      this.btnToggleKeyEye.addEventListener('click', () => this.toggleKeyVisibility());
    }
    if (this.geminiKeyModal) {
      this.geminiKeyModal.addEventListener('click', (e) => {
        if (e.target === this.geminiKeyModal) this.closeGeminiKeyModal();
      });
    }

    // Sync Modal (Export / Import)
    if (this.btnSyncOpen) {
      this.btnSyncOpen.addEventListener('click', () => this.openSyncModal());
    }
    if (this.btnCloseSyncModal) {
      this.btnCloseSyncModal.addEventListener('click', () => this.closeSyncModal());
    }
    if (this.btnExportFile) {
      this.btnExportFile.addEventListener('click', () => this.downloadProgressFile());
    }
    if (this.btnExportCopy) {
      this.btnExportCopy.addEventListener('click', () => this.copyProgressToClipboard());
    }
    if (this.btnImportFileTrigger && this.importFileInput) {
      this.btnImportFileTrigger.addEventListener('click', () => this.importFileInput.click());
    }
    if (this.importFileInput) {
      this.importFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (evt) => {
            this.importProgressData(evt.target.result);
          };
          reader.readAsText(file);
          e.target.value = '';
        }
      });
    }
    if (this.btnImportPasteSubmit) {
      this.btnImportPasteSubmit.addEventListener('click', () => {
        const text = this.importPasteArea ? this.importPasteArea.value : '';
        this.importProgressData(text);
      });
    }
    if (this.syncModalOverlay) {
      this.syncModalOverlay.addEventListener('click', (e) => {
        if (e.target === this.syncModalOverlay) this.closeSyncModal();
      });
    }

    // Listening Replay Button
    if (this.btnListeningPlay) {
      this.btnListeningPlay.addEventListener('click', () => {
        const q = this.questions[this.currentIndex];
        if (q) {
          const wordToSpeak = q.target_word || q.correct_answer || (q.options ? q.options[q.correct] : '');
          if (wordToSpeak && typeof speechEngine !== 'undefined' && typeof speechEngine.speakWord === 'function') {
            speechEngine.speakWord(wordToSpeak);
          }
          this.btnListeningPlay.classList.add('playing');
          setTimeout(() => {
            if (this.btnListeningPlay) this.btnListeningPlay.classList.remove('playing');
          }, 1200);
        }
      });
    }

    this.btnFiftyFifty.addEventListener('click', () => this.useFiftyFifty());
    this.btnFreeze.addEventListener('click', () => this.useFreeze());
    this.btnHint.addEventListener('click', () => this.useHint());

    this.btnNext.addEventListener('click', () => this.nextQuestion());
    if (this.btnAutoNext) {
      this.btnAutoNext.addEventListener('click', () => this.toggleAutoNext());
    }
    if (this.btnReplay) {
      this.btnReplay.addEventListener('click', () => this.startNewRound());
    }
    if (this.btnShare) {
      this.btnShare.addEventListener('click', () => this.copyShareCard());
    }
    if (this.btnResultChangeMode) {
      this.btnResultChangeMode.addEventListener('click', () => {
        if (this.modalOverlay) this.modalOverlay.classList.remove('active');
        this.openGradeModal();
      });
    }

    if (this.btnVaultOpen) {
      this.btnVaultOpen.addEventListener('click', () => this.openVault());
    }
    if (this.btnVaultClose) {
      this.btnVaultClose.addEventListener('click', () => this.closeVault());
    }

    if (this.btnGradeFilter) {
      this.btnGradeFilter.addEventListener('click', () => this.openGradeModal());
    }
    if (this.btnGradeModalClose) {
      this.btnGradeModalClose.addEventListener('click', () => this.closeGradeModal());
    }
    if (this.gradeModalOverlay) {
      this.gradeModalOverlay.addEventListener('click', (e) => {
        if (e.target === this.gradeModalOverlay) this.closeGradeModal();
      });
    }

    if (document.querySelectorAll) {
      const optionBtns = document.querySelectorAll('.grade-option-btn');
      optionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const filterKey = btn.getAttribute('data-filter');
          this.setGradeFilter(filterKey);
        });
      });
    }

    // Mở khóa Web Audio Context khi user chạm lần đầu
    const unlockAudio = () => {
      soundEngine.init();
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });

    // Hỗ trợ gõ phím máy tính (Physical Keyboard: A-Z, Backspace, 1-4)
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('keydown', (e) => {
        if (this.isAnsweringLocked) return;
        if (this.feedbackDrawer && this.feedbackDrawer.classList.contains('active')) {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
            this.nextQuestion();
          }
          return;
        }

        const q = this.questions[this.currentIndex];
        if (!q) return;

        if (q.mode === 'letter_fill') {
          if (e.key === 'Backspace') {
            const btnUndo = document.getElementById('btn-letter-undo') || (this.answersContainer && this.answersContainer.querySelector('.kbd-backspace'));
            if (btnUndo) {
              btnUndo.click();
              btnUndo.classList.add('key-pressed');
              setTimeout(() => btnUndo.classList.remove('key-pressed'), 120);
            }
          } else if (e.key === 'Escape' || e.key === 'Delete') {
            const btnClear = document.getElementById('btn-letter-clear') || (this.answersContainer && this.answersContainer.querySelector('.kbd-clear'));
            if (btnClear) {
              btnClear.click();
              btnClear.classList.add('key-pressed');
              setTimeout(() => btnClear.classList.remove('key-pressed'), 120);
            }
          } else {
            const cleanKey = stripDiacritics(e.key);
            if (/^[a-zA-Z]$/.test(cleanKey)) {
              const char = cleanKey.toUpperCase();
              if (this.answersContainer && this.answersContainer.querySelectorAll) {
                // Bậc 4: Full QWERTY keyboard
                const kbdKey = this.answersContainer.querySelector(`.kbd-key[data-char="${char}"]`);
                if (kbdKey) {
                  kbdKey.click();
                  kbdKey.classList.add('key-pressed');
                  setTimeout(() => kbdKey.classList.remove('key-pressed'), 120);
                } else {
                  // Bậc 1-3: Tile bank
                  const tileBtns = Array.from(this.answersContainer.querySelectorAll('.letter-tile-btn'));
                  const availableTile = tileBtns.find(t => t.dataset && t.dataset.char === char && !t.classList.contains('used') && !t.disabled && !t.classList.contains('eliminated'));
                  if (availableTile) {
                    availableTile.click();
                  }
                }
              }
            }
          }
        } else if (q.mode === 'sentence_scramble') {
          if (e.key === 'Backspace') {
            const btnUndo = document.getElementById('btn-scramble-undo');
            if (btnUndo) {
              btnUndo.click();
              btnUndo.classList.add('active');
              setTimeout(() => btnUndo.classList.remove('active'), 120);
            }
          } else if (e.key === 'Escape') {
            const btnClear = document.getElementById('btn-scramble-clear');
            if (btnClear) {
              btnClear.click();
              btnClear.classList.add('active');
              setTimeout(() => btnClear.classList.remove('active'), 120);
            }
          } else if (/^[1-9]$/.test(e.key)) {
            const num = parseInt(e.key, 10) - 1;
            const chips = Array.from(this.answersContainer.querySelectorAll('.word-chip:not(.used):not(.eliminated):not(:disabled)'));
            if (chips[num]) {
              chips[num].click();
            }
          }
        } else {
          // Các dạng trắc nghiệm 4 đáp án (1, 2, 3, 4 hoặc A, B, C, D)
          const key = e.key.toUpperCase();
          const keyMap = { '1': 0, 'A': 0, '2': 1, 'B': 1, '3': 2, 'C': 2, '4': 3, 'D': 3 };
          if (typeof keyMap[key] !== 'undefined' && this.answersContainer && this.answersContainer.querySelectorAll) {
            const idx = keyMap[key];
            const allBtns = Array.from(this.answersContainer.querySelectorAll('.btn-tactile'));
            if (allBtns[idx] && !allBtns[idx].disabled && !allBtns[idx].classList.contains('eliminated')) {
              allBtns[idx].click();
            }
          }
        }
      });
    }
  }

  applyPersistedSettings() {
    const isLight = localStorage.getItem('ielts_theme') === 'light';
    const metaThemeColor = document.getElementById('meta-theme-color');
    const metaStatusBar = document.getElementById('meta-status-bar-style');
    if (isLight) {
      if (document.documentElement && document.documentElement.classList) {
        document.documentElement.classList.add('light-theme');
      }
      if (document.body && document.body.classList) {
        document.body.classList.add('light-theme');
      }
      this.updateThemeIcon(true);
      if (metaThemeColor && typeof metaThemeColor.setAttribute === 'function') {
        metaThemeColor.setAttribute('content', '#ffffff');
      }
      if (metaStatusBar && typeof metaStatusBar.setAttribute === 'function') {
        metaStatusBar.setAttribute('content', 'default');
      }
    } else {
      if (document.documentElement && document.documentElement.classList) {
        document.documentElement.classList.remove('light-theme');
      }
      if (document.body && document.body.classList) {
        document.body.classList.remove('light-theme');
      }
      this.updateThemeIcon(false);
      if (metaThemeColor && typeof metaThemeColor.setAttribute === 'function') {
        metaThemeColor.setAttribute('content', '#000000');
      }
      if (metaStatusBar && typeof metaStatusBar.setAttribute === 'function') {
        metaStatusBar.setAttribute('content', 'black-translucent');
      }
    }

    this.updateSoundIcon(soundEngine.isMuted);
    this.updateAutoNextUI();
  }

  updateThemeIcon(isLight) {
    if (!this.themeIconSvg) return;
    if (isLight) {
      // Icon Mặt Trời
      this.themeIconSvg.innerHTML = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
    } else {
      // Icon Mặt Trăng
      this.themeIconSvg.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
    }
  }

  updateSoundIcon(isMuted) {
    if (!this.soundIconSvg) return;
    if (isMuted) {
      this.soundIconSvg.innerHTML = `<line x1="1" y1="1" x2="23" y2="23"/><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M23 9l-6 6M17 9l6 6"/>`;
    } else {
      this.soundIconSvg.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>`;
    }
  }

  toggleTheme() {
    const isNowLight = document.body ? document.body.classList.toggle('light-theme') : false;
    if (document.documentElement && document.documentElement.classList) {
      document.documentElement.classList.toggle('light-theme', isNowLight);
    }
    localStorage.setItem('ielts_theme', isNowLight ? 'light' : 'dark');
    this.updateThemeIcon(isNowLight);
    const metaThemeColor = document.getElementById('meta-theme-color');
    if (metaThemeColor && typeof metaThemeColor.setAttribute === 'function') {
      metaThemeColor.setAttribute('content', isNowLight ? '#ffffff' : '#000000');
    }
    const metaStatusBar = document.getElementById('meta-status-bar-style');
    if (metaStatusBar && typeof metaStatusBar.setAttribute === 'function') {
      metaStatusBar.setAttribute('content', isNowLight ? 'default' : 'black-translucent');
    }
  }

  toggleSound() {
    const muted = soundEngine.toggleMute();
    this.updateSoundIcon(muted);
  }

  toggleViewMode() {
    const isFullscreen = document.body.classList.toggle('fullscreen-mode');
    const spanText = this.btnViewToggle.querySelector('span');
    if (spanText) {
      spanText.textContent = isFullscreen ? 'Khung iPhone' : 'Tràn màn hình';
    }
  }

  toggleAutoNext() {
    this.isAutoNextEnabled = !this.isAutoNextEnabled;
    try {
      localStorage.setItem('ielts_auto_next', this.isAutoNextEnabled ? 'true' : 'false');
    } catch (e) {}

    this.updateAutoNextUI();

    if (typeof soundEngine !== 'undefined' && typeof soundEngine.playTick === 'function') {
      soundEngine.playTick();
    }

    if (!this.isAutoNextEnabled) {
      // Huỷ timer tự chuyển câu ngay lập tức nếu người dùng tắt tính năng
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
      this.flashDynamicIsland('⏸️ Auto Next: TẮT (Chuyển câu thủ công)');
    } else {
      this.flashDynamicIsland('⚡ Auto Next: BẬT (Tự động chuyển câu)');
      // Nếu popup đang mở ở câu trả lời đúng, kích hoạt timer chuyển câu
      if (this.feedbackDrawer && this.feedbackDrawer.classList.contains('active') && this.feedbackDrawer.classList.contains('correct-state')) {
        if (this.hearts > 0 && this.currentIndex < this.questions.length - 1 && !this.autoAdvanceTimer) {
          this.autoAdvanceTimer = setTimeout(() => {
            if (this.feedbackDrawer && this.feedbackDrawer.classList.contains('active')) {
              this.nextQuestion();
            }
          }, 1400);
        }
      }
    }
  }

  updateAutoNextUI() {
    if (!this.btnAutoNext) return;
    if (this.isAutoNextEnabled) {
      this.btnAutoNext.classList.add('active');
      if (typeof this.btnAutoNext.setAttribute === 'function') {
        this.btnAutoNext.setAttribute('aria-pressed', 'true');
        this.btnAutoNext.setAttribute('title', 'Auto Next đang BẬT (Bấm để Tắt)');
      }
      if (this.autoNextBadge) this.autoNextBadge.textContent = 'BẬT';
    } else {
      this.btnAutoNext.classList.remove('active');
      if (typeof this.btnAutoNext.setAttribute === 'function') {
        this.btnAutoNext.setAttribute('aria-pressed', 'false');
        this.btnAutoNext.setAttribute('title', 'Auto Next đang TẮT (Bấm để Bật)');
      }
      if (this.autoNextBadge) this.autoNextBadge.textContent = 'TẮT';
    }
  }

  getFilteredBank() {
    if (!this.currentGradeFilter || this.currentGradeFilter === 'all') {
      return [...IELTS_VOCAB_BANK];
    }
    if (this.currentGradeFilter === 'scramble') {
      return IELTS_VOCAB_BANK.filter(q => q.mode === 'sentence_scramble');
    }
    if (this.currentGradeFilter === 'toeic') {
      return IELTS_VOCAB_BANK.filter(q => q.category === 'toeic' || q.topic_category === 'toeic' || (q.id && q.id.startsWith('toeic_')));
    }
    if (this.currentGradeFilter === 'ielts') {
      return IELTS_VOCAB_BANK.filter(q => q.category !== 'toeic' && q.topic_category !== 'toeic' && (!q.id || !q.id.startsWith('toeic_')));
    }
    if (this.currentGradeFilter === 'band7') {
      return IELTS_VOCAB_BANK.filter(q => parseFloat(q.band) >= 7.0);
    }
    if (this.currentGradeFilter.startsWith('g')) {
      const gNum = parseInt(this.currentGradeFilter.replace('g', ''), 10);
      return IELTS_VOCAB_BANK.filter(q => q.grade === gNum);
    }
    return [...IELTS_VOCAB_BANK];
  }

  generateAdaptiveQueue(pool) {
    if (!pool || pool.length === 0) return [];

    // Lọc ra các câu hỏi CHƯA TỪNG XUẤT HIỆN trong các vòng chơi gần đây
    let availableQuestions = pool.filter(q => !this.usedQuestionIds.has(q.id));

    // Nếu kho câu hỏi chưa dùng còn dưới 10 câu, làm mới lại kho
    if (availableQuestions.length < this.totalQuestionsPerRound) {
      this.usedQuestionIds.clear();
      availableQuestions = [...pool];
    }

    const workingPool = availableQuestions.length >= this.totalQuestionsPerRound 
      ? availableQuestions 
      : [...pool];

    // Phân loại câu hỏi theo 3 tầng nhận thức tự nhiên (Cognitive Progression Tiers):
    // Tầng 1 (Khởi động - Nhận diện & Mặt chữ): meaning_match, letter_fill
    // Tầng 2 (Tăng tốc - Ngữ pháp & Cụm từ): word_class, collocation
    // Tầng 3 (Về đích - Ngữ cảnh thực chiến & Đặt câu): preposition, sentence_cloze, sentence_scramble
    const tier1Modes = ['meaning_match', 'letter_fill'];
    const tier2Modes = ['word_class', 'collocation'];
    const tier3Modes = ['preposition', 'sentence_cloze', 'sentence_scramble'];

    const t1Pool = workingPool.filter(q => tier1Modes.includes(q.mode));
    const t2Pool = workingPool.filter(q => tier2Modes.includes(q.mode));
    const t3Pool = workingPool.filter(q => tier3Modes.includes(q.mode));

    // Sắp xếp theo trọng số ưu tiên Adaptive (kết hợp jitter ngẫu nhiên 0 - 0.2 để tăng tính biến hóa)
    const sortByPriority = (arr) => {
      return [...arr].sort((a, b) => {
        const diffA = (a.mode === 'sentence_scramble') ? Math.abs((a.difficulty_level || 1) - this.scrambleAdaptiveLevel) * 0.4 : 0;
        const diffB = (b.mode === 'sentence_scramble') ? Math.abs((b.difficulty_level || 1) - this.scrambleAdaptiveLevel) * 0.4 : 0;
        const scoreA = this.calculatePriorityScore(a) - diffA + (Math.random() * 0.2);
        const scoreB = this.calculatePriorityScore(b) - diffB + (Math.random() * 0.2);
        return scoreB - scoreA;
      });
    };

    const sortedT1 = sortByPriority(t1Pool);
    const sortedT2 = sortByPriority(t2Pool);
    const sortedT3 = sortByPriority(t3Pool);

    const selected = [];
    const usedWordsInRound = new Set();

    const pickFromList = (sourceList, count) => {
      const picked = [];
      for (const q of sourceList) {
        if (picked.length >= count) break;
        const word = (q.target_word || q.id).toUpperCase();
        if (!usedWordsInRound.has(word) && !selected.some(item => item.id === q.id)) {
          picked.push(q);
          usedWordsInRound.add(word);
        }
      }
      if (picked.length < count) {
        for (const q of sourceList) {
          if (picked.length >= count) break;
          if (!selected.some(item => item.id === q.id) && !picked.some(item => item.id === q.id)) {
            picked.push(q);
          }
        }
      }
      return picked;
    };

    // Chọn: 3 câu Tầng 1, 4 câu Tầng 2, 3 câu Tầng 3
    selected.push(...pickFromList(sortedT1, 3));
    selected.push(...pickFromList(sortedT2, 4));
    selected.push(...pickFromList(sortedT3, 3));

    // Bù đắp nếu một tầng nào đó bị thiếu (ví dụ bộ lọc quá nhỏ)
    if (selected.length < this.totalQuestionsPerRound && selected.length < workingPool.length) {
      const remaining = sortByPriority(workingPool.filter(q => !selected.some(s => s.id === q.id)));
      for (const q of remaining) {
        if (selected.length >= this.totalQuestionsPerRound) break;
        selected.push(q);
      }
    }

    // Thiết lập tiến trình bậc thang (1 -> 2 -> 3 -> FULL toàn bộ chữ) cho toàn bộ câu letter_fill
    selected.forEach(q => {
      if (q.mode === 'letter_fill') {
        const prof = this.getWordProfile(q);
        q.scaffoldStep = prof.spellingStep || 1;
      }
    });

    // Sắp xếp phân bố đan xen Listening (nghe từ và chọn đáp án đúng tại vị trí câu 3 và câu 8)
    const listeningSlots = [2, 7];
    listeningSlots.forEach(slotIdx => {
      if (selected[slotIdx]) {
        let candidate = selected[slotIdx];
        if (!candidate.target_word) {
          const found = selected.find((item, idx) => item.target_word && !listeningSlots.includes(idx));
          if (found) candidate = found;
        }
        if (candidate && candidate.target_word) {
          const listeningQ = this.createListeningVariant(candidate, workingPool);
          if (listeningQ) {
            selected[slotIdx] = listeningQ;
          }
        }
      }
    });

    // Ghi nhận ID đã chọn vào usedQuestionIds để chống lặp tuyệt đối
    selected.forEach(q => this.usedQuestionIds.add(q.id));
    this.saveUsedQuestionIds();

    return selected;
  }

  // Thiết kế lộ trình 4 bậc thang điền chữ cái: 1 -> 2 -> 3 -> FULL toàn bộ chữ
  getScaffoldedConfig(q) {
    if (!q || !q.target_word) {
      return {
        masked: q.masked || '',
        missing: q.missing || [],
        stepNum: (q.missing || []).length || 1,
        hint: '💡 Điền chữ cái'
      };
    }

    const cleanWord = q.target_word.trim().toUpperCase();
    const letters = cleanWord.split('');
    const totalLetters = letters.filter(ch => /[A-Z]/.test(ch)).length;

    // Xác định bậc thang (Step 1, 2, 3, hoặc 4 = FULL toàn bộ từ)
    let step = q.scaffoldStep;
    if (!step) {
      const prof = this.getWordProfile(q);
      step = prof.spellingStep || 1;
    }

    // Nếu step >= 4 hoặc là 'full' -> Nhập FULL toàn bộ từ!
    if (step === 'full' || step >= 4 || step >= totalLetters) {
      const maskedChars = letters.map(ch => /[A-Z]/.test(ch) ? '_' : ch);
      const missingChars = letters.filter(ch => /[A-Z]/.test(ch));
      return {
        step: 'full',
        stepNum: 4,
        blankCount: totalLetters,
        masked: maskedChars.join(' '),
        missing: missingChars,
        hint: `🏆 Bậc 4 Master: Bàn phím Full Layout (${totalLetters} chữ)!`
      };
    }

    const blankCount = Math.min(Math.max(1, step), totalLetters);

    // Nếu q.masked và q.missing ban đầu khớp chính xác số blankCount thì tái sử dụng
    if (q.masked && q.missing) {
      const origMissingArr = Array.isArray(q.missing) ? q.missing : q.missing.split('');
      if (origMissingArr.length === blankCount) {
        const stepLabels = { 1: '🌱 Bậc 1: Nhập 1 chữ cái', 2: '🌿 Bậc 2: Nhập 2 chữ cái', 3: '🌸 Bậc 3: Nhập 3 chữ cái' };
        return {
          step: `step_${blankCount}`,
          stepNum: blankCount,
          blankCount,
          masked: q.masked,
          missing: origMissingArr,
          hint: stepLabels[blankCount] || `💡 Điền ${blankCount} chữ cái`
        };
      }
    }

    // Tự động sinh vị trí ô trống thông minh (ưu tiên nguyên âm & vị trí giữa từ)
    const alphaIndices = [];
    letters.forEach((ch, idx) => {
      if (/[A-Z]/.test(ch)) alphaIndices.push(idx);
    });

    const vowels = ['A', 'E', 'I', 'O', 'U'];
    const vowelIndices = alphaIndices.filter(i => vowels.includes(letters[i]));
    const consonantIndices = alphaIndices.filter(i => !vowels.includes(letters[i]));

    const chosenIndices = [];
    // Chọn từ nguyên âm trước (từ giữa từ tỏa ra 2 bên)
    const sortedVowels = [...vowelIndices].sort((a, b) => Math.abs(a - cleanWord.length / 2) - Math.abs(b - cleanWord.length / 2));
    for (const idx of sortedVowels) {
      if (chosenIndices.length < blankCount) {
        chosenIndices.push(idx);
      }
    }
    // Nếu chưa đủ số ô trống, chọn tiếp phụ âm
    const sortedConsonants = [...consonantIndices].sort((a, b) => Math.abs(a - cleanWord.length / 2) - Math.abs(b - cleanWord.length / 2));
    for (const idx of sortedConsonants) {
      if (chosenIndices.length < blankCount) {
        chosenIndices.push(idx);
      }
    }

    chosenIndices.sort((a, b) => a - b);

    const maskedChars = letters.map((ch, idx) => {
      if (chosenIndices.includes(idx)) return '_';
      return ch;
    });

    const missingChars = chosenIndices.map(idx => letters[idx]);
    const stepLabels = { 1: '🌱 Bậc 1: Nhập 1 chữ cái', 2: '🌿 Bậc 2: Nhập 2 chữ cái', 3: '🌸 Bậc 3: Nhập 3 chữ cái' };

    return {
      step: `step_${blankCount}`,
      stepNum: blankCount,
      blankCount,
      masked: maskedChars.join(' '),
      missing: missingChars,
      hint: stepLabels[blankCount] || `💡 Điền ${blankCount} chữ cái`
    };
  }

  // Khởi tạo vòng chơi 10 câu độc nhất 100%, tự động hóa thông minh theo Adaptive Learning
  startNewRound() {
    this.modalOverlay.classList.remove('active');
    this.feedbackDrawer.classList.remove('active');
    if (this.vaultOverlay) this.vaultOverlay.classList.remove('active');
    if (this.gradeModalOverlay) this.gradeModalOverlay.classList.remove('active');

    const pool = this.getFilteredBank();
    this.questions = this.generateAdaptiveQueue(pool);

    this.currentIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.hearts = 3;
    this.consecutiveForHeartRecovery = 0;
    this.roundResults = [];
    this.responseTimes = [];
    this.sessionVocabs = [];

    this.powerups = { fiftyFifty: true, freeze: true, hint: true };
    this.updatePowerupButtons();
    this.updateHeartsUI();
    this.updateScoreUI();
    this.updateStreakUI();

    this.loadQuestion(this.currentIndex);
  }

  loadQuestion(index) {
    if (index >= this.questions.length || this.hearts <= 0) {
      this.finishRound();
      return;
    }

    this.isAnsweringLocked = false;
    this.isFrozen = false;
    this.feedbackDrawer.classList.remove('active');

    // Hiệu ứng mượt mà khi đổi thẻ câu hỏi
    if (this.questionCard) {
      this.questionCard.style.animation = 'none';
      void this.questionCard.offsetHeight; // Trigger reflow
      this.questionCard.style.animation = 'cardEntrance 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
    }

    const q = this.questions[index];
    if (!this.sessionVocabs.some(item => item.id === q.id)) {
      this.sessionVocabs.push(q);
    }

    this.progressText.textContent = `Câu ${index + 1}/${this.questions.length}`;

    if (this.gradeBadge) {
      if (this.currentPlayingExam) {
        this.gradeBadge.textContent = '📸 ĐỀ THI GIẤY';
        this.gradeBadge.style.background = 'rgba(16, 185, 129, 0.25)';
        this.gradeBadge.style.color = '#34d399';
        this.gradeBadge.style.borderColor = 'rgba(52, 211, 153, 0.4)';
      } else {
        this.gradeBadge.textContent = q.grade_label || (q.grade ? `Lớp ${q.grade}` : 'TOEIC');
        if (q.category === 'toeic' || q.topic_category === 'toeic' || (q.id && q.id.startsWith('toeic_'))) {
          this.gradeBadge.style.background = 'rgba(245, 158, 11, 0.25)';
          this.gradeBadge.style.color = '#fbbf24';
          this.gradeBadge.style.borderColor = 'rgba(251, 191, 36, 0.4)';
        } else if (q.grade >= 10) {
          this.gradeBadge.style.background = 'rgba(168, 85, 247, 0.25)';
          this.gradeBadge.style.color = '#c084fc';
          this.gradeBadge.style.borderColor = 'rgba(192, 132, 252, 0.4)';
        } else {
          this.gradeBadge.style.background = 'rgba(56, 189, 248, 0.25)';
          this.gradeBadge.style.color = '#38bdf8';
          this.gradeBadge.style.borderColor = 'rgba(56, 189, 248, 0.4)';
        }
      }
    }

    if (this.masteryBadge) {
      const prof = this.getWordProfile(q);
      const masteryConfig = {
        1: { text: 'Lv.1 🌱', bg: 'rgba(16, 185, 129, 0.18)', color: '#34d399' },
        2: { text: 'Lv.2 🌿', bg: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' },
        3: { text: 'Lv.3 🌸', bg: 'rgba(236, 72, 153, 0.2)', color: '#f472b6' },
        4: { text: 'Lv.4 ⭐', bg: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' },
        5: { text: 'Lv.5 💎', bg: 'rgba(168, 85, 247, 0.25)', color: '#c084fc' }
      };
      const mInfo = masteryConfig[prof.masteryLevel] || masteryConfig[1];
      this.masteryBadge.textContent = mInfo.text;
      this.masteryBadge.style.background = mInfo.bg;
      this.masteryBadge.style.color = mInfo.color;
    }

    this.bandBadge.textContent = this.currentPlayingExam ? `EXAM` : `BAND ${q.band || '6.5'}`;
    this.topicBadge.textContent = `🏷️ ${q.topic || 'IELTS Arena'}`;

    const modeLabels = {
      letter_fill: '🔤 Điền chữ cái',
      sentence_scramble: '🧩 Đặt câu thích ứng',
      meaning_match: '🇻🇳 ➔ 🇬🇧 Chọn từ đúng',
      collocation: '🧩 Ghép Collocation',
      word_class: '🏷️ Phân biệt từ loại',
      preposition: '🎯 Chọn giới từ',
      sentence_cloze: '✍️ Điền vào câu',
      listening_choice: '🎧 Luyện nghe phát âm',
      multiple_choice: '📝 Trắc nghiệm đề thi'
    };
    
    if (q.isRecallVariant) {
      this.modeBadge.innerHTML = `🔁 Active Recall`;
      this.modeBadge.style.background = `rgba(236, 72, 153, 0.25)`;
      this.modeBadge.style.color = `#f472b6`;
    } else if (q.mode === 'listening_choice') {
      this.modeBadge.innerHTML = `🎧 IELTS Listening`;
      this.modeBadge.style.background = `rgba(56, 189, 248, 0.25)`;
      this.modeBadge.style.color = `#38bdf8`;
    } else {
      this.modeBadge.textContent = modeLabels[q.mode] || 'IELTS Quiz';
      this.modeBadge.style.background = `var(--bg-pill-glass)`;
      this.modeBadge.style.color = `var(--text-secondary)`;
    }

    // Thời gian làm bài: 25 giây cho Đặt câu, 15 giây cho các dạng trắc nghiệm
    this.maxTimeSeconds = (q.mode === 'sentence_scramble') ? 25.0 : 15.0;

    // Hiển thị hình ảnh minh họa chì (Pencil Art từ repo Danh_English_Tutor)
    if (this.vocabImageContainer && this.vocabImg) {
      const targetKey = (q.target_word || '').trim().toLowerCase();
      const imgUrl = (typeof VOCAB_IMAGES !== 'undefined') ? VOCAB_IMAGES[targetKey] : null;
      if (imgUrl) {
        this.vocabImg.src = imgUrl;
        this.vocabImg.alt = q.target_word || 'Minh họa từ vựng';
        this.vocabImageContainer.style.display = 'flex';
      } else {
        this.vocabImageContainer.style.display = 'none';
        this.vocabImg.src = '';
      }
    }

    if (q.mode === 'listening_choice') {
      if (this.listeningPlayerContainer) {
        this.listeningPlayerContainer.style.display = 'flex';
        this.listeningPlayerContainer.classList.remove('hidden');
      }
      this.promptText.textContent = q.prompt || '🎧 Nghe phát âm và chọn từ vựng bạn vừa nghe:';
      this.letterBoxContainer.style.display = 'none';
      this.questionMainText.innerHTML = `<span class="listening-sound-badge">🔊 Chạm nút loa để nghe lại nếu cần</span>`;
      this.renderAnswerButtons(q);

      // Tự động phát âm ngay khi vào câu hỏi Listening
      setTimeout(() => {
        const word = q.target_word || q.correct_answer || (q.options ? q.options[q.correct] : '');
        if (word && typeof speechEngine !== 'undefined' && typeof speechEngine.speakWord === 'function') {
          speechEngine.speakWord(word);
        }
      }, 250);
    } else {
      if (this.listeningPlayerContainer) {
        this.listeningPlayerContainer.style.display = 'none';
        this.listeningPlayerContainer.classList.add('hidden');
      }

      if (q.mode === 'sentence_scramble') {
        this.promptText.textContent = 'Chạm các thẻ từ bên dưới theo thứ tự để ghép thành câu đúng:';
        this.letterBoxContainer.style.display = 'none';
        this.questionMainText.innerHTML = `<span class="meaning-highlight">“${q.vietnamese}”</span>`;
        this.renderSentenceScramble(q);
      } else if (q.mode === 'letter_fill') {
        const scaffold = this.getScaffoldedConfig(q);
        q._activeMasked = scaffold.masked;
        q._activeMissing = scaffold.missing;
        q._activeStep = scaffold.stepNum;
        q._activeHint = scaffold.hint;

        this.promptText.textContent = scaffold.stepNum >= 4 
          ? 'Nhập toàn bộ các chữ cái để hoàn thành từ vựng:' 
          : 'Chạm các chữ cái bên dưới để hoàn thành từ:';
        this.letterBoxContainer.style.display = 'flex';
        this.questionMainText.innerHTML = `<span class="meaning-highlight">“${q.vietnamese}”</span>`;
        this.renderInteractiveLetterFill(q);
      } else if (q.mode === 'meaning_match') {
        this.promptText.textContent = 'Chọn từ tiếng Anh chính xác mang nghĩa:';
        this.letterBoxContainer.style.display = 'none';
        this.questionMainText.innerHTML = `<span class="meaning-highlight">“${q.vietnamese}”</span>`;
        this.renderAnswerButtons(q);
      } else if (q.sentence) {
        this.promptText.textContent = q.prompt || 'Chọn đáp án học thuật chính xác:';
        this.letterBoxContainer.style.display = 'none';
        const highlightedSentence = q.sentence.replace(/_{2,}/g, '<span class="blank-slot">____</span>');
        this.questionMainText.innerHTML = highlightedSentence;
        this.renderAnswerButtons(q);
      } else {
        this.promptText.textContent = 'Chọn đáp án chính xác:';
        this.letterBoxContainer.style.display = 'none';
        this.questionMainText.innerHTML = q.prompt;
        this.renderAnswerButtons(q);
      }
    }

    // Không hiển thị phiên âm IPA trong lúc làm câu hỏi để tránh làm lộ đáp án (chỉ hiển thị sau khi trả lời ở popup Feedback)
    if (this.phoneticGuide) {
      this.phoneticGuide.textContent = '';
      this.phoneticGuide.style.display = 'none';
    }
    if (this.academicHintPill) {
      if (q.mode === 'listening_choice') {
        this.academicHintPill.innerHTML = `💡 Luyện nghe phản xạ (Audio Recognition)`;
      } else if (q.mode === 'sentence_scramble') {
        const level = this.scrambleAdaptiveLevel || 1;
        const levelLabels = {
          1: '💡 Cấp 1 (Khởi động): Câu cơ bản 4-6 từ',
          2: '💡 Cấp 2 (Tăng tốc): Mở rộng 7-8 từ',
          3: '💡 Cấp 3 (Thử thách): Có từ gây nhiễu',
          4: '💡 Cấp 4 (Master): Cú pháp học thuật cao'
        };
        this.academicHintPill.innerHTML = levelLabels[level] || '💡 Game Đặt Câu Thích Ứng';
      } else if (q.mode === 'letter_fill') {
        if (q._activeHint) {
          this.academicHintPill.innerHTML = q._activeHint;
        } else {
          const missLen = Array.isArray(q._activeMissing || q.missing) ? (q._activeMissing || q.missing).length : 1;
          this.academicHintPill.innerHTML = `💡 Thiếu ${missLen} chữ cái`;
        }
      } else if (q.mode === 'collocation') {
        this.academicHintPill.innerHTML = `💡 Academic Collocation Band 7+`;
      } else if (q.mode === 'word_class') {
        this.academicHintPill.innerHTML = `💡 Ngữ pháp & Dạng từ`;
      } else if (q.mode === 'preposition') {
        this.academicHintPill.innerHTML = `💡 Giới từ phụ thuộc`;
      } else if (q.mode === 'sentence_cloze') {
        this.academicHintPill.innerHTML = `💡 Điền câu ngữ cảnh`;
      } else {
        this.academicHintPill.innerHTML = `💡 Chọn từ đồng nghĩa`;
      }
    }

    this.startTimer();
  }

  // ==========================================================================
  // GAME ĐẶT CÂU THÍCH ỨNG (SENTENCE SCRAMBLE / SENTENCE BUILDER)
  // Adaptive Progression Engine: Tự thích ứng 4 Cấp độ (Khởi động ➔ Master)
  // ==========================================================================
  renderSentenceScramble(q) {
    this.answersContainer.innerHTML = '';

    // Tạo cấu trúc giao diện Game Đặt Câu Thích Ứng
    const wrapper = document.createElement('div');
    wrapper.className = 'scramble-game-wrapper';

    // 1. Khung ghép câu (Sentence Assembly Area)
    const assemblyArea = document.createElement('div');
    assemblyArea.className = 'sentence-assembly-area';
    assemblyArea.id = 'sentence-assembly-area';
    wrapper.appendChild(assemblyArea);

    // 2. Thanh điều khiển thao tác & huy hiệu đếm từ
    const actionsRow = document.createElement('div');
    actionsRow.className = 'scramble-actions-row';

    const counterBadge = document.createElement('div');
    counterBadge.className = 'scramble-counter-badge';
    counterBadge.id = 'scramble-counter-badge';
    actionsRow.appendChild(counterBadge);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'scramble-btn-group';

    const btnUndo = document.createElement('button');
    btnUndo.type = 'button';
    btnUndo.id = 'btn-scramble-undo';
    btnUndo.className = 'scramble-action-btn';
    btnUndo.title = 'Bỏ từ vừa đặt gần nhất';
    btnUndo.innerHTML = `⌫ Xóa từ cuối`;

    const btnClear = document.createElement('button');
    btnClear.type = 'button';
    btnClear.id = 'btn-scramble-clear';
    btnClear.className = 'scramble-action-btn';
    btnClear.title = 'Chuyển toàn bộ từ về khay bên dưới';
    btnClear.innerHTML = `🔄 Làm lại`;

    btnGroup.appendChild(btnUndo);
    btnGroup.appendChild(btnClear);
    actionsRow.appendChild(btnGroup);
    wrapper.appendChild(actionsRow);

    // 3. Khay thẻ từ xáo trộn ở phía dưới (Scramble Chips Grid)
    const chipsGrid = document.createElement('div');
    chipsGrid.className = 'scramble-chips-grid';
    chipsGrid.id = 'scramble-chips-grid';
    wrapper.appendChild(chipsGrid);

    this.answersContainer.appendChild(wrapper);

    // Chuẩn bị danh sách thẻ từ tự thích ứng:
    // Cấp 1, 2: Không có từ nhiễu (0 distractors)
    // Cấp 3: 1 từ nhiễu (nếu câu có distractor)
    // Cấp 4: Tối đa 2 từ nhiễu
    const effectiveLevel = this.scrambleAdaptiveLevel || 1;
    let activeDistractors = [];
    if (effectiveLevel >= 3 && q.distractors && q.distractors.length > 0) {
      const takeCount = (effectiveLevel >= 4) ? 2 : 1;
      activeDistractors = q.distractors.slice(0, takeCount);
    }

    const rawTokens = q.tokens || (q.correct_sentence ? q.correct_sentence.split(' ') : []);
    const chipItems = [
      ...rawTokens.map((text, idx) => ({
        id: `token-${idx}`,
        text: text,
        isDistractor: false,
        correctIdx: idx
      })),
      ...activeDistractors.map((text, idx) => ({
        id: `distractor-${idx}`,
        text: text,
        isDistractor: true,
        correctIdx: -1
      }))
    ];

    // Trộn ngẫu nhiên các thẻ từ (Fisher-Yates)
    const shuffledChips = shuffleArray(chipItems);

    let placedChips = []; // Danh sách các chip đang đặt trên khung câu

    const updateAssemblyUI = () => {
      assemblyArea.innerHTML = '';
      if (placedChips.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'assembly-placeholder';
        placeholder.textContent = 'Chạm các thẻ từ bên dưới để ghép câu theo thứ tự ngữ pháp...';
        assemblyArea.appendChild(placeholder);
      } else {
        placedChips.forEach((chipObj, index) => {
          const chipEl = document.createElement('div');
          chipEl.className = 'placed-chip';
          chipEl.innerHTML = `
            <span class="placed-chip-text">${chipObj.text}</span>
            <span class="placed-chip-remove" title="Bỏ từ này">×</span>
          `;
          chipObj.element = chipEl;

          // Chạm vào từ đã xếp -> hoàn trả lại khay bên dưới
          chipEl.addEventListener('click', () => {
            if (this.isAnsweringLocked) return;
            removePlacedChip(index);
          });
          assemblyArea.appendChild(chipEl);
        });
      }

      counterBadge.innerHTML = `Đã ghép: <strong>${placedChips.length}</strong>/${rawTokens.length} từ`;
    };

    const removePlacedChip = (index) => {
      const removed = placedChips.splice(index, 1)[0];
      if (removed) {
        const gridBtn = chipsGrid.querySelector(`[data-chip-id="${removed.id}"]`);
        if (gridBtn) {
          gridBtn.classList.remove('used');
          gridBtn.disabled = false;
        }
        soundEngine.playTick(false);
        updateAssemblyUI();
      }
    };

    const addChipToAssembly = (chipObj, btnEl) => {
      if (this.isAnsweringLocked) return;
      placedChips.push(chipObj);
      btnEl.classList.add('used');
      btnEl.disabled = true;
      soundEngine.playTick(false);
      updateAssemblyUI();

      // Kiểm tra khi đã đặt đủ số lượng từ yêu cầu
      if (placedChips.length === rawTokens.length) {
        this.evaluateSentenceScramble(q, placedChips, rawTokens, assemblyArea);
      }
    };

    // Render các nút từ vào khay
    shuffledChips.forEach((chip) => {
      const chipBtn = document.createElement('button');
      chipBtn.type = 'button';
      chipBtn.className = 'word-chip';
      chipBtn.dataset.chipId = chip.id;
      chipBtn.textContent = chip.text;
      if (chip.isDistractor) {
        chipBtn.dataset.distractor = 'true';
      }

      // Cấp 1 (Khởi động): Đánh dấu mỏ neo từ đầu câu để học sinh yếu không bị bỡ ngỡ
      if (effectiveLevel === 1 && chip.correctIdx === 0) {
        chipBtn.classList.add('starter-anchor');
        chipBtn.title = 'Gợi ý: Từ bắt đầu câu';
      }

      chipBtn.addEventListener('click', () => {
        addChipToAssembly(chip, chipBtn);
      });

      chipsGrid.appendChild(chipBtn);
    });

    // Thao tác Undo
    btnUndo.addEventListener('click', () => {
      if (this.isAnsweringLocked || placedChips.length === 0) return;
      removePlacedChip(placedChips.length - 1);
    });

    // Thao tác Clear
    btnClear.addEventListener('click', () => {
      if (this.isAnsweringLocked || placedChips.length === 0) return;
      placedChips.forEach(c => {
        const gridBtn = chipsGrid.querySelector(`[data-chip-id="${c.id}"]`);
        if (gridBtn) {
          gridBtn.classList.remove('used');
          gridBtn.disabled = false;
        }
      });
      placedChips = [];
      soundEngine.playTick(false);
      updateAssemblyUI();
    });

    // Hỗ trợ trợ giúp 50:50: tự động ghim từ đúng tiếp theo
    this.autoPlaceNextScrambleWord = () => {
      if (this.isAnsweringLocked) return false;
      const nextIdx = placedChips.length;
      if (nextIdx >= rawTokens.length) return false;
      const expectedText = rawTokens[nextIdx];

      const availableTarget = Array.from(chipsGrid.querySelectorAll('.word-chip:not(.used):not(.eliminated)'))
        .find(btn => btn.textContent.trim() === expectedText);

      if (availableTarget) {
        availableTarget.click();
        return true;
      }
      return false;
    };

    updateAssemblyUI();
  }

  normalizeSentence(str) {
    if (!str) return '';
    return str
      .replace(/[.,?!;:"'‘’“”]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  evaluateSentenceScramble(q, placedChips, rawTokens, assemblyArea) {
    if (this.isAnsweringLocked) return;

    const userSentence = placedChips.map(c => c.text).join(' ');
    const expectedSentence = rawTokens.join(' ');

    const isMatch = (userSentence === expectedSentence) || 
      (this.normalizeSentence(userSentence) === this.normalizeSentence(q.correct_sentence || expectedSentence));

    if (isMatch) {
      this.isAnsweringLocked = true;
      clearInterval(this.timerInterval);

      assemblyArea.classList.remove('wrong-shake');
      assemblyArea.classList.add('correct-state');
      const placedEls = assemblyArea.querySelectorAll('.placed-chip');
      placedEls.forEach(el => el.classList.add('correct-chip'));

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([35]); } catch (e) {}
      }

      const timeTaken = (Date.now() - this.questionStartTime) / 1000;
      this.responseTimes.push(timeTaken);
      const retentionRate = this.updateWordRetention(q.id, true);
      this.updateMemoryProfile(q, true, timeTaken);

      // Thăng cấp tự thích ứng: đúng 2 câu liên tiếp ở cấp độ hiện tại -> Thăng cấp!
      this.scrambleStreak = (this.scrambleStreak || 0) + 1;
      this.scrambleFails = 0;
      if (this.scrambleStreak >= 2 && this.scrambleAdaptiveLevel < 4) {
        this.scrambleAdaptiveLevel = Math.min(4, this.scrambleAdaptiveLevel + 1);
        this.scrambleStreak = 0;
        localStorage.setItem('ielts_scramble_level', this.scrambleAdaptiveLevel);
        const levelNames = {
          2: 'Cấp 2 (Tăng tốc)',
          3: 'Cấp 3 (Thử thách)',
          4: 'Cấp 4 (Master)'
        };
        this.flashDynamicIsland(`🎉 THĂNG HẠNG: ${levelNames[this.scrambleAdaptiveLevel]}!`);
      }

      this.handleCorrectAnswer(timeTaken);
      this.roundResults.push(true);
      this.showFeedbackDrawer(true, q, false, retentionRate);
    } else {
      // Khi xếp sai thứ tự hoặc chọn nhầm từ nhiễu
      q._scrambleMistakes = (q._scrambleMistakes || 0) + 1;

      assemblyArea.classList.remove('wrong-shake');
      void assemblyArea.offsetWidth; // Trigger reflow
      assemblyArea.classList.add('wrong-shake');

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([60, 50, 70]); } catch (e) {}
      }

      // Đánh dấu các từ xếp sai vị trí để gợi ý cho người học
      placedChips.forEach((c, idx) => {
        if (c.element && c.text !== rawTokens[idx]) {
          c.element.classList.add('misplaced');
        }
      });

      // Nếu thử lại lần 2 vẫn chưa đúng: chốt câu sai và hiển thị giải thích
      if (q._scrambleMistakes >= 2) {
        this.isAnsweringLocked = true;
        clearInterval(this.timerInterval);

        assemblyArea.classList.add('wrong-state');
        this.scrambleStreak = 0;
        this.scrambleFails = (this.scrambleFails || 0) + 1;

        // Hạ cấp an toàn cho người học yếu: nếu sai 2 lần ở cấp cao -> giảm 1 cấp để không bị nản
        if (this.scrambleFails >= 2 && this.scrambleAdaptiveLevel > 1) {
          this.scrambleAdaptiveLevel = Math.max(1, this.scrambleAdaptiveLevel - 1);
          this.scrambleFails = 0;
          localStorage.setItem('ielts_scramble_level', this.scrambleAdaptiveLevel);
          this.flashDynamicIsland(`⚡ HỖ TRỢ: ĐIỀU CHỈNH VỀ CẤP ĐỘ ${this.scrambleAdaptiveLevel}`);
        }

        this.handleWrongAnswer(false);
        const timeTaken = (Date.now() - this.questionStartTime) / 1000;
        this.responseTimes.push(timeTaken);
        const retentionRate = this.updateWordRetention(q.id, false);
        this.updateMemoryProfile(q, false, timeTaken);
        this.roundResults.push(false);
        this.showFeedbackDrawer(false, q, false, retentionRate);
      } else {
        // Lần đầu sai: Thông báo hướng dẫn để học sinh tự sửa lỗi mà không bị trừ tim ngay
        this.flashDynamicIsland('⚠️ Chưa đúng vị trí! Chạm vào từ màu cam để điều chỉnh lại.');
      }
    }
  }

  findTileButton(tileId) {
    if (!tileId || !this.answersContainer) return null;
    if (this.answersContainer.querySelector) {
      try {
        const el = this.answersContainer.querySelector(`[data-tile-id="${tileId}"]`);
        if (el) return el;
      } catch (e) {}
    }
    if (this.answersContainer.querySelectorAll) {
      const all = Array.from(this.answersContainer.querySelectorAll('.letter-tile-btn'));
      return all.find(b => (b.dataset && b.dataset.tileId === tileId) || b.id === tileId) || null;
    }
    return null;
  }

  renderInteractiveLetterFill(q) {
    this.answersContainer.innerHTML = '';
    this.letterBoxContainer.innerHTML = '';

    const maskedStr = q._activeMasked || q.masked || '';
    const activeMissing = q._activeMissing || q.missing || [];
    const isMasterStep = (q._activeStep >= 4);
    const chars = maskedStr.split(' ');
    const blankBoxes = [];
    let blankIdx = 0;

    chars.forEach(ch => {
      const box = document.createElement('div');
      if (ch === '_') {
        box.className = 'letter-box blank empty';
        box.textContent = '_';
        if (!box.dataset) box.dataset = {};
        box.dataset.blankIndex = String(blankIdx);
        blankBoxes.push(box);
        blankIdx++;

        box.addEventListener('click', () => {
          if (this.isAnsweringLocked) return;
          if (box.classList.contains('filled')) {
            const tileId = box.dataset.tileId;
            box.textContent = '_';
            box.className = 'letter-box blank empty';
            delete box.dataset.tileId;

            if (tileId && !isMasterStep) {
              const tileBtn = this.findTileButton(tileId);
              if (tileBtn) {
                tileBtn.classList.remove('used');
                tileBtn.disabled = false;
              }
            }
            soundEngine.playTick(false);
          }
        });
      } else {
        box.className = 'letter-box';
        box.textContent = ch;
      }
      this.letterBoxContainer.appendChild(box);
    });

    if (isMasterStep) {
      // Bậc 4 (Thử thách Master): Bàn phím Full Layout QWERTY chuẩn thiết bị
      this.renderFullQWERTYKeyboard(q, blankBoxes);
    } else {
      // Bậc 1, 2, 3: Phím chữ cái rút gọn (Missing letters + Distractors)
      this.renderTileBankKeyboard(q, blankBoxes, activeMissing);
    }
  }

  // Bậc 4: Bàn phím Full Layout QWERTY chuẩn theo thiết bị người dùng (Mobile & Tablet)
  renderFullQWERTYKeyboard(q, blankBoxes) {
    const kbdContainer = document.createElement('div');
    kbdContainer.className = 'full-keyboard-container';

    const row1Chars = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
    const row2Chars = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
    const row3Chars = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

    const handleCharInput = (ch) => {
      if (this.isAnsweringLocked) return;
      const emptySlot = blankBoxes.find(b => b.classList.contains('empty'));
      if (!emptySlot) return;

      emptySlot.textContent = ch;
      emptySlot.classList.remove('empty');
      emptySlot.classList.add('filled');
      soundEngine.playTick(false);

      const allFilled = blankBoxes.every(b => b.classList.contains('filled'));
      if (allFilled) {
        this.evaluateLetterFill(q, blankBoxes);
      }
    };

    const handleBackspace = () => {
      if (this.isAnsweringLocked) return;
      const filledBlanks = blankBoxes.filter(b => b.classList.contains('filled'));
      if (filledBlanks.length === 0) return;
      const lastSlot = filledBlanks[filledBlanks.length - 1];
      lastSlot.textContent = '_';
      lastSlot.className = 'letter-box blank empty';
      soundEngine.playTick(false);
    };

    const handleClear = () => {
      if (this.isAnsweringLocked) return;
      blankBoxes.forEach(b => {
        b.textContent = '_';
        b.className = 'letter-box blank empty';
      });
      soundEngine.playTick(false);
    };

    // Hàng 1 (Q - P: 10 phím)
    const row1 = document.createElement('div');
    row1.className = 'keyboard-row';
    row1Chars.forEach(ch => {
      const keyBtn = document.createElement('button');
      keyBtn.type = 'button';
      keyBtn.className = 'kbd-key';
      keyBtn.textContent = ch;
      keyBtn.dataset.char = ch;
      keyBtn.addEventListener('click', () => handleCharInput(ch));
      row1.appendChild(keyBtn);
    });
    kbdContainer.appendChild(row1);

    // Hàng 2 (A - L: 9 phím kèm 2 spacer hai bên chuẩn thiết bị)
    const row2 = document.createElement('div');
    row2.className = 'keyboard-row';
    const spacerL = document.createElement('div');
    spacerL.className = 'kbd-spacer';
    row2.appendChild(spacerL);

    row2Chars.forEach(ch => {
      const keyBtn = document.createElement('button');
      keyBtn.type = 'button';
      keyBtn.className = 'kbd-key';
      keyBtn.textContent = ch;
      keyBtn.dataset.char = ch;
      keyBtn.addEventListener('click', () => handleCharInput(ch));
      row2.appendChild(keyBtn);
    });

    const spacerR = document.createElement('div');
    spacerR.className = 'kbd-spacer';
    row2.appendChild(spacerR);
    kbdContainer.appendChild(row2);

    // Hàng 3 (Nút Xóa Làm lại + Z-M + Nút Xóa Lùi Backspace)
    const row3 = document.createElement('div');
    row3.className = 'keyboard-row';

    const btnClear = document.createElement('button');
    btnClear.type = 'button';
    btnClear.className = 'kbd-key kbd-action-key kbd-clear';
    btnClear.id = 'btn-letter-clear';
    btnClear.innerHTML = '🔄 Xóa';
    btnClear.title = 'Xóa toàn bộ ký tự đã điền';
    btnClear.addEventListener('click', handleClear);
    row3.appendChild(btnClear);

    row3Chars.forEach(ch => {
      const keyBtn = document.createElement('button');
      keyBtn.type = 'button';
      keyBtn.className = 'kbd-key';
      keyBtn.textContent = ch;
      keyBtn.dataset.char = ch;
      keyBtn.addEventListener('click', () => handleCharInput(ch));
      row3.appendChild(keyBtn);
    });

    const btnBackspace = document.createElement('button');
    btnBackspace.type = 'button';
    btnBackspace.className = 'kbd-key kbd-action-key kbd-backspace';
    btnBackspace.id = 'btn-letter-undo';
    btnBackspace.innerHTML = '⌫';
    btnBackspace.title = 'Xóa ký tự vừa điền';
    btnBackspace.addEventListener('click', handleBackspace);
    row3.appendChild(btnBackspace);

    kbdContainer.appendChild(row3);
    this.answersContainer.appendChild(kbdContainer);
  }

  // Bậc 1, 2, 3: Phím chữ cái rút gọn (Missing + Distractors)
  renderTileBankKeyboard(q, blankBoxes, activeMissing) {
    const missingLetters = (Array.isArray(activeMissing) ? [...activeMissing] : activeMissing.split('')).map(c => c.toUpperCase());
    const candidateDistractors = ['A', 'E', 'I', 'O', 'U', 'R', 'S', 'T', 'L', 'N', 'D', 'C', 'M', 'P', 'B'];
    const neededDistractors = missingLetters.length >= 7 
      ? 2 
      : Math.max(0, 8 - missingLetters.length);
    const filteredDistractors = shuffleArray(candidateDistractors.filter(ch => !missingLetters.includes(ch)));
    const selectedDistractors = filteredDistractors.slice(0, neededDistractors);
    while (selectedDistractors.length < neededDistractors) {
      selectedDistractors.push('E');
    }

    const tileChars = shuffleArray([...missingLetters, ...selectedDistractors]);

    const tilesContainer = document.createElement('div');
    tilesContainer.className = 'letter-tiles-container';

    const tilesGrid = document.createElement('div');
    tilesGrid.className = tileChars.length > 8 ? 'letter-tiles-grid compact-grid' : 'letter-tiles-grid';

    tileChars.forEach((ch, idx) => {
      const tileBtn = document.createElement('button');
      tileBtn.type = 'button';
      tileBtn.className = 'letter-tile-btn';
      tileBtn.textContent = ch;
      if (!tileBtn.dataset) tileBtn.dataset = {};
      tileBtn.dataset.tileId = `tile-${idx}`;
      tileBtn.dataset.char = ch;

      tileBtn.addEventListener('click', () => {
        if (this.isAnsweringLocked) return;

        let activeTile = tileBtn;
        if (activeTile.classList.contains('used')) {
          const allTiles = Array.from(tilesGrid.querySelectorAll('.letter-tile-btn'));
          const sibling = allTiles.find(t => t.dataset && t.dataset.char === ch && !t.classList.contains('used') && !t.disabled && !t.classList.contains('eliminated'));
          if (sibling) {
            activeTile = sibling;
          } else {
            return;
          }
        }

        const emptySlot = blankBoxes.find(b => b.classList.contains('empty'));
        if (!emptySlot) return;

        emptySlot.textContent = ch;
        emptySlot.classList.remove('empty');
        emptySlot.classList.add('filled');
        emptySlot.dataset.tileId = activeTile.dataset.tileId;

        activeTile.classList.add('used');
        soundEngine.playTick(false);

        const allFilled = blankBoxes.every(b => b.classList.contains('filled'));
        if (allFilled) {
          this.evaluateLetterFill(q, blankBoxes);
        }
      });

      tilesGrid.appendChild(tileBtn);
    });

    tilesContainer.appendChild(tilesGrid);

    // 2 Nút thao tác nhanh: Xóa ký tự (Undo) & Làm lại (Clear)
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'letter-fill-actions';

    const btnUndo = document.createElement('button');
    btnUndo.type = 'button';
    btnUndo.className = 'letter-action-btn';
    btnUndo.id = 'btn-letter-undo';
    btnUndo.innerHTML = '⌫ Xóa ký tự';
    btnUndo.addEventListener('click', () => {
      if (this.isAnsweringLocked) return;
      const filledBlanks = blankBoxes.filter(b => b.classList.contains('filled'));
      if (filledBlanks.length === 0) return;
      const lastSlot = filledBlanks[filledBlanks.length - 1];
      const tileId = lastSlot.dataset.tileId;
      lastSlot.textContent = '_';
      lastSlot.className = 'letter-box blank empty';
      delete lastSlot.dataset.tileId;

      if (tileId) {
        const tileBtn = this.findTileButton(tileId);
        if (tileBtn) {
          tileBtn.classList.remove('used');
          tileBtn.disabled = false;
        }
      }
      soundEngine.playTick(false);
    });

    const btnClear = document.createElement('button');
    btnClear.type = 'button';
    btnClear.className = 'letter-action-btn';
    btnClear.id = 'btn-letter-clear';
    btnClear.innerHTML = '🔄 Làm lại';
    btnClear.addEventListener('click', () => {
      if (this.isAnsweringLocked) return;
      blankBoxes.forEach(b => {
        if (b.classList.contains('filled')) {
          const tileId = b.dataset.tileId;
          b.textContent = '_';
          b.className = 'letter-box blank empty';
          delete b.dataset.tileId;
          if (tileId) {
            const tileBtn = this.findTileButton(tileId);
            if (tileBtn) {
              tileBtn.classList.remove('used');
              tileBtn.disabled = false;
            }
          }
        }
      });
      soundEngine.playTick(false);
    });

    actionsDiv.appendChild(btnUndo);
    actionsDiv.appendChild(btnClear);
    tilesContainer.appendChild(actionsDiv);

    this.answersContainer.appendChild(tilesContainer);
  }

  evaluateLetterFill(q, blankBoxes) {
    const activeMissing = q._activeMissing || q.missing || [];
    const filledChars = blankBoxes.map(b => b.textContent.trim().toUpperCase());
    const missingChars = (Array.isArray(activeMissing) ? activeMissing : activeMissing.split('')).map(m => m.trim().toUpperCase());

    const filledStr = filledChars.join('');
    const missingStr = missingChars.join('');

    // Toàn bộ từ hoàn chỉnh ghép được từ tất cả các ô trong container (cố định + ô trống)
    const allLetterBoxes = this.letterBoxContainer ? Array.from(this.letterBoxContainer.querySelectorAll('.letter-box')) : [];
    const assembledWord = allLetterBoxes.map(b => b.textContent.trim().toUpperCase()).join('');
    const targetWord = (q.target_word || q.correct_answer || '').trim().toUpperCase();

    // Kiểm tra độ trùng khớp toàn diện chống false negative:
    // 1. Khớp chính xác ký tự thiếu
    // 2. Khớp sau khi loại bỏ dấu tiếng Việt (tránh lỗi bộ gõ Telex / VNI tự thêm dấu)
    // 3. Khớp tương đương chính tả UK/US (counsellor/counselor, recognise/recognize,...)
    // 4. Khớp toàn bộ từ hoàn chỉnh (assembledWord) so với targetWord
    const isDirectMatch = (filledStr === missingStr);
    const isDiacriticMatch = (stripDiacritics(filledStr) === stripDiacritics(missingStr));
    const isEquivMissing = areEquivalentSpellings(filledStr, missingStr);
    const isFullWordMatch = assembledWord && targetWord && (
      assembledWord === targetWord ||
      stripDiacritics(assembledWord) === stripDiacritics(targetWord) ||
      areEquivalentSpellings(assembledWord, targetWord)
    );

    const isCorrect = isDirectMatch || isDiacriticMatch || isEquivMissing || isFullWordMatch;

    if (isCorrect) {
      this.isAnsweringLocked = true;
      clearInterval(this.timerInterval);
      blankBoxes.forEach(b => {
        b.classList.remove('wrong-word');
        b.classList.add('correct-word');
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([35]); } catch (e) {}
      }

      const timeTaken = (Date.now() - this.questionStartTime) / 1000;
      this.responseTimes.push(timeTaken);
      const retentionRate = this.updateWordRetention(q.id, true);
      const prof = this.updateMemoryProfile(q, true, timeTaken);
      if (prof) {
        prof.spellingStep = Math.min(4, (prof.spellingStep || 1) + 1);
        this.saveMemoryProfiles();
      }
      this.handleCorrectAnswer(timeTaken);
      this.roundResults.push(true);
      this.showFeedbackDrawer(true, q, false, retentionRate);
    } else {
      this.isAnsweringLocked = true;
      clearInterval(this.timerInterval);
      blankBoxes.forEach(b => b.classList.add('wrong-word'));

      // Hiển thị ký tự đúng để học sinh nhận diện từ đúng
      const missingLetters = Array.isArray(activeMissing) ? activeMissing : activeMissing.split('');
      blankBoxes.forEach((b, i) => {
        b.textContent = missingLetters[i] || '_';
        b.classList.remove('empty');
        b.classList.add('filled', 'wrong-word');
      });

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([60, 50, 70]); } catch (e) {}
      }
      this.handleWrongAnswer(false);
      const timeTaken = (Date.now() - this.questionStartTime) / 1000;
      this.responseTimes.push(timeTaken);
      const retentionRate = this.updateWordRetention(q.id, false);
      const prof = this.updateMemoryProfile(q, false, timeTaken);
      if (prof) {
        prof.spellingStep = Math.max(1, (prof.spellingStep || 1) - 1);
        this.saveMemoryProfiles();
      }
      this.roundResults.push(false);

      // Với câu sai: Hiện feedback drawer giải thích và đợi học sinh bấm nút "Tiếp tục"
      this.showFeedbackDrawer(false, q, false, retentionRate);
    }
  }

  renderLetterBoxes(maskedStr) {
    this.letterBoxContainer.innerHTML = '';
    const chars = maskedStr.split(' ');
    chars.forEach(ch => {
      const box = document.createElement('div');
      box.className = `letter-box ${ch === '_' ? 'blank' : ''}`;
      box.textContent = ch === '_' ? '_' : ch;
      this.letterBoxContainer.appendChild(box);
    });
  }

  renderAnswerButtons(q) {
    this.answersContainer.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];

    q.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn-tactile';
      btn.innerHTML = `<span class="btn-badge">${letters[idx]}</span> <span class="btn-label">${optText}</span>`;
      btn.addEventListener('click', () => this.handleAnswerSelect(idx, btn));
      this.answersContainer.appendChild(btn);
    });
  }

  // Đếm ngược với bước nhảy 50ms siêu mượt
  startTimer() {
    clearInterval(this.timerInterval);
    this.remainingTime = this.maxTimeSeconds;
    this.questionStartTime = Date.now();
    this.timerBar.classList.remove('urgent');
    if (this.countdownDigitalBox) this.countdownDigitalBox.classList.remove('urgent');

    // Theo dõi giây nguyên để phát âm thanh tích tắc êm ái từng giây, tránh phát 20 lần/giây
    let lastTickSecond = Math.ceil(this.remainingTime);

    const updateTimer = () => {
      if (this.isFrozen || this.isAnsweringLocked) return;

      this.remainingTime -= this.timeStepMs / 1000;
      const progressPercent = Math.max(0, (this.remainingTime / this.maxTimeSeconds) * 100);
      this.timerBar.style.width = `${progressPercent}%`;

      // Cập nhật số giây thời gian thực (ví dụ: 14.8s)
      if (this.timerSecondsEl) {
        this.timerSecondsEl.textContent = `${Math.max(0, this.remainingTime).toFixed(1)}s`;
      }

      const currentSec = Math.ceil(this.remainingTime);

      // Khi còn dưới 3.0 giây: Báo động đỏ và nhịp tích tắc êm ái
      if (this.remainingTime <= 3.0) {
        this.timerBar.classList.add('urgent');
        if (this.countdownDigitalBox) this.countdownDigitalBox.classList.add('urgent');
        if (currentSec !== lastTickSecond && currentSec > 0) {
          lastTickSecond = currentSec;
          soundEngine.playTick(true);
        }
      } else {
        // Nhịp đếm nhẹ nhàng từng giây một
        if (currentSec !== lastTickSecond && currentSec > 0) {
          lastTickSecond = currentSec;
          soundEngine.playTick(false);
        }
      }

      if (this.remainingTime <= 0) {
        clearInterval(this.timerInterval);
        this.handleTimeout();
      }
    };

    this.timerInterval = setInterval(updateTimer, this.timeStepMs);
  }

  sparkleCelebration(target) {
    // Disabled per user request (replaced by vibration + green/red border animation)
  }

  handleAnswerSelect(selectedIndex, selectedBtn) {
    if (this.isAnsweringLocked) return;
    this.isAnsweringLocked = true;
    clearInterval(this.timerInterval);

    const q = this.questions[this.currentIndex];
    const selectedText = (q.options && q.options[selectedIndex]) ? String(q.options[selectedIndex]).trim() : '';
    const targetAnswer = (q.correct_answer || (q.options ? q.options[q.correct] : '') || '').trim();

    let isCorrect = selectedIndex === q.correct;
    // Kiểm tra tương đương nếu vị trí index bị lệch hoặc khác biệt ngữ pháp/chính tả nhỏ
    if (!isCorrect && selectedText && targetAnswer) {
      if (selectedText.toLowerCase() === targetAnswer.toLowerCase() ||
          stripDiacritics(selectedText).toLowerCase() === stripDiacritics(targetAnswer).toLowerCase() ||
          areEquivalentSpellings(selectedText, targetAnswer)) {
        isCorrect = true;
      }
    }
    const timeTaken = (Date.now() - this.questionStartTime) / 1000;
    this.responseTimes.push(timeTaken);

    // Hỗ trợ hiển thị trực quan cho dạng Letter Fill khi gọi trực tiếp từ test/phím
    if (q.mode === 'letter_fill' && q.missing && this.letterBoxContainer && this.letterBoxContainer.querySelectorAll) {
      const blanks = this.letterBoxContainer.querySelectorAll('.letter-box.blank');
      const missingLetters = Array.isArray(q.missing) ? q.missing : q.missing.split('');
      if (blanks && blanks.forEach) {
        blanks.forEach((b, i) => {
          b.textContent = missingLetters[i] || '_';
          if (b.classList && b.classList.add) {
            b.classList.add('filled');
            b.classList.add(isCorrect ? 'correct-word' : 'wrong-word');
          }
        });
      }
    }

    const allButtons = this.answersContainer.querySelectorAll ? this.answersContainer.querySelectorAll('.btn-tactile') : [];
    const retentionRate = this.updateWordRetention(q.id, isCorrect);
    this.updateMemoryProfile(q, isCorrect, timeTaken);

    if (isCorrect) {
      if (selectedBtn && selectedBtn.classList && selectedBtn.classList.add) selectedBtn.classList.add('correct');
      const badge = selectedBtn && selectedBtn.querySelector ? selectedBtn.querySelector('.btn-badge') : null;
      if (badge) badge.textContent = '✓';
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([35]); } catch (e) {}
      }
      this.handleCorrectAnswer(timeTaken);
    } else {
      if (selectedBtn && selectedBtn.classList && selectedBtn.classList.add) selectedBtn.classList.add('wrong');
      const wrongBadge = selectedBtn && selectedBtn.querySelector ? selectedBtn.querySelector('.btn-badge') : null;
      if (wrongBadge) wrongBadge.textContent = '✕';
      if (allButtons[q.correct] && allButtons[q.correct].classList && allButtons[q.correct].classList.add) {
        allButtons[q.correct].classList.add('correct');
        const correctBadge = allButtons[q.correct].querySelector ? allButtons[q.correct].querySelector('.btn-badge') : null;
        if (correctBadge) correctBadge.textContent = '✓';
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([60, 50, 70]); } catch (e) {}
      }
      this.handleWrongAnswer();
    }

    this.roundResults.push(isCorrect);
    this.showFeedbackDrawer(isCorrect, q, false, retentionRate);
  }

  handleTimeout() {
    if (this.isAnsweringLocked) return;
    this.isAnsweringLocked = true;

    const q = this.questions[this.currentIndex];
    this.responseTimes.push(this.maxTimeSeconds);
    this.roundResults.push(false);

    const activeMissing = q._activeMissing || q.missing;
    if (q.mode === 'letter_fill' && activeMissing && this.letterBoxContainer && this.letterBoxContainer.querySelectorAll) {
      const blanks = this.letterBoxContainer.querySelectorAll('.letter-box.blank');
      const missingLetters = Array.isArray(activeMissing) ? activeMissing : activeMissing.split('');
      if (blanks && blanks.forEach) {
        blanks.forEach((b, i) => {
          b.textContent = missingLetters[i] || '_';
          if (b.classList && b.classList.add) {
            b.classList.add('filled');
            b.classList.add('wrong-word');
          }
        });
      }
      const tileBtns = this.answersContainer.querySelectorAll ? this.answersContainer.querySelectorAll('.letter-tile-btn') : [];
      if (tileBtns && tileBtns.forEach) tileBtns.forEach(btn => { btn.disabled = true; });
    } else if (q.mode === 'sentence_scramble') {
      const assembly = this.answersContainer ? this.answersContainer.querySelector('.sentence-assembly-area') : null;
      if (assembly) assembly.classList.add('wrong-state');
    } else {
      const allButtons = this.answersContainer.querySelectorAll ? this.answersContainer.querySelectorAll('.btn-tactile') : [];
      if (allButtons[q.correct] && allButtons[q.correct].classList && allButtons[q.correct].classList.add) {
        allButtons[q.correct].classList.add('correct');
      }
    }

    const retentionRate = this.updateWordRetention(q.id, false);
    const prof = this.updateMemoryProfile(q, false, this.maxTimeSeconds);
    if (prof && q.mode === 'letter_fill') {
      prof.spellingStep = Math.max(1, (prof.spellingStep || 1) - 1);
      this.saveMemoryProfiles();
    }
    this.handleWrongAnswer(true);

    this.showFeedbackDrawer(false, q, true, retentionRate);
  }

  handleCorrectAnswer(timeTaken) {
    this.streak++;
    if (this.streak > this.maxStreak) {
      this.maxStreak = this.streak;
    }

    // Cơ chế hồi tim: 4 câu đúng liên tiếp hồi 1 tim
    this.consecutiveForHeartRecovery++;
    if (this.consecutiveForHeartRecovery >= 4 && this.hearts < this.maxHearts) {
      this.hearts++;
      this.consecutiveForHeartRecovery = 0;
      this.updateHeartsUI();
      this.flashDynamicIsland('💚 +1 EXTRA LIFE!');
    }

    // Time-Decay scoring cho thang 15 GIÂY (hoặc 25 GIÂY)
    const timeDecayFactor = Math.max(0.5, 1 - (timeTaken / (2 * this.maxTimeSeconds)));
    let multiplier = 1.0;

    if (this.streak >= 8) {
      multiplier = 2.0; // FEVER MODE
    } else if (this.streak >= 5) {
      multiplier = 1.5;
    } else if (this.streak >= 3) {
      multiplier = 1.2;
    }

    const earnedXP = Math.round(1000 * timeDecayFactor * multiplier);
    this.score += earnedXP;

    soundEngine.playCorrect(this.streak);

    // PHÁT ÂM CHUẨN TỪ VỰNG HOẶC CÂU HOÀN CHỈNH KHI CHỌN ĐÚNG (TONE TRUNG - CAO, RÕ RÀNG)
    const q = this.questions[this.currentIndex];
    const wordToSpeak = q.correct_sentence || q.target_word || (q.options && q.options[q.correct]);
    setTimeout(() => {
      if (typeof speechEngine !== 'undefined') {
        speechEngine.speakWord(wordToSpeak);
      }
    }, 180);

    if (this.streak === 8) {
      soundEngine.playFever();
      this.flashDynamicIsland('⚡ FEVER MODE x2.0!');
    } else if (this.streak >= 3) {
      this.flashDynamicIsland(`🔥 STREAK x${this.streak}! (+${earnedXP} XP)`);
    }

    this.updateScoreUI();
    this.updateStreakUI();
  }

  handleWrongAnswer(isTimeout = false) {
    this.streak = 0;
    this.consecutiveForHeartRecovery = 0;
    this.hearts = Math.max(0, this.hearts - 1);
    
    soundEngine.playWrong();
    this.updateHeartsUI();
    this.updateStreakUI();

    const q = this.questions[this.currentIndex];
    if (q) {
      if (!this.weakWordIds.includes(q.id)) {
        this.weakWordIds.push(q.id);
        this.saveWeakWords();
      }
      this.injectRecallVariant(q);
    }

    if (isTimeout) {
      this.flashDynamicIsland('⏰ TIME OUT! -1 HEART');
    } else {
      this.flashDynamicIsland('💔 OOPS! -1 HEART');
    }
  }

  injectRecallVariant(wrongQ) {
    if (!wrongQ || wrongQ.isRecallVariant) return;
    const pool = this.getFilteredBank();
    const otherWords = pool
      .filter(x => x.target_word && x.target_word !== wrongQ.target_word)
      .map(x => x.target_word);
    const distractors = shuffleArray(otherWords).slice(0, 3);
    const options = shuffleArray([wrongQ.target_word, ...distractors]);
    const recallVariant = {
      ...wrongQ,
      id: `${wrongQ.id}_recall_${Date.now()}`,
      isRecallVariant: true,
      mode: 'meaning_match',
      prompt: `[ÔN TẬP GỢI NHỚ] Chọn từ tiếng Anh mang nghĩa: "${wrongQ.vietnamese}"`,
      options: options,
      correct: options.indexOf(wrongQ.target_word)
    };
    const insertIdx = Math.min(this.questions.length, this.currentIndex + 3);
    this.questions.splice(insertIdx, 0, recallVariant);
  }

  showFeedbackDrawer(isCorrect, q, isTimeout = false, retentionRate = 25) {
    this.feedbackDrawer.className = `feedback-drawer active ${isCorrect ? 'correct-state' : 'wrong-state'}`;
    
    if (isCorrect) {
      this.feedbackTitle.innerHTML = `<span style="color:var(--color-success)">✓ CHÍNH XÁC!</span> <span style="font-size:0.75rem; background:rgba(16,185,129,0.15); color:var(--color-success); padding:3px 10px; border-radius:8px; font-weight:800;">🧠 Độ nhớ: ${retentionRate}%</span>`;
    } else if (isTimeout) {
      this.feedbackTitle.innerHTML = `<span style="color:var(--color-danger)">⏰ HẾT GIỜ!</span> <span style="font-size:0.75rem; background:rgba(239,68,68,0.15); color:var(--color-danger); padding:3px 10px; border-radius:8px; font-weight:800;">🧠 Độ nhớ: ${retentionRate}%</span>`;
    } else {
      this.feedbackTitle.innerHTML = `<span style="color:var(--color-danger)">✕ CHƯA ĐÚNG!</span> <span style="font-size:0.75rem; background:rgba(239,68,68,0.15); color:var(--color-danger); padding:3px 10px; border-radius:8px; font-weight:800;">🧠 Độ nhớ: ${retentionRate}%</span>`;
    }

    if (q.mode === 'sentence_scramble') {
      this.feedbackVietnamese.innerHTML = `
        <div class="feedback-word-info">
          <span class="feedback-vn-text" style="font-size:0.92rem; margin-bottom:4px;">${q.vietnamese}</span>
          <span class="feedback-sentence-correct">“${q.correct_sentence}”</span>
        </div>
        <button class="btn-audio-replay" id="btn-audio-replay" title="Nghe lại phát âm chuẩn" aria-label="Nghe lại phát âm chuẩn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fill-opacity="0.25"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        </button>
      `;
    } else {
      this.feedbackVietnamese.innerHTML = `
        <div class="feedback-word-info">
          <span class="feedback-vn-text">${q.vietnamese}</span>
          ${q.phonetic ? `<span class="feedback-phonetic-badge">${q.phonetic}</span>` : ''}
        </div>
        <button class="btn-audio-replay" id="btn-audio-replay" title="Nghe lại phát âm chuẩn" aria-label="Nghe lại phát âm chuẩn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fill-opacity="0.25"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        </button>
      `;
    }

    const replayBtn = document.getElementById('btn-audio-replay');
    if (replayBtn) {
      replayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        replayBtn.classList.add('playing');
        setTimeout(() => replayBtn.classList.remove('playing'), 900);
        const textToSpeak = q.correct_sentence || q.target_word || (q.options && q.options[q.correct]) || '';
        if (typeof speechEngine !== 'undefined') speechEngine.speakWord(textToSpeak);
      });
    }

    if (this.feedbackExplanation) {
      this.feedbackExplanation.textContent = q.explanation || '';
    }

    if (this.examTaskLabel) {
      this.examTaskLabel.textContent = q.exam_task || 'Writing Task 2';
    }
    if (this.examSentenceQuote) {
      this.examSentenceQuote.textContent = q.real_exam_sentence ? `"${q.real_exam_sentence}"` : '';
    }
    if (this.commonMistakeText) {
      this.commonMistakeText.textContent = q.common_mistake ? `💡 ${q.common_mistake}` : '';
    }

    clearTimeout(this.autoAdvanceTimer);
    this.autoAdvanceTimer = null;
    this.updateAutoNextUI();

    // CHỈ tự động chuyển sang câu tiếp theo khi học sinh trả lời ĐÚNG và Auto Next đang BẬT (sau 1.8s).
    // Với câu trả lời SAI hoặc HẾT GIỜ, hoặc khi người dùng TẮT Auto Next: TUYỆT ĐỐI KHÔNG tự động đổi câu.
    // Giữ nguyên giao diện để học sinh xem kỹ giải thích, CHỈ đổi câu khi học sinh bấm nút "Tiếp tục".
    if (this.isAutoNextEnabled && isCorrect && this.hearts > 0 && this.currentIndex < this.questions.length - 1) {
      this.autoAdvanceTimer = setTimeout(() => {
        if (this.feedbackDrawer && this.feedbackDrawer.classList.contains('active')) {
          this.nextQuestion();
        }
      }, 1800);
    }
  }

  nextQuestion() {
    clearTimeout(this.autoAdvanceTimer);
    this.currentIndex++;
    if (this.currentIndex >= this.questions.length || this.hearts <= 0) {
      this.finishRound();
    } else {
      this.loadQuestion(this.currentIndex);
    }
  }

  useFiftyFifty() {
    if (!this.powerups.fiftyFifty || this.isAnsweringLocked) return;
    this.powerups.fiftyFifty = false;
    this.updatePowerupButtons();
    soundEngine.playPowerup();

    const q = this.questions[this.currentIndex];

    if (q.mode === 'sentence_scramble') {
      // 1. Nếu có distractor trong khay từ: loại bỏ ngay từ gây nhiễu
      const distractorChips = Array.from(this.answersContainer.querySelectorAll('.word-chip[data-distractor="true"]:not(.used):not(.eliminated)'));
      if (distractorChips.length > 0) {
        distractorChips.forEach(chip => {
          chip.classList.add('eliminated');
          chip.disabled = true;
        });
        this.flashDynamicIsland('⚡ 50:50 ĐÃ LOẠI TỪ GÂY NHIỄU!');
        return;
      }

      // 2. Nếu không có distractor: Tự động ghim từ đúng kế tiếp vào khung câu
      if (typeof this.autoPlaceNextScrambleWord === 'function') {
        const placed = this.autoPlaceNextScrambleWord();
        if (placed) {
          this.flashDynamicIsland('⚡ 50:50 ĐÃ ĐIỀN TỪ KẾ TIẾP!');
          return;
        }
      }
    }

    if (q.mode === 'letter_fill') {
      const activeMissing = q._activeMissing || q.missing;
      const missingLetters = (Array.isArray(activeMissing) ? activeMissing : activeMissing.split('')).map(m => m.toUpperCase());

      // Hỗ trợ loại trừ cho Bậc 4 (Bàn phím Full QWERTY)
      const kbdBtns = this.answersContainer.querySelectorAll 
        ? Array.from(this.answersContainer.querySelectorAll('.kbd-key[data-char]'))
        : [];
      if (kbdBtns.length > 0) {
        const distractorKeys = kbdBtns.filter(btn => {
          const ch = btn.dataset && btn.dataset.char;
          return !missingLetters.includes(ch) && !btn.classList.contains('eliminated');
        });
        const toEliminate = shuffleArray(distractorKeys).slice(0, 4);
        toEliminate.forEach(tile => {
          tile.classList.add('eliminated');
          tile.disabled = true;
        });
        this.flashDynamicIsland('⚡ 50:50 ĐÃ LOẠI 4 KÝ TỰ SAI');
        return;
      }

      // Hỗ trợ loại trừ cho Bậc 1-3 (Tile bank)
      const tileBtns = this.answersContainer.querySelectorAll 
        ? Array.from(this.answersContainer.querySelectorAll('.letter-tile-btn'))
        : [];
      const distractorTiles = tileBtns.filter(btn => {
        const ch = (btn.dataset && btn.dataset.char) || btn.textContent.trim();
        return !missingLetters.includes(ch) && (!btn.classList || !btn.classList.contains('used'));
      });
      const toEliminate = shuffleArray(distractorTiles).slice(0, 2);
      toEliminate.forEach(tile => {
        if (tile.classList && tile.classList.add) tile.classList.add('eliminated');
        tile.disabled = true;
      });
      this.flashDynamicIsland('⚡ 50:50 ĐÃ LOẠI 2 KÝ TỰ SAI');
      return;
    }

    const wrongIndices = [0, 1, 2, 3].filter(idx => idx !== q.correct);
    const shuffledWrong = shuffleArray(wrongIndices).slice(0, 2);

    const allButtons = this.answersContainer.querySelectorAll ? this.answersContainer.querySelectorAll('.btn-tactile') : [];
    shuffledWrong.forEach(idx => {
      if (allButtons[idx] && allButtons[idx].classList && allButtons[idx].classList.add) {
        allButtons[idx].classList.add('eliminated');
      }
    });

    this.flashDynamicIsland('⚡ 50:50 ĐÃ LOẠI 2 ĐÁP ÁN SAI');
  }

  useFreeze() {
    if (!this.powerups.freeze || this.isAnsweringLocked || this.isFrozen) return;
    this.powerups.freeze = false;
    this.isFrozen = true;
    this.updatePowerupButtons();
    soundEngine.playPowerup();

    this.flashDynamicIsland('❄️ ĐÓNG BĂNG THỜI GIAN (+3S)');
    setTimeout(() => {
      this.isFrozen = false;
    }, 3000);
  }

  useHint() {
    if (!this.powerups.hint || this.isAnsweringLocked) return;
    this.powerups.hint = false;
    this.updatePowerupButtons();
    soundEngine.playPowerup();

    const q = this.questions[this.currentIndex];
    this.flashDynamicIsland(`💡 GỢI Ý: ${q.vietnamese.slice(0, 32)}...`);
  }

  updatePowerupButtons() {
    if (this.btnFiftyFifty) this.btnFiftyFifty.disabled = !this.powerups.fiftyFifty;
    if (this.btnFreeze) this.btnFreeze.disabled = !this.powerups.freeze;
    if (this.btnHint) this.btnHint.disabled = !this.powerups.hint;
  }

  updateHeartsUI() {
    if (!this.heartsContainer) return;
    const heartWrappers = this.heartsContainer.querySelectorAll('.heart-wrapper');
    heartWrappers.forEach((wrapper, idx) => {
      if (idx < this.hearts) {
        wrapper.classList.remove('lost');
      } else {
        wrapper.classList.add('lost');
      }
    });
  }

  updateScoreUI() {
    if (this.scoreEl) this.scoreEl.textContent = `${this.score.toLocaleString()} XP`;
  }

  updateStreakUI() {
    const screenContent = document.getElementById('screen-content');
    if (!this.streakPill || !this.streakText) return;

    if (this.streak >= 8) {
      this.streakPill.className = 'streak-pill fever';
      this.streakText.textContent = `FEVER x2.0 🔥`;
      if (screenContent) screenContent.classList.add('fever-active');
    } else if (this.streak >= 5) {
      this.streakPill.className = 'streak-pill fever';
      this.streakText.textContent = `STREAK x1.5 🔥`;
      if (screenContent) screenContent.classList.add('fever-active');
    } else if (this.streak >= 3) {
      this.streakPill.className = 'streak-pill';
      this.streakText.textContent = `STREAK x1.2 🔥`;
      if (screenContent) screenContent.classList.remove('fever-active');
    } else {
      this.streakPill.className = 'streak-pill';
      this.streakText.textContent = `${this.streak} COMBO`;
      if (screenContent) screenContent.classList.remove('fever-active');
    }
  }

  flashDynamicIsland(msg, options = {}) {
    // Dynamic Island drop animation disabled per user request
    if (!this.islandEl) return;
    if (this.islandMsg) this.islandMsg.textContent = msg;
  }

  retractDynamicIsland() {
    // Dynamic Island drop animation disabled per user request
  }

  finishRound() {
    clearInterval(this.timerInterval);
    if (this.feedbackDrawer) this.feedbackDrawer.classList.remove('active');
    soundEngine.playVictory();

    const totalAnswered = this.roundResults.length;
    const correctCount = this.roundResults.filter(Boolean).length;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    
    const avgTime = this.responseTimes.length > 0 
      ? (this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length).toFixed(1) 
      : '0.0';

    let bandTitle = "IELTS 5.5 Novice";
    let praiseText = "🌱 Hãy kiên trì! Mỗi vòng đấu đều giúp tăng độ bền trí nhớ";
    let trophyIcon = "🌱";

    if (accuracy >= 90) {
      bandTitle = "🏆 IELTS 7.5+ Speed Demon";
      praiseText = "🌟 Phong độ đỉnh cao! Phản xạ xuất sắc & chuẩn xác tuyệt đối";
      trophyIcon = "🏆";
    } else if (accuracy >= 75) {
      bandTitle = "⚡ IELTS 7.0 Master";
      praiseText = "⚡ Rất tốt! Bạn làm chủ từ vựng và ngữ pháp vững vàng";
      trophyIcon = "🥇";
    } else if (accuracy >= 60) {
      bandTitle = "🎯 IELTS 6.5 Competent";
      praiseText = "🎯 Hoàn thành tốt! Hãy ôn lại các từ chưa vững trong Sổ tay";
      trophyIcon = "🎯";
    } else {
      bandTitle = "📚 IELTS 5.5 - 6.0 Achiever";
      praiseText = "🌱 Cố lên! Ôn tập đều đặn sẽ giúp phản xạ bứt phá nhanh chóng";
      trophyIcon = "📚";
    }

    if (this.finalScoreEl) this.finalScoreEl.textContent = `${this.score.toLocaleString()} XP`;
    if (this.maxStreakEl) this.maxStreakEl.textContent = `${this.maxStreak}`;
    if (this.avgTimeEl) this.avgTimeEl.textContent = `${avgTime}s`;
    if (this.accuracyEl) this.accuracyEl.textContent = `${accuracy}% (${correctCount}/${totalAnswered})`;
    if (this.bandGradeEl) this.bandGradeEl.textContent = bandTitle;
    if (this.victoryPraiseEl) this.victoryPraiseEl.textContent = praiseText;
    if (this.victoryTrophyEl) this.victoryTrophyEl.textContent = trophyIcon;

    const emojiBlocks = this.roundResults.map(res => res ? '🟩' : '🟥').join('');
    this.generatedEmojiGrid = 
`🎓 IELTS 9.0 Arena 🎓
🏆 Score: ${this.score.toLocaleString()} XP | Grade: ${bandTitle}
🔥 Max Streak: ${this.maxStreak} | ⏱️ Avg Time: ${avgTime}s
${emojiBlocks}
🎯 Luyện phản xạ từ vựng IELTS 9.0`;

    if (this.wordleGridEl) this.wordleGridEl.textContent = emojiBlocks;
    if (this.modalOverlay) this.modalOverlay.classList.add('active');
    this.saveUserRoundResult(this.score, correctCount, totalAnswered, avgTime, bandTitle);
    this.launchConfetti();
  }

  openVault() {
    if (!this.vaultList) return;
    this.vaultList.innerHTML = '';

    this.sessionVocabs.forEach(v => {
      const card = document.createElement('div');
      card.className = 'vault-item-card';
      const ret = this.getWordRetention(v.id);
      const word = v.target_word || v.masked || v.options[v.correct];
      const gradeText = v.grade_label || (v.grade ? `Lớp ${v.grade}` : 'IELTS');

      card.innerHTML = `
        <div class="vault-item-top">
          <span class="vault-word-title">
            ${word} 
            <span style="font-size:0.8rem; color:var(--text-muted);">${v.phonetic || ''}</span>
            <button class="btn-vault-speak" title="Phát âm từ vựng">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            </button>
          </span>
          <div style="display:flex; gap:6px; align-items:center;">
            <span class="vault-grade-pill">${gradeText}</span>
            <span class="vault-band-pill">Band ${v.band}</span>
            <span class="vault-retention-pill">🧠 ${ret}%</span>
          </div>
        </div>
        <div class="vault-meaning">${v.vietnamese}</div>
        <div class="vault-sentence-quote">
          "${v.real_exam_sentence || v.explanation}"
        </div>
        ${v.common_mistake ? `<div class="vault-mistake-tip">⚠️ ${v.common_mistake}</div>` : ''}
      `;

      const speakBtn = card.querySelector('.btn-vault-speak');
      if (speakBtn) {
        speakBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof speechEngine !== 'undefined') speechEngine.speakWord(v.target_word || v.options[v.correct]);
        });
      }

      this.vaultList.appendChild(card);
    });

    if (this.vaultOverlay) this.vaultOverlay.classList.add('active');
  }

  closeVault() {
    if (this.vaultOverlay) this.vaultOverlay.classList.remove('active');
  }

  openGradeModal() {
    if (this.gradeModalOverlay) {
      this.gradeModalOverlay.classList.add('active');
    }
  }

  closeGradeModal() {
    if (this.gradeModalOverlay) {
      this.gradeModalOverlay.classList.remove('active');
    }
  }

  setGradeFilter(filterKey) {
    this.currentGradeFilter = filterKey;
    localStorage.setItem('ielts_grade_filter', filterKey);
    this.usedQuestionIds.clear(); // Reset question rotation on filter switch
    this.updateGradeFilterUI();
    this.closeGradeModal();
    this.startNewRound();
    if (this.currentFilterPillLabel) {
      this.flashDynamicIsland(`🎓 Đã chuyển: ${this.currentFilterPillLabel.textContent}`);
    }
  }

  updateGradeFilterUI() {
    const filterLabels = {
      all: 'Lớp 6-12 & TOEIC',
      scramble: 'Đặt câu thích ứng',
      toeic: 'TOEIC 400-700',
      ielts: 'IELTS (Lớp 6-12)',
      g6: 'Lớp 6 (Band 5.0)',
      g7: 'Lớp 7 (Band 5.0+)',
      g8: 'Lớp 8 (Band 5.5+)',
      g9: 'Lớp 9 (Band 6.0+)',
      g10: 'Lớp 10 (Band 6.5+)',
      g11: 'Lớp 11 (Band 7.0)',
      g12: 'Lớp 12 (Band 7.5)',
      band7: 'Mục tiêu Band 7.0+'
    };
    if (this.currentFilterPillLabel) {
      this.currentFilterPillLabel.textContent = filterLabels[this.currentGradeFilter] || 'Lớp 6-12 & TOEIC';
    }
    if (document.querySelectorAll) {
      const optionBtns = document.querySelectorAll('.grade-option-btn');
      optionBtns.forEach(btn => {
        if (btn.getAttribute('data-filter') === this.currentGradeFilter) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
  }

  // ==========================================================================
  // TIẾN ĐỘ HỌC TẬP & ĐỒNG BỘ DỮ LIỆU (LOCAL PERSISTENCE & SYNC)
  // ==========================================================================
  loadUserHistory() {
    try {
      const saved = localStorage.getItem('ielts_user_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  saveUserHistory() {
    try {
      localStorage.setItem('ielts_user_history', JSON.stringify(this.userHistory || []));
    } catch (e) {}
  }

  saveUserRoundResult(score, correctCount, totalAnswered, avgTime, bandTitle) {
    const record = {
      timestamp: Date.now(),
      dateStr: new Date().toLocaleDateString('vi-VN'),
      score,
      correctCount,
      totalAnswered,
      accuracy: totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0,
      avgTime,
      bandTitle
    };
    if (!this.userHistory) this.userHistory = [];
    this.userHistory.unshift(record);
    if (this.userHistory.length > 50) this.userHistory.pop();
    this.saveUserHistory();

    this.totalXp = (this.totalXp || 0) + score;
    this.totalAnswered = (this.totalAnswered || 0) + totalAnswered;
    this.totalCorrect = (this.totalCorrect || 0) + correctCount;
    localStorage.setItem('ielts_total_xp', this.totalXp);
    localStorage.setItem('ielts_total_answered', this.totalAnswered);
    localStorage.setItem('ielts_total_correct', this.totalCorrect);
  }

  openSyncModal() {
    if (this.syncModalOverlay) {
      this.syncModalOverlay.classList.add('active');
      this.showSyncStatus('Dữ liệu tiến độ học tập và SRS được lưu trữ an toàn trên thiết bị của bạn.', 'info');
    }
  }

  closeSyncModal() {
    if (this.syncModalOverlay) {
      this.syncModalOverlay.classList.remove('active');
    }
  }

  showSyncStatus(msg, type = 'info') {
    if (!this.syncStatusMsg) return;
    this.syncStatusMsg.textContent = msg;
    this.syncStatusMsg.className = `sync-status-text ${type}`;
  }

  exportProgressData() {
    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      appName: 'IELTS Blitz Arena (Danh Học IELTS)',
      storage: {
        ielts_memory_profiles: this.memoryProfiles || this.loadMemoryProfiles(),
        ielts_srs_matrix: this.srsMatrix || this.loadSRSMatrix(),
        ielts_weak_words: this.weakWordIds || this.loadWeakWords(),
        ielts_scramble_level: this.scrambleAdaptiveLevel,
        ielts_auto_next: this.isAutoNextEnabled ? 'true' : 'false',
        ielts_theme: localStorage.getItem('ielts_theme') || 'dark',
        ielts_grade_filter: this.currentGradeFilter,
        ielts_user_history: this.userHistory || this.loadUserHistory(),
        ielts_total_xp: this.totalXp || 0,
        ielts_total_answered: this.totalAnswered || 0,
        ielts_total_correct: this.totalCorrect || 0,
        ielts_scanned_exams: this.scannedExams || this.loadScannedExams(),
        ielts_gemini_api_key: this.geminiApiKey || ''
      }
    };
  }

  downloadProgressFile() {
    try {
      const data = this.exportProgressData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.href = url;
      a.download = `ielts_blitz_progress_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showSyncStatus('✅ Đã tải file tiến độ học tập thành công!', 'success');
      this.flashDynamicIsland('💾 Đã xuất file tiến độ học tập');
    } catch (e) {
      console.error('Lỗi khi xuất file:', e);
      this.showSyncStatus('❌ Lỗi khi xuất file: ' + e.message, 'error');
    }
  }

  copyProgressToClipboard() {
    try {
      const data = this.exportProgressData();
      const jsonStr = JSON.stringify(data, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(jsonStr).then(() => {
          this.showSyncStatus('✅ Đã copy toàn bộ mã tiến độ vào bộ nhớ tạm!', 'success');
          this.flashDynamicIsland('📋 Đã copy tiến độ vào Clipboard');
        }).catch(() => {
          this.fallbackCopyText(jsonStr);
        });
      } else {
        this.fallbackCopyText(jsonStr);
      }
    } catch (e) {
      this.showSyncStatus('❌ Lỗi copy: ' + e.message, 'error');
    }
  }

  fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      this.showSyncStatus('✅ Đã copy tiến độ vào bộ nhớ tạm!', 'success');
    } catch (err) {
      this.showSyncStatus('❌ Không thể copy tự động, vui lòng tải file.', 'error');
    }
    document.body.removeChild(ta);
  }

  importProgressData(rawStr) {
    try {
      if (!rawStr || !rawStr.trim()) {
        this.showSyncStatus('⚠️ Vui lòng dán dữ liệu JSON hoặc chọn file tiến độ', 'warning');
        return false;
      }

      let parsed = JSON.parse(rawStr.trim());
      const payload = parsed.storage || parsed.data || parsed;

      if (!payload || typeof payload !== 'object') {
        throw new Error('Dữ liệu JSON không đúng cấu trúc tiến độ IELTS Blitz');
      }

      let importedCount = 0;

      if (payload.ielts_memory_profiles) {
        this.memoryProfiles = payload.ielts_memory_profiles;
        this.saveMemoryProfiles();
        importedCount++;
      }
      if (payload.ielts_srs_matrix) {
        this.srsMatrix = payload.ielts_srs_matrix;
        this.saveSRSMatrix();
        importedCount++;
      }
      if (Array.isArray(payload.ielts_weak_words)) {
        this.weakWordIds = payload.ielts_weak_words;
        this.saveWeakWords();
        importedCount++;
      }
      if (payload.ielts_scramble_level) {
        this.scrambleAdaptiveLevel = parseInt(payload.ielts_scramble_level, 10) || 1;
        localStorage.setItem('ielts_scramble_level', this.scrambleAdaptiveLevel);
        importedCount++;
      }
      if (typeof payload.ielts_auto_next !== 'undefined') {
        this.isAutoNextEnabled = (payload.ielts_auto_next === true || payload.ielts_auto_next === 'true');
        localStorage.setItem('ielts_auto_next', this.isAutoNextEnabled ? 'true' : 'false');
        this.updateAutoNextUI();
        importedCount++;
      }
      if (payload.ielts_theme) {
        localStorage.setItem('ielts_theme', payload.ielts_theme);
        this.applyPersistedSettings();
        importedCount++;
      }
      if (Array.isArray(payload.ielts_scanned_exams)) {
        this.scannedExams = payload.ielts_scanned_exams;
        this.saveScannedExams();
        this.renderScannedExamsShelf();
        importedCount++;
      }
      if (payload.ielts_gemini_api_key) {
        this.geminiApiKey = payload.ielts_gemini_api_key;
        localStorage.setItem('ielts_gemini_api_key', this.geminiApiKey);
        this.updateGeminiKeyBadge();
        importedCount++;
      }
      if (Array.isArray(payload.ielts_user_history)) {
        this.userHistory = payload.ielts_user_history;
        this.saveUserHistory();
        importedCount++;
      }
      if (typeof payload.ielts_total_xp !== 'undefined') {
        this.totalXp = parseInt(payload.ielts_total_xp, 10) || 0;
        localStorage.setItem('ielts_total_xp', this.totalXp);
      }
      if (typeof payload.ielts_total_answered !== 'undefined') {
        this.totalAnswered = parseInt(payload.ielts_total_answered, 10) || 0;
        localStorage.setItem('ielts_total_answered', this.totalAnswered);
      }
      if (typeof payload.ielts_total_correct !== 'undefined') {
        this.totalCorrect = parseInt(payload.ielts_total_correct, 10) || 0;
        localStorage.setItem('ielts_total_correct', this.totalCorrect);
      }

      this.showSyncStatus(`🎉 Khôi phục thành công! Đã nạp ${importedCount} mục dữ liệu`, 'success');
      this.flashDynamicIsland('🔄 Đồng bộ tiến độ thành công!');

      setTimeout(() => {
        if (this.syncModalOverlay) this.syncModalOverlay.classList.remove('active');
      }, 1500);

      return true;
    } catch (e) {
      console.error('Lỗi khi import:', e);
      this.showSyncStatus('❌ Dữ liệu không hợp lệ: ' + e.message, 'error');
      return false;
    }
  }

  // ==========================================================================
  // PHÂN BỐ CÂU HỎI LISTENING ĐAN XEN (LISTENING INTEGRATION)
  // ==========================================================================
  createListeningVariant(sourceQuestion, pool = []) {
    if (!sourceQuestion) return null;
    const targetWord = (sourceQuestion.target_word || sourceQuestion.correct_answer || '').trim();
    if (!targetWord) return null;

    const bank = (pool && pool.length > 0) ? pool : (typeof IELTS_VOCAB_BANK !== 'undefined' ? IELTS_VOCAB_BANK : []);
    const otherCandidates = bank
      .filter(x => x.target_word && x.target_word.trim().toUpperCase() !== targetWord.toUpperCase())
      .map(x => x.target_word.trim());

    const uniqueDistractors = shuffleArray([...new Set(otherCandidates)]).slice(0, 3);
    const options = shuffleArray([targetWord, ...uniqueDistractors]);

    return {
      ...sourceQuestion,
      id: `${sourceQuestion.id}_listening_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      mode: 'listening_choice',
      prompt: '🎧 Nghe phát âm và chọn từ vựng bạn vừa nghe:',
      target_word: targetWord,
      options: options,
      correct: options.indexOf(targetWord),
      correct_answer: targetWord,
      vietnamese: sourceQuestion.vietnamese || '',
      explanation: `Từ vừa phát âm là: ${targetWord} (${sourceQuestion.phonetic || ''}) - ${sourceQuestion.vietnamese || ''}`,
      real_exam_sentence: sourceQuestion.real_exam_sentence || sourceQuestion.sentence || `Listen and recognize "${targetWord}" in IELTS Listening Section.`
    };
  }

  // ==========================================================================
  // SỐ HÓA ĐỀ THI GIẤY BẰNG AI (GEMINI FLASH EXAM SCANNER)
  // ==========================================================================
  loadScannedExams() {
    try {
      const saved = localStorage.getItem('ielts_scanned_exams');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  saveScannedExams() {
    try {
      localStorage.setItem('ielts_scanned_exams', JSON.stringify(this.scannedExams || []));
    } catch (e) {}
  }

  initScannerSystem() {
    this.updateGeminiKeyBadge();
    const saved = this.loadScannedExams();
    if (!saved || saved.length === 0) {
      const sample = this.getPreloadedSampleExam();
      this.scannedExams = [sample];
      this.saveScannedExams();
    } else {
      this.scannedExams = saved;
    }
    this.renderScannedExamsShelf();
  }

  getPreloadedSampleExam() {
    return {
      id: 'sample_thpt_2026',
      title: 'Đề minh họa THPT Quốc Gia & IELTS 2026',
      date: 'Mẫu có sẵn',
      questionCount: 10,
      totalBatchesGenerated: 1,
      questions: [
        {
          id: 'scan_sample_1',
          mode: 'multiple_choice',
          prompt: 'Choose the word whose underlined part differs in pronunciation:',
          sentence: 'A. climate   B. examine   C. surprise   D. divide',
          options: ['climate', 'examine', 'surprise', 'divide'],
          correct: 1,
          correct_answer: 'examine',
          vietnamese: 'Phát âm /ɪ/ thay vì /aɪ/ như các từ còn lại',
          explanation: 'examine phát âm là /ɪɡˈzæm.ɪn/, các từ còn lại phát âm là /aɪ/.',
          band: '6.0',
          topic: 'Phonetics'
        },
        {
          id: 'scan_sample_2',
          mode: 'sentence_cloze',
          prompt: 'Choose the best answer to complete the sentence:',
          sentence: 'The government has decided to ____ stricter regulations on industrial emissions.',
          options: ['impose', 'dispose', 'propose', 'expose'],
          correct: 0,
          correct_answer: 'impose',
          vietnamese: 'Ban hành / áp đặt các quy định nghiêm ngặt',
          explanation: 'Cụm từ cố định: "impose regulations on something" (áp đặt quy định).',
          band: '6.5',
          topic: 'Vocabulary'
        },
        {
          id: 'scan_sample_3',
          mode: 'letter_fill',
          prompt: 'Điền chữ cái hoàn thành từ vựng có trong đề:',
          target_word: 'INNOVATION',
          masked: 'I N N _ V A T _ O N',
          missing: ['O', 'I'],
          options: ['O', 'I', 'E', 'A'],
          correct: 0,
          correct_answer: 'INNOVATION',
          vietnamese: 'Sự đổi mới, sáng kiến',
          explanation: 'Innovation (danh từ): sự đổi mới công nghệ hoặc phương pháp.',
          band: '7.0',
          topic: 'Technology'
        },
        {
          id: 'scan_sample_4',
          mode: 'preposition',
          prompt: 'Chọn giới từ thích hợp điền vào chỗ trống:',
          sentence: 'Many young graduates are dependent ____ financial support from their parents.',
          options: ['on', 'with', 'for', 'at'],
          correct: 0,
          correct_answer: 'on',
          vietnamese: 'Phụ thuộc vào',
          explanation: 'Cụm tính từ + giới từ: "dependent on / upon someone/something".',
          band: '6.0',
          topic: 'Prepositions'
        },
        {
          id: 'scan_sample_5',
          mode: 'sentence_scramble',
          prompt: 'Chạm các thẻ từ để sắp xếp lại câu chuẩn ngữ pháp trong đề thi:',
          raw_tokens: ['Active', 'learning', 'enhances', 'long-term', 'memory', 'retention.'],
          scrambled_tokens: ['enhances', 'Active', 'retention.', 'learning', 'memory', 'long-term'],
          options: ['Active', 'learning', 'enhances', 'retention.'],
          correct: 0,
          correct_sentence: 'Active learning enhances long-term memory retention.',
          vietnamese: 'Phương pháp học chủ động giúp tăng cường khả năng ghi nhớ dài hạn.',
          explanation: 'Chủ ngữ cụm danh từ: Active learning + Động từ enhances + Tân ngữ long-term memory retention.',
          band: '7.0',
          topic: 'Education'
        },
        {
          id: 'scan_sample_6',
          mode: 'multiple_choice',
          prompt: 'Mark the letter A, B, C, or D to indicate the word CLOSEST in meaning:',
          sentence: 'The new policy is expected to generate profound alterations in student performance.',
          options: ['significant', 'trivial', 'minor', 'superficial'],
          correct: 0,
          correct_answer: 'significant',
          vietnamese: 'Sâu sắc, đáng kể',
          explanation: 'Profound = significant / deep-seated (sâu sắc, tác động lớn).',
          band: '7.5',
          topic: 'Synonyms'
        },
        {
          id: 'scan_sample_7',
          mode: 'sentence_cloze',
          prompt: 'Choose the correct phrasal verb:',
          sentence: 'We had to ____ our trip to London until next summer due to unexpected travel delays.',
          options: ['put off', 'call off', 'give up', 'take after'],
          correct: 0,
          correct_answer: 'put off',
          vietnamese: 'Hoãn lại',
          explanation: 'Put off = delay / postpone (hoãn lại). Call off = cancel (hủy bỏ hoàn toàn).',
          band: '6.5',
          topic: 'Phrasal Verbs'
        },
        {
          id: 'scan_sample_8',
          mode: 'letter_fill',
          prompt: 'Điền chữ cái còn thiếu cho từ vựng học thuật:',
          target_word: 'ACCOMMODATE',
          masked: 'A C C _ M M _ D A T E',
          missing: ['O', 'O'],
          options: ['O', 'E', 'U', 'A'],
          correct: 0,
          correct_answer: 'ACCOMMODATE',
          vietnamese: 'Cung cấp nơi ăn chốn ở / đáp ứng nhu cầu',
          explanation: 'Accommodate (v): chứa chấp, đáp ứng. Lưu ý từ này có 2 chữ C và 2 chữ M.',
          band: '7.0',
          topic: 'Academic Vocab'
        },
        {
          id: 'scan_sample_9',
          mode: 'meaning_match',
          prompt: 'Chọn nghĩa tiếng Việt chính xác của cụm từ trong đề thi:',
          questionMain: 'wreak havoc',
          options: ['Gây ra tàn phá nghiêm trọng', 'Mang lại cơ hội tốt', 'Cải thiện tình hình', 'Thúc đẩy sự hợp tác'],
          correct: 0,
          correct_answer: 'Gây ra tàn phá nghiêm trọng',
          vietnamese: 'Gây ra tàn phá, hủy hoại',
          explanation: 'Cụm thành ngữ học thuật: "wreak havoc on something" (gây tàn phá nặng nề).',
          band: '7.5',
          topic: 'Collocations'
        },
        {
          id: 'scan_sample_10',
          mode: 'multiple_choice',
          prompt: 'Mark the letter A, B, C, or D to indicate the OPPOSITE in meaning:',
          sentence: 'His reluctant attitude towards team collaboration made the project progress much slower.',
          options: ['enthusiastic', 'hesitant', 'unwilling', 'careless'],
          correct: 0,
          correct_answer: 'enthusiastic',
          vietnamese: 'Nhiệt tình (trái nghĩa với reluctant - miễn cưỡng)',
          explanation: 'Reluctant (miễn cưỡng, ngần ngại) trái nghĩa với enthusiastic (nhiệt huyết, hào hứng).',
          band: '7.0',
          topic: 'Antonyms'
        }
      ]
    };
  }

  renderScannedExamsShelf() {
    if (!this.scannedExamsShelf) return;
    this.scannedExamsShelf.innerHTML = '';

    if (!this.scannedExams || this.scannedExams.length === 0) {
      this.scannedExamsShelf.innerHTML = '<div class="empty-shelf-hint">Chưa có đề thi nào. Chụp ảnh đề thi bằng Camera hoặc Tải ảnh để AI chuyển thành game ngay!</div>';
      return;
    }

    this.scannedExams.forEach((exam) => {
      const card = document.createElement('div');
      card.className = 'scanned-exam-card';
      const isSample = exam.id === 'sample_thpt_2026';
      const qCount = exam.questions ? exam.questions.length : 0;
      const batchCount = exam.totalBatchesGenerated || 1;

      card.innerHTML = `
        <div class="exam-card-header">
          <div class="exam-card-title">${exam.title || 'Đề thi đã quét'}</div>
          <span class="exam-date-pill">${exam.date || 'Gần đây'}</span>
        </div>
        <div class="exam-card-meta">
          <span class="exam-count-badge">📝 ${qCount} câu hỏi (${batchCount} batch)</span>
          ${isSample ? '<span class="exam-sample-badge">⭐ Mẫu chuẩn</span>' : '<span class="exam-ai-badge">🤖 Gemini Flash</span>'}
        </div>
        <div class="exam-card-actions">
          <button class="btn-exam-action-play" data-exam-id="${exam.id}">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Chơi ngay
          </button>
          ${!isSample ? `<button class="btn-exam-action-delete" data-exam-id="${exam.id}" title="Xóa đề thi này">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>` : ''}
        </div>
      `;

      const btnPlay = card.querySelector('.btn-exam-action-play');
      if (btnPlay) {
        btnPlay.addEventListener('click', () => this.playScannedExam(exam.id));
      }
      const btnDelete = card.querySelector('.btn-exam-action-delete');
      if (btnDelete) {
        btnDelete.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteScannedExam(exam.id);
        });
      }

      this.scannedExamsShelf.appendChild(card);
    });
  }

  deleteScannedExam(examId) {
    if (!confirm('Bạn có chắc muốn xóa đề thi này không?')) return;
    this.scannedExams = this.scannedExams.filter(e => e.id !== examId);
    this.saveScannedExams();
    this.renderScannedExamsShelf();
    this.flashDynamicIsland('🗑️ Đã xóa đề thi');
  }

  openGeminiKeyModal() {
    if (!this.geminiKeyModal) return;
    if (this.geminiKeyInput) {
      this.geminiKeyInput.value = this.geminiApiKey || '';
    }
    this.geminiKeyModal.classList.add('active');
  }

  closeGeminiKeyModal() {
    if (this.geminiKeyModal) {
      this.geminiKeyModal.classList.remove('active');
    }
  }

  toggleKeyVisibility() {
    if (!this.geminiKeyInput) return;
    const isPassword = this.geminiKeyInput.type === 'password';
    this.geminiKeyInput.type = isPassword ? 'text' : 'password';
    if (this.btnToggleKeyEye) {
      this.btnToggleKeyEye.innerHTML = isPassword
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
  }

  saveGeminiKeyFromInput() {
    if (!this.geminiKeyInput) return;
    const val = this.geminiKeyInput.value.trim();
    if (!val) {
      this.geminiApiKey = '';
      localStorage.removeItem('ielts_gemini_api_key');
      this.updateGeminiKeyBadge();
      this.closeGeminiKeyModal();
      this.flashDynamicIsland('🗑️ Đã xóa Gemini API Key');
      return;
    }

    this.geminiApiKey = val;
    localStorage.setItem('ielts_gemini_api_key', val);
    this.updateGeminiKeyBadge();
    this.closeGeminiKeyModal();
    this.flashDynamicIsland('🔑 Đã lưu Gemini API Key');
  }

  updateGeminiKeyBadge() {
    if (!this.scannerKeyStatusBadge) return;
    if (this.geminiApiKey) {
      const masked = this.geminiApiKey.length > 8
        ? `${this.geminiApiKey.slice(0, 4)}...${this.geminiApiKey.slice(-4)}`
        : 'Đã lưu';
      this.scannerKeyStatusBadge.textContent = `🔑 Key: ${masked}`;
      this.scannerKeyStatusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      this.scannerKeyStatusBadge.style.color = '#34d399';
    } else {
      this.scannerKeyStatusBadge.textContent = '⚠️ Chưa nhập Key';
      this.scannerKeyStatusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
      this.scannerKeyStatusBadge.style.color = '#f87171';
    }
  }

  switchArenaView(viewName) {
    if (viewName === 'scanner') {
      if (this.vocabArenaView) this.vocabArenaView.classList.add('hidden-view');
      if (this.scannerArenaView) this.scannerArenaView.classList.remove('hidden-view');
      this.currentArenaView = 'scanner';
      clearInterval(this.timerInterval);
    } else {
      if (this.scannerArenaView) this.scannerArenaView.classList.add('hidden-view');
      if (this.vocabArenaView) this.vocabArenaView.classList.remove('hidden-view');
      this.currentArenaView = 'vocab';
    }
  }

  compressImageToJpegBase64(file, maxDimension = 1280, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Ảnh không hợp lệ'));
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > maxDimension || h > maxDimension) {
            if (w > h) {
              h = Math.round((h * maxDimension) / w);
              w = maxDimension;
            } else {
              w = Math.round((w * maxDimension) / h);
              h = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const base64 = dataUrl.split(',')[1];
          resolve(base64);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async handleImageFileSelect(file) {
    if (!file) return;
    try {
      if (!this.geminiApiKey) {
        this.openGeminiKeyModal();
        this.flashDynamicIsland('🔑 Vui lòng nhập Gemini API Key trước khi quét đề');
        return;
      }

      this.flashDynamicIsland('📸 Đang nén và phân tích ảnh đề thi...');
      const base64 = await this.compressImageToJpegBase64(file);
      const questions = await this.callGeminiFlashExamExtractor(base64, 1, []);

      if (questions && questions.length > 0) {
        const newExam = {
          id: `exam_${Date.now()}`,
          title: `Đề thi quét camera #${this.scannedExams.length + 1}`,
          date: new Date().toLocaleDateString('vi-VN'),
          questionCount: questions.length,
          base64Image: base64,
          totalBatchesGenerated: 1,
          questions: questions
        };

        this.scannedExams.unshift(newExam);
        this.saveScannedExams();
        this.renderScannedExamsShelf();
        this.flashDynamicIsland(`🎉 Đã số hóa thành công 10 câu hỏi! Chuyển vào chơi ngay`);

        this.playScannedExam(newExam.id);
      }
    } catch (err) {
      console.error('Lỗi quét đề thi:', err);
      alert(`Không thể số hóa đề thi: ${err.message}\n\nVui lòng kiểm tra lại Gemini API Key hoặc kết nối mạng.`);
    }
  }

  async callGeminiFlashExamExtractor(base64Data, batchNum = 1, existingQuestions = []) {
    if (!this.geminiApiKey) {
      this.openGeminiKeyModal();
      this.flashDynamicIsland('🔑 Vui lòng nhập Gemini API Key để số hóa đề thi');
      throw new Error('Chưa cấu hình Gemini API Key');
    }

    if (this.scanningRadarStatus) {
      this.scanningRadarStatus.style.display = 'flex';
    }
    if (this.scannerLogStatus) {
      this.scannerLogStatus.textContent = batchNum === 1
        ? '🤖 Gemini Flash đang phân tích đề thi và tạo 10 câu đầu...'
        : `🤖 Gemini Flash đang tự động sinh 10 câu tiếp theo (Đợt ${batchNum})...`;
    }

    const existingSummary = (existingQuestions || [])
      .slice(-10)
      .map(q => q.prompt || q.sentence || q.target_word || '')
      .filter(Boolean)
      .join('; ');

    const promptText = `Bạn là chuyên gia chuyển hóa đề thi giấy tiếng Anh (THPT Quốc Gia & IELTS) thành game tương tác di động.
Hãy phân tích hình ảnh trang đề thi này và trích xuất nguyên văn các câu hỏi/từ vựng trong đề để tạo đúng 10 câu hỏi game chất lượng cao.
${batchNum > 1 ? `ĐÂY LÀ ĐỢT SỐ ${batchNum}. Yêu cầu tạo 10 câu MỚI TIẾP THEO từ đề thi, HOÀN TOÀN KHÔNG TRÙNG với các câu trước đó: [${existingSummary}]` : 'Tạo 10 câu hỏi đầu tiên theo sát nội dung đề thi.'}

Các định dạng câu hỏi cho phép:
1. "multiple_choice": Trắc nghiệm 4 đáp án nguyên văn từ đề thi.
2. "sentence_cloze": Điền từ vào chỗ trống trong câu (dùng "____").
3. "letter_fill": Điền chữ cái còn thiếu cho từ vựng có trong đề (có "target_word", "masked", "missing", "options").
4. "preposition": Điền giới từ đúng.
5. "sentence_scramble": Ghép lại câu hoàn chỉnh từ các từ bị xáo trộn (có "raw_tokens", "scrambled_tokens", "correct_sentence").
6. "meaning_match": Chọn nghĩa tiếng Việt hoặc từ đồng nghĩa trong đề thi.

YÊU CẦU ĐẶC BIỆT QUAN TRỌNG:
- Trả về ĐÚNG MỘT MẢNG JSON thuần túy (Array of objects), KHÔNG kèm bất kỳ văn bản giải thích nào ngoài JSON.
- Mỗi object PHẢI có cấu trúc:
  {
    "id": "scan_${Date.now()}_${batchNum}_[index]",
    "mode": "multiple_choice" | "sentence_cloze" | "letter_fill" | "preposition" | "sentence_scramble" | "meaning_match",
    "prompt": "Hướng dẫn câu hỏi",
    "sentence": "Câu văn đề bài (dùng ____ cho chỗ trống)",
    "options": ["A", "B", "C", "D"], // đúng 4 đáp án
    "correct": 0, // số nguyên từ 0 đến 3 biểu thị vị trí đáp án đúng
    "correct_answer": "nội dung đáp án đúng",
    "vietnamese": "Nghĩa tiếng Việt hoặc bản dịch tóm tắt",
    "explanation": "Giải thích ngắn gọn lý do chọn đáp án này",
    "band": "6.5",
    "topic": "Đề thi giấy"
  }`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    };

    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${response.status} (${response.statusText})`);
        }

        const data = await response.json();
        const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawJsonText) {
          throw new Error('Gemini không trả về nội dung câu hỏi');
        }

        let cleanText = rawJsonText.trim();
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        }

        const parsed = JSON.parse(cleanText);
        const questionsList = Array.isArray(parsed) ? parsed : (parsed.questions || []);

        if (!Array.isArray(questionsList) || questionsList.length === 0) {
          throw new Error('Định dạng JSON trả về không phải là mảng câu hỏi');
        }

        const validQuestions = questionsList.map((q, idx) => {
          const validOptions = (Array.isArray(q.options) && q.options.length >= 4)
            ? q.options.slice(0, 4)
            : (Array.isArray(q.options) ? [...q.options, 'Option A', 'Option B', 'Option C', 'Option D'].slice(0, 4) : ['A', 'B', 'C', 'D']);
          let correctIdx = typeof q.correct === 'number' && q.correct >= 0 && q.correct < 4 ? q.correct : 0;
          if (q.correct_answer && validOptions[correctIdx] !== q.correct_answer) {
            const foundIdx = validOptions.indexOf(q.correct_answer);
            if (foundIdx !== -1) correctIdx = foundIdx;
            else validOptions[correctIdx] = q.correct_answer;
          }

          return {
            id: q.id || `scan_${Date.now()}_${idx}`,
            mode: q.mode || 'multiple_choice',
            prompt: q.prompt || 'Chọn đáp án chính xác trong đề thi:',
            sentence: q.sentence || '',
            options: validOptions,
            correct: correctIdx,
            correct_answer: q.correct_answer || validOptions[correctIdx],
            vietnamese: q.vietnamese || 'Đề thi tiếng Anh',
            explanation: q.explanation || 'Đáp án chính xác theo ngữ cảnh đề bài.',
            band: q.band || '6.5',
            topic: q.topic || 'Đề thi giấy',
            target_word: q.target_word || q.correct_answer || '',
            masked: q.masked || '',
            missing: q.missing || [],
            raw_tokens: q.raw_tokens || [],
            scrambled_tokens: q.scrambled_tokens || [],
            correct_sentence: q.correct_sentence || ''
          };
        });

        if (this.scanningRadarStatus) {
          this.scanningRadarStatus.style.display = 'none';
        }

        return validQuestions;
      } catch (err) {
        console.warn(`Lỗi khi gọi model ${model}:`, err);
        lastError = err;
      }
    }

    if (this.scanningRadarStatus) {
      this.scanningRadarStatus.style.display = 'none';
    }
    throw lastError || new Error('Không thể kết nối đến Gemini Flash');
  }

  playScannedExam(examId) {
    const exam = this.scannedExams.find(e => e.id === examId);
    if (!exam || !exam.questions || exam.questions.length === 0) {
      this.flashDynamicIsland('⚠️ Đề thi chưa có câu hỏi');
      return;
    }

    this.currentPlayingExam = exam;
    this.questions = [...exam.questions];
    this.currentIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.hearts = 3;
    this.consecutiveForHeartRecovery = 0;
    this.roundResults = [];
    this.responseTimes = [];
    this.sessionVocabs = [];

    this.powerups = { fiftyFifty: true, freeze: true, hint: true };
    this.updatePowerupButtons();
    this.updateHeartsUI();
    this.updateScoreUI();
    this.updateStreakUI();

    this.switchArenaView('vocab');
    this.loadQuestion(0);
    this.flashDynamicIsland(`🚀 Đang chơi: ${exam.title}`);

    // Tự động sinh ngầm 10 câu tiếp theo nếu có ảnh gốc và chưa đạt giới hạn 60 câu
    if (exam.base64Image && exam.questions.length < 60) {
      setTimeout(() => {
        this.requestNextExamBatch(exam);
      }, 4000);
    }
  }

  async requestNextExamBatch(exam) {
    if (!exam || !exam.base64Image || exam.questions.length >= 60 || this.isBackgroundGenerating) return;
    this.isBackgroundGenerating = true;

    try {
      const nextBatchNum = (exam.totalBatchesGenerated || 1) + 1;
      const newQuestions = await this.callGeminiFlashExamExtractor(exam.base64Image, nextBatchNum, exam.questions);
      if (Array.isArray(newQuestions) && newQuestions.length > 0) {
        exam.questions.push(...newQuestions);
        exam.totalBatchesGenerated = nextBatchNum;
        exam.questionCount = exam.questions.length;
        this.saveScannedExams();
        this.renderScannedExamsShelf();

        // Nếu người chơi vẫn đang chơi đề thi này, nối trực tiếp câu hỏi vào danh sách thi đấu
        if (this.currentPlayingExam && this.currentPlayingExam.id === exam.id) {
          this.questions.push(...newQuestions);
          if (this.progressText) {
            this.progressText.textContent = `Câu ${this.currentIndex + 1}/${this.questions.length}`;
          }
          this.flashDynamicIsland(`⚡ AI đã tạo thêm 10 câu mới (${this.questions.length}/60 câu)!`);
        }

        // Nếu vẫn chưa đủ 60 câu, tiếp tục tạo đợt tiếp theo sau 8 giây
        if (exam.questions.length < 60) {
          setTimeout(() => {
            this.isBackgroundGenerating = false;
            this.requestNextExamBatch(exam);
          }, 8000);
        } else {
          this.isBackgroundGenerating = false;
        }
      } else {
        this.isBackgroundGenerating = false;
      }
    } catch (e) {
      console.warn('Lỗi khi tạo batch tiếp theo:', e);
      this.isBackgroundGenerating = false;
    }
  }

  copyShareCard() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(this.generatedEmojiGrid).then(() => {
        const shareSpan = this.btnShare.querySelector('span');
        if (shareSpan) shareSpan.textContent = '✓ Đã Copy Kết Quả!';
        setTimeout(() => {
          if (shareSpan) shareSpan.textContent = 'Copy Kết Quả Khoe Bạn Bè';
        }, 2000);
      });
    } else {
      alert("Kết quả đã tạo:\n\n" + this.generatedEmojiGrid);
    }
  }

  launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : 440;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : 956;

    const particles = [];
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#38bdf8', '#ffffff'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        w: Math.random() * 8 + 4,
        h: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 16,
        gravity: 0.35,
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    const rAF = (typeof window !== 'undefined' && window.requestAnimationFrame) || (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (fn => setTimeout(fn, 16)));
    const cAF = (typeof window !== 'undefined' && window.cancelAnimationFrame) || (typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : (id => clearTimeout(id)));

    let animationFrame;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let aliveCount = 0;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.vr;
        p.opacity -= 0.008;

        if (p.opacity > 0 && p.y < canvas.height) {
          aliveCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });

      if (aliveCount > 0) {
        animationFrame = rAF(animate);
      } else {
        cAF(animationFrame);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animate();
  }
}

// Khởi chạy khi load xong DOM
window.addEventListener('DOMContentLoaded', () => {
  const game = new GameEngine();
  game.startNewRound();
});
