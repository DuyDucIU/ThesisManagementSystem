import axios from "axios";

const ADMIN_API_BASE = "http://localhost:8080/api/admin/students";
const LECTURER_API_BASE = "http://localhost:8080/api/lecturer/students";

export async function importStudents(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await axios.post(
      `${ADMIN_API_BASE}/import`,
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
  const response = await axios.get(ADMIN_API_BASE);
  return response.data; // List<StudentResponse>
};

export const createStudent = async (payload) => {
  const res = await axios.post(ADMIN_API_BASE, payload);
  return res.data;
};


export const updateStudent = async (id, payload) => {
  const res = await axios.patch(`${ADMIN_API_BASE}/${id}`, payload);
  return res.data;
}

export const deleteStudent = async (id) => {
  const res = await axios.delete(`${ADMIN_API_BASE}/${id}`);
  return res.data;
};

export const getUnassignedStudents = async () => {
  const response = await axios.get(`${LECTURER_API_BASE}/unassigned`);
  return response.data; 
};

export const assignStudents = async (studentIds) => {
  const response = await axios.post(`${LECTURER_API_BASE}/assign`, { id: studentIds });
  return response.data; 
};