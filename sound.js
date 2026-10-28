/**
 * IELTS BLITZ ARENA - SOUND & SPEECH SYNTHESIZER ENGINE (Web Audio API & Web Speech API)
 * Pure synthesis: 0 bytes external audio files, 0ms latency, 100% offline.
 * Bổ sung hệ thống phát âm từ vựng chuẩn Cambridge/Oxford, tone trung - cao, phát âm rõ từng âm tiết.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('ielts_sound_muted') === 'true';
    this.goodVariation = 0;
  }

  // Khởi tạo và mở khóa AudioContext (Bắt buộc với iOS Safari)
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('ielts_sound_muted', this.isMuted);
    speechEngine.isMuted = this.isMuted;
    return this.isMuted;
  }

  // 1. Âm thanh Trả lời Đúng (Chuẩn Danh_English_Tutor luân phiên [523, 659, 784] và [587, 740, 880])
  playCorrect(streak = 0) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([20, 30, 20]); } catch (e) {}
    }
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = (this.goodVariation++ % 2) ? [587, 740, 880] : [523, 659, 784];
    const now = this.ctx.currentTime;
    const step = 0.065;

    notes.forEach((frequency, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const at = now + i * step;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, at);
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.08, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);

      osc.start(at);
      osc.stop(at + 0.17);
    });
  }

  // 2. Âm thanh Trả lời Sai (Chuẩn Danh_English_Tutor [294, 247] sóng tam giác hạ dần)
  playWrong() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([40, 50, 40]); } catch (e) {}
    }
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [294, 247];
    const now = this.ctx.currentTime;
    const step = 0.065;

    notes.forEach((frequency, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const at = now + i * step;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, at);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.88, at + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.08, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);

      osc.start(at);
      osc.stop(at + 0.17);
    });
  }

  // 3. Âm thanh Đồng hồ Tích tắc (Đẩy nhịp khi thời gian <= 3.0s)
  playTick(isUrgent = false) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isUrgent ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(isUrgent ? 880 : 440, now);

    gain.gain.setValueAtTime(isUrgent ? 0.15 : 0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  }

  // 4. Âm thanh kích hoạt FEVER MODE & STREAK (Chuẩn Danh_English_Tutor ngũ âm cao trào)
  playFever() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523, 659, 784, 1047, 1319];
    const now = this.ctx.currentTime;
    const step = 0.085;

    notes.forEach((frequency, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const at = now + i * step;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, at);
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.09, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);

      osc.start(at);
      osc.stop(at + 0.19);
    });
  }

  // 5. Âm thanh sử dụng Power-Up
  playPowerup() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6
    const now = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      gain.gain.setValueAtTime(0.18, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.24);
    });
  }

  // 6. Fanfare Chiến thắng
  playVictory() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const melody = [523.25, 659.25, 783.99, 1046.50, 1174.66, 1318.51];
    melody.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.48);
      }, idx * 110);
    });
  }
}

/**
 * ==========================================================================
 * SPEECH SYNTHESIS ENGINE (HỆ THỐNG PHÁT ÂM TỪ VỰNG TỰ NHIÊN)
 * - Giọng đọc tiếng Anh bản xứ chuẩn quốc tế (Oxford / Cambridge / Apple / Google)
 * - Tone: Trung - Cao (Pitch: 1.18) tạo cảm giác trong trẻo, tự nhiên, lôi cuốn
 * - Tốc độ: 0.92 giúp người học nghe rõ từng phụ âm cuối (t, d, s, z, th...)
 * ==========================================================================
 */
class SpeechEngine {
  constructor() {
    this.synth = (typeof window !== 'undefined' && 'speechSynthesis' in window) ? window.speechSynthesis : null;
    this.voice = null;
    this.isMuted = localStorage.getItem('ielts_sound_muted') === 'true';

    if (this.synth) {
      this.initVoice();
      if (typeof this.synth.onvoiceschanged !== 'undefined') {
        this.synth.onvoiceschanged = () => this.initVoice();
      }
    }
  }

  initVoice() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return;

    // Tìm giọng đọc tiếng Anh tự nhiên chất lượng cao nhất của hệ điều hành
    // Ưu tiên: Samantha, Victoria, Google US/UK, Karen, Zira, Natural English
    const priorityNames = ['Samantha', 'Victoria', 'Google US English', 'Google UK English Female', 'Karen', 'Moira', 'Tessa', 'Natural', 'Zira'];
    
    for (const name of priorityNames) {
      const match = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
      if (match) {
        this.voice = match;
        return;
      }
    }

    // Fallback: Tìm bất kỳ giọng nữ tiếng Anh nào hoặc giọng en-US/en-GB
    this.voice = voices.find(v => v.lang === 'en-GB' || v.lang === 'en-US')
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];
  }

  // Phát âm từ vựng chính xác mỗi khi trả lời đúng
  speakWord(text) {
    if (this.isMuted || !this.synth || !text) return;

    // Hủy các câu đọc dở trước đó
    this.synth.cancel();

    // Làm sạch chuỗi từ (bỏ dấu gạch dưới, khoảng trắng dư thừa)
    let cleanWord = text.replace(/_/g, '').replace(/\[.*?\]/g, '').trim();
    if (!cleanWord) return;

    const utter = new SpeechSynthesisUtterance(cleanWord);
    utter.lang = 'en-US';
    if (this.voice) {
      utter.voice = this.voice;
    }

    // Tone TRUNG - CAO (1.18) và TỐC ĐỘ RÕ RÀNG (0.92)
    utter.pitch = 1.18;
    utter.rate = 0.92;
    utter.volume = 1.0;

    this.synth.speak(utter);
  }
}

// Khởi tạo các singleton instance
const soundEngine = new SoundEngine();
const speechEngine = new SpeechEngine();
