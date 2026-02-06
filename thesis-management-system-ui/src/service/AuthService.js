import axios from "axios"

const AUTH_REST_API_BASE_URL = "http://localhost:8080/api/auth"
const TOKEN_KEY = "token";
const ROLES_KEY = "roles";
const USER_KEY = "user";

export const loginApi = (username, password) => 
    axios.post(AUTH_REST_API_BASE_URL + "/login", {username, password})

/* ======================
   Save
====================== */
export const saveAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLES_KEY, JSON.stringify(user.roles));
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/* ======================
   Get
====================== */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getRoles = () => {
  const roles = localStorage.getItem(ROLES_KEY);
  return roles ? JSON.parse(roles) : [];
};

export const getUser = () => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

/* ======================
   Role helpers
====================== */
export const isAdmin = () => {
  return getRoles().includes("ROLE_ADMIN");
};

export const isLecturer = () => {
  return getRoles().includes("ROLE_LECTURER");
};

/* ======================
   Clear
====================== */
export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLES_KEY);
  localStorage.removeItem(USER_KEY);
};
