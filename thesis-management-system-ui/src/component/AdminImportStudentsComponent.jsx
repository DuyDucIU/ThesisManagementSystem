import { useState } from "react";
import { importStudents } from "../service/StudentService";
import { useNavigate } from "react-router-dom";

function AdminImportStudentsComponent() {
  const [file, setFile] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  // ======================
  // Import 
  // ======================
  const handleImport = async () => {
    if (!file) {
      alert("Please select an Excel file");
      return;
    }

    setLoading(true);
    setMessage("");
    setResultData(null);

    try {
      const data = await importStudents(file);
      setResultData(data);

      setMessage(
        `Import completed! Total: ${data.total} | Valid: ${
          data.total - data.invalid
        } | Invalid: ${data.invalid}`
      );
    } catch (err) {
      console.error(err);
      setMessage("Failed to import file. Please try again.");
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
                disabled={loading}
              />
            </div>
            <div className="col-md-4 d-grid">
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Importing...
                  </>
                ) : (
                  "Import"
                )}
              </button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="alert alert-info py-2">{message}</div>
          )}

          {resultData && resultData.valid === 0 && (
            <div className="alert alert-danger py-2">
              All records are invalid. Please review and fix them in Students Management.
            </div>
          )}


          {/* View all students */}
          {resultData && (
            <div className="d-grid mb-3">
              <button
                className="btn btn-outline-primary"
                onClick={() => navigate("/students")}
              >
                View All Students
              </button>
            </div>
          )}

          {/* Result Table */}
          {resultData && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Imported Records</h5>
                <span className="badge bg-secondary">
                  Total: {resultData.total} | Valid:{" "}
                  <span className="text-success">{resultData.valid}</span>{" "}
                  | Invalid:{" "}
                  <span className="text-danger">{resultData.invalid}</span>
                </span>
              </div>

              <div className="table-responsive">
                <table className="table table-bordered table-hover align-middle">
                  <thead className="table-dark">
                    <tr>
                      <th>MSSV</th> 
                      <th>Full Name</th>
                      <th>Status</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(resultData.students || []).map((s, idx) => (
                      <tr
                        key={idx}
                        className={
                          s.status === "INVALID"
                            ? "table-danger"
                            : "table-success"
                        }
                      >
                        <td>{s.studentId || "-"}</td>
                        <td>{s.fullName || "-"}</td>
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
                        <td>{s.message || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminImportStudentsComponent;
