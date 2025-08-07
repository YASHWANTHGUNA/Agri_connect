import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: [true, 'Comment text is required'],
        trim: true,
        minlength: [1, 'Comment cannot be empty'],
        maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumPost',
        required: true
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
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
commentSchema.index({ post: 1, status: 1 });
commentSchema.index({ author: 1, status: 1 });
commentSchema.index({ parentComment: 1, status: 1 });
commentSchema.index({ createdAt: -1 });

// Methods
commentSchema.methods.addLike = async function(userId) {
    if (!this.likes.includes(userId)) {
        this.likes.push(userId);
        await this.save();
    }
    return this.likes.length;
};

commentSchema.methods.removeLike = async function(userId) {
    this.likes = this.likes.filter(id => id.toString() !== userId.toString());
    await this.save();
    return this.likes.length;
};

// Static methods
commentSchema.statics.findByPost = function(postId, page = 1, limit = 10) {
    return this.find({ post: postId, status: 'active' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('author', 'name email')
        .populate({
            path: 'parentComment',
            match: { status: 'active' },
            populate: {
                path: 'author',
                select: 'name email'
            }
        });
};

commentSchema.statics.findByAuthor = function(authorId, page = 1, limit = 10) {
    return this.find({ author: authorId, status: 'active' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('author', 'name email')
        .populate('post', 'title')
        .populate({
            path: 'parentComment',
            match: { status: 'active' },
            populate: {
                path: 'author',
                select: 'name email'
            }
        });
};

commentSchema.statics.findReplies = function(commentId, page = 1, limit = 10) {
    return this.find({ parentComment: commentId, status: 'active' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('author', 'name email');
};

const Comment = mongoose.model('Comment', commentSchema);

export default Comment; 