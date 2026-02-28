import uuid
import logging
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.redis import redis_client
from app.core.exceptions import NotFoundException, ForbiddenException, ValidationException
from app.auth.dependencies import get_current_user_id
from app.canvas.models import Design, DesignCollaborator, PermissionLevel
from app.users.models import User, Notification, NotificationStatus
from app.collaboration import (
    InviteRequest,
    CollaboratorResponse,
    VisibilityRequest,
    NotificationResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["collaboration"])

# ═══════════════════════════════════════════════════════════════
# Design Sharing & Collaborators
# ═══════════════════════════════════════════════════════════════

@router.put("/canvas/design/{design_id}/visibility")
async def toggle_visibility(
    design_id: uuid.UUID,
    body: VisibilityRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Toggle a design between public and private. Owner only."""
    design = await _get_owned_design(design_id, user_id, db)
    design.is_public = body.is_public
    db.add(design)
    await db.commit()
    return {"is_public": design.is_public}


@router.post(
    "/canvas/design/{design_id}/invite",
    status_code=status.HTTP_201_CREATED,
)
async def invite_collaborator(
    design_id: uuid.UUID,
    body: InviteRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Send an in-app invite notification to an existing user.
    Idempotent: duplicate invites within 24 h are silently ignored.
    """
    design = await _get_owned_design(design_id, user_id, db)

    # Find the target user
    target = (await db.execute(
        select(User).where(User.email == body.email)
    )).scalar_one_or_none()

    if not target:
        raise NotFoundException("No user found with that email address. They must sign up first.")

    if target.id == user_id:
        raise ValidationException("You cannot invite yourself.")

    # ── Redis idempotency check ──
    redis_key = f"invite:{design_id}:{target.id}"
    if redis_client.redis and await redis_client.redis.exists(redis_key):
        return {"detail": "Invite already sent.", "notification_id": None}

    # Check if already a collaborator
    existing = (await db.execute(
        select(DesignCollaborator).where(
            and_(
                DesignCollaborator.design_id == design_id,
                DesignCollaborator.user_id == target.id,
            )
        )
    )).scalar_one_or_none()

    if existing:
        return {"detail": "User is already a collaborator.", "notification_id": None}

    # Create the notification
    notification = Notification(
        recipient_id=target.id,
        sender_id=user_id,
        design_id=design_id,
        status=NotificationStatus.pending,
        message=f"You have been invited to collaborate on \"{design.name}\".",
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)

    # Set redis key for idempotency (24 h TTL)
    if redis_client.redis:
        await redis_client.redis.setex(redis_key, 86400, "1")

    logger.info(f"User {user_id} invited {target.email} to design {design_id}")
    return {"detail": "Invite sent.", "notification_id": str(notification.id)}


@router.get(
    "/canvas/design/{design_id}/collaborators",
    response_model=List[CollaboratorResponse],
)
async def list_collaborators(
    design_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List all collaborators on a design. Must be owner or collaborator."""
    await _assert_design_access(design_id, user_id, db)

    stmt = (
        select(DesignCollaborator)
        .options(selectinload(DesignCollaborator.user))
        .where(DesignCollaborator.design_id == design_id)
    )
    collabs = (await db.execute(stmt)).scalars().all()

    return [
        CollaboratorResponse(
            id=c.id,
            user_id=c.user_id,
            username=c.user.username,
            email=c.user.email,
            avatar_url=c.user.avatar_url,
            permission=c.permission.value,
            created_at=c.created_at,
        )
        for c in collabs
    ]


@router.delete(
    "/canvas/design/{design_id}/collaborator/{target_user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_collaborator(
    design_id: uuid.UUID,
    target_user_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Remove a collaborator. Owner only."""
    await _get_owned_design(design_id, user_id, db)

    collab = (await db.execute(
        select(DesignCollaborator).where(
            and_(
                DesignCollaborator.design_id == design_id,
                DesignCollaborator.user_id == target_user_id,
            )
        )
    )).scalar_one_or_none()

    if not collab:
        raise NotFoundException("Collaborator not found.")

    await db.delete(collab)
    await db.commit()

    # Clean up redis key
    if redis_client.redis:
        await redis_client.redis.delete(f"invite:{design_id}:{target_user_id}")


# ═══════════════════════════════════════════════════════════════
# In-App Notifications
# ═══════════════════════════════════════════════════════════════

@router.get("/users/notifications", response_model=List[NotificationResponse])
async def list_notifications(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List all pending notifications for the current user."""
    stmt = (
        select(Notification)
        .where(
            and_(
                Notification.recipient_id == user_id,
                Notification.status == NotificationStatus.pending,
            )
        )
        .order_by(Notification.created_at.desc())
    )
    notifications = (await db.execute(stmt)).scalars().all()

    results = []
    for n in notifications:
        sender = (await db.execute(select(User).where(User.id == n.sender_id))).scalar_one_or_none()
        design = (await db.execute(select(Design).where(Design.id == n.design_id))).scalar_one_or_none()
        results.append(NotificationResponse(
            id=n.id,
            sender_username=sender.username if sender else "Unknown",
            sender_avatar_url=sender.avatar_url if sender else None,
            design_id=n.design_id,
            design_name=design.name if design else "Deleted Design",
            status=n.status.value,
            message=n.message,
            created_at=n.created_at,
        ))
    return results


@router.get("/users/notifications/count")
async def notification_count(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Returns the count of pending notifications (for the bell badge)."""
    from sqlalchemy import func
    count = (await db.execute(
        select(func.count(Notification.id)).where(
            and_(
                Notification.recipient_id == user_id,
                Notification.status == NotificationStatus.pending,
            )
        )
    )).scalar_one()
    return {"count": count}


@router.post("/users/notifications/{notification_id}/accept")
async def accept_notification(
    notification_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Accept a collaboration invite and become a collaborator."""
    notification = await _get_user_notification(notification_id, user_id, db)

    # Add to collaborators
    collab = DesignCollaborator(
        design_id=notification.design_id,
        user_id=user_id,
        permission=PermissionLevel.editor,
    )
    db.add(collab)

    notification.status = NotificationStatus.accepted
    db.add(notification)
    await db.commit()

    logger.info(f"User {user_id} accepted invite for design {notification.design_id}")
    return {"detail": "Invite accepted. You can now access the design."}


@router.post("/users/notifications/{notification_id}/decline")
async def decline_notification(
    notification_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Decline a collaboration invite."""
    notification = await _get_user_notification(notification_id, user_id, db)

    notification.status = NotificationStatus.declined
    db.add(notification)
    await db.commit()

    # Clean up redis idempotency key so the owner can re-invite later
    if redis_client.redis:
        await redis_client.redis.delete(f"invite:{notification.design_id}:{user_id}")

    logger.info(f"User {user_id} declined invite for design {notification.design_id}")
    return {"detail": "Invite declined."}


# ═══════════════════════════════════════════════════════════════
# Internal Helpers
# ═══════════════════════════════════════════════════════════════

async def _get_owned_design(
    design_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> Design:
    """Fetch a design and ensure the current user is the owner."""
    design = (await db.execute(
        select(Design).where(Design.id == design_id)
    )).scalar_one_or_none()

    if not design:
        raise NotFoundException("Design not found.")
    if design.user_id != user_id:
        raise ForbiddenException("Only the design owner can perform this action.")
    return design


async def _assert_design_access(
    design_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> Design:
    """Verify the user has read access to the design (owner, collaborator, or public)."""
    design = (await db.execute(
        select(Design).where(Design.id == design_id)
    )).scalar_one_or_none()

    if not design:
        raise NotFoundException("Design not found.")

    if design.user_id == user_id:
        return design

    if design.is_public:
        return design

    collab = (await db.execute(
        select(DesignCollaborator).where(
            and_(
                DesignCollaborator.design_id == design_id,
                DesignCollaborator.user_id == user_id,
            )
        )
    )).scalar_one_or_none()

    if collab:
        return design

    raise ForbiddenException("You do not have access to this design.")


async def _get_user_notification(
    notification_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> Notification:
    """Fetch a notification and ensure it belongs to the current user and is pending."""
    notification = (await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )).scalar_one_or_none()

    if not notification:
        raise NotFoundException("Notification not found.")
    if notification.recipient_id != user_id:
        raise ForbiddenException("This notification does not belong to you.")
    if notification.status != NotificationStatus.pending:
        raise ValidationException("This notification has already been acted upon.")
    return notification
