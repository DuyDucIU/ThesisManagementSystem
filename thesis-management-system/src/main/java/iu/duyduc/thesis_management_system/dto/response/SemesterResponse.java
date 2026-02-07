package iu.duyduc.thesis_management_system.dto.response;

import iu.duyduc.thesis_management_system.entity.SemesterStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SemesterResponse {
    private Long id;
    private String code;
    private String name;
    private LocalDate startDate;
    private LocalDate endDate;
    private SemesterStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
