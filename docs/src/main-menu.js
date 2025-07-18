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
  // Populate sidebar submenus for questionaries, pass mainContent for right pane updates
  populateQuestionariesSidebar(chaptersData, bookNames, mainContent);

  // Sidebar menu event listeners
  document.querySelector('.menu-title[data-menu="questionaries"]').addEventListener('click', function() {
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
});
