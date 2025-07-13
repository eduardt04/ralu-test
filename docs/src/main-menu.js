import { chaptersData } from './chapters_id.js';

// Book display names
const bookNames = {
  kumar: 'Kumar',
  lawrence: 'Lawrence',
  sinopsis: 'Sinopsis'
};

// Firestore collection names
const bookCollections = {
  kumar: 'kumar_questions',
  lawrence: 'lawrence_questions',
  sinopsis: 'sinopsis_questions'
};

document.addEventListener('DOMContentLoaded', function () {
  const submenuQuestionaries = document.getElementById('submenu-questionaries');
  const mainContent = document.getElementById('main-content');

  // Build book submenus
  Object.keys(chaptersData).forEach(bookKey => {
    // Book title
    const bookDiv = document.createElement('div');
    bookDiv.className = 'submenu-title';
    bookDiv.setAttribute('data-menu', bookKey);
    bookDiv.innerHTML = `<span>${bookNames[bookKey] || bookKey}</span><svg class="caret" viewBox="0 0 24 24"><path d="M8 10l4 4 4-4"/></svg>`;
    submenuQuestionaries.appendChild(bookDiv);

    // Chapters submenu
    const chaptersSubmenu = document.createElement('div');
    chaptersSubmenu.className = 'submenu';
    chaptersSubmenu.id = `submenu-${bookKey}`;
    chaptersSubmenu.style.display = 'none';
    Object.entries(chaptersData[bookKey]).forEach(([chapterName, chapterId]) => {
      const chapterDiv = document.createElement('div');
      chapterDiv.className = 'submenu-title';
      chapterDiv.setAttribute('data-book', bookKey);
      chapterDiv.setAttribute('data-chapter', chapterId);
      chapterDiv.textContent = chapterName;
      chaptersSubmenu.appendChild(chapterDiv);
    });
    submenuQuestionaries.appendChild(chaptersSubmenu);

    // Toggle chapters submenu on book click
    bookDiv.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = chaptersSubmenu.classList.contains('open');
      document.querySelectorAll('.submenu').forEach(s => s.classList.remove('open'));
      document.querySelectorAll('.caret').forEach(c => c.classList.remove('down'));
      if (!open) {
        chaptersSubmenu.classList.add('open');
        bookDiv.querySelector('.caret').classList.add('down');
      }
    });
  });

  // Handle chapter click: load questions from Firestore
  submenuQuestionaries.addEventListener('click', async function (e) {
    const chapterDiv = e.target.closest('.submenu-title[data-book]');
    if (!chapterDiv) return;
    const bookKey = chapterDiv.getAttribute('data-book');
    const chapterId = chapterDiv.getAttribute('data-chapter');
    const collection = bookCollections[bookKey];
    if (!collection || !chapterId) return;
    // Load questions from Firestore
    mainContent.innerHTML = '<div>Loading questions...</div>';
    const snapshot = await firebase.firestore()
      .collection(collection)
      .doc(chapterId)
      .collection('questions')
      .get();
    const allQuestions = [];
    snapshot.forEach(doc => allQuestions.push(doc.data()));
    if (allQuestions.length === 0) {
      mainContent.innerHTML = '<div>No questions found for this chapter.</div>';
      return;
    }
    let currentIndex = 0;
    function renderQuestion(idx) {
      const q = allQuestions[idx];
      if (!q) return;
      mainContent.innerHTML = `
        <div class="questionnaire">
          <div class="question-number">Întrebarea ${idx + 1} din ${allQuestions.length}</div>
          <div class="question-text">${q["Întrebare răspuns simplu"] || q["Întrebare răspuns multiplu"] || ''}</div>
          <form id="answerForm">
            <div class="options">
              ${(q.Variante || []).map(opt => `
                <label class="option-label">
                  <input type="radio" name="option" value="${opt}" required />
                  ${opt}
                </label>
              `).join('')}
            </div>
            <button type="submit">Răspunde</button>
          </form>
          <div class="question-nav">
            <button id="prevQ" ${idx === 0 ? 'disabled' : ''}>Întrebarea anterioară</button>
            <button id="nextQ" ${idx === allQuestions.length - 1 ? 'disabled' : ''}>Întrebarea următoare</button>
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
        // Answer logic can be added here
      };
    }
    renderQuestion(currentIndex);
  });
});
