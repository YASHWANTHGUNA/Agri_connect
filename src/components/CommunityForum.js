// agriconnect2.0/src/components/CommunityForum.js

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../utils/axios';
import config from '../config';
import './CommunityForum.css';

const CommunityForum = () => {
  const { user, token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('General Discussion');
  const [showAddPostForm, setShowAddPostForm] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});

  // Function to fetch all forum posts
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`${config.apiEndpoints.forum}/posts`);
      const postsData = Array.isArray(response.data.posts) ? response.data.posts : [];
      setPosts(postsData);
    } catch (err) {
      console.error('Error fetching forum posts:', err);
      const errorMessage = err.response?.data?.message || 'Failed to fetch forum posts. Please try again later.';
      setError(errorMessage);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to create a new post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!user || !token) {
      setError('Please log in to create a post');
      return;
    }

    try {
      const response = await axiosInstance.post(`${config.apiEndpoints.forum}/posts`, {
        title: newPostTitle,
        content: newPostContent,
        category: newPostCategory
      });

      setPosts(prevPosts => [response.data, ...prevPosts]);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCategory('General Discussion');
      setShowAddPostForm(false);
    } catch (err) {
      console.error('Error creating post:', err);
      const errorMessage = err.response?.data?.message || 'Failed to create post. Please try again.';
      setError(errorMessage);
    }
  };

  // Function to add a comment
  const handleAddComment = async (postId) => {
    if (!user || !token) {
      setError('Please log in to add a comment');
      return;
    }

    const commentText = commentInputs[postId];
    if (!commentText) return;

    try {
      const response = await axiosInstance.post(
        `${config.apiEndpoints.forum}/posts/${postId}/comments`,
        { text: commentText }
      );

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === postId
            ? { ...post, comments: [...post.comments, response.data] }
            : post
        )
      );
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Error adding comment:', err);
      const errorMessage = err.response?.data?.message || 'Failed to add comment. Please try again.';
      setError(errorMessage);
    }
  };

  // Function to delete a post
  const handleDeletePost = async (postId) => {
    if (!user || !token) {
      setError('Please log in to delete a post');
      return;
    }

    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await axiosInstance.delete(`${config.apiEndpoints.forum}/posts/${postId}`);
        setPosts(prevPosts => prevPosts.filter(post => post._id !== postId));
      } catch (err) {
        console.error('Error deleting post:', err);
        const errorMessage = err.response?.data?.message || 'Failed to delete post. Please try again.';
        setError(errorMessage);
      }
    }
  };

  // Fetch posts on component mount
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="forum-container">
      <header className="forum-header">
        <h1>Community Forum</h1>
        <p>Share knowledge, ask questions, and connect with fellow farmers.</p>
      </header>

      {/* Conditional rendering for create post button/login prompt */}
      {user ? (
        <button
          className="toggle-post-form-btn"
          onClick={() => setShowAddPostForm(!showAddPostForm)}
        >
          {showAddPostForm ? 'Hide Post Form' : 'Create New Post'}
        </button>
      ) : (
        <p className="forum-login-prompt">
          <a href="/login">Log in</a> to create posts and comments.
        </p>
      )}

      {/* Conditional rendering for add post form */}
      {showAddPostForm && user && (
        <div className="add-post-section card">
          <h3>Create a New Post</h3>
          <form onSubmit={handleCreatePost}>
            <div className="form-group">
              <label htmlFor="post-title">Title:</label>
              <input
                type="text"
                id="post-title"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Enter post title"
                required
              />
            </div>

            {/* --- NEW: Category Selection --- */}
            <div className="form-group">
              <label htmlFor="post-category">Category:</label>
              <select
                id="post-category"
                value={newPostCategory}
                onChange={(e) => setNewPostCategory(e.target.value)}
                required
                className="form-select"
              >
                <option value="General Discussion">General Discussion</option>
                <option value="Crop Management">Crop Management</option>
                <option value="Pest & Disease Control">Pest & Disease Control</option>
                <option value="Fertilizers & Nutrients">Fertilizers & Nutrients</option>
                <option value="Market Prices & Trends">Market Prices & Trends</option>
                <option value="Weather & Climate">Weather & Climate</option>
                <option value="Farm Machinery & Tools">Farm Machinery & Tools</option>
                <option value="Irrigation & Water">Irrigation & Water</option>
                <option value="Livestock Farming">Livestock Farming</option>
                <option value="Organic Farming">Organic Farming</option>
                <option value="Government Schemes">Government Schemes</option>
                <option value="Success Stories">Success Stories</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {/* --- END NEW --- */}

            <div className="form-group">
              <label htmlFor="post-content">Content:</label>
              <textarea
                id="post-content"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Write your post content here..."
                rows="5"
                required
              ></textarea>
            </div>
            <button type="submit" className="submit-post-btn">Post</button>
          </form>
        </div>
      )}

      {/* Loading, Error, and No Posts messages */}
      {loading && <p className="loading-message">Loading forum posts...</p>}
      {error && <p className="alert-error">{error}</p>}

      {!loading && !error && (!Array.isArray(posts) || posts.length === 0) && (
        <p className="no-posts-message">No posts yet. Be the first to create one!</p>
      )}

      {/* List of Forum Posts */}
      {Array.isArray(posts) && posts.length > 0 && (
        <div className="posts-list">
          {posts.map((post) => (
            <div key={post._id} className="post-card card">
              <div className="post-header">
                <h2 className="post-title">{post.title}</h2>
                {/* Delete button only for post author */}
                {user && user.email === post.author && (
                  <button
                    className="delete-post-btn"
                    onClick={() => handleDeletePost(post._id)}
                    title="Delete Post"
                  >
                    {/* Font Awesome trash icon, ensure you have Font Awesome linked in public/index.html */}
                    <i className="fas fa-trash-alt"></i>
                  </button>
                )}
              </div>
              <p className="post-meta">
                <span className="post-category-tag">{post.category}</span> {/* NEW: Display category */}
                Posted by <strong>{post.author}</strong> on {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString()}
              </p>
              <p className="post-content">{post.content}</p>

              {/* Comments Section for each post */}
              <div className="comments-section">
                <h4>Comments ({Array.isArray(post.comments) ? post.comments.length : 0})</h4>
                {Array.isArray(post.comments) && post.comments.length > 0 ? (
                  <ul className="comments-list">
                    {post.comments.map((comment, index) => (
                      // Use comment._id if available, otherwise index (less ideal but works for initial setup)
                      <li key={comment._id || index} className="comment-item">
                        <p className="comment-text">{comment.text}</p>
                        <p className="comment-meta">
                          by <strong>{comment.author}</strong> on {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-comments-message">No comments yet.</p>
                )}

                {/* Add Comment Form */}
                {user && (
                  <div className="add-comment-form">
                    <input
                      type="text"
                      value={commentInputs[post._id] || ''} // Controlled component for specific comment input
                      onChange={(e) => setCommentInputs(prev => ({ ...prev, [post._id]: e.target.value }))}
                      placeholder="Add a comment..."
                      // Allow submitting by pressing Enter key
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddComment(post._id);
                        }
                      }}
                    />
                    <button onClick={() => handleAddComment(post._id)}>Add Comment</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommunityForum;