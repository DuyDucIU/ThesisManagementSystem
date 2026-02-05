package iu.duyduc.thesis_management_system.service;

import iu.duyduc.thesis_management_system.dto.request.AssignStudentRequest;
import iu.duyduc.thesis_management_system.dto.request.StudentRequest;
import iu.duyduc.thesis_management_system.dto.response.StudentImportResponse;
import iu.duyduc.thesis_management_system.dto.response.StudentResponse;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

public interface StudentService {
    StudentImportResponse importStudentFromFile(InputStream file) throws IOException;
//    List<StudentFileResponse> parseStudentFromFile(InputStream file) throws IOException;
//    StudentPreviewResponse validateStudentList(List<StudentFileResponse> studentList);
//    StudentImportResponse importStudent(List<StudentImportItem> studentImportItemList);
    List<StudentResponse> getAllStudents();
    List<StudentResponse> getAllUnassignedStudents();
    String assignStudent(AssignStudentRequest requests, Long lecturerId);
    StudentResponse createStudent(StudentRequest request);
    StudentResponse updateStudent(String studentId, StudentRequest request);
    void deleteStudent(String studentId);
}
