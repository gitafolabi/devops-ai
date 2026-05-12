import express from 'express';
import { query } from '../database/connection';
import { Product, ServiceResponse, PaginationParams } from '../types';

const router = express.Router();

const sortColumns: Record<string, string> = {
  created_at: 'p.created_at',
  name: 'p.name',
  price: 'p.price',
  category: 'p.category',
  stock_quantity: 'p.stock_quantity',
  inventory_quantity: 'p.stock_quantity',
  featured: 'p.created_at'
};

router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '12',
      sortBy = 'created_at',
      category,
      search,
      minPrice,
      maxPrice
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    const orderBy = sortColumns[sortBy as string] || sortColumns.created_at;

    let whereClause = 'WHERE 1=1';
    const filterParams: any[] = [];
    let paramIndex = 1;

    if (category) {
      whereClause += ' AND p.category = $' + paramIndex;
      filterParams.push(category);
      paramIndex++;
    }

    if (search) {
      whereClause += ' AND (p.name ILIKE $' + paramIndex + ' OR p.description ILIKE $' + (paramIndex + 1) + ')';
      filterParams.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }

    if (minPrice) {
      whereClause += ' AND p.price >= $' + paramIndex;
      filterParams.push(minPrice);
      paramIndex++;
    }

    if (maxPrice) {
      whereClause += ' AND p.price <= $' + paramIndex;
      filterParams.push(maxPrice);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) as total FROM products p ${whereClause}`;
    const productsQuery = `
      SELECT p.id, p.name, p.description, p.price,
             NULL::numeric as compare_price,
             NULL::text as brand,
             p.stock_quantity as inventory_quantity,
             false as is_featured,
             p.created_at,
             p.created_at as updated_at,
             COALESCE(p.category, 'Uncategorized') as category,
             COALESCE(p.image_url, '/product-images/placeholder.jpg') as image_url
      FROM products p
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const allParams = [...filterParams, limitNum, offset];
    
    const [countResult, productsResult] = await Promise.all([
      query(countQuery, filterParams),
      query(productsQuery, allParams)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    const response = {
      success: true,
      data: {
        products: productsResult.rows,
        pagination: {
          currentPage: pageNum,
          totalPages,
          total,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get products error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    res.status(500).json({ success: false, error: 'Failed to get products', details: error.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COALESCE(category, 'Uncategorized') as name,
        COALESCE(category, 'Uncategorized') as description,
        NULL::text as image_url,
        COUNT(id) as product_count
      FROM products
      GROUP BY COALESCE(category, 'Uncategorized')
      ORDER BY name
    `);

    const response: ServiceResponse<any[]> = {
      success: true,
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, error: 'Failed to get categories' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT p.id, p.name, p.description, p.price,
             NULL::numeric as compare_price,
             NULL::text as brand,
             p.stock_quantity as inventory_quantity,
             false as is_featured,
             p.created_at,
             p.created_at as updated_at,
             COALESCE(p.category, 'Uncategorized') as category,
             COALESCE(p.image_url, '/product-images/placeholder.jpg') as image_url
      FROM products p
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const response = {
      success: true,
      data: result.rows[0]
    };

    res.json(response);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, error: 'Failed to get product' });
  }
});

export { router as productRoutes };
