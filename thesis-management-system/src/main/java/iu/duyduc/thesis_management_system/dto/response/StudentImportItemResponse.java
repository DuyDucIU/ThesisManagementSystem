package iu.duyduc.thesis_management_system.dto.response;

import iu.duyduc.thesis_management_system.entity.StudentStatus;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentImportItemResponse {
    private String studentId;
    private String fullName;
    private StudentStatus status;
    private String message;
}
