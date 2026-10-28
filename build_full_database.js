const fs = require('fs');

// We will construct all 126 questions in chunks
const allQuestions = [];

// Helper to push and validate
function addQ(q) {
  // Validate
  if (!q.id || !q.grade || !q.mode || !q.band || !q.topic || !q.target_word || !q.vietnamese || !q.phonetic) {
    throw new Error(`Missing core fields in question ${q.id}`);
  }
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    throw new Error(`Options must be 4 unique strings in ${q.id}`);
  }
  const set = new Set(q.options.map(x => x.trim().toLowerCase()));
  if (set.size !== 4) {
    throw new Error(`Duplicate options in ${q.id}: ${q.options.join(', ')}`);
  }
  if (q.correct < 0 || q.correct > 3) {
    throw new Error(`Invalid correct index in ${q.id}: ${q.correct}`);
  }
  if (!q.real_exam_sentence || !q.exam_task || !q.common_mistake || !q.explanation) {
    throw new Error(`Missing exam or explanation fields in ${q.id}`);
  }
  if (q.mode === 'letter_fill') {
    const blanks = (q.masked.match(/_/g) || []).length;
    if (blanks !== q.missing.length) {
      throw new Error(`Masked blanks ${blanks} != missing length ${q.missing.length} in ${q.id}`);
    }
  }
  if (q.mode === 'preposition') {
    const correctPrep = q.options[q.correct].toLowerCase();
    const validPreps = ['to', 'from', 'with', 'on', 'of', 'for', 'in', 'upon', 'at', 'by'];
    if (!validPreps.some(p => correctPrep.includes(p))) {
      throw new Error(`Preposition answer "${correctPrep}" not in allowed list in ${q.id}`);
    }
  }
  if (q.mode === 'collocation' || q.mode === 'word_class' || q.mode === 'sentence_cloze') {
    if (!q.sentence.includes('_______')) {
      throw new Error(`Missing blank _______ in sentence in ${q.id}`);
    }
  }
  allQuestions.push(q);
}

// ==========================================
// 1. LETTER FILL (21 QUESTIONS: 3 per Grade 6..12)
// ==========================================
addQ({
  id: "g6_lf_01", grade: 6, grade_label: "Lớp 6", unit: "Unit 1: My New School", mode: "letter_fill", band: "5.0", topic: "Education",
  target_word: "UNIFORM", masked: "U N I F _ R M", missing: ["O"], options: ["O", "E", "A", "U"], correct: 0,
  vietnamese: "đồng phục học sinh", phonetic: "/ˈjuː.nɪ.fɔːm/", exam_task: "Speaking Part 1 (School Life)",
  real_exam_sentence: "Wearing a school uniform fosters a sense of discipline and equality among students.",
  common_mistake: "Thí sinh hay quên chữ 'o' và phát âm sai âm đầu /juː/ thành /uː/.",
  explanation: "'Uniform' (đồng phục) là danh từ đếm được, thường đi với động từ 'wear' hoặc 'enforce'."
});
addQ({
  id: "g6_lf_02", grade: 6, grade_label: "Lớp 6", unit: "Unit 11: Our Greener World", mode: "letter_fill", band: "5.0", topic: "Environment",
  target_word: "POLLUTION", masked: "P O L L _ T _ O N", missing: ["U", "I"], options: ["U - I", "A - E", "O - I", "E - A"], correct: 0,
  vietnamese: "sự ô nhiễm môi trường", phonetic: "/pəˈluː.ʃən/", exam_task: "Writing Task 2 (Environment)",
  real_exam_sentence: "Severe air pollution in major cities poses grave threats to public health.",
  common_mistake: "Thường viết thiếu một chữ 'l' thành 'polution'.",
  explanation: "'Pollution' là danh từ không đếm được chỉ sự ô nhiễm (air/water/noise pollution)."
});
addQ({
  id: "g6_lf_03", grade: 6, grade_label: "Lớp 6", unit: "Unit 10: Our Houses in the Future", mode: "letter_fill", band: "5.0", topic: "Technology",
  target_word: "APPLIANCE", masked: "A P P L _ _ N C E", missing: ["I", "A"], options: ["I - A", "E - A", "A - I", "E - E"], correct: 0,
  vietnamese: "thiết bị gia dụng", phonetic: "/əˈplaɪ.əns/", exam_task: "Writing Task 2 (Technology & Living)",
  real_exam_sentence: "Energy-efficient domestic appliances significantly reduce household electricity consumption.",
  common_mistake: "Thường nhầm 'appliance' (thiết bị gia dụng) với 'application' (ứng dụng di động).",
  explanation: "'Household / domestic appliances' chỉ tủ lạnh, máy giặt, lò vi sóng..."
});

addQ({
  id: "g7_lf_01", grade: 7, grade_label: "Lớp 7", unit: "Unit 3: Community Service", mode: "letter_fill", band: "5.0", topic: "Society",
  target_word: "VOLUNTEER", masked: "V O L _ N T _ _ R", missing: ["U", "E", "E"], options: ["U - E - E", "A - E - A", "O - E - E", "U - A - E"], correct: 0,
  vietnamese: "tình nguyện viên / làm việc tình nguyện", phonetic: "/ˌvɒl.ənˈtɪər/", exam_task: "Writing Task 2 (Community & Youth)",
  real_exam_sentence: "Engaging in volunteer activities instills civic responsibility in young adolescents.",
  common_mistake: "Nhầm lẫn giữa động từ 'volunteer' và tính từ 'voluntary'.",
  explanation: "'Volunteer' vừa là danh từ (tình nguyện viên) vừa là động từ (tự nguyện làm gì)."
});
addQ({
  id: "g7_lf_02", grade: 7, grade_label: "Lớp 7", unit: "Unit 10: Energy Sources", mode: "letter_fill", band: "5.5", topic: "Environment",
  target_word: "TURBINE", masked: "T _ R B _ N E", missing: ["U", "I"], options: ["U - I", "E - A", "O - I", "U - E"], correct: 0,
  vietnamese: "tuốc bin (gió, thủy điện)", phonetic: "/ˈtɜː.baɪn/", exam_task: "Writing Task 1 & Task 2 (Renewable Energy)",
  real_exam_sentence: "Modern wind turbines generate substantial clean energy with zero carbon emissions.",
  common_mistake: "Thí sinh phát âm sai đuôi '-ine' thành /ɪn/ thay vì /aɪn/.",
  explanation: "'Wind turbine' là tuốc-bin gió, từ vựng cốt lõi biểu đồ Task 1 về năng lượng tái tạo."
});
addQ({
  id: "g7_lf_03", grade: 7, grade_label: "Lớp 7", unit: "Unit 1: Hobbies", mode: "letter_fill", band: "5.5", topic: "Lifestyle",
  target_word: "CREATIVITY", masked: "C R E _ T _ V I T Y", missing: ["A", "I"], options: ["A - I", "E - I", "A - E", "O - I"], correct: 0,
  vietnamese: "sự sáng tạo, óc sáng tạo", phonetic: "/ˌkriː.eɪˈtɪv.ə.ti/", exam_task: "Writing Task 2 (Arts & Education)",
  real_exam_sentence: "Artistic hobbies nurture cognitive development and stimulate boundless creativity in children.",
  common_mistake: "Nhầm danh từ 'creativity' với tính từ 'creative' khi làm chủ ngữ câu.",
  explanation: "'Creativity' là phẩm chất sáng tạo không thể thiếu trong giáo dục hiện đại."
});

addQ({
  id: "g8_lf_01", grade: 8, grade_label: "Lớp 8", unit: "Unit 3: Teenagers", mode: "letter_fill", band: "5.5", topic: "Education",
  target_word: "CONCENTRATE", masked: "C O N C _ N T R _ T E", missing: ["E", "A"], options: ["E - A", "A - E", "E - E", "O - A"], correct: 0,
  vietnamese: "tập trung cao độ", phonetic: "/ˈkɒn.sən.treɪt/", exam_task: "Speaking Part 1 & Writing Task 2",
  real_exam_sentence: "Excessive smartphone notifications impair students' capacity to concentrate on complex tasks.",
  common_mistake: "Hay dùng giới từ sai; 'concentrate' luôn đi với giới từ 'on'.",
  explanation: "'Concentrate on' = focus on (tập trung sự chú ý vào điều gì)."
});
addQ({
  id: "g8_lf_02", grade: 8, grade_label: "Lớp 8", unit: "Unit 9: Natural Disasters", mode: "letter_fill", band: "6.0", topic: "Environment",
  target_word: "LANDSLIDE", masked: "L _ N D S L _ D E", missing: ["A", "I"], options: ["A - I", "E - I", "A - E", "O - I"], correct: 0,
  vietnamese: "sạt lở đất đá do bão lũ", phonetic: "/ˈlænd.slaɪd/", exam_task: "Writing Task 2 & Reading",
  real_exam_sentence: "Deforestation on steep slopes triggers devastating landslides following torrential rainfall.",
  common_mistake: "Viết tách thành 2 từ 'land slide' thay vì viết liền 'landslide'.",
  explanation: "'Landslide' (sạt lở đất) là hiểm họa thiên tai phổ biến ở vùng đồi núi."
});
addQ({
  id: "g8_lf_03", grade: 8, grade_label: "Lớp 8", unit: "Unit 6: Lifestyles", mode: "letter_fill", band: "6.0", topic: "Society",
  target_word: "PUNCTUAL", masked: "P _ N C T _ _ L", missing: ["U", "U", "A"], options: ["U - U - A", "A - U - A", "U - O - A", "O - U - E"], correct: 0,
  vietnamese: "đúng giờ, đúng hẹn", phonetic: "/ˈpʌŋk.tʃu.əl/", exam_task: "Speaking Part 1 & Part 2 (Work Ethics)",
  real_exam_sentence: "Being strictly punctual is regarded as a hallmark of professionalism in corporate environments.",
  common_mistake: "Thường dùng cụm 'on time' đơn giản; 'punctual' là tính từ học thuật hơn hẳn.",
  explanation: "'Punctual' miêu tả thói quen luôn luôn đến đúng thời khắc cam kết."
});

addQ({
  id: "g9_lf_01", grade: 9, grade_label: "Lớp 9", unit: "Unit 1: Local Community", mode: "letter_fill", band: "6.0", topic: "Culture",
  target_word: "ARTISAN", masked: "A R T _ S _ N", missing: ["I", "A"], options: ["I - A", "E - A", "I - O", "A - E"], correct: 0,
  vietnamese: "nghệ nhân thủ công lành nghề", phonetic: "/ˌɑː.tɪˈzæn/", exam_task: "Writing Task 2 (Cultural Heritage)",
  real_exam_sentence: "Traditional craft villages rely on master artisans to preserve ancestral pottery techniques.",
  common_mistake: "Nhầm giữa 'artisan' (nghệ nhân làm đồ thủ công) và 'artist' (họa sĩ, nghệ sĩ nghệ thuật).",
  explanation: "'Artisan' là thợ thủ công lành nghề tạo ra các sản phẩm mỹ nghệ truyền thống."
});
addQ({
  id: "g9_lf_02", grade: 9, grade_label: "Lớp 9", unit: "Unit 4: Remembering the Past", mode: "letter_fill", band: "6.5", topic: "Culture",
  target_word: "MONUMENT", masked: "M _ N _ M E N T", missing: ["O", "U"], options: ["O - U", "A - U", "O - O", "U - E"], correct: 0,
  vietnamese: "đài tưởng niệm, tượng đài lịch sử", phonetic: "/ˈmɒn.jə.mənt/", exam_task: "Writing Task 2 & Speaking Part 2",
  real_exam_sentence: "Historical monuments serve as tangible testaments to a nation's architectural heritage.",
  common_mistake: "Viết nhầm nguyên âm thứ hai thành 'moniment'.",
  explanation: "'Monument' chỉ các công trình kiến trúc hoặc tượng đài xây để tưởng niệm nhân vật lịch sử."
});
addQ({
  id: "g9_lf_03", grade: 9, grade_label: "Lớp 9", unit: "Unit 12: Career Choices", mode: "letter_fill", band: "6.5", topic: "Work",
  target_word: "QUALIFICATION", masked: "Q U _ L I F _ C A T I O N", missing: ["A", "I"], options: ["A - I", "E - I", "A - E", "O - A"], correct: 0,
  vietnamese: "bằng cấp, văn bằng chuyên môn", phonetic: "/ˌkwɒl.ɪ.fɪˈkeɪ.ʃən/", exam_task: "Writing Task 2 (Employment & Education)",
  real_exam_sentence: "Formal academic qualifications alone do not guarantee practical workplace competence.",
  common_mistake: "Viết nhầm chính tả chữ cái 'i' sau chữ 'f' thành 'qualifcation'.",
  explanation: "'Qualification' chỉ văn bằng hoặc năng lực chứng nhận đủ tiêu chuẩn hành nghề."
});

addQ({
  id: "g10_lf_01", grade: 10, grade_label: "Lớp 10", unit: "Unit 1: Family Life", mode: "letter_fill", band: "6.5", topic: "Society",
  target_word: "BREADWINNER", masked: "B R E _ D W _ N N E R", missing: ["A", "I"], options: ["A - I", "E - I", "A - E", "E - O"], correct: 0,
  vietnamese: "người trụ cột kinh tế trong gia đình", phonetic: "/ˈbredˌwɪn.ər/", exam_task: "Writing Task 2 (Family & Gender Roles)",
  real_exam_sentence: "In contemporary society, both parents increasingly share the role of primary breadwinner.",
  common_mistake: "Viết thiếu một chữ 'n' trong chữ 'winner'.",
  explanation: "'Breadwinner' là người kiếm thu nhập chính nuôi sống gia đình."
});
addQ({
  id: "g10_lf_02", grade: 10, grade_label: "Lớp 10", unit: "Unit 9: Protecting the Environment", mode: "letter_fill", band: "7.0", topic: "Environment",
  target_word: "BIODIVERSITY", masked: "B I _ D I V _ R S I T Y", missing: ["O", "E"], options: ["O - E", "A - E", "O - I", "U - E"], correct: 0,
  vietnamese: "sự đa dạng sinh học", phonetic: "/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/", exam_task: "Writing Task 2 (Ecosystem Protection)",
  real_exam_sentence: "Conserving global biodiversity is indispensable for maintaining resilient food systems.",
  common_mistake: "Thường phát âm sai trọng âm; trọng âm chính rơi vào âm tiết thứ 4 /vɜː/.",
  explanation: "'Biodiversity loss' là collocation học thuật đắt giá đạt tiêu chuẩn Band 7.0+."
});
addQ({
  id: "g10_lf_03", grade: 10, grade_label: "Lớp 10", unit: "Unit 6: Gender Equality", mode: "letter_fill", band: "7.0", topic: "Society",
  target_word: "DISCRIMINATION", masked: "D _ S C R I M _ N A T I O N", missing: ["I", "I"], options: ["I - I", "E - I", "I - A", "E - E"], correct: 0,
  vietnamese: "sự phân biệt đối xử bất công", phonetic: "/dɪˌskrɪm.ɪˈneɪ.ʃən/", exam_task: "Writing Task 2 (Social Justice)",
  real_exam_sentence: "Stringent anti-bias legislation is paramount to eliminate gender discrimination in employment.",
  common_mistake: "Viết sai chính tả thành 'descrimination'. Luôn bắt đầu bằng tiền tố 'dis-'.",
  explanation: "'Discrimination against somebody' = sự đối xử bất bình đẳng dựa trên giới tính, sắc tộc."
});

