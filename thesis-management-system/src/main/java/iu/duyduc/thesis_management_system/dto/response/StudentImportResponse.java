package iu.duyduc.thesis_management_system.dto.response;

import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class StudentImportResponse {
    private int imported;
    private int skipped;
}
