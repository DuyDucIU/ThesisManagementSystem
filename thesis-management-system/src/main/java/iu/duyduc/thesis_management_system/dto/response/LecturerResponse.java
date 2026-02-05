package iu.duyduc.thesis_management_system.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LecturerResponse {
    private Long id;
    private String username;
    private String fullName;
}
