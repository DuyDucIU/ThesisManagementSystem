import axios from "axios"

const API_BASE = "http://localhost:8080/api/admin/lecturers";

export const getAllLecturers = async () => {
  const res = await axios.get(API_BASE);
  return res.data;
};