addQ({
  id: "g11_lf_01", grade: 11, grade_label: "Lớp 11", unit: "Unit 3: Cities of the Future", mode: "letter_fill", band: "7.0", topic: "Urbanisation",
  target_word: "INFRASTRUCTURE", masked: "I N F R _ S T R _ C T U R E", missing: ["A", "U"], options: ["A - U", "E - O", "A - A", "O - U"], correct: 0,
  vietnamese: "cơ sở hạ tầng (cầu đường, viễn thông)", phonetic: "/ˈɪn.frəˌstrʌk.tʃər/", exam_task: "Writing Task 2 (Urban Development)",
  real_exam_sentence: "Massive state investment in public transport infrastructure alleviates metropolitan gridlock.",
  common_mistake: "Viết nhầm 'infrastucture' (thiếu chữ 'r' sau chữ 't').",
  explanation: "'Infrastructure' là danh từ tập hợp chỉ toàn bộ hệ thống nền tảng giao thông, điện nước của một quốc gia."
});
addQ({
  id: "g11_lf_02", grade: 11, grade_label: "Lớp 11", unit: "Unit 8: Becoming Independent", mode: "letter_fill", band: "7.0", topic: "Education",
  target_word: "SELF-RELIANT", masked: "S _ L F - R _ L I A N T", missing: ["E", "E"], options: ["E - E", "A - E", "E - I", "I - E"], correct: 0,
  vietnamese: "tự lực cánh sinh, tự chủ độc lập", phonetic: "/ˌself.rɪˈlaɪ.ənt/", exam_task: "Writing Task 2 (Parenting & Youth)",
  real_exam_sentence: "Encouraging adolescents to earn modest stipends empowers them to become self-reliant.",
  common_mistake: "Nhầm đuôi tính từ '-iant' thành '-ient'.",
  explanation: "'Self-reliant' = độc lập tự lo được cho bản thân mà không cần phụ thuộc người khác."
});
addQ({
  id: "g11_lf_03", grade: 11, grade_label: "Lớp 11", unit: "Unit 7: Education Options", mode: "letter_fill", band: "7.0", topic: "Education",
  target_word: "APPRENTICESHIP", masked: "A P P R _ N T _ C E S H I P", missing: ["E", "I"], options: ["E - I", "A - I", "E - E", "I - A"], correct: 0,
  vietnamese: "chế độ vừa học vừa làm, thời gian học nghề", phonetic: "/əˈpren.tɪs.ʃɪp/", exam_task: "Writing Task 2 (Higher vs Vocational Education)",
  real_exam_sentence: "Vocational apprenticeships equip non-academic school leavers with marketable technical skills.",
  common_mistake: "Thường thiếu một chữ 'p' ở đầu hoặc sai nguyên âm '-ti-' thành '-te-'.",
  explanation: "'Apprenticeship' là hình thức đào tạo nghề thực chiến cực kỳ thịnh hành ở các nước phát triển."
});

addQ({
  id: "g12_lf_01", grade: 12, grade_label: "Lớp 12", unit: "Unit 1: Life Stories We Admire", mode: "letter_fill", band: "7.0", topic: "Society",
  target_word: "PERSEVERANCE", masked: "P _ R S E V _ R A N C E", missing: ["E", "E"], options: ["E - E", "A - E", "E - A", "I - E"], correct: 0,
  vietnamese: "sự kiên trì, nhẫn nại bền bỉ", phonetic: "/ˌpɜː.sɪˈvɪə.rəns/", exam_task: "Speaking Part 2 & Writing Task 2",
  real_exam_sentence: "Her relentless perseverance in the face of acute hardship exemplifies true moral fortitude.",
  common_mistake: "Hay nhầm đuôi danh từ '-ance' thành '-ence'.",
  explanation: "'Perseverance' chỉ phẩm chất kiên trì theo đuổi mục tiêu dù gặp muôn vàn gian nan."
});
addQ({
  id: "g12_lf_02", grade: 12, grade_label: "Lớp 12", unit: "Unit 6: Artificial Intelligence", mode: "letter_fill", band: "7.5", topic: "Technology",
  target_word: "ALGORITHM", masked: "A L G _ R _ T H M", missing: ["O", "I"], options: ["O - I", "A - E", "O - E", "U - I"], correct: 0,
  vietnamese: "thuật toán vi tính, chuỗi xử lý logic", phonetic: "/ˈæl.ɡə.rɪ.ðəm/", exam_task: "Writing Task 2 (Artificial Intelligence)",
  real_exam_sentence: "Predictive algorithms analyze vast datasets to anticipate consumer purchasing trends with pinpoint accuracy.",
  common_mistake: "Viết sai chính tả chữ 'rithm' thành 'rythm' (nhầm sang rhythm - giai điệu).",
  explanation: "'Algorithm' là thuật toán máy tính, chủ đề công nghệ cốt lõi trong IELTS Band 7.5+."
});
addQ({
  id: "g12_lf_03", grade: 12, grade_label: "Lớp 12", unit: "Unit 3: Green Living", mode: "letter_fill", band: "7.5", topic: "Environment",
  target_word: "BIODEGRADABLE", masked: "B I O D _ G R _ D A B L E", missing: ["E", "A"], options: ["E - A", "A - E", "E - E", "I - A"], correct: 0,
  vietnamese: "có khả năng phân hủy sinh học tự nhiên", phonetic: "/ˌbaɪ.əʊ.dɪˈɡreɪ.də.bəl/", exam_task: "Writing Task 2 (Waste Management)",
  real_exam_sentence: "Replacing petroleum plastics with biodegradable biopolymers curbs long-term landfill contamination.",
  common_mistake: "Viết thiếu tiếp đầu ngữ 'bio-' hoặc nhầm đuôi '-able' thành '-ible'.",
  explanation: "'Biodegradable material' phân hủy vi sinh an toàn, từ vựng học thuật điểm sáng cho bài Writing môi trường."
});

// ==========================================
// 2. MEANING MATCH (21 QUESTIONS: 3 per Grade 6..12)
// ==========================================
addQ({
  id: "g6_mm_01", grade: 6, grade_label: "Lớp 6", unit: "Unit 5: Natural Wonders of Viet Nam", mode: "meaning_match", band: "5.0", topic: "Nature",
  target_word: "waterfall", prompt: "Từ tiếng Anh nào có nghĩa là: 'Thác nước tự nhiên hùng vĩ'?",
  options: ["waterfall", "volcano", "desert", "stream"], correct: 0,
  vietnamese: "thác nước hùng vĩ", phonetic: "/ˈwɔː.tə.fɔːl/", exam_task: "Speaking Part 1 (Places & Nature)",
  real_exam_sentence: "Viet Nam is celebrated for pristine natural wonders, including breathtaking waterfalls.",
  common_mistake: "Nhầm 'waterfall' (thác nước) với 'water fountain' (đài phun nước nhân tạo).",
  explanation: "'Waterfall' là thác nước tự nhiên đổ từ trên cao xuống."
});
addQ({
  id: "g6_mm_02", grade: 6, grade_label: "Lớp 6", unit: "Unit 9: Cities of the World", mode: "meaning_match", band: "5.0", topic: "Culture",
  target_word: "landmark", prompt: "Từ tiếng Anh nào có nghĩa là: 'Công trình biểu tượng đặc trưng của một thành phố'?",
  options: ["landmark", "highway", "factory", "suburb"], correct: 0,
  vietnamese: "công trình biểu tượng, thắng cảnh nổi tiếng", phonetic: "/ˈlænd.mɑːk/", exam_task: "Speaking Part 2 (Describe a City)",
  real_exam_sentence: "The Eiffel Tower stands as the most iconic historical landmark in Paris.",
  common_mistake: "Thí sinh hay dùng từ 'famous building'; dùng 'landmark' chuẩn học thuật hơn nhiều.",
  explanation: "'Landmark' chỉ các công trình hoặc thắng cảnh dễ nhận biết đại diện cho một vùng đất."
});
addQ({
  id: "g6_mm_03", grade: 6, grade_label: "Lớp 6", unit: "Unit 12: Robots", mode: "meaning_match", band: "5.0", topic: "Technology",
  target_word: "housework", prompt: "Từ tiếng Anh nào có nghĩa là: 'Công việc nội trợ, dọn dẹp nhà cửa'?",
  options: ["housework", "homework", "craftwork", "network"], correct: 0,
  vietnamese: "công việc nội trợ gia đình", phonetic: "/ˈhaʊs.wɜːk/", exam_task: "Speaking Part 1 (Family Life)",
  real_exam_sentence: "Robotic vacuum cleaners relieve busy working parents of strenuous daily housework.",
  common_mistake: "Nhầm lẫn giữa 'housework' (việc nhà: quét dọn, nấu nướng) và 'homework' (bài tập về nhà).",
  explanation: "'Housework' là danh từ không đếm được chỉ toàn bộ công việc lau dọn nội trợ."
});

addQ({
  id: "g7_mm_01", grade: 7, grade_label: "Lớp 7", unit: "Unit 2: Healthy Living", mode: "meaning_match", band: "5.5", topic: "Health",
  target_word: "sunburn", prompt: "Từ tiếng Anh nào có nghĩa là: 'Vết cháy nắng, tổn thương da do tia cực tím'?",
  options: ["sunburn", "allergy", "infection", "headache"], correct: 0,
  vietnamese: "sự cháy nắng, sạm rát da", phonetic: "/ˈsʌn.bɜːn/", exam_task: "Speaking Part 1 (Health & Habits)",
  real_exam_sentence: "Wearing broad-spectrum sunscreen prevents painful sunburn and reduces skin cancer risks.",
  common_mistake: "Nhầm danh từ 'sunburn' với động từ 'tanning' (nhuộm da nâu có chủ đích).",
  explanation: "'Sunburn' là tình trạng da bị tổn thương đỏ rát do tiếp xúc bức xạ mặt trời kéo dài."
});
addQ({
  id: "g7_mm_02", grade: 7, grade_label: "Lớp 7", unit: "Unit 7: Traffic", mode: "meaning_match", band: "5.5", topic: "Urbanisation",
  target_word: "pavement", prompt: "Từ tiếng Anh nào có nghĩa là: 'Vỉa hè dành cho người đi bộ ven đường'?",
  options: ["pavement", "crossroad", "roundabout", "expressway"], correct: 0,
  vietnamese: "vỉa hè dành cho người đi bộ (British English)", phonetic: "/ˈpeɪv.mənt/", exam_task: "Writing Task 2 (Urban Infrastructure)",
  real_exam_sentence: "Unobstructed pavements encourage urban commuters to walk instead of driving private cars.",
  common_mistake: "Tiếng Anh-Mỹ gọi vỉa hè là 'sidewalk'; trong Anh-Anh gọi là 'pavement'.",
  explanation: "'Pavement' là lối đi bộ lát gạch hoặc bê-tông nằm hai bên lòng đường."
});
addQ({
  id: "g7_mm_03", grade: 7, grade_label: "Lớp 7", unit: "Unit 11: Travelling in the Future", mode: "meaning_match", band: "5.5", topic: "Transport",
  target_word: "flying car", prompt: "Phương tiện giao thông viễn tưởng nào chỉ: 'Ô tô bay trên bầu trời giảm tải tắc đường'?",
  options: ["flying car", "subway train", "cargo vessel", "bullet train"], correct: 0,
  vietnamese: "ô tô bay tương lai", phonetic: "/ˈflaɪ.ɪŋ kɑːr/", exam_task: "Speaking Part 3 (Future Transport)",
  real_exam_sentence: "Innovators envision autonomous flying cars operating along designated aerial transit corridors.",
  common_mistake: "Phát âm sai cụm từ.",
  explanation: "'Flying cars' (eVTOL) là giải pháp vận tải trên không tương lai."
});

addQ({
  id: "g8_mm_01", grade: 8, grade_label: "Lớp 8", unit: "Unit 4: Ethnic Groups of Viet Nam", mode: "meaning_match", band: "5.5", topic: "Culture",
  target_word: "communal house", prompt: "Từ tiếng Anh nào có nghĩa là: 'Nhà rông / đình làng sinh hoạt cộng đồng'?",
  options: ["communal house", "skyscraper", "villa", "cottage"], correct: 0,
  vietnamese: "nhà rông sinh hoạt cộng đồng, đình làng", phonetic: "/ˈkɒm.jə.nəl haʊs/", exam_task: "Speaking Part 2 (Traditional Culture)",
  real_exam_sentence: "The communal house functions as the focal spiritual and social centre of highland villages.",
  common_mistake: "Dịch word-by-word thành 'public house' (sẽ bị hiểu nhầm là quán rượu - pub).",
  explanation: "'Communal house' miêu tả ngôi nhà chung dùng cho hội họp và sinh hoạt lễ hội cộng đồng."
});
addQ({
  id: "g8_mm_02", grade: 8, grade_label: "Lớp 8", unit: "Unit 5: Our Customs and Traditions", mode: "meaning_match", band: "6.0", topic: "Culture",
  target_word: "ancestor", prompt: "Từ tiếng Anh nào có nghĩa là: 'Tổ tiên, ông bà tiền nhân thế hệ trước'?",
  options: ["ancestor", "descendant", "acquaintance", "neighbor"], correct: 0,
  vietnamese: "tổ tiên, tiền nhân", phonetic: "/ˈæn.ses.tər/", exam_task: "Speaking Part 2 (Family Customs)",
  real_exam_sentence: "Paying homage to deceased ancestors during the Lunar New Year is deeply rooted in Asian traditions.",
  common_mistake: "Nhầm 'ancestor' (tổ tiên) với 'descendant' (hậu duệ, con cháu đời sau).",
  explanation: "'Ancestor' chỉ những người thuộc các thế hệ đi trước trong dòng họ gia đình."
});
addQ({
  id: "g8_mm_03", grade: 8, grade_label: "Lớp 8", unit: "Unit 8: Shopping", mode: "meaning_match", band: "5.5", topic: "Lifestyle",
  target_word: "bargain", prompt: "Từ tiếng Anh nào có nghĩa là: 'Món hàng mua được với giá hời / sự mặc cả giá'?",
  options: ["bargain", "deficit", "penalty", "mortgage"], correct: 0,
  vietnamese: "món hàng giá hời / mặc cả", phonetic: "/ˈbɑː.ɡɪn/", exam_task: "Speaking Part 1 (Shopping Habits)",
  real_exam_sentence: "Savvy shoppers frequent flea markets in search of exceptional vintage bargains.",
  common_mistake: "Phát âm sai âm tiết thứ 2 thành /ɡeɪn/; phát âm chuẩn là /ˈbɑː.ɡɪn/.",
  explanation: "'Bargain' vừa là danh từ (món hời) vừa là động từ (mặc cả giá cả)."
});

addQ({
  id: "g9_mm_01", grade: 9, grade_label: "Lớp 9", unit: "Unit 2: City Life", mode: "meaning_match", band: "6.0", topic: "Urbanisation",
  target_word: "concrete jungle", prompt: "Cụm từ tiếng Anh nào miêu tả ẩn dụ: 'Khu rừng bê tông / đô thị ngột ngạt toàn nhà cao tầng'?",
  options: ["concrete jungle", "green oasis", "sprawling rural area", "pristine wilderness"], correct: 0,
  vietnamese: "rừng bê tông (ẩn dụ khu đô thị cao ốc chật chội)", phonetic: "/ˌkɒŋ.kriːt ˈdʒʌŋ.ɡəl/", exam_task: "Writing Task 2 (Urban Living)",
  real_exam_sentence: "Living in a dense concrete jungle without recreational parks induces persistent psychological strain.",
  common_mistake: "Dùng từ này như một thuật ngữ khoa học; đây là một idiom/metaphor miêu tả đô thị.",
  explanation: "'Concrete jungle' là cách nói hình tượng cực kỳ sinh động trong Speaking và Writing."
});
addQ({
  id: "g9_mm_02", grade: 9, grade_label: "Lớp 9", unit: "Unit 8: Tourism", mode: "meaning_match", band: "6.5", topic: "Travel",
  target_word: "itinerary", prompt: "Từ tiếng Anh nào có nghĩa là: 'Lịch trình chi tiết của một chuyến đi'?",
  options: ["itinerary", "brochure", "boarding pass", "receipt"], correct: 0,
  vietnamese: "lịch trình chuyến đi chi tiết", phonetic: "/aɪˈtɪn.ər.ər.i/", exam_task: "Speaking Part 1 & Writing Task 1",
  real_exam_sentence: "A well-structured travel itinerary allows tourists to optimize their sightseeing time efficiently.",
  common_mistake: "Nhầm cách đọc; âm đầu đọc là /aɪ/ thay vì /ɪ/.",
  explanation: "'Itinerary' là kế hoạch lịch trình liệt kê cụ thể các địa điểm và giờ giấc di chuyển."
});
addQ({
  id: "g9_mm_03", grade: 9, grade_label: "Lớp 9", unit: "Unit 6: Vietnamese Lifestyles", mode: "meaning_match", band: "6.0", topic: "Family",
  target_word: "nuclear family", prompt: "Thuật ngữ xã hội học nào chỉ: 'Gia đình hạt nhân chỉ gồm bố mẹ và con cái'?",
  options: ["nuclear family", "extended family", "single-parent tribe", "communal clan"], correct: 0,
  vietnamese: "gia đình hạt nhân (bố mẹ và con cái)", phonetic: "/ˌnjuː.kliː.ə ˈfæm.əl.i/", exam_task: "Writing Task 2 (Family Structure)",
  real_exam_sentence: "The shift towards nuclear families in urban centres fosters independence but diminishes extended eldercare.",
  common_mistake: "Nhầm 'nuclear family' với 'extended family' (đại gia đình tam, tứ đại đồng đường).",
  explanation: "'Nuclear family' là mô hình gia đình cơ bản hai thế hệ."
});

