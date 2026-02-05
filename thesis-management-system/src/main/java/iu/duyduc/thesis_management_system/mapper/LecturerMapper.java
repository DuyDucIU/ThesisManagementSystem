package iu.duyduc.thesis_management_system.mapper;

import iu.duyduc.thesis_management_system.dto.response.LecturerResponse;
import iu.duyduc.thesis_management_system.entity.User;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface LecturerMapper {
    LecturerResponse toLecturerResponse(User user);
    List<LecturerResponse> toResponseList(List<User> users);
}
