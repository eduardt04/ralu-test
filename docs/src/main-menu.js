window.onerror = function(msg, url, line, col, error) {
  console.error('GLOBAL ERROR:', msg, url, line, col, error);
};
window.addEventListener('unhandledrejection', function(event) {
  console.error('UNHANDLED PROMISE REJECTION:', event.reason);
});

import { chaptersData } from './chapters_id.js';

const bookNames = {
  kumar: 'Kumar',
  lawrence: 'Lawrence',
  sinopsis: 'Sinopsis'
};

const bookCollections = {
  kumar: 'kumar_questions',
  lawrence: 'lawrence_questions',
  sinopsis: 'sinopsis_questions'
};

document.addEventListener('DOMContentLoaded', function () {
  const submenuQuestionaries = document.getElementById('submenu-questionaries');
  const mainContent = document.getElementById('main-content');
  const questionariesMenuTitle = document.querySelector('.menu-title[data-menu="questionaries"]');

  // Toggle the main Questionaries submenu
  questionariesMenuTitle.addEventListener('click', function(e) {
    e.stopPropagation();
    const open = submenuQuestionaries.classList.contains('open');
    document.querySelectorAll('.submenu').forEach(s => s.classList.remove('open'));
    document.querySelectorAll('.caret').forEach(c => c.classList.remove('down'));
    if (!open) {
      submenuQuestionaries.classList.add('open');
      questionariesMenuTitle.querySelector('.caret').classList.add('down');
    }
  });

  // Build book submenus
  Object.keys(chaptersData).forEach(bookKey => {
    // Book title
    const bookDiv = document.createElement('div');
    bookDiv.className = 'submenu-title book-menu';
    bookDiv.setAttribute('data-menu', bookKey);
    bookDiv.innerHTML = `<span>${bookNames[bookKey] || bookKey}</span><svg class="caret" viewBox="0 0 24 24"><path d="M8 10l4 4 4-4"/></svg>`;
    submenuQuestionaries.appendChild(bookDiv);

    // Chapters submenu
    const chaptersSubmenu = document.createElement('div');
    chaptersSubmenu.className = 'submenu';
    chaptersSubmenu.id = `submenu-${bookKey}`;
    Object.entries(chaptersData[bookKey]).forEach(([chapterName, chapterId]) => {
      const chapterDiv = document.createElement('div');
      chapterDiv.className = 'submenu-title chapter-menu';
      chapterDiv.setAttribute('data-book', bookKey);
      chapterDiv.setAttribute('data-chapter', chapterId);
      chapterDiv.textContent = chapterName;
      chaptersSubmenu.appendChild(chapterDiv);
    });
    submenuQuestionaries.appendChild(chaptersSubmenu);
  });

  // Use event delegation for all clicks in the sidebar
  submenuQuestionaries.addEventListener('click', async function (e) {
    const bookDiv = e.target.closest('.book-menu');
    if (bookDiv) {
      e.stopPropagation();
      const bookKey = bookDiv.getAttribute('data-menu');
      const chaptersSubmenu = document.getElementById(`submenu-${bookKey}`);
      const caret = bookDiv.querySelector('.caret');
      const open = chaptersSubmenu.classList.contains('open');
      // Only close other book submenus, not the main questionaries submenu
      submenuQuestionaries.querySelectorAll('.submenu').forEach((s, i) => {
        if (s !== chaptersSubmenu) {
          s.classList.remove('open');
        }
      });
      submenuQuestionaries.querySelectorAll('.book-menu .caret').forEach((c, i) => {
        if (caret !== c) {
          c.classList.remove('down');
        }
      });
      // Toggle the clicked book submenu
      if (open) {
        chaptersSubmenu.classList.remove('open');
        caret.classList.remove('down');
      } else {
        chaptersSubmenu.classList.add('open');
        caret.classList.add('down');
      }
      return;
    }
    const chapterDiv = e.target.closest('.chapter-menu');
    if (chapterDiv) {
      document.querySelectorAll('.submenu-title').forEach((i, idx) => { i.classList.remove('active'); });
      chapterDiv.classList.add('active');
      const bookKey = chapterDiv.getAttribute('data-book');
      const chapterId = chapterDiv.getAttribute('data-chapter');
      const collection = bookCollections[bookKey];
      if (!collection || !chapterId) { return; }
      mainContent.innerHTML = '<div>Loading questions...</div>';
      try {
        const snapshot = await firebase.firestore()
          .collection(collection)
          .doc(chapterId)
          .collection('questions')
          .get();
        const allQuestions = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          // Attach partition from doc.ref.path if not present
          if (!data.partition && doc.ref && doc.ref.parent && doc.ref.parent.parent) {
            const parentId = doc.ref.parent.id;
            if (/\d+_\d+/.test(parentId)) {
              data.partition = parentId;
            }
          }
          // Extract page number from question doc ID (e.g., '1' from '1_1')
          if (!data.pagina && doc.id) {
            const match = doc.id.match(/^(\d+)_/);
            if (match) data.pagina = match[1];
          }
          allQuestions.push(data);
        });
        if (allQuestions.length === 0) {
          mainContent.innerHTML = '<div>No questions found for this chapter.</div>';
          return;
        }
        // Sort questions by numeric page and question number
        // Helper to remove leading letter and dot (e.g., 'A. ', 'B. ', etc.)
        const stripLetter = s => String(s).replace(/^\s*[A-Ea-e]\.?\s+/, '').trim();
        // Sort questions by numeric page and question number
        allQuestions.sort((a, b) => {
          // Get numeric page/partition
          const getPage = q => {
            if (q.pagina) return parseInt(q.pagina, 10);
            if (q.partition) {
              const m = String(q.partition).match(/^(\d+)/);
              if (m) return parseInt(m[1], 10);
            }
            return 0;
          };
          // Get numeric question number from doc id if possible
          const getQNum = q => {
            if (q.id) {
              const m = String(q.id).match(/^\d+_(\d+)/);
              if (m) return parseInt(m[1], 10);
            }
            if (q["Numar întrebare"] || q["Numar_intrebare"]) {
              return parseInt(q["Numar întrebare"] || q["Numar_intrebare"], 10);
            }
            return 0;
          };
          const pageA = getPage(a), pageB = getPage(b);
          if (pageA !== pageB) return pageA - pageB;
          const qA = getQNum(a), qB = getQNum(b);
          return qA - qB;
        });
        let currentIndex = 0;
        function renderQuestion(idx) {
          const q = allQuestions[idx];
          if (!q) { return; }
          // Use 'Răspunsuri' array for correct answers, normalize for comparison, and strip letters
          const normalize = v => stripLetter(String(v)).trim().toLowerCase();
          const correctAnswers = (q["Răspunsuri"] || []).map(normalize);
          const isMultiple = correctAnswers.length > 1;
          // Remove leading number and dot from the question text
          let questionText = q["Întrebare răspuns simplu"] || q["Întrebare răspuns multiplu"] || '';
          questionText = questionText.replace(/^\s*\d+\.?\s*/, '');
          // Prepare and shuffle options, stripping letters
          let options = (q.Variante || []).map(stripLetter);
          // Shuffle options
          for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
          }
          mainContent.innerHTML = `
            <div class="questionnaire">
              <div class="question-number">Întrebarea ${idx + 1} din ${allQuestions.length}</div>
              <div class="question-text">${questionText}</div>
              <form id="answerForm">
                <div class="options">
                  ${options.map(opt => `
                    <label class="option-label">
                      <input type="${isMultiple ? 'checkbox' : 'radio'}" name="option${isMultiple ? '[]' : ''}" value="${normalize(opt)}" ${isMultiple ? '' : 'required'} />
                      <span>${opt}</span>
                    </label>
                  `).join('')}
                </div>
                <button type="submit" class="question-btn">Răspunde</button>
              </form>
              <div id="feedback"></div>
              <div class="question-nav">
                <button id="prevQ" class="question-btn" ${idx === 0 ? 'disabled' : ''}>Întrebarea anterioară</button>
                <button id="nextQ" class="question-btn" ${idx === allQuestions.length - 1 ? 'disabled' : ''}>Întrebarea următoare</button>
              </div>
            </div>
          `;
          document.getElementById('prevQ').onclick = function() {
            if (currentIndex > 0) { currentIndex--; renderQuestion(currentIndex); }
          };
          document.getElementById('nextQ').onclick = function() {
            if (currentIndex < allQuestions.length - 1) { currentIndex++; renderQuestion(currentIndex); }
          };
          document.getElementById('answerForm').onsubmit = function(e) {
            e.preventDefault();
            const selected = Array.from(document.querySelectorAll('.option-label input:checked')).map(i => normalize(i.value));
            const correctSet = new Set(correctAnswers);
            const selectedSet = new Set(selected);
            // Color feedback
            document.querySelectorAll('.option-label').forEach(label => {
              const input = label.querySelector('input');
              const val = normalize(input.value);
              if (correctSet.has(val)) {
                label.style.background = '#c6f7d0'; // green
              }
              if (selectedSet.has(val) && !correctSet.has(val)) {
                label.style.background = '#ffd6d6'; // red
              }
            });
            // Show Pagina and Sursa
            let pagina = '';
            if (q['partition']) {
              const match = q['partition'].match(/^(\d+)/);
              if (match) pagina = match[1];
            } else if (q['pagina']) {
              pagina = q['pagina'];
            }
            let paginaHtml = pagina ? `<div class="pagina" style="margin:1.2rem 0 0.2rem 0; color:#444; background:#f4f4f4; border-radius:8px; padding:0.6rem 1rem; font-size:1rem;"><b>Pagina:</b> ${pagina}</div>` : '';
            const sursa = q['Sursa'] ? `<div class="sursa" style="margin:0.2rem 0 0.5rem 0; color:#444; background:#f4f4f4; border-radius:8px; padding:0.8rem 1rem; font-size:1rem;"><b>Sursa:</b> ${q['Sursa']}</div>` : '';
            // Debug: show all fields if pagina is missing
            let debugHtml = '';
            if (!pagina) {
              debugHtml = `<pre style='background:#fee;color:#a00;padding:0.5rem 1rem;border-radius:8px;font-size:0.9rem;'>DEBUG: ${JSON.stringify(q, null, 2)}</pre>`;
            }
            document.getElementById('feedback').innerHTML = paginaHtml + sursa + debugHtml;
            // Disable further changes
            document.querySelectorAll('.option-label input').forEach(i => i.disabled = true);
            document.querySelector('.question-btn[type="submit"]').disabled = true;
          };
        }
        renderQuestion(currentIndex);
      } catch (err) {
        mainContent.innerHTML = '<div style="color:red">Error loading questions. See console for details.</div>';
        console.error('DEBUG: Error loading questions:', err);
      }
      return;
    }
    // fallback debug
  });

  document.addEventListener('click', function(e) {
  });

  const generateTestMenu = document.querySelector('.menu-title[data-menu="results"]');
  generateTestMenu.addEventListener('click', function () {
    // Build checklist UI for books/chapters and question count
    mainContent.innerHTML = `<div class="generate-test-pane">
      <h2>Generează un test personalizat</h2>
      <form id="generateTestForm">
        <div class="book-chapter-list">
          ${Object.entries(chaptersData).map(([bookKey, chapters]) => `
            <div class="book-group" style="margin-bottom:1.5rem;">
              <div style="font-weight:bold;font-size:1.1rem;margin-bottom:0.5rem;">${bookNames[bookKey]}</div>
              <div class="chapter-list" style="display:flex;flex-direction:column;gap:0.5rem;">
                ${Object.entries(chapters).map(([chapterName, chapterId]) => `
                  <label style="display:flex;align-items:center;gap:0.7rem;font-size:1.05rem;background:#f7f7f7;border-radius:8px;padding:0.7rem 1rem;cursor:pointer;transition:background 0.2s;">
                    <input type="checkbox" class="chapter-checkbox" data-book="${bookKey}" data-chapter="${chapterId}" data-chapter-name="${chapterName}" style="accent-color:#4f46e5;width:1.1rem;height:1.1rem;" />
                    <span>${chapterName}</span>
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
        <button type="submit" class="question-btn" style="width:100%;font-size:1.25rem;padding:1rem 0;margin-top:1.5rem;letter-spacing:0.03em;">Generează testul</button>
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
  });

  // Helper to render the generated test
  async function renderGeneratedTest(questions, testId) {
    let currentIndex = 0;
    let userAnswers = Array(questions.length).fill(null);
    mainContent.innerHTML = `<div class="questionnaire" id="generatedTestPane"></div>`;
    const testPane = mainContent.querySelector('#generatedTestPane');
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
                <span>${opt}</span>
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
        const normalize = v => String(v).replace(/^\s*[A-Ea-e]\.?\s+/, '').trim().toLowerCase();
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
        const normalize = v => String(v).replace(/^\s*[A-Ea-e]\.?\s+/, '').trim().toLowerCase();
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
            const normalize = v => String(v).replace(/^\s*[A-Ea-e]\.?\s+/, '').trim().toLowerCase();
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
                  return `<span class="option-label" style="${style}">${opt}</span>`;
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
});
