// Handles the 'Toate întrebările' pane
export function initQuestionariesPane(mainContent, chaptersData, bookNames, bookCollections) {
  // Build book submenus in the right pane (legacy logic)
  mainContent.innerHTML = '';
  Object.keys(chaptersData).forEach(bookKey => {
    // Book title
    const bookDiv = document.createElement('div');
    bookDiv.className = 'submenu-title book-menu';
    bookDiv.setAttribute('data-menu', bookKey);
    bookDiv.innerHTML = `<span>${bookNames[bookKey] || bookKey}</span><svg class="caret" viewBox="0 0 24 24"><path d="M8 10l4 4 4-4"/></svg>`;
    mainContent.appendChild(bookDiv);

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
    mainContent.appendChild(chaptersSubmenu);
  });

  // Use event delegation for all clicks in the right pane
  mainContent.addEventListener('click', async function (e) {
    const bookDiv = e.target.closest('.book-menu');
    if (bookDiv) {
      e.stopPropagation();
      const bookKey = bookDiv.getAttribute('data-menu');
      const chaptersSubmenu = document.getElementById(`submenu-${bookKey}`);
      const caret = bookDiv.querySelector('.caret');
      const open = chaptersSubmenu.classList.contains('open');
      // Only close other book submenus
      mainContent.querySelectorAll('.submenu').forEach((s, i) => {
        if (s !== chaptersSubmenu) {
          s.classList.remove('open');
        }
      });
      mainContent.querySelectorAll('.book-menu .caret').forEach((c, i) => {
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
      // You can add logic here to display questions for the selected chapter
      mainContent.innerHTML = `<h2>${chapterDiv.textContent}</h2><div>Întrebările pentru acest capitol vor apărea aici.</div>`;
    }
  });
}
