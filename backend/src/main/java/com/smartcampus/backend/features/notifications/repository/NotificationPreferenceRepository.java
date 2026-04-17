package com.smartcampus.backend.features.notifications.repository;

import com.smartcampus.backend.features.notifications.model.NotificationCategory;
import com.smartcampus.backend.features.notifications.model.NotificationPreference;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, Long> {

    List<NotificationPreference> findByUserId(Long userId);

    List<NotificationPreference> findByUserIdAndEnabledFalse(Long userId);

    Optional<NotificationPreference> findByUserIdAndCategory(Long userId, NotificationCategory category);

    void deleteByUserIdAndCategoryNotIn(Long userId, Collection<NotificationCategory> categories);
}

