import mongoose from 'mongoose';

const forumPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        minlength: [3, 'Title must be at least 3 characters long'],
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    content: {
        type: String,
        required: [true, 'Content is required'],
        trim: true,
        minlength: [10, 'Content must be at least 10 characters long']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['general', 'crops', 'equipment', 'market', 'weather', 'other'],
        default: 'general'
    },
    tags: [{
        type: String,
        trim: true
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }],
    views: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'deleted', 'hidden'],
        default: 'active'
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    lastEdited: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for better query performance
forumPostSchema.index({ title: 'text', content: 'text', tags: 'text' });
forumPostSchema.index({ category: 1, status: 1 });
forumPostSchema.index({ author: 1, status: 1 });
forumPostSchema.index({ createdAt: -1 });

// Virtual for like count
forumPostSchema.virtual('likeCount').get(function() {
    return this.likes.length;
});

// Virtual for comment count
forumPostSchema.virtual('commentCount').get(function() {
    return this.comments.length;
});

// Method to add a like
forumPostSchema.methods.addLike = async function(userId) {
    if (!this.likes.includes(userId)) {
        this.likes.push(userId);
        await this.save();
    }
    return this.likes.length;
};

// Method to remove a like
forumPostSchema.methods.removeLike = async function(userId) {
    this.likes = this.likes.filter(id => id.toString() !== userId.toString());
    await this.save();
    return this.likes.length;
};

// Method to add a comment
forumPostSchema.methods.addComment = async function(commentId) {
    this.comments.push(commentId);
    await this.save();
};

// Method to remove a comment
forumPostSchema.methods.removeComment = async function(commentId) {
    this.comments = this.comments.filter(id => id.toString() !== commentId.toString());
    await this.save();
};

// Method to increment view count
forumPostSchema.methods.incrementViews = async function() {
    this.views += 1;
    await this.save();
};

// Static method to find posts by category
forumPostSchema.statics.findByCategory = function(category, page = 1, limit = 10) {
    return this.find({ category, status: 'active' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('author', 'name email')
        .populate({
            path: 'comments',
            match: { status: 'active' },
            populate: {
                path: 'author',
                select: 'name email'
            }
        });
};

// Static method to find posts by author
forumPostSchema.statics.findByAuthor = function(authorId, page = 1, limit = 10) {
    return this.find({ author: authorId, status: 'active' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('author', 'name email')
        .populate({
            path: 'comments',
            match: { status: 'active' },
            populate: {
                path: 'author',
                select: 'name email'
            }
        });
};

// Static method to search posts
forumPostSchema.statics.search = function(query, page = 1, limit = 10) {
    return this.find({
        $and: [
            { status: 'active' },
            {
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { content: { $regex: query, $options: 'i' } },
                    { tags: { $in: [new RegExp(query, 'i')] } }
                ]
            }
        ]
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('author', 'name email')
    .populate({
        path: 'comments',
        match: { status: 'active' },
        populate: {
            path: 'author',
            select: 'name email'
        }
    });
};

const ForumPost = mongoose.model('ForumPost', forumPostSchema);
export default ForumPost; 