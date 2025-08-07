// agriconnect2.0/frontend/src/components/Forum.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
// You might create a separate CSS file for styling later, e.g., import './Forum.css';

const Forum = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ title: '', content: '', author: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = 'http://localhost:5003/api/forum'; // Your backend forum API base URL

  // Function to fetch all forum posts
  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/posts`);
      setPosts(response.data);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to fetch posts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle changes in the new post form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPost(prev => ({ ...prev, [name]: value }));
  };

  // Function to handle submitting a new post
  const handleSubmitNewPost = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setError(null); // Clear previous errors
    try {
      const response = await axios.post(`${API_BASE_URL}/posts`, newPost);
      setPosts(prev => [response.data, ...prev]); // Add new post to the top of the list
      setNewPost({ title: '', content: '', author: '' }); // Clear form
      console.log('Post created successfully:', response.data);
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please fill all required fields correctly.');
    }
  };

  // useEffect to fetch posts when the component mounts
  useEffect(() => {
    fetchPosts();
  }, []); // Empty dependency array means this runs once on mount

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Loading forum posts...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>Error: {error}</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', color: '#4CAF50', marginBottom: '30px' }}>Community Forum</h2>

      {/* Form for New Post */}
      <div style={{ marginBottom: '40px', padding: '20px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h3 style={{ color: '#333', marginBottom: '20px' }}>Create New Post</h3>
        <form onSubmit={handleSubmitNewPost} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            name="title"
            placeholder="Post Title (e.g., 'Best practices for organic farming')"
            value={newPost.title}
            onChange={handleInputChange}
            required
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1em' }}
          />
          <textarea
            name="content"
            placeholder="Share your thoughts or ask a question here..."
            value={newPost.content}
            onChange={handleInputChange}
            required
            rows="5"
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1em', resize: 'vertical' }}
          ></textarea>
          <input
            type="text"
            name="author"
            placeholder="Your Name (optional, defaults to Anonymous)"
            value={newPost.author}
            onChange={handleInputChange}
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1em' }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '1.1em',
              fontWeight: 'bold'
            }}
          >
            Publish Post
          </button>
        </form>
      </div>

      {/* Display Existing Posts */}
      <div>
        {posts.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#555' }}>No posts yet. Be the first to share!</p>
        ) : (
          posts.map(post => (
            <div key={post._id} style={{
              marginBottom: '25px',
              padding: '20px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
              <h3 style={{ color: '#007BFF', marginBottom: '10px' }}>{post.title}</h3>
              <p style={{ color: '#555', lineHeight: '1.6' }}>{post.content}</p>
              <p style={{ fontSize: '0.9em', color: '#777', marginTop: '15px' }}>
                Posted by **{post.author}** on {new Date(post.createdAt).toLocaleDateString()}
              </p>
              {/* Future: Add edit/delete buttons, like/comment counts, comments section */}
              <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                  <p style={{ fontSize: '0.9em', color: '#888' }}>Likes: {post.likes}</p>
                  <p style={{ fontSize: '0.9em', color: '#888' }}>Comments: {post.comments ? post.comments.length : 0}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Forum;