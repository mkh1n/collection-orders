const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { Pool } = require('pg');

const router = express.Router();

// Проверяем, что DATABASE_URL определен
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL не задан в .env');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // если сервер требует SSL
});

// Получаем заказы с пагинацией
router.get('/', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM "Purchases"');
    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    const ordersRes = await pool.query(
      'SELECT * FROM "Purchases" ORDER BY "Created" DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({ orders: ordersRes.rows, totalPages });
  } catch (err) {
    console.error('Ошибка получения заказов:', err);
    res.status(500).json({ error: 'Ошибка сервера при получении заказов' });
  }
});

// Получаем товары для конкретного заказа
router.get('/:purchaseId/products', verifyToken, async (req, res) => {
  try {
    const purchaseId = String(req.params.purchaseId).trim();
    if (!purchaseId) return res.status(400).json({ error: 'purchaseId не задан' });

    const productsRes = await pool.query(
      `SELECT 
         p.*, 
         pp."Amount", 
         pp."Price", 
         pp."Size"
       FROM "PuchasedProductEntity" pp
       JOIN "Products" p ON pp."ProductId" = p."Id"
       WHERE pp."PurchaseEntityId" = $1`,
      [purchaseId]
    );

    res.json(productsRes.rows);
  } catch (err) {
    console.error('Ошибка получения товаров:', err);
    res.status(500).json({ error: 'Ошибка сервера при получении товаров' });
  }
});

module.exports = router;
