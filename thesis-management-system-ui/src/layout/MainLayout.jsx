import { Layout } from "antd";
import { Outlet } from "react-router-dom";

const { Header, Content, Footer } = Layout;

const MainLayout = () => {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{color: "#fff" ,background: "black", borderBottom: "1px solid #eee" }}>
        <h3 style={{ margin: 0 }}>Thesis Management System</h3>
      </Header>

      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>

      <Footer style={{color: "#fff" ,background: "black", textAlign: "center" }}>
        © 2026 Thesis Management System
      </Footer>
    </Layout>
  );
};

export default MainLayout;
