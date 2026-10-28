const fs = require('fs');

async function fetchUnits() {
  const grades = [6, 7, 8, 9, 10, 11, 12];
  const allGradeData = {};

  for (const g of grades) {
    const url = `https://raw.githubusercontent.com/danhlearning/Danh_English_Tutor/main/grade/lop${g}/assets/js/units-data.js`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.log(`Grade ${g}: HTTP ${res.status}`);
        continue;
      }
      const text = await res.text();
      console.log(`Grade ${g}: fetched ${text.length} chars`);
      
      // Let's inspect grade 6 and 7 structure
      if (g === 6 || g === 7) {
        console.log(`=== Grade ${g} preview ===`);
        console.log(text.slice(0, 300));
        console.log('--- Grade ' + g + ' tail ---');
        console.log(text.slice(-300));
      }

      // Safe evaluation using vm or Function
      const window = {};
      const sandbox = { window };
      const vm = require('vm');
      vm.createContext(sandbox);
      vm.runInContext(text, sandbox);
      
      const varKey = Object.keys(sandbox.window)[0];
      const data = sandbox.window[varKey];
      if (data && Array.isArray(data)) {
        allGradeData[g] = data;
        let wordCount = 0;
        data.forEach(u => {
          wordCount += (u.words || []).length;
        });
        console.log(`Grade ${g} (${varKey}): ${data.length} units, total words = ${wordCount}`);
        if (data.length > 0 && data[0].words && data[0].words.length > 0) {
          console.log(`  Unit 1: "${data[0].title}" (${data[0].vietnamese})`);
          console.log(`  Sample:`, data[0].words[0]);
        }
      } else {
        console.log(`Could not find data in window for Grade ${g}: keys:`, Object.keys(sandbox.window));
      }
    } catch (e) {
      console.error(`Error grade ${g}:`, e.message);
    }
  }

  fs.writeFileSync('danh_grades_raw.json', JSON.stringify(allGradeData, null, 2), 'utf8');
  console.log('Saved raw grade data to danh_grades_raw.json');
}

fetchUnits();

