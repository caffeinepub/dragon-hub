import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Principal } from "@icp-sdk/core/principal";
import { usePublicUserProfile } from "../hooks/useQueries";

interface UserAvatarProps {
  principal: Principal;
  size?: "sm" | "md";
  showName?: boolean;
}

export function UserAvatar({
  principal,
  size = "sm",
  showName = true,
}: UserAvatarProps) {
  const { data: profile } = usePublicUserProfile(principal);
  const shortPrincipal = `${principal.toString().slice(0, 6)}...`;
  const displayName = profile?.displayName || shortPrincipal;
  const fallback = displayName.slice(0, 2).toUpperCase();
  const avatarSize = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex items-center gap-2">
      <Avatar className={`${avatarSize} flex-shrink-0`}>
        {profile?.profilePicBlob ? (
          <AvatarImage src={profile.profilePicBlob.getDirectURL()} />
        ) : null}
        <AvatarFallback
          className="bg-primary/15 text-primary"
          style={{ fontSize: "0.6rem" }}
        >
          {fallback}
        </AvatarFallback>
      </Avatar>
      {showName && (
        <span
          className={`${textSize} font-medium text-muted-foreground truncate max-w-[120px]`}
        >
          {displayName}
        </span>
      )}
    </div>
  );
}
