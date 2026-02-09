import { Modal, Form, Input, DatePicker, message, Popconfirm, Button } from "antd";
import { useEffect } from "react";
import dayjs from "dayjs";
import {
  createSemester,
  updateSemester,
  deleteSemester,
} from "../service/SemesterService";

const SemesterForm = ({ open, semester, onCancel, onSuccess }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (semester) {
      form.setFieldsValue({
        code: semester.code,
        name: semester.name,
        startDate: semester.startDate ? dayjs(semester.startDate) : null,
        endDate: semester.endDate ? dayjs(semester.endDate) : null,
      });
    } else {
      form.resetFields();
    }
  }, [semester, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();

    const payload = {
      ...values,
      startDate: values.startDate.format("YYYY-MM-DD"),
      endDate: values.endDate.format("YYYY-MM-DD"),
    };

    try {
      if (semester) {
        await updateSemester(semester.id, payload);
        message.success("Semester updated");
      } else {
        await createSemester(payload);
        message.success("Semester created");
      }
      onSuccess();
    } catch (e) {
      message.error("Save failed");
    }
  };

  const handleDelete = async () => {
    if (!semester) return;

    try {
      await deleteSemester(semester.id);
      message.success("Semester deleted");
      onSuccess();
    } catch (e) {
      message.error("Delete failed");
    }
  };

  return (
    <Modal
      open={open}
      title={semester ? "Edit Semester" : "Add Semester"}
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
            {semester && (
              <Popconfirm
                title="Delete this semester?"
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
          label="Code"
          name="code"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Start Date"
          name="startDate"
          rules={[{ required: true }]}
        >
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="End Date"
          name="endDate"
          rules={[{ required: true }]}
        >
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SemesterForm;
