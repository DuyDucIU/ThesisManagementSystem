const BASE_URL = "http://localhost:8080/api/admin/students";

// Upload & Preview
export async function previewStudents(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/preview`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Preview API failed");
  }

  return res.json();
}