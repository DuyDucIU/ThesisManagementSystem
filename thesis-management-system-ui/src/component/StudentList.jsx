import { useEffect, useState } from "react";
import { Table, Button, Input, Space, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined, EditOutlined } from "@ant-design/icons";
import { getAllStudents } from "../service/StudentService";
import EditStudentModal from "./EditStudentModal";

const { Title } = Typography;

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getAllStudents();
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

  const filteredStudents = students.filter(
    (s) =>
      s.studentId.toLowerCase().includes(search.toLowerCase()) ||
      s.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: "#",
      render: (_, __, index) => index + 1,
      width: 60,
    },
    {
      title: "Student ID",
      dataIndex: "studentId",
      render: (text) => <b>{text}</b>,
    },
    {
      title: "Full Name",
      dataIndex: "fullName",
    },
    {
      title: "Managed By",
      dataIndex: "lecturerName",
      render: (text) => text || "-",
    },
    {
      title: "",
      width: 60,
      render: (_, record) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={() => {
            setSelectedStudent(record);
            setShowModal(true);
          }}
        />
      ),
    },
  ];

  return (
    <>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        {/* Header */}
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>
            Student List
          </Title>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedStudent(null);
                setShowModal(true);
              }}
            >
              Add Student
            </Button>
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={fetchStudents}
            >
              Refresh
            </Button>
          </Space>
        </Space>

        {/* Search */}
        <Input.Search
          placeholder="Search by student ID or full name"
          allowClear
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />

        {/* Table */}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredStudents}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Space>

      {/* Modal */}
      {showModal && (
        <EditStudentModal
          open={showModal}
          student={selectedStudent}
          onCancel={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchStudents();
          }}
        />
      )}
    </>
  );
};

export default StudentList;
