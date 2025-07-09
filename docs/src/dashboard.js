const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(user => {
    if (user) {
      // Show welcome message
      document.getElementById('welcomeMsg').textContent = `Bun venit, ${user.email}!`;
    } else {
      // Not logged in: redirect to login
      window.location.href = 'index.html';
    }
  });

  // Logout handler
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      await auth.signOut();
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Logout error:', error);
    }
  });
});