export async function apiGet(path) {
  const response = await fetch(path, {
    credentials: 'include'
  });
  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status} ${path}`);
    error.status = response.status;
    error.path = path;
    throw error;
  }
  return response.json();
}

export async function apiPost(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(body || {})
  });
  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function apiDelete(path) {
  const response = await fetch(path, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}
