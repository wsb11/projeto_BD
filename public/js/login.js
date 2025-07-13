// public/js/login.js
console.log('login.js carregou ✅');

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (!form) {
    console.error('🛑 Form #login-form não encontrado');
    return;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    console.log('submit detectado');

    const email    = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    console.log({ email, password });

    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      console.log('Fetch /login status:', res.status);

      const data = await res.json();
      console.log('Resposta /login:', data);
      showModal(data.message);

      if (res.ok) {
        localStorage.setItem('authToken', data.token);
        setTimeout(() => window.location.href = 'index.html', 1500);
      }
    } catch (err) {
      console.error('Erro ao chamar /login:', err);
      showModal('Erro na conexão. Tente novamente.');
    }
  });
});
