import { useEffect, useState } from "react";
import { Table, Button, Card, message } from "antd";
import {
  getUnassignedStudents,
  assignStudents,
} from "../service/StudentService";

const UnassignedStudentList = () => {
  const [students, setStudents] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [loading, setLoading] = useState(false);

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
          onClick={handleAssign}
        >
          Assign Selected
        </Button>
      }
    >
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
