// Handles the 'Generează un test' pane
export function initGenerateTestPane(mainContent, chaptersData, bookNames, bookCollections) {
  mainContent.innerHTML = `<div class="generate-test-pane">
    <h2>Generează un test personalizat</h2>
    <form id="generateTestForm">
      <div class="book-chapter-list">
        ${Object.entries(chaptersData).map(([bookKey, chapters]) => `
          <div class="book-group" style="margin-bottom:1.5rem;">
            <div style="font-weight:bold;font-size:1.1rem;margin-bottom:0.5rem;">${bookNames[bookKey]}</div>
            <div class="chapter-list" style="display:flex;flex-direction:column;gap:0.2rem;">
              ${Object.entries(chapters).map(([chapterName, chapterId]) => `
                <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.98rem;line-height:1.3;cursor:pointer;">
                  <input type="checkbox" class="chapter-checkbox" data-book="${bookKey}" data-chapter="${chapterId}" data-chapter-name="${chapterName}" style="accent-color:#4f46e5;width:1rem;height:1rem;" />
                  <span style="color:#222;">${chapterName}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      <div style="margin:2rem 0 2.5rem 0;display:flex;align-items:center;gap:1.5rem;">
        <label for="numQuestions" style="font-size:1.1rem;"><b>Număr întrebări:</b></label>
        <input type="number" id="numQuestions" name="numQuestions" min="1" max="100" value="20" required style="margin-left:0;width:100px;font-size:1.1rem;padding:0.4rem 0.7rem;border-radius:8px;border:1px solid #ccc;" />
      </div>
      <button type="submit" class="question-btn" style="width:100%;font-size:1.15rem;padding:0.7rem 0;margin-top:1.5rem;letter-spacing:0.03em;">Generează testul</button>
    </form>
    <div id="generateTestStatus" style="margin-top:1.5rem;"></div>
  </div>`;

  // Book checkbox toggles all chapters
  mainContent.querySelectorAll('.book-checkbox').forEach(bookCb => {
    bookCb.addEventListener('change', function() {
      const book = this.getAttribute('data-book');
      mainContent.querySelectorAll(`.chapter-checkbox[data-book="${book}"]`).forEach(cb => {
        cb.checked = this.checked;
      });
    });
  });

  // Form submit handler
  mainContent.querySelector('#generateTestForm').onsubmit = async function(e) {
    e.preventDefault();
    const selectedChapters = Array.from(mainContent.querySelectorAll('.chapter-checkbox:checked'))
      .map(cb => ({
        book: cb.getAttribute('data-book'),
        chapter: cb.getAttribute('data-chapter'),
        chapterName: cb.getAttribute('data-chapter-name')
      }));
    const numQuestions = parseInt(mainContent.querySelector('#numQuestions').value, 10);
    if (!selectedChapters.length || !numQuestions) {
      mainContent.querySelector('#generateTestStatus').innerHTML = '<span style="color:red">Selectează cel puțin un capitol și numărul de întrebări.</span>';
      return;
    }
    mainContent.querySelector('#generateTestStatus').innerHTML = 'Se încarcă întrebările...';
    // Fetch questions for all selected chapters
    let chapterQuestions = [];
    for (const {book, chapter, chapterName} of selectedChapters) {
      const collection = bookCollections[book];
      const snapshot = await firebase.firestore().collection(collection).doc(chapter).collection('questions').get();
      const questions = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        data._docId = doc.id;
        data._book = book;
        data._bookName = bookNames[book];
        data._chapter = chapter;
        data._chapterName = chapterName;
        questions.push(data);
      });
      chapterQuestions.push({book, chapter, chapterName, questions});
    }
    // Round-robin selection
    let selectedQuestions = [];
    let chapterIdx = 0;
    let chapterOrder = chapterQuestions.filter(cq => cq.questions.length > 0);
    let usedIdx = chapterOrder.map(() => 0);
    while (selectedQuestions.length < numQuestions && chapterOrder.length > 0) {
      for (let i = 0; i < chapterOrder.length && selectedQuestions.length < numQuestions; i++) {
        const cq = chapterOrder[i];
        if (usedIdx[i] < cq.questions.length) {
          // Pick a random question not already picked
          let available = cq.questions.filter((q, idx) => !selectedQuestions.includes(q));
          if (available.length === 0) continue;
          let q = available[Math.floor(Math.random() * available.length)];
          // Add extra fields
          q["Capitol"] = `${cq.bookName || bookNames[cq.book]} - ${cq.chapterName}`;
          selectedQuestions.push(q);
          usedIdx[i]++;
        }
      }
      // Remove chapters with no more questions
      chapterOrder = chapterOrder.filter((cq, i) => usedIdx[i] < cq.questions.length);
      usedIdx = usedIdx.filter((v, i) => chapterOrder[i]);
    }
    if (selectedQuestions.length === 0) {
      mainContent.querySelector('#generateTestStatus').innerHTML = '<span style="color:red">Nu s-au găsit întrebări pentru capitolele selectate.</span>';
      return;
    }
    // Save test to Firestore
    const user = firebase.auth().currentUser;
    const testDoc = await firebase.firestore().collection('generated_tests').add({
      user: user ? user.uid : null,
      created: new Date(),
      questions: selectedQuestions,
      chapters: selectedChapters,
      numQuestions: selectedQuestions.length
    });
    // Display test
    renderGeneratedTest(selectedQuestions, testDoc.id);
  };

  // Helper to render the generated test
  async function renderGeneratedTest(questions, testId) {
    let currentIndex = 0;
    let userAnswers = Array(questions.length).fill(null);
    mainContent.innerHTML = `<div class="questionnaire" id="generatedTestPane"></div>`;
    const testPane = mainContent.querySelector('#generatedTestPane');
    function stripLetter(s) {
      return String(s).replace(/^\s*[A-Ea-e]\.\s+/, '').trim();
    }
    function renderQuestion(idx) {
      const q = questions[idx];
      if (!q) return;
      const isMultiple = (q["Răspunsuri"] || []).length > 1;
      let questionText = q["Întrebare răspuns simplu"] || q["Întrebare răspuns multiplu"] || q["întrebare răspuns simplu"] || q["întrebare răspuns multiplu"] || '';
      questionText = questionText.replace(/^\s*\d+\.?\s*/, '');
      let options = (q.Variante || []).slice();
      // Shuffle options
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      testPane.innerHTML = `
        <div class="question-number">Întrebarea ${idx + 1} din ${questions.length}</div>
        <div class="question-text">${questionText}</div>
        <form id="answerForm">
          <div class="options">
            ${options.map(opt => `
              <label class="option-label">
                <input type="${isMultiple ? 'checkbox' : 'radio'}" name="option${isMultiple ? '[]' : ''}" value="${opt}" ${isMultiple ? '' : 'required'} />
                <span>${stripLetter(opt)}</span>
              </label>
            `).join('')}
          </div>
          <button type="submit" class="question-btn">Răspunde</button>
        </form>
        <div id="feedback"></div>
        <div class="question-nav">
          <button id="prevQ" class="question-btn" ${idx === 0 ? 'disabled' : ''}>Întrebarea anterioară</button>
          <button id="nextQ" class="question-btn" ${idx === questions.length - 1 ? 'disabled' : ''}>Întrebarea următoare</button>
        </div>
      `;
      document.getElementById('prevQ').onclick = function() {
        if (currentIndex > 0) { currentIndex--; renderQuestion(currentIndex); }
      };
      document.getElementById('nextQ').onclick = function() {
        if (currentIndex < questions.length - 1) { currentIndex++; renderQuestion(currentIndex); }
      };
      document.getElementById('answerForm').onsubmit = function(e) {
        e.preventDefault();
        const normalize = v => String(v).replace(/^\s*[A-Ea-e]\.\s+/, '').trim().toLowerCase();
        const correctAnswers = (q["Răspunsuri"] || []).map(normalize);
        const selected = Array.from(document.querySelectorAll('.option-label input:checked')).map(i => normalize(i.value));
        userAnswers[idx] = selected;
        const correctSet = new Set(correctAnswers);
        const selectedSet = new Set(selected);
        document.querySelectorAll('.option-label').forEach(label => {
          const input = label.querySelector('input');
          const val = normalize(input.value);
          if (correctSet.has(val)) {
            label.style.background = '#c6f7d0';
          }
          if (selectedSet.has(val) && !correctSet.has(val)) {
            label.style.background = '#ffd6d6';
          }
        });
        // Show Pagina, Sursa, Capitol
        let pagina = q['partition'] ? (q['partition'].match(/^(\d+)/) || [])[1] : (q['pagina'] || '');
        let paginaHtml = pagina ? `<div class="pagina" style="margin:1.2rem 0 0.2rem 0; color:#444; background:#f4f4f4; border-radius:8px; padding:0.6rem 1rem; font-size:1rem;"><b>Pagina:</b> ${pagina}</div>` : '';
        const sursa = q['Sursa'] ? `<div class="sursa" style="margin:0.2rem 0 0.5rem 0; color:#444; background:#f4f4f4; border-radius:8px; padding:0.8rem 1rem; font-size:1rem;"><b>Sursa:</b> ${q['Sursa']}</div>` : '';
        const capitol = q['Capitol'] ? `<div class="capitol" style="margin:0.2rem 0 0.5rem 0; color:#444; background:#f4f4f4; border-radius:8px; padding:0.8rem 1rem; font-size:1rem;"><b>Capitol:</b> ${q['Capitol']}</div>` : '';
        document.getElementById('feedback').innerHTML = paginaHtml + sursa + capitol;
        document.querySelectorAll('.option-label input').forEach(i => i.disabled = true);
        document.querySelector('.question-btn[type="submit"]').disabled = true;
        // If last question, show summary
        if (idx === questions.length - 1) {
          setTimeout(() => renderTestSummary(), 800);
        }
      };
    }
    renderQuestion(currentIndex);
    // Summary after last question
    function renderTestSummary() {
      // Score calculation
      let correct = 0;
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const normalize = v => String(v).replace(/^\s*[A-Ea-e]\.\s+/, '').trim().toLowerCase();
        const correctAnswers = (q["Răspunsuri"] || []).map(normalize);
        const userAns = userAnswers[i] || [];
        if (userAns.length === correctAnswers.length && userAns.every(a => correctAnswers.includes(a))) {
          correct++;
        }
      }
      let percent = (correct / questions.length * 100).toFixed(1);
      testPane.innerHTML = `<div class="test-summary">
        <h2>Rezultatul testului</h2>
        <div class="score">Scor: <b>${correct} / ${questions.length}</b> (${percent}%)</div>
        <div class="scrollable-questions">
          ${questions.map((q, idx) => {
            const isMultiple = (q["Răspunsuri"] || []).length > 1;
            let questionText = q["Întrebare răspuns simplu"] || q["Întrebare răspuns multiplu"] || q["întrebare răspuns simplu"] || q["întrebare răspuns multiplu"] || '';
            questionText = questionText.replace(/^\s*\d+\.?\s*/, '');
            let options = (q.Variante || []).slice();
            // Shuffle options for display
            for (let i = options.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [options[i], options[j]] = [options[j], options[i]];
            }
            const normalize = v => String(v).replace(/^\s*[A-Ea-e]\.\s+/, '').trim().toLowerCase();
            const correctAnswers = (q["Răspunsuri"] || []).map(normalize);
            const userAns = userAnswers[idx] || [];
            return `<div class="questionnaire" style="max-width:900px;margin:1.5rem auto;">
              <div class="question-number">Întrebarea ${idx + 1} din ${questions.length}</div>
              <div class="question-text">${questionText}</div>
              <div class="options">
                ${options.map(opt => {
                  const val = normalize(opt);
                  let style = '';
                  if (correctAnswers.includes(val)) style = 'background:#c6f7d0;';
                  if (userAns.includes(val) && !correctAnswers.includes(val)) style = 'background:#ffd6d6;';
                  return `<span class="option-label" style="${style}">${stripLetter(opt)}</span>`;
                }).join('')}
              </div>
              <div class="pagina"><b>Pagina:</b> ${(q['partition'] ? (q['partition'].match(/^(\d+)/) || [])[1] : (q['pagina'] || ''))}</div>
              <div class="sursa"><b>Sursa:</b> ${q['Sursa'] || ''}</div>
              <div class="capitol"><b>Capitol:</b> ${q['Capitol'] || ''}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }
  }
}
