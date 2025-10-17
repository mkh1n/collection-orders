// frontend/js/app.js
import { login as apiLogin, fetchPurchases, fetchProducts } from './api.js';

const loginBox = document.getElementById('loginBox');
const mainBox = document.getElementById('mainBox');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const ordersEl = document.getElementById('orders');
const paginationEl = document.getElementById('pagination');

let token = localStorage.getItem('token') || null;
let currentPage = 1;
const perPage = 10;

async function init() {
  if (token) {
    showMain();
    await loadPage(1);
  } else {
    showLogin();
  }
}
function showLoading(message = 'Загрузка...') {
  const overlay = document.getElementById('loadingOverlay');
  const msg = document.getElementById('loadingMessage');
  msg.textContent = message;
  overlay.style.display = 'flex';
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.style.display = 'none';
}
function showLogin() {
  hideLoading();
  loginBox.style.display = 'block';
  mainBox.style.display = 'none';
}

function showMain() {
  hideLoading();
  loginBox.style.display = 'none';
  mainBox.style.display = 'block';
}

loginBtn.addEventListener('click', async () => {
  const pass = passwordInput.value.trim();
  if (!pass) return alert('Введите пароль');
  try {
    showLoading('Связываюсь с сервером...');
    const data = await apiLogin(pass);
    token = data.token;
    localStorage.setItem('token', token);
    passwordInput.value = '';
    showMain();
    await loadPage(1);
  } catch (err) {
    console.error(err);
    alert('Ошибка входа');
  } finally{
    hideLoading();
  }
});

logoutBtn.addEventListener('click', () => {
  token = null;
  localStorage.removeItem('token');
  showLogin();
});

async function loadPage(page = 1) {
  hideLoading();
  try {
    showLoading('Загружаю заказы...');
    const data = await fetchPurchases(token, page, perPage);
    renderOrders(data.orders || []);
    renderPagination(data.totalPages || 1, page);
    currentPage = page;
  } catch (err) {
    console.error(err);
    alert('Ошибка загрузки заказов — возможно токен просрочен. Выполните вход заново.');
    token = null;
    localStorage.removeItem('token');
    showLogin();
  } finally {
    hideLoading();
  }
}

function renderOrders(orders) {
  ordersEl.innerHTML = '';
  if (!orders.length) {
    ordersEl.innerHTML = '<div class="text-center text-muted">Заказы не найдены</div>';
    return;
  }

  orders.forEach(o => {
    const item = document.createElement('div');
    item.className = 'list-group-item mb-2';
    const name = escapeHtml((o.Name || '') + ' ' + (o.SecondName || '')).trim();
    const email = escapeHtml(o.Email || '');
    const phone = escapeHtml(o.Phone || '');
    const addr = escapeHtml(o.DeliveryAdress || '');
    const CDEK = escapeHtml(o.CDEKItemId || '');
    // Цена в базе может быть в копейках — если это так, делим на 100
    const priceValue = (o.PriceForSP2 > 0) 
      ? o.PriceForSP2 
      : (o.PriceForSP1 > 0 ? o.PriceForSP1 : 0);

    const price = priceValue > 0 ? formatMoney(priceValue) : '';

    const created = o.Created ? new Date(o.Created).toLocaleString() : '';

    item.innerHTML = `
      <div class="d-flex w-100 justify-content-between">
        <h5 class="mb-1">${name || '(без имени)'}</h5>
        <small>${created}</small>
      </div>
      <p class="mb-1"><strong>Email:</strong> ${email} &nbsp; <strong>Тел:</strong> ${phone}</p>
      <p class="mb-1"><strong>Адрес:</strong> ${addr}</p>
      ${CDEK ? `<p class="mb-1"><strong>СДЭК ID:</strong> ${CDEK}</p>` : ''}
      <p class="mb-1"><strong>Сумма:</strong> ${price}</p>
      <div>
        <button class="btn btn-sm btn-outline-primary me-2" data-id="${o.Id}" data-action="toggle-products">Показать товары</button>
        <button class="btn btn-sm btn-outline-secondary" data-id="${o.Id}" data-action="copy-id">Скопировать ID</button>
      </div>
      <div class="mt-2" id="products-${o.Id}" style="display:none;"></div>
    `;

    ordersEl.appendChild(item);
  });
}

