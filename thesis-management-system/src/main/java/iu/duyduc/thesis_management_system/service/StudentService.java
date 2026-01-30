package iu.duyduc.thesis_management_system.service;

import iu.duyduc.thesis_management_system.dto.response.StudentFileResponse;
import iu.duyduc.thesis_management_system.dto.response.StudentPreviewResponse;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

public interface StudentService {
    List<StudentFileResponse> parseStudentFromFile(InputStream file) throws IOException;
    StudentPreviewResponse validateStudentList(List<StudentFileResponse> studentList);
}
