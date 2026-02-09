import { Layout, Button, Space } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { LogoutOutlined } from "@ant-design/icons";
import { getToken, clearAuth, getUser } from "../service/AuthService";

const { Header, Content, Footer } = Layout;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = !!getToken();
  const user = getUser();
  const isLoginPage = location.pathname === "/";

  const handleLogout = () => {
    clearAuth();
    navigate("/");
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          color: "#fff",
          background: "black",
          borderBottom: "1px solid #eee",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0 }}>Thesis Management System</h3>

        {isLoggedIn && !isLoginPage && (
          <Space>
            {user && (
              <span style={{ color: "#fff", marginRight: 8 }}>
                {user.username}
              </span>
            )}
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ color: "#fff" }}
            >
              Logout
            </Button>
          </Space>
        )}
      </Header>

      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>

      <Footer style={{ color: "#fff", background: "black", textAlign: "center" }}>
        © 2026 Thesis Management System
      </Footer>
    </Layout>
  );
};

export default MainLayout;
