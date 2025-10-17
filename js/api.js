// Базовый адрес API — измени на URL твоего бэкенда (Render, Railway и т.д.)
const API_BASE = 'https://collection-orders.onrender.com';

export async function login(password) {
const res = await fetch(`${API_BASE}/api/auth/login`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ password })
});
if (!res.ok) throw new Error('Login failed');
return res.json();
}


export async function fetchPurchases(token, page = 1, limit = 10) {
const res = await fetch(`${API_BASE}/api/purchases?page=${page}&limit=${limit}`, {
headers: { Authorization: `Bearer ${token}` }
});
if (!res.ok) throw res;
return res.json();
}


export async function fetchProducts(token, purchaseId) {
const res = await fetch(`${API_BASE}/api/purchases/${purchaseId}/products`, {
headers: { Authorization: `Bearer ${token}` }
});
if (!res.ok) throw res;
return res.json();
}