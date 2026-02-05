package iu.duyduc.thesis_management_system.service.impl;

import iu.duyduc.thesis_management_system.dto.response.LecturerResponse;
import iu.duyduc.thesis_management_system.entity.User;
import iu.duyduc.thesis_management_system.mapper.LecturerMapper;
import iu.duyduc.thesis_management_system.repository.UserRepo;
import iu.duyduc.thesis_management_system.service.LecturerService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@AllArgsConstructor
@Service
public class LecturerServiceImpl implements LecturerService {
    private final UserRepo userRepo;
    private final LecturerMapper lecturerMapper;

    @Override
    public List<LecturerResponse> getAllLecturers() {
        List<User> lecturerList = userRepo.findAll();

        return lecturerMapper.toResponseList(lecturerList);
    }
}
