// Reference to Firebase Auth service
const auth = firebase.auth();

// Form submission handler
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    // Redirect on success
    window.location.href = 'main.html';
  } catch (error) {
    errorMessage.textContent = error.message;
  }
});
