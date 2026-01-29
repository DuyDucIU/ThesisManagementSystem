package iu.duyduc.thesis_management_system.service.impl;

import iu.duyduc.thesis_management_system.entity.Student;
import iu.duyduc.thesis_management_system.repository.StudentRepo;
import iu.duyduc.thesis_management_system.service.StudentService;
import lombok.AllArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@AllArgsConstructor
@Service
public class StudentServiceImpl implements StudentService {
    private final StudentRepo studentRepo;

    @Override
    public void saveStudentsFromFile(InputStream file) throws IOException {
        List<Student> studentList = new ArrayList<>();

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
            if (studentId.isEmpty() && fullName.isEmpty()) {
                return;
            }

            // validate
            if (studentId.isEmpty() || fullName.isEmpty()) {
                throw new RuntimeException("Row " + row.getRowNum() + " is missing data");
            }

            Student student = new Student();
            student.setStudentId(studentId);
            student.setFullName(fullName);

            studentList.add(student);
        });

        studentRepo.saveAll(studentList);
    }
}
