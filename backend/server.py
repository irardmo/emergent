from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'school_lms')]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    username: str
    role: str  # Admin, Student, Teacher, Registrar, Accounting, HR, CollegeSecretary
    status: str = "active"  # active, inactive
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: str = "Student"
    first_name: str
    last_name: str
    program: Optional[str] = None
    year_level: Optional[int] = None
    department: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Student(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    student_id: str
    first_name: str
    last_name: str
    program: str
    year_level: int
    email: str

class Teacher(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    teacher_id: str
    first_name: str
    last_name: str
    department: str
    email: str

class Subject(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subject_code: str
    subject_name: str
    units: int

class CourseLoad(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    teacher_id: str
    subject_id: str
    section: str
    schedule: str
    semester: str
    school_year: str

class AttendanceRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    load_id: str
    student_id: str
    date: str
    status: str  # Present, Absent, Late
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AttendanceCreate(BaseModel):
    load_id: str
    student_id: str
    date: str
    status: str

class Grade(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    load_id: str
    student_id: str
    grading_period: str  # Prelim, Midterm, Finals
    score: float
    remarks: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GradeCreate(BaseModel):
    load_id: str
    student_id: str
    grading_period: str
    score: float
    remarks: Optional[str] = None

class DocumentRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    student_name: str
    request_type: str  # TOR, COG, GradeChange, SubjectDrop
    status: str = "Pending"  # Pending, Approved, Rejected
    reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class RequestCreate(BaseModel):
    request_type: str
    reason: Optional[str] = None

class Evaluation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    teacher_id: str
    load_id: str
    q1_score: int  # 1-5
    q2_score: int
    q3_score: int
    q4_score: int
    q5_score: int
    comment: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EvaluationCreate(BaseModel):
    teacher_id: str
    load_id: str
    q1_score: int
    q2_score: int
    q3_score: int
    q4_score: int
    q5_score: int
    comment: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def send_sms_notification(phone: str, message: str):
    """Mock SMS notification - placeholder for actual SMS service"""
    logging.info(f"[SMS MOCK] To: {phone}, Message: {message}")
    return True

async def send_email_notification(email: str, subject: str, message: str):
    """Mock email notification - placeholder for actual email service"""
    logging.info(f"[EMAIL MOCK] To: {email}, Subject: {subject}, Message: {message}")
    return True

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "username": user_data.username,
        "password_hash": hash_password(user_data.password),
        "role": user_data.role,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create role-specific profile
    if user_data.role == "Student":
        student_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "student_id": f"STU{str(uuid.uuid4())[:8].upper()}",
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "program": user_data.program or "General",
            "year_level": user_data.year_level or 1,
            "email": user_data.email
        }
        await db.students.insert_one(student_doc)
    elif user_data.role == "Teacher":
        teacher_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "teacher_id": f"TCH{str(uuid.uuid4())[:8].upper()}",
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "department": user_data.department or "General",
            "email": user_data.email
        }
        await db.teachers.insert_one(teacher_doc)
    
    token = create_access_token({"sub": user_id, "role": user_data.role})
    return {"token": token, "user": {"id": user_id, "email": user_data.email, "role": user_data.role}}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "role": user["role"], "username": user["username"]}}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    # Get role-specific profile
    profile = None
    if current_user["role"] == "Student":
        profile = await db.students.find_one({"user_id": current_user["id"]}, {"_id": 0})
    elif current_user["role"] == "Teacher":
        profile = await db.teachers.find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    return {**current_user, "profile": profile}

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    # Enrich with profile data
    for user in users:
        if user["role"] == "Student":
            profile = await db.students.find_one({"user_id": user["id"]}, {"_id": 0})
            user["profile"] = profile
        elif user["role"] == "Teacher":
            profile = await db.teachers.find_one({"user_id": user["id"]}, {"_id": 0})
            user["profile"] = profile
    
    return users

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete associated profiles
    await db.students.delete_one({"user_id": user_id})
    await db.teachers.delete_one({"user_id": user_id})
    
    return {"message": "User deleted successfully"}

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_students = await db.students.count_documents({})
    total_teachers = await db.teachers.count_documents({})
    total_subjects = await db.subjects.count_documents({})
    pending_requests = await db.requests.count_documents({"status": "Pending"})
    
    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_subjects": total_subjects,
        "pending_requests": pending_requests
    }

# ==================== TEACHER ROUTES ====================

