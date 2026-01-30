package iu.duyduc.thesis_management_system.service.impl;

import iu.duyduc.thesis_management_system.dto.response.StudentFileResponse;
import iu.duyduc.thesis_management_system.dto.response.StudentPreviewResponse;
import iu.duyduc.thesis_management_system.repository.StudentRepo;
import iu.duyduc.thesis_management_system.service.StudentService;
import lombok.AllArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@AllArgsConstructor
@Service
public class StudentServiceImpl implements StudentService {
    private final StudentRepo studentRepo;

    @Override
    public List<StudentFileResponse> parseStudentFromFile(InputStream file) throws IOException {
        List<StudentFileResponse> studentList = new ArrayList<>();

        Workbook workbook = WorkbookFactory.create(file);
        Sheet sheet = workbook.getSheetAt(0);

        DataFormatter formatter = new DataFormatter();

        FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator();

        sheet.forEach(row -> {
            if (row.getRowNum() == 0) return; // skip header

            Cell idCell = row.getCell(0, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
            Cell nameCell = row.getCell(1, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);

            String studentId = formatter.formatCellValue(idCell, evaluator).trim();
            String fullName = formatter.formatCellValue(nameCell, evaluator).trim();

            // skip empty row
            if (studentId.isEmpty() && fullName.isEmpty()) return;

            StudentFileResponse student = new StudentFileResponse();
            student.setStudentId(studentId);
            student.setFullName(fullName);

            studentList.add(student);
        });

        return studentList;
    }

    @Override
    public StudentPreviewResponse validateStudentList(List<StudentFileResponse> studentList) {
        Set<String> newStudents = new HashSet<>();
        Set<String> existedStudents = studentRepo.findAllStudentIds();

        int valid = 0;
        int invalid = 0;

        for (StudentFileResponse response : studentList) {
            if (response.getStudentId().toUpperCase().isEmpty()) {
                markInvalid(response, "Student ID is empty");
            } else if (newStudents.contains(response.getStudentId().toUpperCase())) {
                markInvalid(response, "Duplicate in file");
            } else if (existedStudents.contains(response.getStudentId().toUpperCase())) {
                markInvalid(response, "Already exists in DB");
            } else if (response.getFullName().isEmpty()) {
                markInvalid(response, "Full name is empty");
            } else {
                response.setStatus("VALID");
                valid++;
                newStudents.add(response.getStudentId());
            }
            if ("INVALID".equals(response.getStatus())) invalid++;
        }

        return new StudentPreviewResponse(studentList.size(), valid, invalid, studentList);
    }

    private void markInvalid(StudentFileResponse response, String error) {
        response.setStatus("INVALID");
        response.setError(error);
    }
}
