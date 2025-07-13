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
      const open = chaptersSubmenu.classList.contains('open');
      // Only close other book submenus, not the main questionaries submenu
      submenuQuestionaries.querySelectorAll('.submenu').forEach((s, i) => {
        if (s !== chaptersSubmenu) {
          s.classList.remove('open');
        }
      });
      submenuQuestionaries.querySelectorAll('.book-menu .caret').forEach((c, i) => {
        if (bookDiv.querySelector('.caret') !== c) {
          c.classList.remove('down');
        }
      });
      if (!open) {
        chaptersSubmenu.classList.add('open');
        bookDiv.querySelector('.caret').classList.add('down');
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
        snapshot.forEach(doc => { allQuestions.push(doc.data()); });
        if (allQuestions.length === 0) {
          mainContent.innerHTML = '<div>No questions found for this chapter.</div>';
          return;
        }
        let currentIndex = 0;
        function renderQuestion(idx) {
          const q = allQuestions[idx];
          if (!q) { return; }
          // Determine if the question allows multiple answers
          const isMultiple = Array.isArray(q["Răspuns corect multiplu"]) && q["Răspuns corect multiplu"].length > 1;
          mainContent.innerHTML = `
            <div class="questionnaire">
              <div class="question-number">Întrebarea ${idx + 1} din ${allQuestions.length}</div>
              <div class="question-text">${q["Întrebare răspuns simplu"] || q["Întrebare răspuns multiplu"] || ''}</div>
              <form id="answerForm">
                <div class="options">
                  ${(q.Variante || []).map(opt => `
                    <label class="option-label">
                      <input type="${isMultiple ? 'checkbox' : 'radio'}" name="option" value="${opt}" ${isMultiple ? '' : 'required'} />
                      <span>${opt}</span>
                    </label>
                  `).join('')}
                </div>
                <button type="submit" class="question-btn">Răspunde</button>
              </form>
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
});
