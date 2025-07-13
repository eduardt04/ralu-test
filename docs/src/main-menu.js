console.log('main-menu.js loaded');
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
  console.log('DOMContentLoaded: submenuQuestionaries:', submenuQuestionaries, 'mainContent:', mainContent);

  // Build book submenus
  Object.keys(chaptersData).forEach(bookKey => {
    // Book title
    const bookDiv = document.createElement('div');
    bookDiv.className = 'submenu-title book-menu';
    bookDiv.setAttribute('data-menu', bookKey);
    bookDiv.innerHTML = `<span>${bookNames[bookKey] || bookKey}</span><svg class="caret" viewBox="0 0 24 24"><path d="M8 10l4 4 4-4"/></svg>`;
    submenuQuestionaries.appendChild(bookDiv);
    console.log('Book menu created:', bookKey, bookDiv);

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
      console.log('Chapter menu created:', bookKey, chapterName, chapterId, chapterDiv);
    });
    submenuQuestionaries.appendChild(chaptersSubmenu);
    console.log('Chapters submenu appended:', chaptersSubmenu);
  });

  // Use event delegation for all clicks in the sidebar
  submenuQuestionaries.addEventListener('click', async function (e) {
    console.log('DEBUG: sidebar click event fired', e);
    const bookDiv = e.target.closest('.book-menu');
    console.log('DEBUG: after bookDiv closest', bookDiv);
    if (bookDiv) {
      console.log('DEBUG: inside bookDiv if');
      e.stopPropagation();
      console.log('DEBUG: after stopPropagation');
      const bookKey = bookDiv.getAttribute('data-menu');
      console.log('DEBUG: bookKey', bookKey);
      const chaptersSubmenu = document.getElementById(`submenu-${bookKey}`);
      console.log('DEBUG: chaptersSubmenu', chaptersSubmenu);
      const open = chaptersSubmenu.classList.contains('open');
      console.log('DEBUG: open', open);
      document.querySelectorAll('.submenu').forEach((s, i) => { s.classList.remove('open'); console.log('DEBUG: removed open from submenu', i, s); });
      document.querySelectorAll('.caret').forEach((c, i) => { c.classList.remove('down'); console.log('DEBUG: removed down from caret', i, c); });
      if (!open) {
        chaptersSubmenu.classList.add('open');
        console.log('DEBUG: added open to chaptersSubmenu');
        bookDiv.querySelector('.caret').classList.add('down');
        console.log('DEBUG: added down to caret');
        console.log('DEBUG: Opened chaptersSubmenu:', chaptersSubmenu.id);
      } else {
        console.log('DEBUG: Closed chaptersSubmenu:', chaptersSubmenu.id);
      }
      return;
    }
    const chapterDiv = e.target.closest('.chapter-menu');
    console.log('DEBUG: after chapterDiv closest', chapterDiv);
    if (chapterDiv) {
      console.log('DEBUG: inside chapterDiv if');
      document.querySelectorAll('.submenu-title').forEach((i, idx) => { i.classList.remove('active'); console.log('DEBUG: removed active from', idx, i); });
      chapterDiv.classList.add('active');
      console.log('DEBUG: added active to chapterDiv');
      const bookKey = chapterDiv.getAttribute('data-book');
      console.log('DEBUG: bookKey', bookKey);
      const chapterId = chapterDiv.getAttribute('data-chapter');
      console.log('DEBUG: chapterId', chapterId);
      const collection = bookCollections[bookKey];
      console.log('DEBUG: collection', collection);
      if (!collection || !chapterId) { console.log('DEBUG: missing collection or chapterId, returning'); return; }
      mainContent.innerHTML = '<div>Loading questions...</div>';
      console.log('DEBUG: set mainContent to loading');
      try {
        const snapshot = await firebase.firestore()
          .collection(collection)
          .doc(chapterId)
          .collection('questions')
          .get();
        console.log('DEBUG: got snapshot', snapshot);
        const allQuestions = [];
        snapshot.forEach(doc => { allQuestions.push(doc.data()); console.log('DEBUG: pushed doc', doc.data()); });
        console.log('DEBUG: allQuestions', allQuestions);
        if (allQuestions.length === 0) {
          mainContent.innerHTML = '<div>No questions found for this chapter.</div>';
          console.log('DEBUG: no questions found');
          return;
        }
        let currentIndex = 0;
        function renderQuestion(idx) {
          console.log('DEBUG: renderQuestion', idx);
          const q = allQuestions[idx];
          console.log('DEBUG: question', q);
          if (!q) { console.log('DEBUG: no question at idx', idx); return; }
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
          console.log('DEBUG: rendered question HTML');
          document.getElementById('prevQ').onclick = function() {
            console.log('DEBUG: prevQ clicked');
            if (currentIndex > 0) { currentIndex--; renderQuestion(currentIndex); }
          };
          document.getElementById('nextQ').onclick = function() {
            console.log('DEBUG: nextQ clicked');
            if (currentIndex < allQuestions.length - 1) { currentIndex++; renderQuestion(currentIndex); }
          };
          document.getElementById('answerForm').onsubmit = function(e) {
            e.preventDefault();
            console.log('DEBUG: answerForm submitted');
          };
        }
        renderQuestion(currentIndex);
        console.log('DEBUG: called renderQuestion');
      } catch (err) {
        mainContent.innerHTML = '<div style="color:red">Error loading questions. See console for details.</div>';
        console.error('DEBUG: Error loading questions:', err);
      }
      return;
    }
    // fallback debug
    console.log('DEBUG: Sidebar click, but not on book or chapter:', e.target);
  });
});
