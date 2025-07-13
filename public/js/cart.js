// public/js/cart.js
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('authToken');
  const container = document.getElementById('cart-items');
  if (!container) return;  // garante que existe

  if (!token) {
    container.innerHTML = '<p>Faça login para ver seu carrinho.</p>';
    return;
  }

  try {
    const res = await fetch('/cart', {
      headers: { 'Authorization':'Bearer '+token }
    });
    if (!res.ok) throw new Error('Status '+res.status);
    const items = await res.json();
    if (!items.length) {
      container.innerHTML = '<p>Seu carrinho está vazio.</p>';
      return;
    }
    container.innerHTML = '';
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <img src="${item.imagem || '/imgs/cart.png'}" alt="${item.nome}" class="cart-item-image">
        <div class="cart-item-info">
          <h4 class="cart-item-title">${item.nome}</h4>
          <p class="cart-item-price">R$ ${parseFloat(item.preco).toFixed(2)}</p>
          <p>Qtd: ${item.quantidade}</p>
          <button class="remove-cart-item-btn" data-id="${item.id}">Remover</button>
        </div>
      `;
      container.appendChild(div);
    });
    // (adicione aqui o listener de remoção, etc.)
  } catch (err) {
    console.error('❌ Erro ao carregar carrinho:', err);
    container.innerHTML = '<p>Erro ao carregar carrinho.</p>';
  }
});
