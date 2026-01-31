package iu.duyduc.thesis_management_system.dto.response;

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
}
