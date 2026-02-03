package iu.duyduc.thesis_management_system.dto.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentImportRequest {
    private String studentId;
    private String fullName;
    private String status;
}
