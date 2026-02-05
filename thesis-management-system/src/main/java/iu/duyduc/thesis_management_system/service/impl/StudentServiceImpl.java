package iu.duyduc.thesis_management_system.service.impl;

import iu.duyduc.thesis_management_system.dto.request.AssignStudentRequest;
import iu.duyduc.thesis_management_system.dto.request.StudentRequest;
import iu.duyduc.thesis_management_system.dto.response.StudentImportItemResponse;
import iu.duyduc.thesis_management_system.dto.response.StudentImportResponse;
import iu.duyduc.thesis_management_system.dto.response.StudentResponse;
import iu.duyduc.thesis_management_system.entity.Student;
import iu.duyduc.thesis_management_system.entity.StudentStatus;
import iu.duyduc.thesis_management_system.entity.User;
import iu.duyduc.thesis_management_system.exception.ApiException;
import iu.duyduc.thesis_management_system.exception.ResourceNotFoundException;
import iu.duyduc.thesis_management_system.mapper.StudentMapper;
import iu.duyduc.thesis_management_system.repository.StudentRepo;
import iu.duyduc.thesis_management_system.repository.UserRepo;
import iu.duyduc.thesis_management_system.service.StudentService;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;

@AllArgsConstructor
@Service
public class StudentServiceImpl implements StudentService {
    private final StudentRepo studentRepo;
    private final StudentMapper studentMapper;
    private final UserRepo userRepo;

    @Transactional
    @Override
    public StudentImportResponse importStudentFromFile(InputStream file) throws IOException {

        List<StudentImportItemResponse> result = new ArrayList<>();
        Set<String> newStudentsInFile = new HashSet<>();
        Set<String> existedStudents = studentRepo.findAllStudentIds();

        int valid = 0;
        int invalid = 0;

        Workbook workbook = WorkbookFactory.create(file);
        Sheet sheet = workbook.getSheetAt(0);

        DataFormatter formatter = new DataFormatter();
        FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator();

        for (Row row : sheet) {
            if (row.getRowNum() == 0) continue;

            String studentId = formatter.formatCellValue(
                    row.getCell(0, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL),
                    evaluator
            ).trim().toUpperCase();

            String fullName = formatter.formatCellValue(
                    row.getCell(1, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL),
                    evaluator
            ).trim();

            StudentImportItemResponse item = new StudentImportItemResponse();
            item.setStudentId(studentId);
            item.setFullName(fullName);

            StudentStatus status = StudentStatus.VALID;
            String reason = null;

            // ===== VALIDATION =====
            if (studentId.isEmpty()) {
                status = StudentStatus.INVALID;
                reason = "Student ID is empty";
            }
            else if (fullName.isEmpty()) {
                status = StudentStatus.INVALID;
                reason = "Full name is empty";
            }
            else if (newStudentsInFile.contains(studentId)) {
                status = StudentStatus.INVALID;
                reason = "Duplicate in file";
            }
            else if (existedStudents.contains(studentId)) {
                status = StudentStatus.INVALID;
                reason = "Already exists in DB";
            }

            Student student = Student.builder()
                    .studentId(studentId)
                    .fullName(fullName)
                    .status(status)
                    .invalidReason(reason)
                    .build();

            studentRepo.save(student);

            if (status == StudentStatus.INVALID) {
                invalid++;
                item.setStatus(status);
                item.setMessage(reason);
            } else {
                valid++;
                item.setStatus(status);
                item.setMessage("Imported");
                newStudentsInFile.add(studentId);
                existedStudents.add(studentId);
            }

            result.add(item);
        }

        return new StudentImportResponse(
                result.size(),
                valid,
                invalid,
                result
        );
    }

    @Override
    public List<StudentResponse> getAllStudents() {
        List<Student> studentList = studentRepo.findAll();

        List<StudentResponse> responseList = new ArrayList<>();

        for (Student student : studentList) {
            String managedByName = null;
            if (student.getManagedBy() != null) {
                managedByName = student.getManagedBy().getFullName();
            }
            StudentResponse response = StudentResponse.builder()
                    .id(student.getId())
                    .studentId(student.getStudentId())
                    .fullName(student.getFullName())
                    .lecturerName(managedByName)
                    .build();

            responseList.add(response);
        }

        return responseList;
    }

    @Override
    public List<StudentResponse> getAllUnassignedStudents() {
        List<Student> studentList = studentRepo.findByManagedByIsNull();
        return studentMapper.toResponseList(studentList);
    }

    @Transactional
    @Override
    public String assignStudent(AssignStudentRequest requests, Long lecturerId) {
        User lecturer = userRepo.findById(lecturerId)
                .orElseThrow();

        List<Long> studentIdList = requests.getId();

        List<Student> lecturerStudents = lecturer.getStudent();

        for(Long id : studentIdList) {
            Student student = studentRepo.findById(id)
                    .orElseThrow();
            lecturerStudents.add(student);
            student.setManagedBy(lecturer);
            studentRepo.save(student);
        }
        lecturer.setStudent(lecturerStudents);

        return "Assigned students successfully!";
    }

    @Transactional
    @Override
    public StudentResponse createStudent(StudentRequest request) {
        if (studentRepo.existsByStudentId(request.getStudentId()))
            throw new ApiException("Student already existed");

        Student student = Student.builder()
                .studentId(request.getStudentId())
                .fullName(request.getFullName())
                .status(StudentStatus.VALID)
                .build();

        Student savedStudent = studentRepo.save(student);
        return studentMapper.toStudentResponse(savedStudent);
    }

    @Transactional
    @Override
    public StudentResponse updateStudent(Long id, StudentRequest request) {
        Student student = studentRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student ID not found: " + id));

        if (request.getStudentId() != null) {
            if (studentRepo.existsByStudentId(request.getStudentId())) {
                throw new ApiException("StudentId already exists");
            }
            student.setStudentId(request.getStudentId());
        }

        if (request.getFullName() != null && !request.getFullName().isBlank())
            student.setFullName(request.getFullName());

        if (request.getLecturerId() != null) {
            User lecturer = userRepo.findById(request.getLecturerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lecturer not found: " + request.getLecturerId()));
            student.setManagedBy(lecturer);
        }

        studentRepo.save(student);

        String lecturerName = Optional.ofNullable(student.getManagedBy())
                .map(User::getFullName)
                .orElse(null);

        StudentResponse response = StudentResponse.builder()
                .id(student.getId())
                .studentId(student.getStudentId())
                .fullName(student.getFullName())
                .lecturerName(lecturerName)
                .build();

        return response;
    }

    @Transactional
    @Override
    public void deleteStudent(Long id) {
        Student student = studentRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student id not found: " + id));

        studentRepo.delete(student);
    }

}
