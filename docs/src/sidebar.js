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

  // Submenu: Kumar
  const kumarMenu = document.querySelector('.submenu-title[data-menu="kumar"]');
  kumarMenu.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleSubmenu('kumar', 'submenu-kumar');
  });

  // Optionally, you can add active state logic for submenu items
  const submenuTitles = document.querySelectorAll('.submenu-title');
  submenuTitles.forEach(function (item) {
    item.addEventListener('click', function (e) {
      // Remove active from all
      submenuTitles.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
});