addQ({
  id: "g10_mm_01", grade: 10, grade_label: "Lớp 10", unit: "Unit 2: Humans and the Environment", mode: "meaning_match", band: "6.5", topic: "Environment",
  target_word: "carbon footprint", prompt: "Thuật ngữ tiếng Anh nào có nghĩa là: 'Lượng phát thải khí nhà kính (dấu chân carbon) do cá nhân tạo ra'?",
  options: ["carbon footprint", "ozone depletion", "fossil deposit", "thermal radiation"], correct: 0,
  vietnamese: "dấu chân carbon (tổng lượng khí CO2 phát thải)", phonetic: "/ˌkɑː.bən ˈfʊt.prɪnt/", exam_task: "Writing Task 2 (Climate Change)",
  real_exam_sentence: "Adopting a plant-based diet is an effective individual strategy to shrink one's carbon footprint.",
  common_mistake: "Dịch sai nghĩa thành vết chân trên than củi.",
  explanation: "'Carbon footprint' là thước đo môi trường quy chuẩn đo lượng khí nhà kính phát thải."
});
addQ({
  id: "g10_mm_02", grade: 10, grade_label: "Lớp 10", unit: "Unit 8: New Ways to Learn", mode: "meaning_match", band: "6.5", topic: "Education",
  target_word: "blended learning", prompt: "Thuật ngữ giáo dục nào chỉ: 'Mô hình học tập kết hợp giữa lớp học trực tiếp và trực tuyến'?",
  options: ["blended learning", "rote memorization", "distance tutoring", "isolated schooling"], correct: 0,
  vietnamese: "học tập kết hợp (trực tiếp và trực tuyến)", phonetic: "/ˌblen.dɪd ˈlɜː.nɪŋ/", exam_task: "Writing Task 2 (Education Technology)",
  real_exam_sentence: "Blended learning combines face-to-face classroom engagement with versatile digital self-study modules.",
  common_mistake: "Nhầm 'blended learning' với 'online learning' thuần túy.",
  explanation: "'Blended learning' là mô hình lai (hybrid) tích hợp cả hai phương thức học tập."
});
addQ({
  id: "g10_mm_03", grade: 10, grade_label: "Lớp 10", unit: "Unit 10: Ecotourism", mode: "meaning_match", band: "7.0", topic: "Travel",
  target_word: "ecotourism", prompt: "Từ tiếng Anh nào có nghĩa là: 'Du lịch sinh thái có trách nhiệm với thiên nhiên và văn hóa bản địa'?",
  options: ["ecotourism", "mass tourism", "commercial voyage", "resort lodging"], correct: 0,
  vietnamese: "du lịch sinh thái bền vững", phonetic: "/ˈiː.kəʊˌtʊə.rɪ.zəm/", exam_task: "Writing Task 2 (Tourism & Environment)",
  real_exam_sentence: "Genuine ecotourism funnels financial revenue directly into local rainforest conservation projects.",
  common_mistake: "Nhầm với 'mass tourism' (du lịch đại trà gây ô nhiễm).",
  explanation: "'Ecotourism' nhấn mạnh việc bảo tồn cảnh quan và tôn trọng đời sống cư dân bản địa."
});

addQ({
  id: "g11_mm_01", grade: 11, grade_label: "Lớp 11", unit: "Unit 1: A Long and Healthy Life", mode: "meaning_match", band: "7.0", topic: "Health",
  target_word: "life expectancy", prompt: "Thuật ngữ nhân khẩu học nào chỉ: 'Tuổi thọ trung bình kỳ vọng của một quần thể người'?",
  options: ["life expectancy", "infant mortality", "growth rate", "population density"], correct: 0,
  vietnamese: "tuổi thọ trung bình kỳ vọng", phonetic: "/ˈlaɪf ɪkˌspek.tən.si/", exam_task: "Writing Task 1 & Task 2 (Demographics)",
  real_exam_sentence: "Advancements in medical biotechnology have elevated the national life expectancy beyond eighty years.",
  common_mistake: "Nhầm 'life expectancy' với 'lifespan' (giới hạn sinh học tối đa của một loài).",
  explanation: "'Average life expectancy' là chỉ số thống kê chuẩn trong bảng số liệu Task 1."
});
addQ({
  id: "g11_mm_02", grade: 11, grade_label: "Lớp 11", unit: "Unit 2: The Generation Gap", mode: "meaning_match", band: "6.5", topic: "Society",
  target_word: "generation gap", prompt: "Khái niệm xã hội nào chỉ: 'Khoảng cách thế hệ về quan điểm và tư tưởng sống'?",
  options: ["generation gap", "wealth divide", "digital divide", "gender bias"], correct: 0,
  vietnamese: "khoảng cách thế hệ (giữa cha mẹ và con cái)", phonetic: "/dʒen.əˈreɪ.ʃən ɡæp/", exam_task: "Writing Task 2 & Speaking Part 3",
  real_exam_sentence: "Open familial dialogue bridges the generation gap regarding career expectations and modern lifestyles.",
  common_mistake: "Thường dùng từ ngữ dài dòng; dùng danh từ 'generation gap' gọn gàng súc tích.",
  explanation: "'Generation gap' miêu tả sự khác biệt sâu sắc trong tư duy giữa các thế hệ."
});
addQ({
  id: "g11_mm_03", grade: 11, grade_label: "Lớp 11", unit: "Unit 3: Cities of the Future", mode: "meaning_match", band: "7.0", topic: "Urbanisation",
  target_word: "liveable", prompt: "Tính từ tiếng Anh nào có nghĩa là: 'Đáng sống, có chất lượng môi trường sống tuyệt vời'?",
  options: ["liveable", "overcrowded", "uninhabitable", "derelict"], correct: 0,
  vietnamese: "đáng sống, môi trường sống tiện nghi", phonetic: "/ˈlɪv.ə.bəl/", exam_task: "Writing Task 2 (Urban Planning)",
  real_exam_sentence: "Investing in green public spaces transforms congested metropolises into truly liveable communities.",
  common_mistake: "Viết sai chính tả thành 'livable' hoặc 'liveable' (cả 2 đều đúng nhưng cần thống nhất).",
  explanation: "'Liveable city' (thành phố đáng sống) là tiêu chí xếp hạng đô thị quốc tế."
});

addQ({
  id: "g12_mm_01", grade: 12, grade_label: "Lớp 12", unit: "Unit 1: Life Stories We Admire", mode: "meaning_match", band: "7.0", topic: "Psychology",
  target_word: "resilient", prompt: "Tính từ tiếng Anh nào có nghĩa là: 'Kiên cường, có khả năng phục hồi nhanh sau nghịch cảnh'?",
  options: ["resilient", "fragile", "hesitant", "pessimistic"], correct: 0,
  vietnamese: "kiên cường, nhanh chóng bật dậy sau thất bại", phonetic: "/rɪˈzɪl.i.ənt/", exam_task: "Speaking Part 2 & Writing Task 2",
  real_exam_sentence: "Resilient entrepreneurs view unforeseen commercial setbacks as invaluable learning curves.",
  common_mistake: "Nhầm 'resilient' (kiên cường) với 'stubborn' (cứng đầu, bảo thủ tiêu cực).",
  explanation: "'Resilient' là phẩm chất kiên cường phục hồi tích cực cực kỳ được đánh giá cao."
});
addQ({
  id: "g12_mm_02", grade: 12, grade_label: "Lớp 12", unit: "Unit 2: A Multicultural World", mode: "meaning_match", band: "7.0", topic: "Society",
  target_word: "multicultural", prompt: "Từ tiếng Anh nào chỉ: 'Môi trường đa văn hóa với sự chung sống hòa hợp của nhiều sắc tộc'?",
  options: ["multicultural", "homogeneous", "provincial", "monolingual"], correct: 0,
  vietnamese: "đa văn hóa, đa sắc tộc", phonetic: "/ˌmʌl.tiˈkʌl.tʃər.əl/", exam_task: "Writing Task 2 (Globalisation & Society)",
  real_exam_sentence: "A multicultural society flourishes when citizens celebrate ethnic diversity and mutual understanding.",
  common_mistake: "Phát âm sai tiền tố 'multi-' thành /mʌlti/ hay /mʌltaɪ/.",
  explanation: "'Multicultural society' là chủ đề kinh điển trong các đề thi IELTS Writing Task 2."
});
addQ({
  id: "g12_mm_03", grade: 12, grade_label: "Lớp 12", unit: "Unit 4: Urbanisation", mode: "meaning_match", band: "7.5", topic: "Urbanisation",
  target_word: "urbanisation", prompt: "Thuật ngữ học thuật nào chỉ: 'Quá trình đô thị hóa nông thôn và làn sóng di cư vào các thành phố'?",
  options: ["urbanisation", "deforestation", "reforestation", "globalisation"], correct: 0,
  vietnamese: "quá trình đô thị hóa", phonetic: "/ˌɜː.bən.aɪˈzeɪ.ʃən/", exam_task: "Writing Task 2 (Urbanisation Trends)",
  real_exam_sentence: "Rapid urbanisation in developing territories exerts immense pressure on municipal drainage systems.",
  common_mistake: "Viết nhầm đuôi Anh-Anh '-isation' và Anh-Mỹ '-ization'. Cả hai đều được chấp nhận.",
  explanation: "'Urbanisation' là chủ đề trung tâm của Unit 4 Tiếng Anh 12 và đề thi Cambridge IELTS."
});

// ==========================================
// 3. COLLOCATION (21 QUESTIONS: 3 per Grade 6..12)
// ==========================================
addQ({
  id: "g6_col_01", grade: 6, grade_label: "Lớp 6", unit: "Unit 1: My New School", mode: "collocation", band: "5.0", topic: "Education",
  target_word: "do homework", prompt: "Chọn động từ kết hợp tự nhiên (Collocation):",
  sentence: "Students should rigorously _______ their homework before attending classes.",
  options: ["do", "make", "create", "construct"], correct: 0,
  vietnamese: "làm bài tập về nhà", phonetic: "/duː ˈhəʊm.wɜːk/", exam_task: "Speaking Part 1 (Study Habits)",
  real_exam_sentence: "Establishing a daily routine to do homework systematically enhances long-term academic recall.",
  common_mistake: "Thí sinh Việt Nam cực kỳ hay nhầm thành 'make homework'. Phải luôn dùng 'DO homework'.",
  explanation: "'Do homework' là collocation chuẩn mực tuyệt đối trong tiếng Anh."
});
addQ({
  id: "g6_col_02", grade: 6, grade_label: "Lớp 6", unit: "Unit 11: Our Greener World", mode: "collocation", band: "5.5", topic: "Environment",
  target_word: "reduce pollution", prompt: "Chọn động từ phù hợp hoàn chỉnh Collocation:",
  sentence: "Transitioning to electric buses is an efficacious way to _______ air pollution.",
  options: ["reduce", "dismiss", "collapse", "dismantle"], correct: 0,
  vietnamese: "cắt giảm ô nhiễm không khí", phonetic: "/rɪˈdjuːs pəˈluː.ʃən/", exam_task: "Writing Task 2 (Environment)",
  real_exam_sentence: "Urban transport electrification enables municipal leaders to reduce air pollution drastically.",
  common_mistake: "Dùng từ 'lower' hoặc 'drop' cho danh từ pollution; collocation tự nhiên là 'reduce pollution'.",
  explanation: "'Reduce pollution' nằm trong quy tắc 3R nổi tiếng (Reduce, Reuse, Recycle)."
});
addQ({
  id: "g6_col_03", grade: 6, grade_label: "Lớp 6", unit: "Unit 8: Sports and Games", mode: "collocation", band: "5.0", topic: "Sports",
  target_word: "play badminton", prompt: "Chọn động từ thể thao chuẩn xác:",
  sentence: "Children should regularly _______ badminton to sharpen hand-eye coordination and cardiovascular stamina.",
  options: ["play", "do", "go", "make"], correct: 0,
  vietnamese: "chơi môn cầu lông", phonetic: "/pleɪ ˈbæd.mɪn.tən/", exam_task: "Speaking Part 1 (Physical Activity)",
  real_exam_sentence: "Young students who play badminton daily display enhanced reflexes and aerobic fitness.",
  common_mistake: "Dùng 'do badminton' hoặc 'go badminton'. Quy tắc: Môn có bóng/vợt dùng 'PLAY'.",
  explanation: "Quy tắc vàng: PLAY với môn đối kháng/có bóng, GO với môn đuôi -ing, DO với võ thuật/thể dục dụng cụ."
});

addQ({
  id: "g7_col_01", grade: 7, grade_label: "Lớp 7", unit: "Unit 3: Community Service", mode: "collocation", band: "5.5", topic: "Society",
  target_word: "raise funds", prompt: "Chọn động từ ghép collocation học thuật:",
  sentence: "The student union organised a charity marathon to _______ funds for underprivileged children.",
  options: ["raise", "rise", "arise", "lift"], correct: 0,
  vietnamese: "gây quỹ từ thiện", phonetic: "/reɪz fʌndz/", exam_task: "Writing Task 2 (Charity & Society)",
  real_exam_sentence: "Grassroots organisations collaborate to raise funds for disaster relief operations.",
  common_mistake: "Nhầm lẫn giữa ngoại động từ 'raise' và nội động từ 'rise' (rise không nhận tân ngữ).",
  explanation: "'Raise funds / money for charity' = vận động quyên góp kinh phí cứu trợ."
});
addQ({
  id: "g7_col_02", grade: 7, grade_label: "Lớp 7", unit: "Unit 10: Energy Sources", mode: "collocation", band: "6.0", topic: "Environment",
  target_word: "generate electricity", prompt: "Chọn động từ đi cùng danh từ 'electricity':",
  sentence: "Offshore wind turbines _______ clean electricity without consuming depleted fossil reserves.",
  options: ["generate", "fabricate", "invent", "simulate"], correct: 0,
  vietnamese: "sản xuất / phát điện năng", phonetic: "/ˈdʒen.ə.reɪt ɪˌlekˈtrɪs.ə.ti/", exam_task: "Writing Task 1 & Task 2 (Energy)",
  real_exam_sentence: "Hydroelectric dams generate electricity by harnessing the gravitational kinetic force of cascading water.",
  common_mistake: "Dùng từ 'make electricity' (văn nói thông thường); 'generate electricity' là collocation học thuật chuẩn.",
  explanation: "'Generate electricity / power' là thuật ngữ kỹ thuật chỉ việc tạo ra dòng điện."
});
addQ({
  id: "g7_col_03", grade: 7, grade_label: "Lớp 7", unit: "Unit 2: Healthy Living", mode: "collocation", band: "5.5", topic: "Health",
  target_word: "take exercise", prompt: "Chọn động từ collocation chỉ việc tập luyện:",
  sentence: "Physicians advise adults to _______ moderate exercise for at least thirty minutes each morning.",
  options: ["take", "make", "create", "manufacture"], correct: 0,
  vietnamese: "tập luyện thể dục thể thao", phonetic: "/teɪk ˈek.sə.saɪz/", exam_task: "Speaking Part 1 & Writing Task 2 (Health)",
  real_exam_sentence: "Sedentary office clerks who take regular exercise experience substantially fewer back ailments.",
  common_mistake: "Thí sinh hay dùng 'make exercise'; tiếng Anh chuẩn là 'do exercise' hoặc 'take exercise'.",
  explanation: "'Take / do exercise' là cụm collocation tự nhiên diễn đạt việc rèn luyện thể chất."
});

