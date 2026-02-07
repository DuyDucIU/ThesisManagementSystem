package iu.duyduc.thesis_management_system.dto.request;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SemesterRequest {
    private String code;
    private String name;
    private LocalDate startDate;
    private LocalDate endDate;
}
