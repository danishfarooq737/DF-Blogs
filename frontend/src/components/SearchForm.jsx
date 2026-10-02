import { useEffect, useState } from 'react';

export default function SearchForm({ initial = '', onSubmit, large = false }) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);

  const submit = (event) => {
    event.preventDefault();
    onSubmit(value.trim());
  };

  return (
    <form className={`search ${large ? 'search-large' : ''}`} role="search" onSubmit={submit}>
      <label htmlFor={large ? 'hero-search' : 'page-search'} className="sr-only">
        Search posts
      </label>
      <input
        id={large ? 'hero-search' : 'page-search'}
        type="search"
        value={value}
        maxLength={80}
        placeholder="Search articles, topics and tags…"
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" className="btn">
        Search
      </button>
    </form>
  );
}
