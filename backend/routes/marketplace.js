import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { authenticateToken } from '../middleware/auth.js';
import { cacheMiddleware, invalidateCache } from '../config/cache.js';

const router = express.Router();

// Validation middleware
const validateProduct = [
    body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
    body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category').isIn(['crops', 'equipment', 'seeds', 'fertilizers', 'other']).withMessage('Invalid category'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('location').trim().notEmpty().withMessage('Location is required')
];

const validateOrder = [
    body('products').isArray().withMessage('Products must be an array'),
    body('products.*.product').isMongoId().withMessage('Invalid product ID'),
    body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('shippingAddress').isObject().withMessage('Shipping address is required'),
    body('paymentMethod').isIn(['credit_card', 'debit_card', 'upi', 'net_banking']).withMessage('Invalid payment method')
];

// Get all products with filtering and pagination
router.get('/products', [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('category').optional().isIn(['crops', 'equipment', 'seeds', 'fertilizers', 'other']),
    query('minPrice').optional().isFloat({ min: 0 }).toFloat(),
    query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
    query('sortBy').optional().isIn(['price', 'rating', 'createdAt']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
], cacheMiddleware(300), async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const category = req.query.category;
        const minPrice = req.query.minPrice;
        const maxPrice = req.query.maxPrice;
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        const query = { status: 'active' };
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (category) {
            query.category = category;
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            query.price = {};
            if (minPrice !== undefined) query.price.$gte = minPrice;
            if (maxPrice !== undefined) query.price.$lte = maxPrice;
        }

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        if (page > totalPages && totalPages > 0) {
            return res.status(400).json({ message: 'Page number exceeds total pages' });
        }

        const products = await Product.find(query)
            .populate('seller', 'name email')
            .sort({ [sortBy]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            products,
            currentPage: page,
            totalPages,
            totalProducts,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Error fetching products.' });
    }
});

// Create new product
router.post('/products', authenticateToken, validateProduct, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, description, price, category, stock, location, images } = req.body;

        const product = new Product({
            name,
            description,
            price,
            category,
            stock,
            location,
            images,
            seller: req.user.userId
        });

        await product.save();
        await invalidateCache('__express__/api/marketplace/products*');

        res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Error creating product.' });
    }
});

// Update product
router.put('/products/:productId', authenticateToken, validateProduct, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const product = await Product.findById(req.params.productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        if (product.seller.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to edit this product.' });
        }

        const { name, description, price, category, stock, location, images } = req.body;

        if (name) product.name = name;
        if (description) product.description = description;
        if (price) product.price = price;
        if (category) product.category = category;
        if (stock !== undefined) product.stock = stock;
        if (location) product.location = location;
        if (images) product.images = images;

        await product.save();
        await invalidateCache('__express__/api/marketplace/products*');

        res.json(product);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Error updating product.' });
    }
});

// Delete product
router.delete('/products/:productId', authenticateToken, async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        if (product.seller.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to delete this product.' });
        }

        product.status = 'inactive';
        await product.save();
        await invalidateCache('__express__/api/marketplace/products*');

        res.json({ message: 'Product deleted successfully.' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Error deleting product.' });
    }
});

// Create order
router.post('/orders', authenticateToken, validateOrder, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { products, shippingAddress, paymentMethod } = req.body;

        // Verify products and calculate total
        let totalAmount = 0;
        const verifiedProducts = [];

        for (const item of products) {
            const product = await Product.findById(item.product);
            if (!product || product.status !== 'active') {
                return res.status(400).json({ message: `Product ${item.product} is not available.` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for ${product.name}.` });
            }

            verifiedProducts.push({
                product: product._id,
                quantity: item.quantity,
                price: product.price
            });

            totalAmount += product.price * item.quantity;

            // Update stock
            product.stock -= item.quantity;
            await product.save();
        }

        const order = new Order({
            buyer: req.user.userId,
            seller: verifiedProducts[0].product.seller,
            products: verifiedProducts,
            totalAmount,
            shippingAddress,
            paymentMethod
        });

        await order.save();
        res.status(201).json(order);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Error creating order.' });
    }
});

// Get user orders
router.get('/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({
            $or: [
                { buyer: req.user.userId },
                { seller: req.user.userId }
            ]
        })
        .populate('buyer', 'name email')
        .populate('seller', 'name email')
        .populate('products.product')
        .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Error fetching orders.' });
    }
});

// Update order status
router.put('/orders/:orderId/status', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        if (order.seller.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to update this order.' });
        }

        order.status = status;
        await order.save();

        res.json(order);
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Error updating order.' });
    }
});

export default router; 