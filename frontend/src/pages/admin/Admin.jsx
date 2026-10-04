import { NavLink, Route, Routes } from 'react-router';
import Page from '../../Page.jsx';
import Dashboard from './Dashboard.jsx';
import Posts from './Posts.jsx';
import PostEditor from './PostEditor.jsx';
import Comments from './Comments.jsx';
import Users from './Users.jsx';
import Taxonomy from './Taxonomy.jsx';

const SECTIONS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/posts', label: 'Posts' },
  { to: '/admin/comments', label: 'Comments' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/taxonomy', label: 'Categories & tags' },
];

export default function Admin() {
  return (
    <Page title="Admin" noindex wide>
      <div className="admin-layout">
        <nav className="admin-nav" aria-label="Admin sections">
          {SECTIONS.map((section) => (
            <NavLink key={section.to} to={section.to} end={section.end}>
              {section.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-content">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="posts" element={<Posts />} />
            <Route path="posts/new" element={<PostEditor />} />
            <Route path="posts/:id" element={<PostEditor />} />
            <Route path="comments" element={<Comments />} />
            <Route path="users" element={<Users />} />
            <Route path="taxonomy" element={<Taxonomy />} />
            <Route path="*" element={<p className="empty">Section not found.</p>} />
          </Routes>
        </div>
      </div>
    </Page>
  );
}
