document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('errorMsg');

  errorDiv.classList.add('hidden');
  errorDiv.textContent = '';

  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.sts) {
      window.location.href = '/control-panel';
    } else {
      errorDiv.textContent = data.msg || 'Error al iniciar sesion';
      errorDiv.classList.remove('hidden');
    }
  } catch (err) {
    console.error(err);
    errorDiv.textContent = 'Error de conexion';
    errorDiv.classList.remove('hidden');
  }
});
