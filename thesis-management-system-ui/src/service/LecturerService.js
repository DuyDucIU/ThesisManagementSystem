import axios from "axios"
import { getToken } from "./AuthService";

const API_BASE = "http://localhost:8080/api/admin/lecturers";

axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getAllLecturers = async () => {
  const res = await axios.get(API_BASE);
  return res.data;
};