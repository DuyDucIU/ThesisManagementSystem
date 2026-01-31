package iu.duyduc.thesis_management_system.service;

import iu.duyduc.thesis_management_system.dto.request.StudentImportItem;
import iu.duyduc.thesis_management_system.dto.response.StudentImportResponse;
import iu.duyduc.thesis_management_system.dto.response.StudentFileResponse;
import iu.duyduc.thesis_management_system.dto.response.StudentPreviewResponse;
import iu.duyduc.thesis_management_system.dto.response.StudentResponse;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

public interface StudentService {
    List<StudentFileResponse> parseStudentFromFile(InputStream file) throws IOException;
    StudentPreviewResponse validateStudentList(List<StudentFileResponse> studentList);
    StudentImportResponse importStudent(List<StudentImportItem> studentImportItemList);
    List<StudentResponse> getAllStudents();
}