addQ({
  id: "g8_col_01", grade: 8, grade_label: "Lớp 8", unit: "Unit 3: Teenagers", mode: "collocation", band: "6.0", topic: "Psychology",
  target_word: "face peer pressure", prompt: "Chọn động từ tạo collocation chuẩn:",
  sentence: "Adolescents frequently _______ severe peer pressure to conform to superficial trends.",
  options: ["face", "stare", "glance", "watch"], correct: 0,
  vietnamese: "đối mặt với áp lực đồng trang lứa", phonetic: "/feɪs pɪər ˈpreʃ.ər/", exam_task: "Writing Task 2 (Youth & Social Behavior)",
  real_exam_sentence: "Many high school students face acute peer pressure that detrimentally influences their self-esteem.",
  common_mistake: "Dùng từ 'meet pressure'; tiếng Anh bắt buộc dùng 'face / succumb to peer pressure'.",
  explanation: "'Face peer pressure' = đối mặt trực diện với áp lực từ bạn bè cùng lứa."
});
addQ({
  id: "g8_col_02", grade: 8, grade_label: "Lớp 8", unit: "Unit 7: Environmental Protection", mode: "collocation", band: "6.5", topic: "Environment",
  target_word: "endangered species", prompt: "Chọn tính từ kết hợp với 'species' trong cụm từ bảo tồn:",
  sentence: "Strict conservation laws shield _______ species from commercial poaching and habitat loss.",
  options: ["endangered", "hazardous", "perilous", "risky"], correct: 0,
  vietnamese: "các loài có nguy cơ tuyệt chủng", phonetic: "/ɪnˈdeɪn.dʒəd ˈspiː.ʃiːz/", exam_task: "Writing Task 2 (Wildlife Preservation)",
  real_exam_sentence: "Protecting endangered species preserves fragile trophic webs within tropical rainforests.",
  common_mistake: "Nhầm 'dangerous' (nguy hiểm cho kẻ khác) với 'endangered' (chính mình bị lâm nguy).",
  explanation: "'Endangered species' là thuật ngữ quốc tế trong Sách Đỏ về bảo tồn sinh vật."
});
addQ({
  id: "g8_col_03", grade: 8, grade_label: "Lớp 8", unit: "Unit 11: Science and Technology", mode: "collocation", band: "6.0", topic: "Science",
  target_word: "carry out an experiment", prompt: "Chọn động từ collocation đi với 'experiment':",
  sentence: "Postgraduate researchers meticulously _______ an experiment to test the novel synthetic antibiotic.",
  options: ["carry out", "make up", "bring about", "give away"], correct: 0,
  vietnamese: "tiến hành một thí nghiệm khoa học", phonetic: "/ˌkær.i aʊt ən ɪkˈsper.ɪ.mənt/", exam_task: "Writing Task 2 (Scientific Innovation)",
  real_exam_sentence: "Biologists carry out controlled experiments to verify how rising salinity affects aquatic larvae.",
  common_mistake: "Dùng 'make an experiment'; trong nghiên cứu khoa học bắt buộc dùng 'carry out / conduct an experiment'.",
  explanation: "'Carry out / conduct an experiment' là collocation học thuật chuẩn mực trong IELTS Reading & Writing."
});

addQ({
  id: "g9_col_01", grade: 9, grade_label: "Lớp 9", unit: "Unit 2: City Life", mode: "collocation", band: "6.5", topic: "Urbanisation",
  target_word: "traffic congestion", prompt: "Chọn danh từ hoàn thiện cụm collocation:",
  sentence: "Constructing subterranean metro lines relieves severe traffic _______ in megacities.",
  options: ["congestion", "assembly", "flock", "cluster"], correct: 0,
  vietnamese: "ùn tắc giao thông nghiêm trọng", phonetic: "/ˈtræf.ɪk kənˈdʒes.tʃən/", exam_task: "Writing Task 2 (Urban Infrastructure)",
  real_exam_sentence: "Heavy traffic congestion costs metropolitan economies billions in lost productive hours annually.",
  common_mistake: "Thí sinh chỉ dùng từ 'traffic jam'; 'traffic congestion' mang sắc thái học thuật và formal hơn hẳn.",
  explanation: "'Traffic congestion' = sự tắc nghẽn lưu thông phương tiện giao thông."
});
addQ({
  id: "g9_col_02", grade: 9, grade_label: "Lớp 9", unit: "Unit 4: Remembering the Past", mode: "collocation", band: "6.5", topic: "Culture",
  target_word: "preserve heritage", prompt: "Chọn động từ học thuật đi cùng danh từ 'heritage':",
  sentence: "The local council formulated urgent measures to _______ historical heritage across the province.",
  options: ["preserve", "reserve", "conserve", "contain"], correct: 0,
  vietnamese: "bảo tồn di sản lịch sử", phonetic: "/prɪˈzɜːv ˈher.ɪ.tɪdʒ/", exam_task: "Writing Task 2 (Cultural Preservation)",
  real_exam_sentence: "Government subsidies enable indigenous communities to preserve cultural heritage for upcoming generations.",
  common_mistake: "Nhầm 'preserve' (bảo tồn nguyên trạng di sản) với 'reserve' (đặt chỗ trước).",
  explanation: "'Preserve cultural / architectural heritage' là cụm từ ghi điểm then chốt trong IELTS Writing."
});
addQ({
  id: "g9_col_03", grade: 9, grade_label: "Lớp 9", unit: "Unit 2: City Life", mode: "collocation", band: "6.0", topic: "Transport",
  target_word: "public transport", prompt: "Chọn tính từ hoàn chỉnh cụm giao thông công cộng:",
  sentence: "Subsidising _______ transport encourages private car owners to leave vehicles at home.",
  options: ["public", "private", "personal", "secret"], correct: 0,
  vietnamese: "hệ thống giao thông công cộng", phonetic: "/ˌpʌb.lɪk ˈtræn.spɔːt/", exam_task: "Writing Task 2 (City Infrastructure)",
  real_exam_sentence: "Efficient public transport networks alleviate atmospheric carbon emissions and roadside congestion.",
  common_mistake: "Viết sai chính tả thành 'transpot'.",
  explanation: "'Public transport' (xe buýt, tàu điện ngầm) là giải pháp hàng đầu trong bài luận quy hoạch đô thị."
});

addQ({
  id: "g10_col_01", grade: 10, grade_label: "Lớp 10", unit: "Unit 1: Family Life", mode: "collocation", band: "6.5", topic: "Family",
  target_word: "share chores", prompt: "Chọn động từ kết hợp tự nhiên:",
  sentence: "Family members should equitably _______ the domestic chores to maintain household harmony.",
  options: ["share", "divide", "split", "part"], correct: 0,
  vietnamese: "chia sẻ việc nhà cùng nhau", phonetic: "/ʃeər ðə ˈhɑʊs.həʊld tʃɔːz/", exam_task: "Writing Task 2 (Family & Gender Roles)",
  real_exam_sentence: "When spouses share household chores equally, psychological stress decreases and relationship satisfaction improves.",
  common_mistake: "Dùng 'do chores with' thay vì cụm collocation chuẩn xác 'share household chores'.",
  explanation: "'Share household chores' là trọng tâm bài học Unit 1 Tiếng Anh 10."
});
addQ({
  id: "g10_col_02", grade: 10, grade_label: "Lớp 10", unit: "Unit 6: Gender Equality", mode: "collocation", band: "7.0", topic: "Society",
  target_word: "equal opportunities", prompt: "Chọn tính từ kết hợp học thuật:",
  sentence: "Progressive recruitment guidelines ensure that all candidates receive _______ employment opportunities.",
  options: ["equal", "even", "uniform", "identical"], correct: 0,
  vietnamese: "cơ hội việc làm bình đẳng", phonetic: "/ˈiː.kwəl ˌɒp.əˈtʃuː.nə.tiz/", exam_task: "Writing Task 2 (Workplace Diversity)",
  real_exam_sentence: "Guaranteeing equal opportunities for female graduates eliminates the pervasive corporate glass ceiling.",
  common_mistake: "Dùng 'same opportunities'; chuẩn thuật ngữ pháp lý và học thuật là 'equal opportunities'.",
  explanation: "'Equal opportunities' = cơ hội đồng đều không bị phân biệt đối xử."
});
addQ({
  id: "g10_col_03", grade: 10, grade_label: "Lớp 10", unit: "Unit 2: Humans and the Environment", mode: "collocation", band: "6.5", topic: "Environment",
  target_word: "adopt an eco-friendly lifestyle", prompt: "Chọn động từ collocation đi cùng danh từ 'lifestyle':",
  sentence: "Younger generations are eager to _______ an eco-friendly lifestyle by minimizing single-use items.",
  options: ["adopt", "adapt", "adept", "admit"], correct: 0,
  vietnamese: "bắt đầu theo đuổi lối sống thân thiện môi trường", phonetic: "/əˈdɒpt ən ˈiː.kəʊˌfrend.li ˈlaɪf.staɪl/", exam_task: "Writing Task 2 (Sustainable Habits)",
  real_exam_sentence: "Consumers who adopt an eco-friendly lifestyle drive market demand for biodegradable packaging.",
  common_mistake: "Nhầm lẫn nguy hiểm giữa 'adopt' (tiếp nhận/bắt đầu theo đuổi) và 'adapt' (thích nghi biến đổi).",
  explanation: "'Adopt a green / eco-friendly lifestyle' là collocation cao cấp Band 7.0."
});

addQ({
  id: "g11_col_01", grade: 11, grade_label: "Lớp 11", unit: "Unit 5: Global Warming", mode: "collocation", band: "7.0", topic: "Environment",
  target_word: "greenhouse gas emissions", prompt: "Chọn danh từ hoàn thiện cụm Collocation Band 7.0+:",
  sentence: "Nations committed to the Paris Accords must drastically curb greenhouse gas _______ by 2030.",
  options: ["emissions", "transmissions", "admissions", "omissions"], correct: 0,
  vietnamese: "khí thải nhà kính gây hiệu ứng nhà kính", phonetic: "/ˈɡriːn.haʊs ɡæs ɪˈmɪʃ.ənz/", exam_task: "Writing Task 2 (Climate Change)",
  real_exam_sentence: "Accelerated adoption of clean photovoltaics curtails industrial greenhouse gas emissions considerably.",
  common_mistake: "Nhầm lẫn giữa 'emission' (sự phát thải khí) và 'transmission' (sự truyền dẫn tín hiệu).",
  explanation: "'Greenhouse gas emissions' là cụm thuật ngữ nền tảng của mọi bài viết về biến đổi khí hậu."
});
addQ({
  id: "g11_col_02", grade: 11, grade_label: "Lớp 11", unit: "Unit 1: A Long and Healthy Life", mode: "collocation", band: "6.5", topic: "Health",
  target_word: "balanced diet", prompt: "Chọn tính từ tạo thành collocation quen thuộc:",
  sentence: "Nutritional experts emphasize that maintaining a _______ diet strengthens cellular immunity.",
  options: ["balanced", "symmetric", "proportional", "equivalent"], correct: 0,
  vietnamese: "chế độ ăn uống cân bằng dinh dưỡng", phonetic: "/ˈbæl.ənst ˈdaɪ.ət/", exam_task: "Speaking Part 1 & Writing Task 2",
  real_exam_sentence: "Consuming a balanced diet rich in leafy greens wards off premature cardiovascular morbidity.",
  common_mistake: "Dùng 'balance diet' (thiếu đuôi '-ed' của tính từ phân từ). Phải là 'balanced diet'.",
  explanation: "'A balanced diet' bao gồm đầy đủ các nhóm dưỡng chất cần thiết cho cơ thể."
});
addQ({
  id: "g11_col_03", grade: 11, grade_label: "Lớp 11", unit: "Unit 7: Education Options", mode: "collocation", band: "7.0", topic: "Education",
  target_word: "tuition fees", prompt: "Chọn danh từ đi cùng 'tuition':",
  sentence: "Exorbitant university tuition _______ often saddle working-class undergraduates with crippling debt.",
  options: ["fees", "fines", "fares", "tolls"], correct: 0,
  vietnamese: "học phí đại học", phonetic: "/tʃuːˈɪʃ.ən fiːz/", exam_task: "Writing Task 2 (Higher Education Funding)",
  real_exam_sentence: "Subsidising higher education tuition fees guarantees that tertiary schooling remains accessible to all demographics.",
  common_mistake: "Nhầm 'fee' (học phí, phí dịch vụ) với 'fare' (tiền vé tàu xe) hay 'fine' (tiền phạt vi phạm).",
  explanation: "'Tuition fees' là cụm danh từ chuẩn xác duy nhất cho học phí giáo dục."
});

addQ({
  id: "g12_col_01", grade: 12, grade_label: "Lớp 12", unit: "Unit 1: Life Stories We Admire", mode: "collocation", band: "7.0", topic: "Psychology",
  target_word: "set a role model", prompt: "Chọn cụm danh từ hoàn thiện câu:",
  sentence: "Dedicated educators serve as an exemplary _______ model for impressionable adolescents.",
  options: ["role", "cast", "post", "rank"], correct: 0,
  vietnamese: "tấm gương / hình mẫu lý tưởng để noi theo", phonetic: "/ˈrəʊl ˌmɒd.əl/", exam_task: "Writing Task 2 (Celebrity & Influence)",
  real_exam_sentence: "Athletes must realise their privileged social visibility obligates them to act as positive role models.",
  common_mistake: "Viết sai chính tả chữ 'role' (vai trò) thành 'roll' (cuộn, lăn).",
  explanation: "'Role model' = tấm gương sáng, người có hành vi chuẩn mực truyền cảm hứng."
});
addQ({
  id: "g12_col_02", grade: 12, grade_label: "Lớp 12", unit: "Unit 4: Urbanisation", mode: "collocation", band: "7.5", topic: "Urbanisation",
  target_word: "affordable housing", prompt: "Chọn tính từ kết hợp học thuật:",
  sentence: "The municipal administration faces severe deficits in providing _______ housing for low-income migrants.",
  options: ["affordable", "cheap", "penny-pinching", "discounted"], correct: 0,
  vietnamese: "nhà ở giá cả phải chăng, hợp túi tiền", phonetic: "/əˈfɔː.də.bəl ˈhaʊ.zɪŋ/", exam_task: "Writing Task 2 (Urbanisation & Living Costs)",
  real_exam_sentence: "A persistent shortage of affordable housing in downtown metropolitan zones drives the formation of peripheral slums.",
  common_mistake: "Thí sinh hay dùng từ 'cheap housing' mang sắc thái nhà kém chất lượng; 'affordable housing' chuẩn học thuật Band 7.5.",
  explanation: "'Affordable housing' là chủ đề chính sách xã hội trọng tâm trong các bài thi IELTS."
});
addQ({
  id: "g12_col_03", grade: 12, grade_label: "Lớp 12", unit: "Unit 8: Wildlife Conservation", mode: "collocation", band: "7.5", topic: "Environment",
  target_word: "threaten with extinction", prompt: "Chọn động từ kết hợp với cụm 'with extinction':",
  sentence: "Habitat fragmentation continues to _______ dozens of endemic primate species with complete extinction.",
  options: ["threaten", "menace", "warn", "intimidate"], correct: 0,
  vietnamese: "đe dọa bờ vực tuyệt chủng", phonetic: "/ˈθret.ən wɪð ɪkˈstɪŋk.ʃən/", exam_task: "Writing Task 2 (Biodiversity)",
  real_exam_sentence: "Unchecked commercial logging operations directly threaten unique equatorial marsupials with irreversible extinction.",
  common_mistake: "Dùng sai giới từ; cấu trúc chuẩn là 'threaten somebody/something WITH extinction'.",
  explanation: "'Threaten with extinction' là collocation đắt giá diễn tả nguy cơ diệt vong sinh thái."
});

