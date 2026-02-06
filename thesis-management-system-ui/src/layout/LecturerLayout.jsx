import { Layout } from "antd";
import { Outlet } from "react-router-dom";

const { Header, Content, Footer } = Layout;

const LecturerLayout = () => {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Header */}
      <Header
        style={{
          background: "#fff",
          borderBottom: "1px solid #eee",
          fontWeight: 600,
        }}
      >
        Lecturer Portal
      </Header>

      {/* Content */}
      <Content style={{ padding: "24px", background: "#f5f7fa" }}>
        <Outlet />
      </Content>

      {/* Footer */}
      <Footer style={{ textAlign: "center" }}>
        Thesis Management System ©2026
      </Footer>
    </Layout>
  );
};

export default LecturerLayout;
