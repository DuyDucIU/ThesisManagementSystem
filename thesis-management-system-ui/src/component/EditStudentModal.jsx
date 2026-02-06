import { Modal, Form, Input, Select, message, Popconfirm, Button } from "antd";
import { useEffect, useState } from "react";
import { updateStudent, createStudent, deleteStudent } from "../service/StudentService";
import { getAllLecturers } from "../service/LecturerService";

const EditStudentModal = ({ open, student, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [lecturers, setLecturers] = useState([]); 

  useEffect(() => {
    getAllLecturers()
      .then(setLecturers)
      .catch(() => message.error("Failed to load lecturers"));
  }, []);

  useEffect(() => {
    if (student) {
      form.setFieldsValue({
        studentId: student.studentId,
        fullName: student.fullName,
        lecturerId: student.lecturerId ?? null, 
      });
    } else {
      form.resetFields();
    }
  }, [student, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();

    try {
      if (student) {
        await updateStudent(student.id, values);
        message.success("Student updated");
      } else {
        await createStudent(values);
        message.success("Student created");
      }
      onSuccess();
    } catch (e) {
      message.error("Save failed");
    }
  };

  const handleDelete = async () => {
    if (!student) return;

    try {
      await deleteStudent(student.id);
      message.success("Student deleted");
      onSuccess();
    } catch (e) {
      message.error("Delete failed");
    }
  };


  return (
    <Modal
      open={open}
      title={student ? "Edit Student" : "Add Student"}
      onCancel={onCancel}
      destroyOnHidden
      footer={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* LEFT: Delete */}
          <div>
            {student && (
              <Popconfirm
                title="Delete this student?"
                description="This action cannot be undone"
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={handleDelete}
              >
                <Button danger>Delete</Button>
              </Popconfirm>
            )}
          </div>

          {/* RIGHT: Cancel + Save */}
          <div>
            <Button onClick={onCancel} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" onClick={handleSubmit}>
              Save
            </Button>
          </div>
        </div>
      }
    >



      <Form form={form} layout="vertical">
        <Form.Item
          label="Student ID"
          name="studentId"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Full Name"
          name="fullName"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item label="Managed By" name="lecturerId">
          <Select
            allowClear
            placeholder="Not assigned"
            options={lecturers.map((l) => ({
              label: l.fullName,
              value: l.id,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditStudentModal;
