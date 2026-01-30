import axios from "axios";

const BASE_URL = "http://localhost:8080/api/admin/students";

// Upload & Preview
export async function previewStudents(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await axios.post(`${BASE_URL}/preview`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data;
  } catch (err) {
    throw new Error("Preview API failed");
  }
}