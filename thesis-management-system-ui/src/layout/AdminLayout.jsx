import { Layout, Menu } from "antd";
import {
  UserOutlined,
  UploadOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

const { Sider, Content } = Layout;

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout>
        <Sider width={220}
            style={{
            background: "#f9fafb",
            borderRight: "1px solid #e5e7eb",
        }}>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={[
            {
              key: "/admin/semesters",
              icon: <CalendarOutlined />,
              label: "View Semesters",
            },
            {
              key: "/admin/students",
              icon: <UserOutlined />,
              label: "View Students",
            },
            {
              key: "/admin/import",
              icon: <UploadOutlined />,
              label: "Import Students",
            },
          ]}
        />
      </Sider>

      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default AdminLayout;
