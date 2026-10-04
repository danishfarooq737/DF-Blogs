const Post = require('../../models/Post');

describe('Post model', () => {
  it('loads as a mongoose model with the expected paths', () => {
    expect(Post.modelName).toBe('Post');
    ['title', 'slug', 'content', 'image.url', 'author', 'status', 'publishedAt'].forEach((path) => {
      expect(Post.schema.path(path)).toBeDefined();
    });
  });

  it('rewrites legacy localhost image URLs to the configured API origin in JSON output', () => {
    const post = new Post({
      title: 'T',
      slug: 't',
      content: '<p><img src="http://localhost:9999/uploads/a.webp"></p>',
      image: { url: 'http://localhost:9999/uploads/a.webp', key: 'a.webp', alt: 'a' },
      author: '507f1f77bcf86cd799439011',
    });
    const json = post.toJSON();
    expect(json.image.url).toBe('http://localhost:5000/uploads/a.webp'); // SERVER_URL in the test env
    expect(json.content).toContain('src="http://localhost:5000/uploads/a.webp"');
    expect(json).not.toHaveProperty('id');
  });
});
