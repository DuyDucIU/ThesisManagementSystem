package iu.duyduc.thesis_management_system.dto.request;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignStudentRequest {
    List<Long> id;
}
