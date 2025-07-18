// Handles the 'Toate întrebările' sidebar population
export function populateQuestionariesSidebar(chaptersData, bookNames) {
  const submenu = document.getElementById('submenu-questionaries');
  if (!submenu) return;
  submenu.innerHTML = '';
  Object.keys(chaptersData).forEach(bookKey => {
    // Book title
    const bookDiv = document.createElement('div');
    bookDiv.className = 'submenu-title book-menu';
    bookDiv.setAttribute('data-menu', bookKey);
    bookDiv.innerHTML = `<span>${bookNames[bookKey] || bookKey}</span><svg class="caret" viewBox="0 0 24 24"><path d="M8 10l4 4 4-4"/></svg>`;
    submenu.appendChild(bookDiv);

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
    submenu.appendChild(chaptersSubmenu);
  });

  // Sidebar expand/collapse logic
  submenu.addEventListener('click', function (e) {
    const bookDiv = e.target.closest('.book-menu');
    if (bookDiv) {
      e.stopPropagation();
      const bookKey = bookDiv.getAttribute('data-menu');
      const chaptersSubmenu = document.getElementById(`submenu-${bookKey}`);
      const caret = bookDiv.querySelector('.caret');
      const open = chaptersSubmenu.classList.contains('open');
      // Only close other book submenus
      submenu.querySelectorAll('.submenu').forEach((s) => {
        if (s !== chaptersSubmenu) s.classList.remove('open');
      });
      submenu.querySelectorAll('.book-menu .caret').forEach((c) => {
        if (caret !== c) c.classList.remove('down');
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
  });
}

// Handles the right pane content for 'Toate întrebările'
export function initQuestionariesPane(mainContent) {
  mainContent.innerHTML = '<h2>Selectează un capitol din meniul din stânga pentru a vedea întrebările.</h2>';
}
