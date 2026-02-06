import axios from "axios";

const API_BASE = "http://localhost:8080/api/admin/students";

export async function importStudents(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await axios.post(
      `${API_BASE}/import`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
    );

    return res.data;
  } catch (err) {
    console.error("Import students error:", err);

    if (err.response) {
      throw new Error(err.response.data?.message || "Import failed");
    } else {
      throw new Error("Network error while importing students");
    }
  }
}


// ======================
// Get All Students
// ======================
export const getAllStudents = async () => {
  const response = await axios.get(API_BASE);
  return response.data; // List<StudentResponse>
};

export const createStudent = async (payload) => {
  const res = await axios.post(API_BASE, payload);
  return res.data;
};


export const updateStudent = async (id, payload) => {
  const res = await axios.patch(`${API_BASE}/${id}`, payload);
  return res.data;
}

export const deleteStudent = async (id) => {
  const res = await axios.delete(`${API_BASE}/${id}`);
  return res.data;
};