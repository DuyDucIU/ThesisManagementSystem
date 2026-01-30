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
    <div className="container py-4">
      <div className="card shadow">
        <div className="card-body">
          <h3 className="card-title mb-4 text-primary">
            Import Students (Excel)
          </h3>

          {/* Upload */}
          <div className="row g-2 align-items-center mb-3">
            <div className="col-md-8">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="form-control"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </div>
            <div className="col-md-4 d-grid">
              <button
                className="btn btn-primary"
                onClick={handlePreview}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Processing...
                  </>
                ) : (
                  "Upload & Preview"
                )}
              </button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="alert alert-info py-2">{message}</div>
          )}

          {/* Preview Table */}
          {previewData && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Preview</h5>
                <span className="badge bg-secondary">
                  Total: {previewData.total} | Valid:{" "}
                  <span className="text-success">{previewData.valid}</span> | Invalid:{" "}
                  <span className="text-danger">{previewData.invalid}</span>
                </span>
              </div>

              <div className="table-responsive">
                <table className="table table-bordered table-hover align-middle">
                  <thead className="table-dark">
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
                        className={
                          s.status === "INVALID"
                            ? "table-danger"
                            : "table-success"
                        }
                      >
                        <td>{s.studentId}</td>
                        <td>{s.fullName}</td>
                        <td>
                          <span
                            className={
                              s.status === "INVALID"
                                ? "badge bg-danger"
                                : "badge bg-success"
                            }
                          >
                            {s.status}
                          </span>
                        </td>
                        <td>{s.error || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-grid mt-3">
                <button
                  className="btn btn-success btn-lg"
                  onClick={handleImport}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Import"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

}

export default AdminImportStudentsComponent