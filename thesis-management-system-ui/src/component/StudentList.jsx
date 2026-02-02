import { useEffect, useState } from "react";
import { getAllStudents } from "../service/StudentService";

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchStudents = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getAllStudents();
      setStudents(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(
    (s) =>
      s.studentId.toLowerCase().includes(search.toLowerCase()) ||
      s.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mt-4">
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">Student List</h4>
            <button
              className="btn btn-outline-primary"
              onClick={fetchStudents}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search by student ID or full name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {!loading && filteredStudents.length === 0 && (
            <div className="alert alert-warning">
              No students found. Try another search or import students.
            </div>
          )}

          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Student ID</th>
                  <th>Full Name</th>
                  <th>Managed By</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="3" className="text-center py-4">
                      Loading students...
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredStudents.map((s, index) => (
                    <tr key={s.id || index}>
                      <td>{index + 1}</td>
                      <td className="fw-bold">{s.studentId}</td>
                      <td>{s.fullName}</td>
                      <td>{s.managedBy}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentList;
