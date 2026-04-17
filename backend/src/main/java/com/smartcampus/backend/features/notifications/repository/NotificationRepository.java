package com.smartcampus.backend.features.notifications.repository;

import com.smartcampus.backend.features.notifications.model.Notification;
import com.smartcampus.backend.features.notifications.model.NotificationCategory;
import com.smartcampus.backend.features.user.model.Role;
import java.util.Collection;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("""
            select n from Notification n
            where
              (n.recipientUser.id = :userId or (n.recipientUser is null and n.recipientRole = :role))
              and (:unreadOnly = false or n.read = false)
              and (:applyCategoryFilter = false or coalesce(n.category, :defaultCategory) not in :disabledCategories)
            order by n.createdAt desc
            """)
    Page<Notification> findForRecipient(@Param("userId") Long userId,
                                        @Param("role") Role role,
                                        @Param("unreadOnly") boolean unreadOnly,
                                        @Param("applyCategoryFilter") boolean applyCategoryFilter,
                                        @Param("disabledCategories") Collection<NotificationCategory> disabledCategories,
                                        @Param("defaultCategory") NotificationCategory defaultCategory,
                                        Pageable pageable);

    @Query("""
            select count(n) from Notification n
            where
              (n.recipientUser.id = :userId or (n.recipientUser is null and n.recipientRole = :role))
              and n.read = false
              and (:applyCategoryFilter = false or coalesce(n.category, :defaultCategory) not in :disabledCategories)
            """)
    long countUnreadForRecipient(@Param("userId") Long userId,
                                 @Param("role") Role role,
                                 @Param("applyCategoryFilter") boolean applyCategoryFilter,
                                 @Param("disabledCategories") Collection<NotificationCategory> disabledCategories,
                                 @Param("defaultCategory") NotificationCategory defaultCategory);

    @Modifying
    @Query("""
            update Notification n
            set n.read = true, n.readAt = :readAt
            where
              (n.recipientUser.id = :userId or (n.recipientUser is null and n.recipientRole = :role))
              and n.read = false
            """)
    int markAllAsReadForRecipient(@Param("userId") Long userId,
                                  @Param("role") Role role,
                                  @Param("readAt") Instant readAt);

    @Modifying
    long deleteByCreatedAtBeforeAndReadIsTrue(Instant threshold);
}

