// agriconnect2.0/backend/routes/forum.js

import express from 'express';
import ForumPost from '../models/ForumPost.js';
import Comment from '../models/Comment.js';
import { authenticateToken } from '../middleware/auth.js';
import { body, query, param, validationResult } from 'express-validator';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Rate limiting for forum actions
const postLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many posts created, please try again later.'
});

const commentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many comments created, please try again later.'
});

// Validation middleware
const validatePost = [
    body('title')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters')
        .escape(),
    body('content')
        .trim()
        .isLength({ min: 10 })
        .withMessage('Content must be at least 10 characters long')
        .escape(),
    body('category')
        .isIn(['general', 'crops', 'equipment', 'market', 'weather', 'other'])
        .withMessage('Invalid category'),
    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array')
        .custom((tags) => {
            if (tags && tags.length > 5) {
                throw new Error('Maximum 5 tags allowed');
            }
            return true;
        })
];

const validateComment = [
    body('text')
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Comment must be between 1 and 1000 characters')
        .escape(),
    body('parentCommentId')
        .optional()
        .isMongoId()
        .withMessage('Invalid parent comment ID')
];

// Create a new forum post
router.post('/posts', authenticateToken, postLimiter, validatePost, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, content, category, tags } = req.body;
        const newPost = new ForumPost({
            title,
            content,
            category,
            tags,
            author: req.user.userId
        });

        await newPost.save();
        await newPost.populate('author', 'name email');

        res.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating forum post:', error);
        res.status(500).json({
            message: 'Error creating post',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get all forum posts with pagination and filtering
router.get('/posts', [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('category').optional().isIn(['general', 'crops', 'equipment', 'market', 'weather', 'other']),
    query('sortBy').optional().isIn(['createdAt', 'title', 'likes']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const category = req.query.category;
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        const query = { status: 'active' };
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }
        
        if (category) {
            query.category = category;
        }

        const totalPosts = await ForumPost.countDocuments(query);
        const totalPages = Math.ceil(totalPosts / limit);

        if (page > totalPages && totalPages > 0) {
            return res.status(400).json({ message: 'Page number exceeds total pages' });
        }

        const posts = await ForumPost.find(query)
            .populate('author', 'name email')
            .populate({
                path: 'comments',
                match: { status: 'active' },
                populate: {
                    path: 'author',
                    select: 'name email'
                }
            })
            .sort({ [sortBy]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            posts,
            currentPage: page,
            totalPages,
            totalPosts,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ 
            message: 'Error fetching posts',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get a single forum post by ID
router.get('/posts/:id', [
    param('id').isMongoId().withMessage('Invalid post ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const post = await ForumPost.findById(req.params.id)
            .populate('author', 'name email')
            .populate({
                path: 'comments',
                match: { status: 'active' },
                populate: {
                    path: 'author',
                    select: 'name email'
                }
            });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Increment view count
        post.views += 1;
        await post.save();

        res.json(post);
    } catch (error) {
        console.error('Error fetching single forum post:', error);
        res.status(500).json({ 
            message: 'Error fetching post',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update a forum post
router.put('/posts/:id', authenticateToken, validatePost, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const post = await ForumPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check if user is the author or an admin
        if (post.author.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to edit this post' });
        }

        const { title, content, category, tags } = req.body;
        post.title = title;
        post.content = content;
        post.category = category;
        post.tags = tags;
        post.isEdited = true;
        post.lastEdited = new Date();

        await post.save();
        await post.populate('author', 'name email');

        res.json(post);
    } catch (error) {
        console.error('Error updating forum post:', error);
        res.status(500).json({ 
            message: 'Error updating post',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Delete a forum post
router.delete('/posts/:id', authenticateToken, async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check if user is the author or an admin
        if (post.author.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }

        // Soft delete
        post.status = 'deleted';
        await post.save();

        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting forum post:', error);
        res.status(500).json({ 
            message: 'Error deleting post',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Add a comment to a forum post
router.post('/posts/:id/comments', authenticateToken, commentLimiter, validateComment, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const post = await ForumPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const { text, parentCommentId } = req.body;
        const comment = new Comment({
            text,
            author: req.user.userId,
            post: post._id,
            parentComment: parentCommentId
        });

        await comment.save();
        await comment.populate('author', 'name email');

        // Add comment to post
        post.comments.push(comment._id);
        await post.save();

        res.status(201).json(comment);
    } catch (error) {
        console.error('Error adding comment to post:', error);
        res.status(500).json({ 
            message: 'Error adding comment',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update a comment
router.put('/comments/:id', authenticateToken, validateComment, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Check if user is the author or an admin
        if (comment.author.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to edit this comment' });
        }

        comment.text = req.body.text;
        comment.isEdited = true;
        comment.lastEdited = new Date();

        await comment.save();
        await comment.populate('author', 'name email');

        res.json(comment);
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({ 
            message: 'Error updating comment',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Delete a comment
router.delete('/comments/:id', authenticateToken, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Check if user is the author or an admin
        if (comment.author.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this comment' });
        }

        // Soft delete
        comment.status = 'deleted';
        await comment.save();

        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ 
            message: 'Error deleting comment',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Like/Unlike a post
router.post('/posts/:id/like', authenticateToken, async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const likeIndex = post.likes.indexOf(req.user.userId);
        if (likeIndex === -1) {
            post.likes.push(req.user.userId);
        } else {
            post.likes.splice(likeIndex, 1);
        }

        await post.save();
        res.json({ likes: post.likes.length });
    } catch (error) {
        console.error('Error liking/unliking post:', error);
        res.status(500).json({ 
            message: 'Error processing like/unlike',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default router;