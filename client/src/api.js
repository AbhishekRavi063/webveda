// Small fetch wrapper: always returns parsed JSON or throws an Error with a
// message that is safe to show to the reader.
async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response (e.g. proxy error page); handled below.
  }

  if (!res.ok) {
    if (data?.error) throw new Error(data.error);
    // A 5xx with no JSON body comes from a proxy or gateway, not our API:
    // the backend itself is unreachable.
    if (res.status >= 500) {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }
    throw new Error(`The server responded with an error (${res.status}).`);
  }
  return data;
}

export const api = {
  getBooks: () => request('/api/books'),
  updateBook: (id, read) =>
    request(`/api/books/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ read }),
    }),
  getVideoProgress: () => request('/api/video/progress'),
  saveVideoProgress: (position) =>
    request('/api/video/progress', {
      method: 'PUT',
      body: JSON.stringify({ position }),
    }),
};