function renderPagination(totalPages, current) {
  paginationEl.innerHTML = '';
  // простая пагинация: показываем максимум 7 кнопок, с текущей в центре по возможности
  const maxButtons = 7;
  let start = 1;
  let end = totalPages;
  if (totalPages > maxButtons) {
    const half = Math.floor(maxButtons / 2);
    start = Math.max(1, current - half);
    end = start + maxButtons - 1;
    if (end > totalPages) {
      end = totalPages;
      start = end - maxButtons + 1;
    }
  }

  // Prev
  const prevLi = document.createElement('li');
  prevLi.className = 'page-item ' + (current === 1 ? 'disabled' : '');
  prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous">&laquo;</a>`;
  prevLi.addEventListener('click', (e) => { e.preventDefault(); if (current > 1) loadPage(current - 1); });
  paginationEl.appendChild(prevLi);

  for (let i = start; i <= end; i++) {
    const li = document.createElement('li');
    li.className = 'page-item ' + (i === current ? 'active' : '');
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener('click', (e) => { e.preventDefault(); loadPage(i); });
    paginationEl.appendChild(li);
  }

  // Next
  const nextLi = document.createElement('li');
  nextLi.className = 'page-item ' + (current === totalPages ? 'disabled' : '');
  nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next">&raquo;</a>`;
  nextLi.addEventListener('click', (e) => { e.preventDefault(); if (current < totalPages) loadPage(current + 1); });
  paginationEl.appendChild(nextLi);
}

ordersEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = btn.dataset.id;
  const act = btn.dataset.action;
  if (act === 'toggle-products') {
    const cont = document.getElementById('products-' + id);
    if (!cont) return;
    if (cont.style.display === 'block') {
      cont.style.display = 'none';
      btn.textContent = 'Показать товары';
      return;
    }
    btn.textContent = 'Загрузка...';
    try {
      const items = await fetchProducts(token, id);
      cont.innerHTML = items && items.length ? items.map(it => productHtml(it)).join('') : '<div class="text-muted">Товары не найдены</div>';
      cont.style.display = 'block';
      btn.textContent = 'Скрыть товары';
    } catch (err) {
      console.error(err);
      alert('Ошибка загрузки товаров');
      btn.textContent = 'Показать товары';
    }
  } else if (act === 'copy-id') {
    const idToCopy = id || '';
    try {
      await navigator.clipboard.writeText(idToCopy);
      // краткое уведомление — можно заменить на toast
      alert('ID скопирован');
    } catch {
      alert('Не удалось скопировать ID');
    }
  }
});

function productHtml(it) {
  const name = escapeHtml(it.Name || '(без названия)');
  const SKU = escapeHtml(it.SKU || '');
  const size = escapeHtml(it.Size || '');
  const amount = (it.Amount != null) ? String(it.Amount) : '';
  const price = formatMoney(it.Price * 100);
  const photo = it.MainPhoto ? `https://collectionchel.ru/api/productPhotos/${encodeURIComponent(it.MainPhoto)}` : '';
  const productLink = `https://collectionchel.ru/products/${encodeURIComponent(it.Id)}`;

  return `
    <div class="card mb-2">
      <div class="card-body d-flex">
        <div style="flex:1">
          <h6 class="mb-1">${name}</h6>
          <div class="small text-muted">Размер: ${size} &nbsp; Кол-во: ${amount} &nbsp; Артикул: ${SKU}</div>
          <div class="mt-1">Цена: ${price}</div>
          <a href="${productLink}" target="_blank" rel="noopener noreferrer">Открыть товар</a>
        </div>
        <div style="width:110px; margin-left:12px;">
          ${photo ? `<img src="${photo}" alt="${name}" class="img-fluid rounded">` : ''}
        </div>
      </div>
    </div>
  `;
}

// Форматирует цену: если число большое — предполагаем, что цена в копейках (целое число).
function formatMoney(value) {
  // если value целое и больше 1000 — считаем копейками
  const v = Number(value);
  if (Number.isFinite(v)) {
    if (Math.abs(v) > 1000) {
      // разделяем копейки: 2786000 -> 27860.00 (если ты используешь другую логику — измени)
      return (v / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
    } else {
      return v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
    }
  }
  return '';
}

// Простая защита от XSS
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Инициализация
init();
