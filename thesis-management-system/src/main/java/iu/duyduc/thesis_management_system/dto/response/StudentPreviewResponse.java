package iu.duyduc.thesis_management_system.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentPreviewResponse {
    private int total;
    private int valid;
    private int invalid;
    private List<StudentFileResponse> students;
}
