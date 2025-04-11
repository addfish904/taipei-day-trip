// api.js
const API_URL = "http://13.237.251.22:8000/api";

export async function getAttractions(keyword = "", page = 0) {
  const response = await fetch(`${API_URL}/attractions?keyword=${keyword}&page=${page}`);
  return await response.json();
}

export async function getMrts() {
  const response = await fetch(`${API_URL}/mrts`);
  const data = await response.json();
  return data.data;
}

export async function getUserAuth(token) {
  const response = await fetch(`${API_URL}/user/auth`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  return await response.json();
}

export async function postBooking({ attractionId, date, time, price }, token) {
  const response = await fetch(`${API_URL}/booking`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ attractionId, date, time, price })
  });
  return await response.json();
}

export async function getBooking(token) {
  const response = await fetch(`${API_URL}/booking`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  return await response.json();
}

export async function deleteBooking(token) {
  const response = await fetch(`${API_URL}/booking`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  return await response.json();
}
