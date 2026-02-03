package iu.duyduc.thesis_management_system.entity;

import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "students", uniqueConstraints = {
        @UniqueConstraint(columnNames = "student_id")
})
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String studentId;

    @Column(nullable = false)
    private String fullName;

    @ManyToOne
    @JoinColumn(name = "managed_by")
    private User managedBy;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private StudentStatus status; // VALID | INVALID

    @Column(length = 255)
    private String invalidReason;

    @Builder
    public Student(String studentId, String fullName, User managedBy, StudentStatus status, String invalidReason) {
        this.studentId = studentId;
        this.fullName = fullName;
        this.managedBy = managedBy;
        this.status = status;
        this.invalidReason = invalidReason;
    }
}
