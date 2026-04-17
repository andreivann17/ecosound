import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Button, notification, Input, Form, DatePicker, Select, Row, Col } from 'antd';
import { MailOutlined, UserOutlined, LockOutlined, IdcardOutlined, CalendarOutlined, TeamOutlined } from '@ant-design/icons';
import logo from "../../assets/img/logo.png";
import ModalOlvidar from "../../components/modals/modalOlvidarPassword";
import { actionSignUp } from "../../redux/actions/login/login";
import "../../assets/css/loginVoyager.css";

const { Option } = Select;

function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [show, setShow] = useState(false);
  const [form] = Form.useForm();

  const openNotification = (msg) => {
    notification.error({ message: "Error", description: msg });
  };

  const checkFields = async () => {
    try {
      await form.validateFields();
      return true;
    } catch {
openNotification("Please complete all fields correctly.");
      return false;
    }
  };

  const callback = () => navigate("/retina");
  const callbackError = (msg) => openNotification(msg);

  const acceptButtonHandler = async () => {
    const valid = await checkFields();
    if (!valid) return;
      const values = form.getFieldsValue();

  // ✅ Forzar formato YYYY-MM-DD para birth_date
  if (values.birth_date) {
    values.birth_date = values.birth_date.format("YYYY-MM-DD");
  }
    dispatch(actionSignUp(values, callback, callbackError));
  };

  return (
    <>
    <style>
      {`
      .login-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f8f9fa;
  overflow-y: auto;
}

      `}
    </style>
     <div className="login-wrapper fade-in">
      <div className="login-container">
        <div className="login-left">
          <div className="text-center">
            <img src={logo} alt="UABC logo" style={{ width: 120, marginBottom: 12 }} />
      <h2 className="login-title">User Registration</h2>
<p className="login-subtitle">Retina Analysis System - UABC</p>

          </div>

          <div className="login-form">
           <Form form={form} layout="vertical" name="register" onFinish={acceptButtonHandler}>
  <Row gutter={16}>
    <Col span={12}>
      <Form.Item name="first_name" label="First Name(s)" rules={[{ required: true, message: 'Enter your first name.' }]}>
        <Input prefix={<UserOutlined />} placeholder="John" />
      </Form.Item>
    </Col>
    <Col span={12}>
      <Form.Item name="last_name" label="Last Name(s)" rules={[{ required: true, message: 'Enter your last name.' }]}>
        <Input prefix={<UserOutlined />} placeholder="Doe" />
      </Form.Item>
    </Col>
  </Row>

  <Row gutter={16}>
    <Col span={12}>
      <Form.Item name="gender" label="Gender" rules={[{ required: true, message: 'Select your gender.' }]}>
        <Select placeholder="Select your gender">
          <Option value="male">Male</Option>
          <Option value="female">Female</Option>
          <Option value="other">Other</Option>
        </Select>
      </Form.Item>
    </Col>
    <Col span={12}>
      <Form.Item name="birth_date" label="Birth Date" rules={[{ required: true, message: 'Select your birth date.' }]}>
        <DatePicker style={{ width: '100%' }} placeholder="Select a date" format="YYYY-MM-DD" suffixIcon={<CalendarOutlined />} />
      </Form.Item>
    </Col>
  </Row>

  <Row gutter={16}>
    <Col span={12}>
      <Form.Item name="occupation" label="Occupation" rules={[{ required: true, message: 'Enter your occupation.' }]}>
        <Input prefix={<IdcardOutlined />} placeholder="Doctor, student, etc." />
      </Form.Item>
    </Col>
    <Col span={12}>
      <Form.Item name="institution" label="Institution" rules={[{ required: true, message: 'Enter your institution.' }]}>
        <Input prefix={<TeamOutlined />} placeholder="University, hospital, etc." />
      </Form.Item>
    </Col>
  </Row>

  <Form.Item name="email" label="Email" rules={[
    { type: 'email', message: 'Invalid email.' },
    { required: true, message: 'Enter your email.' }
  ]}>
    <Input prefix={<MailOutlined />} placeholder="user@example.com" />
  </Form.Item>

  <Row gutter={16}>
    <Col span={12}>
      <Form.Item
        name="password"
        label="Password"
        hasFeedback
        rules={[
          { required: true, message: 'Enter a password.' },
          { pattern: /^(?=.*\d).{8,}$/, message: 'Minimum 8 characters, at least one number.' }
        ]}
      >
        <Input.Password prefix={<LockOutlined />} />
      </Form.Item>
    </Col>
    <Col span={12}>
      <Form.Item
        name="password_confirm"
        label="Confirm Password"
        dependencies={["password"]}
        hasFeedback
        rules={[
          { required: true, message: 'Confirm your password.' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("password") === value) return Promise.resolve();
              return Promise.reject(new Error("Passwords do not match."));
            }
          })
        ]}
      >
        <Input.Password prefix={<LockOutlined />} />
      </Form.Item>
    </Col>
  </Row>

  <Form.Item>
    <Button type="primary" block className="custom-button mt-3" onClick={acceptButtonHandler}>Create Account</Button>
  </Form.Item>
  <Form.Item>
    <Button type="default" block onClick={() => navigate("/")}>Back to Home</Button>
  </Form.Item>
</Form>

          </div>

          <footer className="login-footer">
            © 2025 Universidad Autónoma de Baja California
          </footer>
        </div>

        <div className="login-right" role="presentation" />
      </div>

      <ModalOlvidar show={show} setShow={setShow} />
    </div>
    </>
   
  );
}

export default Home;
