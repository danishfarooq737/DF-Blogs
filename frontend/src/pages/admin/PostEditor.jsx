import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { api, assetUrl } from '../../api.js';
import { useToast } from '../../context.js';
import useAsync from '../../hooks/useAsync.js';
import { ErrorState, FieldError, Spinner } from '../../components/Feedback.jsx';
import { parseTags } from '../../utils.js';

const BLANK = { title: '', excerpt: '', content: '', category: '', tags: '', image: null };

const toFormState = (post) => ({
  title: post.title,
  excerpt: post.excerpt || '',
  content: post.content,
  category: post.category || '',
  tags: (post.tags || []).join(', '),
  image: post.image?.url ? post.image : null,
});

function EditorForm({ initial, id, suggestions }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const quillRef = useRef(null);
  const [form, setForm] = useState(initial);
  const [alt, setAlt] = useState(initial.image?.alt || '');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const change = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const uploadImage = async (file, altText) => {
    const body = new FormData();
    body.append('image', file);
    body.append('alt', altText);
    const { image } = await api.post('/admin/upload', body);
    return image;
  };

  const onFeaturedFile = async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (!alt.trim()) return setErrors({ alt: 'Enter alt text describing the image before uploading.' });
    setUploading(true);
    setErrors({});
    try {
      const image = await uploadImage(file, alt.trim());
      setForm((current) => ({ ...current, image }));
    } catch (err) {
      setErrors({ image: err.message });
    } finally {
      setUploading(false);
    }
  };

  // Toolbar "image" button: upload a file and insert it into the article body.
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [[{ header: [2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['blockquote', 'link', 'image'], ['clean']],
        handlers: {
          image() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/png,image/jpeg,image/webp';
            input.onchange = async () => {
              const file = input.files[0];
              const altText = file && window.prompt('Describe this image for screen-reader users (required):');
              if (!file || !altText?.trim()) return;
              try {
                const image = await uploadImage(file, altText.trim());
                const editor = quillRef.current.getEditor();
                const index = editor.getSelection(true).index;
                editor.insertEmbed(index, 'image', image.url);
                editor.formatText(index, 1, { alt: image.alt });
              } catch (err) {
                notify(err.message, 'error');
              }
            };
            input.click();
          },
        },
      },
    }),
    [notify],
  );

  const save = async (status) => {
    const found = {};
    if (!form.title.trim()) found.title = 'Title is required';
    if (!form.content.replace(/<[^>]*>/g, '').trim() && !/<img /.test(form.content)) found.content = 'Write some content first';
    setErrors(found);
    setMessage('');
    if (Object.keys(found).length) return;

    setBusy(true);
    const body = {
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      category: form.category,
      tags: parseTags(form.tags),
      status,
      image: form.image ? { ...form.image, alt: alt.trim() || form.image.alt } : null,
    };
    try {
      if (id) await api.put(`/admin/posts/${id}`, body);
      else await api.post('/admin/posts', body);
      notify(status === 'published' ? 'Post published.' : 'Draft saved.');
      navigate('/admin/posts');
    } catch (err) {
      const fieldErrors = {};
      (err.errors || []).forEach((entry) => {
        fieldErrors[entry.field.split('.')[0]] = entry.message;
      });
      setErrors(fieldErrors);
      setMessage(Object.keys(fieldErrors).length ? 'Please fix the highlighted fields.' : err.message);
      setBusy(false);
    }
  };

  return (
    <form className="panel editor" onSubmit={(event) => event.preventDefault()} noValidate>
      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" value={form.title} maxLength={140} onChange={change('title')} aria-invalid={Boolean(errors.title)} aria-describedby="title-error" />
        <FieldError id="title-error">{errors.title}</FieldError>
      </div>
      <div className="field">
        <label htmlFor="excerpt">Excerpt <span className="muted small">({form.excerpt.length}/300)</span></label>
        <textarea id="excerpt" rows={2} value={form.excerpt} maxLength={300} onChange={change('excerpt')} />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="category">Category</label>
          <input id="category" list="category-options" value={form.category} onChange={change('category')} placeholder="general" aria-describedby="category-error" />
          <datalist id="category-options">
            {suggestions.categories.map((item) => <option key={item.name} value={item.name} />)}
          </datalist>
          <FieldError id="category-error">{errors.category}</FieldError>
        </div>
        <div className="field">
          <label htmlFor="tags">Tags <span className="muted small">(comma separated, max 8)</span></label>
          <input id="tags" value={form.tags} onChange={change('tags')} aria-describedby="tags-error" />
          <FieldError id="tags-error">{errors.tags}</FieldError>
          {suggestions.tags.length > 0 && <p className="muted small">Existing: {suggestions.tags.slice(0, 8).map((item) => item.name).join(', ')}</p>}
        </div>
      </div>

      <fieldset className="field">
        <legend>Featured image</legend>
        <label htmlFor="alt">Alt text (required)</label>
        <input id="alt" value={alt} maxLength={140} onChange={(event) => setAlt(event.target.value)} aria-invalid={Boolean(errors.alt)} aria-describedby="alt-error" />
        <FieldError id="alt-error">{errors.alt || errors.image}</FieldError>
        <label htmlFor="image-file">Upload (JPG, PNG or WebP, max 2 MB)</label>
        <input id="image-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={onFeaturedFile} disabled={uploading} />
        {uploading && <Spinner label="Uploading image" />}
        {form.image?.url && (
          <div className="thumb-wrap">
            <img className="thumb" src={assetUrl(form.image.url)} alt={alt || form.image.alt} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, image: null })}>Remove image</button>
          </div>
        )}
      </fieldset>

      <div className="field">
        <label id="content-label">Content</label>
        <ReactQuill ref={quillRef} theme="snow" modules={modules} value={form.content} onChange={(value) => setForm((current) => ({ ...current, content: value }))} aria-labelledby="content-label" />
        <FieldError id="content-error">{errors.content}</FieldError>
      </div>

      {message && <p className="alert alert-error" role="alert">{message}</p>}
      <div className="row end">
        <Link to="/admin/posts" className="btn btn-ghost">Cancel</Link>
        <button type="button" className="btn btn-ghost" disabled={busy || uploading} onClick={() => save('draft')}>Save as draft</button>
        <button type="button" className="btn" disabled={busy || uploading} onClick={() => save('published')}>{busy ? 'Saving…' : 'Publish'}</button>
      </div>
    </form>
  );
}

export default function PostEditor() {
  const { id } = useParams();
  const post = useAsync(() => (id ? api.get(`/admin/posts/${id}`) : Promise.resolve(null)), [id]);
  const taxonomy = useAsync(() => api.get('/admin/taxonomy').catch(() => ({ categories: [], tags: [] })), []);

  if (post.loading || taxonomy.loading) return <Spinner label="Loading editor" />;
  if (post.error) return <ErrorState message={post.error} onRetry={post.reload} />;

  return (
    <section aria-labelledby="editor-title">
      <h1 id="editor-title">{id ? 'Edit post' : 'New post'}</h1>
      <EditorForm key={id || 'new'} id={id} initial={post.data ? toFormState(post.data.post) : BLANK} suggestions={taxonomy.data} />
    </section>
  );
}