// ==========================================
// 4. WORD CLASS (21 QUESTIONS: 3 per Grade 6..12)
// ==========================================
addQ({
  id: "g6_wc_01", grade: 6, grade_label: "Lớp 6", unit: "Unit 3: My Friends", mode: "word_class", band: "5.0", topic: "Personalities",
  target_word: "friendly", prompt: "Chọn dạng từ (Word Class) thích hợp cho câu:",
  sentence: "Our new homeroom teacher is exceptionally warm and _______ towards every student.",
  options: ["friendly", "friendship", "friendliness", "friend"], correct: 0,
  vietnamese: "thân thiện (tính từ)", phonetic: "/ˈfrend.li/", exam_task: "Speaking Part 1 (People & Teachers)",
  real_exam_sentence: "A friendly classroom atmosphere fosters psychological safety and boosts voluntary student participation.",
  common_mistake: "Nhiều học sinh lầm tưởng từ có đuôi '-ly' luôn là trạng từ; 'friendly' là tính từ xuất phát từ danh từ 'friend'.",
  explanation: "Sau động từ to-be và liên từ 'and warm' cần một tính từ (Adjective) song song."
});
addQ({
  id: "g6_wc_02", grade: 6, grade_label: "Lớp 6", unit: "Unit 12: Robots", mode: "word_class", band: "5.5", topic: "Technology",
  target_word: "helpful", prompt: "Chọn dạng từ phù hợp vị trí bổ ngữ:",
  sentence: "Domestic service robots prove immensely _______ in assisting elderly citizens with everyday chores.",
  options: ["helpful", "help", "helpfully", "helpless"], correct: 0,
  vietnamese: "hữu ích, giúp ích nhiều (tính từ)", phonetic: "/ˈhelp.fəl/", exam_task: "Speaking Part 3 (Technology in Society)",
  real_exam_sentence: "Automated voice assistants are increasingly helpful in managing personal schedules efficiently.",
  common_mistake: "Nhầm 'helpful' (hữu ích) với 'helpless' (bất lực, không có khả năng tự vệ).",
  explanation: "Động từ nối 'prove' + phó từ chỉ mức độ 'immensely' đòi hỏi một tính từ (helpful)."
});
addQ({
  id: "g6_wc_03", grade: 6, grade_label: "Lớp 6", unit: "Unit 11: Our Greener World", mode: "word_class", band: "5.0", topic: "Environment",
  target_word: "polluted", prompt: "Chọn tính từ phân từ miêu tả nguồn nước:",
  sentence: "Consuming water from heavily _______ canals induces acute gastrointestinal infections.",
  options: ["polluted", "pollution", "pollute", "polluting"], correct: 0,
  vietnamese: "bị ô nhiễm nghiêm trọng (tính từ phân từ)", phonetic: "/pəˈluː.tɪd/", exam_task: "Writing Task 2 (Water Quality)",
  real_exam_sentence: "Marine organisms cannot flourish within heavily polluted estuaries bordering industrial factories.",
  common_mistake: "Dùng danh từ 'pollution' đứng trước danh từ 'canals' mà không có gạch nối; dạng tính từ chuẩn là 'polluted'.",
  explanation: "Đứng sau phó từ 'heavily' và bổ nghĩa cho danh từ 'canals' là quá khứ phân từ 'polluted'."
});

addQ({
  id: "g7_wc_01", grade: 7, grade_label: "Lớp 7", unit: "Unit 1: Hobbies", mode: "word_class", band: "5.5", topic: "Lifestyle",
  target_word: "creatively", prompt: "Chọn dạng từ bổ nghĩa cho động từ hành động:",
  sentence: "Young apprentices are encouraged to think _______ when resolving practical engineering obstacles.",
  options: ["creatively", "creative", "creativity", "create"], correct: 0,
  vietnamese: "một cách sáng tạo (trạng từ)", phonetic: "/kriːˈeɪ.tɪv.li/", exam_task: "Writing Task 2 (Education Methods)",
  real_exam_sentence: "Encouraging learners to write creatively stimulates lateral cognitive flexibility.",
  common_mistake: "Dùng tính từ 'creative' bổ nghĩa cho động từ 'think' (sai ngữ pháp: động từ cần trạng từ).",
  explanation: "Động từ 'think' đòi hỏi một trạng từ (Adverb: creatively) đi kèm để diễn đạt cách thức suy nghĩ."
});
addQ({
  id: "g7_wc_02", grade: 7, grade_label: "Lớp 7", unit: "Unit 2: Healthy Living", mode: "word_class", band: "5.5", topic: "Health",
  target_word: "healthy", prompt: "Chọn dạng từ thích hợp đứng trước danh từ:",
  sentence: "Cultivating _______ dietary habits from early adolescence shields individuals from chronic metabolic disorders.",
  options: ["healthy", "health", "healthily", "healthiness"], correct: 0,
  vietnamese: "lành mạnh, tốt cho sức khỏe (tính từ)", phonetic: "/ˈhel.θi/", exam_task: "Writing Task 2 (Health & Wellbeing)",
  real_exam_sentence: "Adhering to healthy sleep routines fosters sharper executive brain function throughout adulthood.",
  common_mistake: "Dùng danh từ 'health' ghép với 'habits' tạo cảm giác lủng củng; tính từ 'healthy' chuẩn xác nhất.",
  explanation: "Trước cụm danh từ 'dietary habits' cần tính từ 'healthy' bổ nghĩa."
});
addQ({
  id: "g7_wc_03", grade: 7, grade_label: "Lớp 7", unit: "Unit 3: Community Service", mode: "word_class", band: "5.5", topic: "Society",
  target_word: "voluntary", prompt: "Chọn tính từ miêu tả tính chất tự nguyện:",
  sentence: "High schools should recognize students' participation in _______ charity campaigns during summer breaks.",
  options: ["voluntary", "volunteer", "voluntarily", "volunteering"], correct: 0,
  vietnamese: "mang tính tự nguyện, không bắt buộc (tính từ)", phonetic: "/ˈvɒl.ən.tər.i/", exam_task: "Writing Task 2 (Civic Responsibility)",
  real_exam_sentence: "Engaging in voluntary social work nurtures empathy and practical interpersonal abilities.",
  common_mistake: "Dùng danh từ 'volunteer' làm tính từ; tính từ chính xác trong văn phong học thuật là 'voluntary'.",
  explanation: "Trước cụm danh từ 'charity campaigns' cần tính từ 'voluntary'."
});

addQ({
  id: "g8_wc_01", grade: 8, grade_label: "Lớp 8", unit: "Unit 6: Lifestyles", mode: "word_class", band: "6.0", topic: "Society",
  target_word: "punctuality", prompt: "Chọn dạng từ đóng vai trò chủ ngữ danh từ:",
  sentence: "Strict _______ is deeply valued across Japanese railway transit systems.",
  options: ["punctuality", "punctual", "punctually", "punctualness"], correct: 0,
  vietnamese: "tính đúng giờ (danh từ trừu tượng)", phonetic: "/ˌpʌŋk.tʃuˈæl.ə.ti/", exam_task: "Writing Task 2 (Cultural Norms)",
  real_exam_sentence: "Punctuality is not merely a polite gesture but an indispensable requisite in competitive international commerce.",
  common_mistake: "Nhầm đuôi danh từ '-ity' thành '-ness' ('punctualness' là dạng hiếm và không chuẩn phong cách IELTS).",
  explanation: "Đứng sau tính từ 'Strict' và làm chủ ngữ câu bắt buộc phải là một danh từ (punctuality)."
});
addQ({
  id: "g8_wc_02", grade: 8, grade_label: "Lớp 8", unit: "Unit 11: Science and Technology", mode: "word_class", band: "6.5", topic: "Science",
  target_word: "inventive", prompt: "Chọn tính từ thích hợp miêu tả năng lực con người:",
  sentence: "The team formulated an exceptionally _______ solution to circumvent water shortages in arid farmland.",
  options: ["inventive", "invention", "inventor", "inventively"], correct: 0,
  vietnamese: "giàu óc sáng chế, mang tính phát minh (tính từ)", phonetic: "/ɪnˈven.tɪv/", exam_task: "Speaking Part 3 (Inventions & Science)",
  real_exam_sentence: "Inventive agricultural technology allows greenhouse farmers to cultivate crops with minimal groundwater depletion.",
  common_mistake: "Nhầm lẫn giữa 'invention' (danh từ: sự phát minh) và 'inventive' (tính từ: đầy sáng kiến).",
  explanation: "Trước danh từ 'solution' cần một tính từ (inventive) đứng sau trạng từ 'exceptionally'."
});
addQ({
  id: "g8_wc_03", grade: 8, grade_label: "Lớp 8", unit: "Unit 7: Environmental Protection", mode: "word_class", band: "6.0", topic: "Environment",
  target_word: "destructive", prompt: "Chọn tính từ miêu tả sức công phá của thiên tai:",
  sentence: "Hurricanes generate immensely _______ gale-force winds that flatten coastal wooden cottages.",
  options: ["destructive", "destruction", "destroy", "destructively"], correct: 0,
  vietnamese: "mang tính tàn phá, hủy diệt (tính từ)", phonetic: "/dɪˈstrʌk.tɪv/", exam_task: "Writing Task 2 (Natural Disasters)",
  real_exam_sentence: "Destructive tropical typhoons inflict irreversible economic trauma upon insular agricultural settlements.",
  common_mistake: "Nhầm lẫn giữa tính từ 'destructive' và danh từ 'destruction'.",
  explanation: "Đứng sau phó từ chỉ mức độ 'immensely' và bổ nghĩa cho danh từ 'gale-force winds' là tính từ 'destructive'."
});

addQ({
  id: "g9_wc_01", grade: 9, grade_label: "Lớp 9", unit: "Unit 4: Remembering the Past", mode: "word_class", band: "6.5", topic: "Culture",
  target_word: "preservation", prompt: "Chọn danh từ thích hợp đứng sau tính từ:",
  sentence: "Environmentalists launched an urgent appeal for the architectural _______ of ancient wooden temples.",
  options: ["preservation", "preserve", "preserved", "preservative"], correct: 0,
  vietnamese: "sự bảo tồn, công tác giữ gìn (danh từ)", phonetic: "/ˌprez.əˈveɪ.ʃən/", exam_task: "Writing Task 2 (Heritage Conservation)",
  real_exam_sentence: "The ongoing preservation of tangible historic relics requires sustained municipal capital expenditure.",
  common_mistake: "Nhầm 'preservation' (sự bảo tồn) với 'preservative' (chất bảo quản thực phẩm).",
  explanation: "Sau tính từ 'architectural' cần một danh từ (preservation) chỉ sự bảo tồn."
});
addQ({
  id: "g9_wc_02", grade: 9, grade_label: "Lớp 9", unit: "Unit 12: Career Choices", mode: "word_class", band: "6.5", topic: "Work",
  target_word: "qualified", prompt: "Chọn dạng từ phân từ đóng vai trò tính từ:",
  sentence: "The hospital recruited highly _______ medical practitioners to staff the intensive care wing.",
  options: ["qualified", "qualification", "qualify", "qualifying"], correct: 0,
  vietnamese: "đủ điều kiện, có năng lực chuyên môn (tính từ)", phonetic: "/ˈkwɒl.ɪ.faɪd/", exam_task: "Writing Task 2 (Healthcare Staffing)",
  real_exam_sentence: "A severe shortage of qualified nursing personnel places immense strain on emergency medical services.",
  common_mistake: "Dùng danh từ 'qualification' đứng trước danh từ 'practitioners' làm câu gượng gạo.",
  explanation: "Đứng sau phó từ 'highly' và bổ nghĩa cho danh từ 'medical practitioners' là quá khứ phân từ làm tính từ: 'qualified'."
});
addQ({
  id: "g9_wc_03", grade: 9, grade_label: "Lớp 9", unit: "Unit 3: Healthy Living for Teens", mode: "word_class", band: "6.5", topic: "Health",
  target_word: "prioritize", prompt: "Chọn động từ phù hợp sau trợ động từ khuyết thiếu:",
  sentence: "Stressed teenagers must learn to _______ essential academic coursework over recreational gaming.",
  options: ["prioritize", "priority", "prioritization", "prior"], correct: 0,
  vietnamese: "ưu tiên, đặt lên hàng đầu (động từ)", phonetic: "/praɪˈɒr.ɪ.taɪz/", exam_task: "Writing Task 2 (Time Management)",
  real_exam_sentence: "Working parents must prioritize quality family dinners over uninterrupted corporate messaging.",
  common_mistake: "Dùng danh từ 'priority' sau 'learn to' (sai ngữ pháp: sau 'to' cần động từ nguyên thể 'prioritize').",
  explanation: "Cấu trúc: 'learn to + V-infinitive' yêu cầu động từ 'prioritize' (Anh-Mỹ) hoặc 'prioritise' (Anh-Anh)."
});

addQ({
  id: "g10_wc_01", grade: 10, grade_label: "Lớp 10", unit: "Unit 2: Humans and the Environment", mode: "word_class", band: "6.5", topic: "Environment",
  target_word: "sustainably", prompt: "Chọn dạng từ bổ nghĩa cho động từ bị động:",
  sentence: "Marine fishery reserves must be harvested _______ to avert the collapse of indigenous fish stocks.",
  options: ["sustainably", "sustainable", "sustainability", "sustain"], correct: 0,
  vietnamese: "một cách bền vững (trạng từ)", phonetic: "/səˈsteɪ.nə.bli/", exam_task: "Writing Task 2 (Natural Resources)",
  real_exam_sentence: "When timber resources are extracted sustainably, forests retain their ecological biodiversity.",
  common_mistake: "Nhầm lẫn giữa tính từ 'sustainable' và phó từ 'sustainably' khi đứng sau động từ bị động 'harvested'.",
  explanation: "Động từ 'harvested' ở thể bị động đòi hỏi một trạng từ (Adverb) đi kèm để diễn tả phương thức."
});
addQ({
  id: "g10_wc_02", grade: 10, grade_label: "Lớp 10", unit: "Unit 6: Gender Equality", mode: "word_class", band: "7.0", topic: "Society",
  target_word: "equality", prompt: "Chọn dạng từ đóng vai trò danh từ mục tiêu:",
  sentence: "Modern constitutions enshrine full gender _______ as an unnegotiable fundamental human right.",
  options: ["equality", "equal", "equally", "equalize"], correct: 0,
  vietnamese: "sự bình đẳng (danh từ)", phonetic: "/iˈkwɒl.ə.ti/", exam_task: "Writing Task 2 (Human Rights)",
  real_exam_sentence: "Achieving true wage equality between genders fosters higher macroeconomic productivity.",
  common_mistake: "Viết nhầm tính từ 'equal' thay vì danh từ 'equality' sau danh từ 'gender' tạo thành cụm ghép.",
  explanation: "'Gender equality' là cụm danh từ chuẩn (noun phrase) chỉ sự bình đẳng giới."
});
addQ({
  id: "g10_wc_03", grade: 10, grade_label: "Lớp 10", unit: "Unit 5: Inventions", mode: "word_class", band: "6.5", topic: "Technology",
  target_word: "portable", prompt: "Chọn tính từ miêu tả tính năng di động cầm tay:",
  sentence: "Solar recharging generators are exceptionally _______, allowing campers to power medical gear in the wilderness.",
  options: ["portable", "portability", "portably", "port"], correct: 0,
  vietnamese: "có thể xách tay, dễ dàng mang theo (tính từ)", phonetic: "/ˈpɔː.tə.bəl/", exam_task: "Speaking Part 3 (Technological Devices)",
  real_exam_sentence: "Laptops and portable storage devices allow knowledge workers to work remotely from any continent.",
  common_mistake: "Nhầm 'portable' (xách tay mang đi được) với 'potable' (nước có thể uống được).",
  explanation: "Sau liên động từ 'are' và trạng từ 'exceptionally' cần một tính từ miêu tả thuộc tính (portable)."
});

addQ({
  id: "g11_wc_01", grade: 11, grade_label: "Lớp 11", unit: "Unit 3: Cities of the Future", mode: "word_class", band: "7.0", topic: "Urbanisation",
  target_word: "pedestrianised", prompt: "Chọn tính từ phân từ miêu tả không gian đô thị:",
  sentence: "City planners converted crowded commercial streets into fully _______ avenues.",
  options: ["pedestrianised", "pedestrian", "pedestrians", "pedestrianising"], correct: 0,
  vietnamese: "được quy hoạch thành phố đi bộ (tính từ)", phonetic: "/pəˈdes.tri.ə.naɪzd/", exam_task: "Writing Task 2 (Urban Spaces)",
  real_exam_sentence: "Pedestrianised urban zones significantly diminish harmful automotive particulates while boosting retail footfall.",
  common_mistake: "Chỉ dùng danh từ 'pedestrian' (người đi bộ); dùng 'pedestrianised' (được chuyển thành phố đi bộ) thể hiện từ vựng Band 7+.",
  explanation: "'Pedestrianised street / zone' là tính từ phân từ chỉ khu phố cấm xe cơ giới chỉ dành cho người đi bộ."
});
addQ({
  id: "g11_wc_02", grade: 11, grade_label: "Lớp 11", unit: "Unit 8: Becoming Independent", mode: "word_class", band: "7.0", topic: "Psychology",
  target_word: "independently", prompt: "Chọn dạng từ bổ nghĩa cho động từ hành động:",
  sentence: "Tertiary students must cultivate the ability to conduct scholarly research _______ without micro-supervision.",
  options: ["independently", "independent", "independence", "independency"], correct: 0,
  vietnamese: "một cách độc lập tự chủ (trạng từ)", phonetic: "/ˌɪn.dɪˈpen.dənt.li/", exam_task: "Writing Task 2 (University Learning)",
  real_exam_sentence: "Scholars who learn to think independently formulate profound critical arguments in dissertations.",
  common_mistake: "Dùng tính từ 'independent' đi sau cụm động từ 'conduct research' (sai nguyên tắc ngữ pháp).",
  explanation: "Bổ nghĩa cho hành động 'conduct scholarly research' bắt buộc phải là trạng từ (independently)."
});
addQ({
  id: "g11_wc_03", grade: 11, grade_label: "Lớp 11", unit: "Unit 10: The Ecosystem", mode: "word_class", band: "7.0", topic: "Environment",
  target_word: "conservationist", prompt: "Chọn danh từ chỉ người làm công tác bảo tồn:",
  sentence: "A prominent wildlife _______ spearheaded the initiative to reintroduce indigenous wolves to national parks.",
  options: ["conservationist", "conservation", "conserve", "conservative"], correct: 0,
  vietnamese: "nhà hoạt động bảo tồn thiên nhiên (danh từ chỉ người)", phonetic: "/ˌkɒn.səˈveɪ.ʃən.ɪst/", exam_task: "Writing Task 2 (Wildlife Protection)",
  real_exam_sentence: "Field conservationists collaborate with local rangers to track poaching syndicates across savannahs.",
  common_mistake: "Nhầm 'conservationist' (nhà bảo tồn thiên nhiên) với 'conservative' (người có quan điểm chính trị bảo thủ).",
  explanation: "Đứng sau tính từ 'wildlife' và làm chủ ngữ thực hiện hành động 'spearheaded' phải là danh từ chỉ người (conservationist)."
});

