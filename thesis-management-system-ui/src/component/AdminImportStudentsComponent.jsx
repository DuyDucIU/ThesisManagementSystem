import { useState } from "react";
import { previewStudents, importStudents } from "../service/StudentService";

function AdminImportStudentsComponent() {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ======================
  // Upload & Preview
  // ======================
  const handlePreview = async () => {
    if (!file) {
      alert("Please select an Excel file");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const data = await previewStudents(file);
      setPreviewData(data);

      if (data.valid === 0) {
        setMessage("No valid students found. Please fix errors before importing.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to preview file. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  // ======================
  // Confirm Import
  // ======================
  const handleImport = async () => {
    if (!previewData || !previewData.students?.length) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await importStudents(previewData.students);

      setMessage(
        `Import completed! Imported: ${result.imported}, Skipped: ${result.skipped}`
      );

      // reset state
      setPreviewData(null);
      setFile(null);
    } catch (err) {
      console.error(err);
      setMessage("Error importing data into database");
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
          {loading ? "Processing..." : "Upload & Preview"}
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
                  <td>{s.studentId}</td>
                  <td>{s.fullName}</td>
                  <td>{s.status}</td>
                  <td>{s.error || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <br />

          <button onClick={handleImport} disabled={loading}>
            {loading ? "Processing..." : "Confirm Import"}
          </button>
        </>
      )}
    </div>
  );
}

export default AdminImportStudentsComponent