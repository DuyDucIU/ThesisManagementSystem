package iu.duyduc.thesis_management_system.service;

import java.io.IOException;
import java.io.InputStream;

public interface StudentService {
    void saveStudentsFromFile(InputStream file) throws IOException;
}
