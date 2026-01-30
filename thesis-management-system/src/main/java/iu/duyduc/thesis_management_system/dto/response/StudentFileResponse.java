package iu.duyduc.thesis_management_system.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentFileResponse {
    private String studentId;
    private String fullName;
    private String status; // VALID | INVALID
    private String error;
}
