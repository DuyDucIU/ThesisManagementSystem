import { useEffect, useState } from "react";
import { getAllStudents } from "../service/StudentService";
import EditStudentModal from "./EditStudentModal";

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);

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

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  return (
    <div className="container mt-4">
      <div className="card shadow-sm">
        <div className="card-body">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">Student List</h4>
          <div className="d-flex gap-2">
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedStudent(null);
                setShowModal(true);
              }}
            >
              ➕ Add Student
            </button>

            <button
              className="btn btn-outline-secondary"
              onClick={fetchStudents}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>


          {/* Search */}
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
              No students found.
            </div>
          )}

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th style={{ width: "60px" }}>#</th>
                  <th>Student ID</th>
                  <th>Full Name</th>
                  <th>Managed By</th>
                  <th style={{ width: "60px" }}></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      Loading students...
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredStudents.map((s, index) => (
                    <tr key={s.id}>
                      <td>{index + 1}</td>
                      <td className="fw-bold">{s.studentId}</td>
                      <td>{s.fullName}</td>
                      <td>{s.lecturerName || "-"}</td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-link text-secondary"
                          title="Edit student"
                          onClick={() => openEditModal(s)}
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showModal && (
        <EditStudentModal
          show={showModal}
          student={selectedStudent}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchStudents();
          }}
        />
      )}
    </div>
  );
};

export default StudentList;
