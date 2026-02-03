package iu.duyduc.thesis_management_system.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class StudentImportResponse {
    private int total;
    private int valid;
    private int invalid;
    private List<StudentImportItemResponse> students;
}
