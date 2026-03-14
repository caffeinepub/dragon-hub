import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalBlob } from "../backend";
import type { UserProfile } from "../backend";
import { useActor } from "./useActor";

export function useAllVideos() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllVideos();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useVideo(id: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["video", id.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getVideo(id);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useComments(videoId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["comments", videoId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCommentsForVideo(videoId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllListings() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["listings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllActiveListings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListing(id: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["listing", id.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getListing(id);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllCategories() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCategories();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useThreadsInCategory(categoryId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["threads", categoryId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getThreadsInCategory(categoryId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useThreadWithReplies(threadId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["thread", threadId.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getThreadWithReplies(threadId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCallerProfile() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["callerProfile"] }),
  });
}

export function useLikeVideo() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.likeVideo(id);
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["video", id.toString()] });
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

export function useAddComment() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      videoId,
      text,
    }: { videoId: bigint; text: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addComment(videoId, text);
    },
    onSuccess: (_data, { videoId }) =>
      qc.invalidateQueries({ queryKey: ["comments", videoId.toString()] }),
  });
}

export function useCreateVideo() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      description,
      videoFile,
      thumbnailFile,
      onProgress,
    }: {
      title: string;
      description: string;
      videoFile: File;
      thumbnailFile: File;
      onProgress?: (pct: number) => void;
    }) => {
      if (!actor) throw new Error("Not connected");
      const [videoBytes, thumbBytes] = await Promise.all([
        videoFile.arrayBuffer().then((b) => new Uint8Array(b)),
        thumbnailFile.arrayBuffer().then((b) => new Uint8Array(b)),
      ]);
      let videoBlob = ExternalBlob.fromBytes(videoBytes);
      if (onProgress) videoBlob = videoBlob.withUploadProgress(onProgress);
      const thumbnailBlob = ExternalBlob.fromBytes(thumbBytes);
      return actor.createVideo(title, description, videoBlob, thumbnailBlob);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useCreateListing() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      description,
      price,
      imageFile,
    }: {
      title: string;
      description: string;
      price: bigint;
      imageFile: File;
    }) => {
      if (!actor) throw new Error("Not connected");
      const bytes = new Uint8Array(await imageFile.arrayBuffer());
      const image = ExternalBlob.fromBytes(bytes);
      return actor.createListing(title, description, price, image);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  });
}

export function useMarkListingSold() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.markAsSold(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  });
}

export function useCreateCategory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
    }: { name: string; description: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createCategory(name, description);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useCreateThread() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      categoryId,
      title,
      body,
    }: { categoryId: bigint; title: string; body: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createThread(categoryId, title, body);
    },
    onSuccess: (_data, { categoryId }) =>
      qc.invalidateQueries({ queryKey: ["threads", categoryId.toString()] }),
  });
}

export function useReplyToThread() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      threadId,
      text,
    }: { threadId: bigint; text: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.replyToThread(threadId, text);
    },
    onSuccess: (_data, { threadId }) =>
      qc.invalidateQueries({ queryKey: ["thread", threadId.toString()] }),
  });
}

export function useAllUsers() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAssignRole() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user, role }: { user: any; role: any }) => {
      if (!actor) throw new Error("Not connected");
      return actor.assignCallerUserRole(user, role);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allUsers"] }),
  });
}

export function useRemoveUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user: any) => {
      if (!actor) throw new Error("Not connected");
      return actor.removeUser(user);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allUsers"] }),
  });
}

// ============ SHOPS ============

export function useAllShops() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["shops"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllShops();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useShop(id: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["shop", id.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return (actor as any).getShop(id);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useShopByOwner(owner: any) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["shopByOwner", owner?.toString()],
    queryFn: async () => {
      if (!actor || !owner) return null;
      return (actor as any).getShopByOwner(owner);
    },
    enabled: !!actor && !isFetching && !!owner,
  });
}

export function useShopProducts(shopId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["shopProducts", shopId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getShopProducts(shopId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateShop() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
      bannerFile,
    }: { name: string; description: string; bannerFile: File | null }) => {
      if (!actor) throw new Error("Not connected");
      let bannerBlob: ExternalBlob | null = null;
      if (bannerFile) {
        const bytes = new Uint8Array(await bannerFile.arrayBuffer());
        bannerBlob = ExternalBlob.fromBytes(bytes);
      }
      return (actor as any).createShop(name, description, bannerBlob);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shops"] }),
  });
}

export function useAddShopProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shopId,
      title,
      description,
      price,
      imageFile,
    }: {
      shopId: bigint;
      title: string;
      description: string;
      price: bigint;
      imageFile: File | null;
    }) => {
      if (!actor) throw new Error("Not connected");
      let imageBlob: ExternalBlob | null = null;
      if (imageFile) {
        const bytes = new Uint8Array(await imageFile.arrayBuffer());
        imageBlob = ExternalBlob.fromBytes(bytes);
      }
      return (actor as any).addShopProduct(
        shopId,
        title,
        description,
        price,
        imageBlob,
      );
    },
    onSuccess: (_data, { shopId }) =>
      qc.invalidateQueries({ queryKey: ["shopProducts", shopId.toString()] }),
  });
}

export function useDeleteShopProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      shopId: _shopId,
    }: { productId: bigint; shopId: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).deleteShopProduct(productId);
    },
    onSuccess: (_data, { shopId }) =>
      qc.invalidateQueries({ queryKey: ["shopProducts", shopId.toString()] }),
  });
}

// ============ GROUPS ============

export function useAllGroups() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllGroups();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGroup(id: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["group", id.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return (actor as any).getGroup(id);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGroupMembers(groupId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["groupMembers", groupId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getGroupMembers(groupId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGroupChannels(groupId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["groupChannels", groupId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getGroupChannels(groupId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGroupMessages(channelId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["groupMessages", channelId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getGroupMessages(channelId);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useCreateGroup() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
      iconFile,
    }: { name: string; description: string; iconFile: File | null }) => {
      if (!actor) throw new Error("Not connected");
      let iconBlob: ExternalBlob | null = null;
      if (iconFile) {
        const bytes = new Uint8Array(await iconFile.arrayBuffer());
        iconBlob = ExternalBlob.fromBytes(bytes);
      }
      return (actor as any).createGroup(name, description, iconBlob);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useJoinGroup() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).joinGroup(groupId);
    },
    onSuccess: (_data, groupId) =>
      qc.invalidateQueries({ queryKey: ["groupMembers", groupId.toString()] }),
  });
}

export function useLeaveGroup() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).leaveGroup(groupId);
    },
    onSuccess: (_data, groupId) =>
      qc.invalidateQueries({ queryKey: ["groupMembers", groupId.toString()] }),
  });
}

export function useCreateGroupChannel() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      name,
      description,
    }: { groupId: bigint; name: string; description: string }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).createGroupChannel(groupId, name, description);
    },
    onSuccess: (_data, { groupId }) =>
      qc.invalidateQueries({ queryKey: ["groupChannels", groupId.toString()] }),
  });
}

export function usePostGroupMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      channelId,
      text,
    }: { channelId: bigint; text: string }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).postGroupMessage(channelId, text);
    },
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({
        queryKey: ["groupMessages", channelId.toString()],
      }),
  });
}
