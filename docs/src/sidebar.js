// Sidebar expand/collapse logic for main.html

document.addEventListener('DOMContentLoaded', function () {
  // Helper to toggle submenu
  function toggleSubmenu(menuKey, submenuId) {
    const menu = document.querySelector(`[data-menu="${menuKey}"]`);
    const submenu = document.getElementById(submenuId);
    const caret = menu.querySelector('.caret');
    if (submenu.classList.contains('open')) {
      submenu.classList.remove('open');
      if (caret) caret.classList.remove('down');
    } else {
      submenu.classList.add('open');
      if (caret) caret.classList.add('down');
    }
  }

  // Main menu: Questionaries
  const questionariesMenu = document.querySelector('.menu-title[data-menu="questionaries"]');
  questionariesMenu.addEventListener('click', function () {
    toggleSubmenu('questionaries', 'submenu-questionaries');
  });
});
