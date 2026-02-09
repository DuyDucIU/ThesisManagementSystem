import axios from "axios";

const API_BASE = "http://localhost:8080/api/admin/semesters";

export const getAllSemesters = async () => {
  const res = await axios.get(API_BASE);
  return res.data;
};

export const createSemester = async (data) => {
  const res = await axios.post(API_BASE, data);
  return res.data;
};

export const updateSemester = async (id, data) => {
  const res = await axios.patch(`${API_BASE}/${id}`, data);
  return res.data;
};

export const deleteSemester = async (id) => {
  return axios.delete(`${API_BASE}/${id}`);
};

export const updateSemesterStatus = async (id, status) => {
  const res = await axios.patch(
    `${API_BASE}/${id}/status`,
    null,
    { params: { status } }
  );
  return res.data;
};