addQ({
  id: "g12_wc_01", grade: 12, grade_label: "Lớp 12", unit: "Unit 1: Life Stories We Admire", mode: "word_class", band: "7.0", topic: "Society",
  target_word: "dedicated", prompt: "Chọn tính từ phân từ miêu tả phẩm chất:",
  sentence: "She remained fiercely _______ to humanitarian philanthropy throughout her distinguished career.",
  options: ["dedicated", "dedication", "dedicate", "dedicating"], correct: 0,
  vietnamese: "tận tụy, cống hiến hết mình (tính từ)", phonetic: "/ˈded.ɪ.keɪ.tɪd/", exam_task: "Speaking Part 2 (People You Admire)",
  real_exam_sentence: "A dedicated cohort of medical volunteers administered vaccines in war-torn regions.",
  common_mistake: "Quên giới từ 'to' sau 'dedicated'; cấu trúc bắt buộc: 'be dedicated to doing something'.",
  explanation: "Đứng sau liên động từ 'remained' và phó từ 'fiercely' là tính từ 'dedicated'."
});
addQ({
  id: "g12_wc_02", grade: 12, grade_label: "Lớp 12", unit: "Unit 6: Artificial Intelligence", mode: "word_class", band: "7.5", topic: "Technology",
  target_word: "automated", prompt: "Chọn tính từ phân từ đi trước danh từ:",
  sentence: "Modern manufacturing assembly plants operate almost exclusively on highly _______ assembly lines.",
  options: ["automated", "automation", "automate", "automating"], correct: 0,
  vietnamese: "tự động hóa (tính từ phân từ)", phonetic: "/ˈɔː.tə.meɪ.tɪd/", exam_task: "Writing Task 2 (Industry 4.0)",
  real_exam_sentence: "Deploying automated sorting systems drastically enhances distribution warehouse throughput.",
  common_mistake: "Nhầm 'automation' (danh từ: sự tự động hóa) với 'automated' (tính từ: đã được tự động hóa).",
  explanation: "Trước danh từ 'assembly lines' cần một phân từ tính từ: 'automated' (được tự động hóa)."
});
addQ({
  id: "g12_wc_03", grade: 12, grade_label: "Lớp 12", unit: "Unit 10: Lifelong Learning", mode: "word_class", band: "7.5", topic: "Education",
  target_word: "flexibility", prompt: "Chọn danh từ thích hợp đứng sau ngoại động từ:",
  sentence: "Online postgraduate micro-degrees afford working professionals unmatched temporal _______.",
  options: ["flexibility", "flexible", "flexibly", "flexibleness"], correct: 0,
  vietnamese: "sự linh hoạt (danh từ)", phonetic: "/ˌflek.səˈbɪl.ə.ti/", exam_task: "Writing Task 2 (Distance Learning)",
  real_exam_sentence: "Cognitive flexibility enables seasoned executives to pivot business models during turbulent economic downturns.",
  common_mistake: "Dùng tính từ 'flexible' làm tân ngữ câu (sau ngoại động từ 'afford' bắt buộc phải là danh từ).",
  explanation: "Sau tính từ 'temporal' cần danh từ 'flexibility' để tạo thành cụm tân ngữ hoàn chỉnh."
});

// ==========================================
// 5. PREPOSITION (21 QUESTIONS: 3 per Grade 6..12)
// Allowed: ['to', 'from', 'with', 'on', 'of', 'for', 'in', 'upon', 'at', 'by']
// ==========================================
addQ({
  id: "g6_prep_01", grade: 6, grade_label: "Lớp 6", unit: "Unit 1: My New School", mode: "preposition", band: "5.0", topic: "Education",
  target_word: "borrow from", prompt: "Chọn giới từ phụ thuộc chính xác theo sau động từ 'borrow':",
  sentence: "Students can borrow reference books _______ the university library for up to three weeks.",
  options: ["from", "to", "at", "by"], correct: 0,
  vietnamese: "mượn cái gì từ ai/đâu", phonetic: "/ˈbɒr.əʊ frɒm/", exam_task: "Speaking Part 1 (Reading & Libraries)",
  real_exam_sentence: "Undergraduates borrow archival materials directly from the research library for dissertation analysis.",
  common_mistake: "Thí sinh Việt Nam hay nhầm với 'borrow to' hoặc nhầm giữa 'borrow' (mượn) và 'lend' (cho vay/mượn).",
  explanation: "Cấu trúc chuẩn xác là: borrow something FROM somebody/somewhere."
});
addQ({
  id: "g6_prep_02", grade: 6, grade_label: "Lớp 6", unit: "Unit 8: Sports and Games", mode: "preposition", band: "5.0", topic: "Sports",
  target_word: "good at", prompt: "Chọn giới từ theo sau tính từ 'good':",
  sentence: "Primary school pupils who are exceptionally good _______ athletics gain early physical confidence.",
  options: ["at", "in", "with", "for"], correct: 0,
  vietnamese: "giỏi giang về bộ môn/lĩnh vực gì", phonetic: "/ɡʊd æt/", exam_task: "Speaking Part 1 (Talents & Sports)",
  real_exam_sentence: "Teenagers who are good at swimming possess well-developed cardiovascular capacity.",
  common_mistake: "Rất nhiều học sinh dùng 'good in'; chuẩn ngữ pháp tiếng Anh luôn là 'good AT something/doing something'.",
  explanation: "'Be good at' = có năng khiếu hoặc làm rất tốt việc gì."
});
addQ({
  id: "g6_prep_03", grade: 6, grade_label: "Lớp 6", unit: "Unit 3: My Friends", mode: "preposition", band: "5.0", topic: "Relationships",
  target_word: "kind to", prompt: "Chọn giới từ theo sau tính từ 'kind':",
  sentence: "Senior pupils ought to be empathetic and kind _______ younger schoolmates during playground breaks.",
  options: ["to", "with", "for", "at"], correct: 0,
  vietnamese: "tử tế, ân cần đối với ai", phonetic: "/kaɪnd tuː/", exam_task: "Speaking Part 1 (Friendship)",
  real_exam_sentence: "Teaching young children to be kind to vulnerable peers prevents schoolyard bullying.",
  common_mistake: "Học sinh Việt Nam hay dịch từ 'với' thành 'with' ('kind with'). Chuẩn là: 'kind TO someone'.",
  explanation: "'Be kind / polite / rude / generous TO somebody' luôn đi với giới từ TO."
});

addQ({
  id: "g7_prep_01", grade: 7, grade_label: "Lớp 7", unit: "Unit 3: Community Service", mode: "preposition", band: "5.5", topic: "Society",
  target_word: "donate to", prompt: "Chọn giới từ theo sau động từ 'donate':",
  sentence: "Philanthropists frequently donate generous sums _______ wildlife preservation charities.",
  options: ["to", "for", "with", "in"], correct: 0,
  vietnamese: "quyên góp, ủng hộ cho ai/tổ chức nào", phonetic: "/dəʊˈneɪt tuː/", exam_task: "Writing Task 2 (Charity Funding)",
  real_exam_sentence: "Wealthy corporations donate substantial capital to scientific institutions pioneering cancer therapies.",
  common_mistake: "Thí sinh hay chọn 'for' vì dịch nghĩa đen 'cho'; nhưng cấu trúc tiếng Anh bắt buộc là 'donate something TO someone'.",
  explanation: "'Donate something TO an organisation / person' là quy tắc ngữ pháp bất di bất dịch."
});
addQ({
  id: "g7_prep_02", grade: 7, grade_label: "Lớp 7", unit: "Unit 4: Music and Arts", mode: "preposition", band: "5.5", topic: "Arts",
  target_word: "different from", prompt: "Chọn giới từ theo sau tính từ 'different':",
  sentence: "Contemporary digital graphic design is distinctly different _______ classical oil canvas painting.",
  options: ["from", "to", "with", "at"], correct: 0,
  vietnamese: "khác biệt so với cái gì", phonetic: "/ˈdɪf.ər.ənt frɒm/", exam_task: "Writing Task 2 (Modern vs Traditional Arts)",
  real_exam_sentence: "The educational philosophy in Western colleges is fundamentally different from traditional Eastern rote learning.",
  common_mistake: "Học sinh hay dùng 'different with'; chuẩn quốc tế trong IELTS là 'different from'.",
  explanation: "'Be different from' là cấu trúc so sánh khác biệt chuẩn mực."
});
addQ({
  id: "g7_prep_03", grade: 7, grade_label: "Lớp 7", unit: "Unit 1: Hobbies", mode: "preposition", band: "5.5", topic: "Lifestyle",
  target_word: "interested in", prompt: "Chọn giới từ theo sau tính từ 'interested':",
  sentence: "Secondary school students are increasingly interested _______ participating in environmental clubs.",
  options: ["in", "on", "at", "with"], correct: 0,
  vietnamese: "hứng thú, quan tâm đến điều gì", phonetic: "/ˈɪn.trəs.tɪd ɪn/", exam_task: "Speaking Part 1 (Hobbies & Interests)",
  real_exam_sentence: "Many young adults are deeply interested in learning computer programming languages.",
  common_mistake: "Nhầm 'interested in' với 'keen on'. Không dùng 'interested on'.",
  explanation: "'Be interested in something / doing something' = show curiosity or fascination."
});

addQ({
  id: "g8_prep_01", grade: 8, grade_label: "Lớp 8", unit: "Unit 1: Leisure Time", mode: "preposition", band: "5.5", topic: "Hobbies",
  target_word: "keen on", prompt: "Chọn giới từ đi kèm tính từ 'keen':",
  sentence: "Many secondary pupils are exceedingly keen _______ participating in robotics competitions.",
  options: ["on", "with", "at", "in"], correct: 0,
  vietnamese: "say mê, rất thích thú điều gì", phonetic: "/kiːn ɒn/", exam_task: "Speaking Part 1 (Hobbies & Pastimes)",
  real_exam_sentence: "Adolescents are remarkably keen on acquiring digital media production skills.",
  common_mistake: "Nhầm 'keen on' với 'interested in' hoặc 'good at'. Không bao giờ dùng 'keen in'.",
  explanation: "'Be keen on doing something' = to be fond of / passionate about."
});
addQ({
  id: "g8_prep_02", grade: 8, grade_label: "Lớp 8", unit: "Unit 3: Teenagers", mode: "preposition", band: "6.0", topic: "Psychology",
  target_word: "concentrate on", prompt: "Chọn giới từ đi kèm động từ 'concentrate':",
  sentence: "Pupils find it arduous to concentrate _______ academic lectures amidst intrusive ambient noise.",
  options: ["on", "in", "to", "at"], correct: 0,
  vietnamese: "tập trung vào việc gì", phonetic: "/ˈkɒn.sən.treɪt ɒn/", exam_task: "Writing Task 2 (Learning Environments)",
  real_exam_sentence: "Quiet study zones allow scholars to concentrate on intricate mathematical computations.",
  common_mistake: "Thường chọn 'in' hoặc 'into' theo cách dịch tiếng Việt; chuẩn là 'concentrate on'.",
  explanation: "'Concentrate on something' = focus all attention on something."
});
addQ({
  id: "g8_prep_03", grade: 8, grade_label: "Lớp 8", unit: "Unit 7: Environmental Protection", mode: "preposition", band: "6.0", topic: "Environment",
  target_word: "protect from", prompt: "Chọn giới từ theo sau động từ 'protect':",
  sentence: "Forested mountain ridges effectively protect downstream hamlets _______ devastating mudslides.",
  options: ["from", "to", "with", "at"], correct: 0,
  vietnamese: "bảo vệ ai/cái gì khỏi hiểm họa", phonetic: "/prəˈtekt frɒm/", exam_task: "Writing Task 2 (Disaster Prevention)",
  real_exam_sentence: "Coastal mangroves protect agricultural estuaries from catastrophic typhoon storm surges.",
  common_mistake: "Thường dùng 'protect with' (bảo vệ với); cấu trúc bảo vệ khỏi mối đe dọa là 'protect from / against'.",
  explanation: "'Protect somebody/something FROM / AGAINST something' là cấu trúc phòng vệ chuẩn."
});

addQ({
  id: "g9_prep_01", grade: 9, grade_label: "Lớp 9", unit: "Unit 1: Local Community", mode: "preposition", band: "6.0", topic: "Culture",
  target_word: "famous for", prompt: "Chọn giới từ đi kèm tính từ 'famous':",
  sentence: "Bat Trang craft sanctuary is globally famous _______ hand-crafted porcelain and ornate vases.",
  options: ["for", "with", "to", "in"], correct: 0,
  vietnamese: "nổi tiếng về đặc sản / sản phẩm gì", phonetic: "/ˈfeɪ.məs fɔːr/", exam_task: "Speaking Part 1 (Hometown & Crafts)",
  real_exam_sentence: "Hoi An is internationally famous for picturesque lanterns and preserved ancient architecture.",
  common_mistake: "Nhầm 'famous for' (nổi tiếng về cái gì) với 'famous to' (nổi danh đối với ai).",
  explanation: "'Be famous FOR something' = renowned for a specific quality or creation."
});
addQ({
  id: "g9_prep_02", grade: 9, grade_label: "Lớp 9", unit: "Unit 4: Remembering the Past", mode: "preposition", band: "6.5", topic: "Society",
  target_word: "proud of", prompt: "Chọn giới từ đi sau tính từ 'proud':",
  sentence: "Citizens are immensely proud _______ their country's heroic resistance against colonial invaders.",
  options: ["of", "for", "with", "about"], correct: 0,
  vietnamese: "tự hào về điều gì", phonetic: "/praʊd əv/", exam_task: "Speaking Part 1 & Part 2 (National Pride)",
  real_exam_sentence: "Young Vietnamese athletes are exceptionally proud of their international tournament triumphs.",
  common_mistake: "Học sinh hay chọn 'about' ('proud about') do thói quen dịch từ 'về cái gì'; chuẩn ngữ pháp là 'proud of'.",
  explanation: "'Be proud of something' = take immense pride in something."
});
addQ({
  id: "g9_prep_03", grade: 9, grade_label: "Lớp 9", unit: "Unit 2: City Life", mode: "preposition", band: "6.5", topic: "Urbanisation",
  target_word: "cope with", prompt: "Chọn giới từ đi kèm động từ 'cope':",
  sentence: "Commuters in overcrowded metropolises must learn to cope _______ chronic auditory pollution.",
  options: ["with", "for", "to", "at"], correct: 0,
  vietnamese: "đương đầu, đối phó thành công với khó khăn", phonetic: "/kəʊp wɪð/", exam_task: "Writing Task 2 (Urban Stress)",
  real_exam_sentence: "Public transit operators must effectively cope with sudden influxes of passengers during rush hour.",
  common_mistake: "Thường dùng sai giới từ thành 'cope to'; bắt buộc phải là 'cope WITH'.",
  explanation: "'Cope with something' = handle or deal successfully with a challenging situation."
});

