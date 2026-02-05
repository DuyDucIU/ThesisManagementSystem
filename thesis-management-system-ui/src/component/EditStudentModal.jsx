import { useEffect, useState } from "react";
import { getAllLecturers } from "../service/LecturerService";
import {
  updateStudent,
  deleteStudent,
  createStudent,
} from "../service/StudentService";

const EditStudentModal = ({ show, onClose, student, onSuccess }) => {
  const isEdit = !!student;

  const [form, setForm] = useState({
    studentId: "",
    fullName: "",
    lecturerId: "",
  });
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      setForm({
        studentId: student.studentId,
        fullName: student.fullName,
        lecturerId: student.lecturerId || "",
      });
    } else {
      setForm({
        studentId: "",
        fullName: "",
        lecturerId: "",
      });
    }
  }, [student, isEdit]);

  useEffect(() => {
    getAllLecturers().then(setLecturers);
  }, []);

  const handleSave = async () => {
    setLoading(true);

    const payload = {
      studentId: form.studentId,
      fullName: form.fullName,
      lecturerId: form.lecturerId || null,
    };

    if (isEdit) {
      await updateStudent(student.id, payload);
    } else {
      await createStudent(payload);
    }

    setLoading(false);
    onSuccess();
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this student?")) return;
    await deleteStudent(student.id);
    onSuccess();
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" style={{ background: "#00000055" }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5>{isEdit ? "Edit Student" : "Create Student"}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            <div className="mb-3">
              <label>Student ID</label>
              <input
                className="form-control"
                value={form.studentId}
                onChange={(e) =>
                  setForm({ ...form, studentId: e.target.value })
                }
              />
            </div>

            <div className="mb-3">
              <label>Full Name</label>
              <input
                className="form-control"
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
              />
            </div>

            <div className="mb-3">
              <label>Managed By</label>
              <select
                className="form-select"
                value={form.lecturerId}
                onChange={(e) =>
                  setForm({ ...form, lecturerId: e.target.value })
                }
              >
                <option value="">-- Not Assigned --</option>
                {lecturers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer d-flex justify-content-between">
            {isEdit && (
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={loading}
            >
              {isEdit ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditStudentModal;
