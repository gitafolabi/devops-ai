import express from 'express';
import axios from 'axios';
import { query } from '../database/connection';
import { Order, CreateOrderRequest, Address, ServiceResponse } from '../types';
import { publishEvent } from '../rabbitmq';

const router = express.Router();
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:3003';

router.post('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const tokenUserId = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const { items, shippingAddress, userId = tokenUserId } = req.body as CreateOrderRequest & { userId?: string | null };

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Please log in before placing an order' });
    }

    if (!items?.length) {
      return res.status(400).json({ success: false, error: 'Order must include at least one item' });
    }

    let totalAmount = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const productResponse = await axios.get(`${PRODUCTS_SERVICE_URL}/${item.productId}`);
      const product = productResponse.data.data;

      const price = Number(product.price);
      totalAmount += price * item.quantity;

      orderItems.push({
        product_id: item.productId,
        quantity: item.quantity,
        price,
        product: {
          id: product.id,
          name: product.name,
          price,
          imageUrl: product.image_url,
          category: product.category
        }
      });
    }

    const result = await query(`
      INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [userId, totalAmount, 'pending', JSON.stringify(shippingAddress), 'pending']);

    const order = result.rows[0];

    const insertedItems: any[] = [];
    for (const item of orderItems) {
      const itemResult = await query(`
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [order.id, item.product_id, item.quantity, item.price]);
      insertedItems.push({ ...item, id: itemResult.rows[0].id });
    }

    const response: ServiceResponse<Order> = {
      success: true,
      data: {
        id: order.id,
        userId: order.user_id,
        items: insertedItems.map(item => ({
          id: item.id,
          orderId: order.id,
          productId: item.product_id,
          quantity: item.quantity,
          price: item.price,
          product: item.product
        })),
        totalAmount: Number(order.total_amount),
        status: order.status,
        shippingAddress: shippingAddress,
        paymentStatus: order.payment_status,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }
    };

    res.status(201).json(response);

    const emailFromBody = (req.body as any).email;
    if (emailFromBody) {
      publishEvent('order.created', { email: emailFromBody, order: response.data });
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

router.get('/my-orders', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const tokenUserId = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const userId = req.query.userId as string || tokenUserId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Please log in to view orders' });
    }

    const result = await query(`
      SELECT o.*,
             COALESCE(JSON_AGG(
               JSON_BUILD_OBJECT(
                 'id', oi.id,
                 'orderId', oi.order_id,
                 'productId', oi.product_id,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'product', JSON_BUILD_OBJECT(
                   'id', oi.product_id,
                   'name', 'Product',
                   'price', oi.price,
                   'imageUrl', '/product-images/placeholder.jpg',
                   'category', 'Boutique'
                 )
               )
             ) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id, o.user_id, o.total_amount, o.status, o.shipping_address, o.payment_status, o.created_at, o.updated_at
      ORDER BY o.created_at DESC
    `, [userId]);

    const response: ServiceResponse<Order[]> = {
      success: true,
      data: result.rows.map((order: any) => ({
        id: order.id,
        userId: order.user_id,
        items: order.items,
        totalAmount: Number(order.total_amount),
        status: order.status,
        shippingAddress: order.shipping_address,
        paymentStatus: order.payment_status,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, error: 'Failed to get orders' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const tokenUserId = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const { id } = req.params;

    const result = await query(`
      SELECT o.*,
             COALESCE(JSON_AGG(
               JSON_BUILD_OBJECT(
                 'id', oi.id,
                 'orderId', oi.order_id,
                 'productId', oi.product_id,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'product', JSON_BUILD_OBJECT(
                   'id', oi.product_id,
                   'name', 'Product',
                   'price', oi.price,
                   'imageUrl', '/product-images/placeholder.jpg',
                   'category', 'Boutique'
                 )
               )
             ) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1 AND ($2::uuid IS NULL OR o.user_id = $2)
      GROUP BY o.id, o.user_id, o.total_amount, o.status, o.shipping_address, o.payment_status, o.created_at, o.updated_at
    `, [id, tokenUserId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = result.rows[0];
    const response: ServiceResponse<Order> = {
      success: true,
      data: {
        id: order.id,
        userId: order.user_id,
        items: order.items,
        totalAmount: Number(order.total_amount),
        status: order.status,
        shippingAddress: order.shipping_address,
        paymentStatus: order.payment_status,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, error: 'Failed to get order' });
  }
});

router.get('/:id/invoice', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const tokenUserId = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!tokenUserId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;

    const result = await query(`
      SELECT o.*,
             COALESCE(JSON_AGG(
               JSON_BUILD_OBJECT(
                 'id', oi.id,
                 'productId', oi.product_id,
                 'quantity', oi.quantity,
                 'price', oi.price
               )
             ) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1 AND o.user_id = $2
      GROUP BY o.id, o.user_id, o.total_amount, o.status, o.shipping_address, o.payment_status, o.created_at, o.updated_at
    `, [id, tokenUserId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = result.rows[0];
    res.json({
      success: true,
      data: {
        invoiceNumber: `INV-${order.id.slice(-8).toUpperCase()}`,
        orderId: order.id,
        date: order.created_at,
        items: order.items,
        totalAmount: Number(order.total_amount),
        shippingAddress: order.shipping_address,
        status: order.status,
        paymentStatus: order.payment_status
      }
    });
  } catch (error) {
    console.error('Invoice error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate invoice' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const tokenUserId = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!tokenUserId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { status } = req.body;
    const { id } = req.params;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const existing = await query('SELECT id FROM orders WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    await query('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);

    const result = await query('SELECT * FROM orders WHERE id = $1', [id]);

    const response: ServiceResponse<Order> = {
      success: true,
      data: result.rows[0]
    };

    res.json(response);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

export { router as orderRoutes };