addQ({
  id: "g10_prep_01", grade: 10, grade_label: "Lớp 10", unit: "Unit 1: Family Life", mode: "preposition", band: "6.5", topic: "Family",
  target_word: "responsible for", prompt: "Chọn giới từ đi kèm tính từ 'responsible':",
  sentence: "Each family member is held strictly responsible _______ completing their assigned household chore.",
  options: ["for", "to", "with", "in"], correct: 0,
  vietnamese: "chịu trách nhiệm về việc gì", phonetic: "/rɪˈspɒn.sə.bəl fɔːr/", exam_task: "Writing Task 2 (Childhood Independence)",
  real_exam_sentence: "Holding teenagers responsible for personal finances instills lifelong budgeting discipline.",
  common_mistake: "Thí sinh hay nhầm 'responsible for' (chịu trách nhiệm về việc gì) với 'responsible to' (báo cáo trước cấp trên).",
  explanation: "'Be responsible for something / doing something' = have duty or obligation to handle."
});
addQ({
  id: "g10_prep_02", grade: 10, grade_label: "Lớp 10", unit: "Unit 4: For a Better Community", mode: "preposition", band: "6.5", topic: "Society",
  target_word: "benefit from", prompt: "Chọn giới từ đi kèm động từ 'benefit':",
  sentence: "Underprivileged rural school-children directly benefit _______ state-sponsored digital tablet initiatives.",
  options: ["from", "to", "with", "of"], correct: 0,
  vietnamese: "hưởng lợi ích từ điều gì", phonetic: "/ˈben.ɪ.fɪt frɒm/", exam_task: "Writing Task 2 (Social Welfare)",
  real_exam_sentence: "Vulnerable demographics benefit immensely from subsidised preventive healthcare clinics.",
  common_mistake: "Dùng nhầm 'benefit with' hoặc 'benefit to'. Động từ luôn là: benefit FROM something.",
  explanation: "'Benefit from' = receive an advantage, profit, or help as a result of something."
});
addQ({
  id: "g10_prep_03", grade: 10, grade_label: "Lớp 10", unit: "Unit 6: Gender Equality", mode: "preposition", band: "7.0", topic: "Society",
  target_word: "participate in", prompt: "Chọn giới từ đi kèm động từ 'participate':",
  sentence: "Female professionals are actively encouraged to participate _______ corporate executive board meetings.",
  options: ["in", "at", "to", "with"], correct: 0,
  vietnamese: "tham gia đóng góp vào hoạt động gì", phonetic: "/pɑːˈtɪs.ɪ.peɪt ɪn/", exam_task: "Writing Task 2 (Corporate Equality)",
  real_exam_sentence: "Citizens who actively participate in grassroots town halls shape progressive local environmental policies.",
  common_mistake: "Nhầm 'participate in' với 'join in' hoặc 'attend to'. Động từ 'participate' bắt buộc đi với giới từ 'in'.",
  explanation: "'Participate in something' = take part in an activity."
});

addQ({
  id: "g11_prep_01", grade: 11, grade_label: "Lớp 11", unit: "Unit 1: A Long and Healthy Life", mode: "preposition", band: "6.5", topic: "Health",
  target_word: "cut down on", prompt: "Chọn giới từ hoàn thành phrasal verb 3 từ:",
  sentence: "Cardiologists urge adults to cut down _______ saturated fats and processed sodium intake.",
  options: ["on", "with", "in", "to"], correct: 0,
  vietnamese: "cắt giảm bớt lượng tiêu thụ", phonetic: "/kʌt daʊn ɒn/", exam_task: "Speaking Part 1 & Writing Task 2 (Diet)",
  real_exam_sentence: "Sedentary desk workers should cut down on sugary carbonated drinks to avoid insulin resistance.",
  common_mistake: "Quên giới từ 'on' ở cuối; 'cut down' (chặt đốn cây), 'cut down ON' (cắt giảm tiêu dùng).",
  explanation: "'Cut down on something' = reduce the quantity or frequency of something."
});
addQ({
  id: "g11_prep_02", grade: 11, grade_label: "Lớp 11", unit: "Unit 5: Global Warming", mode: "preposition", band: "7.0", topic: "Environment",
  target_word: "contribute to", prompt: "Chọn giới từ đi kèm động từ 'contribute':",
  sentence: "Unabated coal burning in thermal power plants continues to contribute _______ escalating global warming.",
  options: ["to", "for", "in", "with"], correct: 0,
  vietnamese: "góp phần gây ra / đóng góp vào", phonetic: "/kənˈtrɪb.juːt tuː/", exam_task: "Writing Task 2 (Cause & Effect)",
  real_exam_sentence: "Agricultural runoff heavily contributes to eutrophication and toxic algal blooms in inland lakes.",
  common_mistake: "Thí sinh Việt Nam thường dùng 'contribute for'; cấu trúc chuẩn quốc tế là: contribute TO something.",
  explanation: "'Contribute to something / doing something' = be a significant factor in causing something."
});
addQ({
  id: "g11_prep_03", grade: 11, grade_label: "Lớp 11", unit: "Unit 8: Becoming Independent", mode: "preposition", band: "7.0", topic: "Psychology",
  target_word: "rely on", prompt: "Chọn giới từ đi kèm động từ 'rely':",
  sentence: "Autonomous university students cannot perpetually rely _______ parental financial support.",
  options: ["on", "with", "to", "for"], correct: 0,
  vietnamese: "dựa dẫm, phụ thuộc vào ai/cái gì", phonetic: "/rɪˈlaɪ ɒn/", exam_task: "Writing Task 2 (Youth Independence)",
  real_exam_sentence: "Modern agricultural supply networks rely on satellite meteorology to schedule crop harvesting.",
  common_mistake: "Nhầm 'rely on' với 'depend to'; cả 'rely' và 'depend' đều đi với giới từ 'on / upon'.",
  explanation: "'Rely on / upon someone' = trust or depend on someone for support."
});

addQ({
  id: "g12_prep_01", grade: 12, grade_label: "Lớp 12", unit: "Unit 1: Life Stories We Admire", mode: "preposition", band: "7.0", topic: "Society",
  target_word: "dedicate to", prompt: "Chọn giới từ đi kèm cấu trúc 'dedicate oneself':",
  sentence: "Nobel laureates dedicate their entire adult careers _______ pioneering groundbreaking scientific remedies.",
  options: ["to", "for", "in", "with"], correct: 0,
  vietnamese: "cống hiến hết mình cho sự nghiệp/mục tiêu gì", phonetic: "/ˈded.ɪ.keɪt tuː/", exam_task: "Writing Task 2 & Speaking Part 2",
  real_exam_sentence: "Conservationists dedicate their lives to shielding vulnerable primate populations from illegal trafficking.",
  common_mistake: "Sau 'dedicate something TO' là một danh từ hoặc V-ing; thí sinh thường viết nhầm V-nguyên thể.",
  explanation: "'Dedicate something TO something/V-ing' là cấu trúc học thuật Band 7.0+."
});
addQ({
  id: "g12_prep_02", grade: 12, grade_label: "Lớp 12", unit: "Unit 5: The World of Work", mode: "preposition", band: "7.0", topic: "Work",
  target_word: "apply for", prompt: "Chọn giới từ đi kèm động từ 'apply':",
  sentence: "Recent university graduates are strongly encouraged to apply _______ advertised engineering vacancies.",
  options: ["for", "to", "in", "with"], correct: 0,
  vietnamese: "nộp hồ sơ ứng tuyển vào vị trí công việc", phonetic: "/əˈplaɪ fɔːr/", exam_task: "Writing Task 2 (Careers & Recruitment)",
  real_exam_sentence: "Prospective interns should apply for entry-level positions that provide substantive vocational mentorship.",
  common_mistake: "Nhầm 'apply FOR a job' (nộp đơn xin việc) với 'apply TO an organization' (nộp hồ sơ gửi tới công ty nào).",
  explanation: "Khi tân ngữ là chức vụ hoặc việc làm ('vacancies'), bắt buộc dùng giới từ 'for'."
});
addQ({
  id: "g12_prep_03", grade: 12, grade_label: "Lớp 12", unit: "Unit 8: Wildlife Conservation", mode: "preposition", band: "7.5", topic: "Environment",
  target_word: "push to the brink of", prompt: "Chọn giới từ đứng trước cụm 'the brink of':",
  sentence: "Poaching has pushed the northern white rhinoceros _______ the very brink of irrevocable extinction.",
  options: ["to", "at", "in", "by"], correct: 0,
  vietnamese: "đẩy cái gì tới bờ vực tuyệt chủng", phonetic: "/tuː ðə brɪŋk əv/", exam_task: "Writing Task 2 (Endangered Wildlife)",
  real_exam_sentence: "Relentless deep-sea trawling has pushed several commercial marine species to the brink of population collapse.",
  common_mistake: "Thường dùng giới từ 'on' khi ở trạng thái tĩnh; khi đi với động từ hành động 'push', bắt buộc dùng giới từ 'to': push something TO the brink of.",
  explanation: "'Push something to the brink of' = đẩy vào tình thế nguy cấp sát bờ vực."
});

// ==========================================
// 6. SENTENCE CLOZE (21 QUESTIONS: 3 per Grade 6..12)
// ==========================================
addQ({
  id: "g6_cloze_01", grade: 6, grade_label: "Lớp 6", unit: "Unit 1: My New School", mode: "sentence_cloze", band: "5.0", topic: "Education",
  target_word: "timetable", prompt: "Chọn từ học thuật thích hợp điền vào câu:",
  sentence: "A well-organised weekly _______ allows pupils to balance study periods and leisure activities.",
  options: ["timetable", "billboard", "receipt", "voucher"], correct: 0,
  vietnamese: "thời khóa biểu, lịch trình học tập", phonetic: "/ˈtaɪmˌteɪ.bəl/", exam_task: "Speaking Part 1 (Study Routines)",
  real_exam_sentence: "Following a realistic study timetable prevents cramming and late-night exam exhaustion.",
  common_mistake: "Tiếng Anh Mỹ gọi là 'schedule'; trong chương trình Global Success dùng 'timetable'.",
  explanation: "'Timetable' chỉ thời khóa biểu phân bổ giờ học và tiết học khoa học."
});
addQ({
  id: "g6_cloze_02", grade: 6, grade_label: "Lớp 6", unit: "Unit 11: Our Greener World", mode: "sentence_cloze", band: "5.0", topic: "Environment",
  target_word: "recycle", prompt: "Chọn động từ bảo vệ môi trường thích hợp:",
  sentence: "Households should diligently _______ discarded aluminium cans and cardboard boxes.",
  options: ["recycle", "contaminate", "abandon", "discharge"], correct: 0,
  vietnamese: "tái chế vật liệu phế thải", phonetic: "/ˌriːˈsaɪ.kəl/", exam_task: "Writing Task 2 (Waste Management)",
  real_exam_sentence: "Municipal programs that recycle municipal solid waste mitigate the depletion of virgin timber resources.",
  common_mistake: "Nhầm 'recycle' (chế biến lại thành vật liệu mới) với 'reuse' (dùng lại nguyên trạng món đồ).",
  explanation: "'Recycle' biến rác thải thành nguyên liệu sản xuất sản phẩm mới."
});
addQ({
  id: "g6_cloze_03", grade: 6, grade_label: "Lớp 6", unit: "Unit 9: Cities of the World", mode: "sentence_cloze", band: "5.0", topic: "Culture",
  target_word: "palace", prompt: "Chọn công trình hoàng gia tráng lệ:",
  sentence: "Tourists gathered outside the royal _______ to witness the traditional changing of the guard ceremony.",
  options: ["palace", "warehouse", "barracks", "refinery"], correct: 0,
  vietnamese: "cung điện hoàng gia nguy nga", phonetic: "/ˈpæl.ɪs/", exam_task: "Speaking Part 2 (Historic Places)",
  real_exam_sentence: "The imperial palace displays priceless artefacts chronicling centuries of dynastic sovereignty.",
  common_mistake: "Nhầm 'palace' (cung điện nguy nga) với 'place' (địa điểm).",
  explanation: "'Royal palace' là cung điện của hoàng gia hoặc nguyên thủ."
});

addQ({
  id: "g7_cloze_01", grade: 7, grade_label: "Lớp 7", unit: "Unit 10: Energy Sources", mode: "sentence_cloze", band: "5.5", topic: "Environment",
  target_word: "solar", prompt: "Chọn cụm thiết bị năng lượng tái tạo:",
  sentence: "Installing rooftop _______ panels enables suburban houses to generate zero-emission electricity.",
  options: ["solar", "lunar", "stellar", "atomic"], correct: 0,
  vietnamese: "pin năng lượng mặt trời", phonetic: "/ˈsəʊ.lə ˌpæn.əlz/", exam_task: "Writing Task 2 (Clean Energy)",
  real_exam_sentence: "Subsidies for residential solar panels have accelerated the decentralisation of metropolitan power grids.",
  common_mistake: "Dùng từ 'sun panels'; tính từ bắt buộc trong tiếng Anh học thuật là 'solar panels'.",
  explanation: "'Solar panels' là thiết bị quang điện hấp thụ ánh sáng mặt trời tạo ra điện."
});
addQ({
  id: "g7_cloze_02", grade: 7, grade_label: "Lớp 7", unit: "Unit 7: Traffic", mode: "sentence_cloze", band: "5.5", topic: "Transport",
  target_word: "helmet", prompt: "Chọn từ vựng an toàn giao thông:",
  sentence: "Wearing a certified crash _______ dramatically lowers the fatality rate of two-wheeled collisions.",
  options: ["helmet", "glove", "scarf", "beret"], correct: 0,
  vietnamese: "mũ bảo hiểm bảo hộ", phonetic: "/ˈhel.mɪt/", exam_task: "Writing Task 2 (Road Safety Regulations)",
  real_exam_sentence: "Enforcing mandatory helmet legislation has proven to be the most cost-effective road safety intervention.",
  common_mistake: "Phát âm sai âm cuối /t/.",
  explanation: "'Crash helmet' là mũ bảo hiểm bắt buộc khi điều khiển xe mô tô, xe gắn máy."
});
addQ({
  id: "g7_cloze_03", grade: 7, grade_label: "Lớp 7", unit: "Unit 11: Travelling in the Future", mode: "sentence_cloze", band: "5.5", topic: "Transport",
  target_word: "electric car", prompt: "Chọn phương tiện giao thông xanh:",
  sentence: "Subsidies for each zero-emission _______ accelerate the phase-out of internal combustion engines.",
  options: ["electric car", "steam locomotive", "diesel lorry", "petrol tanker"], correct: 0,
  vietnamese: "xe ô tô điện không phát thải", phonetic: "/iˈlek.trɪk kɑːr/", exam_task: "Writing Task 2 (Green Transportation)",
  real_exam_sentence: "The rapid rollout of electric cars relies heavily upon expansive municipal fast-charging infrastructure.",
  common_mistake: "Dùng 'electrical car'; tính từ dùng cho phương tiện chạy bằng điện là 'electric car'.",
  explanation: "'Electric car / vehicle (EV)' là phương tiện không phát thải khí nhà kính tại chỗ."
});

