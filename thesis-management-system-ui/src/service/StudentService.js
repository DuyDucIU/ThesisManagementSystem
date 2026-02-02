import axios from "axios";

const API_BASE = "http://localhost:8080/api/admin/students";

// ======================
// Upload & Preview
// ======================
export const previewStudents = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(`${API_BASE}/preview`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

// ======================
// Confirm Import
// ======================
export const importStudents = async (students) => {
  const payload = {
    students: students, 
  };

  const response = await axios.post(`${API_BASE}/import`, payload, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response.data; // { imported, skipped }
};

// ======================
// Get All Students
// ======================
export const getAllStudents = async () => {
  const response = await axios.get(API_BASE);
  return response.data; // List<StudentResponse>
};