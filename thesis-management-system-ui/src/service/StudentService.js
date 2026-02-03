import axios from "axios";

const API_BASE = "http://localhost:8080/api/admin/students";

// ======================
// Upload & Preview
// ======================
// export const previewStudents = async (file) => {
//   const formData = new FormData();
//   formData.append("file", file);

//   const response = await axios.post(`${API_BASE}/preview`, formData, {
//     headers: {
//       "Content-Type": "multipart/form-data",
//     },
//   });

//   return response.data;
// };

// ======================
// Confirm Import
// ======================
// export const importStudents = async (students) => {
//   const payload = {
//     students: students, 
//   };

//   const response = await axios.post(`${API_BASE}/import`, payload, {
//     headers: {
//       "Content-Type": "application/json",
//     },
//   });

//   return response.data; // { imported, skipped }
// };
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
      // Backend trả lỗi
      throw new Error(err.response.data?.message || "Import failed");
    } else {
      // Network / client error
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