addQ({
  id: "g8_cloze_01", grade: 8, grade_label: "Lớp 8", unit: "Unit 9: Natural Disasters", mode: "sentence_cloze", band: "6.0", topic: "Environment",
  target_word: "earthquake", prompt: "Chọn thảm họa thiên tai phù hợp ngữ cảnh câu:",
  sentence: "Buildings engineered with seismic shock absorbers can withstand a catastrophic _______ with minimal damage.",
  options: ["earthquake", "drought", "blizzard", "heatwave"], correct: 0,
  vietnamese: "trận động đất kinh hoàng", phonetic: "/ˈɜːθ.kweɪk/", exam_task: "Writing Task 2 (Disaster Resilience)",
  real_exam_sentence: "The catastrophic earthquake dismantled urban infrastructure across several coastal prefectures.",
  common_mistake: "Viết tách thành 2 từ 'earth quake'; từ vựng này viết liền mạch không khoảng trắng.",
  explanation: "'Earthquake' (động đất) đi kèm với các từ chuyên môn như 'seismic', 'tremor', 'Richter scale'."
});
addQ({
  id: "g8_cloze_02", grade: 8, grade_label: "Lớp 8", unit: "Unit 4: Ethnic Groups of Viet Nam", mode: "sentence_cloze", band: "6.0", topic: "Culture",
  target_word: "stilt", prompt: "Chọn kiểu kiến trúc truyền thống vùng cao:",
  sentence: "Traditional _______ houses are elevated above ground level to deter hazardous wildlife and flash floods.",
  options: ["stilt", "brick", "concrete", "glass"], correct: 0,
  vietnamese: "nhà sàn truyền thống", phonetic: "/stɪlt haʊzɪz/", exam_task: "Speaking Part 2 (Indigenous Architecture)",
  real_exam_sentence: "Indigenous ethnic minorities construct wooden stilt houses on hillsides to harmonize with rugged mountainous terrain.",
  common_mistake: "Dịch sai từ 'stilt' thành cọc rào; 'stilt house' là thuật ngữ chỉ nhà sàn dựng trên cột cao.",
  explanation: "'Stilt house' là kiến trúc nhà sàn đặc trưng của các dân tộc thiểu số Việt Nam."
});
addQ({
  id: "g8_cloze_03", grade: 8, grade_label: "Lớp 8", unit: "Unit 2: Life in the Countryside", mode: "sentence_cloze", band: "5.5", topic: "Agriculture",
  target_word: "paddy field", prompt: "Chọn từ chỉ cánh đồng lúa nước:",
  sentence: "Farmers irrigate the fertile _______ field before transplanting tender young rice seedlings.",
  options: ["paddy", "pasture", "meadow", "orchard"], correct: 0,
  vietnamese: "cánh đồng ruộng lúa nước", phonetic: "/ˈpæd.i fiːld/", exam_task: "Speaking Part 1 (Countryside Life)",
  real_exam_sentence: "Expansive green paddy fields framed by towering limestone mountains define the picturesque rural landscape.",
  common_mistake: "Dùng từ 'rice field' đơn giản; trong học thuật và sách giáo khoa dùng 'paddy field' rất chuẩn.",
  explanation: "'Paddy field' là ruộng ngập nước chuyên trồng lúa."
});

addQ({
  id: "g9_cloze_01", grade: 9, grade_label: "Lớp 9", unit: "Unit 3: Healthy Living for Teens", mode: "sentence_cloze", band: "6.5", topic: "Health",
  target_word: "time management", prompt: "Chọn kỹ năng mềm thiết yếu:",
  sentence: "Mastering practical _______ management enables high school seniors to prepare for entrance exams without burnout.",
  options: ["time", "cash", "stage", "space"], correct: 0,
  vietnamese: "quản lý quỹ thời gian khoa học", phonetic: "/taɪm ˈmæn.ɪdʒ.mənt/", exam_task: "Writing Task 2 (Study Skills)",
  real_exam_sentence: "Effective time management is the single most decisive factor distinguishing high-performing undergraduates.",
  common_mistake: "Dùng 'timing management'; danh từ chuẩn là 'time management'.",
  explanation: "'Time management' là kỹ năng quản lý thời gian sống còn trong học tập và công việc."
});
addQ({
  id: "g9_cloze_02", grade: 9, grade_label: "Lớp 9", unit: "Unit 10: Planet Earth", mode: "sentence_cloze", band: "6.5", topic: "Environment",
  target_word: "ecosystem", prompt: "Chọn thuật ngữ sinh học môi trường:",
  sentence: "Industrial chemical discharge inflicts irreversible trauma upon the delicate mangrove _______.",
  options: ["ecosystem", "apparatus", "enterprise", "monument"], correct: 0,
  vietnamese: "hệ sinh thái rừng ngập mặn", phonetic: "/ˈiː.kəʊˌsɪs.təm/", exam_task: "Writing Task 2 (Ecosystem Protection)",
  real_exam_sentence: "Preserving coral reefs is imperative because they sustain one-quarter of all marine ecosystems on Earth.",
  common_mistake: "Phát âm sai âm đầu /iː/ thành /e/. Phải là /ˈiː.kəʊ/.",
  explanation: "'Ecosystem' (hệ sinh thái) bao gồm toàn bộ quần xã sinh vật và môi trường sống của chúng."
});
addQ({
  id: "g9_cloze_03", grade: 9, grade_label: "Lớp 9", unit: "Unit 2: City Life", mode: "sentence_cloze", band: "6.0", topic: "Transport",
  target_word: "skytrain", prompt: "Chọn phương tiện đường sắt trên cao:",
  sentence: "The metropolitan _______ transports thousands of rush-hour commuters above jammed highway intersections.",
  options: ["skytrain", "cable car", "ferryboat", "monocycle"], correct: 0,
  vietnamese: "tàu điện trên cao", phonetic: "/ˈskaɪ.treɪn/", exam_task: "Writing Task 2 (City Transport Systems)",
  real_exam_sentence: "Expanding elevated skytrain lines circumvents congested surface intersections in bustling Asian capitals.",
  common_mistake: "Nhầm 'skytrain' với 'cable car' (cáp treo du lịch leo núi).",
  explanation: "'Skytrain' là hệ thống tàu đường sắt trên cao giảm tải áp lực mặt đường."
});

addQ({
  id: "g10_cloze_01", grade: 10, grade_label: "Lớp 10", unit: "Unit 9: Protecting the Environment", mode: "sentence_cloze", band: "7.0", topic: "Environment",
  target_word: "deforestation", prompt: "Chọn danh từ học thuật chỉ hiểm họa rừng:",
  sentence: "Uncontrolled commercial _______ in the Amazon basin obliterates indigenous flora and fauna.",
  options: ["deforestation", "reforestation", "afforestation", "plantation"], correct: 0,
  vietnamese: "nạn tàn phá rừng ồ ạt", phonetic: "/diːˌfɒr.ɪˈsteɪ.ʃən/", exam_task: "Writing Task 2 (Rainforest Destruction)",
  real_exam_sentence: "Halting tropical deforestation is the most rapid and scalable nature-based climate solution available today.",
  common_mistake: "Nhầm 'deforestation' (phá rừng) với 'afforestation' (trồng cây gây rừng mới). Tiền tố 'de-' mang nghĩa phá hủy/loại bỏ.",
  explanation: "'Deforestation' là nguyên nhân hàng đầu làm suy thoái đa dạng sinh học và tăng phát thải carbon."
});
addQ({
  id: "g10_cloze_02", grade: 10, grade_label: "Lớp 10", unit: "Unit 7: International Organisations", mode: "sentence_cloze", band: "7.0", topic: "Diplomacy",
  target_word: "peacekeeping", prompt: "Chọn hoạt động ngoại giao quân sự quốc tế:",
  sentence: "Vietnamese military personnel deploy under United Nations banners to conduct global _______ missions.",
  options: ["peacekeeping", "warmongering", "espionage", "conquest"], correct: 0,
  vietnamese: "sứ mệnh gìn giữ hòa bình quốc tế", phonetic: "/ˈpiːsˌkiː.pɪŋ/", exam_task: "Speaking Part 3 (Global Cooperation)",
  real_exam_sentence: "Participation in international peacekeeping operations burnishes a sovereign nation's geopolitical reputation.",
  common_mistake: "Viết tách thành 2 từ; 'peacekeeping' là một danh từ ghép viết liền.",
  explanation: "'Peacekeeping missions' là các phái bộ gìn giữ hòa bình Liên Hợp Quốc."
});
addQ({
  id: "g10_cloze_03", grade: 10, grade_label: "Lớp 10", unit: "Unit 4: For a Better Community", mode: "sentence_cloze", band: "6.5", topic: "Society",
  target_word: "donate", prompt: "Chọn động từ cứu trợ nhân đạo:",
  sentence: "Generous benefactors readily _______ non-perishable food supplies to municipal emergency shelters.",
  options: ["donate", "extort", "withhold", "confiscate"], correct: 0,
  vietnamese: "quyên góp, ủng hộ hàng cứu trợ", phonetic: "/dəʊˈneɪt/", exam_task: "Writing Task 2 (Community Engagement)",
  real_exam_sentence: "Community solidarity inspires citizens to donate winter blankets to homeless individuals during blizzards.",
  common_mistake: "Nhầm lẫn giữa 'donate' (quyên góp từ thiện) và 'invest' (đầu tư sinh lời).",
  explanation: "'Donate' là hành động đóng góp tự nguyện nhằm giúp đỡ đồng bào yếu thế."
});

addQ({
  id: "g11_cloze_01", grade: 11, grade_label: "Lớp 11", unit: "Unit 5: Global Warming", mode: "sentence_cloze", band: "7.0", topic: "Environment",
  target_word: "fossil", prompt: "Chọn nguồn năng lượng không tái tạo gây hại khí hậu:",
  sentence: "Phasing out subsidized _______ fuels is imperative to meeting net-zero carbon pledges.",
  options: ["fossil", "stellar", "kinetic", "hydropower"], correct: 0,
  vietnamese: "nhiên liệu hóa thạch (than đá, dầu mỏ, khí đốt)", phonetic: "/ˈfɒs.əl ˌfjuː.əlz/", exam_task: "Writing Task 2 (Energy Transition)",
  real_exam_sentence: "Heavy reliance on imported fossil fuels exposes national economies to acute global price shocks.",
  common_mistake: "Dùng từ số ít; khi nói về các nguồn nhiên liệu hóa thạch nói chung, luôn dùng số nhiều: 'fossil fuels'.",
  explanation: "'Fossil fuels' là nhiên liệu tạo thành từ hóa thạch sinh vật qua hàng triệu năm."
});
addQ({
  id: "g11_cloze_02", grade: 11, grade_label: "Lớp 11", unit: "Unit 7: Education Options", mode: "sentence_cloze", band: "7.0", topic: "Education",
  target_word: "vocational", prompt: "Chọn loại hình đào tạo định hướng nghề nghiệp:",
  sentence: "High-quality _______ academies train skilled technicians for thriving manufacturing sectors.",
  options: ["vocational", "fictional", "theatrical", "superficial"], correct: 0,
  vietnamese: "thuộc về đào tạo nghề thực hành", phonetic: "/vəʊˈkeɪ.ʃən.əl/", exam_task: "Writing Task 2 (University vs Trade School)",
  real_exam_sentence: "Investing in vocational education bridges the widening technical skills gap in modern automated industries.",
  common_mistake: "Nhầm 'vocational' (dạy nghề) với 'vacational' (thuộc về kỳ nghỉ hè).",
  explanation: "'Vocational school / training' là hệ thống trường dạy nghề thực hành."
});
addQ({
  id: "g11_cloze_03", grade: 11, grade_label: "Lớp 11", unit: "Unit 9: Social Issues", mode: "sentence_cloze", band: "7.0", topic: "Society",
  target_word: "bullying", prompt: "Chọn vấn đề bạo lực học đường nhức nhối:",
  sentence: "Schools have adopted zero-tolerance protocols to eradicate verbal and cyber _______ amongst students.",
  options: ["bullying", "tutoring", "mentoring", "networking"], correct: 0,
  vietnamese: "nạn bạo lực, bắt nạt học đường và mạng xã hội", phonetic: "/ˈbʊl.i.ɪŋ/", exam_task: "Writing Task 2 (Youth & Social Problems)",
  real_exam_sentence: "Cyber bullying inflicts profound psychological scarring on impressionable teenagers if left unchecked.",
  common_mistake: "Viết sai chính tả thành 'bulling' (thiếu chữ 'y').",
  explanation: "'Bullying' (học đường/không gian mạng) là chủ nạn xã hội lớn trong Unit 9 Tiếng Anh 11."
});

addQ({
  id: "g12_cloze_01", grade: 12, grade_label: "Lớp 12", unit: "Unit 3: Green Living", mode: "sentence_cloze", band: "7.5", topic: "Environment",
  target_word: "landfill", prompt: "Chọn từ chỉ nơi chôn lấp rác thải đô thị:",
  sentence: "Diverting household organic refuse into compost bins drastically reduces methane emissions from urban _______ sites.",
  options: ["landfill", "minefield", "airfield", "battlefield"], correct: 0,
  vietnamese: "bãi chôn lấp rác thải đô thị", phonetic: "/ˈlænd.fɪl/", exam_task: "Writing Task 2 (Urban Waste & Recycling)",
  real_exam_sentence: "Sanitary landfill facilities must be lined with impermeable membranes to prevent groundwater contamination.",
  common_mistake: "Viết tách thành 'land fill'; đây là một danh từ ghép viết liền.",
  explanation: "'Landfill sites' là nơi tập kết chôn lấp rác thải sinh hoạt."
});
addQ({
  id: "g12_cloze_02", grade: 12, grade_label: "Lớp 12", unit: "Unit 6: Artificial Intelligence", mode: "sentence_cloze", band: "7.5", topic: "Technology",
  target_word: "automate", prompt: "Chọn động từ công nghệ thích hợp điền vào câu:",
  sentence: "Enterprises deploy generative machine learning to _______ repetitive data classification workflows.",
  options: ["automate", "paralyze", "postpone", "deteriorate"], correct: 0,
  vietnamese: "tự động hóa quy trình làm việc", phonetic: "/ˈɔː.tə.meɪt/", exam_task: "Writing Task 2 (Future of Work)",
  real_exam_sentence: "While AI will automate routine clerical duties, it simultaneously births specialized technological vocations.",
  common_mistake: "Dùng sai dạng từ; sau 'to' cần động từ nguyên thể 'automate', không dùng danh từ 'automation'.",
  explanation: "'Automate workflows' = áp dụng máy móc tự động hóa thay thế thao tác thủ công."
});
addQ({
  id: "g12_cloze_03", grade: 12, grade_label: "Lớp 12", unit: "Unit 9: Career Paths", mode: "sentence_cloze", band: "7.5", topic: "Work",
  target_word: "internship", prompt: "Chọn danh từ chỉ giai đoạn thực tập nghề nghiệp:",
  sentence: "Completing a rigorous summer _______ at a reputable multinational corporation boosts graduate employability.",
  options: ["internship", "fellowship", "championship", "citizenship"], correct: 0,
  vietnamese: "kỳ thực tập cọ xát thực tế", phonetic: "/ˈɪn.tɜːn.ʃɪp/", exam_task: "Writing Task 2 (Youth Employment)",
  real_exam_sentence: "Paid internships provide undergraduates with indispensable professional networking and workplace acclimatization.",
  common_mistake: "Nhầm 'intern' (người thực tập sinh) với 'internship' (kỳ thực tập). Ở đây cần danh từ chỉ kỳ thực tập.",
  explanation: "'Internship' là kỳ thực tập cọ xát kinh nghiệm thực chiến cho sinh viên."
});

console.log(`Total questions compiled & verified: ${allQuestions.length}`);

// Analysis
const byGrade = {};
const byMode = {};
const byBand = {};
allQuestions.forEach(q => {
  byGrade[q.grade] = (byGrade[q.grade] || 0) + 1;
  byMode[q.mode] = (byMode[q.mode] || 0) + 1;
  byBand[q.band] = (byBand[q.band] || 0) + 1;
});

console.log("Distribution by Grade:", byGrade);
console.log("Distribution by Mode:", byMode);
console.log("Distribution by Band:", byBand);

// Output to build_data.js and data.js
const headerComment = `/**
 * IELTS BLITZ ARENA - HỆ THỐNG TỪ VỰNG CHUẨN LỚP 6 - LỚP 12 (GLOBAL SUCCESS ➔ IELTS BAND 7.0+)
 * Tham chiếu 100% từ kho học liệu Danh English Tutor (https://github.com/danhlearning/Danh_English_Tutor.git)
 * Phân bố chuẩn mực: ${allQuestions.length} câu hỏi độc nhất, chia đều 6 chế độ thi & 7 khối lớp (Lớp 6 đến Lớp 12)
 * Toàn bộ từ vựng cũ đã được gỡ bỏ hoàn toàn và thay thế bởi hệ thống chương trình chuẩn.
 */
`;

const buildDataContent = `const fs = require('fs');

const questions = ${JSON.stringify(allQuestions, null, 2)};

const output = \`${headerComment}
const IELTS_VOCAB_BANK = \${JSON.stringify(questions, null, 2)};

// Helper để random và trộn mảng (Fisher-Yates shuffle)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
\`;

fs.writeFileSync('data.js', output, 'utf8');
console.log('Successfully written data.js with ' + questions.length + ' questions.');
`;

fs.writeFileSync('build_data.js', buildDataContent, 'utf8');

const dataContent = `${headerComment}
const IELTS_VOCAB_BANK = ${JSON.stringify(allQuestions, null, 2)};

// Helper để random và trộn mảng (Fisher-Yates shuffle)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
`;

fs.writeFileSync('data.js', dataContent, 'utf8');
console.log('Wrote data.js and build_data.js successfully.');
