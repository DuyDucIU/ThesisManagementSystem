package iu.duyduc.thesis_management_system.dto.response;

import iu.duyduc.thesis_management_system.entity.StudentStatus;
import iu.duyduc.thesis_management_system.entity.User;
import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class StudentResponse {
    private Long id;
    private String studentId;
    private String fullName;
    private Long lecturerId;
    private String lecturerName;
    private StudentStatus status;
    private String invalidReason = null;
}
