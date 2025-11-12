import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toaster, toast } from 'sonner';
import { Users, BookOpen, FileText, BarChart3, Calendar, ClipboardCheck, Award, LogOut, Menu, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => React.useContext(AuthContext);

// Protected Route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Layout Component
const DashboardLayout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const menuItems = {
    Admin: [
      { icon: BarChart3, label: 'Dashboard', path: '/admin' },
      { icon: Users, label: 'Manage Users', path: '/admin/users' },
    ],
    Teacher: [
      { icon: BarChart3, label: 'Dashboard', path: '/teacher' },
      { icon: ClipboardCheck, label: 'Attendance', path: '/teacher/attendance' },
      { icon: Award, label: 'Grades', path: '/teacher/grades' },
    ],
    Student: [
      { icon: BarChart3, label: 'Dashboard', path: '/student' },
      { icon: Award, label: 'My Grades', path: '/student/grades' },
      { icon: FileText, label: 'Requests', path: '/student/requests' },
      { icon: ClipboardCheck, label: 'Evaluation', path: '/student/evaluation' },
    ]
  };

  const currentMenu = menuItems[user?.role] || [];

  return (
    <div className="dashboard-layout">
      <nav className="top-navbar">
        <div className="navbar-content">
          <div className="navbar-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="menu-toggle-btn">
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="brand-title">School LMS</h1>
          </div>
          <div className="navbar-right">
            <span className="user-info" data-testid="user-info-display">
              {user?.username} ({user?.role})
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-btn">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </nav>

      <div className="dashboard-container">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-content">
            {currentMenu.map((item) => (
              <button
                key={item.path}
                className="sidebar-item"
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                data-testid={`sidebar-${item.label.toLowerCase().replace(' ', '-')}-btn`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="main-content">
          <div className="content-header">
            <h2 className="page-title">{title}</h2>
          </div>
          <div className="content-body">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

// Landing Page
const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const roleRoutes = {
        Admin: '/admin',
        Teacher: '/teacher',
        Student: '/student'
      };
      navigate(roleRoutes[user.role] || '/');
    }
  }, [user, navigate]);

  return (
    <div className="landing-page">
      <div className="hero-section">
        <div className="hero-overlay">
          <div className="hero-content">
            <h1 className="hero-title" data-testid="hero-title">School Learning Management System</h1>
            <p className="hero-subtitle">Empowering education through technology</p>
            <div className="hero-actions">
              <Button size="lg" onClick={() => navigate('/login')} data-testid="login-btn-hero">
                Login
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/register')} data-testid="register-btn-hero">
                Register as Student
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="features-section">
        <div className="container">
          <h2 className="section-title">Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <Users size={40} />
              <h3>User Management</h3>
              <p>Comprehensive role-based access for admins, teachers, and students</p>
            </div>
            <div className="feature-card">
              <ClipboardCheck size={40} />
              <h3>Attendance Tracking</h3>
              <p>Real-time attendance with automated parent notifications</p>
            </div>
            <div className="feature-card">
              <Award size={40} />
              <h3>Grade Management</h3>
              <p>Seamless grade entry and student performance tracking</p>
            </div>
            <div className="feature-card">
              <FileText size={40} />
              <h3>Document Requests</h3>
              <p>Easy submission and tracking of academic documents</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Login Page
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      login(response.data.token, response.data.user);
      toast.success('Login successful!');
      
      const roleRoutes = {
        Admin: '/admin',
        Teacher: '/teacher',
        Student: '/student'
      };
      navigate(roleRoutes[response.data.user.role] || '/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <Card className="auth-card">
          <CardHeader>
            <CardTitle data-testid="login-title">Login to School LMS</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email-input"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="login-password-input"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit-btn">
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
            <div className="auth-footer">
              <p>Demo Credentials:</p>
              <p className="demo-creds">Admin: admin@school.edu / admin123</p>
              <p className="mt-2">
                Don't have an account? <a href="/register">Register as Student</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Register Page
const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    program: '',
    year_level: 1
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/register`, {
        ...formData,
        role: 'Student'
      });
      login(response.data.token, response.data.user);
      toast.success('Registration successful!');
      navigate('/student');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <Card className="auth-card register-card">
          <CardHeader>
            <CardTitle data-testid="register-title">Student Registration</CardTitle>
            <CardDescription>Create your student account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="auth-form">
              <div className="form-row">
                <div className="form-group">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    required
                    data-testid="register-firstname-input"
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    required
                    data-testid="register-lastname-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  data-testid="register-email-input"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                  data-testid="register-username-input"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  data-testid="register-password-input"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <Label htmlFor="program">Program</Label>
                  <Input
                    id="program"
                    value={formData.program}
                    onChange={(e) => setFormData({...formData, program: e.target.value})}
                    placeholder="e.g., Computer Science"
                    required
                    data-testid="register-program-input"
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="year_level">Year Level</Label>
                  <Select value={formData.year_level.toString()} onValueChange={(val) => setFormData({...formData, year_level: parseInt(val)})}>
                    <SelectTrigger data-testid="register-yearlevel-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="register-submit-btn">
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </form>
            <div className="auth-footer">
              <p>Already have an account? <a href="/login">Login</a></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Admin Dashboard
const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch stats');
    }
  };

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="stats-grid">
        <Card data-testid="stat-card-students">
          <CardHeader>
            <CardTitle>Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stat-value">{stats?.total_students || 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-card-teachers">
          <CardHeader>
            <CardTitle>Total Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stat-value">{stats?.total_teachers || 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-card-subjects">
          <CardHeader>
            <CardTitle>Total Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stat-value">{stats?.total_subjects || 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-card-requests">
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stat-value">{stats?.pending_requests || 0}</div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

// Admin Users Management
const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`${API}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  return (
    <DashboardLayout title="Manage Users">
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage all system users</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <span className={`status-badge status-${user.status}`}>{user.status}</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                        data-testid={`delete-user-btn-${user.id}`}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

// Teacher Dashboard
const TeacherDashboard = () => {
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const { token } = useAuth();

  useEffect(() => {
    fetchStats();
    fetchCourses();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/teacher/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch stats');
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API}/teacher/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(response.data);
    } catch (error) {
      console.error('Failed to fetch courses');
    }
  };

  return (
    <DashboardLayout title="Teacher Dashboard">
      <div className="stats-grid">
        <Card data-testid="teacher-stat-courses">
          <CardHeader>
            <CardTitle>My Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stat-value">{stats?.total_courses || 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="teacher-stat-students">
          <CardHeader>
            <CardTitle>Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stat-value">{stats?.total_students || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>My Course Loads</CardTitle>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <p className="text-muted">No courses assigned yet. Contact admin to assign courses.</p>
          ) : (
            <div className="course-list">
              {courses.map((load) => (
                <div key={load.id} className="course-item" data-testid={`course-item-${load.id}`}>
                  <h4>{load.subject?.subject_name}</h4>
                  <p>Section: {load.section} | Schedule: {load.schedule}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

// Teacher Attendance
const TeacherAttendance = () => {
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState({});
  const { token } = useAuth();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/teacher/students/demo-load`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Failed to fetch students');
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendanceData(prev => ({...prev, [studentId]: status}));
  };

  const handleSubmit = async () => {
    try {
      const promises = Object.entries(attendanceData).map(([studentId, status]) => 
        axios.post(`${API}/teacher/attendance`, {
          load_id: 'demo-load',
          student_id: studentId,
          date: selectedDate,
          status
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      await Promise.all(promises);
      toast.success('Attendance submitted successfully! Absent notifications sent.');
      setAttendanceData({});
    } catch (error) {
      toast.error('Failed to submit attendance');
    }
  };

  return (
    <DashboardLayout title="Mark Attendance">
      <Card>
        <CardHeader>
          <CardTitle>Student Attendance</CardTitle>
          <CardDescription>Mark attendance for your students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="attendance-header">
            <div className="form-group">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                data-testid="attendance-date-input"
              />
            </div>
          </div>

          <div className="attendance-list">
            {students.map((student) => (
              <div key={student.id} className="attendance-item" data-testid={`attendance-item-${student.id}`}>
                <div className="student-info">
                  <h4>{student.first_name} {student.last_name}</h4>
                  <p>{student.student_id} - {student.program}</p>
                </div>
                <div className="attendance-controls">
                  <Button
                    size="sm"
                    variant={attendanceData[student.id] === 'Present' ? 'default' : 'outline'}
                    onClick={() => handleAttendanceChange(student.id, 'Present')}
                    data-testid={`mark-present-${student.id}`}
                  >
                    Present
                  </Button>
                  <Button
                    size="sm"
                    variant={attendanceData[student.id] === 'Absent' ? 'destructive' : 'outline'}
                    onClick={() => handleAttendanceChange(student.id, 'Absent')}
                    data-testid={`mark-absent-${student.id}`}
                  >
                    Absent
                  </Button>
                  <Button
                    size="sm"
                    variant={attendanceData[student.id] === 'Late' ? 'secondary' : 'outline'}
                    onClick={() => handleAttendanceChange(student.id, 'Late')}
                    data-testid={`mark-late-${student.id}`}
                  >
                    Late
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {Object.keys(attendanceData).length > 0 && (
            <div className="mt-4">
              <Button onClick={handleSubmit} data-testid="submit-attendance-btn">
                Submit Attendance
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

// Teacher Grades
const TeacherGrades = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [gradeData, setGradeData] = useState({
    grading_period: 'Prelim',
    score: '',
    remarks: ''
  });
  const { token } = useAuth();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/teacher/students/demo-load`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Failed to fetch students');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API}/teacher/grades`, {
        load_id: 'demo-load',
        student_id: selectedStudent,
        ...gradeData,
        score: parseFloat(gradeData.score)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Grade submitted successfully!');
      setGradeData({ grading_period: 'Prelim', score: '', remarks: '' });
      setSelectedStudent('');
    } catch (error) {
      toast.error('Failed to submit grade');
    }
  };

  return (
    <DashboardLayout title="Upload Grades">
      <Card>
        <CardHeader>
          <CardTitle>Submit Student Grades</CardTitle>
          <CardDescription>Enter grades for your students</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grades-form">
            <div className="form-group">
              <Label>Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent} required>
                <SelectTrigger data-testid="select-student-dropdown">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} ({student.student_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="form-group">
              <Label>Grading Period</Label>
              <Select value={gradeData.grading_period} onValueChange={(val) => setGradeData({...gradeData, grading_period: val})}>
                <SelectTrigger data-testid="select-period-dropdown">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prelim">Prelim</SelectItem>
                  <SelectItem value="Midterm">Midterm</SelectItem>
                  <SelectItem value="Finals">Finals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="form-group">
              <Label>Score</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={gradeData.score}
                onChange={(e) => setGradeData({...gradeData, score: e.target.value})}
                required
                data-testid="grade-score-input"
              />
            </div>

            <div className="form-group">
              <Label>Remarks (Optional)</Label>
              <Input
                value={gradeData.remarks}
                onChange={(e) => setGradeData({...gradeData, remarks: e.target.value})}
                placeholder="e.g., Excellent performance"
                data-testid="grade-remarks-input"
              />
            </div>

            <Button type="submit" data-testid="submit-grade-btn">Submit Grade</Button>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

// Student Dashboard
const StudentDashboard = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState([]);
  const { token } = useAuth();

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      const response = await axios.get(`${API}/student/grades`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGrades(response.data);
    } catch (error) {
      console.error('Failed to fetch grades');
    }
  };

  return (
    <DashboardLayout title="Student Dashboard">
      <Card data-testid="student-profile-card">
        <CardHeader>
          <CardTitle>Welcome, {user?.profile?.first_name}!</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="profile-info">
            <p><strong>Student ID:</strong> {user?.profile?.student_id}</p>
            <p><strong>Program:</strong> {user?.profile?.program}</p>
            <p><strong>Year Level:</strong> {user?.profile?.year_level}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Grades</CardTitle>
        </CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <p className="text-muted">No grades available yet.</p>
          ) : (
            <div className="grades-preview">
              {grades.slice(0, 5).map((grade) => (
                <div key={grade.id} className="grade-item" data-testid={`grade-preview-${grade.id}`}>
                  <h4>{grade.subject?.subject_name || 'Subject'}</h4>
                  <p>{grade.grading_period}: <strong>{grade.score}</strong></p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

// Student Grades
const StudentGrades = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      const response = await axios.get(`${API}/student/grades`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGrades(response.data);
    } catch (error) {
      toast.error('Failed to fetch grades');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="My Grades">
      <Card>
        <CardHeader>
          <CardTitle>Academic Performance</CardTitle>
          <CardDescription>View all your grades by subject and period</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : grades.length === 0 ? (
            <p className="text-muted">No grades available yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => (
                  <TableRow key={grade.id} data-testid={`grade-row-${grade.id}`}>
                    <TableCell>{grade.subject?.subject_name || 'N/A'}</TableCell>
                    <TableCell>{grade.section || 'N/A'}</TableCell>
                    <TableCell>{grade.grading_period}</TableCell>
                    <TableCell><strong>{grade.score}</strong></TableCell>
                    <TableCell>{grade.remarks || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

// Student Requests
const StudentRequests = () => {
  const [requests, setRequests] = useState([]);
  const [newRequest, setNewRequest] = useState({ request_type: 'TOR', reason: '' });
  const { token } = useAuth();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API}/student/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data);
    } catch (error) {
      toast.error('Failed to fetch requests');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API}/student/requests`, newRequest, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Request submitted successfully!');
      setNewRequest({ request_type: 'TOR', reason: '' });
      fetchRequests();
    } catch (error) {
      toast.error('Failed to submit request');
    }
  };

  return (
    <DashboardLayout title="Document Requests">
      <div className="requests-container">
        <Card>
          <CardHeader>
            <CardTitle>Submit New Request</CardTitle>
            <CardDescription>Request academic documents</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="request-form">
              <div className="form-group">
                <Label>Request Type</Label>
                <Select value={newRequest.request_type} onValueChange={(val) => setNewRequest({...newRequest, request_type: val})}>
                  <SelectTrigger data-testid="request-type-dropdown">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOR">Transcript of Records (TOR)</SelectItem>
                    <SelectItem value="COG">Certificate of Grades (COG)</SelectItem>
                    <SelectItem value="GradeChange">Grade Change Request</SelectItem>
                    <SelectItem value="SubjectDrop">Subject Drop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="form-group">
                <Label>Reason</Label>
                <Input
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                  placeholder="Explain your request"
                  data-testid="request-reason-input"
                />
              </div>

              <Button type="submit" data-testid="submit-request-btn">Submit Request</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-muted">No requests submitted yet.</p>
            ) : (
              <div className="requests-list">
                {requests.map((req) => (
                  <div key={req.id} className="request-item" data-testid={`request-item-${req.id}`}>
                    <h4>{req.request_type}</h4>
                    <p>{req.reason}</p>
                    <span className={`status-badge status-${req.status.toLowerCase()}`}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

// Student Evaluation
const StudentEvaluation = () => {
  const [teachers, setTeachers] = useState([]);
  const [evaluation, setEvaluation] = useState({
    teacher_id: '',
    load_id: 'demo-load',
    q1_score: 5,
    q2_score: 5,
    q3_score: 5,
    q4_score: 5,
    q5_score: 5,
    comment: ''
  });
  const { token } = useAuth();

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${API}/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(response.data);
    } catch (error) {
      console.error('Failed to fetch teachers');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API}/student/evaluation`, evaluation, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Evaluation submitted successfully!');
      setEvaluation({
        teacher_id: '',
        load_id: 'demo-load',
        q1_score: 5,
        q2_score: 5,
        q3_score: 5,
        q4_score: 5,
        q5_score: 5,
        comment: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit evaluation');
    }
  };

  const questions = [
    { key: 'q1_score', label: 'Teaching effectiveness' },
    { key: 'q2_score', label: 'Course content knowledge' },
    { key: 'q3_score', label: 'Communication skills' },
    { key: 'q4_score', label: 'Availability and responsiveness' },
    { key: 'q5_score', label: 'Overall rating' }
  ];

  return (
    <DashboardLayout title="Teacher Evaluation">
      <Card>
        <CardHeader>
          <CardTitle>Evaluate Your Teacher</CardTitle>
          <CardDescription>Rate your teacher's performance (1-5 scale)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="evaluation-form">
            <div className="form-group">
              <Label>Select Teacher</Label>
              <Select value={evaluation.teacher_id} onValueChange={(val) => setEvaluation({...evaluation, teacher_id: val})} required>
                <SelectTrigger data-testid="select-teacher-dropdown">
                  <SelectValue placeholder="Choose a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name} ({teacher.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="evaluation-questions">
              {questions.map((q) => (
                <div key={q.key} className="question-group">
                  <Label>{q.label}</Label>
                  <div className="rating-scale">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        className={`rating-btn ${evaluation[q.key] === score ? 'active' : ''}`}
                        onClick={() => setEvaluation({...evaluation, [q.key]: score})}
                        data-testid={`${q.key}-score-${score}`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="form-group">
              <Label>Additional Comments</Label>
              <Input
                value={evaluation.comment}
                onChange={(e) => setEvaluation({...evaluation, comment: e.target.value})}
                placeholder="Optional feedback"
                data-testid="evaluation-comment-input"
              />
            </div>

            <Button type="submit" data-testid="submit-evaluation-btn">Submit Evaluation</Button>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

// Main App
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminUsers />
            </ProtectedRoute>
          } />
          
          {/* Teacher Routes */}
          <Route path="/teacher" element={
            <ProtectedRoute allowedRoles={['Teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          } />
          <Route path="/teacher/attendance" element={
            <ProtectedRoute allowedRoles={['Teacher']}>
              <TeacherAttendance />
            </ProtectedRoute>
          } />
          <Route path="/teacher/grades" element={
            <ProtectedRoute allowedRoles={['Teacher']}>
              <TeacherGrades />
            </ProtectedRoute>
          } />
          
          {/* Student Routes */}
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['Student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/grades" element={
            <ProtectedRoute allowedRoles={['Student']}>
              <StudentGrades />
            </ProtectedRoute>
          } />
          <Route path="/student/requests" element={
            <ProtectedRoute allowedRoles={['Student']}>
              <StudentRequests />
            </ProtectedRoute>
          } />
          <Route path="/student/evaluation" element={
            <ProtectedRoute allowedRoles={['Student']}>
              <StudentEvaluation />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
