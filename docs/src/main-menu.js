window.onerror = function(msg, url, line, col, error) {
  console.error('GLOBAL ERROR:', msg, url, line, col, error);
};
window.addEventListener('unhandledrejection', function(event) {
  console.error('UNHANDLED PROMISE REJECTION:', event.reason);
});

import { chaptersData } from './chapters_id.js';
import { initQuestionariesPane, populateQuestionariesSidebar } from './questionaries-pane.js';
import { initGenerateTestPane } from './generate-test-pane.js';
import { initResultsPane } from './results-pane.js';

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
  const mainContent = document.getElementById('main-content');
  // Populate sidebar submenus for questionaries
  populateQuestionariesSidebar(chaptersData, bookNames);

  // Sidebar menu event listeners
  document.querySelector('.menu-title[data-menu="questionaries"]').addEventListener('click', function(e) {
    e.stopPropagation();
    const submenuQuestionaries = document.getElementById('submenu-questionaries');
    const caret = this.querySelector('.caret');
    const open = submenuQuestionaries.classList.contains('open');
    // Close all submenus and carets
    document.querySelectorAll('.submenu').forEach(s => s.classList.remove('open'));
    document.querySelectorAll('.caret').forEach(c => c.classList.remove('down'));
    // Toggle only the main questionaries submenu
    if (!open) {
      submenuQuestionaries.classList.add('open');
      if (caret) caret.classList.add('down');
    }
    // Show default right pane content
    initQuestionariesPane(mainContent);
  });
  document.querySelector('.menu-title[data-menu="results"]').addEventListener('click', function() {
    initGenerateTestPane(mainContent, chaptersData, bookNames, bookCollections);
  });
  const testResultsMenu = document.querySelector('.menu-title[data-menu="test-results"]');
  if (testResultsMenu) {
    testResultsMenu.addEventListener('click', function () {
      initResultsPane(mainContent);
    });
  }

  // Handle chapter click in sidebar
  document.getElementById('submenu-questionaries').addEventListener('click', function(e) {
    const chapterDiv = e.target.closest('.chapter-menu');
    if (chapterDiv) {
      const bookKey = chapterDiv.getAttribute('data-book');
      const chapterId = chapterDiv.getAttribute('data-chapter');
      // Load questions for this chapter in the right pane
      mainContent.innerHTML = `<h2>${chapterDiv.textContent}</h2><div>Întrebările pentru acest capitol vor apărea aici.</div>`;
    }
  });
});
