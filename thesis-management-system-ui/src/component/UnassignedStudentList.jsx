import { useEffect, useState } from "react";
import { Table, Button, Card, message, Modal } from "antd";
import {
  getUnassignedStudents,
  assignStudents,
} from "../service/StudentService";

const UnassignedStudentList = () => {
  const [students, setStudents] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedStudents = students.filter((s) =>
    selectedRowKeys.includes(s.id)
  );


  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getUnassignedStudents();
      setStudents(data);
    } catch (e) {
      message.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleAssign = async () => {
    try {
      await assignStudents(selectedRowKeys);
      message.success("Students assigned successfully");
      setSelectedRowKeys([]);
      fetchStudents();
    } catch (e) {
      message.error("Assign failed");
    }
  };

  const columns = [
    {
      title: "Student ID",
      dataIndex: "studentId",
      key: "studentId",
    },
    {
      title: "Full Name",
      dataIndex: "fullName",
      key: "fullName",
    },
  ];

  return (
    <Card
      title="Unassigned Students"
      extra={
        <Button
          type="primary"
          disabled={selectedRowKeys.length === 0}
          onClick={() => setConfirmOpen(true)}
        >
          Assign Selected
        </Button>

      }
    >
    <Modal
      open={confirmOpen}
      title="Confirm Assign Students"
      okText="Confirm Assign"
      okButtonProps={{ danger: true }}
      onCancel={() => setConfirmOpen(false)}
      onOk={async () => {
        try {
          await assignStudents(selectedRowKeys);
          message.success("Students assigned successfully");
          setSelectedRowKeys([]);
          setConfirmOpen(false);
          fetchStudents();
        } catch (e) {
          message.error("Assign failed");
        }
      }}
    >
      <p>
        You are about to assign <b>{selectedStudents.length}</b> students:
      </p>

      <Table
        size="small"
        rowKey="id"
        columns={[
          { title: "Student ID", dataIndex: "studentId" },
          { title: "Full Name", dataIndex: "fullName" },
        ]}
        dataSource={selectedStudents}
        pagination={false}
      />
    </Modal>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={students}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{ pageSize: 8 }}
      />
    </Card>
  );
};

export default UnassignedStudentList;