@api_router.get("/teacher/courses")
async def get_teacher_courses(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    
    teacher = await db.teachers.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not teacher:
        return []
    
    loads = await db.course_loads.find({"teacher_id": teacher["id"]}, {"_id": 0}).to_list(100)
    
    # Enrich with subject data
    for load in loads:
        subject = await db.subjects.find_one({"id": load["subject_id"]}, {"_id": 0})
        load["subject"] = subject
    
    return loads

@api_router.get("/teacher/students/{load_id}")
async def get_course_students(load_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    
    # Get all students (in real app, filter by enrolled students)
    students = await db.students.find({}, {"_id": 0}).to_list(100)
    return students

@api_router.post("/teacher/attendance")
async def mark_attendance(attendance: AttendanceCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    
    attendance_doc = {
        "id": str(uuid.uuid4()),
        "load_id": attendance.load_id,
        "student_id": attendance.student_id,
        "date": attendance.date,
        "status": attendance.status,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.attendance.insert_one(attendance_doc)
    
    # If absent, send notification (mock)
    if attendance.status == "Absent":
        student = await db.students.find_one({"id": attendance.student_id}, {"_id": 0})
        if student:
            await send_email_notification(
                student["email"],
                "Attendance Alert",
                f"Your child {student['first_name']} {student['last_name']} was marked absent on {attendance.date}"
            )
    
    return attendance_doc

@api_router.post("/teacher/grades")
async def submit_grade(grade: GradeCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    
    grade_doc = {
        "id": str(uuid.uuid4()),
        "load_id": grade.load_id,
        "student_id": grade.student_id,
        "grading_period": grade.grading_period,
        "score": grade.score,
        "remarks": grade.remarks,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.grades.insert_one(grade_doc)
    return grade_doc

@api_router.get("/teacher/stats")
async def get_teacher_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    
    teacher = await db.teachers.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not teacher:
        return {"total_courses": 0, "total_students": 0}
    
    total_courses = await db.course_loads.count_documents({"teacher_id": teacher["id"]})
    total_students = await db.students.count_documents({})
    
    return {
        "total_courses": total_courses,
        "total_students": total_students
    }

# ==================== STUDENT ROUTES ====================

@api_router.get("/student/grades")
async def get_student_grades(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Student":
        raise HTTPException(status_code=403, detail="Student access required")
    
    student = await db.students.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not student:
        return []
    
    grades = await db.grades.find({"student_id": student["id"]}, {"_id": 0}).to_list(100)
    
    # Enrich with subject data
    for grade in grades:
        load = await db.course_loads.find_one({"id": grade["load_id"]}, {"_id": 0})
        if load:
            subject = await db.subjects.find_one({"id": load["subject_id"]}, {"_id": 0})
            grade["subject"] = subject
            grade["section"] = load["section"]
    
    return grades

@api_router.get("/student/requests")
async def get_student_requests(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Student":
        raise HTTPException(status_code=403, detail="Student access required")
    
    requests = await db.requests.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return requests

@api_router.post("/student/requests")
async def create_request(request: RequestCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Student":
        raise HTTPException(status_code=403, detail="Student access required")
    
    student = await db.students.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    request_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "student_name": f"{student['first_name']} {student['last_name']}",
        "request_type": request.request_type,
        "status": "Pending",
        "reason": request.reason,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.requests.insert_one(request_doc)
    return request_doc

@api_router.post("/student/evaluation")
async def submit_evaluation(evaluation: EvaluationCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Student":
        raise HTTPException(status_code=403, detail="Student access required")
    
    student = await db.students.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Check if already evaluated
    existing = await db.evaluations.find_one({
        "student_id": student["id"],
        "teacher_id": evaluation.teacher_id,
        "load_id": evaluation.load_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already evaluated this teacher")
    
    evaluation_doc = {
        "id": str(uuid.uuid4()),
        "student_id": student["id"],
        "teacher_id": evaluation.teacher_id,
        "load_id": evaluation.load_id,
        "q1_score": evaluation.q1_score,
        "q2_score": evaluation.q2_score,
        "q3_score": evaluation.q3_score,
        "q4_score": evaluation.q4_score,
        "q5_score": evaluation.q5_score,
        "comment": evaluation.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.evaluations.insert_one(evaluation_doc)
    return evaluation_doc

@api_router.get("/student/attendance")
async def get_student_attendance(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Student":
        raise HTTPException(status_code=403, detail="Student access required")
    
    student = await db.students.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not student:
        return []
    
    attendance = await db.attendance.find({"student_id": student["id"]}, {"_id": 0}).to_list(100)
    return attendance

# ==================== COMMON ROUTES ====================

@api_router.get("/subjects")
async def get_subjects(current_user: dict = Depends(get_current_user)):
    subjects = await db.subjects.find({}, {"_id": 0}).to_list(100)
    return subjects

@api_router.get("/teachers")
async def get_teachers(current_user: dict = Depends(get_current_user)):
    teachers = await db.teachers.find({}, {"_id": 0}).to_list(100)
    return teachers

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Initialize demo data
@app.on_event("startup")
async def initialize_demo_data():
    # Check if admin exists
    admin = await db.users.find_one({"role": "Admin"})
    if not admin:
        # Create admin user
        admin_id = str(uuid.uuid4())
        admin_doc = {
            "id": admin_id,
            "email": "admin@school.edu",
            "username": "admin",
            "password_hash": hash_password("admin123"),
            "role": "Admin",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
        logger.info("Created admin user: admin@school.edu / admin123")
    
    # Create sample subjects if none exist
    subject_count = await db.subjects.count_documents({})
    if subject_count == 0:
        sample_subjects = [
            {"id": str(uuid.uuid4()), "subject_code": "CS101", "subject_name": "Introduction to Computer Science", "units": 3},
            {"id": str(uuid.uuid4()), "subject_code": "MATH101", "subject_name": "Calculus I", "units": 3},
            {"id": str(uuid.uuid4()), "subject_code": "ENG101", "subject_name": "English Composition", "units": 3},
            {"id": str(uuid.uuid4()), "subject_code": "PHY101", "subject_name": "Physics I", "units": 4},
        ]
        await db.subjects.insert_many(sample_subjects)
        logger.info("Created sample subjects")
