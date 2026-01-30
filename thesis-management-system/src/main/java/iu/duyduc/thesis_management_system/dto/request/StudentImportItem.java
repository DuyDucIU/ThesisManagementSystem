package iu.duyduc.thesis_management_system.dto.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentImportItem {
    private String studentId;
    private String fullName;
    private String status;
}
