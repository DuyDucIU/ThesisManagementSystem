import { useState } from "react";
import { importStudents } from "../service/StudentService";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Upload,
  Button,
  Alert,
  Table,
  Tag,
  Typography,
  Space,
} from "antd";
import {
  UploadOutlined,
  InboxOutlined,
  EyeOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

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
      setMessage("Please select an Excel file");
      return;
    }

    setLoading(true);
    setMessage("");
    setResultData(null);

    try {
      const data = await importStudents(file);
      setResultData(data);

      setMessage(
        `Import completed! Total: ${data.total} | Valid: ${data.valid} | Invalid: ${data.invalid}`
      );
    } catch (err) {
      console.error(err);
      setMessage("Failed to import file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // Table config
  // ======================
  const columns = [
    {
      title: "Student ID",
      dataIndex: "studentId",
      render: (v) => v || "-",
    },
    {
      title: "Full Name",
      dataIndex: "fullName",
      render: (v) => v || "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status) =>
        status === "INVALID" ? (
          <Tag color="red">INVALID</Tag>
        ) : (
          <Tag color="green">VALID</Tag>
        ),
    },
    {
      title: "Message",
      dataIndex: "message",
      render: (v) => v || "-",
    },
  ];

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "24px",
      }}
    >
      <Card variant={false} style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
        <Title level={3} style={{ color: "#1677ff" }}>
          Import Students (Excel)
        </Title>

        {/* Upload */}
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Upload.Dragger
            accept=".xlsx,.xls"
            maxCount={1}
            beforeUpload={(file) => {
              setFile(file);
              return false; // prevent auto upload
            }}
            disabled={loading}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Click or drag Excel file to this area
            </p>
            <p className="ant-upload-hint">
              Only .xls / .xlsx files are supported
            </p>
          </Upload.Dragger>

          <Button
            type="primary"
            size="large"
            icon={<UploadOutlined />}
            loading={loading}
            onClick={handleImport}
          >
            Import
          </Button>
        </Space>

        {/* Message */}
        {message && (
          <Alert
            type={resultData ? "success" : "error"}
            message={message}
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        {resultData && resultData.valid === 0 && (
          <Alert
            type="error"
            showIcon
            message="All records are invalid"
            description="Please review and fix them in Students Management."
            style={{ marginTop: 16 }}
          />
        )}

        {/* View students */}
        {resultData && (
          <Button
            icon={<EyeOutlined />}
            style={{ marginTop: 16 }}
            onClick={() => navigate("/admin/students")}
          >
            View All Students
          </Button>
        )}

        {/* Result table */}
        {resultData && (
          <>
            <div style={{ marginTop: 24, marginBottom: 8 }}>
              <Text strong>
                Imported Records — Total: {resultData.total} | Valid:{" "}
                <Text type="success">{resultData.valid}</Text> | Invalid:{" "}
                <Text type="danger">{resultData.invalid}</Text>
              </Text>
            </div>

            <Table
              rowKey={(r, idx) => idx}
              columns={columns}
              dataSource={resultData.students || []}
              pagination={{ pageSize: 10 }}
              bordered
            />
          </>
        )}
      </Card>
    </div>
  );
}

export default AdminImportStudentsComponent;
