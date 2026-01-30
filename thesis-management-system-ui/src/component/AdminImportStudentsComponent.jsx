import { useState } from "react";
import { previewStudents } from "../service/StudentService";

export default function AdminImportStudents() {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ======================
  // Upload & Preview
  // ======================
  const handlePreview = async () => {
    if (!file) {
      alert("Chọn file Excel trước đã");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const data = await previewStudents(file);
      setPreviewData(data);
    } catch (err) {
      console.error(err);
      setMessage("Lỗi khi preview file");
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // Confirm Import
  // ======================
  const handleImport = async () => {
    if (!previewData) return;

    setLoading(true);
    setMessage("");

    try {
      const validStudents = previewData.students
        .filter((s) => s.status === "VALID")
        .map((s) => ({
          studentCode: s.studentCode,
          fullName: s.fullName,
        }));

      const result = await importStudents(validStudents);

      setMessage(
        `Import xong! Inserted: ${result.inserted}, Skipped: ${result.skipped}`
      );
      setPreviewData(null);
      setFile(null);
    } catch (err) {
      console.error(err);
      setMessage("Lỗi khi import vào DB");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Import Students (Excel)</h2>

      {/* Upload */}
      <div style={{ marginBottom: 10 }}>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button onClick={handlePreview} disabled={loading}>
          {loading ? "Đang xử lý..." : "Upload & Preview"}
        </button>
      </div>

      {/* Message */}
      {message && <p>{message}</p>}

      {/* Preview Table */}
      {previewData && (
        <>
          <h3>Preview</h3>
          <p>
            Total: {previewData.total} | Valid: {previewData.valid} | Invalid:{" "}
            {previewData.invalid}
          </p>

          <table border="1" cellPadding="8" cellSpacing="0">
            <thead>
              <tr>
                <th>MSSV</th>
                <th>Full Name</th>
                <th>Status</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {previewData.students.map((s, idx) => (
                <tr
                  key={idx}
                  style={{
                    backgroundColor:
                      s.status === "INVALID" ? "#f8d7da" : "#d4edda",
                  }}
                >
                  <td>{s.studentCode}</td>
                  <td>{s.fullName}</td>
                  <td>{s.status}</td>
                  <td>{s.error || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <br />

          <button onClick={handleImport} disabled={loading}>
            {loading ? "Đang import..." : "Confirm Import"}
          </button>
        </>
      )}
    </div>
  );
}
