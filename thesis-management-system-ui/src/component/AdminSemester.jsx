import { useEffect, useState } from "react";
import { Table, Button, Input, Space, Typography, message, Tag, Tooltip, Dropdown } from "antd";
import { PlusOutlined, ReloadOutlined, EditOutlined, MoreOutlined } from "@ant-design/icons";
import {
  getAllSemesters,
  updateSemesterStatus
} from "../service/SemesterService";
import SemesterForm from "./SemesterForm";
import "../styles/AdminSemester.css";

const { Title } = Typography;

const AdminSemester = () => {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchSemesters = async () => {
    setLoading(true);
    try {
      const data = await getAllSemesters();
      setSemesters(Array.isArray(data) ? data : []);
    } catch (e) {
      message.error("Failed to load semesters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  const filteredSemesters = semesters.filter(
    (s) =>
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleStatusChange = async (id, status) => {
    try {
      await updateSemesterStatus(id, status);
      message.success("Status updated");
      fetchSemesters();
    } catch (e) {
      message.error("Failed to update status");
    }
  };

  const getStatusMenu = (record) => ({
    items: [
      {
        key: "UPCOMING",
        label: "Set Upcoming",
        onClick: () => handleStatusChange(record.id, "UPCOMING"),
      },
      {
        key: "ACTIVE",
        label: "Set Active",
        onClick: () => handleStatusChange(record.id, "ACTIVE"),
      },
      {
        key: "CLOSED",
        label: "Set Closed",
        onClick: () => handleStatusChange(record.id, "CLOSED"),
      },
    ],
  });

  const columns = [
    {
      title: "#",
      render: (_, __, index) => index + 1,
      width: 60,
    },
    {
      title: "Code",
      dataIndex: "code",
      render: (text) => <b>{text}</b>,
    },
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
    },
    {
      title: "End Date",
      dataIndex: "endDate",
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (status) => {
        const color =
          status === "ACTIVE"
            ? "green"
            : status === "UPCOMING"
              ? "blue"
              : "red";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "",
      width: 80,
      className: "action-column",
      render: (_, record) => (
        <Space size="small">
          <Dropdown menu={getStatusMenu(record)}>
            <Tooltip title="Change Status">
              <Button
                className="action-btn"
                type="text"
                icon={<MoreOutlined />}
              />
            </Tooltip>
          </Dropdown>
          <Button
            className="edit-btn"
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedSemester(record);
              setShowModal(true);
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="semester-list">
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {/* Header */}
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>
            Semester List
          </Title>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedSemester(null);
                setShowModal(true);
              }}
            >
              Add Semester
            </Button>
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={fetchSemesters}
            >
              Refresh
            </Button>
          </Space>
        </Space>

        {/* Search */}
        <Input.Search
          placeholder="Search by code or name"
          allowClear
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />

        {/* Table */}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredSemesters}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Space>

      {/* Modal */}
      {showModal && (
        <SemesterForm
          open={showModal}
          semester={selectedSemester}
          onCancel={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchSemesters();
          }}
        />
      )}
    </div>
  );
};

export default AdminSemester;